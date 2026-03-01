/**
 * SearchService: shared RAG retrieval + extraction helpers used by price check, market research,
 * serial decoding, and retail lookup flows.
 */
import { z } from 'zod'
import { env } from '../../config/env'
import { logger } from '../../middleware/requestId'
import { getAiRouter } from '../ai/AiRouter'
import {
  QUERY_EXPANSION_SYSTEM_PROMPT,
  SEARCH_EXTRACTION_SYSTEM_PROMPT,
  buildSearchExtractionUserPrompt,
} from '../ai/prompts/searchPrompts'

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

export interface SearchResponse {
  results: SearchResult[]
  rawText: string
  annotations: Array<{ url: string; title: string }>
  providerError?: boolean
}

/**
 * Structured intelligence about a search query.
 * Produced by expandQuery() before web searches run.
 */
export interface QueryContext {
  canonicalDescription: string
  keyAttributes: {
    brand: string
    style: string
    size?: string | null
    material?: string | null
    colour?: string | null
    hardware?: string | null
  }
  /** 2–3 alternative search strings that resellers actually use for this item */
  searchVariants: string[]
  /** Plain-English criteria an AI extractor can use for semantic matching */
  matchingCriteria: string
}

interface UrlCacheEntry {
  hostname: string | null
  blocked: boolean
  expiresAt: number
}

interface DomainMetric {
  attempts: number
  failures: number
}

interface EnrichmentMetrics {
  extractionAttempts: number
  extractionSuccesses: number
  extractionSuccessRate: number
  perDomainFailureRate: Record<string, number>
  averageEnrichmentLatencyMs: number
}

const QueryContextExtractionSchema = z.object({
  canonicalDescription: z.string().min(1),
  keyAttributes: z.object({
    brand: z.string().default(''),
    style: z.string().default(''),
    size: z.string().nullish(),
    material: z.string().nullish(),
    colour: z.string().nullish(),
    hardware: z.string().nullish(),
  }),
  searchVariants: z.array(z.string().min(1)).min(1).max(3),
  matchingCriteria: z.string().default(''),
})

const IRISH_MARKETPLACE_DOMAINS = [
  'designerexchange.ie',
  'luxuryexchange.ie',
  'siopaella.com',
]

const EU_FALLBACK_MARKETPLACE_DOMAINS = [
  'vestiairecollective.com',
]

const DEFAULT_MARKETPLACE_ALLOWLIST = [
  ...IRISH_MARKETPLACE_DOMAINS,
  ...EU_FALLBACK_MARKETPLACE_DOMAINS,
]

function parseDomainList(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
}

function normalizeDomain(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, '')
}

export class SearchService {
  private readonly aiRouter = getAiRouter()
  private readonly cacheTtlMs = env.SEARCH_ENRICHMENT_CACHE_TTL_MS
  private readonly sourceUrlCache = new Map<string, UrlCacheEntry>()
  private readonly allowlist = parseDomainList(env.SEARCH_DOMAIN_ALLOWLIST)
  private readonly denylist = parseDomainList(env.SEARCH_DOMAIN_DENYLIST)
  private readonly metrics = {
    extractionAttempts: 0,
    extractionSuccesses: 0,
    enrichmentLatencyMsTotal: 0,
    enrichmentLatencyCount: 0,
    byDomain: new Map<string, DomainMetric>(),
  }
  private enrichmentWindow = {
    startedAt: Date.now(),
    count: 0,
  }

  getEnrichmentMetrics(): EnrichmentMetrics {
    const perDomainFailureRate: Record<string, number> = {}
    for (const [domain, metric] of this.metrics.byDomain.entries()) {
      if (metric.attempts > 0) {
        perDomainFailureRate[domain] = metric.failures / metric.attempts
      }
    }
    return {
      extractionAttempts: this.metrics.extractionAttempts,
      extractionSuccesses: this.metrics.extractionSuccesses,
      extractionSuccessRate: this.metrics.extractionAttempts > 0
        ? this.metrics.extractionSuccesses / this.metrics.extractionAttempts
        : 0,
      perDomainFailureRate,
      averageEnrichmentLatencyMs: this.metrics.enrichmentLatencyCount > 0
        ? this.metrics.enrichmentLatencyMsTotal / this.metrics.enrichmentLatencyCount
        : 0,
    }
  }

