/**
 * System jobs API: list/filter jobs (e.g. import); get by id; retry runs job in-process async.
 * @see docs/CODE_REFERENCE.md
 * References: Express, SystemJobRepo, JobRunner
 */
import { Router } from 'express'
import { SystemJobRepo } from '../repos/SystemJobRepo'
import { runJob } from '../services/JobRunner'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'
import { requireRole } from '../middleware/auth'

const router = Router()
const jobRepo = new SystemJobRepo()

// List jobs with optional type/status filter; sort by most recent; limit
router.get('/', async (req, res, next) => {
  try {
    const { type, status, limit } = req.query
    let jobs = await jobRepo.list()
    if (type && typeof type === 'string') {
      jobs = jobs.filter(job => job.jobType === type)
    }
    if (status && typeof status === 'string') {
      jobs = jobs.filter(job => job.status === status)
    }
    jobs.sort((a, b) => {
      const aTime = a.startedAt || a.queuedAt || a.createdAt
      const bTime = b.startedAt || b.queuedAt || b.createdAt
      return bTime.localeCompare(aTime)
    })
    
    const limitNum = limit ? parseInt(String(limit)) : 50
    jobs = jobs.slice(0, limitNum)
    
    res.json({ data: jobs })
  } catch (error) {
    next(error)
  }
})

// Get job by ID
router.get('/:id', async (req, res, next) => {
  try {
    const job = await jobRepo.getById(req.params.id)
    if (!job) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Job not found'))
      return
    }
    res.json({ data: job })
  } catch (error) {
    next(error)
  }
})

// Retry a failed job
router.post('/:id/retry', requireRole('admin'), async (req, res, next) => {
  try {
    const job = await jobRepo.getById(req.params.id)
    if (!job) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Job not found'))
      return
    }
    
    if (job.status !== 'failed' && job.status !== 'fail') {
      res.status(400).json(formatApiError(API_ERROR_CODES.BAD_REQUEST, 'Only failed jobs can be retried'))
      return
    }
    
    if (job.retryCount >= (job.maxRetries || 3)) {
      res.status(400).json(formatApiError(API_ERROR_CODES.BAD_REQUEST, 'Max retries exceeded'))
      return
    }
    
    const now = new Date().toISOString()
    const updated = await jobRepo.set(req.params.id, {
      status: 'queued',
      queuedAt: now,
      retryCount: (job.retryCount || 0) + 1,
      lastError: '',
      progress: undefined,
      updatedAt: now,
    })

    setImmediate(() => {
      runJob(req.params.id).catch((err) => {
        console.error('JobRunner runJob error:', err)
      })
    })

    res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

// Cancel a running or queued job
router.post('/:id/cancel', requireRole('admin'), async (req, res, next) => {
  try {
    const job = await jobRepo.getById(req.params.id)
    if (!job) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Job not found'))
      return
    }
    
    if (job.status !== 'queued' && job.status !== 'running') {
      res.status(400).json(formatApiError(API_ERROR_CODES.BAD_REQUEST, 'Only queued or running jobs can be cancelled'))
      return
    }
    
    const now = new Date().toISOString()
    const updated = await jobRepo.set(req.params.id, {
      status: 'failed',
      completedAt: now,
      lastError: 'Cancelled by user',
      updatedAt: now,
    })
    
    res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

export { router as jobsRouter }
