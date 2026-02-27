/**
 * Market Research route tests: GET /trending, POST /analyse, GET /competitor-feed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { ZodError } from 'zod'
import { marketResearchRouter } from './market-research'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const { mockGetTrending, mockAnalyse, mockGetCompetitorFeed } = vi.hoisted(() => ({
  mockGetTrending: vi.fn(),
  mockAnalyse: vi.fn(),
  mockGetCompetitorFeed: vi.fn(),
}))

vi.mock('../services/market-research/MarketResearchService', () => ({
  MarketResearchService: class {
    getTrending = mockGetTrending
    getCompetitorFeed = mockGetCompetitorFeed
    analyse = mockAnalyse
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
app.use('/api/market-research', marketResearchRouter)
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
    error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message ?? 'Internal error', details: e.details },
  })
})

describe('GET /api/market-research/trending', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with data when service returns result', async () => {
    mockGetTrending.mockResolvedValue({ provider: 'mock', items: [], generatedAt: new Date().toISOString() })
    const res = await request(app).get('/api/market-research/trending')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(res.body.data.provider).toBe('mock')
    expect(Array.isArray(res.body.data.items)).toBe(true)
  })
})

describe('POST /api/market-research/analyse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with data when service returns result', async () => {
    const generatedAt = new Date().toISOString()
    mockAnalyse.mockResolvedValue({
      provider: 'mock',
      brand: 'Chanel',
      model: 'Classic Flap',
      estimatedMarketValueEur: 4500,
      priceRangeLowEur: 4000,
      priceRangeHighEur: 5000,
      suggestedBuyPriceEur: 3200,
      suggestedSellPriceEur: 4500,
      demandLevel: 'high',
      priceTrend: 'stable',
      marketLiquidity: 'moderate',
      recommendation: 'buy',
      confidence: 0.8,
      marketSummary: 'Strong market for this model.',
      keyInsights: [],
      riskFactors: [],
      comparables: [],
      generatedAt,
    })

    const res = await request(app)
      .post('/api/market-research/analyse')
      .set('Content-Type', 'application/json')
      .send({
        brand: 'Chanel',
        model: 'Classic Flap',
        category: 'Bags',
        condition: 'Excellent',
      })

    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(res.body.data.brand).toBe('Chanel')
    expect(res.body.data.model).toBe('Classic Flap')
    expect(res.body.data.estimatedMarketValueEur).toBe(4500)
    expect(Array.isArray(res.body.data.comparables)).toBe(true)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/market-research/analyse')
      .set('Content-Type', 'application/json')
      .send({ brand: 'Chanel' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })
})

describe('GET /api/market-research/competitor-feed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with data when service returns result', async () => {
    const generatedAt = new Date().toISOString()
    mockGetCompetitorFeed.mockResolvedValue({
      items: [
        { title: 'Chanel Classic Flap Medium', priceEur: 4500, source: 'Designer Exchange', sourceUrl: 'https://example.com/1' },
        { title: 'Hermès Birkin 30', priceEur: 12000, source: 'Luxury Exchange', sourceUrl: 'https://example.com/2' },
      ],
      generatedAt,
    })

    const res = await request(app).get('/api/market-research/competitor-feed')

    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(res.body.data.generatedAt).toBe(generatedAt)
    expect(Array.isArray(res.body.data.items)).toBe(true)
    expect(res.body.data.items).toHaveLength(2)
    expect(res.body.data.items[0].title).toBe('Chanel Classic Flap Medium')
    expect(res.body.data.items[0].priceEur).toBe(4500)
    expect(res.body.data.items[1].source).toBe('Luxury Exchange')
  })
})
