/**
 * Import inventory from a CSV file (same format as web import: Brand, Model, Category, etc.).
 * Uses the same parsing and column mapping as POST /api/products/import.
 *
 * Usage:
 *   npx tsx scripts/import-inventory-from-csv.ts <path-to.csv>
 *
 * Example:
 *   npx tsx scripts/import-inventory-from-csv.ts ~/Downloads/luxselle-inventory-2026-02-13.csv
 *
 * Ensure Firebase emulator is running (npm run emulators) or set credentials for real Firebase.
 */
process.env.FIREBASE_USE_EMULATOR = process.env.FIREBASE_USE_EMULATOR ?? 'true'

import { readFileSync } from 'fs'
import { DEFAULT_ORG_ID } from '@shared/schemas'
import { ProductRepo } from '../src/repos/ProductRepo'
import { ProductSchema } from '@shared/schemas'

function parseCsvToRows(csvStr: string): Record<string, unknown>[] {
  const lines: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < csvStr.length; i++) {
    const c = csvStr[i]
    if (c === '"') inQuotes = !inQuotes
    else if ((c === '\n' && !inQuotes) || (c === '\r' && !inQuotes)) {
      if (current.trim() || lines.length > 0) lines.push(current)
      current = ''
      if (c === '\r' && csvStr[i + 1] === '\n') i++
    } else current += c
  }
  if (current.trim() || lines.length > 0) lines.push(current)

  const parseLine = (line: string): string[] => {
    const out: string[] = []
    let field = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') inQuotes = !inQuotes
      else if (c === ',' && !inQuotes) {
        out.push(field.trim())
        field = ''
      } else field += c
    }
    out.push(field.trim())
    return out
  }

  if (lines.length < 2) return []
  const headers = parseLine(lines[0])
  const rows: Record<string, unknown>[] = []
  for (let r = 1; r < lines.length; r++) {
    const values = parseLine(lines[r])
    const obj: Record<string, unknown> = {}
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? ''
    })
    rows.push(obj)
  }
  return rows
}

const normalizeHeaderKey = (k: string) => k.replace(/\uFEFF/g, '').trim().toLowerCase()

async function run() {
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('Usage: npx tsx scripts/import-inventory-from-csv.ts <path-to.csv>')
    process.exit(1)
  }

  const str = readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '')
  let rows = parseCsvToRows(str)
  if (rows.length === 0) {
    console.error('No data rows in CSV (need header + at least one row).')
    process.exit(1)
  }

  rows = rows.map(row => {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(row)) {
      const n = normalizeHeaderKey(key)
      if (n) out[n] = row[key]
    }
    return out
  })

  const normalizeKey = (obj: Record<string, unknown>, key: string) => {
    const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase())
    return foundKey ? obj[foundKey] : undefined
  }
  const parseNum = (val: unknown): number => {
    if (typeof val === 'number') return val
    if (typeof val === 'string') {
      const n = parseFloat(val.replace(/[^0-9.-]+/g, ''))
      return Number.isNaN(n) ? 0 : n
    }
    return 0
  }

  const productRepo = new ProductRepo()
  const now = new Date().toISOString()
  let created = 0
  let errors = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const brand = String(normalizeKey(row, 'brand') ?? normalizeKey(row, 'brand name') ?? '').trim()
      const model = String(
        normalizeKey(row, 'model') ?? normalizeKey(row, 'product name') ?? normalizeKey(row, 'title') ?? ''
      ).trim()
      if (!brand && !model) continue

      const category = String(normalizeKey(row, 'category') ?? '').trim()
      const condition = String(normalizeKey(row, 'condition') ?? '').trim()
      const colour = String(normalizeKey(row, 'colour') ?? normalizeKey(row, 'color') ?? '').trim()
      const costPriceEur = parseNum(
        normalizeKey(row, 'cost eur') ?? normalizeKey(row, 'cost') ?? normalizeKey(row, 'cost price') ?? 0
      )
      const sellPriceEur = parseNum(
        normalizeKey(row, 'sell eur') ?? normalizeKey(row, 'sell') ?? normalizeKey(row, 'sell price') ?? 0
      )
      const quantity = Math.max(
        0,
        Math.floor(parseNum(normalizeKey(row, 'quantity') ?? normalizeKey(row, 'qty') ?? 1))
      )
      let status = String(normalizeKey(row, 'status') ?? 'in_stock').toLowerCase().replace(/\s+/g, '_')
      if (!['in_stock', 'sold', 'reserved'].includes(status)) status = 'in_stock'
      if (quantity === 0) status = 'sold'

      const product = ProductSchema.parse({
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
        images: [],
        imageUrls: [],
        notes: `Imported from CSV. Row ${i + 2}.`,
      })

      await productRepo.create(product)
      created++
      console.log(`Created: ${product.brand} ${product.model}`)
    } catch (err) {
      errors++
      console.error(`Row ${i + 2}:`, err instanceof Error ? err.message : err)
    }
  }

  console.log(`Done. Created: ${created}, errors: ${errors}`)
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
