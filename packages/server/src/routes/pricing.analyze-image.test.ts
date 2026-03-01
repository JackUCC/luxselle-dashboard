import { describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import express, { type NextFunction, type Request, type Response } from 'express'
import { API_ERROR_CODES } from '../lib/errors'

interface TestError {
  status?: number
  code?: string
  message?: string
  details?: unknown
}

async function buildApp(opts: {
  openAiApiKey?: string
  visionResponseText?: string
}) {
  vi.resetModules()

  const openAiCreateMock = vi.fn()
  if (opts.visionResponseText != null) {
    openAiCreateMock.mockResolvedValue({
      choices: [{ message: { content: opts.visionResponseText } }],
    })
  }

  vi.doMock('../config/env', () => ({
    env: {
      OPENAI_API_KEY: opts.openAiApiKey,
      AI_ROUTING_MODE: 'dynamic',
    },
  }))

  vi.doMock('openai', () => ({
    default: class OpenAI {
      chat = { completions: { create: openAiCreateMock } }
    },
  }))

  vi.doMock('../services/pricing/PricingService', () => ({
    PricingService: class {
      analyse = vi.fn()
      calculateAuctionLandedCost = vi.fn()
    },
  }))

  vi.doMock('../services/price-check/PriceCheckService', () => ({
    PriceCheckService: class {
      check = vi.fn()
    },
  }))

  vi.doMock('../repos/EvaluationRepo', () => ({
    EvaluationRepo: class {
      create = vi.fn()
    },
  }))

  vi.doMock('../repos/SettingsRepo', () => ({
    SettingsRepo: class {
      getSettings = vi.fn()
    },
  }))

  const { pricingRouter } = await import('./pricing')
  const app = express()
  app.use(express.json())
  app.use('/api/pricing', pricingRouter)
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as TestError
    res.status(e.status ?? 500).json({
      error: {
        code: e.code ?? API_ERROR_CODES.INTERNAL,
        message: e.message ?? 'Internal error',
        details: e.details,
      },
    })
  })

  return { app, openAiCreateMock }
}

describe('POST /api/pricing/analyze-image', () => {
  it('returns 503 when OPENAI_API_KEY is missing', async () => {
    const { app } = await buildApp({ openAiApiKey: undefined })

    const res = await request(app)
      .post('/api/pricing/analyze-image')
      .attach('image', Buffer.from('fake-image-bytes'), { filename: 'test.jpg', contentType: 'image/jpeg' })

    expect(res.status).toBe(503)
    expect(res.body.error).toBeDefined()
    expect(res.body.error.code).toBe(API_ERROR_CODES.INTERNAL)
    expect(String(res.body.error.message)).toMatch(/openai|vision/i)
  })

  it('returns extracted attributes when OpenAI vision is available', async () => {
    const visionJson = '{"brand":"Chanel","model":"Classic Flap","category":"Handbag","condition":"excellent","colour":"Black"}'
    const { app, openAiCreateMock } = await buildApp({
      openAiApiKey: 'test-openai-key',
      visionResponseText: visionJson,
    })

    const res = await request(app)
      .post('/api/pricing/analyze-image')
      .attach('image', Buffer.from('fake-image-bytes'), { filename: 'test.jpg', contentType: 'image/jpeg' })

    expect(res.status).toBe(200)
    expect(openAiCreateMock).toHaveBeenCalledTimes(1)
    expect(res.body.data).toMatchObject({
      brand: 'Chanel',
      model: 'Classic Flap',
      category: 'Handbag',
      condition: 'excellent',
      colour: 'Black',
      query: 'Chanel Classic Flap Black',
    })
  })
})
