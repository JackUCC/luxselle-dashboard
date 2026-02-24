/**
 * Import inventory from Luxselle Excel sheets into products.
 *
 * Reads:
 * 1) "Luxselle Inventory Managment sheet.xlsx" – BST sheet: SKU, Title, Invoice Price
 * 2) "Luxselle_Inventory_With_Formulas (2).xlsx" – BST sheet: SKU, Title, Invoice Price, Total Landed Price, Selling Price (10% / 30%)
 *
 * Merges by SKU; prefers formulas file for cost/sell when available. Creates products with status in_stock.
 *
 * Usage:
 *   npx tsx scripts/import-inventory-from-excel.ts [path1] [path2]
 *   If paths omitted, uses default paths (see DEFAULT_PATHS below).
 *
 * Ensure Firebase emulator is running (npm run emulators) or set credentials for real Firebase.
 */
process.env.FIREBASE_USE_EMULATOR = process.env.FIREBASE_USE_EMULATOR ?? 'true'

import { createRequire } from 'module'
import { existsSync } from 'fs'
import { DEFAULT_ORG_ID } from '@shared/schemas'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')
import { db } from '../src/config/firebase'
import { ProductRepo } from '../src/repos/ProductRepo'

const now = () => new Date().toISOString()

const DESKTOP_EXCEL_FOLDER =
  process.env.HOME + '/Desktop/Luxselle docs/Invoices from BST/Exel sheet for luxselle examples'

const DEFAULT_PATHS = [
  process.env.LUXSELLE_EXCEL_1 ??
    `${DESKTOP_EXCEL_FOLDER}/Luxselle Inventory Managment sheet.xlsx`,
  process.env.LUXSELLE_EXCEL_2 ??
    `${DESKTOP_EXCEL_FOLDER}/Luxselle_Inventory_With_Formulas (2).xlsx`,
]

type Row = {
  sku: string
  title: string
  costPriceEur: number
  sellPriceEur: number
  source: 'management' | 'formulas'
}

function normalizeSku(val: unknown): string {
  if (val == null || val === '') return ''
  return String(val).trim()
}

function num(val: unknown): number {
  if (typeof val === 'number' && !Number.isNaN(val)) return val
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/,/g, ''))
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

/** Extract brand (first word) and model (rest) from title. */
function parseTitle(title: string): { brand: string; model: string } {
  const t = title.trim()
  const firstSpace = t.indexOf(' ')
  if (firstSpace <= 0) return { brand: t || 'Unknown', model: t }
  return {
    brand: t.slice(0, firstSpace),
    model: t.slice(firstSpace + 1).trim() || t,
  }
}

/** Parse "Luxselle Inventory Managment sheet.xlsx" BST: row 1 = headers, data from row 2. Col 1=SKU, 2=Title, 3=Invoice Price. */
function parseManagementSheet(wb: { Sheets: Record<string, unknown> }): Row[] {
  const ws = wb.Sheets['BST']
  if (!ws) return []
  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
    raw: true,
  }) as unknown[][]
  const out: Row[] = []
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i] as unknown[]
    if (!Array.isArray(r)) continue
    const sku = normalizeSku(r[1])
    const title = typeof r[2] === 'string' ? r[2].trim() : String(r[2] ?? '').trim()
    const invoicePrice = num(r[3])
    if (!sku || !title) continue
    if (invoicePrice <= 0) continue
    out.push({
      sku,
      title,
      costPriceEur: invoicePrice,
      sellPriceEur: invoicePrice * 1.35,
      source: 'management',
    })
  }
  return out
}

/** Parse "Luxselle_Inventory_With_Formulas (2).xlsx" BST: row 1 = headers, row 2 = subheader, data from row 3. Col 2=SKU, 3=Title, 4=Invoice, 6=Total Landed, 12=Selling (30%). */
function parseFormulasSheet(wb: { Sheets: Record<string, unknown> }): Row[] {
  const ws = wb.Sheets['BST']
  if (!ws) return []
  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: '',
    raw: true,
  }) as unknown[][]
  const out: Row[] = []
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i] as unknown[]
    if (!Array.isArray(r)) continue
    const sku = normalizeSku(r[2])
    const title = typeof r[3] === 'string' ? r[3].trim() : String(r[3] || '').trim()
    if (!sku || !title) continue
    const totalLanded = num(r[6])
    const selling30 = num(r[12])
    const invoicePrice = num(r[4])
    const cost = totalLanded > 0 ? totalLanded : invoicePrice
    const sell = selling30 > 0 ? selling30 : invoicePrice * 1.35
    if (cost <= 0) continue
    out.push({
      sku,
      title,
      costPriceEur: Math.round(cost * 100) / 100,
      sellPriceEur: Math.round(sell * 100) / 100,
      source: 'formulas',
    })
  }
  return out
}

function mergeRows(management: Row[], formulas: Row[]): Row[] {
  const bySku = new Map<string, Row>()
  for (const row of management) {
    bySku.set(row.sku, row)
  }
  for (const row of formulas) {
    bySku.set(row.sku, row)
  }
  return Array.from(bySku.values())
}

async function run() {
  const path1 = process.argv[2] ?? DEFAULT_PATHS[0]
  const path2 = process.argv[3] ?? DEFAULT_PATHS[1]

  console.log('Reading', path1)
  if (!existsSync(path1)) {
    console.error(`File not found: ${path1}`)
    process.exit(1)
  }
  const wb1 = XLSX.readFile(path1)
  const management = parseManagementSheet(wb1)
  console.log('Management sheet: %d rows', management.length)

  console.log('Reading', path2)
  if (!existsSync(path2)) {
    console.error(`File not found: ${path2}`)
    process.exit(1)
  }
  const wb2 = XLSX.readFile(path2)
  const formulas = parseFormulasSheet(wb2)
  console.log('Formulas sheet: %d rows', formulas.length)

  const merged = mergeRows(management, formulas)
  console.log('Merged by SKU: %d unique items', merged.length)

  const productRepo = new ProductRepo()
  const orgId = DEFAULT_ORG_ID
  const base = {
    organisationId: orgId,
    createdAt: now(),
    updatedAt: now(),
  }

  let created = 0
  let errors = 0
  for (const row of merged) {
    try {
      const { brand, model } = parseTitle(row.title)
      await productRepo.create(
        {
          ...base,
          brand,
          model,
          sku: row.sku,
          title: row.title,
          category: '',
          condition: '',
          colour: '',
          costPriceEur: row.costPriceEur,
          sellPriceEur: row.sellPriceEur,
          currency: 'EUR',
          status: 'in_stock',
          quantity: 1,
          images: [],
          imageUrls: [],
          notes: `Imported from Excel. SKU: ${row.sku}. Source: ${row.source}.`,
        },
        orgId,
      )
      created++
      if (created % 50 === 0) console.log('Created %d products...', created)
    } catch (e) {
      errors++
      console.error('Error creating product SKU %s: %s', row.sku, (e as Error).message)
    }
  }

  console.log('Import complete. Created: %d, errors: %d', created, errors)
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
