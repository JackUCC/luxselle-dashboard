/**
 * PriceCheckService: RAG pipeline for quick price checks.
 * Web search for real listings, then AI extraction of avg price, max buy, max bid.
 */
import { z } from 'zod'
import { SearchService, type QueryContext, type SearchResponse } from '../search/SearchService'
import { getFxService } from '../fx/FxService'
import { filterValidComps } from '../../lib/validation'
import { logger } from '../../middleware/requestId'
import { ComparableImageEnrichmentService } from '../search/ComparableImageEnrichmentService'
import { getAiRouter } from '../ai/AiRouter'

const IE_COMPETITOR_DOMAINS = ['designerexchange.ie', 'luxuryexchange.ie', 'siopaella.com']
const EU_FALLBACK_COMPETITOR_DOMAINS = ['vestiairecollective.com']
const IE_COMPETITOR_SOURCE_HINTS = ['designer exchange', 'luxury exchange', 'siopaella']
const EU_FALLBACK_SOURCE_HINTS = ['vestiaire']

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

interface PriceCheckDiagnostics {
  emptyReason?: 'no_search_data' | 'extraction_failed' | 'insufficient_valid_comps'
  searchAnnotationCount?: number
  searchRawTextLength?: number
  missingAttributesHint?: Array<'brand' | 'style' | 'size' | 'colour' | 'material'>
}

export interface PriceCheckComp {
  title: string
  price: number
  source: string
  sourceUrl?: string
  previewImageUrl?: string
  dataOrigin?: 'web_search' | 'ai_estimate'
}

export interface PriceCheckInput {
  query: string
  condition?: string
  notes?: string
}

export interface PriceCheckResult {
  averageSellingPriceEur: number
  comps: PriceCheckComp[]
  maxBuyEur: number
  maxBidEur: number
  dataSource: 'web_search' | 'ai_fallback'
  researchedAt: string
  diagnostics?: PriceCheckDiagnostics
}

export class PriceCheckService {
  private readonly aiRouter = getAiRouter()
  private readonly searchService = new SearchService()
  private readonly comparableImageEnrichmentService = new ComparableImageEnrichmentService()

