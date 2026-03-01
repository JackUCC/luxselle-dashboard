import { NO_FABRICATION_RULE } from '../noFabrication'

interface MarketResearchInputLike {
  brand: string
  model: string
  category: string
  condition: string
  colour?: string
  year?: string
  notes?: string
  currentAskPriceEur?: number
}

interface QueryContextLike {
  canonicalDescription: string
  searchVariants: string[]
  matchingCriteria: string
  keyAttributes: {
    brand: string
    style: string
    size?: string | null
    material?: string | null
    colour?: string | null
    hardware?: string | null
  }
}

export const MARKET_RESEARCH_EXTRACTION_SYSTEM_PROMPT =
  'You are a luxury market analyst. Extract structured market intelligence from web search results. Return ONLY valid JSON.'

export const TRENDING_SYSTEM_PROMPT = 'You are a luxury market analyst. Return ONLY valid JSON.'

export const TRENDING_USER_PROMPT = `You are a luxury goods market analyst. Identify the top 8 trending luxury items in the European resale market right now.

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "items": [
    {
      "brand": "<brand name>",
      "model": "<model name>",
      "category": "<Handbag|Wallet|Shoes|Watch|Jewelry|Accessory|Clothing>",
      "demandLevel": "<very_high|high|moderate>",
      "priceTrend": "<rising|stable|declining>",
      "avgPriceEur": <number>,
      "searchVolume": "<high|medium|low>"
    }
  ]
}`

export const COMPETITOR_FEED_SYSTEM_PROMPT = `You are a luxury resale data extractor. Extract structured listing data from these web search results from Irish/EU luxury resale platforms.

Domain -> source name mapping:
- designerexchange.ie -> "Designer Exchange"
- luxuryexchange.ie -> "Luxury Exchange"
- siopaella.com -> "Siopella"

For each distinct listing found, extract:
- title: Full product name as listed (brand + model + colour/material if present)
- priceEur: Price as a number in EUR (convert GBP or USD if needed: £1=€1.17, $1=€0.92)
- source: One of "Designer Exchange" | "Luxury Exchange" | "Siopella" (infer from URL domain)
- sourceUrl: Direct URL of the product listing page (not the homepage)
- condition: Condition string if mentioned (e.g. "Excellent", "Very Good", "Good"), otherwise omit
- listedAt: ISO date string if identifiable, otherwise omit

Return ONLY a valid JSON object (no markdown):
{ "items": [...] }

RULES:
- Every item must include a sourceUrl from the provided search data.
- Only extract listings with a clear price in EUR or a convertible currency.
- Maximum 10 items total.
- Prefer items with direct product page URLs over homepage links.
- ${NO_FABRICATION_RULE}`

export function buildMarketResearchSearchQuery(input: Pick<MarketResearchInputLike, 'brand' | 'model' | 'colour' | 'category'>): string {
  const parts = [input.brand, input.model]
  if (input.colour) parts.push(input.colour)
  if (input.category && input.category !== 'Other') parts.push(input.category)
  return parts.filter(Boolean).join(' ')
}

export function buildMarketResearchExtractionPrompt(params: {
  input: MarketResearchInputLike
  searchContext: string
  gbpRate: number
  usdRate: number
  queryContext?: QueryContextLike
}): string {
  const baseQuery = buildMarketResearchSearchQuery(params.input)
  const aliases = params.queryContext?.searchVariants.filter((variant) => variant !== baseQuery) ?? []
  const semanticBlock = params.queryContext?.matchingCriteria
    ? `\nSEMANTIC MATCHING INTELLIGENCE:
Canonical description: ${params.queryContext.canonicalDescription}
${aliases.length > 0 ? `Also known as: ${aliases.join(' | ')}` : ''}
Key attributes: Brand: ${params.queryContext.keyAttributes.brand || params.input.brand} | Style: ${params.queryContext.keyAttributes.style}${params.queryContext.keyAttributes.size ? ` | Size: ${params.queryContext.keyAttributes.size}` : ''}${params.queryContext.keyAttributes.colour ? ` | Colour: ${params.queryContext.keyAttributes.colour}` : ''}${params.queryContext.keyAttributes.material ? ` | Material: ${params.queryContext.keyAttributes.material}` : ''}${params.queryContext.keyAttributes.hardware ? ` | Hardware: ${params.queryContext.keyAttributes.hardware}` : ''}
Matching criteria: ${params.queryContext.matchingCriteria}

When identifying comparable listings: use SEMANTIC matching, not exact title matching. Different resellers use different naming conventions for the same bag. Example: "Timeless Classic" and "Classic Flap" are the same Chanel bag. Focus on brand, style family, size, colour, and material - NOT exact wording.
`
    : ''

  return `You are a luxury goods market research analyst specializing in the European resale market (Ireland and EU).

You have been provided REAL web search results below. Use ONLY the data from these search results to form your analysis. ${NO_FABRICATION_RULE}
${semanticBlock}
=== WEB SEARCH RESULTS ===
${params.searchContext}
=== END SEARCH RESULTS ===

Item to analyse:
Brand: ${params.input.brand}
Model: ${params.input.model}
Category: ${params.input.category}
Condition: ${params.input.condition}
${params.input.colour ? `Colour: ${params.input.colour}` : ''}
${params.input.year ? `Year: ${params.input.year}` : ''}
${params.input.notes ? `Notes: ${params.input.notes}` : ''}
${params.input.currentAskPriceEur ? `Current Asking Price: €${params.input.currentAskPriceEur}` : ''}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "estimatedMarketValueEur": <number - average of real prices found in search results>,
  "priceRangeLowEur": <number - lowest real price found>,
  "priceRangeHighEur": <number - highest real price found>,
  "suggestedBuyPriceEur": <number - max price to pay for 35% margin>,
  "suggestedSellPriceEur": <number - realistic sell price based on found data>,
  "demandLevel": "<very_high|high|moderate|low|very_low>",
  "priceTrend": "<rising|stable|declining>",
  "marketLiquidity": "<fast_moving|moderate|slow_moving>",
  "recommendation": "<strong_buy|buy|hold|pass>",
  "confidence": <0 to 1 - higher if many real listings found, lower if sparse>,
  "marketSummary": "<2-3 sentence overview citing the real data found>",
  "keyInsights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "riskFactors": ["<risk 1>", "<risk 2>"],
  "comparables": [
    {
      "title": "<listing title from search results>",
      "priceEur": <number - actual price from listing>,
      "source": "<marketplace name>",
      "sourceUrl": "<actual URL from search>",
      "condition": "<condition if mentioned>",
      "daysListed": <number or null>,
      "dataOrigin": "web_search"
    }
  ],
  "seasonalNotes": "<any seasonal pricing effects>"
}

CRITICAL RULES:
- Every comparable listing MUST have a sourceUrl that came from the search results above.
- If you cannot find at least 2 real listings with prices, set confidence to 0.3 or below.
- ${NO_FABRICATION_RULE}
- If a field cannot be determined from the search data, use null instead of guessing.

Rules:
- If a price is in GBP, convert to EUR using today's rate: 1 GBP = ${params.gbpRate.toFixed(2)} EUR
- If a price is in USD, convert to EUR using today's rate: 1 USD = ${params.usdRate.toFixed(2)} EUR
- Preferred sources: Vestiaire Collective, Designer Exchange, Luxury Exchange, Siopella
- suggestedBuyPriceEur = estimatedMarketValueEur * 0.65 (35% margin)`
}
