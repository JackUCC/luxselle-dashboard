/**
 * Import invoice PDFs from a source directory.
 * Uploads each PDF to Firebase Storage and creates an invoice record with pdfUrl.
 *
 * Usage:
 *   npm run import-invoice-pdfs -- "/Users/jackkelleher/Desktop/Invoice done for accoutant"
 *
 * Or set INVOICE_PDF_SOURCE env var:
 *   INVOICE_PDF_SOURCE="/path/to/invoices" npm run import-invoice-pdfs
 */
process.env.FIREBASE_USE_EMULATOR = process.env.FIREBASE_USE_EMULATOR ?? 'true'

import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { DEFAULT_ORG_ID, InvoiceSchema } from '@shared/schemas'
import type { Invoice, InvoiceLineItem } from '@shared/schemas'
import { db, storage } from '../src/config/firebase'

const INVOICES_COLLECTION = 'invoices'

function extractInvoiceNumber(filename: string): string | null {
  // "Invoice - Order #158105SAV_with_VAT.pdf" -> "Order #158105SAV"
  const match = filename.match(/Order\s*#([A-Za-z0-9]+)/i)
  return match ? `Order #${match[1]}` : null
}

async function importPdfs(sourceDir: string) {
  if (!existsSync(sourceDir)) {
    console.error(`Directory not found: ${sourceDir}`)
    process.exit(1)
  }

  const files = readdirSync(sourceDir).filter((f) => f.endsWith('.pdf'))
  if (files.length === 0) {
    console.log(`No PDF files found in ${sourceDir}`)
    return
  }

  const bucket = storage.bucket()
  let successCount = 0
  const batch = db.batch()

  for (const filename of files) {
    const invoiceNumber = extractInvoiceNumber(filename)
    const displayNumber = invoiceNumber ?? filename.replace('.pdf', '')
    const filePath = join(sourceDir, filename)

    try {
      const buffer = readFileSync(filePath)
      const safeName = `${displayNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.pdf`
      const storagePath = `invoices/${safeName}`

      const file = bucket.file(storagePath)
      await file.save(buffer, {
        contentType: 'application/pdf',
        metadata: { cacheControl: 'public, max-age=31536000' },
      })
      await file.makePublic()
      const pdfUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`

      const now = new Date().toISOString()
      const lineItem: InvoiceLineItem = {
        description: `Invoice ${displayNumber}`,
        quantity: 1,
        unitPriceEur: 0,
        vatPct: 20,
        amountEur: 0,
        sku: undefined
      }

      const invoiceData: Omit<Invoice, 'id'> = {
        organisationId: DEFAULT_ORG_ID,
        createdAt: now,
        updatedAt: now,
        invoiceNumber: invoiceNumber ?? displayNumber,
        customerName: '',
        customerEmail: undefined,
        customerAddress: undefined,
        lineItems: [lineItem],
        subtotalEur: 0,
        vatEur: 0,
        totalEur: 0,
        currency: 'EUR',
        issuedAt: now,
        notes: `Imported from ${filename}`,
        pdfUrl,
        transactionId: undefined,
        productId: undefined
      }

      // Validate against schema
      const parsed = InvoiceSchema.omit({ id: true }).safeParse(invoiceData)
      if (!parsed.success) {
        throw new Error(`Validation failed: ${parsed.error.message}`)
      }

      const docRef = db.collection(INVOICES_COLLECTION).doc()
      batch.set(docRef, invoiceData)
      successCount++

      console.log(`  ✓ ${filename} -> ${invoiceNumber ?? displayNumber}`)
    } catch (err) {
      console.error(`  ✗ ${filename}:`, err instanceof Error ? err.message : err)
    }
  }

  if (successCount > 0) {
    await batch.commit()
  }
  console.log(`\nImported ${successCount} invoice(s) successfully (out of ${files.length}).`)
}

const defaultSource = join(process.cwd(), 'storage/invoices')

const sourceDir =
  process.argv[2]?.trim() ||
  process.env.INVOICE_PDF_SOURCE?.trim() ||
  defaultSource

console.log(`Importing PDFs from: ${sourceDir}\n`)
importPdfs(sourceDir).catch((err) => {
  console.error(err)
  process.exit(1)
})
