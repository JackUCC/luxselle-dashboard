/**
 * VAT calculation API: net/gross and VAT amount from amount + rate.
 * Rate comes from query/body or from org settings (vatRatePct).
 * @see docs/CODE_REFERENCE.md
 */
import { Router } from 'express'
import { z } from 'zod'
import { SettingsRepo } from '../repos/SettingsRepo'
import { vatFromNet, vatFromGross } from '../lib/vat'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const router = Router()
const settingsRepo = new SettingsRepo()

const querySchema = z.object({
  amountEur: z.coerce.number().min(0),
  inclVat: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true'),
  ratePct: z.coerce.number().min(0).max(100).optional(),
})

/** GET /api/vat/calculate?amountEur=100&inclVat=false&ratePct=20 → { netEur, vatEur, grossEur, ratePct } */
router.get('/calculate', async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'Invalid query', parsed.error.flatten()))
      return
    }
    const { amountEur, inclVat, ratePct: ratePctQuery } = parsed.data
    let ratePct = ratePctQuery
    if (ratePct == null) {
      const settings = await settingsRepo.getSettings()
      ratePct = settings?.vatRatePct ?? 20
    }
    let netEur: number
    let vatEur: number
    let grossEur: number
    if (inclVat) {
      const result = vatFromGross(amountEur, ratePct)
      netEur = result.netEur
      vatEur = result.vatEur
      grossEur = amountEur
    } else {
      const result = vatFromNet(amountEur, ratePct)
      netEur = amountEur
      vatEur = result.vatEur
      grossEur = result.grossEur
    }
    res.json({ netEur, vatEur, grossEur, ratePct })
  } catch (err) {
    next(err)
  }
})

const bodySchema = z.object({
  amountEur: z.number().min(0),
  inclVat: z.boolean(),
  ratePct: z.number().min(0).max(100).optional(),
})

/** POST /api/vat/calculate same response */
router.post('/calculate', async (req, res, next) => {
  try {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'Invalid body', parsed.error.flatten()))
      return
    }
    const { amountEur, inclVat, ratePct: ratePctBody } = parsed.data
    let ratePct = ratePctBody
    if (ratePct == null) {
      const settings = await settingsRepo.getSettings()
      ratePct = settings?.vatRatePct ?? 20
    }
    let netEur: number
    let vatEur: number
    let grossEur: number
    if (inclVat) {
      const result = vatFromGross(amountEur, ratePct)
      netEur = result.netEur
      vatEur = result.vatEur
      grossEur = amountEur
    } else {
      const result = vatFromNet(amountEur, ratePct)
      netEur = amountEur
      vatEur = result.vatEur
      grossEur = result.grossEur
    }
    res.json({ netEur, vatEur, grossEur, ratePct })
  } catch (err) {
    next(err)
  }
})

export const vatRouter = router
