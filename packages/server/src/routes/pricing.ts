/**
 * Pricing API: AI-powered pricing suggestions (image or analysis input); uses PricingService and env (margin, FX).
 * @see docs/CODE_REFERENCE.md
 * References: Express, PricingService, multer, @shared/schemas
 */
import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import {
  DEFAULT_ORG_ID,
  EvaluationSchema,
  LandedCostSnapshotSchema,
  PricingMarketCountrySchema,
  PricingMarketModeSchema,
} from '@shared/schemas'
import { PricingService } from '../services/pricing/PricingService'
import { SearchService } from '../services/search/SearchService'
import { EvaluationRepo } from '../repos/EvaluationRepo'
import { SettingsRepo } from '../repos/SettingsRepo'
import { env } from '../config/env'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'
import { logger } from '../middleware/requestId'
import { validatePriceEur, filterValidComps } from '../lib/validation'
import { getFxService } from '../services/fx/FxService'

const router = Router()
const pricingService = new PricingService()
const searchService = new SearchService()
const evaluationRepo = new EvaluationRepo()
const settingsRepo = new SettingsRepo()

// Multer config for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

const PricingAnalysisInputSchema = z.object({
  brand: z.string(),
  model: z.string(),
  category: z.string(),
  condition: z.string(),
  colour: z.string(),
  year: z.string().optional(),
  notes: z.string().optional().default(''),
  askPriceEur: z.coerce.number().optional(),
  imageUrl: z.string().optional(), // If image was uploaded
  marketCountry: PricingMarketCountrySchema.optional(),
  marketMode: PricingMarketModeSchema.optional(),
  landedCostSnapshot: LandedCostSnapshotSchema.optional(),
})

const AuctionLandedCostInputSchema = z.object({
  platformId: z.string().optional(),
  platformName: z.string().optional(),
  hammerEur: z.coerce.number().min(0),
  buyerPremiumPct: z.coerce.number().min(0).optional(),
  platformFeePct: z.coerce.number().min(0).optional(),
  fixedFeeEur: z.coerce.number().min(0).optional(),
  paymentFeePct: z.coerce.number().min(0).optional(),
  shippingEur: z.coerce.number().min(0).optional(),
  insuranceEur: z.coerce.number().min(0).optional(),
  customsDutyPct: z.coerce.number().min(0).optional(),
  importVatPct: z.coerce.number().min(0).max(100).optional(),
})

const PriceCheckInputSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  condition: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

