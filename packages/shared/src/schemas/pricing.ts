/** Shared pricing/import schemas for market targeting, landed cost, and supplier templates. */
import { z } from 'zod'
import { SupplierAvailabilitySchema } from './base'

export const PricingMarketCountrySchema = z.enum(['IE'])
export type PricingMarketCountry = z.infer<typeof PricingMarketCountrySchema>

export const PricingMarketModeSchema = z.enum(['ie_first_eu_fallback'])
export type PricingMarketMode = z.infer<typeof PricingMarketModeSchema>

export const ComparableMarketScopeSchema = z.enum(['IE', 'EU_FALLBACK'])
export type ComparableMarketScope = z.infer<typeof ComparableMarketScopeSchema>

export const PricingComparableSchema = z.object({
  title: z.string(),
  price: z.number(),
  source: z.string(),
  sourceUrl: z.string().url().optional(),
  previewImageUrl: z.string().url().optional(),
  marketCountry: z.string().default('EU'),
  marketScope: ComparableMarketScopeSchema.default('EU_FALLBACK'),
})
export type PricingComparable = z.infer<typeof PricingComparableSchema>

export const PricingMarketSummarySchema = z.object({
  marketCountry: PricingMarketCountrySchema.default('IE'),
  marketMode: PricingMarketModeSchema.default('ie_first_eu_fallback'),
  ieCount: z.number().int().min(0).default(0),
  euFallbackCount: z.number().int().min(0).default(0),
  fallbackUsed: z.boolean().default(false),
})
export type PricingMarketSummary = z.infer<typeof PricingMarketSummarySchema>

export const AuctionPlatformProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  buyerPremiumPct: z.number().min(0).default(0),
  platformFeePct: z.number().min(0).default(0),
  fixedFeeEur: z.number().min(0).default(0),
  paymentFeePct: z.number().min(0).default(0),
  defaultShippingEur: z.number().min(0).default(0),
  defaultInsuranceEur: z.number().min(0).default(0),
  defaultCustomsDutyPct: z.number().min(0).default(0),
  defaultImportVatPct: z.number().min(0).max(100).default(23),
  enabled: z.boolean().default(true),
})
export type AuctionPlatformProfile = z.infer<typeof AuctionPlatformProfileSchema>

export const LandedCostSnapshotSchema = z.object({
  platformId: z.string().optional(),
  platformName: z.string().optional(),
  calculatedAt: z.string(),
  hammerEur: z.number(),
  buyerPremiumPct: z.number(),
  platformFeePct: z.number(),
  fixedFeeEur: z.number(),
  paymentFeePct: z.number(),
  shippingEur: z.number(),
  insuranceEur: z.number(),
  customsDutyPct: z.number(),
  importVatPct: z.number(),
  buyerPremiumEur: z.number(),
  platformFeeEur: z.number(),
  paymentFeeEur: z.number(),
  preImportSubtotalEur: z.number(),
  customsValueEur: z.number(),
  customsDutyEur: z.number(),
  vatBaseEur: z.number(),
  importVatEur: z.number(),
  landedCostEur: z.number(),
})
export type LandedCostSnapshot = z.infer<typeof LandedCostSnapshotSchema>

export const SupplierImportColumnMapSchema = z.object({
  externalId: z.string().optional(),
  title: z.string().optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  conditionRank: z.string().optional(),
  askPriceUsd: z.string().optional(),
  askPriceEur: z.string().optional(),
  sellingPriceUsd: z.string().optional(),
  sellingPriceEur: z.string().optional(),
  availability: z.string().optional(),
  imageUrl: z.string().optional(),
  sourceUrl: z.string().optional(),
})
export type SupplierImportColumnMap = z.infer<typeof SupplierImportColumnMapSchema>

export const SupplierImportTemplateSchema = z.object({
  columnMap: SupplierImportColumnMapSchema.default({}),
  availabilityMap: z.record(SupplierAvailabilitySchema).default({}),
  defaultAvailability: SupplierAvailabilitySchema.default('uploaded'),
  trimValues: z.boolean().default(true),
})
export type SupplierImportTemplate = z.infer<typeof SupplierImportTemplateSchema>

// Price check (RAG) request/response schemas — shared by server and frontend
export const PriceCheckCompSchema = z.object({
  title: z.string(),
  price: z.number(),
  source: z.string(),
  sourceUrl: z.string().optional(),
  previewImageUrl: z.string().optional(),
  dataOrigin: z.enum(['web_search', 'ai_estimate']).optional(),
})
export type PriceCheckComp = z.infer<typeof PriceCheckCompSchema>

export const PriceCheckInputSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  condition: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  strategy: z.enum(['auto', 'strict', 'broad']).optional(),
})
export type PriceCheckInput = z.infer<typeof PriceCheckInputSchema>

export const PriceCheckDiagnosticsSchema = z.object({
  emptyReason: z
    .enum([
      'no_search_data',
      'extraction_failed',
      'insufficient_valid_comps',
      'insufficient_provenance',
      'timeout',
    ])
    .optional(),
  searchAnnotationCount: z.number().optional(),
  searchRawTextLength: z.number().optional(),
  missingAttributesHint: z
    .array(z.enum(['brand', 'style', 'size', 'colour', 'material']))
    .optional(),
  strategyUsed: z.enum(['strict', 'broad']).optional(),
  extractedCompCount: z.number().optional(),
  validCompCount: z.number().optional(),
  filteredOutCount: z.number().optional(),
})
export type PriceCheckDiagnostics = z.infer<typeof PriceCheckDiagnosticsSchema>

export const PriceCheckResultSchema = z.object({
  averageSellingPriceEur: z.number(),
  comps: z.array(PriceCheckCompSchema),
  maxBuyEur: z.number(),
  maxBidEur: z.number(),
  dataSource: z.enum(['web_search', 'ai_fallback', 'provider_unavailable']),
  researchedAt: z.string(),
  diagnostics: PriceCheckDiagnosticsSchema.optional(),
})
export type PriceCheckResult = z.infer<typeof PriceCheckResultSchema>
