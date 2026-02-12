/** Settings schema (org/user, e.g. FX rate). @see docs/CODE_REFERENCE.md */
import { z } from 'zod'
import { BaseDocSchema, CurrencySchema } from './base'

export const SettingsSchema = BaseDocSchema.extend({
  baseCurrency: CurrencySchema.default('EUR'),
  targetMarginPct: z.number(),
  lowStockThreshold: z.number(),
  fxUsdToEur: z.number(),
  /** VAT rate as percentage (e.g. 20 for 20%); used by VAT calculator and invoices. */
  vatRatePct: z.number().min(0).max(100).optional().default(20),
})

export type Settings = z.infer<typeof SettingsSchema>
