import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { sourcingRouter } from './sourcing'

interface TestError {
  status?: number
  code?: string
  message?: string
  details?: unknown
}

// Hoisted mocks so they can be used in vi.mock factory
const { mockGetById, mockSet, mockCreateActivity, mockList, mockRemove } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockSet: vi.fn(),
  mockCreateActivity: vi.fn(),
  mockList: vi.fn(),
  mockRemove: vi.fn(),
}))

vi.mock('../repos/SourcingRequestRepo', () => {
  return {
    SourcingRequestRepo: class {
      getById = mockGetById
      set = mockSet
      list = mockList
      create = vi.fn()
      remove = mockRemove
    }
  }
})

vi.mock('../repos/ActivityEventRepo', () => {
  return {
    ActivityEventRepo: class {
      create = mockCreateActivity
    }
  }
})

// Setup app
const app = express()
app.use(express.json())
app.use('/api/sourcing', sourcingRouter)

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

describe('PUT /api/sourcing/:id - Status Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow valid transition (open -> sourcing)', async () => {
    mockGetById.mockResolvedValue({
      id: '123',
      status: 'open',
      customerName: 'Test Customer',
    })
    mockSet.mockResolvedValue({
      id: '123',
      status: 'sourcing',
      customerName: 'Test Customer',
    })

    const res = await request(app)
      .put('/api/sourcing/123')
      .send({ status: 'sourcing' })

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('sourcing')
    expect(mockCreateActivity).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'sourcing_status_changed',
      payload: expect.objectContaining({
        oldStatus: 'open',
        newStatus: 'sourcing',
      }),
    }))
  })

  it('should reject invalid transition (open -> fulfilled)', async () => {
    mockGetById.mockResolvedValue({
      id: '123',
      status: 'open',
      customerName: 'Test Customer',
    })

    const res = await request(app)
      .put('/api/sourcing/123')
      .send({ status: 'fulfilled' })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('BAD_REQUEST')
    expect(res.body.error.message).toContain('Invalid status transition')
    expect(res.body.error.details).toEqual(
      expect.objectContaining({
        from: 'open',
        to: 'fulfilled',
        allowedNextStatuses: ['sourcing'],
      })
    )
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('should allow same status update (open -> open)', async () => {
    mockGetById.mockResolvedValue({
      id: '123',
      status: 'open',
      customerName: 'Test Customer',
    })
    mockSet.mockResolvedValue({
      id: '123',
      status: 'open',
      customerName: 'Test Customer',
    })

    const res = await request(app)
      .put('/api/sourcing/123')
      .send({ status: 'open' })

    expect(res.status).toBe(200)
    expect(mockCreateActivity).not.toHaveBeenCalled() // No status change event
  })

  it('should return 404 if request not found', async () => {
    mockGetById.mockResolvedValue(null)

    const res = await request(app)
      .put('/api/sourcing/999')
      .send({ status: 'sourcing' })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/sourcing/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 204 with no body on successful delete', async () => {
    mockRemove.mockResolvedValue(undefined)

    const res = await request(app).delete('/api/sourcing/123')

    expect(res.status).toBe(204)
    expect(res.body).toEqual({})
    expect(mockRemove).toHaveBeenCalledWith('123')
  })
})

describe('GET /api/sourcing - list with ?q= filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return only matching results when ?q= is provided', async () => {
    mockList.mockResolvedValue([
      { id: '1', customerName: 'Alice Smith', queryText: 'Gucci bag', brand: 'Gucci', status: 'open', priority: 'high', createdAt: '2024-01-01T00:00:00Z', budget: 500 },
      { id: '2', customerName: 'Bob Jones', queryText: 'Prada shoes', brand: 'Prada', status: 'open', priority: 'low', createdAt: '2024-01-02T00:00:00Z', budget: 300 },
    ])

    const res = await request(app).get('/api/sourcing?q=gucci')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].customerName).toBe('Alice Smith')
  })

  it('should return an empty array when ?q= matches nothing', async () => {
    mockList.mockResolvedValue([
      { id: '1', customerName: 'Alice Smith', queryText: 'Gucci bag', brand: 'Gucci', status: 'open', priority: 'high', createdAt: '2024-01-01T00:00:00Z', budget: 500 },
    ])

    const res = await request(app).get('/api/sourcing?q=hermes')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(0)
    expect(res.body.total).toBe(0)
  })

  it('should return all results when no ?q= is provided', async () => {
    const items = [
      { id: '1', customerName: 'Alice', queryText: 'Bag', brand: 'A', status: 'open', priority: 'high', createdAt: '2024-01-01T00:00:00Z', budget: 100 },
      { id: '2', customerName: 'Bob', queryText: 'Watch', brand: 'B', status: 'sourcing', priority: 'low', createdAt: '2024-01-02T00:00:00Z', budget: 200 },
    ]
    mockList.mockResolvedValue(items)

    const res = await request(app).get('/api/sourcing')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.total).toBe(2)
  })
})
