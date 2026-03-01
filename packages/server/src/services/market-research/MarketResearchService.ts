/**
 * Market Research Service: AI-powered market intelligence for luxury goods.
 * Uses RAG (Retrieval-Augmented Generation): live web search for real listings,
 * then AI synthesis for structured market intelligence.
 */
import { z } from 'zod'
import { SearchService } from '../search/SearchService'
import { ComparableImageEnrichmentService } from '../search/ComparableImageEnrichmentService'
import { getFxService } from '../fx/FxService'
import { logger } from '../../middleware/requestId'
import { validatePriceEur, filterValidComps, clampConfidence } from '../../lib/validation'
import { getAiRouter } from '../ai/AiRouter'
import {
  buildEmptyComparableFallback,
  hasValidEvidenceSourceUrl,
  keepEvidenceBackedComparables,
} from '../ai/noFabrication'
import {
  COMPETITOR_FEED_SYSTEM_PROMPT,
  MARKET_RESEARCH_EXTRACTION_SYSTEM_PROMPT,
  TRENDING_SYSTEM_PROMPT,
  TRENDING_USER_PROMPT,
  buildMarketResearchExtractionPrompt,
  buildMarketResearchSearchQuery,
} from '../ai/prompts/marketResearchPrompts'

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
  providerStatus?: 'available' | 'unavailable'
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
  condition?: string
}

export interface CompetitorFeedResult {
  items: CompetitorFeedItem[]
  generatedAt: string
}

const MarketComparableSchema = z.object({
  title: z.string().default(''),
  priceEur: z.number(),
  source: z.string().default(''),
  sourceUrl: z.string().optional(),
  previewImageUrl: z.string().optional(),
  condition: z.string().default(''),
  daysListed: z.number().nullish(),
  dataOrigin: z.enum(['web_search', 'ai_estimate']).optional(),
})

const MarketResearchExtractionSchema = z.object({
  estimatedMarketValueEur: z.number().optional(),
  priceRangeLowEur: z.number().optional(),
  priceRangeHighEur: z.number().optional(),
  suggestedBuyPriceEur: z.number().optional(),
  suggestedSellPriceEur: z.number().optional(),
  demandLevel: z.enum(['very_high', 'high', 'moderate', 'low', 'very_low']).optional(),
  priceTrend: z.enum(['rising', 'stable', 'declining']).optional(),
  marketLiquidity: z.enum(['fast_moving', 'moderate', 'slow_moving']).optional(),
  recommendation: z.enum(['strong_buy', 'buy', 'hold', 'pass']).optional(),
  confidence: z.number().optional(),
  marketSummary: z.string().optional(),
  keyInsights: z.array(z.string()).optional(),
  riskFactors: z.array(z.string()).optional(),
  comparables: z.array(MarketComparableSchema).optional(),
  seasonalNotes: z.string().optional(),
})

const TrendingExtractionSchema = z.object({
  items: z.array(z.object({
    brand: z.string(),
    model: z.string(),
    category: z.string(),
    demandLevel: z.string(),
    priceTrend: z.string(),
    avgPriceEur: z.number(),
    searchVolume: z.enum(['high', 'medium', 'low']),
  })).default([]),
})

const CompetitorFeedExtractionSchema = z.object({
  items: z.array(z.object({
    title: z.string(),
    priceEur: z.number(),
    source: z.enum(['Designer Exchange', 'Luxury Exchange', 'Siopella']),
    sourceUrl: z.string().optional(),
    listedAt: z.string().optional(),
    condition: z.string().optional(),
  })).default([]),
})

export class MarketResearchService {
  private readonly aiRouter = getAiRouter()
  private readonly searchService = new SearchService()
  private readonly comparableImageEnrichmentService = new ComparableImageEnrichmentService()

  async analyse(input: MarketResearchInput): Promise<MarketResearchResult> {
    try {
      const baseQuery = buildMarketResearchSearchQuery(input)
      const queryContext = await this.searchService.expandQuery(baseQuery)
      const searchResponse = await this.searchService.searchMarketMultiExpanded(
        queryContext.searchVariants,
        { userLocation: { country: 'IE' } },
      )
      if (searchResponse.providerError) {
        return this.buildDegradedAnalysis(input, 'AI search providers are currently unavailable.')
      }

      const hasSearchData = searchResponse.rawText.length > 50 || searchResponse.results.length > 0
      if (!hasSearchData) {
        return this.buildDegradedAnalysis(input, 'No sufficient live search data found.')
      }

      return await this.synthesizeFromSearch(input, searchResponse, queryContext)
    } catch (error) {
      try {
        logger.error('market_research_analyse_error', error)
        return this.buildDegradedAnalysis(input, 'Market analysis temporarily unavailable.')
      } catch (innerError) {
        return this.buildDegradedAnalysis(input, 'Market analysis temporarily unavailable.')
      }
    }
  }

