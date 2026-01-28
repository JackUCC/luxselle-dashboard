import { Router } from 'express'
import { z } from 'zod'
import {
  DEFAULT_ORG_ID,
  SourcingRequestSchema,
  SourcingStatusSchema,
} from '@shared/schemas'
import { SourcingRequestRepo } from '../repos/SourcingRequestRepo'
import { ActivityEventRepo } from '../repos/ActivityEventRepo'
import { isValidSourcingTransition } from '../lib/sourcingStatus'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const router = Router()
const sourcingRepo = new SourcingRequestRepo()
const activityRepo = new ActivityEventRepo()

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

// List sourcing requests
router.get('/', async (_req, res, next) => {
  try {
    const requests = await sourcingRepo.list()
    res.json({ data: requests })
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

// Update sourcing request
router.put('/:id', async (req, res, next) => {
  try {
    const input = SourcingRequestUpdateSchema.parse(req.body)
    const now = new Date().toISOString()

    const current = await sourcingRepo.getById(req.params.id)
    if (!current) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Sourcing request not found'))
      return
    }

    if (input.status !== undefined) {
      const valid = isValidSourcingTransition(current.status, input.status)
      if (!valid) {
        res.status(400).json(
          formatApiError(API_ERROR_CODES.BAD_REQUEST, 'Invalid status transition', {
            from: current.status,
            to: input.status,
          })
        )
        return
      }
    }

    const statusChanged = input.status && input.status !== current.status

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
