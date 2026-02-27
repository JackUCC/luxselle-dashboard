import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { settingsRouter } from './settings'

interface TestError {
  status?: number
  code?: string
  message?: string
  details?: unknown
}

// Hoisted mocks so they can be used in vi.mock factory
const { mockGetSettings, mockUpsertSettings } = vi.hoisted(() => ({
  mockGetSettings: vi.fn(),
  mockUpsertSettings: vi.fn(),
}))

vi.mock('../repos/SettingsRepo', () => {
  return {
    SettingsRepo: class {
      getSettings = mockGetSettings
      upsertSettings = mockUpsertSettings
    },
  }
})

// Setup app
const app = express()
app.use(express.json())
app.use('/api/settings', settingsRouter)

// Error handler: same shape as production { error: { code, message, details? } }
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as TestError
  res.status(e.status ?? 500).json({
    error: {
      code: e.code ?? 'INTERNAL_ERROR',
      message: e.message ?? 'Internal error',
      details: e.details,
    },
  })
})

const MOCK_SETTINGS = {
  id: 'org-default',
  organisationId: 'org-default',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  baseCurrency: 'EUR',
  targetMarginPct: 35,
  fxUsdToEur: 0.92,
  vatRatePct: 20,
  pricingMarketCountryDefault: 'IE',
  pricingMarketMode: 'ie_first_eu_fallback',
  pricingIeSourceAllowlist: ['designerexchange.ie'],
  importVatPctDefault: 23,
  auctionPlatforms: [
    {
      id: 'hibid-ie',
      name: 'HiBid IE',
      buyerPremiumPct: 15,
      platformFeePct: 0,
      fixedFeeEur: 0,
      paymentFeePct: 2,
      defaultShippingEur: 40,
      defaultInsuranceEur: 8,
      defaultCustomsDutyPct: 3,
      defaultImportVatPct: 23,
      enabled: true,
    },
  ],
}

describe('GET /api/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 200 with the existing settings object', async () => {
    mockGetSettings.mockResolvedValue(MOCK_SETTINGS)

    const res = await request(app).get('/api/settings')

    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(res.body.data.baseCurrency).toBe('EUR')
    expect(res.body.data.targetMarginPct).toBe(35)
  })

  it('should create and return default settings when none exist', async () => {
    mockGetSettings.mockResolvedValue(null)
    mockUpsertSettings.mockResolvedValue(MOCK_SETTINGS)

    const res = await request(app).get('/api/settings')

    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(mockUpsertSettings).toHaveBeenCalledTimes(1)
  })
})

describe('PATCH /api/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 200 with updated field when given a valid patch body', async () => {
    const updated = { ...MOCK_SETTINGS, targetMarginPct: 40 }
    mockGetSettings.mockResolvedValue(MOCK_SETTINGS)
    mockUpsertSettings.mockResolvedValue(updated)

    const res = await request(app)
      .patch('/api/settings')
      .send({ targetMarginPct: 40 })

    expect(res.status).toBe(200)
    expect(res.body.data.targetMarginPct).toBe(40)
    expect(mockUpsertSettings).toHaveBeenCalledTimes(1)
  })

  it('should return 400 with VALIDATION_ERROR code when body has an invalid field type', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .send({ targetMarginPct: 'not-a-number' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.message).toBeDefined()
    expect(typeof res.body.error.message).toBe('string')
  })
})
