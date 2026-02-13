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
import { EvaluationRepo } from '../repos/EvaluationRepo'
import { SettingsRepo } from '../repos/SettingsRepo'
import { env } from '../config/env'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const router = Router()
const pricingService = new PricingService()
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
      historyAvgPaidEur: result.historyAvgPaidEur ?? 0,
      comps: result.comps,
      confidence: result.confidence,
      provider: result.provider as 'mock' | 'openai' | 'gemini',
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

    // Use AI provider if available (Gemini or OpenAI vision)
    let detectedAttributes = {
      brand: '',
      model: '',
      category: '',
      condition: '',
      colour: '',
    }

    if (env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
      // Gemini Vision API
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

        const prompt = `Analyze this luxury product image and extract:
- Brand (e.g., Chanel, Hermès, Louis Vuitton, Gucci, Prada, Dior, Bottega Veneta, Fendi, Givenchy, Loewe)
- Model/Style name (e.g., Classic Flap, Birkin, Speedy)
- Category (Handbag, Wallet, Shoes, Watch, Jewelry, Accessory, Clothing)
- Condition (new, excellent, good, fair, used)
- Primary color (Black, White, Beige, Navy, Brown, etc.)

Return ONLY a JSON object with these fields (lowercase keys): {"brand":"","model":"","category":"","condition":"","colour":""}`

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: imageBase64,
              mimeType,
            },
          },
        ])

        const text = result.response.text()
        // Extract JSON from response (handle markdown code blocks)
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
        console.error('Gemini Vision API error:', error)
        // Fall through to mock response
      }
    } else if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
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
        console.error('OpenAI Vision API error:', error)
        // Fall through to mock response
      }
    }

    // Mock response if no AI provider or analysis failed
    if (!detectedAttributes.brand && env.AI_PROVIDER === 'mock') {
      detectedAttributes = {
        brand: 'Chanel',
        model: 'Classic Flap',
        category: 'Handbag',
        condition: 'excellent',
        colour: 'Black',
      }
    }

    res.json({ data: detectedAttributes })
  } catch (error) {
    next(error)
  }
})

export { router as pricingRouter }
