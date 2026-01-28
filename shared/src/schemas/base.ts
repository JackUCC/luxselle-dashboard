import { z } from 'zod'

export const DEFAULT_ORG_ID = 'default'

export const BaseDocSchema = z.object({
  organisationId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
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
export const EvaluationProviderSchema = z.enum(['mock', 'openai', 'gemini'])