  private getConfiguredAllowlist(): string[] {
    return this.allowlist.length > 0 ? this.allowlist : DEFAULT_MARKETPLACE_ALLOWLIST
  }

  private isDomainAllowed(hostname: string): boolean {
    const normalized = normalizeDomain(hostname)
    if (this.denylist.some((d) => normalized === d || normalized.endsWith(`.${d}`))) {
      return false
    }
    const allowed = this.getConfiguredAllowlist()
    return allowed.some((d) => normalized === d || normalized.endsWith(`.${d}`))
  }

  private resolveUrlMeta(sourceUrl: string): UrlCacheEntry {
    const now = Date.now()
    const cached = this.sourceUrlCache.get(sourceUrl)
    if (cached && cached.expiresAt > now) return cached

    let hostname: string | null = null
    let blocked = true
    try {
      hostname = normalizeDomain(new URL(sourceUrl).hostname)
      blocked = !this.isDomainAllowed(hostname)
    } catch {
      blocked = true
    }

    const entry: UrlCacheEntry = {
      hostname,
      blocked,
      expiresAt: now + this.cacheTtlMs,
    }
    this.sourceUrlCache.set(sourceUrl, entry)
    return entry
  }

  private filterAllowedAnnotations(annotations: Array<{ url: string; title: string }>) {
    return annotations.filter((ann) => {
      const meta = this.resolveUrlMeta(ann.url)
      return !meta.blocked
    })
  }

  private recordDomainAttempt(domains: string[]): void {
    for (const domain of domains) {
      const current = this.metrics.byDomain.get(domain) ?? { attempts: 0, failures: 0 }
      current.attempts += 1
      this.metrics.byDomain.set(domain, current)
    }
  }

  private recordDomainFailure(domains: string[]): void {
    for (const domain of domains) {
      const current = this.metrics.byDomain.get(domain) ?? { attempts: 0, failures: 0 }
      current.failures += 1
      this.metrics.byDomain.set(domain, current)
    }
  }

  private nextWindowCount(): number {
    const now = Date.now()
    const windowMs = 60_000
    if (now - this.enrichmentWindow.startedAt >= windowMs) {
      this.enrichmentWindow = { startedAt: now, count: 0 }
    }
    this.enrichmentWindow.count += 1
    return this.enrichmentWindow.count
  }

  /**
   * Perform a web search scoped to approved luxury resale domains.
   * Returns parsed listings (title, url, snippet) plus the raw AI text.
   */
  async searchMarket(
    query: string,
    opts?: { domains?: string[]; userLocation?: { country: string } },
  ): Promise<SearchResponse> {
    const domains = opts?.domains ?? this.getConfiguredAllowlist()

    try {
      const routed = await this.aiRouter.webSearch({
        query,
        domains,
        userLocation: opts?.userLocation,
      })

      const filteredAnnotations = this.filterAllowedAnnotations(routed.data.annotations)
      const results = filteredAnnotations.map((ann) => ({
        title: ann.title,
        url: ann.url,
        snippet: '',
      }))
      const rawText = routed.data.rawText

      if (rawText.length < 50 && filteredAnnotations.length === 0) {
        logger.warn('search_service_empty', {
          searchEmpty: true,
          queryLength: query.length,
          rawTextLength: rawText.length,
          annotationCount: filteredAnnotations.length,
        })
      }

      return {
        results,
        rawText,
        annotations: filteredAnnotations,
      }
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : undefined
      const message = error instanceof Error ? error.message : String(error)
      logger.error('search_service_error', { code, message, error })
      return { results: [], rawText: '', annotations: [], providerError: true }
    }
  }

