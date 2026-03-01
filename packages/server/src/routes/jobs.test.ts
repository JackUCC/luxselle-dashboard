/**
 * Jobs route tests: GET list and GET :id error shape.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { jobsRouter } from './jobs'

const { mockList, mockGetById, mockSet } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGetById: vi.fn(),
  mockSet: vi.fn(),
}))

vi.mock('../repos/SystemJobRepo', () => ({
  SystemJobRepo: class {
    list = mockList
    getById = mockGetById
    set = mockSet
  },
}))
vi.mock('../services/JobRunner', () => ({ runJob: vi.fn().mockResolvedValue(undefined) }))

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

describe('POST /api/jobs/:id/retry', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns 200 with updated job data when job is retryable', async () => {
    const failedJob = { id: 'job-1', status: 'failed', retryCount: 0, maxRetries: 3, jobType: 'supplier_import' }
    const updatedJob = { ...failedJob, status: 'queued', retryCount: 1 }
    mockGetById.mockResolvedValue(failedJob)
    mockSet.mockResolvedValue(updatedJob)
    const res = await request(app).post('/api/jobs/job-1/retry')
    expect(res.status).toBe(200)
    expect(res.body.data).toBeDefined()
    expect(res.body.data.status).toBe('queued')
  })

  it('returns 404 when job does not exist', async () => {
    mockGetById.mockResolvedValue(null)
    const res = await request(app).post('/api/jobs/nonexistent/retry')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('returns 400 when job is not in a failed state', async () => {
    mockGetById.mockResolvedValue({ id: 'job-1', status: 'running', retryCount: 0, maxRetries: 3 })
    const res = await request(app).post('/api/jobs/job-1/retry')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('BAD_REQUEST')
  })

  it('returns 400 when max retries exceeded', async () => {
    mockGetById.mockResolvedValue({ id: 'job-1', status: 'failed', retryCount: 3, maxRetries: 3 })
    const res = await request(app).post('/api/jobs/job-1/retry')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('BAD_REQUEST')
  })
})
