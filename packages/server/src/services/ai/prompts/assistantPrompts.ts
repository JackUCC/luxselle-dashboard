export const PRODUCT_DESCRIPTION_SYSTEM_PROMPT =
  'You are a concise luxury ecommerce copywriter.'

export function buildProductDescriptionUserPrompt(product: {
  brand?: string
  model?: string
  category?: string
  condition?: string
  colour?: string
  notes?: string
}): string {
  return `Write a compelling, luxury-focused product description for SEO for the following item.

Brand: ${product.brand}
Model: ${product.model}
Category: ${product.category || 'Luxury Item'}
Condition: ${product.condition || 'Pre-owned'}
Colour: ${product.colour || ''}
Key Features: ${product.notes || ''}

The description should be professional, highlight craftsmanship and value, and stay under 150 words.
Return plain text only.`
}

export const BUSINESS_INSIGHTS_SYSTEM_PROMPT =
  'You provide concise business insights for a luxury resale operations dashboard. Return ONLY valid JSON.'

export function buildBusinessInsightsUserPrompt(kpis: Record<string, unknown>): string {
  return `Analyze these business KPIs for a luxury reseller and provide 3 short, actionable bullet insights.

KPIs:
- Total Inventory Value: €${Number(kpis.totalInventoryValue ?? 0)}
- Pending Buy List Value: €${Number(kpis.pendingBuyListValue ?? 0)}
- Active Sourcing Pipeline: €${Number(kpis.activeSourcingPipeline ?? 0)}
- Total Revenue (Recent): €${Number(kpis.revenue ?? 0)}
- Margin: ${Number(kpis.margin ?? 0)}%

Return ONLY JSON:
{
  "insights": ["insight 1", "insight 2", "insight 3"]
}`
}

export const DASHBOARD_ASSISTANT_SYSTEM_PROMPT =
  'You are a concise assistant for a luxury resale business dashboard. Answer in 1-2 short sentences.'

export const RETAIL_LOOKUP_SYSTEM_PROMPT =
  'Extract official retail pricing from web search results. Return ONLY valid JSON.'

export function buildRetailLookupUserPrompt(params: {
  searchContext: string
  description: string
}): string {
  return `You are a luxury retail expert. Find the current OFFICIAL brand retail price (new/boutique), not resale price.

${params.searchContext}

Item description:
"""
${params.description}
"""

Return ONLY JSON:
{
  "retailPriceEur": number or null,
  "currency": "EUR",
  "productName": string or null,
  "note": string
}

Rules:
- Prefer official brand/boutique sources.
- Include source context in note.
- If no reliable official pricing is found, set retailPriceEur to null.`
}

export const SERIAL_DECODE_SYSTEM_PROMPT =
  'You decode luxury goods serial numbers using reference data. Return ONLY valid JSON.'

export function buildSerialDecodeUserPrompt(params: {
  brand: string
  normalizedSerial: string
  itemDescription?: string
  searchContext: string
}): string {
  return `You are a luxury authentication assistant focused on serial/date code interpretation.
${params.searchContext}
Task:
- Using the reference data above (if available), decode this serial/date code.
- Be conservative and avoid fake precision.
- Return strict JSON only.

Input:
- Brand: ${params.brand}
- Serial: ${params.normalizedSerial}
- Item description: ${params.itemDescription ?? ''}

Return exactly this JSON shape:
{
  "success": boolean,
  "brand": "${params.brand}",
  "normalizedSerial": "${params.normalizedSerial}",
  "source": "ai_heuristic",
  "precision": "exact_week|exact_month|exact_year|year_window|unknown",
  "confidence": number,
  "year": number | null,
  "period": string | null,
  "productionWindow": {
    "startYear": number,
    "endYear": number,
    "startMonth": number | null,
    "endMonth": number | null,
    "label": string | null
  } | null,
  "message": string,
  "note": string | null,
  "rationale": string[],
  "uncertainties": string[],
  "candidates": [
    {
      "label": string,
      "year": number | null,
      "period": string | null,
      "productionWindow": {
        "startYear": number,
        "endYear": number,
        "startMonth": number | null,
        "endMonth": number | null,
        "label": string | null
      } | null,
      "confidence": number,
      "rationale": string
    }
  ] | null,
  "formatMatched": string | null
}

Rules:
- confidence must be 0..1.
- If uncertain, use precision "year_window" or "unknown".
- Do not invent exact months/weeks unless justified by reference data.
- If no reliable inference, set success=false and explain missing signals.`
}
