/**
 * Market Research Service: AI-powered market intelligence for luxury goods.
 * Uses RAG (Retrieval-Augmented Generation): live web search for real listings,
 * then AI synthesis for structured market intelligence.
 * @see docs/CODE_REFERENCE.md
 * References: OpenAI, SearchService, env
 */
import { env } from '../../config/env'
import { SearchService } from '../search/SearchService'
import { getFxService } from '../fx/FxService'
import { logger } from '../../middleware/requestId'
import { validatePriceEur, filterValidComps, clampConfidence } from '../../lib/validation'

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
    previewImageUrl?: string
    condition: string
    daysListed?: number
    dataOrigin?: 'web_search' | 'ai_estimate'
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

/** Single listing from a competitor (Designer Exchange, Luxury Exchange, Siopella). */
export interface CompetitorFeedItem {
    title: string
    priceEur: number
    source: 'Designer Exchange' | 'Luxury Exchange' | 'Siopella'
    sourceUrl?: string
    listedAt?: string
}

export interface CompetitorFeedResult {
    items: CompetitorFeedItem[]
    generatedAt: string
}

function buildSearchQuery(input: MarketResearchInput): string {
    const parts = [input.brand, input.model]
    if (input.colour) parts.push(input.colour)
    if (input.category && input.category !== 'Other') parts.push(input.category)
    return parts.filter(Boolean).join(' ')
}

function buildRagExtractionPrompt(
    input: MarketResearchInput,
    searchContext: string,
    fx: { gbpRate: number; usdRate: number },
): string {
    return `You are a luxury goods market research analyst specializing in the European resale market (Ireland and EU).

You have been provided REAL web search results below. Use ONLY the data from these search results to form your analysis. Do NOT invent listings or prices that are not supported by the search data.

=== WEB SEARCH RESULTS ===
${searchContext}
=== END SEARCH RESULTS ===

Item to analyse:
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
- Do NOT invent or fabricate any listing, price, or URL.
- If a field cannot be determined from the search data, use null instead of guessing.

Confidence scoring rules:
- 0.9+: 5+ real listings found with prices from approved sources
- 0.7-0.89: 3-4 real listings found
- 0.5-0.69: 1-2 real listings found
- 0.3-0.49: No real listings but strong knowledge of this specific item
- Below 0.3: Unfamiliar item or very sparse data

Rules:
- If a price is in GBP, convert to EUR using today's rate: 1 GBP = ${fx.gbpRate.toFixed(2)} EUR
- If a price is in USD, convert to EUR using today's rate: 1 USD = ${fx.usdRate.toFixed(2)} EUR
- Preferred sources: Vestiaire Collective, Designer Exchange, Luxury Exchange, Siopella
- suggestedBuyPriceEur = estimatedMarketValueEur * 0.65 (35% margin)`
}

