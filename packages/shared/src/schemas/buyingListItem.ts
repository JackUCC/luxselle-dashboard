/** Buying list item schema. @see docs/CODE_REFERENCE.md */
import { z } from 'zod'
import { BaseDocSchema, BuyingListStatusSchema } from './base'

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
  targetBuyPriceEur: z.number(),
  status: BuyingListStatusSchema,
  notes: z.string().optional().default(''),
})

export type BuyingListItem = z.infer<typeof BuyingListItemSchema>
