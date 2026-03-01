import type { PricingAnalysisInput } from '../../pricing/providers/IPricingProvider'
import { NO_FABRICATION_RULE } from '../noFabrication'

export const PRICING_EXTRACTION_SYSTEM_PROMPT =
  'You extract structured pricing data from web search results. Return ONLY valid JSON.'

export function buildPricingSearchQuery(input: Pick<PricingAnalysisInput, 'brand' | 'model' | 'colour' | 'category'>): string {
  return [input.brand, input.model, input.colour, input.category].filter(Boolean).join(' ')
    + ' price second-hand pre-owned for sale EUR'
}

export function buildPricingExtractionPrompt(params: {
  input: PricingAnalysisInput
  marketCountry: string
  marketMode: string
  hasSearchData: boolean
  searchRawText: string
  annotations: Array<{ url: string; title: string }>
  gbpToEur: number
  usdToEur: number
}): string {
  const searchContext = params.hasSearchData
    ? `=== LIVE WEB SEARCH RESULTS ===\n${params.searchRawText}\n\nSource URLs:\n${params.annotations.map((annotation) => `- ${annotation.title}: ${annotation.url}`).join('\n')}\n=== END SEARCH RESULTS ===`
    : '(No live search results available)'

  return `You are a luxury goods pricing expert. Analyse this item and estimate its current resale market value in EUR.

${searchContext}

Item details:
Brand: ${params.input.brand}
Model: ${params.input.model}
Category: ${params.input.category}
Condition: ${params.input.condition}
Colour: ${params.input.colour}
Notes: ${params.input.notes}
${params.input.askPriceEur ? `Asking Price: €${params.input.askPriceEur}` : ''}
Target Market Country: ${params.marketCountry}
Market Mode: ${params.marketMode}

Return ONLY JSON:
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
- Every comparable listing MUST have a sourceUrl from the search results.
- If you cannot find at least 2 real listings with prices, set confidence to 0.3 or below.
- ${NO_FABRICATION_RULE}
- If prices are in GBP, convert using 1 GBP = ${params.gbpToEur.toFixed(2)} EUR.
- If prices are in USD, convert using 1 USD = ${params.usdToEur.toFixed(2)} EUR.
- Prioritize Irish competitor sources first: Designer Exchange, Luxury Exchange, Siopella.
- Use broader EU fallback sources (including Vestiaire) only when Irish comps are limited.`
}
