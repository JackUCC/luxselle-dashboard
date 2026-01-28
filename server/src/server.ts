import express from 'express'
import cors from 'cors'
import { ZodError } from 'zod'
import { env } from './config/env'
import { productsRouter } from './routes/products'
import { buyingListRouter } from './routes/buying-list'
import { pricingRouter } from './routes/pricing'
import { suppliersRouter } from './routes/suppliers'
import { dashboardRouter } from './routes/dashboard'
import { sourcingRouter } from './routes/sourcing'
import { API_ERROR_CODES, formatApiError } from './lib/errors'

const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/products', productsRouter)
app.use('/api/buying-list', buyingListRouter)
app.use('/api/pricing', pricingRouter)
app.use('/api/suppliers', suppliersRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/sourcing', sourcingRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'Validation error', err.flatten() as unknown as object))
    return
  }
  console.error(err)
  res.status(500).json(formatApiError(API_ERROR_CODES.INTERNAL, 'Internal server error'))
})

app.listen(env.PORT, () => {
  console.log(`API server running on http://localhost:${env.PORT}`)
})
