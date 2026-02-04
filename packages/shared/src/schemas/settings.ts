/** Settings schema (org/user, e.g. FX rate). @see docs/CODE_REFERENCE.md */
import { z } from 'zod'
import { BaseDocSchema, CurrencySchema } from './base'

export const SettingsSchema = BaseDocSchema.extend({
  baseCurrency: CurrencySchema.default('EUR'),
  targetMarginPct: z.number(),
  lowStockThreshold: z.number(),
  fxUsdToEur: z.number(),
})

export type Settings = z.infer<typeof SettingsSchema>
