/**
 * VAT route tests: GET /calculate and error response shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { vatRouter } from './vat'

const { mockGetSettings } = vi.hoisted(() => ({ mockGetSettings: vi.fn() }))

vi.mock('../repos/SettingsRepo', () => ({ SettingsRepo: class { getSettings = mockGetSettings } }))

interface TestError {
  status?: number
  code?: string
  message?: string
  details?: unknown
}

const app = express()
app.use(express.json())
app.use('/api/vat', vatRouter)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as TestError
  res.status(e.status ?? 500).json({
    error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message ?? 'Internal error', details: e.details },
  })
})

describe('GET /api/vat/calculate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSettings.mockResolvedValue({ vatRatePct: 23 })
  })

  it('returns 200 with netEur, vatEur, grossEur, ratePct when inclVat=false', async () => {
    const res = await request(app).get('/api/vat/calculate').query({
      amountEur: 100,
      inclVat: 'false',
      ratePct: 20,
    })
    expect(res.status).toBe(200)
    expect(res.body.netEur).toBe(100)
    expect(res.body.vatEur).toBe(20)
    expect(res.body.grossEur).toBe(120)
    expect(res.body.ratePct).toBe(20)
  })

  it('returns 400 with error code and message for invalid query', async () => {
    const res = await request(app).get('/api/vat/calculate').query({
      amountEur: -1,
      inclVat: 'false',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
    expect(res.body.error.code).toBeDefined()
    expect(res.body.error.message).toBeDefined()
    expect(typeof res.body.error.message).toBe('string')
  })
})
