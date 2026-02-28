/**
 * SearchService: wraps OpenAI Responses API with web_search tool
 * to retrieve live market data from approved luxury resale sources.
 * Falls back to a no-results mock when AI_PROVIDER !== 'openai'.
 */
import { env } from '../../config/env'
import { logger } from '../../middleware/requestId'

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

export interface SearchResponse {
  results: SearchResult[]
  rawText: string
  annotations: Array<{ url: string; title: string }>
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

const DEFAULT_MARKETPLACE_ALLOWLIST = [
  'vestiairecollective.com',
  'designerexchange.ie',
  'luxuryexchange.ie',
  'siopaella.com',
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
  private openai: InstanceType<typeof import('openai').default> | null = null
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

  private async getOpenAI() {
    if (!this.openai) {
      const OpenAI = (await import('openai')).default
      this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
    }
    return this.openai
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
    const windowMs = 60000
    if (now - this.enrichmentWindow.startedAt >= windowMs) {
      this.enrichmentWindow = { startedAt: now, count: 0 }
    }
    this.enrichmentWindow.count += 1
    return this.enrichmentWindow.count
  }

  /**
   * Perform a web search scoped to approved luxury resale domains.
   * Uses native `filters.allowed_domains` in the WebSearchTool for reliable domain restriction.
   * Returns parsed listings (title, url, snippet) plus the raw AI text.
   */
  async searchMarket(
    query: string,
    opts?: { domains?: string[]; userLocation?: { country: string } },
  ): Promise<SearchResponse> {
    if (env.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY) {
      return { results: [], rawText: '', annotations: [] }
    }

    const domains = opts?.domains ?? this.getConfiguredAllowlist()

    try {
      const openai = await this.getOpenAI()

      const webSearchTool: {
        type: 'web_search'
        search_context_size: 'high'
        filters?: { allowed_domains: string[] }
        user_location?: { type: 'approximate'; country: string }
      } = {
        type: 'web_search',
        search_context_size: 'high',
      }

      if (domains.length > 0) {
        webSearchTool.filters = { allowed_domains: domains }
      }

      if (opts?.userLocation) {
        webSearchTool.user_location = {
          type: 'approximate',
          country: opts.userLocation.country,
        }
      }

      const response = await openai.responses.create({
        model: 'gpt-4o-mini',
        tools: [webSearchTool],
        input: query,
      })

      const rawText = response.output_text ?? ''

      const annotations: Array<{ url: string; title: string }> = []
      for (const item of response.output ?? []) {
        if (item.type === 'message' && Array.isArray(item.content)) {
          for (const block of item.content) {
            if (block.type === 'output_text' && Array.isArray(block.annotations)) {
              for (const ann of block.annotations) {
                if (ann.type === 'url_citation' && ann.url) {
                  annotations.push({ url: ann.url, title: ann.title ?? '' })
                }
              }
            }
          }
        }
      }

      const filteredAnnotations = this.filterAllowedAnnotations(annotations)
      const results = filteredAnnotations.map((ann) => ({
        title: ann.title,
        url: ann.url,
        snippet: '',
      }))

      return { results, rawText, annotations: filteredAnnotations }
    } catch (error) {
      logger.error('search_service_error', error)
      return { results: [], rawText: '', annotations: [] }
    }
  }

  /**
   * Run 3 parallel market searches with native domain filtering and merge results (dedupe by URL).
   * Use for price-check and market research to get more listing pages vs generic articles.
   */
  async searchMarketMulti(
    baseQuery: string,
    opts?: { domains?: string[]; userLocation?: { country: string } },
  ): Promise<SearchResponse> {
    const trimmed = baseQuery.trim()
    // Three parallel searches: Vestiaire only, Irish platforms, and a broad EUR search.
    // Domain filtering is done natively via the WebSearchTool filters.allowed_domains.
    const searches = [
      this.searchMarket(trimmed, { ...opts, domains: ['vestiairecollective.com'] }),
      this.searchMarket(trimmed, {
        ...opts,
        domains: ['designerexchange.ie', 'luxuryexchange.ie', 'siopaella.com'],
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
    for (const r of responses) {
      for (const a of r.annotations) {
        if (a.url && !seenUrls.has(a.url)) {
          seenUrls.add(a.url)
          annotations.push(a)
        }
      }
      if (r.rawText.trim()) rawParts.push(r.rawText.trim())
    }
    const rawText = rawParts.join('\n\n---\n\n')
    const results = annotations.map((ann) => ({
      title: ann.title,
      url: ann.url,
      snippet: '',
    }))
    return { results, rawText, annotations }
  }

  /**
   * Expand a free-text luxury item query into structured search intelligence.
   * Makes one fast OpenAI call to extract canonical attributes, generate
   * reseller naming aliases, and produce semantic matching criteria.
   * Falls back gracefully to a single-variant passthrough on error.
   */
  async expandQuery(query: string): Promise<QueryContext> {
    const fallback: QueryContext = {
      canonicalDescription: query,
      keyAttributes: { brand: '', style: query },
      searchVariants: [query],
      matchingCriteria: '',
    }

    if (env.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY) {
      return fallback
    }

    try {
      const openai = await this.getOpenAI()
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a luxury goods resale expert. Extract structured search intelligence from a free-text item description.

LUXURY TERMINOLOGY REFERENCE (use this to resolve aliases):
- Chanel: "Classic Flap" = "Timeless Classic" = "2.55" (same bag family); sizes: Small ~23cm, Medium ~25cm, Jumbo ~30cm, Maxi ~33cm; hardware: GHW (gold), SHW (silver), PHW (palladium), RHW (ruthenium); materials: Caviar (textured/grainy), Lambskin (smooth/soft), Jersey (fabric)
- Hermès: Birkin and Kelly bags; sizes 25/30/35/40/50; leathers: Togo, Epsom, Clemence, Chevre, Barenia; hardware: GHW, PHW, BHW (brushed); grades: A/B/C condition
- Louis Vuitton: abbreviations LV; Speedy 25/30/35; Neverfull PM/MM/GM; Monogram/Damier/Epi canvas
- Prada: Re-Edition, Galleria, Cleo; nylon vs leather
- Dior: Lady Dior Mini/Small/Medium/Large; Saddle; cannage stitching
- Bottega Veneta: Cassette, Jodie, Arco; intrecciato weave
- General: MM=Medium, GM=Large/Grande, PM=Small/Petite; pre-owned = second-hand = used = pre-loved; "like new" = excellent condition

Return ONLY a valid JSON object:
{
  "canonicalDescription": "<full canonical item description>",
  "keyAttributes": {
    "brand": "<brand name>",
    "style": "<bag style/model name>",
    "size": "<size if specified, else null>",
    "material": "<leather/material if specified, else null>",
    "colour": "<colour if specified, else null>",
    "hardware": "<hardware colour if specified, else null>"
  },
  "searchVariants": ["<variant 1>", "<variant 2>", "<variant 3 if needed>"],
  "matchingCriteria": "<one sentence describing what a matching listing must have>"
}

searchVariants rules:
- Generate 2–3 short search queries (5–8 words each) that resellers actually use
- Use different naming conventions for the same item
- Include size and colour where relevant
- Keep queries concise — they are fed directly to a web search engine`,
          },
          {
            role: 'user',
            content: query,
          },
        ],
      })

      const text = response.choices[0]?.message?.content ?? ''
      const parsed = JSON.parse(text) as QueryContext

      if (
        !parsed.searchVariants ||
        !Array.isArray(parsed.searchVariants) ||
        parsed.searchVariants.length === 0
      ) {
        return fallback
      }

      // Cap variants to 3 to avoid excessive API calls downstream
      return {
        ...parsed,
        searchVariants: parsed.searchVariants.slice(0, 3),
      }
    } catch (err) {
      logger.warn('search_expand_query_error', { error: err instanceof Error ? err.message : String(err) })
      return fallback
    }
  }

  /**
   * Run parallel market searches for multiple query variants and merge results.
   * Each variant gets a Vestiaire search + Irish platforms search, then a broad EUR search.
   * Variants are capped at 3 to bound total concurrent requests to ~9.
   */
  async searchMarketMultiExpanded(
    searchVariants: string[],
    opts?: { userLocation?: { country: string } },
  ): Promise<SearchResponse> {
    const variants = searchVariants.slice(0, 3)
    const allSearches = variants.flatMap((variant) => [
      this.searchMarket(variant, { ...opts, domains: ['vestiairecollective.com'] }),
      this.searchMarket(variant, {
        ...opts,
        domains: ['designerexchange.ie', 'luxuryexchange.ie', 'siopaella.com'],
      }),
    ])
    // Add one broad EUR search for the first (primary) variant
    allSearches.push(
      this.searchMarket(`${variants[0]} pre-owned luxury for sale price EUR`, {
        ...opts,
        domains: [],
      }),
    )

    const responses = await Promise.all(allSearches)
    const seenUrls = new Set<string>()
    const annotations: Array<{ url: string; title: string }> = []
    const rawParts: string[] = []
    for (const r of responses) {
      for (const a of r.annotations) {
        if (a.url && !seenUrls.has(a.url)) {
          seenUrls.add(a.url)
          annotations.push(a)
        }
      }
      if (r.rawText.trim()) rawParts.push(r.rawText.trim())
    }
    const rawText = rawParts.join('\n\n---\n\n')
    const results = annotations.map((ann) => ({
      title: ann.title,
      url: ann.url,
      snippet: '',
    }))
    return { results, rawText, annotations }
  }

  /**
   * General-purpose web search (no domain restriction).
   * Used for retail price lookups, serial code research, etc.
   */
  async searchWeb(query: string): Promise<SearchResponse> {
    if (env.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY) {
      return { results: [], rawText: '', annotations: [] }
    }

    try {
      const openai = await this.getOpenAI()

      const response = await openai.responses.create({
        model: 'gpt-4o-mini',
        tools: [{ type: 'web_search' as const, search_context_size: 'high' as const }],
        input: query,
      })

      const rawText = response.output_text ?? ''

      const annotations: Array<{ url: string; title: string }> = []
      for (const item of response.output ?? []) {
        if (item.type === 'message' && Array.isArray(item.content)) {
          for (const block of item.content) {
            if (block.type === 'output_text' && Array.isArray(block.annotations)) {
              for (const ann of block.annotations) {
                if (ann.type === 'url_citation' && ann.url) {
                  annotations.push({ url: ann.url, title: ann.title ?? '' })
                }
              }
            }
          }
        }
      }

      const results = annotations.map((ann) => ({
        title: ann.title,
        url: ann.url,
        snippet: '',
      }))

      return { results, rawText, annotations }
    } catch (error) {
      logger.error('search_web_error', error)
      return { results: [], rawText: '', annotations: [] }
    }
  }

  /**
   * Search + synthesize: performs web search then asks a second model call
   * to extract structured JSON from the search results.
   * This is the core RAG pattern: Retrieve (web_search) then Generate (structured extraction).
   */
  async searchAndExtract<T>(opts: {
    searchQuery: string
    extractionPrompt: string
    domains?: string[]
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

    if (env.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY) {
      return { extracted: null, searchResponse }
    }

    const domains = Array.from(new Set(searchResponse.annotations
      .map((a) => this.resolveUrlMeta(a.url).hostname)
      .filter((x): x is string => Boolean(x))))
    const startedAt = Date.now()
    this.metrics.extractionAttempts += 1
    this.recordDomainAttempt(domains)

    try {
      const openai = await this.getOpenAI()
      const contextBlock = searchResponse.rawText
        ? `Web search results:\n"""\n${searchResponse.rawText}\n"""\n\nSource URLs found:\n${searchResponse.annotations.map((a) => `- ${a.title}: ${a.url}`).join('\n')}`
        : 'No web results found.'

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You extract structured data from web search results. Return ONLY valid JSON, no markdown.',
          },
          {
            role: 'user',
            content: `${contextBlock}\n\n${opts.extractionPrompt}`,
          },
        ],
        max_tokens: 1500,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      })

      const text = response.choices[0]?.message?.content ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        this.recordDomainFailure(domains)
        return { extracted: null, searchResponse }
      }

      const parsed = JSON.parse(jsonMatch[0]) as T
      this.metrics.extractionSuccesses += 1
      return { extracted: parsed, searchResponse }
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
