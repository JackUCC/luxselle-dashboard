import { NO_FABRICATION_RULE } from '../noFabrication'

interface PriceCheckQueryContext {
  canonicalDescription: string
  keyAttributes: {
    brand: string
    style: string
    size?: string | null
    material?: string | null
    colour?: string | null
    hardware?: string | null
  }
  searchVariants: string[]
  matchingCriteria: string
}

export const PRICE_CHECK_EXTRACTION_SYSTEM_PROMPT =
  'Extract structured pricing data from web search results. Return ONLY valid JSON.'

function buildItemIntelligenceBlock(params: {
  query: string
  queryContext: PriceCheckQueryContext
}): string {
  const { query, queryContext } = params
  const aliases = queryContext.searchVariants.filter((variant) => variant !== query)

  if (!queryContext.matchingCriteria) {
    return ''
  }

  return `ITEM INTELLIGENCE:
Canonical description: ${queryContext.canonicalDescription}
${aliases.length > 0 ? `Also known as: ${aliases.join(' | ')}` : ''}
Key attributes: Brand: ${queryContext.keyAttributes.brand || 'see item'} | Style: ${queryContext.keyAttributes.style}${queryContext.keyAttributes.size ? ` | Size: ${queryContext.keyAttributes.size}` : ''}${queryContext.keyAttributes.colour ? ` | Colour: ${queryContext.keyAttributes.colour}` : ''}${queryContext.keyAttributes.material ? ` | Material: ${queryContext.keyAttributes.material}` : ''}${queryContext.keyAttributes.hardware ? ` | Hardware: ${queryContext.keyAttributes.hardware}` : ''}
Matching criteria: ${queryContext.matchingCriteria}

SEMANTIC MATCHING:
A listing is a MATCH if it shares the key attributes above, even if the title wording differs.
Do NOT require an exact title match - different resellers use different naming conventions for the same bag.
Example: "Timeless Classic" and "Classic Flap" refer to the same Chanel bag; "2.55" is the same bag family.
Focus on: brand, style family, size, colour, and material - NOT the exact words in the listing title.
A listing is NOT a match if it is a clearly different size, different style, or different colour.`
}

export function buildPriceCheckExtractionPrompt(params: {
  query: string
  refine: string
  queryContext: PriceCheckQueryContext
  hasSearchData: boolean
  searchRawText: string
  annotations: Array<{ url: string; title: string }>
  gbpToEur: number
  usdToEur: number
}): string {
  const itemIntelligenceBlock = buildItemIntelligenceBlock({
    query: params.query,
    queryContext: params.queryContext,
  })
  const refineClause = params.refine ? `Condition/notes: ${params.refine}` : ''

  return `You are a luxury resale pricing expert. Using ONLY the web search results provided below, extract real listing data for the specified item.

Item: "${params.query}"
${refineClause}
${itemIntelligenceBlock ? `\n${itemIntelligenceBlock}\n` : ''}
=== WEB SEARCH RESULTS ===
${params.hasSearchData ? params.searchRawText : '(No live results found)'}

Source URLs:
${params.annotations.map((annotation) => `- ${annotation.title}: ${annotation.url}`).join('\n') || '(none)'}
=== END SEARCH RESULTS ===

Return ONLY a JSON object (no markdown):
{
  "averageSellingPriceEur": <number - average of REAL prices found, or 0 if fewer than 2 found>,
  "comps": [
    { "title": "<actual listing title from search>", "price": <EUR>, "source": "<marketplace name>", "sourceUrl": "<actual URL from search>", "dataOrigin": "web_search" }
  ]
}

RULES (follow ALL of these):
- Extract only listings that match the specific item described above. Use semantic matching - listings with different titles but the same item attributes are valid matches.
- Ignore unrelated products, accessories, dust bags, authentication cards, or shipping charges.
- Only include listings where the price is clearly for the main item (handbag, watch, etc.), not a listing fee or accessory.
- If you find fewer than 2 real listings that clearly match this specific item with confirmed prices, return averageSellingPriceEur: 0 and an empty comps array [].
- If you find 2 or more listings, extract up to 6 comparable listings and set averageSellingPriceEur to the average of their prices.
- Every comparable must include a real sourceUrl.
- ${NO_FABRICATION_RULE}
- If prices are in GBP, convert to EUR using today's rate: 1 GBP = ${params.gbpToEur.toFixed(2)} EUR
- If prices are in USD, convert to EUR using today's rate: 1 USD = ${params.usdToEur.toFixed(2)} EUR
- Prioritize Irish competitor sources first (Designer Exchange, Luxury Exchange, Siopella).
- Only use broader European fallback sources (including Vestiaire Collective) when Irish comps are limited.`
}
