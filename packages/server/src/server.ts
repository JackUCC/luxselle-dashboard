/**
 * Express API server: mounts routes, request ID/logging, and global error handler.
 * All API routes live under /api/*. See docs/CODE_REFERENCE.md for route index.
 * @see docs/CODE_REFERENCE.md
 * References: Express, cors, Zod
 */
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
import { jobsRouter } from './routes/jobs'
import { API_ERROR_CODES, formatApiError } from './lib/errors'
import { requestId, requestLogger, type RequestWithId, logger, errorTracker } from './middleware/requestId'
// Auth middleware available but not applied yet (deferred to Iteration 6)
// import { requireAuth, requireRole } from './middleware/auth'

const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use(requestId as express.RequestHandler)
app.use(requestLogger as express.RequestHandler)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Mount API route modules
app.use('/api/products', productsRouter)
app.use('/api/buying-list', buyingListRouter)
app.use('/api/pricing', pricingRouter)
app.use('/api/suppliers', suppliersRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/sourcing', sourcingRouter)
app.use('/api/jobs', jobsRouter)

// Global error handler: Zod validation → 400 with error body; all other errors → 500
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const requestId = (req as RequestWithId).requestId

  if (err instanceof ZodError) {
    errorTracker.track('validation')
    logger.warn('validation_error', {
      requestId,
      errors: err.flatten(),
    })
    res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'Validation error', err.flatten() as unknown as object))
    return
  }

  errorTracker.track('internal')
  logger.error('unhandled_error', err, { requestId })
  res.status(500).json(formatApiError(API_ERROR_CODES.INTERNAL, 'Internal server error'))
})

app.listen(env.PORT, () => {
  console.log(`API server running on http://localhost:${env.PORT}`)
})
