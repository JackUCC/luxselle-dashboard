/**
 * Dynamic pricing analysis for luxury goods.
 * Uses RAG: web search for real listings, then structured extraction with AI router failover.
 */
import { z } from 'zod'
import { SearchService } from '../../../services/search/SearchService'
import { getFxService } from '../../../services/fx/FxService'
import { validatePriceEur, filterValidComps, clampConfidence } from '../../../lib/validation'
import { getAiRouter } from '../../ai/AiRouter'
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

    const searchQuery = [input.brand, input.model, input.colour, input.category]
      .filter(Boolean)
      .join(' ') + ' price second-hand pre-owned for sale EUR'

    const searchResponse = await this.searchService.searchMarketMulti(searchQuery, {
      userLocation: { country: marketCountry },
    })

    const hasSearchData = searchResponse.rawText.length > 50 || searchResponse.results.length > 0
    const searchContext = hasSearchData
      ? `=== LIVE WEB SEARCH RESULTS ===\n${searchResponse.rawText}\n\nSource URLs:\n${searchResponse.annotations.map((a) => `- ${a.title}: ${a.url}`).join('\n')}\n=== END SEARCH RESULTS ===`
      : '(No live search results available)'

    const fxService = getFxService()
    const [gbpRate, usdRate] = await Promise.all([
      fxService.getRate('GBP', 'EUR'),
      fxService.getRate('USD', 'EUR'),
    ])
    const gbpToEur = gbpRate || 1.17
    const usdToEur = usdRate || 0.92

    const prompt = `You are a luxury goods pricing expert. Analyse this item and estimate its current resale market value in EUR.

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
- Do NOT invent any listing, price, or URL.
- If prices are in GBP, convert using 1 GBP = ${gbpToEur.toFixed(2)} EUR.
- If prices are in USD, convert using 1 USD = ${usdToEur.toFixed(2)} EUR.
- Prioritize Irish competitor sources first: Designer Exchange, Luxury Exchange, Siopella.
- Use broader EU fallback sources (including Vestiaire) only when Irish comps are limited.`

    const routed = await this.aiRouter.extractStructuredJson<z.infer<typeof PricingExtractionSchema>>({
      systemPrompt: 'You extract structured pricing data from web search results. Return ONLY valid JSON.',
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

    const validComps = filterValidComps((routed.data.comps ?? []) as CompItem[])
      .map((comp) => ({
        ...comp,
        sourceUrl: comp.sourceUrl ?? comp.url,
      }))
      .filter((comp) => this.isValidUrl(comp.sourceUrl))

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

  private isValidUrl(value?: string): boolean {
    if (!value) return false
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }
}
