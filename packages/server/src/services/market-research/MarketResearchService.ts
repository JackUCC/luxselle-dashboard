/**
 * Market Research Service: AI-powered market intelligence for luxury goods.
 * Provides deep market analysis including price trends, demand indicators,
 * competitive landscape, and buy/sell recommendations.
 * @see docs/CODE_REFERENCE.md
 * References: OpenAI, env
 */
import { env } from '../../config/env'

export interface MarketResearchInput {
    brand: string
    model: string
    category: string
    condition: string
    colour?: string
    year?: string
    notes?: string
    currentAskPriceEur?: number
}

export interface MarketComparable {
    title: string
    priceEur: number
    source: string
    sourceUrl?: string
    condition: string
    daysListed?: number
}

export interface MarketResearchResult {
    provider: string
    brand: string
    model: string

    // Price intelligence
    estimatedMarketValueEur: number
    priceRangeLowEur: number
    priceRangeHighEur: number
    suggestedBuyPriceEur: number
    suggestedSellPriceEur: number

    // Market indicators
    demandLevel: 'very_high' | 'high' | 'moderate' | 'low' | 'very_low'
    priceTrend: 'rising' | 'stable' | 'declining'
    marketLiquidity: 'fast_moving' | 'moderate' | 'slow_moving'
    recommendation: 'strong_buy' | 'buy' | 'hold' | 'pass'

    // Analysis
    confidence: number
    marketSummary: string
    keyInsights: string[]
    riskFactors: string[]

    // Comparable listings
    comparables: MarketComparable[]

    // Trending
    trendingScore?: number
    seasonalNotes?: string
}

export interface TrendingItem {
    brand: string
    model: string
    category: string
    demandLevel: string
    priceTrend: string
    avgPriceEur: number
    searchVolume: 'high' | 'medium' | 'low'
}

export interface TrendingResult {
    provider: string
    items: TrendingItem[]
    generatedAt: string
}

const MARKET_RESEARCH_PROMPT = (input: MarketResearchInput) => `You are a luxury goods market research analyst specializing in the European resale market, with particular focus on Ireland and the EU.

Analyse the following luxury item and provide comprehensive market intelligence:

Brand: ${input.brand}
Model: ${input.model}
Category: ${input.category}
Condition: ${input.condition}
${input.colour ? `Colour: ${input.colour}` : ''}
${input.year ? `Year: ${input.year}` : ''}
${input.notes ? `Notes: ${input.notes}` : ''}
${input.currentAskPriceEur ? `Current Asking Price: €${input.currentAskPriceEur}` : ''}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "estimatedMarketValueEur": <number>,
  "priceRangeLowEur": <number>,
  "priceRangeHighEur": <number>,
  "suggestedBuyPriceEur": <number - max price to pay for 35% margin>,
  "suggestedSellPriceEur": <number - realistic sell price in EU market>,
  "demandLevel": "<very_high|high|moderate|low|very_low>",
  "priceTrend": "<rising|stable|declining>",
  "marketLiquidity": "<fast_moving|moderate|slow_moving>",
  "recommendation": "<strong_buy|buy|hold|pass>",
  "confidence": <0 to 1>,
  "marketSummary": "<2-3 sentence market overview>",
  "keyInsights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "riskFactors": ["<risk 1>", "<risk 2>"],
  "comparables": [
    {
      "title": "<listing title>",
      "priceEur": <number>,
      "source": "<marketplace>",
      "sourceUrl": "<URL>",
      "condition": "<condition>",
      "daysListed": <number or null>
    }
  ],
  "seasonalNotes": "<any seasonal pricing effects>"
}

Important guidelines:
- ONLY use these 4 approved sources: Vestiaire Collective, Designer Exchange, Luxury Exchange, Siopella (siopaella.com). Do NOT include any other marketplace.
- Include 4-6 comparable listings from the 4 approved sources only
- Price ranges should reflect condition-adjusted real market data
- suggestedBuyPriceEur should leave room for 35% profit margin
- Be specific about demand trends and timing
- Include Ireland/EU specific market insights where relevant`

