/** Evaluation schema (e.g. buy-box). @see docs/CODE_REFERENCE.md */
import { z } from 'zod'
import { BaseDocSchema, EvaluationProviderSchema } from './base'
import {
  LandedCostSnapshotSchema,
  PricingComparableSchema,
  PricingMarketSummarySchema,
} from './pricing'

export const EvaluationSchema = BaseDocSchema.extend({
  brand: z.string(),
  model: z.string(),
  category: z.string().optional().default(''),
  condition: z.string().optional().default(''),
  colour: z.string().optional().default(''),
  year: z.string().optional(),
  notes: z.string().optional().default(''),
  askPriceEur: z.number().optional(),
  estimatedRetailEur: z.number(),
  maxBuyPriceEur: z.number(),
  historyAvgPaidEur: z.number(),
  comps: z.array(PricingComparableSchema).default([]),
  confidence: z.number().min(0).max(1),
  provider: EvaluationProviderSchema,
  imageUrl: z.string().optional(), // If analysis included an image
  marketSummary: PricingMarketSummarySchema.optional(),
  landedCostSnapshot: LandedCostSnapshotSchema.optional(),
})

export type Evaluation = z.infer<typeof EvaluationSchema>
