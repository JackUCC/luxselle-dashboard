/**
 * PriceCheckService: RAG pipeline for quick price checks.
 * Web search for real listings, then AI extraction of avg price, max buy, max bid.
 * @see docs/CODE_REFERENCE.md
 * References: OpenAI, SearchService, FxService, env
 */
import { env } from '../../config/env'
import { SearchService, type QueryContext, type SearchResponse } from '../search/SearchService'
import { getFxService } from '../fx/FxService'
import { filterValidComps } from '../../lib/validation'
import { logger } from '../../middleware/requestId'
import { ComparableImageEnrichmentService } from '../search/ComparableImageEnrichmentService'

const IE_COMPETITOR_DOMAINS = ['designerexchange.ie', 'luxuryexchange.ie', 'siopaella.com']
const EU_FALLBACK_COMPETITOR_DOMAINS = ['vestiairecollective.com']
const IE_COMPETITOR_SOURCE_HINTS = ['designer exchange', 'luxury exchange', 'siopaella']
const EU_FALLBACK_SOURCE_HINTS = ['vestiaire']
const PRICE_CHECK_EXTRACTION_MAX_ATTEMPTS = 2
const PRICE_CHECK_EXTRACTION_RETRY_BACKOFF_MS = 200

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
  dataSource: 'web_search' | 'ai_fallback' | 'mock'
  researchedAt: string
  diagnostics?: PriceCheckDiagnostics
}

export class PriceCheckService {
  private readonly searchService = new SearchService()
  private readonly comparableImageEnrichmentService = new ComparableImageEnrichmentService()

