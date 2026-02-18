/** Buying list item schema. @see docs/CODE_REFERENCE.md */
import { z } from 'zod'
import { BaseDocSchema, BuyingListStatusSchema } from './base'
import { LandedCostSnapshotSchema } from './pricing'

export const BuyingListItemSchema = BaseDocSchema.extend({
  sourceType: z.enum(['manual', 'evaluator', 'supplier']),
  supplierId: z.string().optional(),
  supplierItemId: z.string().optional(),
  evaluationId: z.string().optional(),
  brand: z.string(),
  model: z.string(),
  category: z.string().optional().default(''),
  condition: z.string().optional().default(''),
  colour: z.string().optional().default(''),
  targetBuyPriceEur: z.coerce.number(),
  status: BuyingListStatusSchema,
  notes: z.string().optional().default(''),
  landedCostSnapshot: LandedCostSnapshotSchema.optional(),
})

export type BuyingListItem = z.infer<typeof BuyingListItemSchema>
