/** Product and ProductImage Zod schemas. @see docs/CODE_REFERENCE.md */
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
  /** Full product title (e.g. from invoice); falls back to model for display if empty */
  title: z.string().optional().default(''),
  /** Stock-keeping unit / reference code */
  sku: z.string().optional().default(''),
  category: z.string().optional().default(''),
  condition: z.string().optional().default(''),
  colour: z.string().optional().default(''),
  costPriceEur: z.coerce.number(),
  sellPriceEur: z.coerce.number(),
  /** Customs amount in EUR (e.g. 3% of invoice) */
  customsEur: z.coerce.number().optional().default(0),
  /** VAT amount in EUR on selling price */
  vatEur: z.coerce.number().optional().default(0),
  currency: CurrencySchema.default('EUR'),
  status: ProductStatusSchema,
  quantity: z.coerce.number().int().min(0).default(1),
  // New: images as objects with metadata
  images: z.array(ProductImageSchema).default([]),
  // Legacy: keep for backwards compatibility during migration
  imageUrls: z.array(z.string().url()).default([]),
  notes: z.string().optional().default(''),
})

export type Product = z.infer<typeof ProductSchema>
