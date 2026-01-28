import { z } from 'zod'
import { BaseDocSchema, EvaluationProviderSchema } from './base'

export const EvaluationSchema = BaseDocSchema.extend({
  brand: z.string(),
  model: z.string(),
  category: z.string().optional().default(''),
  condition: z.string().optional().default(''),
  colour: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  askPriceEur: z.number().optional(),
  estimatedRetailEur: z.number(),
  maxBuyPriceEur: z.number(),
  historyAvgPaidEur: z.number(),
  comps: z.array(z.any()).default([]),
  confidence: z.number().min(0).max(1),
  provider: EvaluationProviderSchema,
})

export type Evaluation = z.infer<typeof EvaluationSchema>
