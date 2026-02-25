/**
 * Market Research route tests: GET /trending and error response shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { marketResearchRouter } from './market-research'

const { mockGetTrending } = vi.hoisted(() => ({ mockGetTrending: vi.fn() }))

vi.mock('../services/market-research/MarketResearchService', () => ({
  MarketResearchService: class {
    getTrending = mockGetTrending
    getCompetitorFeed = vi.fn()
    analyse = vi.fn()
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
