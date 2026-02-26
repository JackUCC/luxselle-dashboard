/**
 * Search route tests: POST /api/search/visual validation and response shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { searchRouter } from './search'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const { mockSearchByImageUrl, mockSearchByImageBuffer } = vi.hoisted(() => ({
  mockSearchByImageUrl: vi.fn(),
  mockSearchByImageBuffer: vi.fn(),
}))

vi.mock('../services/visualSearch/VisualSearchService', () => ({
  searchByImageUrl: (...args: unknown[]) => mockSearchByImageUrl(...args),
  searchByImageBuffer: (...args: unknown[]) => mockSearchByImageBuffer(...args),
}))

function statusToCode(status: number): string {
  if (status === 400) return API_ERROR_CODES.BAD_REQUEST
  if (status === 404) return API_ERROR_CODES.NOT_FOUND
  if (status === 409) return API_ERROR_CODES.CONFLICT
  return API_ERROR_CODES.INTERNAL
}

const app = express()
app.use(express.json())
app.use('/api/search', searchRouter)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as { status?: number; message?: string }
  const status = e.status ?? 500
  const code = statusToCode(status)
  const body = formatApiError(code, e.message ?? 'Internal error')
  res.status(status).json(body)
})

describe('POST /api/search/visual', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when no image file or imageUrl provided', async () => {
    const res = await request(app).post('/api/search/visual').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatchObject({
      code: expect.any(String),
      message: expect.stringMatching(/image|imageUrl/i),
    })
  })

  it('returns 200 with results when imageUrl is provided', async () => {
    mockSearchByImageUrl.mockResolvedValue([
      { productId: 'p1', imageUrl: 'https://example.com/1.jpg', title: 'Product 1', score: 0.9 },
    ])
    const res = await request(app)
      .post('/api/search/visual')
      .set('Content-Type', 'application/json')
      .send({ imageUrl: 'https://example.com/query.jpg' })
    expect(res.status).toBe(200)
    expect(res.body.data?.results).toHaveLength(1)
    expect(res.body.data.results[0].productId).toBe('p1')
    expect(res.body.data.results[0].score).toBe(0.9)
  })
})
