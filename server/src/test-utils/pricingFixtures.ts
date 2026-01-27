import type { PricingAnalysisInput } from '../services/pricing/providers/IPricingProvider'
import type { Product, Transaction } from '@shared/schemas'

export const basePricingInput: PricingAnalysisInput = {
  brand: 'Chanel',
  model: 'Classic Flap',
  category: 'handbag',
  condition: 'excellent',
  colour: 'black',
  notes: '',
}

export const makeTransaction = (
  amountEur: number,
  type: Transaction['type'] = 'purchase'
): Transaction => {
  const now = new Date().toISOString()
  return {
    organisationId: 'default',
    createdAt: now,
    updatedAt: now,
    type,
    amountEur,
    occurredAt: now,
    notes: '',
  }
}

export const makeProduct = (
  id: string,
  brand: string,
  model: string
): Product & { id: string } => {
  const now = new Date().toISOString()
  return {
    id,
    organisationId: 'default',
    createdAt: now,
    updatedAt: now,
    brand,
    model,
    category: 'handbag',
    condition: 'excellent',
    colour: 'black',
    costPriceEur: 1000,
    sellPriceEur: 1500,
    currency: 'EUR',
    status: 'in_stock',
    quantity: 1,
    imageUrls: [],
    notes: '',
  }
}
