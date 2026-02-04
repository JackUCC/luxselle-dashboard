/** Sourcing request schema. @see docs/CODE_REFERENCE.md */
import { z } from 'zod'
import { BaseDocSchema, SourcingStatusSchema } from './base'

export const SourcingRequestSchema = BaseDocSchema.extend({
  customerName: z.string(),
  queryText: z.string(),
  brand: z.string().optional().default(''),
  budget: z.number(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: SourcingStatusSchema,
  notes: z.string().optional().default(''),
  linkedProductId: z.string().optional(),
  linkedSupplierItemId: z.string().optional(),
})

export type SourcingRequest = z.infer<typeof SourcingRequestSchema>
