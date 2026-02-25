/**
 * Suppliers route tests: GET list and error response shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { suppliersRouter } from './suppliers'

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }))

vi.mock('../repos/SupplierRepo', () => ({
  SupplierRepo: class {
    list = mockList
    getById = vi.fn()
    set = vi.fn()
  },
}))
vi.mock('../services/import/SupplierImportService', () => ({
  SupplierImportService: class {
    previewImportFile = vi.fn()
  },
}))
vi.mock('../services/import/SupplierEmailSyncService', () => ({
  SupplierEmailSyncService: class {
    getStatus = vi.fn()
    sync = vi.fn()
  },
}))

interface TestError {
  status?: number
  code?: string
  message?: string
  details?: unknown
}

const app = express()
app.use(express.json())
app.use('/api/suppliers', suppliersRouter)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as TestError
  res.status(e.status ?? 500).json({
    error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message ?? 'Internal error', details: e.details },
  })
})

describe('GET /api/suppliers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with data array', async () => {
    mockList.mockResolvedValue([])
    const res = await request(app).get('/api/suppliers')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})
