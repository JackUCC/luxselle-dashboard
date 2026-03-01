/**
 * PriceCheckService: RAG pipeline for quick price checks.
 * Web search for real listings, then AI extraction of avg price, max buy, max bid.
 */
import { z } from 'zod'
import type { PriceCheckComp, PriceCheckDiagnostics, PriceCheckInput, PriceCheckResult } from '@shared/schemas'
import { env } from '../../config/env'
import { SearchService, type QueryContext, type SearchResponse } from '../search/SearchService'
import { getFxService } from '../fx/FxService'
import { dedupeCompsBySourceUrl, filterPriceOutliers, filterValidComps } from '../../lib/validation'
import { logger } from '../../middleware/requestId'
import { ComparableImageEnrichmentService } from '../search/ComparableImageEnrichmentService'
import { getAiRouter } from '../ai/AiRouter'
import {
  buildEmptyComparableFallback,
  keepEvidenceBackedComparables,
} from '../ai/noFabrication'
import {
  PRICE_CHECK_EXTRACTION_SYSTEM_PROMPT,
  buildPriceCheckExtractionPrompt,
} from '../ai/prompts/priceCheckPrompts'

const IE_COMPETITOR_DOMAINS = ['designerexchange.ie', 'luxuryexchange.ie', 'siopaella.com']
const EU_FALLBACK_COMPETITOR_DOMAINS = ['vestiairecollective.com']
const IE_COMPETITOR_SOURCE_HINTS = ['designer exchange', 'luxury exchange', 'siopaella']
const EU_FALLBACK_SOURCE_HINTS = ['vestiaire']

function parseSecondaryDomains(): string[] {
  const raw = env.PRICE_CHECK_SECONDARY_DOMAINS
  if (!raw?.trim()) return []
  return raw.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)
}

function mergeSearchResponses(a: SearchResponse, b: SearchResponse): SearchResponse {
  const seenUrls = new Set(a.annotations.map((ann) => normalizeCitationUrl(ann.url)))
  const annotations = [...a.annotations]
  for (const ann of b.annotations) {
    if (ann.url && !seenUrls.has(normalizeCitationUrl(ann.url))) {
      seenUrls.add(normalizeCitationUrl(ann.url))
      annotations.push(ann)
    }
  }
  const rawText = [a.rawText, b.rawText].filter(Boolean).join('\n\n---\n\n')
  const results = annotations.map((ann) => ({ title: ann.title, url: ann.url, snippet: '' }))
  return { results, rawText, annotations }
}

function normalizeCitationUrl(url: string): string {
  try {
    const u = new URL(url.trim())
    return `${u.protocol}//${u.hostname.toLowerCase().replace(/^www\./, '')}${u.pathname}`.replace(/\/$/, '')
  } catch {
    return url.trim().toLowerCase()
  }
}

const PriceCheckExtractionSchema = z.object({
  averageSellingPriceEur: z.number().optional(),
  comps: z.array(z.object({
    title: z.string().default(''),
    price: z.number(),
    source: z.string().default(''),
    sourceUrl: z.string().optional(),
    dataOrigin: z.enum(['web_search', 'ai_estimate']).optional(),
  })).optional(),
})

export type { PriceCheckComp, PriceCheckInput, PriceCheckResult }

export class PriceCheckService {
  private readonly aiRouter = getAiRouter()
  private readonly searchService = new SearchService()
  private readonly comparableImageEnrichmentService = new ComparableImageEnrichmentService()

