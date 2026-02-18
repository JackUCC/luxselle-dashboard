/**
 * Map a normalized CSV row (lowercase keys) to a product payload for ProductSchema.parse.
 * Used by POST /api/products/import. @see docs/INVENTORY_PRODUCT_AND_CSV_IMPORT.md
 *
 * Canonical CSV columns (Luxselle format): Brand, Model, Category, Condition, Colour,
 * Cost EUR, VAT EUR, Customs EUR, Landed EUR, Sell EUR, Margin EUR, Margin %, Quantity,
 * Status, SKU, Notes. Landed EUR, Margin EUR, Margin % are accepted but not stored (derived).
 * Image is handled separately (upload after import).
 */
import { DEFAULT_ORG_ID } from '@shared/schemas'

/** Canonical CSV header row for Luxselle inventory import (matches luxselle_dashboard22_import.csv). */
export const CANONICAL_CSV_HEADERS =
  'Brand,Model,Category,Condition,Colour,Cost EUR,VAT EUR,Customs EUR,Landed EUR,Sell EUR,Margin EUR,Margin %,Quantity,Status,SKU,Notes'

export type ColumnMapping = Partial<Record<string, string>>

function normalizeKey(obj: Record<string, unknown>, key: string): unknown {
  const keyLower = key.toLowerCase()
  const foundKey = Object.keys(obj).find(k => k.toLowerCase() === keyLower)
  return foundKey ? obj[foundKey] : undefined
}

function parseNum(val: unknown): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/[^0-9.-]+/g, ''))
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

function getVal(
  row: Record<string, unknown>,
  field: string,
  colMap: ColumnMapping | null
): unknown {
  if (colMap?.[field] != null && row[colMap[field]] !== undefined) return row[colMap[field]]
  return undefined
}

export interface CsvProductPayload {
  organisationId: string
  createdAt: string
  updatedAt: string
  currency: 'EUR'
  status: 'in_stock' | 'sold' | 'reserved'
  brand: string
  model: string
  category: string
  condition: string
  colour: string
  costPriceEur: number
  sellPriceEur: number
  quantity: number
  sku: string
  title: string
  notes: string
  customsEur: number
  vatEur: number
  images: []
  imageUrls: []
}

/**
 * Maps one CSV row (with normalized lowercase headers) to a product payload.
 * Returns null if both brand and model are empty (row should be skipped).
 */
export function mapCsvRowToProductPayload(
  row: Record<string, unknown>,
  rowIndex: number,
  now: string,
  colMap: ColumnMapping | null = null
): CsvProductPayload | null {
  const brand = String(
    getVal(row, 'brand', colMap) ?? normalizeKey(row, 'brand') ?? normalizeKey(row, 'brand name') ?? ''
  ).trim()
  const model = String(
    getVal(row, 'model', colMap) ??
      normalizeKey(row, 'model') ??
      normalizeKey(row, 'product name') ??
      normalizeKey(row, 'title') ??
      ''
  ).trim()
  if (!brand && !model) return null

  const category = String(getVal(row, 'category', colMap) ?? normalizeKey(row, 'category') ?? '').trim()
  const condition = String(getVal(row, 'condition', colMap) ?? normalizeKey(row, 'condition') ?? '').trim()
  const colour = String(
    getVal(row, 'colour', colMap) ?? normalizeKey(row, 'colour') ?? normalizeKey(row, 'color') ?? ''
  ).trim()

  const costPriceEur = parseNum(
    getVal(row, 'costPriceEur', colMap) ??
      normalizeKey(row, 'cost eur') ??
      normalizeKey(row, 'cost') ??
      normalizeKey(row, 'cost price') ??
      normalizeKey(row, 'invoice price') ??
      0
  )
  const sellPriceEur = parseNum(
    getVal(row, 'sellPriceEur', colMap) ??
      normalizeKey(row, 'sell eur') ??
      normalizeKey(row, 'sell') ??
      normalizeKey(row, 'sell price') ??
      normalizeKey(row, 'price') ??
      0
  )
  const quantity = Math.max(
    0,
    Math.floor(
      parseNum(
        getVal(row, 'quantity', colMap) ?? normalizeKey(row, 'quantity') ?? normalizeKey(row, 'qty') ?? 1
      )
    )
  )

  let status = String(
    getVal(row, 'status', colMap) ?? normalizeKey(row, 'status') ?? 'in_stock'
  ).toLowerCase().replace(/\s+/g, '_')
  if (!['in_stock', 'sold', 'reserved'].includes(status)) status = 'in_stock'
  if (quantity === 0) status = 'sold'

  const sku = String(
    getVal(row, 'sku', colMap) ??
      normalizeKey(row, 'sku') ??
      normalizeKey(row, 'sku code') ??
      normalizeKey(row, 'reference') ??
      ''
  ).trim()
  const productTitle = String(
    getVal(row, 'title', colMap) ??
      normalizeKey(row, 'full title') ??
      normalizeKey(row, 'product title') ??
      normalizeKey(row, 'invoice title') ??
      ''
  ).trim()
  const notesVal = String(
    getVal(row, 'notes', colMap) ?? normalizeKey(row, 'notes') ?? normalizeKey(row, 'remarks') ?? ''
  ).trim()
  const customsEur = parseNum(
    getVal(row, 'customsEur', colMap) ??
      normalizeKey(row, 'customs eur') ??
      normalizeKey(row, 'customs') ??
      0
  )
  const vatEur = parseNum(
    getVal(row, 'vatEur', colMap) ??
      normalizeKey(row, 'vat eur') ??
      normalizeKey(row, 'vat') ??
      0
  )

  const rowNum = rowIndex + 2 // 1-based and account for header
  return {
    organisationId: DEFAULT_ORG_ID,
    createdAt: now,
    updatedAt: now,
    currency: 'EUR',
    status: status as 'in_stock' | 'sold' | 'reserved',
    brand: brand || 'Unknown',
    model: model || 'Unknown',
    category,
    condition,
    colour,
    costPriceEur,
    sellPriceEur,
    quantity,
    sku,
    title: productTitle,
    notes: notesVal || `Imported via web. Row ${rowNum}`,
    customsEur,
    vatEur,
    images: [],
    imageUrls: [],
  }
}
