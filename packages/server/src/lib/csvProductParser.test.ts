import { describe, it, expect } from 'vitest'
import {
  getMissingRequiredImportFields,
  mapCsvRowToProductPayload,
} from './csvProductParser'

const now = '2026-01-15T12:00:00.000Z'

describe('mapCsvRowToProductPayload', () => {
  it('returns null when both brand and model are empty', () => {
    const row: Record<string, unknown> = {
      'cost eur': 100,
      'sell eur': 150,
    }
    expect(mapCsvRowToProductPayload(row, 0, now)).toBeNull()
  })

  it('maps required fields and defaults brand/model to Unknown when empty', () => {
    const row: Record<string, unknown> = {
      brand: 'Chanel',
      model: 'Classic Flap',
      'cost eur': 1200,
      'sell eur': 1800,
      status: 'in_stock',
    }
    const payload = mapCsvRowToProductPayload(row, 0, now)
    expect(payload).not.toBeNull()
    expect(payload!.brand).toBe('Chanel')
    expect(payload!.model).toBe('Classic Flap')
    expect(payload!.costPriceEur).toBe(1200)
    expect(payload!.sellPriceEur).toBe(1800)
    expect(payload!.status).toBe('in_stock')
    expect(payload!.quantity).toBe(1)
    expect(payload!.organisationId).toBe('default')
    expect(payload!.createdAt).toBe(now)
    expect(payload!.updatedAt).toBe(now)
  })

  it('maps optional sku, title, notes, customsEur, vatEur from CSV', () => {
    const row: Record<string, unknown> = {
      brand: 'LV',
      model: 'Neverfull',
      'cost eur': 800,
      'sell eur': 1100,
      sku: 'LV-NF-001',
      'full title': 'Louis Vuitton Neverfull MM Monogram',
      notes: 'Minor wear on strap',
      'customs eur': 40,
      'vat eur': 110,
    }
    const payload = mapCsvRowToProductPayload(row, 0, now)
    expect(payload).not.toBeNull()
    expect(payload!.sku).toBe('LV-NF-001')
    expect(payload!.title).toBe('Louis Vuitton Neverfull MM Monogram')
    expect(payload!.notes).toBe('Minor wear on strap')
    expect(payload!.customsEur).toBe(40)
    expect(payload!.vatEur).toBe(110)
  })

  it('uses notes fallback when notes column is missing', () => {
    const row: Record<string, unknown> = {
      brand: 'Hermès',
      model: 'Birkin',
      'cost eur': 5000,
      'sell eur': 7000,
    }
    const payload = mapCsvRowToProductPayload(row, 2, now)
    expect(payload).not.toBeNull()
    expect(payload!.notes).toBe('Imported via web. Row 4')
  })

  it('maps product title from "product title" and "invoice title" aliases', () => {
    const row1: Record<string, unknown> = {
      brand: 'A',
      model: 'B',
      'cost eur': 1,
      'sell eur': 2,
      'product title': 'Full Product Title A',
    }
    expect(mapCsvRowToProductPayload(row1, 0, now)!.title).toBe('Full Product Title A')

    const row2: Record<string, unknown> = {
      brand: 'A',
      model: 'B',
      'cost eur': 1,
      'sell eur': 2,
      'invoice title': 'Invoice Title B',
    }
    expect(mapCsvRowToProductPayload(row2, 0, now)!.title).toBe('Invoice Title B')
  })

  it('defaults sku, title, notes, customsEur, vatEur when columns missing', () => {
    const row: Record<string, unknown> = {
      brand: 'X',
      model: 'Y',
      'cost eur': 10,
      'sell eur': 20,
    }
    const payload = mapCsvRowToProductPayload(row, 0, now)
    expect(payload).not.toBeNull()
    expect(payload!.sku).toBe('')
    expect(payload!.title).toBe('')
    expect(payload!.customsEur).toBe(0)
    expect(payload!.vatEur).toBe(0)
  })

  it('forces status to sold when quantity is 0', () => {
    const row: Record<string, unknown> = {
      brand: 'Z',
      model: 'W',
      'cost eur': 100,
      'sell eur': 150,
      quantity: 0,
      status: 'in_stock',
    }
    const payload = mapCsvRowToProductPayload(row, 0, now)
    expect(payload).not.toBeNull()
    expect(payload!.quantity).toBe(0)
    expect(payload!.status).toBe('sold')
  })

  it('maps cost from "invoice price" and sell from "price" aliases', () => {
    const row: Record<string, unknown> = {
      brand: 'B',
      model: 'M',
      'invoice price': 999,
      price: 1299,
    }
    const payload = mapCsvRowToProductPayload(row, 0, now)
    expect(payload).not.toBeNull()
    expect(payload!.costPriceEur).toBe(999)
    expect(payload!.sellPriceEur).toBe(1299)
  })

  it('maps Luxselle canonical CSV row (Brand, Model, Cost EUR, VAT EUR, Customs EUR, Sell EUR, Landed EUR, Margin %, etc.)', () => {
    const row: Record<string, unknown> = {
      brand: 'Bottega Veneta',
      model: 'Mini Arco Shoulder Bag (Green)',
      category: 'handbag',
      condition: 'excellent',
      colour: 'Green',
      'cost eur': 1084.0,
      'vat eur': 249.32,
      'customs eur': 32.52,
      'landed eur': 1365.84,
      'sell eur': 1600.0,
      'margin eur': 234.16,
      'margin %': '14.6%',
      quantity: 1,
      status: 'in_stock',
      sku: 'hk3230M',
      notes: '',
    }
    const payload = mapCsvRowToProductPayload(row, 0, now)
    expect(payload).not.toBeNull()
    expect(payload!.brand).toBe('Bottega Veneta')
    expect(payload!.model).toBe('Mini Arco Shoulder Bag (Green)')
    expect(payload!.category).toBe('handbag')
    expect(payload!.condition).toBe('excellent')
    expect(payload!.colour).toBe('Green')
    expect(payload!.costPriceEur).toBe(1084)
    expect(payload!.vatEur).toBe(249.32)
    expect(payload!.customsEur).toBe(32.52)
    expect(payload!.sellPriceEur).toBe(1600)
    expect(payload!.quantity).toBe(1)
    expect(payload!.status).toBe('in_stock')
    expect(payload!.sku).toBe('hk3230M')
    expect(payload!.notes).toBe('Imported via web. Row 2')
  })

  it('uses AI column mapping when provided', () => {
    const row: Record<string, unknown> = {
      'brand name': 'Gucci',
      'product name': 'Marmont',
      cost: 600,
      sell: 900,
      remarks: 'Customer return',
    }
    const colMap = {
      brand: 'brand name',
      model: 'product name',
      costPriceEur: 'cost',
      sellPriceEur: 'sell',
      notes: 'remarks',
    }
    const payload = mapCsvRowToProductPayload(row, 0, now, colMap)
    expect(payload).not.toBeNull()
    expect(payload!.brand).toBe('Gucci')
    expect(payload!.model).toBe('Marmont')
    expect(payload!.costPriceEur).toBe(600)
    expect(payload!.sellPriceEur).toBe(900)
    expect(payload!.notes).toBe('Customer return')
  })
})

describe('getMissingRequiredImportFields', () => {
  it('returns empty array when required canonical headers are present', () => {
    const missing = getMissingRequiredImportFields([
      'brand',
      'model',
      'cost eur',
      'sell eur',
      'notes',
    ])
    expect(missing).toEqual([])
  })

  it('returns missing required fields when headers are incomplete', () => {
    const missing = getMissingRequiredImportFields([
      'brand',
      'notes',
      'quantity',
    ])
    expect(missing).toEqual(['model', 'costPriceEur', 'sellPriceEur'])
  })

  it('accepts required fields through explicit column mapping', () => {
    const missing = getMissingRequiredImportFields(
      ['brand name', 'product name', 'cost', 'sell'],
      {
        brand: 'brand name',
        model: 'product name',
        costPriceEur: 'cost',
        sellPriceEur: 'sell',
      }
    )
    expect(missing).toEqual([])
  })
})
