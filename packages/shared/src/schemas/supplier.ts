/** Supplier schema. @see docs/CODE_REFERENCE.md */
import { z } from 'zod'
import { BaseDocSchema } from './base'

export const SupplierSchema = BaseDocSchema.extend({
  name: z.string(),
  contactName: z.string().optional().default(''),
  email: z.string().email().optional().default(''),
  phone: z.string().optional().default(''),
  // WhatsApp support for bulk messaging
  whatsappNumber: z.string().optional(),
  messageTemplate: z.string().optional(),
  notes: z.string().optional().default(''),
  status: z.enum(['active', 'inactive', 'error']).default('active'),
  region: z.string().default('EU'),
  itemCount: z.number().default(0),
  heroImageUrl: z.string().optional(),
})

export type Supplier = z.infer<typeof SupplierSchema>
