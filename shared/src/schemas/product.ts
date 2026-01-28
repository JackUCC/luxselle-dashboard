import { z } from 'zod'
import { BaseDocSchema, CurrencySchema, ProductStatusSchema } from './base'

// Image object with metadata (replaces bare URLs)
export const ProductImageSchema = z.object({
  id: z.string(), // uuid
  url: z.string().url(), // public URL
  thumbnailUrl: z.string().url().optional(), // 512px max thumbnail
  path: z.string(), // Firebase Storage path
  createdAt: z.string(),
  createdBy: z.string().optional(),
})

export type ProductImage = z.infer<typeof ProductImageSchema>

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
  // New: images as objects with metadata
  images: z.array(ProductImageSchema).default([]),
  // Legacy: keep for backwards compatibility during migration
  imageUrls: z.array(z.string().url()).default([]),
  notes: z.string().optional().default(''),
})

export type Product = z.infer<typeof ProductSchema>
