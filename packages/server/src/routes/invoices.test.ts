/**
 * Invoices route tests: GET list and GET :id error shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { invoicesRouter } from './invoices'

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

  it('returns 200 with data and nextCursor', async () => {
    mockList.mockResolvedValue([])
    const res = await request(app).get('/api/invoices')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.nextCursor).toBeDefined()
  })
})

describe('GET /api/invoices/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 with error code and message when invoice not found', async () => {
    mockGetById.mockResolvedValue(null)
    const res = await request(app).get('/api/invoices/nonexistent')
    expect(res.status).toBe(404)
    expect(res.body.error).toBeDefined()
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(res.body.error.message).toBeDefined()
    expect(typeof res.body.error.message).toBe('string')
  })
})
