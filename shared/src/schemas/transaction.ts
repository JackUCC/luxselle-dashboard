import { z } from 'zod'
import { BaseDocSchema, TransactionTypeSchema } from './base'

export const TransactionSchema = BaseDocSchema.extend({
  type: TransactionTypeSchema,
  productId: z.string().optional(),
  buyingListItemId: z.string().optional(),
  amountEur: z.number(),
  occurredAt: z.string(),
  notes: z.string().optional().default(''),
})

export type Transaction = z.infer<typeof TransactionSchema>
