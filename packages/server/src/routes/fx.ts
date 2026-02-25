/**
 * FX rates API: returns live rates (per 1 EUR) from FxService for frontend landed cost / calculators.
 * Same source as server-side prompt injection.
 */
import { Router } from 'express'
import { getFxService } from '../services/fx/FxService'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const rates = await getFxService().getRatesPerEur()
    res.json({ rates })
  } catch (error) {
    next(error)
  }
})

export const fxRouter = router
