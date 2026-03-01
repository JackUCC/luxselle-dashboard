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
import { pricingRouter } from './routes/pricing'
import { dashboardRouter } from './routes/dashboard'
import { sourcingRouter } from './routes/sourcing'
import { jobsRouter } from './routes/jobs'
import { vatRouter } from './routes/vat'
import { invoicesRouter } from './routes/invoices'
import { settingsRouter } from './routes/settings'
import { marketResearchRouter } from './routes/market-research'
import { aiRouter } from './routes/ai'
import { suppliersRouter } from './routes/suppliers'
import { fxRouter } from './routes/fx'
import { searchRouter } from './routes/search'
import { savedResearchRouter } from './routes/savedResearch'
import { API_ERROR_CODES, formatApiError, ApiError } from './lib/errors'
import { requestId, requestLogger, type RequestWithId, logger, errorTracker } from './middleware/requestId'
import { getAiRouter } from './services/ai/AiRouter'
// import { requireAuth } from './middleware/auth'

const app = express()

type ErrorWithCode = Error & { code?: string }
type BodyParseError = SyntaxError & { status?: number; type?: string; body?: unknown }

function isErrorWithCode(error: unknown): error is ErrorWithCode {
  return error instanceof Error && typeof (error as ErrorWithCode).code === 'string'
}

function isBodyParseError(error: unknown): error is BodyParseError {
  if (!(error instanceof SyntaxError)) return false
  const parsed = error as BodyParseError
  return parsed.type === 'entity.parse.failed' || parsed.status === 400
}

const configuredFrontendOrigins = env.FRONTEND_ORIGINS
  ? env.FRONTEND_ORIGINS
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  : []

const defaultProductionOrigins: (string | RegExp)[] = [/\.vercel\.app$/, /localhost(:\d+)?$/, /127\.0\.0\.1(:\d+)?$/]
const allowedOrigins: true | (string | RegExp)[] =
  process.env.NODE_ENV === 'production'
    ? [...configuredFrontendOrigins, ...defaultProductionOrigins]
    : true

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Idempotency-Key'],
}))
app.use(express.json({ limit: '2mb' }))
app.use(requestId as express.RequestHandler)
app.use(requestLogger as express.RequestHandler)

app.get('/api/health', async (req, res) => {
  const openaiConfigured = Boolean(env.OPENAI_API_KEY)
  const perplexityConfigured = Boolean(env.PERPLEXITY_API_KEY)
  const baseResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiConfigured: openaiConfigured || perplexityConfigured,
    ai: {
      routingMode: env.AI_ROUTING_MODE,
      providers: {
        openai: openaiConfigured,
        perplexity: perplexityConfigured,
      },
      searchModel: env.PERPLEXITY_SEARCH_MODEL,
    },
  }

  if (req.query.test_providers !== '1') {
    res.json(baseResponse)
    return
  }

  const providerTests: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {}

  if (openaiConfigured) {
    const startedAt = Date.now()
    try {
      const OpenAI = (await import('openai')).default
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
      await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        temperature: 0,
      })
      providerTests.openai = { ok: true, latencyMs: Date.now() - startedAt }
    } catch (error) {
      providerTests.openai = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  } else {
    providerTests.openai = { ok: false, error: 'OPENAI_API_KEY is not configured' }
  }

  if (perplexityConfigured) {
    const startedAt = Date.now()
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.PERPLEXITY_EXTRACTION_MODEL,
          temperature: 0,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      })

      if (!response.ok) {
        throw new Error(`Perplexity health probe failed (${response.status})`)
      }

      providerTests.perplexity = { ok: true, latencyMs: Date.now() - startedAt }
    } catch (error) {
      providerTests.perplexity = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  } else {
    providerTests.perplexity = { ok: false, error: 'PERPLEXITY_API_KEY is not configured' }
  }

  // Record the router in diagnostics path so runtime health remains visible for normal requests.
  const aiRouter = getAiRouter()
  const diagnostics = aiRouter.getDiagnostics()

  res.json({
    ...baseResponse,
    ai: {
      ...baseResponse.ai,
      lastProviderByTask: diagnostics.lastProviderByTask,
    },
    providerTests,
  })
})

// Protect all business APIs under /api/* while keeping /api/health public.
// app.use('/api', requireAuth) // Disabled temporarily for MVP

// Mount API route modules
app.use('/api/products', productsRouter)
app.use('/api/pricing', pricingRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/sourcing', sourcingRouter)
app.use('/api/jobs', jobsRouter)
app.use('/api/vat', vatRouter)
app.use('/api/invoices', invoicesRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/market-research', marketResearchRouter)
app.use('/api/ai', aiRouter)
app.use('/api/suppliers', suppliersRouter)
app.use('/api/fx', fxRouter)
app.use('/api/search', searchRouter)
app.use('/api/saved-research', savedResearchRouter)

app.use('/api', (_req, res) => {
  res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Endpoint not found'))
})

// Global error handler: Zod validation → 400 with error body; all other errors → 500
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const requestId = (req as RequestWithId).requestId

  if (isBodyParseError(err)) {
    errorTracker.track('validation')
    logger.warn('body_parse_error', {
      requestId,
      message: err.message,
      type: err.type,
    })
    res
      .status(400)
      .json(formatApiError(API_ERROR_CODES.VALIDATION, 'Invalid JSON body'))
    return
  }

  if (isErrorWithCode(err) && err.code?.startsWith('LIMIT_')) {
    errorTracker.track('validation')
    logger.warn('upload_validation_error', {
      requestId,
      code: err.code,
      message: err.message,
    })
    res
      .status(400)
      .json(formatApiError(API_ERROR_CODES.VALIDATION, err.message || 'Upload validation failed'))
    return
  }

  if (err instanceof ApiError) {
    errorTracker.track('api_error')
    logger.warn('api_error', {
      requestId,
      code: err.code,
      message: err.message,
      status: err.status,
    })
    res.status(err.status).json(formatApiError(err.code, err.message, err.details))
    return
  }

  if (err instanceof ZodError) {
    errorTracker.track('validation')
    const flat = err.flatten()
    const firstIssue = err.issues[0]
    const pathStr = firstIssue?.path?.length ? firstIssue.path.join('.') : ''
    const detailMsg = firstIssue ? `${pathStr ? pathStr + ': ' : ''}${firstIssue.message}` : ''
    const message = detailMsg ? `Validation error: ${detailMsg}` : 'Validation error'
    const details = {
      formErrors: flat.formErrors,
      fieldErrors: flat.fieldErrors,
    }
    logger.warn('validation_error', {
      requestId,
      message,
      errors: details,
    })
    res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, message, details))
    return
  }

  errorTracker.track('internal')
  const errMessage = err instanceof Error ? err.message : String(err)
  logger.error('unhandled_error', err, { requestId })
  // Include error message in response when X-Debug: 1 for troubleshooting
  const includeDebug = req.headers['x-debug'] === '1'
  res.status(500).json(formatApiError(
    API_ERROR_CODES.INTERNAL,
    includeDebug ? errMessage : 'Internal server error',
    includeDebug && err instanceof Error && err.stack ? { stack: err.stack } : undefined
  ))
})


if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`API server running on http://0.0.0.0:${env.PORT}`)
  })
}

export { app }
