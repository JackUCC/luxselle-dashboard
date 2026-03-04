import { z } from 'zod'
import { BaseDocSchema } from './base'

export const CompetitorListingSourceSchema = z.enum([
    'Designer Exchange',
    'Luxury Exchange',
    'Siopaella',
])
export type CompetitorListingSource = z.infer<typeof CompetitorListingSourceSchema>

export const CompetitorListingSchema = BaseDocSchema.extend({
    id: z.string(),
    source: CompetitorListingSourceSchema,
    externalId: z.string(), // Shopify product ID
    title: z.string(),
    handle: z.string(),
    priceEur: z.number().min(0),
    imageUrl: z.string().url().optional(),
    condition: z.string().optional(),
    listedAt: z.string().optional(), // ISO date from Shopify published_at
    soldAt: z.string().optional(), // ISO date when we detect it's no longer available
    isAvailable: z.boolean().default(true),
    brand: z.string().optional(),
    productType: z.string().optional(),
})

export type CompetitorListing = z.infer<typeof CompetitorListingSchema>
