import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import express, { type NextFunction, type Request, type Response } from 'express'
import { ZodError } from 'zod'
import { aiRouter } from './ai'

interface TestError {
  status?: number
  code?: string
  message?: string
  details?: unknown
}

const {
  mockGenerateBusinessInsights,
  mockRetailLookup,
  mockPrompt,
  mockGenerateDescription,
  mockDecodeSerial,
} = vi.hoisted(() => ({
  mockGenerateBusinessInsights: vi.fn(),
  mockRetailLookup: vi.fn(),
  mockPrompt: vi.fn(),
  mockGenerateDescription: vi.fn(),
  mockDecodeSerial: vi.fn(),
}))

vi.mock('../services/ai/AiService', () => ({
  AiService: class {
    generateBusinessInsights = mockGenerateBusinessInsights
    getRetailPriceFromDescription = mockRetailLookup
    prompt = mockPrompt
    generateProductDescription = mockGenerateDescription
    decodeSerialHeuristic = mockDecodeSerial
  },
}))

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

describe('AI routes (retail + insights)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POST /api/ai/insights returns 200 with degraded insights payload', async () => {
    const generatedAt = new Date().toISOString()
    mockGenerateBusinessInsights.mockResolvedValue({
      insights: [],
      generatedAt,
    })

    const res = await request(app).post('/api/ai/insights').send({})

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({
      insights: [],
      generatedAt,
    })
    expect(mockGenerateBusinessInsights).toHaveBeenCalledWith({})
  })

  it('POST /api/ai/retail-lookup returns 200 with degraded retail payload', async () => {
    mockRetailLookup.mockResolvedValue({
      retailPriceEur: null,
      currency: 'EUR',
      productName: null,
      note: 'Retail lookup is temporarily unavailable. Verify manually on official brand channels.',
    })

    const res = await request(app)
      .post('/api/ai/retail-lookup')
      .send({ description: 'Chanel Classic Flap black caviar medium' })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      retailPriceEur: null,
      currency: 'EUR',
      productName: null,
    })
  })

  it('POST /api/ai/prompt returns 400 when prompt is missing', async () => {
    const res = await request(app).post('/api/ai/prompt').send({})

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
