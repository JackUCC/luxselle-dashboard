/**
 * Dynamic pricing analysis for luxury goods.
 * Uses RAG: web search for real listings, then structured extraction with AI router failover.
 */
import { z } from 'zod'
import { SearchService } from '../../../services/search/SearchService'
import { getFxService } from '../../../services/fx/FxService'
import { validatePriceEur, filterValidComps, clampConfidence } from '../../../lib/validation'
import { getAiRouter } from '../../ai/AiRouter'
import { keepEvidenceBackedComparables } from '../../ai/noFabrication'
import {
  PRICING_EXTRACTION_SYSTEM_PROMPT,
  buildPricingExtractionPrompt,
  buildPricingSearchQuery,
} from '../../ai/prompts/pricingPrompts'
import type {
  IPricingProvider,
  PricingAnalysisInput,
  PricingAnalysisResult,
} from './IPricingProvider'

const PricingExtractionSchema = z.object({
  estimatedRetailEur: z.number(),
  confidence: z.number().optional(),
  comps: z.array(z.object({
    title: z.string().default(''),
    price: z.number(),
    source: z.string().default(''),
    sourceUrl: z.string().optional(),
    marketCountry: z.string().optional(),
    url: z.string().optional(),
    dataOrigin: z.enum(['web_search', 'ai_estimate']).optional(),
  })).default([]),
})

export class OpenAIProvider implements IPricingProvider {
  private readonly aiRouter = getAiRouter()
  private readonly searchService: SearchService

  constructor() {
    this.searchService = new SearchService()
  }

  async analyse(input: PricingAnalysisInput): Promise<PricingAnalysisResult> {
    const marketCountry = input.marketCountry ?? 'IE'
    const marketMode = input.marketMode ?? 'ie_first_eu_fallback'

    const searchQuery = buildPricingSearchQuery(input)

    const searchResponse = await this.searchService.searchMarketMulti(searchQuery, {
      userLocation: { country: marketCountry },
    })

    const hasSearchData = searchResponse.rawText.length > 50 || searchResponse.results.length > 0

    const fxService = getFxService()
    const [gbpRate, usdRate] = await Promise.all([
      fxService.getRate('GBP', 'EUR'),
      fxService.getRate('USD', 'EUR'),
    ])
    const gbpToEur = gbpRate || 1.17
    const usdToEur = usdRate || 0.92

    const prompt = buildPricingExtractionPrompt({
      input,
      marketCountry,
      marketMode,
      hasSearchData,
      searchRawText: searchResponse.rawText,
      annotations: searchResponse.annotations,
      gbpToEur,
      usdToEur,
    })

    const routed = await this.aiRouter.extractStructuredJson<z.infer<typeof PricingExtractionSchema>>({
      systemPrompt: PRICING_EXTRACTION_SYSTEM_PROMPT,
      userPrompt: prompt,
      schema: PricingExtractionSchema,
      maxTokens: 900,
      temperature: 0.2,
    })

    type CompItem = {
      title: string
      price: number
      source: string
      sourceUrl?: string
      marketCountry?: string
      url?: string
      dataOrigin?: 'web_search' | 'ai_estimate'
    }

    const validComps = keepEvidenceBackedComparables(
      filterValidComps((routed.data.comps ?? []) as CompItem[])
        .map((comp) => ({
          ...comp,
          sourceUrl: comp.sourceUrl ?? comp.url,
        })),
    )

    const evidenceConfidence = this.confidenceFromEvidence(
      validComps.length,
      routed.data.confidence ?? 0,
    )

    return {
      estimatedRetailEur: validatePriceEur(routed.data.estimatedRetailEur),
      confidence: evidenceConfidence,
      comps: validComps.map((comp) => ({
        title: comp.title,
        price: Math.round(comp.price),
        source: comp.source,
        sourceUrl: comp.sourceUrl,
        marketCountry: (comp.marketCountry ?? 'EU').toUpperCase(),
        dataOrigin: comp.dataOrigin ?? 'web_search',
      })),
      provider: this.resolveProviderLabel(routed.provider, routed.fallbackUsed),
    }
  }

  private confidenceFromEvidence(compCount: number, modelConfidence: number): number {
    const evidence = clampConfidence(Math.min(0.95, 0.2 + compCount * 0.15))
    const model = clampConfidence(modelConfidence)
    return clampConfidence(evidence * 0.75 + model * 0.25)
  }

  private resolveProviderLabel(
    extractionProvider: 'openai' | 'perplexity',
    fallbackUsed: boolean,
  ): 'openai' | 'perplexity' | 'hybrid' {
    const diagnostics = this.aiRouter.getDiagnostics()
    const bothProvidersAvailable =
      diagnostics.providerAvailability.openai && diagnostics.providerAvailability.perplexity

    if (fallbackUsed || (diagnostics.aiRoutingMode === 'dynamic' && bothProvidersAvailable)) {
      return 'hybrid'
    }

    return extractionProvider
  }
}