const FALLBACK_PROMPT = (input: MarketResearchInput) => `You are a luxury goods market research analyst specializing in the European resale market, with particular focus on Ireland and the EU.

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
      "sourceUrl": "<URL or null if estimated>",
      "condition": "<condition>",
      "daysListed": <number or null>,
      "dataOrigin": "ai_estimate"
    }
  ],
  "seasonalNotes": "<any seasonal pricing effects>"
}

CRITICAL RULES:
- Do NOT invent or fabricate any listing, price, or URL. If estimating without search data, set dataOrigin to "ai_estimate" and sourceUrl to null where unknown.
- If a field cannot be determined, use null instead of guessing.

Confidence scoring rules:
- 0.9+: 5+ real listings found with prices from approved sources
- 0.7-0.89: 3-4 real listings found
- 0.5-0.69: 1-2 real listings found
- 0.3-0.49: No real listings but strong knowledge of this specific item
- Below 0.3: Unfamiliar item or very sparse data

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
    private searchService = new SearchService()

    async analyse(input: MarketResearchInput): Promise<MarketResearchResult> {
        if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
            return this.analyseWithRAG(input)
        }
        return this.mockAnalysis(input)
    }

    async getTrending(): Promise<TrendingResult> {
        if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
            return this.trendingWithOpenAI()
        }
        return this.mockTrending()
    }

    /** Recent listings from Irish/EU competitors (Designer Exchange, Luxury Exchange, Siopella). */
    async getCompetitorFeed(): Promise<CompetitorFeedResult> {
        return this.mockCompetitorFeed()
    }

    /**
     * RAG pipeline: (1) web search for real listings, (2) AI synthesis of structured data.
     * Falls back to pure-AI if search returns no results.
     */
    private async analyseWithRAG(input: MarketResearchInput): Promise<MarketResearchResult> {
        const query = buildSearchQuery(input)
        const searchQuery = `${query} price second-hand pre-owned for sale EUR`

        const searchResponse = await this.searchService.searchMarketMulti(searchQuery, {
            userLocation: { country: 'IE' },
        })

        const hasSearchData = searchResponse.rawText.length > 50 || searchResponse.results.length > 0

        if (hasSearchData) {
            return this.synthesizeFromSearch(input, searchResponse)
        }

        logger.info('market_research_fallback', { reason: 'no_search_results', query })
        return this.analyseWithOpenAIFallback(input)
    }

    private async synthesizeFromSearch(
        input: MarketResearchInput,
        searchResponse: { rawText: string; annotations: Array<{ url: string; title: string }> },
    ): Promise<MarketResearchResult> {
        const searchContext = searchResponse.rawText
            + '\n\nSource URLs:\n'
            + searchResponse.annotations.map((a) => `- ${a.title}: ${a.url}`).join('\n')

        const fxService = getFxService()
        const [gbpRate, usdRate] = await Promise.all([
            fxService.getRate('GBP', 'EUR'),
            fxService.getRate('USD', 'EUR'),
        ])
        const prompt = buildRagExtractionPrompt(input, searchContext, {
            gbpRate: gbpRate || 1.17,
            usdRate: usdRate || 0.92,
        })

        const OpenAI = (await import('openai')).default
        const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a luxury market analyst. Extract structured market intelligence from web search results. Return ONLY valid JSON.',
                },
                { role: 'user', content: prompt },
            ],
            max_tokens: 2000,
            temperature: 0.2,
            response_format: { type: 'json_object' },
        })

        const text = response.choices[0]?.message?.content ?? ''
        const parsed = this.parseJSON(text)

        return this.formatResult(parsed, input, 'openai+web_search')
    }

    /** Pure-AI fallback when web search yields no results. */
    private async analyseWithOpenAIFallback(input: MarketResearchInput): Promise<MarketResearchResult> {
        const OpenAI = (await import('openai')).default
        const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: FALLBACK_PROMPT(input) }],
            max_tokens: 2000,
            temperature: 0.3,
            response_format: { type: 'json_object' },
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
            response_format: { type: 'json_object' },
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
        const rawComps = (parsed.comparables ?? []).map((c: MarketComparable) => ({
            title: c.title ?? '',
            priceEur: Math.round(Number(c.priceEur) || 0),
            source: c.source ?? '',
            sourceUrl: c.sourceUrl,
            condition: c.condition ?? '',
            daysListed: c.daysListed,
            dataOrigin: c.dataOrigin ?? 'web_search',
        }))
        const validComps = filterValidComps(rawComps.map((c) => ({ ...c, price: c.priceEur }))).map(
            ({ price, ...rest }) => ({ ...rest, priceEur: price }),
        ) as MarketComparable[]

        return {
            provider,
            brand: input.brand,
            model: input.model,
            estimatedMarketValueEur: validatePriceEur(parsed.estimatedMarketValueEur),
            priceRangeLowEur: validatePriceEur(parsed.priceRangeLowEur),
            priceRangeHighEur: validatePriceEur(parsed.priceRangeHighEur),
            suggestedBuyPriceEur: validatePriceEur(parsed.suggestedBuyPriceEur),
            suggestedSellPriceEur: validatePriceEur(parsed.suggestedSellPriceEur),
            demandLevel: parsed.demandLevel ?? 'moderate',
            priceTrend: parsed.priceTrend ?? 'stable',
            marketLiquidity: parsed.marketLiquidity ?? 'moderate',
            recommendation: parsed.recommendation ?? 'hold',
            confidence: clampConfidence(parsed.confidence ?? 0.5),
            marketSummary: parsed.marketSummary ?? '',
            keyInsights: parsed.keyInsights ?? [],
            riskFactors: parsed.riskFactors ?? [],
            comparables: validComps,
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

    private mockCompetitorFeed(): CompetitorFeedResult {
        const now = new Date()
        const fmt = (d: Date) => d.toISOString().slice(0, 10)
        return {
            items: [
                { title: 'Chanel Classic Flap Medium Black Caviar', priceEur: 6200, source: 'Designer Exchange', sourceUrl: 'https://designerexchange.ie', listedAt: fmt(now) },
                { title: 'Louis Vuitton Pochette Metis Monogram', priceEur: 1750, source: 'Luxury Exchange', sourceUrl: 'https://luxuryexchange.ie', listedAt: fmt(now) },
                { title: 'Hermès Evelyne III PM Gold', priceEur: 2800, source: 'Siopella', sourceUrl: 'https://siopaella.com', listedAt: fmt(now) },
                { title: 'Bottega Veneta Jodie Small Intrecciato', priceEur: 2100, source: 'Designer Exchange', sourceUrl: 'https://designerexchange.ie', listedAt: fmt(now) },
                { title: 'Dior Lady Dior Medium Cannage', priceEur: 3400, source: 'Luxury Exchange', sourceUrl: 'https://luxuryexchange.ie', listedAt: fmt(now) },
                { title: 'Loewe Puzzle Small Sand', priceEur: 1850, source: 'Siopella', sourceUrl: 'https://siopaella.com', listedAt: fmt(now) },
                { title: 'Gucci Horsebit 1955 Shoulder Bag', priceEur: 1480, source: 'Designer Exchange', sourceUrl: 'https://designerexchange.ie', listedAt: fmt(now) },
                { title: 'Prada Re-Edition 2005 Nylon Black', priceEur: 1150, source: 'Luxury Exchange', sourceUrl: 'https://luxuryexchange.ie', listedAt: fmt(now) },
            ],
            generatedAt: new Date().toISOString(),
        }
    }
}
