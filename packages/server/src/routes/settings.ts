/**
 * Settings API: read/update global app settings (pricing market, auction profiles, VAT/FX defaults).
 */
import { Router } from 'express'
import { z } from 'zod'
import { DEFAULT_ORG_ID, SettingsSchema } from '@shared/schemas'
import { SettingsRepo } from '../repos/SettingsRepo'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const router = Router()
const settingsRepo = new SettingsRepo()

const SettingsPatchSchema = SettingsSchema.partial().omit({
  organisationId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
})

function buildDefaultSettings(now: string) {
  return SettingsSchema.parse({
    organisationId: DEFAULT_ORG_ID,
    createdAt: now,
    updatedAt: now,
    baseCurrency: 'EUR',
    targetMarginPct: 35,
    lowStockThreshold: 2,
    fxUsdToEur: 0.92,
    vatRatePct: 20,
    pricingMarketCountryDefault: 'IE',
    pricingMarketMode: 'ie_first_eu_fallback',
    pricingIeSourceAllowlist: ['designerexchange.ie', 'luxuryexchange.ie', 'siopaella.com'],
    importVatPctDefault: 23,
    auctionPlatforms: [
      {
        id: 'hibid-ie',
        name: 'HiBid IE',
        buyerPremiumPct: 15,
        platformFeePct: 0,
        fixedFeeEur: 0,
        paymentFeePct: 2,
        defaultShippingEur: 40,
        defaultInsuranceEur: 8,
        defaultCustomsDutyPct: 3,
        defaultImportVatPct: 23,
        enabled: true,
      },
      {
        id: 'catawiki',
        name: 'Catawiki',
        buyerPremiumPct: 9,
        platformFeePct: 0,
        fixedFeeEur: 0,
        paymentFeePct: 2,
        defaultShippingEur: 35,
        defaultInsuranceEur: 5,
        defaultCustomsDutyPct: 3,
        defaultImportVatPct: 23,
        enabled: true,
      },
    ],
  })
}

router.get('/', async (_req, res, next) => {
  try {
    const existing = await settingsRepo.getSettings()
    if (existing) {
      res.json({ data: existing })
      return
    }

    const now = new Date().toISOString()
    const defaults = buildDefaultSettings(now)
    const created = await settingsRepo.upsertSettings(defaults)
    res.json({ data: created })
  } catch (error) {
    next(error)
  }
})

router.patch('/', async (req, res, next) => {
  try {
    const patch = SettingsPatchSchema.parse(req.body)
    const now = new Date().toISOString()
    const existing = await settingsRepo.getSettings()
    const base = existing ?? buildDefaultSettings(now)

    const merged = SettingsSchema.parse({
      ...base,
      ...patch,
      organisationId: DEFAULT_ORG_ID,
      createdAt: base.createdAt ?? now,
      updatedAt: now,
    })

    const updated = await settingsRepo.upsertSettings(merged)
    res.json({ data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json(
        formatApiError(API_ERROR_CODES.VALIDATION, 'Invalid settings payload', error.flatten()),
      )
      return
    }
    next(error)
  }
})

export { router as settingsRouter }
