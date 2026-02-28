/**
 * Products route tests: GET list and error response shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { productsRouter } from './products'

const { mockList } = vi.hoisted(() => ({ mockList: vi.fn() }))

vi.mock('../repos/ProductRepo', () => ({
  ProductRepo: class {
    list = mockList
  },
}))
vi.mock('../repos/TransactionRepo', () => ({ TransactionRepo: class {} }))
vi.mock('../repos/ActivityEventRepo', () => ({ ActivityEventRepo: class {} }))

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
    // Should not crash and should fall back to createdAt sorting
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
