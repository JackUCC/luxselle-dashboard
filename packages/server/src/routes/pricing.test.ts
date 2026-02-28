/**
 * Pricing route tests: POST /price-check response shape and validation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { ZodError } from 'zod'
import { pricingRouter } from './pricing'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const { mockCheck } = vi.hoisted(() => ({ mockCheck: vi.fn() }))

vi.mock('../services/price-check/PriceCheckService', () => ({
  PriceCheckService: class {
    check = mockCheck
  },
}))

interface TestError {
  status?: number
  code?: string
  message?: string
  details?: unknown
}

const app = express()
app.use(express.json())
app.use('/api/pricing', pricingRouter)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0]
    const pathStr = firstIssue?.path?.length ? firstIssue.path.join('.') : ''
    const detailMsg = firstIssue ? `${pathStr ? pathStr + ': ' : ''}${firstIssue.message}` : ''
    const message = detailMsg ? `Validation error: ${detailMsg}` : 'Validation error'
    res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, message, { formErrors: err.flatten().formErrors, fieldErrors: err.flatten().fieldErrors }))
    return
  }
  const e = err as TestError
  res.status(e.status ?? 500).json({
    error: {
      code: e.code ?? 'INTERNAL_ERROR',
      message: e.message ?? 'Internal error',
      details: e.details,
    },
  })
})

describe('POST /api/pricing/price-check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with data shape when service returns result', async () => {
    const researchedAt = new Date().toISOString()
    mockCheck.mockResolvedValue({
      averageSellingPriceEur: 1200,
      comps: [
        {
          title: 'Similar item (Designer Exchange)',
          price: 1150,
          source: 'Designer Exchange',
          sourceUrl: 'https://designerexchange.ie',
          previewImageUrl: 'https://designerexchange.ie/image.jpg',
        },
        {
          title: 'Similar item (Vestiaire Collective)',
          price: 1250,
          source: 'Vestiaire Collective',
          sourceUrl: 'https://vestiairecollective.com',
        },
      ],
      maxBuyEur: 780,
      maxBidEur: 729,
      dataSource: 'mock' as const,
      researchedAt,
    })

    const res = await request(app)
      .post('/api/pricing/price-check')
      .set('Content-Type', 'application/json')
      .send({ query: 'Chanel Classic Flap' })

    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(res.body.data).toMatchObject({
      averageSellingPriceEur: 1200,
      maxBuyEur: 780,
      maxBidEur: 729,
      dataSource: 'mock',
      researchedAt,
    })
    expect(Array.isArray(res.body.data.comps)).toBe(true)
    expect(res.body.data.comps).toHaveLength(2)

    expect(res.body.data.comps[0]).toMatchObject({
      title: 'Similar item (Designer Exchange)',
      previewImageUrl: 'https://designerexchange.ie/image.jpg',
    })
    expect(res.body.data.comps[1]).not.toHaveProperty('previewImageUrl')
    expect(typeof res.body.data.researchedAt).toBe('string')
  })

  it('returns 200 with unchanged response shape for degraded ai_fallback results', async () => {
    const researchedAt = new Date().toISOString()
    mockCheck.mockResolvedValue({
      averageSellingPriceEur: 0,
      comps: [],
      maxBuyEur: 0,
      maxBidEur: 0,
      dataSource: 'ai_fallback' as const,
      researchedAt,
    })

    const res = await request(app)
      .post('/api/pricing/price-check')
      .set('Content-Type', 'application/json')
      .send({ query: 'Chanel Classic Flap' })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      averageSellingPriceEur: 0,
      comps: [],
      maxBuyEur: 0,
      maxBidEur: 0,
      dataSource: 'ai_fallback',
      researchedAt,
    })
  })

  it('returns 400 when query is missing', async () => {
    const res = await request(app)
      .post('/api/pricing/price-check')
      .set('Content-Type', 'application/json')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
    expect(res.body.error.code).toBe(API_ERROR_CODES.VALIDATION)
    expect(res.body.error.message).toMatch(/query|required/i)
  })

  it('returns 400 when query is empty string', async () => {
    const res = await request(app)
      .post('/api/pricing/price-check')
      .set('Content-Type', 'application/json')
      .send({ query: '' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
    expect(res.body.error.code).toBe(API_ERROR_CODES.VALIDATION)
  })

  it('calls service with query, condition, and notes when provided', async () => {
    mockCheck.mockResolvedValue({
      averageSellingPriceEur: 1100,
      comps: [],
      maxBuyEur: 715,
      maxBidEur: 668,
      dataSource: 'mock',
      researchedAt: new Date().toISOString(),
    })

    await request(app)
      .post('/api/pricing/price-check')
      .set('Content-Type', 'application/json')
      .send({
        query: 'Hermès Birkin',
        condition: 'Excellent',
        notes: 'Gold hardware',
      })

    expect(mockCheck).toHaveBeenCalledWith({
      query: 'Hermès Birkin',
      condition: 'Excellent',
      notes: 'Gold hardware',
    })
  })

  it('returns 500 when service throws', async () => {
    mockCheck.mockRejectedValue(new Error('Search service unavailable'))

    const res = await request(app)
      .post('/api/pricing/price-check')
      .set('Content-Type', 'application/json')
      .send({ query: 'Chanel Flap' })

    expect(res.status).toBe(500)
    expect(res.body.error).toBeDefined()
    expect(res.body.error.code).toBe('INTERNAL_ERROR')
  })
})
