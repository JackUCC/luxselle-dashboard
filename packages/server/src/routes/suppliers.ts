/**
 * Suppliers API: list suppliers, import file preview, import template save, email sync status and trigger.
 * @see docs/CODE_REFERENCE.md
 * References: Express, SupplierRepo, SupplierImportService, SupplierEmailSyncService, multer, @shared/schemas
 */
import { Router } from 'express'
import multer from 'multer'
import { SupplierRepo } from '../repos/SupplierRepo'
import { SupplierImportService } from '../services/import/SupplierImportService'
import { SupplierEmailSyncService } from '../services/import/SupplierEmailSyncService'
import { SupplierImportTemplateSchema } from '@shared/schemas'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const router = Router()
const supplierRepo = new SupplierRepo()
const supplierImportService = new SupplierImportService()
const supplierEmailSyncService = new SupplierEmailSyncService()

// Multer config for import file uploads (CSV/XLSX, 10MB max)
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

// GET /api/suppliers — list all suppliers from Firestore
router.get('/', async (_req, res, next) => {
  try {
    const suppliers = await supplierRepo.list()
    res.json({ data: suppliers })
  } catch (error) {
    next(error)
  }
})

// POST /api/suppliers/import/preview — parse an uploaded import file and return headers + sample rows
router.post('/import/preview', importUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'No file provided'))
      return
    }
    const preview = supplierImportService.previewImportFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
    )
    res.json({ data: preview })
  } catch (error) {
    next(error)
  }
})

// PUT /api/suppliers/:id/import-template — save a column-mapping template on a supplier document
router.put('/:id/import-template', async (req, res, next) => {
  try {
    const { id } = req.params
    const supplier = await supplierRepo.getById(id)
    if (!supplier) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Supplier not found'))
      return
    }

    const template = SupplierImportTemplateSchema.parse(req.body)
    const now = new Date().toISOString()
    const updated = await supplierRepo.set(id, { importTemplate: template, updatedAt: now })
    res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

// GET /api/suppliers/email/status — return current sync status from SupplierEmailSyncService
router.get('/email/status', async (_req, res, next) => {
  try {
    const status = await supplierEmailSyncService.getStatus()
    res.json({ data: status })
  } catch (error) {
    next(error)
  }
})

// POST /api/suppliers/email/sync — trigger an email sync via SupplierEmailSyncService
router.post('/email/sync', async (req, res, next) => {
  try {
    const lookbackDays = req.body?.lookbackDays ? Number(req.body.lookbackDays) : undefined
    const result = await supplierEmailSyncService.sync({ lookbackDays })
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
})

export { router as suppliersRouter }
