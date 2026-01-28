import { z } from 'zod'
import { BaseDocSchema, CurrencySchema, ProductStatusSchema } from './base'

export const ProductSchema = BaseDocSchema.extend({
  brand: z.string(),
  model: z.string(),
  category: z.string().optional().default(''),
  condition: z.string().optional().default(''),
  colour: z.string().optional().default(''),
  costPriceEur: z.number(),
  sellPriceEur: z.number(),
  currency: CurrencySchema.default('EUR'),
  status: ProductStatusSchema,
  quantity: z.number().int().min(0).default(1),
  imageUrls: z.array(z.string().url()).default([]),
  notes: z.string().optional().default(''),
})

export type Product = z.infer<typeof ProductSchema>
