/**
 * Products route tests: GET list, sell-with-invoice flow, and validation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { ZodError } from 'zod'
import { productsRouter } from './products'


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

const {
  mockList,
  mockGetById,
  mockProductSet,
  mockTransactionCreate,
  mockActivityCreate,
  mockInvoiceCreate,
  mockGetNextInvoiceNumber,
  mockGetSettings,
  mockProductsGet,
  mockProductsLimit,
  mockBatchDelete,
  mockBatchCommit,
} = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGetById: vi.fn(),
  mockProductSet: vi.fn(),
  mockTransactionCreate: vi.fn(),
  mockActivityCreate: vi.fn(),
  mockInvoiceCreate: vi.fn(),
  mockGetNextInvoiceNumber: vi.fn(),
  mockGetSettings: vi.fn(),
  mockProductsGet: vi.fn(),
  mockProductsLimit: vi.fn(),
  mockBatchDelete: vi.fn(),
  mockBatchCommit: vi.fn(),
}))

vi.mock('../repos/ProductRepo', () => ({
  ProductRepo: class {
    list = mockList
    getById = mockGetById
    set = mockProductSet
  },
}))
vi.mock('../repos/TransactionRepo', () => ({
  TransactionRepo: class {
    create = mockTransactionCreate
  },
}))
vi.mock('../repos/ActivityEventRepo', () => ({
  ActivityEventRepo: class {
    create = mockActivityCreate
  },
}))
vi.mock('../repos/InvoiceRepo', () => ({
  InvoiceRepo: class {
    create = mockInvoiceCreate
    getNextInvoiceNumber = mockGetNextInvoiceNumber
  },
}))
vi.mock('../repos/SettingsRepo', () => ({
  SettingsRepo: class {
    getSettings = mockGetSettings
  },
}))


vi.mock('../config/firebase', () => ({
  db: {
    collection: vi.fn(() => ({
      limit: mockProductsLimit,
    })),
    batch: vi.fn(() => ({
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    })),
  },
  storage: {},
}))

vi.mock('../middleware/auth', () => ({
  requireAuth: (req: Request & { user?: { uid: string; role: string; orgId: string } }, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    if (authHeader === 'Bearer admin-token') {
      req.user = { uid: 'admin-user', role: 'admin', orgId: 'default' }
      next()
      return
    }

    if (authHeader === 'Bearer operator-token') {
      req.user = { uid: 'operator-user', role: 'operator', orgId: 'default' }
      next()
      return
    }

    next({ status: 401, code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' })
  },
  requireRole: (...allowedRoles: string[]) => (req: Request & { user?: { role: string } }, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next({ status: 401, code: 'UNAUTHORIZED', message: 'Not authenticated' })
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      next({ status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' })
      return
    }

    next()
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
app.use('/api/products', productsRouter)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } })
    return
  }
  const e = err as TestError
  res.status(e.status ?? 500).json({
    error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message ?? 'Internal error', details: e.details },
  })
})

describe('GET /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with data array when list is empty', async () => {
    mockList.mockResolvedValue([])
    const res = await request(app).get('/api/products').set(authHeaders('readOnly'))
    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data).toHaveLength(0)
  })

  it('returns 200 with data array when list has items', async () => {
    const one = {
      id: 'p1',
      organisationId: 'default',
      createdAt: '',
      updatedAt: '',
      brand: 'X',
      model: 'Y',
      costPriceEur: 10,
      sellPriceEur: 20,
      status: 'in_stock',
    }
    mockList.mockResolvedValue([one])
    const res = await request(app).get('/api/products').set(authHeaders('readOnly'))
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].brand).toBe('X')
  })

  it('falls back to createdAt sort when unknown sort field is provided', async () => {
    const products = [
      { id: 'p1', createdAt: '2024-01-02', updatedAt: '', brand: 'A', model: 'M', costPriceEur: 10, sellPriceEur: 20, status: 'in_stock' },
      { id: 'p2', createdAt: '2024-01-01', updatedAt: '', brand: 'B', model: 'N', costPriceEur: 30, sellPriceEur: 40, status: 'in_stock' },
    ]
    mockList.mockResolvedValue(products)
    const res = await request(app).get('/api/products?sort=__proto__').set(authHeaders('readOnly'))
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
  })

  it('sorts by a valid field like brand', async () => {
    const products = [
      { id: 'p1', createdAt: '2024-01-01', updatedAt: '', brand: 'Zara', model: 'M', costPriceEur: 10, sellPriceEur: 20, status: 'in_stock' },
      { id: 'p2', createdAt: '2024-01-02', updatedAt: '', brand: 'Acne', model: 'N', costPriceEur: 30, sellPriceEur: 40, status: 'in_stock' },
    ]
    mockList.mockResolvedValue(products)
    const res = await request(app).get('/api/products?sort=brand&dir=asc').set(authHeaders('readOnly'))
    expect(res.status).toBe(200)
    expect(res.body.data[0].brand).toBe('Acne')
    expect(res.body.data[1].brand).toBe('Zara')
  })
})


describe('POST /api/products/clear', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProductsLimit.mockReturnValue({ get: mockProductsGet })
    mockBatchCommit.mockResolvedValue(undefined)
  })

  it('rejects unauthorized requests', async () => {
    const res = await request(app).post('/api/products/clear')

    expect(res.status).toBe(401)
    expect(mockProductsGet).not.toHaveBeenCalled()
  })

  it('rejects non-admin requests', async () => {
    const res = await request(app)
      .post('/api/products/clear')
      .set('Authorization', 'Bearer operator-token')

    expect(res.status).toBe(403)
    expect(mockProductsGet).not.toHaveBeenCalled()
  })

  it('rejects requests without destructive-action confirmation header', async () => {
    const res = await request(app)
      .post('/api/products/clear')
      .set('Authorization', 'Bearer admin-token')

    expect(res.status).toBe(400)
    expect(mockProductsGet).not.toHaveBeenCalled()
  })

  it('accepts valid admin requests with confirmation header and emits audit log fields', async () => {
    mockProductsGet
      .mockResolvedValueOnce({
        empty: false,
        docs: [{ ref: 'doc-1' }, { ref: 'doc-2' }],
      })
      .mockResolvedValueOnce({
        empty: true,
        docs: [],
      })

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    const res = await request(app)
      .post('/api/products/clear')
      .set('Authorization', 'Bearer admin-token')
      .set('X-Confirm-Destructive-Action', 'CONFIRM_CLEAR_PRODUCTS')
      .set('X-Request-Id', 'req-1234')

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ deleted: 2 })
    expect(mockBatchDelete).toHaveBeenCalledTimes(2)

    const logPayload = JSON.parse(infoSpy.mock.calls[0][0] as string) as {
      requester: string
      timestamp: string
      deletedCount: number
      requestId: string
    }
    expect(logPayload.requester).toBe('admin-user')
    expect(logPayload.requestId).toBe('req-1234')
    expect(logPayload.deletedCount).toBe(2)
    expect(typeof logPayload.timestamp).toBe('string')

    infoSpy.mockRestore()
  })
})

describe('POST /api/products/:id/sell-with-invoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates sale transaction, marks product sold, and creates invoice', async () => {
    mockGetById.mockResolvedValue({
      id: 'p1',
      organisationId: 'default',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      brand: 'Chanel',
      model: 'Classic Flap',
      title: 'Classic Flap Medium',
      sku: 'SKU-123',
      costPriceEur: 1000,
      sellPriceEur: 2200,
      status: 'in_stock',
      quantity: 1,
    })
    mockTransactionCreate.mockResolvedValue({ id: 'tx1', amountEur: 2200 })
    mockProductSet.mockResolvedValue({ id: 'p1', status: 'sold' })
    mockGetSettings.mockResolvedValue({ vatRatePct: 23 })
    mockGetNextInvoiceNumber.mockResolvedValue('INV-0009')
    mockInvoiceCreate.mockResolvedValue({ id: 'inv1', invoiceNumber: 'INV-0009' })
    mockActivityCreate.mockResolvedValue({ id: 'act1' })

    const res = await request(app)
      .post('/api/products/p1/sell-with-invoice').set(authHeaders('operator'))
      .send({
        amountEur: 2200,
        customerName: 'John Smith',
        customerEmail: 'john@example.com',
        notes: 'Sold via showroom',
      })

    expect(res.status).toBe(201)
    expect(mockTransactionCreate).toHaveBeenCalledWith(expect.objectContaining({
      type: 'sale',
      productId: 'p1',
      amountEur: 2200,
      notes: 'Sold via showroom',
    }))
    expect(mockProductSet).toHaveBeenCalledWith('p1', expect.objectContaining({ status: 'sold' }))
    expect(mockInvoiceCreate).toHaveBeenCalledWith(expect.objectContaining({
      transactionId: 'tx1',
      productId: 'p1',
      customerName: 'John Smith',
      customerEmail: 'john@example.com',
      notes: 'Sold via showroom',
      lineItems: [expect.objectContaining({
        description: 'Classic Flap Medium (SKU: SKU-123)',
      })],
      totalEur: 2200,
    }))
    expect(res.body.data.invoice.id).toBe('inv1')
  })

  it('returns 400 when amountEur is missing', async () => {
    mockGetById.mockResolvedValue({
      id: 'p1',
      organisationId: 'default',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      brand: 'Chanel',
      model: 'Classic Flap',
      costPriceEur: 1000,
      sellPriceEur: 2200,
      status: 'in_stock',
      quantity: 1,
    })

    const res = await request(app)
      .post('/api/products/p1/sell-with-invoice').set(authHeaders('operator'))
      .send({ customerName: 'John Smith' })

    expect(res.status).toBe(400)
    expect(mockTransactionCreate).not.toHaveBeenCalled()
    expect(mockInvoiceCreate).not.toHaveBeenCalled()
  })
})


describe('Products auth guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when write action is called without auth', async () => {
    const res = await request(app)
      .post('/api/products/p1/sell-with-invoice')
      .send({ amountEur: 2200 })
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 when readOnly role calls write action', async () => {
    const res = await request(app)
      .post('/api/products/p1/sell-with-invoice')
      .set(authHeaders('readOnly'))
      .send({ amountEur: 2200 })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })
})
