import { Router } from 'express'
import { z } from 'zod'
import { DEFAULT_ORG_ID, EvaluationSchema } from '@shared/schemas'
import { PricingService } from '../services/pricing/PricingService'
import { EvaluationRepo } from '../repos/EvaluationRepo'

const router = Router()
const pricingService = new PricingService()
const evaluationRepo = new EvaluationRepo()

const PricingAnalysisInputSchema = z.object({
  brand: z.string(),
  model: z.string(),
  category: z.string(),
  condition: z.string(),
  colour: z.string(),
  notes: z.string().optional().default(''),
  askPriceEur: z.coerce.number().optional(),
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
      notes: input.notes,
      askPriceEur: input.askPriceEur,
      estimatedRetailEur: result.estimatedRetailEur,
      maxBuyPriceEur: result.maxBuyPriceEur,
      historyAvgPaidEur: result.historyAvgPaidEur ?? 0,
      comps: result.comps,
      confidence: result.confidence,
      provider: result.provider as 'mock' | 'openai' | 'gemini',
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

export { router as pricingRouter }
