/**
 * Dashboard route tests: GET /kpis and error response shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { dashboardRouter } from './dashboard'

const { mockProductListByStatus, mockSourcingListByStatuses, mockActivityListRecent } = vi.hoisted(() => ({
  mockProductListByStatus: vi.fn(),
  mockSourcingListByStatuses: vi.fn(),
  mockActivityListRecent: vi.fn(),
}))
const { mockGetDiagnostics } = vi.hoisted(() => ({
  mockGetDiagnostics: vi.fn(),
}))

vi.mock('../repos/ProductRepo', () => ({ ProductRepo: class { listByStatus = mockProductListByStatus } }))
vi.mock('../repos/SourcingRequestRepo', () => ({ SourcingRequestRepo: class { listByStatuses = mockSourcingListByStatuses } }))
vi.mock('../repos/ActivityEventRepo', () => ({ ActivityEventRepo: class { listRecent = mockActivityListRecent } }))
vi.mock('../repos/SystemJobRepo', () => ({
  SystemJobRepo: class {
    listRecent = vi.fn().mockResolvedValue([])
  },
}))
const { mockTransactionListByType } = vi.hoisted(() => ({
  mockTransactionListByType: vi.fn(),
}))
vi.mock('../repos/TransactionRepo', () => ({ TransactionRepo: class { listByType = mockTransactionListByType } }))
vi.mock('../repos/SettingsRepo', () => ({ SettingsRepo: class {} }))
vi.mock('../services/ai/AiRouter', () => ({
  getAiRouter: () => ({
    getDiagnostics: mockGetDiagnostics,
  }),
}))

interface TestError {
  status?: number
  code?: string
  message?: string
  details?: unknown
}

const app = express()
app.use(express.json())
app.use('/api/dashboard', dashboardRouter)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as TestError
  res.status(e.status ?? 500).json({
    error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message ?? 'Internal error', details: e.details },
  })
})

describe('GET /api/dashboard/kpis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProductListByStatus.mockResolvedValue([])
    mockSourcingListByStatuses.mockResolvedValue([])
    mockGetDiagnostics.mockReturnValue({
      aiRoutingMode: 'dynamic',
      providerAvailability: {
        openai: false,
        perplexity: false,
        vision: false,
      },
      lastProviderByTask: {},
    })
  })

  it('returns 200 with KPI data shape', async () => {
    const res = await request(app).get('/api/dashboard/kpis')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(res.body.data.totalInventoryValue).toBeDefined()
    expect(res.body.data.totalInventoryPotentialValue).toBeDefined()
    expect(res.body.data.totalInventoryItems).toBeDefined()
    expect(res.body.data.activeSourcingPipeline).toBeDefined()
  })

  it('multiplies cost and sell by quantity for KPIs', async () => {
    mockProductListByStatus.mockResolvedValue([
      { id: 'p1', status: 'in_stock', costPriceEur: 100, sellPriceEur: 200, quantity: 3 },
    ])
    const res = await request(app).get('/api/dashboard/kpis')
    expect(res.body.data.totalInventoryValue).toBe(300)
    expect(res.body.data.totalInventoryPotentialValue).toBe(600)
    expect(res.body.data.totalInventoryItems).toBe(3)
  })
})

describe('GET /api/dashboard/activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockActivityListRecent.mockResolvedValue([])
  })

  it('returns 200 with data array', async () => {
    const res = await request(app).get('/api/dashboard/activity')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('sorts events by createdAt descending', async () => {
    mockActivityListRecent.mockResolvedValue([
      { createdAt: '2026-01-02T10:00:00Z', eventType: 'new', entityId: 'e2', entityType: 'supplier', actor: 'system', organisationId: 'default', updatedAt: '2026-01-02T10:00:00Z', payload: {} },
      { createdAt: '2026-01-01T10:00:00Z', eventType: 'old', entityId: 'e1', entityType: 'supplier', actor: 'system', organisationId: 'default', updatedAt: '2026-01-01T10:00:00Z', payload: {} },
    ])
    const res = await request(app).get('/api/dashboard/activity')
    expect(res.status).toBe(200)
    expect(res.body.data[0].eventType).toBe('new')
  })

  it('respects the limit query param', async () => {
    mockActivityListRecent.mockResolvedValue([
      { createdAt: '2026-01-02T10:00:00Z', eventType: 'new', entityId: 'e1', entityType: 'supplier', actor: 'system', organisationId: 'default', updatedAt: '2026-01-02T10:00:00Z', payload: {} },
    ])
    const res = await request(app).get('/api/dashboard/activity?limit=1')
    expect(res.status).toBe(200)
    expect(mockActivityListRecent).toHaveBeenCalledWith(1)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].eventType).toBe('new')
  })
})

describe('GET /api/dashboard/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDiagnostics.mockReturnValue({
      aiRoutingMode: 'dynamic',
      providerAvailability: {
        openai: true,
        perplexity: false,
        vision: true,
      },
      lastProviderByTask: {
        web_search: 'openai',
      },
    })
  })

  it('returns ai routing diagnostics payload', async () => {
    const res = await request(app).get('/api/dashboard/status')

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      aiRoutingMode: 'dynamic',
      providerAvailability: {
        openai: true,
        perplexity: false,
        vision: true,
      },
      lastProviderByTask: {
        web_search: 'openai',
      },
    })
  })
})

describe('GET /api/dashboard/profit-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProductListByStatus.mockResolvedValue([])
    mockSourcingListByStatuses.mockResolvedValue([])
    mockTransactionListByType.mockResolvedValue([])
  })

  it('multiplies cost and revenue by quantity for sold products', async () => {
    mockProductListByStatus.mockResolvedValue([
      { id: 'p1', status: 'sold', costPriceEur: 100, sellPriceEur: 200, quantity: 2 },
    ])
    mockTransactionListByType.mockResolvedValue([])
    const res = await request(app).get('/api/dashboard/profit-summary')
    expect(res.status).toBe(200)
    expect(res.body.data.totalCost).toBe(200)
    expect(res.body.data.totalRevenue).toBe(400)
    expect(res.body.data.totalProfit).toBe(200)
  })
})
