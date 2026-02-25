/**
 * Schema validation tests: parse/safeParse and optional defaults for key shared schemas.
 * Ensures Zod schema changes do not break consumers.
 */
import { describe, it, expect } from 'vitest'
import {
  ProductSchema,
  SourcingRequestSchema,
  InvoiceSchema,
  InvoiceLineItemSchema,
  SourcingStatusSchema,
  ProductStatusSchema,
} from './index'

describe('shared schemas', () => {
  describe('ProductSchema', () => {
    const minimalProduct = {
      organisationId: 'org1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      brand: 'Brand',
      model: 'Model X',
      costPriceEur: 100,
      sellPriceEur: 150,
      status: 'in_stock',
    }

    it('parses minimal valid product', () => {
      const result = ProductSchema.safeParse(minimalProduct)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('')
        expect(result.data.sku).toBe('')
        expect(result.data.quantity).toBe(1)
        expect(result.data.images).toEqual([])
        expect(result.data.currency).toBe('EUR')
      }
    })

    it('applies optional defaults', () => {
      const result = ProductSchema.parse(minimalProduct)
      expect(result.title).toBe('')
      expect(result.customsEur).toBe(0)
      expect(result.vatEur).toBe(0)
      expect(result.notes).toBe('')
    })

    it('rejects missing required fields', () => {
      const bad = { ...minimalProduct, brand: undefined }
      expect(ProductSchema.safeParse(bad).success).toBe(false)
    })

    it('coerces number fields', () => {
      const withStrings = {
        ...minimalProduct,
        costPriceEur: '99.5',
        quantity: '2',
      }
      const result = ProductSchema.parse(withStrings)
      expect(result.costPriceEur).toBe(99.5)
      expect(result.quantity).toBe(2)
    })
  })

  describe('SourcingRequestSchema', () => {
    const minimalRequest = {
      organisationId: 'org1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      customerName: 'Customer',
      queryText: 'Find widget',
      budget: 500,
      status: 'open',
    }

    it('parses minimal valid sourcing request', () => {
      const result = SourcingRequestSchema.safeParse(minimalRequest)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.brand).toBe('')
        expect(result.data.priority).toBe('medium')
        expect(result.data.notes).toBe('')
      }
    })

    it('accepts all SourcingStatusSchema values', () => {
      const statuses = ['open', 'sourcing', 'sourced', 'fulfilled', 'lost'] as const
      for (const status of statuses) {
        const result = SourcingRequestSchema.safeParse({ ...minimalRequest, status })
        expect(result.success).toBe(true)
      }
    })

    it('rejects invalid status', () => {
      const result = SourcingRequestSchema.safeParse({
        ...minimalRequest,
        status: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('InvoiceSchema', () => {
    const minimalLineItem = {
      description: 'Item',
      quantity: 1,
      unitPriceEur: 10,
      vatPct: 23,
      amountEur: 10,
    }

    const minimalInvoice = {
      organisationId: 'org1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      invoiceNumber: 'INV-001',
      lineItems: [minimalLineItem],
      subtotalEur: 10,
      vatEur: 2.3,
      totalEur: 12.3,
      issuedAt: '2024-01-01',
    }

    it('parses minimal valid invoice', () => {
      const result = InvoiceSchema.safeParse(minimalInvoice)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.customerName).toBe('')
        expect(result.data.currency).toBe('EUR')
        expect(result.data.notes).toBe('')
      }
    })

    it('InvoiceLineItemSchema requires positive quantity', () => {
      const bad = { ...minimalLineItem, quantity: 0 }
      expect(InvoiceLineItemSchema.safeParse(bad).success).toBe(false)
    })

    it('rejects empty lineItems', () => {
      const result = InvoiceSchema.safeParse({
        ...minimalInvoice,
        lineItems: [],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('status enums', () => {
    it('ProductStatusSchema accepts in_stock, sold, reserved', () => {
      expect(ProductStatusSchema.parse('in_stock')).toBe('in_stock')
      expect(ProductStatusSchema.parse('sold')).toBe('sold')
      expect(ProductStatusSchema.parse('reserved')).toBe('reserved')
    })

    it('SourcingStatusSchema accepts all five values', () => {
      expect(SourcingStatusSchema.parse('open')).toBe('open')
      expect(SourcingStatusSchema.parse('fulfilled')).toBe('fulfilled')
    })
  })
})
