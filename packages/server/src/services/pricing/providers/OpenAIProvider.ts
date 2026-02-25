/**
 * OpenAI-based pricing analysis for luxury goods.
 * Uses RAG: web search for real listings, then AI extraction.
 * @see docs/CODE_REFERENCE.md
 */
import OpenAI from 'openai'
import { SearchService } from '../../../services/search/SearchService'
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

    const searchResponse = await this.searchService.searchMarket(searchQuery, {
      userLocation: { country: marketCountry },
    })

    const hasSearchData = searchResponse.rawText.length > 50 || searchResponse.results.length > 0
    const searchContext = hasSearchData
      ? `=== LIVE WEB SEARCH RESULTS ===\n${searchResponse.rawText}\n\nSource URLs:\n${searchResponse.annotations.map((a) => `- ${a.title}: ${a.url}`).join('\n')}\n=== END SEARCH RESULTS ===`
      : '(No live search results available — use your knowledge)'

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
      "marketCountry": "IE|EU"
    }
  ]
}

Rules:
- Extract comparables from the web search results with REAL titles, prices, and URLs
- If prices are in GBP, convert: 1 GBP ≈ 1.17 EUR
- Preferred sources: Vestiaire Collective, Designer Exchange, Luxury Exchange, Siopella
- Mark Designer Exchange, Luxury Exchange, and Siopella as marketCountry "IE" and Vestiaire Collective as "EU"
- confidence should be higher (0.7+) when real search data is available, lower (<0.5) when estimating`

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

    return {
      estimatedRetailEur: Math.round(parsed.estimatedRetailEur),
      confidence: Math.min(1, Math.max(0, parsed.confidence)),
      comps: (parsed.comps ?? []).map((c) => ({
        title: c.title,
        price: Math.round(c.price),
        source: c.source,
        sourceUrl: c.sourceUrl ?? c.url,
        marketCountry: (c.marketCountry ?? 'EU').toUpperCase(),
      })),
    }
  }
}
