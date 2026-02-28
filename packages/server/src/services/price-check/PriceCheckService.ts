/**
 * PriceCheckService: RAG pipeline for quick price checks.
 * Web search for real listings, then AI extraction of avg price, max buy, max bid.
 * @see docs/CODE_REFERENCE.md
 * References: OpenAI, SearchService, FxService, env
 */
import { env } from '../../config/env'
import { SearchService } from '../search/SearchService'
import { getFxService } from '../fx/FxService'
import { validatePriceEur, filterValidComps } from '../../lib/validation'
import { logger } from '../../middleware/requestId'
import { ComparableEnrichmentService } from './ComparableEnrichmentService'

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
}

export class PriceCheckService {
  private readonly searchService = new SearchService()
  private readonly comparableEnrichmentService = new ComparableEnrichmentService()

  async check(input: PriceCheckInput): Promise<PriceCheckResult> {
    const { query, condition = '', notes = '' } = input

    let averageSellingPriceEur: number
    let comps: PriceCheckComp[] = []
    let dataSource: 'web_search' | 'ai_fallback' | 'mock' = 'mock'

    if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
      const refine = [condition, notes].filter(Boolean).join('. ')

      // Step 1: Expand query into canonical attributes + search variants
      const queryContext = await this.searchService.expandQuery(
        refine ? `${query}. ${refine}` : query,
      )

      // Step 2: Fan-out searches across all naming variants
      const searchResponse = await this.searchService.searchMarketMultiExpanded(
        queryContext.searchVariants,
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
- Every comparable listing MUST have a sourceUrl that came from the search results above.
- Do NOT invent or fabricate any listing, price, or URL.
- If prices are in GBP, convert to EUR using today's rate: 1 GBP = ${gbpToEur.toFixed(2)} EUR
- If prices are in USD, convert to EUR using today's rate: 1 USD = ${usdToEur.toFixed(2)} EUR
- Preferred sources: Vestiaire Collective, Designer Exchange, Luxury Exchange, Siopella`

      try {
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

        const text = response.choices[0]?.message?.content ?? ''
        const parsed = JSON.parse(text) as { averageSellingPriceEur?: number; comps?: PriceCheckComp[] }
        const allComps = filterValidComps(Array.isArray(parsed.comps) ? parsed.comps : [])

        // Require at least 2 valid comps before trusting the data.
        // A single cheap comp (e.g. a Vestiaire accessory at €50-€100) must not
        // corrupt the average for a ~€3,000 handbag. If fewer than 2 comps pass
        // validation, treat this as "no data found" and fall back to 0.
        if (allComps.length >= 2) {
          comps = allComps
          averageSellingPriceEur = Math.round(
            comps.reduce((sum, c) => sum + c.price, 0) / comps.length,
          )
        } else {
          comps = []
          averageSellingPriceEur = 0
        }

        dataSource = hasSearchData ? 'web_search' : 'ai_fallback'
      } catch (err) {
        logger.error('price_check_openai_error', err)
        throw err
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
    }
  }

  private async enrichCompsWithPreviewImages(comps: PriceCheckComp[]): Promise<PriceCheckComp[]> {
    const compsWithSourceUrl = comps.filter((comp) => typeof comp.sourceUrl === 'string' && comp.sourceUrl)

    if (compsWithSourceUrl.length === 0) {
      return comps
    }

    try {
      const enrichedResults = await this.comparableEnrichmentService.enrichComparables(
        compsWithSourceUrl.map((comp) => ({ sourceUrl: comp.sourceUrl! })),
      )

      const previewImageBySourceUrl = new Map(
        enrichedResults
          .filter((result) => result.previewImageUrl)
          .map((result) => [result.sourceUrl, result.previewImageUrl] as const),
      )

      return comps.map((comp) => {
        if (!comp.sourceUrl) return comp

        const previewImageUrl = previewImageBySourceUrl.get(comp.sourceUrl)
        if (!previewImageUrl) return comp

        return {
          ...comp,
          previewImageUrl,
        }
      })
    } catch (error) {
      logger.warn('price_check_comparable_enrichment_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      return comps
    }
  }
}