  /**
   * Run 3 parallel market searches and merge results (dedupe by URL).
   * Use for price-check and market research to get more listing pages vs generic articles.
   */
  async searchMarketMulti(
    baseQuery: string,
    opts?: { domains?: string[]; userLocation?: { country: string } },
  ): Promise<SearchResponse> {
    const trimmed = baseQuery.trim()
    const searches = [
      this.searchMarket(trimmed, {
        ...opts,
        domains: IRISH_MARKETPLACE_DOMAINS,
      }),
      this.searchMarket(trimmed, {
        ...opts,
        domains: EU_FALLBACK_MARKETPLACE_DOMAINS,
      }),
      this.searchMarket(`${trimmed} pre-owned luxury for sale price EUR`, {
        ...opts,
        domains: [],
      }),
    ]
    const responses = await Promise.all(searches)
    const seenUrls = new Set<string>()
    const annotations: Array<{ url: string; title: string }> = []
    const rawParts: string[] = []
    for (const response of responses) {
      for (const annotation of response.annotations) {
        if (annotation.url && !seenUrls.has(annotation.url)) {
          seenUrls.add(annotation.url)
          annotations.push(annotation)
        }
      }
      if (response.rawText.trim()) rawParts.push(response.rawText.trim())
    }
    const rawText = rawParts.join('\n\n---\n\n')
    const results = annotations.map((ann) => ({
      title: ann.title,
      url: ann.url,
      snippet: '',
    }))
    const allFailed = responses.length > 0 && responses.every((response) => response.providerError === true)
    return {
      results,
      rawText,
      annotations,
      ...(allFailed ? { providerError: true as const } : {}),
    }
  }

  /**
   * Expand a free-text luxury item query into structured search intelligence.
   * Falls back to deterministic heuristics when both providers fail.
   */
  async expandQuery(query: string): Promise<QueryContext> {
    const fallback = this.buildHeuristicQueryContext(query)
    if (!query.trim()) {
      return fallback
    }

    try {
      const routed = await this.aiRouter.extractStructuredJson<QueryContext>({
        systemPrompt: QUERY_EXPANSION_SYSTEM_PROMPT,
        userPrompt: query,
        schema: QueryContextExtractionSchema,
        maxTokens: 450,
        temperature: 0.1,
      })

      return {
        ...routed.data,
        searchVariants: routed.data.searchVariants.slice(0, 3),
      }
    } catch (error) {
      logger.warn('search_expand_query_error', {
        error: error instanceof Error ? error.message : String(error),
      })
      return fallback
    }
  }

  private buildHeuristicQueryContext(query: string): QueryContext {
    const normalized = query.trim()
    if (!normalized) {
      return {
        canonicalDescription: query,
        keyAttributes: { brand: '', style: query },
        searchVariants: [query],
        matchingCriteria: '',
      }
    }

    const words = normalized.split(/\s+/)
    const brand = words[0] ?? ''
    const variantBase = normalized.replace(/\s+/g, ' ').trim()
    const variants = Array.from(new Set([
      variantBase,
      `${variantBase} pre-owned`,
      `${variantBase} resale ireland`,
    ])).slice(0, 3)

    return {
      canonicalDescription: normalized,
      keyAttributes: {
        brand,
        style: words.slice(1).join(' ') || normalized,
      },
      searchVariants: variants,
      matchingCriteria: 'Match brand and style family, then prefer same size/colour/material when available.',
    }
  }

