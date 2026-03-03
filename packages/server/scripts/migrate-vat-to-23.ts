import * as dotenv from 'dotenv'
dotenv.config()

import { db } from '../src/config/firebase'
import { vatFromGross } from '../src/lib/vat'
import { InvoiceRepo } from '../src/repos/InvoiceRepo'
import { ProductRepo } from '../src/repos/ProductRepo'
import { SettingsRepo } from '../src/repos/SettingsRepo'
import type { Invoice, InvoiceLineItem } from '@shared/schemas'

const invoiceRepo = new InvoiceRepo()
const productRepo = new ProductRepo()
const settingsRepo = new SettingsRepo()

async function main() {
    console.log('Starting VAT migration to 23%...')

    // 1. Update Global Settings
    console.log('--- Updating Global Settings ---')
    const settings = await settingsRepo.getSettings()
    if (settings) {
        if (settings.vatRatePct !== 23) {
            await settingsRepo.upsertSettings({ ...settings, vatRatePct: 23 })
            console.log('Updated settings.vatRatePct to 23')
        } else {
            console.log('settings.vatRatePct is already 23')
        }
    } else {
        console.log('No settings found. Assuming initial defaults will handle it.')
    }

    // 2. Update Products
    console.log('\n--- Updating Products ---')
    const products = await productRepo.list()
    let productsUpdated = 0
    for (const product of products) {
        if (product.sellPriceEur > 0) {
            const { vatEur } = vatFromGross(product.sellPriceEur, 23)
            if (product.vatEur !== vatEur) {
                await productRepo.set(product.id, { ...product, vatEur })
                productsUpdated++
            }
        }
    }
    console.log(`Updated ${productsUpdated} products with new VAT amounts.`)

    // 3. Update Invoices
    console.log('\n--- Updating Invoices ---')
    const invoices = await invoiceRepo.list()
    let invoicesUpdated = 0

    for (const invoice of invoices) {
        let needsUpdate = false
        let newSubtotalEur = 0
        let newVatEur = 0

        const newLineItems: InvoiceLineItem[] = invoice.lineItems.map(item => {
            if (item.vatPct !== 23) {
                needsUpdate = true
                // Keep gross total same, recalculate net and vat
                const gross = item.amountEur + (item.amountEur * (item.vatPct / 100))
                const { netEur, vatEur } = vatFromGross(gross, 23)

                newSubtotalEur += netEur
                newVatEur += vatEur

                return {
                    ...item,
                    vatPct: 23,
                    unitPriceEur: item.quantity ? netEur / item.quantity : netEur,
                    amountEur: netEur,
                }
            } else {
                newSubtotalEur += item.amountEur
                newVatEur += item.amountEur * (item.vatPct / 100)
                return item
            }
        })

        if (needsUpdate || Math.abs(invoice.subtotalEur - newSubtotalEur) > 0.01 || Math.abs(invoice.vatEur - newVatEur) > 0.01) {
            const updatedInvoice: Invoice = {
                ...invoice,
                lineItems: newLineItems,
                subtotalEur: Number(newSubtotalEur.toFixed(2)),
                vatEur: Number(newVatEur.toFixed(2))
            }
            await invoiceRepo.update(invoice.id, updatedInvoice)
            invoicesUpdated++
        }
    }
    console.log(`Updated ${invoicesUpdated} invoices with 23% VAT rate.`)

    console.log('\nMigration complete!')
    process.exit(0)
}

main().catch(err => {
    console.error('Migration failed:', err)
    process.exit(1)
})
