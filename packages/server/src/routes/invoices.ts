/**
 * Invoices API: create (from sale or full), list, get by id, upload PDF.
 * @see docs/CODE_REFERENCE.md
 */
import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { DEFAULT_ORG_ID, InvoiceLineItemSchema } from '@shared/schemas'
import type { Invoice, InvoiceLineItem } from '@shared/schemas'
import { InvoiceRepo } from '../repos/InvoiceRepo'
import { SettingsRepo } from '../repos/SettingsRepo'
import { InvoicePdfService } from '../services/InvoicePdfService'
import { vatFromGross } from '../lib/vat'
import { storage } from '../config/firebase'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const router = Router()
const invoiceRepo = new InvoiceRepo()
const settingsRepo = new SettingsRepo()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDF files are allowed'))
  },
})

const CreateInvoiceFromSaleSchema = z.object({
  fromSale: z.literal(true),
  transactionId: z.string().optional(),
  productId: z.string().optional(),
  amountEur: z.number().min(0),
  vatPct: z.number().min(0).max(100).optional(),
  customerName: z.string().optional().default(''),
  customerEmail: z.string().email().optional(),
  description: z.string().optional().default('Sale'),
  notes: z.string().optional(),
})

const CreateInvoiceFromInPersonSchema = z.object({
  fromInPerson: z.literal(true),
  issuedAt: z.string().optional(),
  amountPaidEur: z.number().min(0),
  description: z.string().min(1),
  sku: z.string().optional(),
  customerName: z.string().optional().default(''),
  customerEmail: z.string().email().optional(),
  customerAddress: z.string().optional(),
})

const CreateInvoiceFullSchema = z.object({
  fromSale: z.boolean().optional().default(false),
  invoiceNumber: z.string().optional(),
  customerName: z.string().optional().default(''),
  customerEmail: z.string().email().optional(),
  lineItems: z.array(InvoiceLineItemSchema).min(1),
  notes: z.string().optional(),
})

function buildInvoiceFromSale(
  body: z.infer<typeof CreateInvoiceFromSaleSchema>,
  invoiceNumber: string,
  ratePct: number
): Omit<Invoice, 'id'> {
  const { amountEur, customerName, customerEmail, description, notes } = body
  const { netEur, vatEur } = vatFromGross(amountEur, ratePct)
  const now = new Date().toISOString()
  const lineItem: InvoiceLineItem = {
    description: description ?? 'Sale',
    quantity: 1,
    unitPriceEur: netEur,
    vatPct: ratePct,
    amountEur: netEur,
  }
  return {
    organisationId: DEFAULT_ORG_ID,
    createdAt: now,
    updatedAt: now,
    invoiceNumber,
    customerName: customerName ?? '',
    customerEmail: body.customerEmail,
    lineItems: [lineItem],
    subtotalEur: netEur,
    vatEur,
    totalEur: amountEur,
    currency: 'EUR',
    issuedAt: now,
    transactionId: body.transactionId,
    productId: body.productId,
    notes: notes ?? '',
  }
}

function buildInvoiceFromInPerson(
  body: z.infer<typeof CreateInvoiceFromInPersonSchema>,
  invoiceNumber: string,
  ratePct: number
): Omit<Invoice, 'id'> {
  const { amountPaidEur, description, sku, customerName, customerEmail, customerAddress } = body
  const { netEur, vatEur } = vatFromGross(amountPaidEur, ratePct)
  const now = new Date().toISOString()
  const issuedAt = body.issuedAt ?? now
  const lineDescription = sku ? `${description} - ${sku}` : description
  const lineItem: InvoiceLineItem = {
    description: lineDescription,
    quantity: 1,
    unitPriceEur: netEur,
    vatPct: ratePct,
    amountEur: netEur,
    sku: sku || undefined,
  }
  return {
    organisationId: DEFAULT_ORG_ID,
    createdAt: now,
    updatedAt: now,
    invoiceNumber,
    customerName: customerName ?? '',
    customerEmail: body.customerEmail,
    customerAddress: customerAddress ?? undefined,
    lineItems: [lineItem],
    subtotalEur: netEur,
    vatEur,
    totalEur: amountPaidEur,
    currency: 'EUR',
    issuedAt,
    notes: '',
  }
}

