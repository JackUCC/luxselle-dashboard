/** Visual search request/response schemas. Used by POST /api/search/visual. */
import { z } from 'zod'

/** Stored image embedding document (Firestore). One per product image or supplier item image. */
export const ImageEmbeddingSourceSchema = z.enum(['product', 'supplier_item'])
export type ImageEmbeddingSource = z.infer<typeof ImageEmbeddingSourceSchema>

export const ImageEmbeddingSchema = z.object({
  organisationId: z.string(),
  productId: z.string().optional(),
  supplierItemId: z.string().optional(),
  imageId: z.string().optional(),
  imageUrl: z.string().url(),
  embedding: z.array(z.number()),
  source: ImageEmbeddingSourceSchema,
  createdAt: z.string(),
})

export type ImageEmbedding = z.infer<typeof ImageEmbeddingSchema>

/** One hit from visual similarity search. */
export const VisualSearchResultSchema = z.object({
  productId: z.string().optional(),
  supplierItemId: z.string().optional(),
  imageUrl: z.string().url().optional(),
  title: z.string().optional(),
  score: z.number().min(0).max(1),
})

export type VisualSearchResult = z.infer<typeof VisualSearchResultSchema>

/** Response from POST /api/search/visual. */
export const VisualSearchResponseSchema = z.object({
  results: z.array(VisualSearchResultSchema),
})

export type VisualSearchResponse = z.infer<typeof VisualSearchResponseSchema>
