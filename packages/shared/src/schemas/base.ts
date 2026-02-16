/**
 * Base enums and BaseDocSchema: organisationId, createdAt, updatedAt, createdBy, updatedBy.
 * Status enums for product, buying list, sourcing, supplier, transaction, evaluation.
 * @see docs/CODE_REFERENCE.md
 * References: Zod
 */
import { z } from 'zod'

export const DEFAULT_ORG_ID = 'default'

// User roles for authorization
export const UserRoleSchema = z.enum(['admin', 'operator', 'readOnly'])
export type UserRole = z.infer<typeof UserRoleSchema>

export const BaseDocSchema = z.object({
  organisationId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // Audit fields (optional for backwards compatibility)
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
})

export const CurrencySchema = z.literal('EUR')

export const ProductStatusSchema = z.enum(['in_stock', 'sold', 'reserved'])
export const BuyingListStatusSchema = z.enum([
  'pending',
  'ordered',
  'received',
  'cancelled',
])
export const SourcingStatusSchema = z.enum([
  'open',
  'sourcing',
  'sourced',
  'fulfilled',
  'lost',
])
export const SupplierAvailabilitySchema = z.enum([
  'uploaded',
  'sold',
  'waiting',
])
export const TransactionTypeSchema = z.enum([
  'purchase',
  'sale',
  'adjustment',
])
export const EvaluationProviderSchema = z.enum(['mock', 'openai'])