const TRENDING_PROMPT = `You are a luxury goods market analyst. Identify the top 8 trending luxury items in the European resale market right now.

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
}

Focus on items that:
- Have strong resale value
- Are trending upward in demand
- Are realistic for a luxury reseller in Ireland/EU
- Mix of accessible luxury and high-end pieces`

export class MarketResearchService {
    async analyse(input: MarketResearchInput): Promise<MarketResearchResult> {
        if (env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
            return this.analyseWithGemini(input)
        }
        if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
            return this.analyseWithOpenAI(input)
        }
        return this.mockAnalysis(input)
    }

    async getTrending(): Promise<TrendingResult> {
        if (env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
            return this.trendingWithGemini()
        }
        if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
            return this.trendingWithOpenAI()
        }
        return this.mockTrending()
    }

    private async analyseWithGemini(input: MarketResearchInput): Promise<MarketResearchResult> {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY!)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const result = await model.generateContent(MARKET_RESEARCH_PROMPT(input))
        const text = result.response.text()
        const parsed = this.parseJSON(text)

        return this.formatResult(parsed, input, 'gemini')
    }

    private async analyseWithOpenAI(input: MarketResearchInput): Promise<MarketResearchResult> {
        const OpenAI = (await import('openai')).default
        const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: MARKET_RESEARCH_PROMPT(input) }],
            max_tokens: 2000,
            temperature: 0.3,
        })

        const text = response.choices[0]?.message?.content ?? ''
        const parsed = this.parseJSON(text)

        return this.formatResult(parsed, input, 'openai')
    }

    private async trendingWithOpenAI(): Promise<TrendingResult> {
        const OpenAI = (await import('openai')).default
        const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: TRENDING_PROMPT }],
            max_tokens: 1500,
            temperature: 0.3,
        })

        const text = response.choices[0]?.message?.content ?? ''
        const parsed = this.parseJSON(text)

        return {
            provider: 'openai',
            items: parsed.items ?? [],
            generatedAt: new Date().toISOString(),
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private parseJSON(text: string): any {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error('AI returned no valid JSON for market research')
        }
        return JSON.parse(jsonMatch[0])
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private formatResult(parsed: any, input: MarketResearchInput, provider: string): MarketResearchResult {
        return {
            provider,
            brand: input.brand,
            model: input.model,
            estimatedMarketValueEur: Math.round(parsed.estimatedMarketValueEur ?? 0),
            priceRangeLowEur: Math.round(parsed.priceRangeLowEur ?? 0),
            priceRangeHighEur: Math.round(parsed.priceRangeHighEur ?? 0),
            suggestedBuyPriceEur: Math.round(parsed.suggestedBuyPriceEur ?? 0),
            suggestedSellPriceEur: Math.round(parsed.suggestedSellPriceEur ?? 0),
            demandLevel: parsed.demandLevel ?? 'moderate',
            priceTrend: parsed.priceTrend ?? 'stable',
            marketLiquidity: parsed.marketLiquidity ?? 'moderate',
            recommendation: parsed.recommendation ?? 'hold',
            confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
            marketSummary: parsed.marketSummary ?? '',
            keyInsights: parsed.keyInsights ?? [],
            riskFactors: parsed.riskFactors ?? [],
            comparables: (parsed.comparables ?? []).map((c: MarketComparable) => ({
                title: c.title ?? '',
                priceEur: Math.round(c.priceEur ?? 0),
                source: c.source ?? '',
                sourceUrl: c.sourceUrl,
                condition: c.condition ?? '',
                daysListed: c.daysListed,
            })),
            seasonalNotes: parsed.seasonalNotes,
        }
    }

    private mockAnalysis(input: MarketResearchInput): MarketResearchResult {
        const basePrice = input.currentAskPriceEur || 800
        return {
            provider: 'mock',
            brand: input.brand,
            model: input.model,
            estimatedMarketValueEur: basePrice,
            priceRangeLowEur: Math.round(basePrice * 0.75),
            priceRangeHighEur: Math.round(basePrice * 1.25),
            suggestedBuyPriceEur: Math.round(basePrice * 0.6),
            suggestedSellPriceEur: Math.round(basePrice * 0.95),
            demandLevel: 'high',
            priceTrend: 'stable',
            marketLiquidity: 'moderate',
            recommendation: 'buy',
            confidence: 0.75,
            marketSummary: `${input.brand} ${input.model} shows steady demand in the EU market. Pricing is consistent with seasonal trends.`,
            keyInsights: [
                'Strong brand recognition maintains resale value',
                'Condition-dependent pricing — excellent pieces command premium',
                'EU market shows consistent demand year-round',
            ],
            riskFactors: [
                'Authentication required for high-value pieces',
                'Seasonal demand fluctuations may affect sell-through time',
            ],
            comparables: [
                {
                    title: `${input.brand} ${input.model} - ${input.condition}`,
                    priceEur: Math.round(basePrice * 0.95),
                    source: 'Vestiaire Collective',
                    sourceUrl: 'https://vestiairecollective.com',
                    condition: input.condition,
                    daysListed: 14,
                },
                {
                    title: `${input.brand} ${input.model} - Pre-owned`,
                    priceEur: Math.round(basePrice * 1.1),
                    source: 'Designer Exchange',
                    sourceUrl: 'https://designerexchange.ie',
                    condition: 'excellent',
                    daysListed: 7,
                },
                {
                    title: `${input.brand} ${input.model} - Authenticated`,
                    priceEur: Math.round(basePrice * 0.85),
                    source: 'Luxury Exchange',
                    sourceUrl: 'https://luxuryexchange.ie',
                    condition: input.condition,
                    daysListed: 21,
                },
                {
                    title: `${input.brand} ${input.model} - Certified`,
                    priceEur: Math.round(basePrice * 1.05),
                    source: 'Siopella',
                    sourceUrl: 'https://siopaella.com',
                    condition: input.condition,
                    daysListed: 5,
                },
            ],
            seasonalNotes: 'Holiday season typically sees 10-15% price uplift for luxury handbags.',
        }
    }

    private mockTrending(): TrendingResult {
        return {
            provider: 'mock',
            items: [
                { brand: 'Chanel', model: 'Classic Flap', category: 'Handbag', demandLevel: 'very_high', priceTrend: 'rising', avgPriceEur: 6500, searchVolume: 'high' },
                { brand: 'Hermès', model: 'Birkin 25', category: 'Handbag', demandLevel: 'very_high', priceTrend: 'rising', avgPriceEur: 12000, searchVolume: 'high' },
                { brand: 'Louis Vuitton', model: 'Pochette Metis', category: 'Handbag', demandLevel: 'high', priceTrend: 'stable', avgPriceEur: 1800, searchVolume: 'high' },
                { brand: 'Bottega Veneta', model: 'Jodie', category: 'Handbag', demandLevel: 'high', priceTrend: 'rising', avgPriceEur: 2200, searchVolume: 'medium' },
                { brand: 'Dior', model: 'Lady Dior', category: 'Handbag', demandLevel: 'high', priceTrend: 'stable', avgPriceEur: 3500, searchVolume: 'high' },
                { brand: 'Loewe', model: 'Puzzle', category: 'Handbag', demandLevel: 'high', priceTrend: 'rising', avgPriceEur: 2000, searchVolume: 'medium' },
                { brand: 'Prada', model: 'Re-Edition 2005', category: 'Handbag', demandLevel: 'moderate', priceTrend: 'stable', avgPriceEur: 1200, searchVolume: 'medium' },
                { brand: 'Gucci', model: 'Horsebit 1955', category: 'Handbag', demandLevel: 'moderate', priceTrend: 'declining', avgPriceEur: 1500, searchVolume: 'medium' },
            ],
            generatedAt: new Date().toISOString(),
        }
    }
}
