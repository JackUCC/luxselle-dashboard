/**
 * OpenAI-based pricing analysis for luxury goods.
 * Uses RAG: web search for real listings, then AI extraction.
 * @see docs/CODE_REFERENCE.md
 */
import OpenAI from 'openai'
import { SearchService } from '../../../services/search/SearchService'
import { getFxService } from '../../../services/fx/FxService'
import { validatePriceEur, filterValidComps, clampConfidence } from '../../../lib/validation'
import type {
  IPricingProvider,
  PricingAnalysisInput,
  PricingAnalysisResult,
} from './IPricingProvider'

export class OpenAIProvider implements IPricingProvider {
  private client: OpenAI
  private searchService: SearchService

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
    this.searchService = new SearchService()
  }

  async analyse(input: PricingAnalysisInput): Promise<PricingAnalysisResult> {
    const marketCountry = input.marketCountry ?? 'IE'
    const marketMode = input.marketMode ?? 'ie_first_eu_fallback'

    const searchQuery = [input.brand, input.model, input.colour, input.category]
      .filter(Boolean)
      .join(' ') + ' price second-hand pre-owned for sale EUR'

    const searchResponse = await this.searchService.searchMarketMulti(searchQuery, {
      userLocation: { country: marketCountry },
    })

    const hasSearchData = searchResponse.rawText.length > 50 || searchResponse.results.length > 0
    const searchContext = hasSearchData
      ? `=== LIVE WEB SEARCH RESULTS ===\n${searchResponse.rawText}\n\nSource URLs:\n${searchResponse.annotations.map((a) => `- ${a.title}: ${a.url}`).join('\n')}\n=== END SEARCH RESULTS ===`
      : '(No live search results available — use your knowledge)'

    const fxService = getFxService()
    const [gbpRate, usdRate] = await Promise.all([
      fxService.getRate('GBP', 'EUR'),
      fxService.getRate('USD', 'EUR'),
    ])
    const gbpToEur = gbpRate || 1.17
    const usdToEur = usdRate || 0.92

    const prompt = `You are a luxury goods pricing expert. Analyse this item and estimate its current retail market value in EUR.

${searchContext}

Item details:
Brand: ${input.brand}
Model: ${input.model}
Category: ${input.category}
Condition: ${input.condition}
Colour: ${input.colour}
Notes: ${input.notes}
${input.askPriceEur ? `Asking Price: €${input.askPriceEur}` : ''}
Target Market Country: ${marketCountry}
Market Mode: ${marketMode}

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "estimatedRetailEur": <number>,
  "confidence": <number between 0 and 1>,
  "comps": [
    {
      "title": "<listing title from search results>",
      "price": <number in EUR>,
      "source": "<marketplace name>",
      "sourceUrl": "<actual URL from search>",
      "marketCountry": "IE|EU",
      "dataOrigin": "web_search"
    }
  ]
}

CRITICAL RULES:
- Every comparable listing MUST have a sourceUrl that came from the search results above. If estimating without search data, set dataOrigin to "ai_estimate" and sourceUrl to null where unknown.
- If you cannot find at least 2 real listings with prices, set confidence to 0.3 or below.
- Do NOT invent or fabricate any listing, price, or URL.
- If a field cannot be determined from the search data, use null instead of guessing.

Confidence scoring rules:
- 0.9+: 5+ real listings found with prices from approved sources
- 0.7-0.89: 3-4 real listings found
- 0.5-0.69: 1-2 real listings found
- 0.3-0.49: No real listings but strong knowledge of this specific item
- Below 0.3: Unfamiliar item or very sparse data

Rules:
- Extract comparables from the web search results with REAL titles, prices, and URLs
- If prices are in GBP, convert to EUR using today's rate: 1 GBP = ${gbpToEur.toFixed(2)} EUR
- If prices are in USD, convert to EUR using today's rate: 1 USD = ${usdToEur.toFixed(2)} EUR
- Prioritize Irish competitor sources first: Designer Exchange, Luxury Exchange, Siopella
- Use broader European fallback sources (including Vestiaire Collective) only when Irish comps are limited
- Mark Designer Exchange, Luxury Exchange, and Siopella as marketCountry "IE" and Vestiaire Collective as "EU"`

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You extract structured pricing data from web search results. Return ONLY valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })

    const text = response.choices[0]?.message?.content ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('OpenAI returned no valid JSON for pricing analysis')
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      estimatedRetailEur: number
      confidence: number
      comps: Array<{
        title: string
        price: number
        source: string
        sourceUrl?: string
        marketCountry?: string
        url?: string
      }>
    }

    type CompItem = {
      title: string
      price: number
      source: string
      sourceUrl?: string
      marketCountry?: string
      url?: string
      dataOrigin?: 'web_search' | 'ai_estimate'
    }
    const validComps = filterValidComps((parsed.comps ?? []) as CompItem[])

    return {
      estimatedRetailEur: validatePriceEur(parsed.estimatedRetailEur),
      confidence: clampConfidence(parsed.confidence),
      comps: validComps.map((c) => ({
        title: c.title,
        price: Math.round(c.price),
        source: c.source,
        sourceUrl: c.sourceUrl ?? c.url,
        marketCountry: (c.marketCountry ?? 'EU').toUpperCase(),
        dataOrigin: c.dataOrigin ?? 'web_search',
      })),
    }
  }
}
