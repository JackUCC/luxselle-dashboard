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

export interface PriceCheckComp {
  title: string
  price: number
  source: string
  sourceUrl?: string
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

  async check(input: PriceCheckInput): Promise<PriceCheckResult> {
    const { query, condition = '', notes = '' } = input

    let averageSellingPriceEur: number
    let comps: PriceCheckComp[] = []
    let dataSource: 'web_search' | 'ai_fallback' | 'mock' = 'mock'

    if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
      const refine = [condition, notes].filter(Boolean).join('. ')
      const searchQuery = `${query} ${refine} price second-hand pre-owned for sale EUR`

      const searchResponse = await this.searchService.searchMarketMulti(searchQuery, {
        userLocation: { country: 'IE' },
      })

      const hasSearchData = searchResponse.rawText.length > 50 || searchResponse.results.length > 0

      const fxService = getFxService()
      const [gbpRate, usdRate] = await Promise.all([
        fxService.getRate('GBP', 'EUR'),
        fxService.getRate('USD', 'EUR'),
      ])
      const gbpToEur = gbpRate || 1.17
      const usdToEur = usdRate || 0.92

      const refineClause = refine ? `Condition/notes: ${refine}` : ''
      const extractionPrompt = `You are a luxury resale pricing expert. Using ONLY the web search results provided below, extract real listing data.

Item: "${query}"
${refineClause}

=== WEB SEARCH RESULTS ===
${hasSearchData ? searchResponse.rawText : '(No live results found)'}

Source URLs:
${searchResponse.annotations.map((a) => `- ${a.title}: ${a.url}`).join('\n') || '(none)'}
=== END SEARCH RESULTS ===

Return ONLY a JSON object (no markdown):
{
  "averageSellingPriceEur": <number - average of REAL prices found in search results>,
  "comps": [
    { "title": "<actual listing title from search>", "price": <EUR>, "source": "<marketplace name>", "sourceUrl": "<actual URL from search>", "dataOrigin": "web_search" }
  ]
}

CRITICAL RULES:
- Every comparable listing MUST have a sourceUrl that came from the search results above.
- If you cannot find at least 2 real listings with prices, return averageSellingPriceEur: 0 and empty comps.
- Do NOT invent or fabricate any listing, price, or URL.
- If a field cannot be determined from the search data, use null instead of guessing.

Rules:
- Extract 3-6 real comparable listings from the search results with their actual prices and URLs
- averageSellingPriceEur must be calculated from the real prices found
- If prices are in GBP, convert to EUR using today's rate: 1 GBP = ${gbpToEur.toFixed(2)} EUR
- If prices are in USD, convert to EUR using today's rate: 1 USD = ${usdToEur.toFixed(2)} EUR
- Preferred sources: Vestiaire Collective, Designer Exchange, Luxury Exchange, Siopella
- If no real listings were found in the search results, return averageSellingPriceEur: 0 and empty comps`

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
        averageSellingPriceEur = validatePriceEur(parsed.averageSellingPriceEur ?? 0)
        comps = filterValidComps(Array.isArray(parsed.comps) ? parsed.comps : [])
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
}