  async check(input: PriceCheckInput): Promise<PriceCheckResult> {
    const { query, condition = '', notes = '', strategy: requestedStrategy } = input
    const refine = [condition, notes].filter(Boolean).join('. ')
    const effectiveStrategy = requestedStrategy ?? 'strict'

    let averageSellingPriceEur = 0
    let comps: PriceCheckComp[] = []
    let dataSource: 'web_search' | 'ai_fallback' | 'provider_unavailable' = 'ai_fallback'
    let diagnostics: PriceCheckDiagnostics | undefined
    let strategyUsed: 'strict' | 'broad' = 'strict'

    const queryContext = await this.searchService.expandQuery(
      refine ? `${query}. ${refine}` : query,
    )
    const variants = queryContext.searchVariants.length > 0 ? queryContext.searchVariants : [query]
    const userLocation = { country: 'IE' as const }

    let searchResponse = await this.searchService.searchMarketMultiExpanded(variants, { userLocation })
    if (searchResponse.providerError) {
      logger.warn('price_check_provider_unavailable', { reason: 'search_failed' })
      return {
        averageSellingPriceEur: 0,
        comps: [],
        maxBuyEur: 0,
        maxBidEur: 0,
        dataSource: 'provider_unavailable',
        researchedAt: new Date().toISOString(),
        diagnostics: this.buildDiagnostics(searchResponse, queryContext, 'no_search_data', {
          strategyUsed: effectiveStrategy === 'auto' ? 'strict' : effectiveStrategy,
          extractedCompCount: 0,
          validCompCount: 0,
          filteredOutCount: 0,
        }),
      }
    }

    const secondaryDomains = parseSecondaryDomains()
    if (effectiveStrategy === 'broad' && secondaryDomains.length > 0) {
      const broadSearches = variants.map((v) =>
        this.searchService.searchMarket(v, { domains: secondaryDomains, userLocation }),
      )
      const broadResponses = await Promise.all(broadSearches)
      const merged = broadResponses.reduce((acc, r) => mergeSearchResponses(acc, r), searchResponse)
      searchResponse = merged
      strategyUsed = 'broad'
    }

    const hasSearchData = searchResponse.rawText.length > 50 || searchResponse.results.length > 0

    const fxService = getFxService()
    const [gbpRate, usdRate] = await Promise.all([
      fxService.getRate('GBP', 'EUR'),
      fxService.getRate('USD', 'EUR'),
    ])
    const gbpToEur = gbpRate || 1.17
    const usdToEur = usdRate || 0.92
    const maxSearchContextChars = 8_000
    const maxSourceUrls = 40
    const buildExtractionContext = (response: SearchResponse): {
      searchRawText: string
      annotations: Array<{ url: string; title: string }>
    } => {
      const searchRawText = response.rawText.length > maxSearchContextChars
        ? `${response.rawText.slice(0, maxSearchContextChars)}\n\n[Search results truncated for faster extraction]`
        : response.rawText
      const annotations = response.annotations.slice(0, maxSourceUrls)
      return { searchRawText, annotations }
    }
    const extractionContext = buildExtractionContext(searchResponse)

    const extractionPrompt = buildPriceCheckExtractionPrompt({
      query,
      refine,
      queryContext,
      hasSearchData,
      searchRawText: extractionContext.searchRawText,
      annotations: extractionContext.annotations,
      gbpToEur,
      usdToEur,
    })

    let extraction = await this.extractComparables(extractionPrompt)
    let extractedComps = Array.isArray(extraction?.parsed?.comps) ? extraction.parsed.comps : []

    const tryBroadRetry =
      effectiveStrategy === 'auto' &&
      env.PRICE_CHECK_BROAD_STRATEGY_ENABLED &&
      secondaryDomains.length > 0 &&
      (!extraction.parsed || extractedComps.length < 2)

    if (tryBroadRetry) {
      const broadSearches = variants.map((v) =>
        this.searchService.searchMarket(v, { domains: secondaryDomains, userLocation }),
      )
      const broadResponses = await Promise.all(broadSearches)
      searchResponse = broadResponses.reduce((acc, r) => mergeSearchResponses(acc, r), searchResponse)
      strategyUsed = 'broad'
      const retryExtractionContext = buildExtractionContext(searchResponse)
      const retryPrompt = buildPriceCheckExtractionPrompt({
        query,
        refine,
        queryContext,
        hasSearchData: searchResponse.rawText.length > 50 || searchResponse.results.length > 0,
        searchRawText: retryExtractionContext.searchRawText,
        annotations: retryExtractionContext.annotations,
        gbpToEur,
        usdToEur,
      })
      extraction = await this.extractComparables(retryPrompt)
      extractedComps = Array.isArray(extraction?.parsed?.comps) ? extraction.parsed.comps : []
    }

    const extractedCount = extractedComps.length

    if (!extraction.parsed) {
      logger.warn('price_check_extraction_degraded', {
        reason: extraction.lastFailureReason,
      })
      diagnostics = this.buildDiagnostics(
        searchResponse,
        queryContext,
        hasSearchData ? 'extraction_failed' : 'no_search_data',
        { strategyUsed, extractedCompCount: extractedCount, validCompCount: 0, filteredOutCount: 0 },
      )
      comps = buildEmptyComparableFallback<PriceCheckComp>()
      averageSellingPriceEur = 0
      dataSource = 'ai_fallback'
    } else {
      const enrichedComps = this.backfillComparableSourceUrls(extractedComps, searchResponse.annotations)
      const { comps: provenanceComps, filteredOutCount } = this.filterByProvenance(
        enrichedComps,
        searchResponse.annotations,
      )

      if (provenanceComps.length === 0 && enrichedComps.length > 0) {
        diagnostics = this.buildDiagnostics(
          searchResponse,
          queryContext,
          'insufficient_provenance',
          {
            strategyUsed,
            extractedCompCount: extractedCount,
            validCompCount: 0,
            filteredOutCount,
          },
        )
        comps = buildEmptyComparableFallback<PriceCheckComp>()
        averageSellingPriceEur = 0
        dataSource = 'ai_fallback'
      } else {
        const deduped = dedupeCompsBySourceUrl(provenanceComps)
        const relevant = env.PRICE_CHECK_V2_ENABLED
          ? this.filterByRelevance(deduped, queryContext)
          : deduped
        const afterOutliers = env.PRICE_CHECK_V2_ENABLED
          ? filterPriceOutliers(relevant)
          : relevant
        const allComps = keepEvidenceBackedComparables(filterValidComps(afterOutliers))
        const validCount = allComps.length

        if (allComps.length >= 2) {
          comps = this.orderCompsByMarketPriority(allComps)
          averageSellingPriceEur = Math.round(
            comps.reduce((sum, comp) => sum + comp.price, 0) / comps.length,
          )
          diagnostics = this.buildDiagnostics(searchResponse, queryContext, undefined, {
            strategyUsed,
            extractedCompCount: extractedCount,
            validCompCount: validCount,
            filteredOutCount,
          })
          dataSource = hasSearchData ? 'web_search' : 'ai_fallback'
        } else {
          comps = buildEmptyComparableFallback<PriceCheckComp>()
          averageSellingPriceEur = 0
          diagnostics = this.buildDiagnostics(
            searchResponse,
            queryContext,
            hasSearchData ? 'insufficient_valid_comps' : 'no_search_data',
            {
              strategyUsed,
              extractedCompCount: extractedCount,
              validCompCount: validCount,
              filteredOutCount,
            },
          )
          dataSource = 'ai_fallback'
        }
      }
    }

    comps = await this.enrichCompsWithPreviewImages(comps)

    const maxBuyEur = Math.round((averageSellingPriceEur / 1.23) * 0.8)
    const maxBidEur = Math.round(maxBuyEur / 1.07)

    return {
      averageSellingPriceEur,
      comps,
      maxBuyEur,
      maxBidEur,
      dataSource,
      researchedAt: new Date().toISOString(),
      diagnostics,
    }
  }

