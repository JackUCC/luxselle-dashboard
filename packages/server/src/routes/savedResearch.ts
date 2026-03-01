/**
 * Saved Research API: CRUD for market research results.
 * @see docs/CODE_REFERENCE.md
 */
import { Router } from 'express'
import { SavedResearchService } from '../services/SavedResearchService'
import { requireRole } from '../middleware/auth'

const router = Router()
const savedResearchService = new SavedResearchService()

// Helper to get userId (mocked until Auth is implemented)
import type { Request } from 'express'
const getUserId = (req: Request) => (req.headers['x-user-id'] as string) || 'default-user'

// POST /api/saved-research — save research
router.post('/', requireRole('operator', 'admin'), async (req, res, next) => {
  try {
    const userId = getUserId(req)
    const result = await savedResearchService.save(userId, req.body)
    res.status(201).json({ data: result })
  } catch (error) {
    next(error)
  }
})

// GET /api/saved-research — list all (?starred=true for filter)
router.get('/', async (req, res, next) => {
  try {
    const userId = getUserId(req)
    const filters: { starred?: boolean } = {}
    if (req.query.starred === 'true') {
      filters.starred = true
    } else if (req.query.starred === 'false') {
      filters.starred = false
    }

    const results = await savedResearchService.list(userId, filters)
    res.json({ data: results })
  } catch (error) {
    next(error)
  }
})

// GET /api/saved-research/:id — get single
router.get('/:id', async (req, res, next) => {
  try {
    const userId = getUserId(req)
    const result = await savedResearchService.getById(userId, req.params.id)
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/saved-research/:id — update (star/notes)
router.patch('/:id', requireRole('operator', 'admin'), async (req, res, next) => {
  try {
    const userId = getUserId(req)
    const result = await savedResearchService.update(userId, req.params.id, req.body)
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/saved-research/:id — delete
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const userId = getUserId(req)
    await savedResearchService.delete(userId, req.params.id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export { router as savedResearchRouter }
