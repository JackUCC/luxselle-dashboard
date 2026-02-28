/** Saved Research schemas. @see docs/CODE_REFERENCE.md */
import { z } from 'zod'
import { BaseDocSchema } from './base'

export const MarketComparableSchema = z.object({
  title: z.string(),
  priceEur: z.number(),
  source: z.string(),
  sourceUrl: z.string().optional(),
  previewImageUrl: z.string().optional(),
  condition: z.string(),
  daysListed: z.number().optional(),
  dataOrigin: z.enum(['web_search', 'ai_estimate']).optional(),
})

export type MarketComparable = z.infer<typeof MarketComparableSchema>

export const MarketResearchResultSchema = z.object({
  provider: z.string(),
  brand: z.string(),
  model: z.string(),
  estimatedMarketValueEur: z.number(),
  priceRangeLowEur: z.number(),
  priceRangeHighEur: z.number(),
  suggestedBuyPriceEur: z.number(),
  suggestedSellPriceEur: z.number(),
  demandLevel: z.enum(['very_high', 'high', 'moderate', 'low', 'very_low']),
  priceTrend: z.enum(['rising', 'stable', 'declining']),
  marketLiquidity: z.enum(['fast_moving', 'moderate', 'slow_moving']),
  recommendation: z.enum(['strong_buy', 'buy', 'hold', 'pass']),
  confidence: z.number(),
  marketSummary: z.string(),
  keyInsights: z.array(z.string()),
  riskFactors: z.array(z.string()),
  comparables: z.array(MarketComparableSchema),
  trendingScore: z.number().optional(),
  seasonalNotes: z.string().optional(),
})

export type MarketResearchResult = z.infer<typeof MarketResearchResultSchema>

export const SavedResearchSchema = BaseDocSchema.extend({
  userId: z.string(),
  brand: z.string(),
  model: z.string(),
  category: z.string(),
  condition: z.string(),
  result: MarketResearchResultSchema,
  starred: z.boolean().default(false),
  notes: z.string().optional(),
  deletedAt: z.string().optional(),
})

export type SavedResearch = z.infer<typeof SavedResearchSchema>

export const CreateSavedResearchSchema = SavedResearchSchema.omit({
  organisationId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  deletedAt: true,
  userId: true,
})

export type CreateSavedResearchInput = z.infer<typeof CreateSavedResearchSchema>

export const UpdateSavedResearchSchema = z.object({
  starred: z.boolean().optional(),
  notes: z.string().optional(),
})

export type UpdateSavedResearchInput = z.infer<typeof UpdateSavedResearchSchema>
