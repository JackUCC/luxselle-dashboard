/** Settings schema (org/user, e.g. FX rate). @see docs/CODE_REFERENCE.md */
import { z } from 'zod'
import { BaseDocSchema, CurrencySchema } from './base'
import {
  AuctionPlatformProfileSchema,
  PricingMarketCountrySchema,
  PricingMarketModeSchema,
} from './pricing'

export const SettingsSchema = BaseDocSchema.extend({
  // Business details for Invoices
  businessName: z.string().optional().default('Luxselle'),
  businessAddress: z.string().optional().default(''), // Multi-line address
  businessVatNumber: z.string().optional().default(''),
  businessEmail: z.string().email().optional().default(''),
  businessPhone: z.string().optional().default(''),
  businessWebsite: z.string().optional().default(''),
  businessLogoUrl: z.string().optional().default(''),

  baseCurrency: CurrencySchema.default('EUR'),
  targetMarginPct: z.number(),
  lowStockThreshold: z.number(),
  fxUsdToEur: z.number(),
  /** VAT rate as percentage (e.g. 20 for 20%); used by VAT calculator and invoices. */
  vatRatePct: z.number().min(0).max(100).optional().default(20),
  pricingMarketCountryDefault: PricingMarketCountrySchema.default('IE'),
  pricingMarketMode: PricingMarketModeSchema.default('ie_first_eu_fallback'),
  pricingIeSourceAllowlist: z.array(z.string()).default([]),
  auctionPlatforms: z.array(AuctionPlatformProfileSchema).default([]),
  importVatPctDefault: z.number().min(0).max(100).default(23),
})

export type Settings = z.infer<typeof SettingsSchema>