// POST /api/invoices — create (from sale or full body)
router.post('/', async (req, res, next) => {
  try {
    const raw = req.body as unknown
    if (raw && typeof raw === 'object' && (raw as { fromSale?: boolean }).fromSale === true) {
      const parsed = CreateInvoiceFromSaleSchema.safeParse(raw)
      if (!parsed.success) {
        res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'Invalid from-sale body', parsed.error.flatten()))
        return
      }
      const ratePct = parsed.data.vatPct ?? (await settingsRepo.getSettings())?.vatRatePct ?? 20
      const invoiceNumber = await invoiceRepo.getNextInvoiceNumber()
      const invoiceData = buildInvoiceFromSale(parsed.data, invoiceNumber, ratePct)
      const created = await invoiceRepo.create(invoiceData as Invoice)
      res.status(201).json(created)
      return
    }

    if (raw && typeof raw === 'object' && (raw as { fromInPerson?: boolean }).fromInPerson === true) {
      const parsed = CreateInvoiceFromInPersonSchema.safeParse(raw)
      if (!parsed.success) {
        res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'Invalid from-in-person body', parsed.error.flatten()))
        return
      }
      const ratePct = (await settingsRepo.getSettings())?.vatRatePct ?? 23
      const invoiceNumber = await invoiceRepo.getNextInvoiceNumber()
      const invoiceData = buildInvoiceFromInPerson(parsed.data, invoiceNumber, ratePct)
      const created = await invoiceRepo.create(invoiceData as Invoice)
      res.status(201).json(created)
      return
    }

    const parsed = CreateInvoiceFullSchema.safeParse(raw)
    if (!parsed.success) {
      res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'Invalid invoice body', parsed.error.flatten()))
      return
    }
    const { lineItems, customerName, customerEmail, notes } = parsed.data
    const subtotalEur = lineItems.reduce((sum, li) => sum + li.amountEur, 0)
    const vatEur = lineItems.reduce((sum, li) => sum + (li.amountEur * (li.vatPct / 100)), 0)
    const totalEur = subtotalEur + vatEur
    const now = new Date().toISOString()
    const invoiceNumber = parsed.data.invoiceNumber ?? await invoiceRepo.getNextInvoiceNumber()
    const invoiceData: Invoice = {
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
      invoiceNumber,
      customerName: customerName ?? '',
      customerEmail: parsed.data.customerEmail,
      lineItems,
      subtotalEur,
      vatEur,
      totalEur,
      currency: 'EUR',
      issuedAt: now,
      notes: notes ?? '',
    }
    const created = await invoiceRepo.create(invoiceData)
    res.status(201).json(created)
  } catch (err) {
    next(err)
  }
})

