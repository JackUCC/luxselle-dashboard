/** Supplier item schema. @see docs/CODE_REFERENCE.md */
import { z } from 'zod'
import { BaseDocSchema, SupplierAvailabilitySchema } from './base'

export const SupplierItemSchema = BaseDocSchema.extend({
  supplierId: z.string(),
  externalId: z.string(),
  title: z.string(),
  brand: z.string().optional().default(''),
  sku: z.string().optional().default(''),
  conditionRank: z.string().optional().default(''),
  askPriceUsd: z.number(),
  askPriceEur: z.number(),
  sellingPriceUsd: z.number().optional(),
  sellingPriceEur: z.number().optional(),
  availability: SupplierAvailabilitySchema,
  imageUrl: z.string().url().optional().default(''),
  sourceUrl: z.string().url().optional().default(''),
  rawPayload: z.record(z.any()).default({}),
  lastSeenAt: z.string(),
})

export type SupplierItem = z.infer<typeof SupplierItemSchema>
