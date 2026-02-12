/** Invoice and line item schemas for accounting. @see docs/CODE_REFERENCE.md */
import { z } from 'zod'
import { BaseDocSchema, CurrencySchema } from './base'

export const InvoiceLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().int().min(1),
  unitPriceEur: z.number(),
  vatPct: z.number().min(0).max(100),
  amountEur: z.number(), // line total (quantity * unitPriceEur or pre-calculated)
})

export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>

export const InvoiceSchema = BaseDocSchema.extend({
  invoiceNumber: z.string(),
  customerName: z.string().optional().default(''),
  customerEmail: z.string().email().optional(),
  lineItems: z.array(InvoiceLineItemSchema).min(1),
  subtotalEur: z.number(),
  vatEur: z.number(),
  totalEur: z.number(),
  currency: CurrencySchema.default('EUR'),
  issuedAt: z.string(),
  transactionId: z.string().optional(),
  productId: z.string().optional(),
  notes: z.string().optional().default(''),
})

export type Invoice = z.infer<typeof InvoiceSchema>