// POST /api/invoices/upload — upload PDF, create invoice record with pdfUrl
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'No PDF file provided'))
      return
    }
    const invoiceNumber = (req.body?.invoiceNumber ?? '').trim()
    const customerName = (req.body?.customerName ?? '').trim()
    const customerEmail = req.body?.customerEmail?.trim()
    if (!invoiceNumber) {
      res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'invoiceNumber is required'))
      return
    }

    const bucket = storage.bucket()
    const safeName = `${invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`
    const path = `invoices/${safeName}`
    const file = bucket.file(path)
    await file.save(req.file.buffer, {
      contentType: 'application/pdf',
      metadata: { cacheControl: 'public, max-age=31536000' },
    })
    await file.makePublic()
    const pdfUrl = `https://storage.googleapis.com/${bucket.name}/${path}`

    const ratePct = (await settingsRepo.getSettings())?.vatRatePct ?? 20
    const amountEur = parseFloat(req.body?.amountEur)
    if (isNaN(amountEur) || amountEur < 0) {
      res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'amountEur must be a non-negative number'))
      return
    }
    const description = (req.body?.description ?? `Invoice ${invoiceNumber}`).trim()
    const now = new Date().toISOString()

    const lineItem: InvoiceLineItem = amountEur > 0
      ? {
        description,
        quantity: 1,
        unitPriceEur: amountEur,
        vatPct: ratePct,
        amountEur,
      }
      : {
        description: description || `Invoice ${invoiceNumber}`,
        quantity: 1,
        unitPriceEur: 0,
        vatPct: ratePct,
        amountEur: 0,
      }

    const subtotalEur = lineItem.amountEur
    const vatEur = lineItem.amountEur * (lineItem.vatPct / 100)
    const totalEur = subtotalEur + vatEur

    const invoiceData: Invoice = {
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
      invoiceNumber,
      customerName,
      customerEmail: customerEmail || undefined,
      lineItems: [lineItem],
      subtotalEur,
      vatEur,
      totalEur,
      currency: 'EUR',
      issuedAt: now,
      notes: (req.body?.notes ?? '').trim() || '',
      pdfUrl,
    }
    const created = await invoiceRepo.create(invoiceData)
    res.status(201).json(created)
  } catch (err) {
    next(err)
  }
})

// GET /api/invoices — list with optional limit, cursor, date range
router.get('/', async (req, res, next) => {
  try {
    const { limit, cursor, from, to } = req.query
    let list = await invoiceRepo.list()
    if (from && typeof from === 'string') {
      list = list.filter((inv) => inv.issuedAt >= from)
    }
    if (to && typeof to === 'string') {
      list = list.filter((inv) => inv.issuedAt <= to)
    }
    list.sort((a, b) => (b.issuedAt.localeCompare(a.issuedAt)))
    const limitNum = limit ? Math.min(parseInt(String(limit), 10) || 50, 100) : 50
    let start = 0
    if (cursor && typeof cursor === 'string') {
      const idx = list.findIndex((inv) => inv.id === cursor)
      if (idx !== -1) start = idx + 1
    }
    const page = list.slice(start, start + limitNum)
    const nextCursor = page.length === limitNum && start + limitNum < list.length ? page[page.length - 1]?.id : null
    res.json({ data: page, nextCursor })
  } catch (err) {
    next(err)
  }
})

// POST /api/invoices/:id/generate-pdf — generate PDF, upload, update invoice
router.post('/:id/generate-pdf', async (req, res, next) => {
  try {
    const invoice = await invoiceRepo.getById(req.params.id)
    if (!invoice) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Invoice not found'))
      return
    }

    const settings = await settingsRepo.getSettings()

    // Generate PDF
    const pdfService = new InvoicePdfService()
    let pdfBuffer: Buffer
    try {
      pdfBuffer = await pdfService.generate(invoice, settings)
    } catch (err) {
      throw new Error(`Failed to generate PDF: ${err instanceof Error ? err.message : String(err)}`)
    }

    // Upload to Firebase Storage
    const bucket = storage.bucket()
    const safeName = `${invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`
    const path = `invoices/generated/${safeName}`
    const file = bucket.file(path)

    await file.save(pdfBuffer, {
      contentType: 'application/pdf',
      metadata: { cacheControl: 'public, max-age=31536000' },
    })

    await file.makePublic()
    const pdfUrl = `https://storage.googleapis.com/${bucket.name}/${path}`

    // Update invoice with new PDF URL
    const updated = await invoiceRepo.update(invoice.id, {
      pdfUrl,
      updatedAt: new Date().toISOString()
    })

    if (!updated) {
      throw new Error('Failed to update invoice with PDF URL')
    }

    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// GET /api/invoices/:id
router.get('/:id', async (req, res, next) => {
  try {
    const invoice = await invoiceRepo.getById(req.params.id)
    if (!invoice) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Invoice not found'))
      return
    }
    res.json(invoice)
  } catch (err) {
    next(err)
  }
})

export const invoicesRouter = router