// Analyse pricing
router.post('/analyse', async (req, res, next) => {
  try {
    const input = PricingAnalysisInputSchema.parse(req.body)
    const result = await pricingService.analyse(input)

    // Save evaluation to database
    const now = new Date().toISOString()
    const evaluation = EvaluationSchema.parse({
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
      brand: input.brand,
      model: input.model,
      category: input.category,
      condition: input.condition,
      colour: input.colour,
      year: input.year,
      notes: input.notes,
      askPriceEur: input.askPriceEur,
      estimatedRetailEur: result.estimatedRetailEur,
      maxBuyPriceEur: result.maxBuyPriceEur,
      // historyAvgPaidEur: null means no history data available; coerced to 0 so EvaluationSchema
      // (which requires a number) does not reject the document. UI treats 0 as "no data".
      historyAvgPaidEur: result.historyAvgPaidEur ?? 0,
      comps: result.comps,
      confidence: result.confidence,
      provider: result.provider as 'mock' | 'openai',
      imageUrl: input.imageUrl,
      marketSummary: result.marketSummary,
      landedCostSnapshot: input.landedCostSnapshot,
    })
    const savedEvaluation = await evaluationRepo.create(evaluation)

    res.json({
      data: {
        ...result,
        evaluationId: savedEvaluation.id,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.post('/auction-landed-cost', async (req, res, next) => {
  try {
    const input = AuctionLandedCostInputSchema.parse(req.body)
    const settings = await settingsRepo.getSettings()
    const platform = settings?.auctionPlatforms?.find((profile) => profile.id === input.platformId)

    const result = pricingService.calculateAuctionLandedCost({
      platformId: input.platformId ?? platform?.id,
      platformName: input.platformName ?? platform?.name,
      hammerEur: input.hammerEur,
      buyerPremiumPct: input.buyerPremiumPct ?? platform?.buyerPremiumPct ?? 0,
      platformFeePct: input.platformFeePct ?? platform?.platformFeePct ?? 0,
      fixedFeeEur: input.fixedFeeEur ?? platform?.fixedFeeEur ?? 0,
      paymentFeePct: input.paymentFeePct ?? platform?.paymentFeePct ?? 0,
      shippingEur: input.shippingEur ?? platform?.defaultShippingEur ?? 0,
      insuranceEur: input.insuranceEur ?? platform?.defaultInsuranceEur ?? 0,
      customsDutyPct: input.customsDutyPct ?? platform?.defaultCustomsDutyPct ?? 0,
      importVatPct:
        input.importVatPct ??
        platform?.defaultImportVatPct ??
        settings?.importVatPctDefault ??
        23,
    })

    res.json({ data: result })
  } catch (error) {
    next(error)
  }
})

// POST /api/pricing/price-check — RAG: web search for real listings, then AI extraction of avg price, max buy, max bid
router.post('/price-check', async (req, res, next) => {
  try {
    const { query, condition, notes } = PriceCheckInputSchema.parse(req.body)

    type Comp = { title: string; price: number; source: string; sourceUrl?: string; dataOrigin?: 'web_search' | 'ai_estimate' }
    let averageSellingPriceEur: number
    let comps: Comp[] = []
    let dataSource: 'web_search' | 'ai_fallback' | 'mock' = 'mock'

    if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
      const refine = [condition, notes].filter(Boolean).join('. ')
      const searchQuery = `${query} ${refine} price second-hand pre-owned for sale EUR`

      const searchResponse = await searchService.searchMarketMulti(searchQuery, {
        userLocation: { country: 'IE' },
      })

      const hasSearchData = searchResponse.rawText.length > 50 || searchResponse.results.length > 0

      const fxService = getFxService()
      const [gbpRate, usdRate] = await Promise.all([
        fxService.getRate('GBP', 'EUR'),
        fxService.getRate('USD', 'EUR'),
      ])
      const gbpToEur = gbpRate || 1.17
      const usdToEur = usdRate || 0.92

      const extractionPrompt = `You are a luxury resale pricing expert. Using ONLY the web search results provided below, extract real listing data.

Item: "${query}"
${refine ? `Condition/notes: ${refine}` : ''}

=== WEB SEARCH RESULTS ===
${hasSearchData ? searchResponse.rawText : '(No live results found)'}

Source URLs:
${searchResponse.annotations.map((a) => `- ${a.title}: ${a.url}`).join('\n') || '(none)'}
=== END SEARCH RESULTS ===

Return ONLY a JSON object (no markdown):
{
  "averageSellingPriceEur": <number - average of REAL prices found in search results>,
  "comps": [
    { "title": "<actual listing title from search>", "price": <EUR>, "source": "<marketplace name>", "sourceUrl": "<actual URL from search>", "dataOrigin": "web_search" }
  ]
}

CRITICAL RULES:
- Every comparable listing MUST have a sourceUrl that came from the search results above.
- If you cannot find at least 2 real listings with prices, return averageSellingPriceEur: 0 and empty comps.
- Do NOT invent or fabricate any listing, price, or URL.
- If a field cannot be determined from the search data, use null instead of guessing.

Rules:
- Extract 3-6 real comparable listings from the search results with their actual prices and URLs
- averageSellingPriceEur must be calculated from the real prices found
- If prices are in GBP, convert to EUR using today's rate: 1 GBP = ${gbpToEur.toFixed(2)} EUR
- If prices are in USD, convert to EUR using today's rate: 1 USD = ${usdToEur.toFixed(2)} EUR
- Preferred sources: Vestiaire Collective, Designer Exchange, Luxury Exchange, Siopella
- If no real listings were found in the search results, return averageSellingPriceEur: 0 and empty comps`

      const OpenAI = (await import('openai')).default
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract structured pricing data from web search results. Return ONLY valid JSON.',
          },
          { role: 'user', content: extractionPrompt },
        ],
        max_tokens: 800,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      })

      const text = response.choices[0]?.message?.content ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in price-check response')
      let parsed: { averageSellingPriceEur?: number; comps?: Comp[] }
      try {
        parsed = JSON.parse(jsonMatch[0]) as { averageSellingPriceEur?: number; comps?: Comp[] }
      } catch {
        return res.status(502).json(formatApiError(API_ERROR_CODES.INTERNAL, 'AI response parse failed'))
      }
      averageSellingPriceEur = validatePriceEur(parsed.averageSellingPriceEur ?? 0)
      comps = filterValidComps(Array.isArray(parsed.comps) ? parsed.comps : [])
      dataSource = hasSearchData ? 'web_search' : 'ai_fallback'
    } else {
      const base = 1200
      averageSellingPriceEur = base
      comps = [
        { title: 'Similar item (Designer Exchange)', price: 1150, source: 'Designer Exchange', sourceUrl: 'https://designerexchange.ie' },
        { title: 'Similar item (Vestiaire Collective)', price: 1250, source: 'Vestiaire Collective', sourceUrl: 'https://vestiairecollective.com' },
      ]
    }

    const maxBuyEur = Math.round((averageSellingPriceEur / 1.23) * 0.8)
    const maxBidEur = Math.round(maxBuyEur / 1.07)

    res.json({
      data: {
        averageSellingPriceEur,
        comps,
        maxBuyEur,
        maxBidEur,
        dataSource,
        researchedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/pricing/analyze-image - Analyze product image with AI
router.post('/analyze-image', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'No image provided'))
      return
    }

    // Convert image to base64 for AI analysis
    const imageBase64 = req.file.buffer.toString('base64')
    const mimeType = req.file.mimetype

    // Use OpenAI vision when available
    let detectedAttributes = {
      brand: '',
      model: '',
      category: '',
      condition: '',
      colour: '',
    }

    if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
      // OpenAI Vision API
      try {
        const OpenAI = (await import('openai')).default
        const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this luxury product image and extract brand, model, category, condition, and color. Return ONLY a JSON object: {"brand":"","model":"","category":"","condition":"","colour":""}`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 300,
        })

        const text = response.choices[0]?.message?.content || ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          detectedAttributes = {
            brand: parsed.brand || '',
            model: parsed.model || '',
            category: parsed.category || '',
            condition: parsed.condition || '',
            colour: parsed.colour || parsed.color || '',
          }
        }
      } catch (error) {
        logger.error('openai_vision_error', error)
        // Fall through to mock response
      }
    }

    // When mock or AI failed: return empty attributes so UI does not show hardcoded data
    if (!detectedAttributes.brand && env.AI_PROVIDER === 'mock') {
      detectedAttributes = {
        brand: '',
        model: '',
        category: '',
        condition: '',
        colour: '',
      }
    }

    // Build a search-query string for the Price Check search bar (e.g. "Chanel Classic Flap Black")
    const queryParts = [
      detectedAttributes.brand,
      detectedAttributes.model,
      detectedAttributes.colour,
    ].filter(Boolean)
    const query = queryParts.join(' ')

    res.json({ data: { ...detectedAttributes, query } })
  } catch (error) {
    next(error)
  }
})

export { router as pricingRouter }
