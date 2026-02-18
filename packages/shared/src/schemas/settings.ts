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
  businessEmail: z.preprocess(
    (v) => {
      if (v == null || v === undefined) return ''
      const s = String(v).trim()
      if (s === '' || /^(n\/a|none|-|null)$/i.test(s)) return ''
      try {
        z.string().email().parse(s)
        return s
      } catch {
        return ''
      }
    },
    z.string().default('')
  ),
  businessPhone: z.string().optional().default(''),
  businessWebsite: z.string().optional().default(''),
  businessLogoUrl: z.string().optional().default(''),

  baseCurrency: CurrencySchema.default('EUR'),
  targetMarginPct: z.coerce.number(),
  lowStockThreshold: z.coerce.number(),
  fxUsdToEur: z.coerce.number(),
  /** VAT rate as percentage (e.g. 20 for 20%); used by VAT calculator and invoices. */
  vatRatePct: z.coerce.number().min(0).max(100).optional().default(20),
  pricingMarketCountryDefault: PricingMarketCountrySchema.default('IE'),
  pricingMarketMode: PricingMarketModeSchema.default('ie_first_eu_fallback'),
  pricingIeSourceAllowlist: z.array(z.string()).default([]),
  auctionPlatforms: z.array(AuctionPlatformProfileSchema).default([]),
  importVatPctDefault: z.coerce.number().min(0).max(100).default(23),
})

export type Settings = z.infer<typeof SettingsSchema>