  async getTrending(): Promise<TrendingResult> {
    try {
      const routed = await this.aiRouter.extractStructuredJson<z.infer<typeof TrendingExtractionSchema>>({
        systemPrompt: TRENDING_SYSTEM_PROMPT,
        userPrompt: TRENDING_USER_PROMPT,
        schema: TrendingExtractionSchema,
        maxTokens: 1500,
        temperature: 0.3,
      })

      return {
        provider: routed.provider,
        items: routed.data.items,
        generatedAt: new Date().toISOString(),
      }
    } catch (error) {
      logger.error('market_research_trending_error', error)
      return {
        provider: 'hybrid',
        items: [],
        generatedAt: new Date().toISOString(),
      }
    }
  }

  /** Recent listings from Irish/EU competitors (Designer Exchange, Luxury Exchange, Siopella). */
  async getCompetitorFeed(): Promise<CompetitorFeedResult> {
    try {
      const searchResponse = await this.searchService.searchMarket(
        'luxury handbag bag pre-owned for sale',
        {
          domains: ['designerexchange.ie', 'luxuryexchange.ie', 'siopaella.com'],
          userLocation: { country: 'IE' },
        },
      )

      if (!searchResponse.rawText && searchResponse.annotations.length === 0) {
        return { items: [], generatedAt: new Date().toISOString() }
      }

      const searchContext = searchResponse.rawText
        + '\n\nSource URLs:\n'
        + searchResponse.annotations.map((a) => `- ${a.title}: ${a.url}`).join('\n')

      const routed = await this.aiRouter.extractStructuredJson<z.infer<typeof CompetitorFeedExtractionSchema>>({
        systemPrompt: COMPETITOR_FEED_SYSTEM_PROMPT,
        userPrompt: searchContext,
        schema: CompetitorFeedExtractionSchema,
        maxTokens: 1500,
        temperature: 0.2,
      })

      const items: CompetitorFeedItem[] = routed.data.items
        .map((item) => ({
          title: String(item.title ?? '').trim(),
          priceEur: Math.round(Number(item.priceEur) || 0),
          source: item.source,
          sourceUrl: item.sourceUrl ?? undefined,
          listedAt: item.listedAt ?? undefined,
          condition: item.condition ?? undefined,
        }))
        .filter((item) => item.title && item.priceEur > 0 && hasValidEvidenceSourceUrl(item.sourceUrl))

      return { items, generatedAt: new Date().toISOString() }
    } catch (error) {
      logger.error('competitor_feed_search_error', error)
      return { items: [], generatedAt: new Date().toISOString() }
    }
  }

  private async synthesizeFromSearch(
    input: MarketResearchInput,
    searchResponse: { rawText: string; annotations: Array<{ url: string; title: string }> },
    queryContext?: {
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
    },
  ): Promise<MarketResearchResult> {
    const maxSearchContextChars = 12_000
    const maxSourceUrls = 40
    const trimmedSearchRawText = searchResponse.rawText.length > maxSearchContextChars
      ? `${searchResponse.rawText.slice(0, maxSearchContextChars)}\n\n[Search results truncated for faster extraction]`
      : searchResponse.rawText
    const trimmedAnnotations = searchResponse.annotations.slice(0, maxSourceUrls)

    const searchContext = trimmedSearchRawText
      + '\n\nSource URLs:\n'
      + trimmedAnnotations.map((a) => `- ${a.title}: ${a.url}`).join('\n')

    const fxService = getFxService()
    const [gbpRate, usdRate] = await Promise.all([
      fxService.getRate('GBP', 'EUR'),
      fxService.getRate('USD', 'EUR'),
    ])
    const prompt = buildMarketResearchExtractionPrompt({
      input,
      searchContext,
      gbpRate: gbpRate || 1.17,
      usdRate: usdRate || 0.92,
      queryContext,
    })

    const routed = await this.aiRouter.extractStructuredJson<z.infer<typeof MarketResearchExtractionSchema>>({
      systemPrompt: MARKET_RESEARCH_EXTRACTION_SYSTEM_PROMPT,
      userPrompt: prompt,
      schema: MarketResearchExtractionSchema,
      maxTokens: 2000,
      temperature: 0.2,
    })

    const parsed = {
      ...routed.data,
      comparables: this.enrichComparables(routed.data.comparables, searchResponse.annotations),
    }

    const result = this.formatResult(parsed, input, routed.provider)
    result.comparables = await this.comparableImageEnrichmentService.enrichComparables(result.comparables)
    return result
  }

  private enrichComparables(
    comparables: unknown,
    annotations: Array<{ url: string; title: string }>,
  ): MarketComparable[] {
    if (!Array.isArray(comparables)) return []

    return comparables.map((comp) => {
      const comparable = comp as Partial<MarketComparable>
      const normalizedTitle = (comparable.title ?? '').trim().toLowerCase()
      const normalizedSource = (comparable.source ?? '').trim().toLowerCase()

      const annotationMatch = annotations.find((ann) => {
        const annotationTitle = (ann.title ?? '').trim().toLowerCase()
        const hasTitleMatch = normalizedTitle.length > 0 && annotationTitle.includes(normalizedTitle)
        const hasSourceMatch = normalizedSource.length > 0 && ann.url.toLowerCase().includes(normalizedSource)
        return hasTitleMatch || hasSourceMatch
      })

      return {
        ...comparable,
        sourceUrl: comparable.sourceUrl ?? annotationMatch?.url,
        previewImageUrl: comparable.previewImageUrl,
      } as MarketComparable
    })
  }