  private orderCompsByMarketPriority(comps: PriceCheckComp[]): PriceCheckComp[] {
    const ieComps: PriceCheckComp[] = []
    const euFallbackComps: PriceCheckComp[] = []

    for (const comp of comps) {
      if (this.classifyComparableMarket(comp) === 'IE') {
        ieComps.push(comp)
      } else {
        euFallbackComps.push(comp)
      }
    }

    return [...ieComps, ...euFallbackComps]
  }

  private classifyComparableMarket(comp: PriceCheckComp): 'IE' | 'EU_FALLBACK' {
    const sourceHost = this.extractHostname(comp.sourceUrl)
    const sourceText = comp.source.trim().toLowerCase()

    if (
      sourceHost &&
      IE_COMPETITOR_DOMAINS.some((domain) => this.hostnameMatches(sourceHost, domain))
    ) {
      return 'IE'
    }

    if (IE_COMPETITOR_SOURCE_HINTS.some((hint) => sourceText.includes(hint))) {
      return 'IE'
    }

    if (
      sourceHost &&
      EU_FALLBACK_COMPETITOR_DOMAINS.some((domain) => this.hostnameMatches(sourceHost, domain))
    ) {
      return 'EU_FALLBACK'
    }

    if (EU_FALLBACK_SOURCE_HINTS.some((hint) => sourceText.includes(hint))) {
      return 'EU_FALLBACK'
    }

    return 'EU_FALLBACK'
  }

