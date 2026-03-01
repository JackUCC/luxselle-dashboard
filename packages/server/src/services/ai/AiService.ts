import { z } from 'zod'
import {
  Product,
  SerialDecodeHeuristicInputSchema,
  SerialDecodeResultSchema,
  type SerialDecodeHeuristicInput,
  type SerialDecodeResult,
} from '@shared/schemas'
import { SearchService } from '../search/SearchService'
import { logger } from '../../middleware/requestId'
import { validatePriceEur } from '../../lib/validation'
import { getAiRouter } from './AiRouter'
import {
  BUSINESS_INSIGHTS_SYSTEM_PROMPT,
  DASHBOARD_ASSISTANT_SYSTEM_PROMPT,
  PRODUCT_DESCRIPTION_SYSTEM_PROMPT,
  RETAIL_LOOKUP_SYSTEM_PROMPT,
  SERIAL_DECODE_SYSTEM_PROMPT,
  buildBusinessInsightsUserPrompt,
  buildProductDescriptionUserPrompt,
  buildRetailLookupUserPrompt,
  buildSerialDecodeUserPrompt,
} from './prompts/assistantPrompts'

export interface BusinessInsights {
  insights: string[]
  generatedAt: string
}

const BusinessInsightsSchema = z.object({
  insights: z.array(z.string()).default([]),
})

const RetailLookupSchema = z.object({
  retailPriceEur: z.number().nullable().optional(),
  currency: z.string().optional(),
  productName: z.string().nullable().optional(),
  note: z.string().optional(),
})

export class AiService {
  private readonly aiRouter = getAiRouter()
  private readonly searchService = new SearchService()

  async generateProductDescription(product: Partial<Product>): Promise<string> {
    try {
      const response = await this.aiRouter.generateText({
        systemPrompt: PRODUCT_DESCRIPTION_SYSTEM_PROMPT,
        userPrompt: buildProductDescriptionUserPrompt(product),
        maxTokens: 300,
        temperature: 0.7,
      })

      return response.data
    } catch (error) {
      logger.error('ai_description_generation_failed', error)
      return 'Description generation is temporarily unavailable. Please retry in a moment.'
    }
  }

  async generateBusinessInsights(kpis: Record<string, unknown>): Promise<BusinessInsights> {
    try {
      const routed = await this.aiRouter.extractStructuredJson<z.infer<typeof BusinessInsightsSchema>>({
        systemPrompt: BUSINESS_INSIGHTS_SYSTEM_PROMPT,
        userPrompt: buildBusinessInsightsUserPrompt(kpis),
        schema: BusinessInsightsSchema,
        maxTokens: 300,
        temperature: 0.4,
      })

      return {
        insights: routed.data.insights.slice(0, 3),
        generatedAt: new Date().toISOString(),
      }
    } catch (error) {
      logger.error('ai_insights_generation_failed', error)
      return {
        insights: [],
        generatedAt: new Date().toISOString(),
      }
    }
  }

  /** Simple free-form prompt for dashboard prompt bar. */
  async prompt(userPrompt: string): Promise<string> {
    try {
      const response = await this.aiRouter.generateText({
        systemPrompt: DASHBOARD_ASSISTANT_SYSTEM_PROMPT,
        userPrompt,
        maxTokens: 180,
        temperature: 0.5,
      })
      return response.data
    } catch (error) {
      logger.error('ai_prompt_failed', error)
      return 'AI assistant is temporarily unavailable. Please retry shortly.'
    }
  }

  /**
   * RAG-powered retail price lookup: web search for current official retail pricing,
   * then structured extraction from those results.
   */
  async getRetailPriceFromDescription(description: string): Promise<{
    retailPriceEur: number | null
    currency: string
    productName: string | null
    note: string
  }> {
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
      const searchQuery = `${trimmed} official retail price EUR new boutique`
      const searchResponse = await this.searchService.searchWeb(searchQuery)
      const hasSearchData = searchResponse.rawText.length > 50

      const searchContext = hasSearchData
        ? `=== WEB SEARCH RESULTS ===\n${searchResponse.rawText}\n\nSources:\n${searchResponse.annotations.map((a) => `- ${a.title}: ${a.url}`).join('\n')}\n=== END ===`
        : 'No live web results were found.'

      const routed = await this.aiRouter.extractStructuredJson<z.infer<typeof RetailLookupSchema>>({
        systemPrompt: RETAIL_LOOKUP_SYSTEM_PROMPT,
        userPrompt: buildRetailLookupUserPrompt({
          searchContext,
          description: trimmed,
        }),
        schema: RetailLookupSchema,
        maxTokens: 320,
        temperature: 0.2,
      })

      const parsed = routed.data
      const retailPriceEur =
        typeof parsed.retailPriceEur === 'number' && parsed.retailPriceEur >= 0
          ? validatePriceEur(parsed.retailPriceEur)
          : null

      return {
        retailPriceEur,
        currency: 'EUR',
        productName:
          typeof parsed.productName === 'string' && parsed.productName.trim()
            ? parsed.productName.trim()
            : null,
        note:
          typeof parsed.note === 'string' && parsed.note.trim()
            ? parsed.note.trim()
            : retailPriceEur != null
              ? 'Estimated from available sources; verify on official brand website.'
              : 'Could not determine official retail price from available evidence.',
      }
    } catch (error) {
      logger.error('retail_price_lookup_error', error)
      return {
        retailPriceEur: null,
        currency: 'EUR',
        productName: null,
        note: 'Retail lookup is temporarily unavailable. Verify manually on official brand channels.',
      }
    }
  }

  /**
   * RAG-enhanced serial decoding: web search for brand serial format documentation,
   * then AI interprets serial format conservatively.
   */
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

    try {
      const searchQuery = `${parsedInput.brand} serial number date code format guide authentication`
      const searchResponse = await this.searchService.searchWeb(searchQuery)
      const searchContext = searchResponse.rawText.length > 50
        ? `\n=== WEB SEARCH: ${parsedInput.brand} SERIAL FORMAT REFERENCE ===\n${searchResponse.rawText}\n=== END ===\n`
        : '\n=== WEB SEARCH: no reliable reference results found ===\n'

      const routed = await this.aiRouter.extractStructuredJson<SerialDecodeResult>({
        systemPrompt: SERIAL_DECODE_SYSTEM_PROMPT,
        userPrompt: buildSerialDecodeUserPrompt({
          brand: parsedInput.brand,
          normalizedSerial,
          itemDescription: parsedInput.itemDescription,
          searchContext,
        }),
        schema: SerialDecodeResultSchema,
        maxTokens: 700,
        temperature: 0.2,
      })

      return SerialDecodeResultSchema.parse({
        ...routed.data,
        brand: parsedInput.brand,
        normalizedSerial,
        source: 'ai_heuristic',
      })
    } catch (error) {
      logger.error('serial_decode_error', error)
      return SerialDecodeResultSchema.parse({
        success: false,
        brand: parsedInput.brand,
        normalizedSerial,
        source: 'ai_heuristic',
        precision: 'unknown',
        confidence: 0,
        message: 'Could not infer a reliable production window from available evidence.',
        note: 'Serial decoding is temporarily unavailable or lacked sufficient reference data.',
        rationale: [],
        uncertainties: ['No validated reference evidence available for this decode attempt.'],
      })
    }
  }
}
