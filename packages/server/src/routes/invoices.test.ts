/**
 * Invoices route tests: GET list and GET :id error shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { invoicesRouter } from './invoices'


vi.mock('../middleware/auth', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      next({ status: 401, code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' })
      return
    }
    ;(req as Request & { user?: { role: string } }).user = { role: String(req.headers['x-test-role'] ?? 'readOnly') }
    next()
  },
  requireRole: (...allowedRoles: string[]) => (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      next({ status: 401, code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' })
      return
    }
    const role = String(req.headers['x-test-role'] ?? 'readOnly')
    if (!allowedRoles.includes(role)) {
      next({ status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' })
      return
    }
    ;(req as Request & { user?: { role: string } }).user = { role }
    next()
  },
}))

const authHeaders = (role = 'admin') => ({
  Authorization: 'Bearer test-token',
  'x-test-role': role,
})

const { mockList, mockGetById, mockGetSettings } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGetById: vi.fn(),
  mockGetSettings: vi.fn(),
}))

vi.mock('../repos/InvoiceRepo', () => ({
  InvoiceRepo: class {
    list = mockList
    getById = mockGetById
    getNextInvoiceNumber = vi.fn().mockResolvedValue('INV-001')
    create = vi.fn()
  },
}))
vi.mock('../repos/SettingsRepo', () => ({
  SettingsRepo: class {
    getSettings = mockGetSettings
  },
}))
vi.mock('../services/InvoicePdfService', () => ({ InvoicePdfService: class {} }))

interface TestError {
  status?: number
  code?: string
  message?: string
  details?: unknown
}

const app = express()
app.use(express.json())
app.use('/api/invoices', invoicesRouter)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as TestError
  res.status(e.status ?? 500).json({
    error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message ?? 'Internal error', details: e.details },
  })
})

describe('GET /api/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with data, nextCursor, and total', async () => {
    mockList.mockResolvedValue([])
    const res = await request(app).get('/api/invoices').set(authHeaders('readOnly'))
    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.nextCursor).toBeDefined()
    expect(res.body.total).toBe(0)
  })

  it('returns correct total count', async () => {
    mockList.mockResolvedValue([
      { id: 'inv1', issuedAt: '2024-01-01', invoiceNumber: 'INV-001', totalEur: 100 },
      { id: 'inv2', issuedAt: '2024-01-02', invoiceNumber: 'INV-002', totalEur: 200 },
    ])
    const res = await request(app).get('/api/invoices').set(authHeaders('readOnly'))
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(2)
    expect(res.body.data).toHaveLength(2)
  })
})

describe('GET /api/invoices/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 with error code and message when invoice not found', async () => {
    mockGetById.mockResolvedValue(null)
    const res = await request(app).get('/api/invoices/nonexistent').set(authHeaders('readOnly'))
    expect(res.status).toBe(404)
    expect(res.body.error).toBeDefined()
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(res.body.error.message).toBeDefined()
    expect(typeof res.body.error.message).toBe('string')
  })
})
