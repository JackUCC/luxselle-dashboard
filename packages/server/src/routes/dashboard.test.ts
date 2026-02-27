/**
 * Dashboard route tests: GET /kpis and error response shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { dashboardRouter } from './dashboard'

const { mockProductList, mockSourcingList } = vi.hoisted(() => ({
  mockProductList: vi.fn(),
  mockSourcingList: vi.fn(),
}))

vi.mock('../repos/ProductRepo', () => ({ ProductRepo: class { list = mockProductList } }))
vi.mock('../repos/SourcingRequestRepo', () => ({ SourcingRequestRepo: class { list = mockSourcingList } }))
vi.mock('../repos/ActivityEventRepo', () => ({ ActivityEventRepo: class {} }))
vi.mock('../repos/SystemJobRepo', () => ({ SystemJobRepo: class {} }))
vi.mock('../repos/TransactionRepo', () => ({ TransactionRepo: class {} }))
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
    expect(res.body.data.activeSourcingPipeline).toBeDefined()
  })
})
