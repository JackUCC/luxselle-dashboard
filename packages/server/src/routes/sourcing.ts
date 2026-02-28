/**
 * Sourcing requests API: CRUD; PUT enforces valid status transitions via sourcingStatus lib.
 * @see docs/CODE_REFERENCE.md
 * References: Express, sourcingStatus, @shared/schemas
 */
import { Router } from 'express'
import { z } from 'zod'
import {
  DEFAULT_ORG_ID,
  SourcingRequestSchema,
  SourcingStatusSchema,
} from '@shared/schemas'
import { SourcingRequestRepo } from '../repos/SourcingRequestRepo'
import { ActivityEventRepo } from '../repos/ActivityEventRepo'
import { getValidNextStatuses, isValidSourcingTransition } from '../lib/sourcingStatus'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const router = Router()
const sourcingRepo = new SourcingRequestRepo()
const activityRepo = new ActivityEventRepo()

// Request body validation for create and update
const SourcingRequestInputSchema = z.object({
  customerName: z.string(),
  queryText: z.string(),
  brand: z.string().optional(),
  budget: z.coerce.number(),
  priority: z.enum(['low', 'medium', 'high']),
  status: SourcingStatusSchema.optional().default('open'),
  notes: z.string().optional(),
  linkedProductId: z.string().optional(),
  linkedSupplierItemId: z.string().optional(),
})
const SourcingRequestUpdateSchema = SourcingRequestInputSchema.partial()

// List with filters: q (search), status, priority; cursor pagination; sort/dir
router.get('/', async (req, res, next) => {
  try {
    const { q, status, priority, limit, cursor, sort, dir } = req.query
    let requests = await sourcingRepo.list()
    
    // Text search
    if (q && typeof q === 'string') {
      const query = q.toLowerCase()
      requests = requests.filter(r => 
        r.customerName.toLowerCase().includes(query) ||
        r.queryText.toLowerCase().includes(query) ||
        (r.brand && r.brand.toLowerCase().includes(query))
      )
    }
    
    // Status filter
    if (status && typeof status === 'string') {
      requests = requests.filter(r => r.status === status)
    }
    
    // Priority filter
    if (priority && typeof priority === 'string') {
      requests = requests.filter(r => r.priority === priority)
    }
    
    // Sort (validate sortField against known fields)
    const SORTABLE_FIELDS = new Set(['createdAt', 'updatedAt', 'customerName', 'brand', 'budget', 'priority', 'status', 'queryText'])
    const sortField = SORTABLE_FIELDS.has(sort as string) ? (sort as string) : 'createdAt'
    const sortDir = dir === 'asc' ? 1 : -1
    requests.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortField]
      const bVal = (b as Record<string, unknown>)[sortField]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * sortDir
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * sortDir
      }
      return 0
    })
    
    // Cursor pagination
    const parsedLimit = limit ? parseInt(String(limit), 10) : 50
    const limitNum = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 50
    let startIndex = 0
    
    if (cursor && typeof cursor === 'string') {
      const cursorIndex = requests.findIndex(r => r.id === cursor)
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1
      }
    }
    
    const paginated = requests.slice(startIndex, startIndex + limitNum)
    const nextCursor = paginated.length === limitNum && startIndex + limitNum < requests.length
      ? paginated[paginated.length - 1]?.id
      : null
    
    res.json({
      data: paginated,
      nextCursor,
      total: requests.length,
    })
  } catch (error) {
    next(error)
  }
})

// Get single sourcing request
router.get('/:id', async (req, res, next) => {
  try {
    const request = await sourcingRepo.getById(req.params.id)
    if (!request) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Sourcing request not found'))
      return
    }
    res.json({ data: request })
  } catch (error) {
    next(error)
  }
})

// Create sourcing request
router.post('/', async (req, res, next) => {
  try {
    const input = SourcingRequestInputSchema.parse(req.body)
    const now = new Date().toISOString()
    const request = SourcingRequestSchema.parse({
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
      customerName: input.customerName,
      queryText: input.queryText,
      brand: input.brand ?? '',
      budget: input.budget,
      priority: input.priority,
      status: input.status ?? 'open',
      notes: input.notes ?? '',
      linkedProductId: input.linkedProductId,
      linkedSupplierItemId: input.linkedSupplierItemId,
    })
    const created = await sourcingRepo.create(request)

    // Create activity event
    await activityRepo.create({
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
      actor: 'system',
      eventType: 'sourcing_created',
      entityType: 'sourcing_request',
      entityId: created.id,
      payload: {
        customerName: created.customerName,
        queryText: created.queryText,
      },
    })

    res.status(201).json({ data: created })
  } catch (error) {
    next(error)
  }
})

// Update; status change is validated via sourcingStatus and emits activity event
router.put('/:id', async (req, res, next) => {
  try {
    const input = SourcingRequestUpdateSchema.parse(req.body)
    const now = new Date().toISOString()
    const current = await sourcingRepo.getById(req.params.id)
    if (!current) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Sourcing request not found'))
      return
    }
    // Enforce allowed status transitions (open→sourcing→sourced→fulfilled|lost)
    if (input.status !== undefined) {
      const valid = isValidSourcingTransition(current.status, input.status)
      if (!valid) {
        res.status(400).json(
          formatApiError(API_ERROR_CODES.BAD_REQUEST, 'Invalid status transition', {
            from: current.status,
            to: input.status,
            allowedNextStatuses: getValidNextStatuses(current.status),
          })
        )
        return
      }
    }

    const statusChanged = input.status !== undefined && input.status !== current.status

    const updated = await sourcingRepo.set(req.params.id, {
      ...input,
      updatedAt: now,
    })

    // Create activity event if status changed
    if (statusChanged) {
      await activityRepo.create({
        organisationId: DEFAULT_ORG_ID,
        createdAt: now,
        updatedAt: now,
        actor: 'system',
        eventType: 'sourcing_status_changed',
        entityType: 'sourcing_request',
        entityId: req.params.id,
        payload: {
          oldStatus: current?.status,
          newStatus: input.status,
          customerName: updated.customerName,
        },
      })
    }

    res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

// Delete sourcing request
router.delete('/:id', async (req, res, next) => {
  try {
    await sourcingRepo.remove(req.params.id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export { router as sourcingRouter }
