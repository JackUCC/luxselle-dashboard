/**
 * Dashboard route tests: GET /kpis and error response shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { dashboardRouter } from './dashboard'

const { mockProductList, mockSourcingList, mockActivityList } = vi.hoisted(() => ({
  mockProductList: vi.fn(),
  mockSourcingList: vi.fn(),
  mockActivityList: vi.fn(),
}))

vi.mock('../repos/ProductRepo', () => ({ ProductRepo: class { list = mockProductList } }))
vi.mock('../repos/SourcingRequestRepo', () => ({ SourcingRequestRepo: class { list = mockSourcingList } }))
vi.mock('../repos/ActivityEventRepo', () => ({ ActivityEventRepo: class { list = mockActivityList } }))
vi.mock('../repos/SystemJobRepo', () => ({ SystemJobRepo: class {} }))
const { mockTransactionList } = vi.hoisted(() => ({
  mockTransactionList: vi.fn(),
}))
vi.mock('../repos/TransactionRepo', () => ({ TransactionRepo: class { list = mockTransactionList } }))
vi.mock('../repos/SettingsRepo', () => ({ SettingsRepo: class {} }))

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
    mockProductList.mockResolvedValue([])
    mockSourcingList.mockResolvedValue([])
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
    mockProductList.mockResolvedValue([
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
    mockActivityList.mockResolvedValue([])
  })

  it('returns 200 with data array', async () => {
    const res = await request(app).get('/api/dashboard/activity')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('sorts events by createdAt descending', async () => {
    mockActivityList.mockResolvedValue([
      { createdAt: '2026-01-01T10:00:00Z', eventType: 'old', entityId: 'e1', entityType: 'supplier', actor: 'system', organisationId: 'default', updatedAt: '2026-01-01T10:00:00Z', payload: {} },
      { createdAt: '2026-01-02T10:00:00Z', eventType: 'new', entityId: 'e2', entityType: 'supplier', actor: 'system', organisationId: 'default', updatedAt: '2026-01-02T10:00:00Z', payload: {} },
    ])
    const res = await request(app).get('/api/dashboard/activity')
    expect(res.status).toBe(200)
    expect(res.body.data[0].eventType).toBe('new')
  })

  it('respects the limit query param', async () => {
    mockActivityList.mockResolvedValue([
      { createdAt: '2026-01-02T10:00:00Z', eventType: 'new', entityId: 'e1', entityType: 'supplier', actor: 'system', organisationId: 'default', updatedAt: '2026-01-02T10:00:00Z', payload: {} },
      { createdAt: '2026-01-01T10:00:00Z', eventType: 'old', entityId: 'e2', entityType: 'supplier', actor: 'system', organisationId: 'default', updatedAt: '2026-01-01T10:00:00Z', payload: {} },
    ])
    const res = await request(app).get('/api/dashboard/activity?limit=1')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].eventType).toBe('new')
  })
})

describe('GET /api/dashboard/profit-summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProductList.mockResolvedValue([])
    mockSourcingList.mockResolvedValue([])
    mockTransactionList.mockResolvedValue([])
  })

  it('multiplies cost and revenue by quantity for sold products', async () => {
    mockProductList.mockResolvedValue([
      { id: 'p1', status: 'sold', costPriceEur: 100, sellPriceEur: 200, quantity: 2 },
    ])
    mockTransactionList.mockResolvedValue([])
    const res = await request(app).get('/api/dashboard/profit-summary')
    expect(res.status).toBe(200)
    expect(res.body.data.totalCost).toBe(200)
    expect(res.body.data.totalRevenue).toBe(400)
    expect(res.body.data.totalProfit).toBe(200)
  })
})
