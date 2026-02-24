import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { sourcingRouter } from './sourcing'

// Hoisted mocks so they can be used in vi.mock factory
const { mockGetById, mockSet, mockCreateActivity } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockSet: vi.fn(),
  mockCreateActivity: vi.fn(),
}))

vi.mock('../repos/SourcingRequestRepo', () => {
  return {
    SourcingRequestRepo: class {
      getById = mockGetById
      set = mockSet
      list = vi.fn()
      create = vi.fn()
      remove = vi.fn()
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

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message,
      details: err.details,
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