  private formatResult(
    parsed: z.infer<typeof MarketResearchExtractionSchema>,
    input: MarketResearchInput,
    provider: string,
  ): MarketResearchResult {
    const rawComps = (parsed.comparables ?? []).map((comp) => ({
      title: comp.title ?? '',
      priceEur: Math.round(Number(comp.priceEur) || 0),
      source: comp.source ?? '',
      sourceUrl: comp.sourceUrl,
      previewImageUrl: comp.previewImageUrl,
      condition: comp.condition ?? '',
      daysListed: comp.daysListed ?? undefined,
      dataOrigin: comp.dataOrigin ?? 'web_search',
    }))

    const validComps = keepEvidenceBackedComparables(
      filterValidComps(rawComps.map((comp) => ({ ...comp, price: comp.priceEur })))
        .map(({ price, ...rest }) => ({ ...rest, priceEur: price })),
    ) as MarketComparable[]

    const evidenceConfidence = this.confidenceFromEvidence(validComps.length, parsed.confidence)
    const estimatedMarketValueEur = parsed.estimatedMarketValueEur != null
      ? validatePriceEur(parsed.estimatedMarketValueEur)
      : validComps.length > 0
        ? Math.round(validComps.reduce((sum, comp) => sum + comp.priceEur, 0) / validComps.length)
        : 0

    return {
      provider,
      providerStatus: 'available',
      brand: input.brand,
      model: input.model,
      estimatedMarketValueEur,
      priceRangeLowEur: parsed.priceRangeLowEur != null
        ? validatePriceEur(parsed.priceRangeLowEur)
        : validComps.length > 0
          ? Math.min(...validComps.map((comp) => comp.priceEur))
          : 0,
      priceRangeHighEur: parsed.priceRangeHighEur != null
        ? validatePriceEur(parsed.priceRangeHighEur)
        : validComps.length > 0
          ? Math.max(...validComps.map((comp) => comp.priceEur))
          : 0,
      suggestedBuyPriceEur: parsed.suggestedBuyPriceEur != null
        ? validatePriceEur(parsed.suggestedBuyPriceEur)
        : Math.round(estimatedMarketValueEur * 0.65),
      suggestedSellPriceEur: parsed.suggestedSellPriceEur != null
        ? validatePriceEur(parsed.suggestedSellPriceEur)
        : estimatedMarketValueEur,
      demandLevel: parsed.demandLevel ?? 'moderate',
      priceTrend: parsed.priceTrend ?? 'stable',
      marketLiquidity: parsed.marketLiquidity ?? 'moderate',
      recommendation: parsed.recommendation ?? 'hold',
      confidence: evidenceConfidence,
      marketSummary: parsed.marketSummary ?? 'Insufficient verified comparable evidence for a full market summary.',
      keyInsights: parsed.keyInsights ?? [],
      riskFactors: parsed.riskFactors ?? [],
      comparables: validComps,
      seasonalNotes: parsed.seasonalNotes,
    }
  }

  /** Public helper for routes to return a valid degraded payload when analyse() throws. */
  getDegradedAnalysis(input: MarketResearchInput, reason?: string): MarketResearchResult {
    return this.buildDegradedAnalysis(
      input,
      reason ?? 'Market analysis temporarily unavailable.',
    )
  }

  private buildDegradedAnalysis(input: MarketResearchInput, reason: string): MarketResearchResult {
    const ask = input.currentAskPriceEur ?? 0
    return {
      provider: 'hybrid',
      providerStatus: 'unavailable',
      brand: input.brand,
      model: input.model,
      estimatedMarketValueEur: 0,
      priceRangeLowEur: 0,
      priceRangeHighEur: 0,
      suggestedBuyPriceEur: 0,
      suggestedSellPriceEur: ask > 0 ? Math.round(ask) : 0,
      demandLevel: 'moderate',
      priceTrend: 'stable',
      marketLiquidity: 'slow_moving',
      recommendation: 'hold',
      confidence: 0.15,
      marketSummary: reason,
      keyInsights: [],
      riskFactors: [reason],
      comparables: buildEmptyComparableFallback<MarketComparable>(),
      seasonalNotes: undefined,
    }
  }

  private confidenceFromEvidence(compCount: number, modelConfidence?: number): number {
    const evidenceConfidence = clampConfidence(Math.min(0.95, 0.2 + compCount * 0.15))
    if (typeof modelConfidence !== 'number') {
      return evidenceConfidence
    }
    const model = clampConfidence(modelConfidence)
    return clampConfidence(evidenceConfidence * 0.75 + model * 0.25)
  }
}
