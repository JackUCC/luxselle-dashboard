/**
 * Import products from a Luxselle inventory PDF (brand, title, sku, purchase price, customs, vat, selling price).
 * Writes to Firestore (emulator or production per env).
 *
 * Usage:
 *   npm run import-inventory-pdf -- /path/to/Luxselle_Inventory_PDF.pdf
 *
 * Or set INVENTORY_PDF_PATH env var.
 */
process.env.FIREBASE_USE_EMULATOR = process.env.FIREBASE_USE_EMULATOR ?? 'true'

import { readFileSync, existsSync } from 'fs'
import { DEFAULT_ORG_ID } from '@shared/schemas'
import { ProductSchema } from '@shared/schemas'
import { ProductRepo } from '../src/repos/ProductRepo'
import { parseLuxsellePdfText } from '../src/lib/parseLuxsellePdf'

async function run() {
  const path = process.argv[2]?.trim() || process.env.INVENTORY_PDF_PATH?.trim()
  if (!path) {
    console.error('Usage: npm run import-inventory-pdf -- /path/to/Luxselle_Inventory_PDF.pdf')
    process.exit(1)
  }
  if (!existsSync(path)) {
    console.error('File not found:', path)
    process.exit(1)
  }

  const pdfParse = (await import('pdf-parse')).default
  const buffer = readFileSync(path)
  const data = await pdfParse(buffer)
  const text = (data as { text?: string }).text ?? ''

  const rows = parseLuxsellePdfText(text)
  if (rows.length === 0) {
    console.error('No product rows found in PDF. Ensure it is the Luxselle inventory pricing format.')
    process.exit(1)
  }

  const productRepo = new ProductRepo()
  const now = new Date().toISOString()
  let created = 0
  let errors = 0

  for (const row of rows) {
    try {
      const product = ProductSchema.parse({
        organisationId: DEFAULT_ORG_ID,
        createdAt: now,
        updatedAt: now,
        currency: 'EUR',
        status: 'in_stock',
        brand: row.brand,
        model: row.title.slice(0, 200),
        title: row.title,
        sku: row.sku,
        category: '',
        condition: '',
        colour: '',
        costPriceEur: row.costPriceEur,
        sellPriceEur: row.sellPriceEur,
        customsEur: row.customsEur,
        vatEur: row.vatEur,
        quantity: 1,
        images: [],
        imageUrls: [],
        notes: `Imported from PDF. SKU: ${row.sku}.`,
      })
      await productRepo.create(product)
      created++
      console.log(`Created: ${row.sku} ${row.brand} ${row.title.slice(0, 40)}...`)
    } catch (err) {
      errors++
      console.error(`Error ${row.sku}:`, err instanceof Error ? err.message : err)
    }
  }

  console.log(`\nImport complete. Created: ${created}, errors: ${errors}`)
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
