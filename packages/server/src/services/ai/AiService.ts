import { env } from '../../config/env'
import {
    Product,
    SerialDecodeHeuristicInputSchema,
    SerialDecodeResultSchema,
    type SerialDecodeHeuristicInput,
    type SerialDecodeResult,
} from '@shared/schemas'

export interface BusinessInsights {
    insights: string[]
    generatedAt: string
}

export class AiService {
    private openai: any

    private async getOpenAI() {
        if (!this.openai) {
            const OpenAI = (await import('openai')).default
            this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
        }
        return this.openai
    }

    async generateProductDescription(product: Partial<Product>): Promise<string> {
        if (env.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY) {
            return this.mockDescription(product)
        }

        try {
            const openai = await this.getOpenAI()
            const prompt = `Write a compelling, luxury-focused product description for SEO for the following item.
      
Brand: ${product.brand}
Model: ${product.model}
Category: ${product.category || 'Luxury Item'}
Condition: ${product.condition || 'Pre-owned'}
Colour: ${product.colour || ''}
Key Features: ${product.notes || ''}

The description should be professional, highlighting the craftsmanship and value. Keep it under 150 words. Do not use markdown formatting, just plain text paragraphs.`

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 300,
                temperature: 0.7,
            })

            return response.choices[0]?.message?.content?.trim() ?? ''
        } catch (error) {
            console.error('AI Description Generation Failed:', error)
            return this.mockDescription(product)
        }
    }

    async generateBusinessInsights(kpis: any): Promise<BusinessInsights> {
        if (env.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY) {
            return this.mockInsights()
        }

        try {
            const openai = await this.getOpenAI()
            const prompt = `Analyze these business KPIs for a luxury reseller and provide 3 short, actionable, bullet-point insights (max 1 sentence each) to improve performance or highlight risks.

KPIs:
- Total Inventory Value: €${kpis.totalInventoryValue}
- Pending Buy List Value: €${kpis.pendingBuyListValue}
- Active Sourcing Pipeline: €${kpis.activeSourcingPipeline}
- Low Stock Items: ${kpis.lowStockAlerts}
- Total Revenue (Recent): €${kpis.revenue || 0}
- Margin: ${kpis.margin || 0}%

Return ONLY a valid JSON object:
{
  "insights": ["insight 1", "insight 2", "insight 3"]
}`

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 300,
                temperature: 0.7,
            })

            const text = response.choices[0]?.message?.content ?? ''
            const jsonMatch = text.match(/\{[\s\S]*\}/)

            if (!jsonMatch) throw new Error('No JSON found in AI response')

            const parsed = JSON.parse(jsonMatch[0])
            return {
                insights: parsed.insights || [],
                generatedAt: new Date().toISOString()
            }

        } catch (error) {
            console.error('AI Insights Generation Failed:', error)
            return this.mockInsights()
        }
    }

    private mockDescription(product: Partial<Product>): string {
        return `[MOCK AI] This beautiful ${product.brand} ${product.model} in ${product.colour || 'classic'} finish is a testament to timeless luxury. In ${product.condition} condition, it represents an excellent opportunity for collectors and enthusiasts alike.`
    }

    private mockInsights(): BusinessInsights {
        return {
            insights: [
                "Inventory levels are optimal, but consider increasing sourcing for high-demand items.",
                "Pending buy list value is high; prioritize closing these deals to boost stock.",
                "Margin is healthy, but keep an eye on aging low-stock items."
            ],
            generatedAt: new Date().toISOString()
        }
    }

    /** Simple free-form prompt for dashboard prompt bar. */
    async prompt(userPrompt: string): Promise<string> {
        if (env.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY) {
            return this.mockPromptReply(userPrompt)
        }

        try {
            const openai = await this.getOpenAI()
            const system = `You are a concise assistant for a luxury resale business dashboard. Answer in 1-2 short sentences. Topics: inventory, KPIs, buying, sourcing, margins.`
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: 150,
                temperature: 0.5,
            })
            return response.choices[0]?.message?.content?.trim() ?? ''
        } catch (error) {
            console.error('AI Prompt Failed:', error)
            return this.mockPromptReply(userPrompt)
        }
    }

    private mockPromptReply(_prompt: string): string {
        return "With mock AI, I can't analyze live data. Connect OpenAI in .env to get real answers about your inventory and KPIs."
    }

    /**
     * Estimate the official / brand retail price (new, from the brand) for an item from its description.
     * Used for "What was this retail?" — helps compare brand-new price vs second-hand.
     */
    async getRetailPriceFromDescription(description: string): Promise<{
        retailPriceEur: number | null
        currency: string
        productName: string | null
        note: string
    }> {
        if (env.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY) {
            return this.mockRetailPrice(description)
        }

        const trimmed = description.trim()
        if (!trimmed) {
            return {
                retailPriceEur: null,
                currency: 'EUR',
                productName: null,
                note: 'Please paste an item description (e.g. brand, model, category).',
            }
        }

        try {
            const openai = await this.getOpenAI()
            const prompt = `You are a luxury retail expert. Given the following item description, estimate the CURRENT OFFICIAL RETAIL PRICE — i.e. what the brand sells this item for NEW, directly from the brand (boutique or official website), NOT second-hand or resale market prices.

Item description:
"""
${trimmed}
"""

Return ONLY a valid JSON object with these exact keys:
- "retailPriceEur": number or null (estimate in EUR; use null if you cannot identify the product or price)
- "currency": "EUR"
- "productName": string or null (short name e.g. "Chanel Classic Flap Medium")
- "note": string (one short sentence, e.g. "Current boutique price as of 2024" or "Approximate; check brand website for your region")

If the description is too vague or not a recognisable luxury product, set retailPriceEur to null and explain in note.`

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.3,
            })

            const text = response.choices[0]?.message?.content?.trim() ?? ''
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (!jsonMatch) throw new Error('No JSON in response')

            const parsed = JSON.parse(jsonMatch[0]) as {
                retailPriceEur?: number | null
                currency?: string
                productName?: string | null
                note?: string
            }

            const retailPriceEur =
                typeof parsed.retailPriceEur === 'number' && parsed.retailPriceEur >= 0
                    ? parsed.retailPriceEur
                    : null

            return {
                retailPriceEur,
                currency: parsed.currency === 'EUR' ? 'EUR' : 'EUR',
                productName:
                    typeof parsed.productName === 'string' && parsed.productName.trim()
                        ? parsed.productName.trim()
                        : null,
                note:
                    typeof parsed.note === 'string' && parsed.note.trim()
                        ? parsed.note.trim()
                        : retailPriceEur != null
                          ? 'Estimate; verify on brand website.'
                          : 'Could not determine retail price from description.',
            }
        } catch (error) {
            console.error('AI Retail Price Lookup Failed:', error)
            return this.mockRetailPrice(description)
        }
    }

    async decodeSerialHeuristic(input: SerialDecodeHeuristicInput): Promise<SerialDecodeResult> {
        const parsedInput = SerialDecodeHeuristicInputSchema.parse(input)
        const normalizedSerial = parsedInput.serial.replace(/\s+/g, '').trim().toUpperCase()
        if (!normalizedSerial) {
            return SerialDecodeResultSchema.parse({
                success: false,
                brand: parsedInput.brand,
                normalizedSerial: '',
                source: 'ai_heuristic',
                precision: 'unknown',
                confidence: 0,
                message: 'Enter a serial or date code to decode.',
                rationale: [],
                uncertainties: [],
            })
        }

        if (env.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY) {
            return this.mockSerialDecodeHeuristic(parsedInput.brand, normalizedSerial)
        }

        try {
            const openai = await this.getOpenAI()
            const prompt = `You are a luxury authentication assistant focused on serial/date code interpretation.

Task:
- Infer likely production timing from a bag serial/date code.
- Be conservative and avoid fake precision.
- Return strict JSON only.

Input:
- Brand: ${parsedInput.brand}
- Serial: ${normalizedSerial}
- Item description: ${parsedInput.itemDescription ?? ''}

Return exactly this JSON shape:
{
  "success": boolean,
  "brand": "${parsedInput.brand}",
  "normalizedSerial": "${normalizedSerial}",
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
- confidence between 0 and 1.
- If uncertain, use precision "year_window" or "unknown".
- Do not invent exact months/weeks unless strongly justified.
- If no reliable inference, set success=false and explain missing signals.
- Keep rationale/uncertainties concise and practical.`

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 500,
                temperature: 0.2,
            })

            const text = response.choices[0]?.message?.content ?? ''
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                throw new Error('No JSON in serial heuristic response')
            }

            const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>
            const candidates = Array.isArray(raw.candidates)
                ? raw.candidates
                    .filter((candidate): candidate is Record<string, unknown> => Boolean(candidate) && typeof candidate === 'object')
                    .map((candidate) => ({
                        ...candidate,
                        year: typeof candidate.year === 'number' ? candidate.year : undefined,
                        period: typeof candidate.period === 'string' ? candidate.period : undefined,
                        productionWindow:
                            candidate.productionWindow &&
                            typeof candidate.productionWindow === 'object'
                                ? {
                                    ...(candidate.productionWindow as Record<string, unknown>),
                                    startMonth: typeof (candidate.productionWindow as Record<string, unknown>).startMonth === 'number'
                                        ? (candidate.productionWindow as Record<string, unknown>).startMonth
                                        : undefined,
                                    endMonth: typeof (candidate.productionWindow as Record<string, unknown>).endMonth === 'number'
                                        ? (candidate.productionWindow as Record<string, unknown>).endMonth
                                        : undefined,
                                    label: typeof (candidate.productionWindow as Record<string, unknown>).label === 'string'
                                        ? (candidate.productionWindow as Record<string, unknown>).label
                                        : undefined,
                                }
                                : undefined,
                    }))
                : undefined

            const withDefaults = {
                ...raw,
                brand: parsedInput.brand,
                normalizedSerial,
                source: 'ai_heuristic',
                year: typeof raw.year === 'number' ? raw.year : undefined,
                period: typeof raw.period === 'string' ? raw.period : undefined,
                productionWindow:
                    raw.productionWindow && typeof raw.productionWindow === 'object'
                        ? {
                            ...(raw.productionWindow as Record<string, unknown>),
                            startMonth: typeof (raw.productionWindow as Record<string, unknown>).startMonth === 'number'
                                ? (raw.productionWindow as Record<string, unknown>).startMonth
                                : undefined,
                            endMonth: typeof (raw.productionWindow as Record<string, unknown>).endMonth === 'number'
                                ? (raw.productionWindow as Record<string, unknown>).endMonth
                                : undefined,
                            label: typeof (raw.productionWindow as Record<string, unknown>).label === 'string'
                                ? (raw.productionWindow as Record<string, unknown>).label
                                : undefined,
                        }
                        : undefined,
                rationale: Array.isArray(raw.rationale) ? raw.rationale : [],
                uncertainties: Array.isArray(raw.uncertainties) ? raw.uncertainties : [],
                candidates,
                note: typeof raw.note === 'string' ? raw.note : undefined,
                formatMatched: typeof raw.formatMatched === 'string' ? raw.formatMatched : undefined,
            }

            return SerialDecodeResultSchema.parse(withDefaults)
        } catch (error) {
            console.error('AI Serial Decode Failed:', error)
            return this.mockSerialDecodeHeuristic(parsedInput.brand, normalizedSerial)
        }
    }

    private mockRetailPrice(description: string): {
        retailPriceEur: number | null
        currency: string
        productName: string | null
        note: string
    } {
        const lower = description.toLowerCase()
        if (lower.includes('chanel') && (lower.includes('flap') || lower.includes('classic'))) {
            return {
                retailPriceEur: 6500,
                currency: 'EUR',
                productName: 'Chanel Classic Flap (example)',
                note: 'Mock estimate. Connect OpenAI for real brand retail lookups.',
            }
        }
        if (lower.includes('louis vuitton') || lower.includes('lv')) {
            return {
                retailPriceEur: 1800,
                currency: 'EUR',
                productName: 'Louis Vuitton (example)',
                note: 'Mock estimate. Connect OpenAI for real brand retail lookups.',
            }
        }
        return {
            retailPriceEur: null,
            currency: 'EUR',
            productName: null,
            note: 'Mock mode: paste a description and connect OpenAI (AI_PROVIDER=openai, OPENAI_API_KEY) for real brand retail price lookups.',
        }
    }

    private mockSerialDecodeHeuristic(
        brand: SerialDecodeHeuristicInput['brand'],
        normalizedSerial: string,
    ): SerialDecodeResult {
        const looksNumeric = /^\d+$/.test(normalizedSerial)
        const length = normalizedSerial.length

        if (looksNumeric && length >= 7 && length <= 8) {
            const first = Number(normalizedSerial.slice(0, 2))
            const startYear = first >= 70 ? 1900 + first : 2000 + Math.max(0, Math.min(first, 29))
            const endYear = Math.min(startYear + 2, new Date().getFullYear())
            return SerialDecodeResultSchema.parse({
                success: true,
                brand,
                normalizedSerial,
                source: 'ai_heuristic',
                precision: 'year_window',
                confidence: 0.52,
                productionWindow: {
                    startYear,
                    endYear: Math.max(startYear, endYear),
                    label: 'Mock heuristic window',
                },
                message: `Heuristic decode suggests production between ${startYear} and ${Math.max(startYear, endYear)}.`,
                note: 'Mock heuristic. Connect OpenAI for stronger all-brand serial decoding.',
                rationale: [
                    'Numeric serial length matches common luxury serial sticker patterns.',
                    'Prefix interpreted as broad production-era hint.',
                ],
                uncertainties: [
                    'No brand-specific rule map available in mock mode.',
                    'Window may be wide without supporting provenance data.',
                ],
                candidates: [
                    {
                        label: 'Prefix-derived estimate',
                        productionWindow: {
                            startYear,
                            endYear: Math.max(startYear, endYear),
                            label: 'Prefix era estimate',
                        },
                        confidence: 0.52,
                        rationale: 'Built from serial prefix and common production cadence assumptions.',
                    },
                ],
                formatMatched: 'HEURISTIC_NUMERIC_PREFIX',
            })
        }

        return SerialDecodeResultSchema.parse({
            success: false,
            brand,
            normalizedSerial,
            source: 'ai_heuristic',
            precision: 'unknown',
            confidence: 0,
            message: 'Could not infer a reliable production window from this serial alone.',
            note: 'Mock heuristic. Connect OpenAI and include full listing details for better results.',
            rationale: ['Serial pattern does not map to a high-confidence heuristic in mock mode.'],
            uncertainties: ['Brand-specific serial map unavailable for this format.'],
            formatMatched: 'HEURISTIC_UNMATCHED',
        })
    }
}
