/**
 * Invoices API: create (from sale or full), list, get by id.
 * @see docs/CODE_REFERENCE.md
 */
import { Router } from 'express'
import { z } from 'zod'
import { DEFAULT_ORG_ID, InvoiceSchema, InvoiceLineItemSchema } from '@shared/schemas'
import type { Invoice, InvoiceLineItem } from '@shared/schemas'
import { InvoiceRepo } from '../repos/InvoiceRepo'
import { SettingsRepo } from '../repos/SettingsRepo'
import { vatFromGross } from '../lib/vat'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const router = Router()
const invoiceRepo = new InvoiceRepo()
const settingsRepo = new SettingsRepo()

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
