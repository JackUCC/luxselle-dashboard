import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { ZodError } from 'zod'
import { aiRouter } from './ai'

interface TestError {
  status?: number
  code?: string
  message?: string
  details?: unknown
}

const { mockDecodeSerialHeuristic } = vi.hoisted(() => ({
  mockDecodeSerialHeuristic: vi.fn(),
}))

vi.mock('../services/ai/AiService', () => {
  return {
    AiService: class {
      decodeSerialHeuristic = mockDecodeSerialHeuristic
      generateProductDescription = vi.fn()
      generateBusinessInsights = vi.fn()
      prompt = vi.fn()
      getRetailPriceFromDescription = vi.fn()
    },
  }
})

const app = express()
app.use(express.json())
app.use('/api/ai', aiRouter)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation error',
        details: err.flatten(),
      },
    })
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

describe('POST /api/ai/serial-decode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with decoded payload for valid request', async () => {
    mockDecodeSerialHeuristic.mockResolvedValue({
      success: true,
      brand: 'Gucci',
      normalizedSerial: '12345678',
      source: 'ai_heuristic',
      precision: 'year_window',
      confidence: 0.6,
      productionWindow: { startYear: 2018, endYear: 2020 },
      message: 'Likely 2018-2020',
      rationale: ['Example rationale'],
      uncertainties: ['Example uncertainty'],
      candidates: [],
      formatMatched: 'HEURISTIC_NUMERIC_PREFIX',
    })

    const res = await request(app).post('/api/ai/serial-decode').send({
      brand: 'Gucci',
      serial: '12345678',
      itemDescription: 'Gucci Marmont shoulder bag',
    })

    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(res.body.data.success).toBe(true)
    expect(res.body.data.brand).toBe('Gucci')
    expect(mockDecodeSerialHeuristic).toHaveBeenCalledWith({
      brand: 'Gucci',
      serial: '12345678',
      itemDescription: 'Gucci Marmont shoulder bag',
    })
  })

  it('returns 200 with degraded payload when service cannot decode reliably', async () => {
    mockDecodeSerialHeuristic.mockResolvedValue({
      success: false,
      brand: 'Gucci',
      normalizedSerial: 'UNKNOWN123',
      source: 'ai_heuristic',
      precision: 'unknown',
      confidence: 0,
      message: 'Could not infer a reliable production window from available evidence.',
      rationale: [],
      uncertainties: ['No validated reference evidence available for this decode attempt.'],
      candidates: null,
      formatMatched: null,
    })

    const res = await request(app).post('/api/ai/serial-decode').send({
      brand: 'Gucci',
      serial: 'UNKNOWN123',
    })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      success: false,
      precision: 'unknown',
      confidence: 0,
    })
  })

  it('returns 400 validation error for empty serial', async () => {
    const res = await request(app).post('/api/ai/serial-decode').send({
      brand: 'Gucci',
      serial: '',
    })

    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.message).toBeDefined()
    expect(typeof res.body.error.message).toBe('string')
  })

  it('returns 400 validation error for unknown brand', async () => {
    const res = await request(app).post('/api/ai/serial-decode').send({
      brand: 'Balenciaga',
      serial: '12345',
    })

    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.message).toBeDefined()
    expect(typeof res.body.error.message).toBe('string')
  })
})
