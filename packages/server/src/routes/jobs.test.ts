/**
 * Jobs route tests: GET list and GET :id error shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { jobsRouter } from './jobs'

const { mockList, mockGetById } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGetById: vi.fn(),
}))

vi.mock('../repos/SystemJobRepo', () => ({
  SystemJobRepo: class {
    list = mockList
    getById = mockGetById
  },
}))
vi.mock('../services/JobRunner', () => ({ runJob: vi.fn() }))

interface TestError {
  status?: number
  code?: string
  message?: string
  details?: unknown
}

const app = express()
app.use(express.json())
app.use('/api/jobs', jobsRouter)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as TestError
  res.status(e.status ?? 500).json({
    error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message ?? 'Internal error', details: e.details },
  })
})

describe('GET /api/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with data array', async () => {
    mockList.mockResolvedValue([])
    const res = await request(app).get('/api/jobs')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

describe('GET /api/jobs/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 with error code and message when job not found', async () => {
    mockGetById.mockResolvedValue(null)
    const res = await request(app).get('/api/jobs/nonexistent')
    expect(res.status).toBe(404)
    expect(res.body.error).toBeDefined()
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(res.body.error.message).toBeDefined()
    expect(typeof res.body.error.message).toBe('string')
  })
})
