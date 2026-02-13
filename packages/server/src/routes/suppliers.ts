/**
 * Suppliers API: CRUD suppliers; CSV import with idempotency and SupplierImportService.
 * @see docs/CODE_REFERENCE.md
 * References: Express, multer, SupplierImportService, idempotency
 */
import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import {
  DEFAULT_ORG_ID,
  SupplierImportTemplateSchema,
  SupplierSchema,
} from '@shared/schemas'
import { SupplierRepo } from '../repos/SupplierRepo'
import { SupplierItemRepo } from '../repos/SupplierItemRepo'
import { SupplierImportService } from '../services/import/SupplierImportService'
import { SupplierEmailSyncService } from '../services/import/SupplierEmailSyncService'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const router = Router()
const supplierRepo = new SupplierRepo()
const supplierItemRepo = new SupplierItemRepo()
const importService = new SupplierImportService()
const emailSyncService = new SupplierEmailSyncService()

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
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  sourceEmails: z.array(z.string().email()).optional(),
  importTemplate: SupplierImportTemplateSchema.optional(),
})

const SupplierUpdateSchema = SupplierInputSchema.partial()
const SupplierImportTemplateUpdateSchema = z.object({
  sourceEmails: z.array(z.string().email()).default([]),
  importTemplate: SupplierImportTemplateSchema,
})
const SupplierEmailSyncSchema = z.object({
  lookbackDays: z.coerce.number().int().positive().max(365).optional(),
})

// List with filters: q (search), status; cursor pagination; sort/dir
router.get('/', async (req, res, next) => {
  try {
    const { q, status, limit, cursor, sort, dir } = req.query
    let suppliers = await supplierRepo.list()
    
    // Text search
    if (q && typeof q === 'string') {
      const query = q.toLowerCase()
      suppliers = suppliers.filter(s => 
        s.name.toLowerCase().includes(query) ||
        (s.contactName && s.contactName.toLowerCase().includes(query))
      )
    }
    
    // Status filter
    if (status && typeof status === 'string') {
      suppliers = suppliers.filter(s => s.status === status)
    }
    
    // Sort
    const sortField = (sort as string) || 'name'
    const sortDir = dir === 'asc' ? 1 : -1
    suppliers.sort((a, b) => {
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
    const limitNum = limit ? parseInt(String(limit)) : 50
    let startIndex = 0
    
    if (cursor && typeof cursor === 'string') {
      const cursorIndex = suppliers.findIndex(s => s.id === cursor)
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1
      }
    }
    
    const paginated = suppliers.slice(startIndex, startIndex + limitNum)
    const nextCursor = paginated.length === limitNum && startIndex + limitNum < suppliers.length
      ? paginated[paginated.length - 1]?.id
      : null
    
    res.json({
      data: paginated,
      nextCursor,
      total: suppliers.length,
    })
  } catch (error) {
    next(error)
  }
})

// List all supplier items (unified feed) — must be before /:id to avoid "items" as id
// Supports: q, supplier, brand, availability, limit, cursor, sort, dir
router.get('/items/all', async (req, res, next) => {
  try {
    const { q, supplier, brand, availability, limit, cursor, sort, dir } = req.query
    let items = await supplierItemRepo.list()
    
    // Text search
    if (q && typeof q === 'string') {
      const query = q.toLowerCase()
      items = items.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.brand.toLowerCase().includes(query)
      )
    }
    
    // Filters
    if (supplier && typeof supplier === 'string') {
      items = items.filter(item => item.supplierId === supplier)
    }
    if (brand && typeof brand === 'string') {
      items = items.filter(item => item.brand.toLowerCase().includes(brand.toLowerCase()))
    }
    if (availability && typeof availability === 'string') {
      items = items.filter(item => item.availability === availability)
    }
    
    // Sort
    const sortField = (sort as string) || 'createdAt'
    const sortDir = dir === 'asc' ? 1 : -1
    items.sort((a, b) => {
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
    const limitNum = limit ? parseInt(String(limit)) : 50
    let startIndex = 0
    
    if (cursor && typeof cursor === 'string') {
      const cursorIndex = items.findIndex(item => item.id === cursor)
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1
      }
    }
    
    const paginated = items.slice(startIndex, startIndex + limitNum)
    const nextCursor = paginated.length === limitNum && startIndex + limitNum < items.length
      ? paginated[paginated.length - 1]?.id
      : null
    
    res.json({
      data: paginated,
      nextCursor,
      total: items.length,
    })
  } catch (error) {
    next(error)
  }
})

router.get('/email/status', async (_req, res, next) => {
  try {
    const status = await emailSyncService.getStatus()
    res.json({ data: status })
  } catch (error) {
    next(error)
  }
})

router.post('/email/sync', async (req, res, next) => {
  try {
    const input = SupplierEmailSyncSchema.parse(req.body ?? {})
    const result = await emailSyncService.sync(input)
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
})

// Parse CSV/XLSX and return headers + sample rows to configure import templates.
router.post('/import/preview', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json(formatApiError(API_ERROR_CODES.BAD_REQUEST, 'No file uploaded'))
      return
    }

    const preview = importService.previewImportFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
    )
    res.json({ data: preview })
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

// Save/update per-supplier import template and source emails for email matching.
router.put('/:id/import-template', async (req, res, next) => {
  try {
    const input = SupplierImportTemplateUpdateSchema.parse(req.body)
    const existing = await supplierRepo.getById(req.params.id)
    if (!existing) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Supplier not found'))
      return
    }

    const updated = await supplierRepo.set(req.params.id, {
      sourceEmails: input.sourceEmails,
      importTemplate: input.importTemplate,
      updatedAt: new Date().toISOString(),
    })
    res.json({ data: updated })
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
      sourceEmails: input.sourceEmails ?? [],
      importTemplate: input.importTemplate,
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

    let result
    if (supplier.importTemplate) {
      const parsed = importService.parseImportFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      )
      result = await importService.importWithTemplate(
        supplierId,
        parsed.rows,
        supplier.importTemplate,
      )
    } else {
      const csvContent = req.file.buffer.toString('utf-8')
      result = await importService.importBrandStreetTokyoCSV(
        supplierId,
        csvContent,
      )
    }

    res.json({
      data: result,
      message: `Import completed: ${result.success} succeeded, ${result.errors} failed`,
    })
  } catch (error) {
    next(error)
  }
})

export { router as suppliersRouter }
