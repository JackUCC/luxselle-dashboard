/**
 * Products route tests: GET list, sell-with-invoice flow, and validation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { ZodError } from 'zod'
import { productsRouter } from './products'

const {
  mockList,
  mockGetById,
  mockProductSet,
  mockTransactionCreate,
  mockActivityCreate,
  mockInvoiceCreate,
  mockGetNextInvoiceNumber,
  mockGetSettings,
} = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGetById: vi.fn(),
  mockProductSet: vi.fn(),
  mockTransactionCreate: vi.fn(),
  mockActivityCreate: vi.fn(),
  mockInvoiceCreate: vi.fn(),
  mockGetNextInvoiceNumber: vi.fn(),
  mockGetSettings: vi.fn(),
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
    const res = await request(app).get('/api/products')
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
    const res = await request(app).get('/api/products')
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
    const res = await request(app).get('/api/products?sort=__proto__')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
  })

  it('sorts by a valid field like brand', async () => {
    const products = [
      { id: 'p1', createdAt: '2024-01-01', updatedAt: '', brand: 'Zara', model: 'M', costPriceEur: 10, sellPriceEur: 20, status: 'in_stock' },
      { id: 'p2', createdAt: '2024-01-02', updatedAt: '', brand: 'Acne', model: 'N', costPriceEur: 30, sellPriceEur: 40, status: 'in_stock' },
    ]
    mockList.mockResolvedValue(products)
    const res = await request(app).get('/api/products?sort=brand&dir=asc')
    expect(res.status).toBe(200)
    expect(res.body.data[0].brand).toBe('Acne')
    expect(res.body.data[1].brand).toBe('Zara')
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
      .post('/api/products/p1/sell-with-invoice')
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
      .post('/api/products/p1/sell-with-invoice')
      .send({ customerName: 'John Smith' })

    expect(res.status).toBe(400)
    expect(mockTransactionCreate).not.toHaveBeenCalled()
    expect(mockInvoiceCreate).not.toHaveBeenCalled()
  })
})
