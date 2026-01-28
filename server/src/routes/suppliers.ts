import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { DEFAULT_ORG_ID, SupplierSchema } from '@shared/schemas'
import { SupplierRepo } from '../repos/SupplierRepo'
import { SupplierItemRepo } from '../repos/SupplierItemRepo'
import { SupplierImportService } from '../services/import/SupplierImportService'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const router = Router()
const supplierRepo = new SupplierRepo()
const supplierItemRepo = new SupplierItemRepo()
const importService = new SupplierImportService()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})

const SupplierInputSchema = z.object({
  name: z.string(),
  contactName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

const SupplierUpdateSchema = SupplierInputSchema.partial()

// List suppliers
router.get('/', async (_req, res, next) => {
  try {
    const suppliers = await supplierRepo.list()
    res.json({ data: suppliers })
  } catch (error) {
    next(error)
  }
})

// List all supplier items (unified feed) — must be before /:id to avoid "items" as id
// Supports filters: ?supplier={id}&brand={brand}&availability={uploaded|sold|waiting}
router.get('/items/all', async (req, res, next) => {
  try {
    const { supplier, brand, availability } = req.query
    let items = await supplierItemRepo.list()
    
    // Apply filters
    if (supplier && typeof supplier === 'string') {
      items = items.filter(item => item.supplierId === supplier)
    }
    if (brand && typeof brand === 'string') {
      items = items.filter(item => item.brand.toLowerCase().includes(brand.toLowerCase()))
    }
    if (availability && typeof availability === 'string') {
      items = items.filter(item => item.availability === availability)
    }
    
    // Sort by createdAt desc (most recent first)
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    res.json({ data: items })
  } catch (error) {
    next(error)
  }
})

// Get single supplier
router.get('/:id', async (req, res, next) => {
  try {
    const supplier = await supplierRepo.getById(req.params.id)
    if (!supplier) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Supplier not found'))
      return
    }
    res.json({ data: supplier })
  } catch (error) {
    next(error)
  }
})

// Get supplier items
router.get('/:id/items', async (req, res, next) => {
  try {
    const allItems = await supplierItemRepo.list()
    const items = allItems.filter((item) => item.supplierId === req.params.id)
    res.json({ data: items })
  } catch (error) {
    next(error)
  }
})

// Create supplier
router.post('/', async (req, res, next) => {
  try {
    const input = SupplierInputSchema.parse(req.body)
    const now = new Date().toISOString()
    const supplier = SupplierSchema.parse({
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
      name: input.name,
      contactName: input.contactName ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      notes: input.notes ?? '',
    })
    const created = await supplierRepo.create(supplier)
    res.status(201).json({ data: created })
  } catch (error) {
    next(error)
  }
})

// Update supplier
router.put('/:id', async (req, res, next) => {
  try {
    const input = SupplierUpdateSchema.parse(req.body)
    const now = new Date().toISOString()
    const updated = await supplierRepo.set(req.params.id, {
      ...input,
      updatedAt: now,
    })
    res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

// Delete supplier
router.delete('/:id', async (req, res, next) => {
  try {
    await supplierRepo.remove(req.params.id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

// Import CSV
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json(formatApiError(API_ERROR_CODES.BAD_REQUEST, 'No file uploaded'))
      return
    }

    const supplierId = req.body.supplierId
    if (!supplierId) {
      res.status(400).json(formatApiError(API_ERROR_CODES.BAD_REQUEST, 'supplierId is required'))
      return
    }

    // Check if supplier exists
    const supplier = await supplierRepo.getById(supplierId)
    if (!supplier) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Supplier not found'))
      return
    }

    // Parse CSV content
    const csvContent = req.file.buffer.toString('utf-8')
    const result = await importService.importBrandStreetTokyoCSV(
      supplierId,
      csvContent
    )

    res.json({
      data: result,
      message: `Import completed: ${result.success} succeeded, ${result.errors} failed`,
    })
  } catch (error) {
    next(error)
  }
})

export { router as suppliersRouter }