  async check(input: PriceCheckInput): Promise<PriceCheckResult> {
    const { query, condition = '', notes = '' } = input
    const refine = [condition, notes].filter(Boolean).join('. ')

    let averageSellingPriceEur = 0
    let comps: PriceCheckComp[] = []
    let dataSource: 'web_search' | 'ai_fallback' = 'ai_fallback'
    let diagnostics: PriceCheckDiagnostics | undefined

    const queryContext = await this.searchService.expandQuery(
      refine ? `${query}. ${refine}` : query,
    )

    const searchResponse = await this.searchService.searchMarketMultiExpanded(
      queryContext.searchVariants.length > 0 ? queryContext.searchVariants : [query],
      { userLocation: { country: 'IE' } },
    )

    const hasSearchData = searchResponse.rawText.length > 50 || searchResponse.results.length > 0

    const fxService = getFxService()
    const [gbpRate, usdRate] = await Promise.all([
      fxService.getRate('GBP', 'EUR'),
      fxService.getRate('USD', 'EUR'),
    ])
    const gbpToEur = gbpRate || 1.17
    const usdToEur = usdRate || 0.92

    const aliases = queryContext.searchVariants.filter((variant) => variant !== query)
    const itemIntelligenceBlock = queryContext.matchingCriteria
      ? `ITEM INTELLIGENCE:
Canonical description: ${queryContext.canonicalDescription}
${aliases.length > 0 ? `Also known as: ${aliases.join(' | ')}` : ''}
Key attributes: Brand: ${queryContext.keyAttributes.brand || 'see item'} | Style: ${queryContext.keyAttributes.style}${queryContext.keyAttributes.size ? ` | Size: ${queryContext.keyAttributes.size}` : ''}${queryContext.keyAttributes.colour ? ` | Colour: ${queryContext.keyAttributes.colour}` : ''}${queryContext.keyAttributes.material ? ` | Material: ${queryContext.keyAttributes.material}` : ''}${queryContext.keyAttributes.hardware ? ` | Hardware: ${queryContext.keyAttributes.hardware}` : ''}
Matching criteria: ${queryContext.matchingCriteria}

SEMANTIC MATCHING:
A listing is a MATCH if it shares the key attributes above, even if the title wording differs.
Do NOT require an exact title match — different resellers use different naming conventions for the same bag.
Example: "Timeless Classic" and "Classic Flap" refer to the same Chanel bag; "2.55" is the same bag family.
Focus on: brand, style family, size, colour, and material — NOT the exact words in the listing title.
A listing is NOT a match if it is a clearly different size, different style, or different colour.`
      : ''

    const refineClause = refine ? `Condition/notes: ${refine}` : ''
    const extractionPrompt = `You are a luxury resale pricing expert. Using ONLY the web search results provided below, extract real listing data for the specified item.

Item: "${query}"
${refineClause}
${itemIntelligenceBlock ? `\n${itemIntelligenceBlock}\n` : ''}
=== WEB SEARCH RESULTS ===
${hasSearchData ? searchResponse.rawText : '(No live results found)'}

Source URLs:
${searchResponse.annotations.map((a) => `- ${a.title}: ${a.url}`).join('\n') || '(none)'}
=== END SEARCH RESULTS ===

Return ONLY a JSON object (no markdown):
{
  "averageSellingPriceEur": <number - average of REAL prices found, or 0 if fewer than 2 found>,
  "comps": [
    { "title": "<actual listing title from search>", "price": <EUR>, "source": "<marketplace name>", "sourceUrl": "<actual URL from search>", "dataOrigin": "web_search" }
  ]
}

RULES (follow ALL of these):
- Extract only listings that match the specific item described above. Use semantic matching — listings with different titles but the same item attributes are valid matches.
- Ignore unrelated products, accessories, dust bags, authentication cards, or shipping charges.
- Only include listings where the price is clearly for the main item (handbag, watch, etc.), not a listing fee or accessory.
- If you find fewer than 2 real listings that clearly match this specific item with confirmed prices, return averageSellingPriceEur: 0 and an empty comps array [].
- If you find 2 or more listings, extract up to 6 comparable listings and set averageSellingPriceEur to the average of their prices.
- Every comparable must include a real sourceUrl.
- Do NOT invent or fabricate any listing, price, or URL.
- If prices are in GBP, convert to EUR using today's rate: 1 GBP = ${gbpToEur.toFixed(2)} EUR
- If prices are in USD, convert to EUR using today's rate: 1 USD = ${usdToEur.toFixed(2)} EUR
- Prioritize Irish competitor sources first (Designer Exchange, Luxury Exchange, Siopella).
- Only use broader European fallback sources (including Vestiaire Collective) when Irish comps are limited.`

    const extraction = await this.extractComparables(extractionPrompt)

    if (!extraction.parsed) {
      logger.warn('price_check_extraction_degraded', {
        reason: extraction.lastFailureReason,
      })
      diagnostics = this.buildDiagnostics(searchResponse, queryContext, hasSearchData ? 'extraction_failed' : 'no_search_data')
      comps = []
      averageSellingPriceEur = 0
      dataSource = 'ai_fallback'
    } else {
      const extractedComps = Array.isArray(extraction.parsed.comps) ? extraction.parsed.comps : []
      const enrichedComps = this.backfillComparableSourceUrls(extractedComps, searchResponse.annotations)
      const allComps = filterValidComps(enrichedComps)
        .filter((comp) => Boolean(comp.sourceUrl))
        .map((comp) => ({
          ...comp,
          sourceUrl: comp.sourceUrl!,
        }))

      if (allComps.length >= 2) {
        comps = this.orderCompsByMarketPriority(allComps)
        averageSellingPriceEur = Math.round(
          comps.reduce((sum, comp) => sum + comp.price, 0) / comps.length,
        )
        diagnostics = this.buildDiagnostics(searchResponse, queryContext)
        dataSource = hasSearchData ? 'web_search' : 'ai_fallback'
      } else {
        comps = []
        averageSellingPriceEur = 0
        diagnostics = this.buildDiagnostics(
          searchResponse,
          queryContext,
          hasSearchData ? 'insufficient_valid_comps' : 'no_search_data',
        )
        dataSource = 'ai_fallback'
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
        systemPrompt: 'Extract structured pricing data from web search results. Return ONLY valid JSON.',
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

  private buildDiagnostics(
    searchResponse: SearchResponse,
    queryContext: QueryContext,
    emptyReason?: 'no_search_data' | 'extraction_failed' | 'insufficient_valid_comps',
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