  async check(input: PriceCheckInput): Promise<PriceCheckResult> {
    const { query, condition = '', notes = '' } = input

    let averageSellingPriceEur = 0
    let comps: PriceCheckComp[] = []
    let dataSource: 'web_search' | 'ai_fallback' | 'mock' = 'mock'
    let diagnostics: PriceCheckDiagnostics | undefined

    if (this.hasAiSearchProvider()) {
      const refine = [condition, notes].filter(Boolean).join('. ')

      // Step 1: Expand query into canonical attributes + search variants
      const queryContext = await this.searchService.expandQuery(
        refine ? `${query}. ${refine}` : query,
      )

      // Step 2: Single-path Irish+EU search to keep latency/call count bounded
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

      // Build semantic context block for the extraction prompt
      const aliases = queryContext.searchVariants.filter((v) => v !== query)
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
- Do NOT invent or fabricate any listing, price, or URL.
- If prices are in GBP, convert to EUR using today's rate: 1 GBP = ${gbpToEur.toFixed(2)} EUR
- If prices are in USD, convert to EUR using today's rate: 1 USD = ${usdToEur.toFixed(2)} EUR
- Prioritize Irish competitor sources first (Designer Exchange, Luxury Exchange, Siopella).
- Only use broader European fallback sources (including Vestiaire Collective) when Irish comps are limited.`

      const extractionStartedAt = Date.now()
      const extraction = await this.extractComparables(extractionPrompt)

      if (!extraction.parsed) {
        logger.warn('price_check_extraction_degraded', {
          attempts: PRICE_CHECK_EXTRACTION_MAX_ATTEMPTS,
          elapsedMs: Date.now() - extractionStartedAt,
          reason: extraction.lastFailureReason,
        })
        comps = []
        averageSellingPriceEur = 0
        diagnostics = this.buildDiagnostics(searchResponse, queryContext, 'extraction_failed')
        dataSource = 'ai_fallback'
      } else {
        const extractedComps = Array.isArray(extraction.parsed.comps) ? extraction.parsed.comps : []
        const enrichedComps = this.backfillComparableSourceUrls(extractedComps, searchResponse.annotations)
        const allComps = filterValidComps(enrichedComps)

        if (allComps.length >= 2) {
          comps = this.orderCompsByMarketPriority(allComps)
          averageSellingPriceEur = Math.round(
            comps.reduce((sum, c) => sum + c.price, 0) / comps.length,
          )
          diagnostics = this.buildDiagnostics(searchResponse, queryContext)
        } else {
          comps = []
          averageSellingPriceEur = 0
          diagnostics = this.buildDiagnostics(searchResponse, queryContext, hasSearchData ? 'insufficient_valid_comps' : 'no_search_data')
        }

        dataSource = hasSearchData ? 'web_search' : 'ai_fallback'
      }
    } else {
      averageSellingPriceEur = 1200
      comps = [
        {
          title: 'Similar item (Designer Exchange)',
          price: 1150,
          source: 'Designer Exchange',
          sourceUrl: 'https://designerexchange.ie',
        },
        {
          title: 'Similar item (Vestiaire Collective)',
          price: 1250,
          source: 'Vestiaire Collective',
          sourceUrl: 'https://vestiairecollective.com',
        },
      ]
    }

    if (dataSource !== 'mock') {
      comps = await this.enrichCompsWithPreviewImages(comps)
    }

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

  private hasAiSearchProvider(): boolean {
    if (env.AI_PROVIDER === 'openai') {
      return Boolean(env.OPENAI_API_KEY)
    }
    if (env.AI_PROVIDER === 'perplexity') {
      return Boolean(env.PERPLEXITY_API_KEY)
    }
    return false
  }

  private async extractComparables(
    extractionPrompt: string,
  ): Promise<{ parsed: { averageSellingPriceEur?: number; comps?: PriceCheckComp[] } | null; lastFailureReason: string }> {
    let parsed: { averageSellingPriceEur?: number; comps?: PriceCheckComp[] } | null = null
    let lastFailureReason = 'unknown'

    for (let attempt = 1; attempt <= PRICE_CHECK_EXTRACTION_MAX_ATTEMPTS; attempt += 1) {
      const attemptStartedAt = Date.now()
      try {
        const text = await this.callExtractionModel(extractionPrompt)
        parsed = JSON.parse(text) as { averageSellingPriceEur?: number; comps?: PriceCheckComp[] }
        break
      } catch (error) {
        lastFailureReason = error instanceof Error ? error.message : String(error)
        logger.warn('price_check_extraction_attempt_failed', {
          attempt,
          maxAttempts: PRICE_CHECK_EXTRACTION_MAX_ATTEMPTS,
          elapsedMs: Date.now() - attemptStartedAt,
          reason: lastFailureReason,
        })

        if (attempt < PRICE_CHECK_EXTRACTION_MAX_ATTEMPTS) {
          await this.sleep(PRICE_CHECK_EXTRACTION_RETRY_BACKOFF_MS)
        }
      }
    }

    return { parsed, lastFailureReason }
  }

  private async callExtractionModel(extractionPrompt: string): Promise<string> {
    if (env.AI_PROVIDER === 'openai') {
      const OpenAI = (await import('openai')).default
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract structured pricing data from web search results. Return ONLY valid JSON.',
          },
          { role: 'user', content: extractionPrompt },
        ],
        max_tokens: 800,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      })
      return response.choices[0]?.message?.content ?? ''
    }

    if (env.AI_PROVIDER === 'perplexity' && env.PERPLEXITY_API_KEY) {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.PERPLEXITY_EXTRACTION_MODEL,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Extract structured pricing data from web search results. Return ONLY valid JSON.' },
            { role: 'user', content: extractionPrompt },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`perplexity_extraction_http_${response.status}`)
      }

      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
      return payload.choices?.[0]?.message?.content ?? ''
    }

    throw new Error('no_supported_extraction_provider')
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
      const annotationMatch = annotations.find((ann) => {
        const annTitle = ann.title.trim().toLowerCase()
        const titleMatch = normalizedTitle.length > 0 && annTitle.includes(normalizedTitle)
        const sourceMatch = normalizedSource.length > 0 && ann.url.toLowerCase().includes(normalizedSource.replace(/\s+/g, ''))
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

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms))
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