  /**
   * Run parallel market searches for multiple query variants and merge results.
   * Each variant gets an Irish-platforms search + EU fallback search, then a broad EUR search.
   * Variants are capped at 3 to bound total concurrent requests.
   */
  async searchMarketMultiExpanded(
    searchVariants: string[],
    opts?: { userLocation?: { country: string } },
  ): Promise<SearchResponse> {
    const variants = searchVariants.slice(0, 3)
    const allSearches = variants.flatMap((variant) => [
      this.searchMarket(variant, {
        ...opts,
        domains: IRISH_MARKETPLACE_DOMAINS,
      }),
      this.searchMarket(variant, {
        ...opts,
        domains: EU_FALLBACK_MARKETPLACE_DOMAINS,
      }),
    ])
    if (variants.length > 0) {
      allSearches.push(
        this.searchMarket(`${variants[0]} pre-owned luxury for sale price EUR`, {
          ...opts,
          domains: [],
        }),
      )
    }

    const responses = await Promise.all(allSearches)
    const seenUrls = new Set<string>()
    const annotations: Array<{ url: string; title: string }> = []
    const rawParts: string[] = []
    for (const response of responses) {
      for (const annotation of response.annotations) {
        if (annotation.url && !seenUrls.has(annotation.url)) {
          seenUrls.add(annotation.url)
          annotations.push(annotation)
        }
      }
      if (response.rawText.trim()) rawParts.push(response.rawText.trim())
    }
    const rawText = rawParts.join('\n\n---\n\n')
    const results = annotations.map((ann) => ({
      title: ann.title,
      url: ann.url,
      snippet: '',
    }))
    const allFailed = responses.length > 0 && responses.every((response) => response.providerError === true)
    return {
      results,
      rawText,
      annotations,
      ...(allFailed ? { providerError: true as const } : {}),
    }
  }

  /**
   * General-purpose web search (no domain restriction).
   * Used for retail price lookups, serial code research, etc.
   */
  async searchWeb(query: string): Promise<SearchResponse> {
    try {
      const routed = await this.aiRouter.webSearch({ query })
      const results = routed.data.annotations.map((ann) => ({
        title: ann.title,
        url: ann.url,
        snippet: '',
      }))
      return {
        results,
        rawText: routed.data.rawText,
        annotations: routed.data.annotations,
      }
    } catch (error) {
      logger.error('search_web_error', error)
      return { results: [], rawText: '', annotations: [], providerError: true }
    }
  }

  /**
   * Search + synthesize: performs web search then extracts structured JSON from search results.
   */
  async searchAndExtract<T>(opts: {
    searchQuery: string
    extractionPrompt: string
    domains?: string[]
    schema?: z.ZodType<T>
  }): Promise<{ extracted: T | null; searchResponse: SearchResponse }> {
    const searchResponse = await this.searchMarket(opts.searchQuery, {
      domains: opts.domains,
    })

    if (!searchResponse.rawText && searchResponse.results.length === 0) {
      return { extracted: null, searchResponse }
    }

    if (!env.SEARCH_ENRICHMENT_ENABLED) {
      logger.info('search_enrichment_disabled', { reason: 'env_flag' })
      return { extracted: null, searchResponse }
    }

    if (this.nextWindowCount() > env.SEARCH_ENRICHMENT_MAX_COUNT) {
      logger.info('search_enrichment_capped', {
        maxPerMinute: env.SEARCH_ENRICHMENT_MAX_COUNT,
      })
      return { extracted: null, searchResponse }
    }

    const domains = Array.from(new Set(searchResponse.annotations
      .map((annotation) => this.resolveUrlMeta(annotation.url).hostname)
      .filter((hostname): hostname is string => Boolean(hostname))))
    const startedAt = Date.now()
    this.metrics.extractionAttempts += 1
    this.recordDomainAttempt(domains)

    try {
      const contextBlock = searchResponse.rawText
        ? `Web search results:\n"""\n${searchResponse.rawText}\n"""\n\nSource URLs found:\n${searchResponse.annotations.map((annotation) => `- ${annotation.title}: ${annotation.url}`).join('\n')}`
        : 'No web results found.'

      const extraction = await this.aiRouter.extractStructuredJson<T>({
        systemPrompt: SEARCH_EXTRACTION_SYSTEM_PROMPT,
        userPrompt: buildSearchExtractionUserPrompt({
          contextBlock,
          extractionPrompt: opts.extractionPrompt,
        }),
        schema: opts.schema,
        maxTokens: 1500,
        temperature: 0.2,
      })

      this.metrics.extractionSuccesses += 1
      return { extracted: extraction.data, searchResponse }
    } catch (error) {
      this.recordDomainFailure(domains)
      logger.error('search_extract_error', error)
      return { extracted: null, searchResponse }
    } finally {
      const elapsed = Date.now() - startedAt
      this.metrics.enrichmentLatencyMsTotal += elapsed
      this.metrics.enrichmentLatencyCount += 1
    }
  }
}