  private extractHostname(value?: string): string {
    if (!value) return ''
    const trimmed = value.trim().toLowerCase()
    if (!trimmed) return ''

    try {
      const withProtocol =
        trimmed.startsWith('http://') || trimmed.startsWith('https://')
          ? trimmed
          : `https://${trimmed}`
      return new URL(withProtocol).hostname.toLowerCase().replace(/^www\./, '')
    } catch {
      return trimmed
        .replace(/^https?:\/\//, '')
        .split('/')[0]
        .replace(/^www\./, '')
    }
  }

  private hostnameMatches(candidate: string, domain: string): boolean {
    if (!candidate || !domain) return false
    return candidate === domain || candidate.endsWith(`.${domain}`)
  }

  private async extractComparables(
    extractionPrompt: string,
  ): Promise<{ parsed: z.infer<typeof PriceCheckExtractionSchema> | null; lastFailureReason: string }> {
    try {
      const routed = await this.aiRouter.extractStructuredJson<z.infer<typeof PriceCheckExtractionSchema>>({
        systemPrompt: PRICE_CHECK_EXTRACTION_SYSTEM_PROMPT,
        userPrompt: extractionPrompt,
        schema: PriceCheckExtractionSchema,
        maxTokens: 900,
        temperature: 0.2,
      })
      return { parsed: routed.data, lastFailureReason: '' }
    } catch (error) {
      return {
        parsed: null,
        lastFailureReason: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private backfillComparableSourceUrls(
    comps: PriceCheckComp[],
    annotations: Array<{ url: string; title: string }>,
  ): PriceCheckComp[] {
    if (!Array.isArray(comps)) return []

    return comps.map((comp) => {
      if (comp.sourceUrl) return comp

      const normalizedTitle = comp.title.trim().toLowerCase()
      const normalizedSource = comp.source.trim().toLowerCase()
      const annotationMatch = annotations.find((annotation) => {
        const annotationTitle = annotation.title.trim().toLowerCase()
        const titleMatch = normalizedTitle.length > 0 && annotationTitle.includes(normalizedTitle)
        const sourceMatch = normalizedSource.length > 0
          && annotation.url.toLowerCase().includes(normalizedSource.replace(/\s+/g, ''))
        return titleMatch || sourceMatch
      })

      return {
        ...comp,
        sourceUrl: annotationMatch?.url,
      }
    })
  }

  /** Keep only comps whose sourceUrl is in the citation set; return filtered list and count removed. */
  private filterByProvenance(
    comps: PriceCheckComp[],
    annotations: Array<{ url: string; title: string }>,
  ): { comps: PriceCheckComp[]; filteredOutCount: number } {
    const citationSet = new Set(annotations.map((a) => normalizeCitationUrl(a.url)))
    const withProvenance = comps.filter((c) => c.sourceUrl && citationSet.has(normalizeCitationUrl(c.sourceUrl)))
    return { comps: withProvenance, filteredOutCount: comps.length - withProvenance.length }
  }

  /** Score comp by how many query key attributes appear in title/source; filter by min score (2 sparse, 3 richer). */
  private filterByRelevance(comps: PriceCheckComp[], queryContext: QueryContext): PriceCheckComp[] {
    const attrs = queryContext.keyAttributes
    const parts = [
      attrs.brand,
      attrs.style,
      attrs.size ?? '',
      attrs.material ?? '',
      attrs.colour ?? '',
      attrs.hardware ?? '',
    ].filter(Boolean)
    const richness = parts.length
    const minScore = richness <= 2 ? 2 : 3

    return comps.filter((comp) => {
      const text = `${(comp.title ?? '').toLowerCase()} ${(comp.source ?? '').toLowerCase()}`
      const score = parts.filter((p) => p && text.includes(p.toLowerCase())).length
      return score >= minScore
    })
  }

  private buildDiagnostics(
    searchResponse: SearchResponse,
    queryContext: QueryContext,
    emptyReason?: PriceCheckDiagnostics['emptyReason'],
    extra?: {
      strategyUsed?: 'strict' | 'broad'
      extractedCompCount?: number
      validCompCount?: number
      filteredOutCount?: number
    },
  ): PriceCheckDiagnostics {
    const missingAttributesHint: Array<'brand' | 'style' | 'size' | 'colour' | 'material'> = []
    if (!queryContext.keyAttributes.brand) missingAttributesHint.push('brand')
    if (!queryContext.keyAttributes.style) missingAttributesHint.push('style')
    if (!queryContext.keyAttributes.size) missingAttributesHint.push('size')
    if (!queryContext.keyAttributes.colour) missingAttributesHint.push('colour')
    if (!queryContext.keyAttributes.material) missingAttributesHint.push('material')

    return {
      emptyReason,
      searchAnnotationCount: searchResponse.annotations.length,
      searchRawTextLength: searchResponse.rawText.length,
      missingAttributesHint,
      ...(extra && {
        strategyUsed: extra.strategyUsed,
        extractedCompCount: extra.extractedCompCount,
        validCompCount: extra.validCompCount,
        filteredOutCount: extra.filteredOutCount,
      }),
    }
  }

  private async enrichCompsWithPreviewImages(comps: PriceCheckComp[]): Promise<PriceCheckComp[]> {
    if (comps.length === 0) {
      return comps
    }

    try {
      return await this.comparableImageEnrichmentService.enrichComparables(comps)
    } catch (error) {
      logger.warn('price_check_comparable_enrichment_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      return comps
    }
  }
}
