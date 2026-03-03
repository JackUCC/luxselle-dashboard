import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces'
import type { Invoice, Settings } from '@shared/schemas'

const require = createRequire(import.meta.url)
const pdfmake = require('pdfmake')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'luxselle-logo.png')

// Set up standard built-in PDFKit fonts
pdfmake.setFonts({
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
});

export class InvoicePdfService {
    async generate(invoice: Invoice, settings: Settings | null): Promise<Buffer> {
        let logoDataUrl: string | null = null
        try {
            const buffer = fs.readFileSync(LOGO_PATH)
            logoDataUrl = `data:image/png;base64,${buffer.toString('base64')}`
        } catch {
            console.warn('Invoice PDF: logo not found at', LOGO_PATH, '- generating without logo')
        }
        const docDefinition = this.buildDocDefinition(invoice, settings, logoDataUrl)

        try {
            const pdfDoc = pdfmake.createPdf(docDefinition)
            return await pdfDoc.getBuffer()
        } catch (err) {
            console.error('PDF generation error:', err)
            throw err
        }
    }

    private formatCurrency(amount: number, currency: string = 'EUR'): string {
        return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(amount)
    }

    private formatDate(dateStr: string): string {
        return new Intl.DateTimeFormat('en-IE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr))
    }

    /** Company name and address lines for header/footer; fallback to Luxselle Limited when no settings. */
    private companyBlock(settings: Settings | null): { name: string; addressLines: string[] } {
        const name = settings?.businessName?.trim() || 'Luxselle Limited'
        const raw = settings?.businessAddress?.trim()
        if (raw) {
            const addressLines = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
            if (addressLines.length > 0) return { name, addressLines }
        }
        return {
            name: 'Luxselle Limited',
            addressLines: ['Limenstone House', 'Waterfall', 'Cork', 'T12 WCR7'],
        }
    }

    private buildDocDefinition(invoice: Invoice, settings: Settings | null, logoDataUrl: string | null): TDocumentDefinitions {
        const { name: businessName, addressLines: businessAddressLines } = this.companyBlock(settings)
        const vatPct = invoice.lineItems[0]?.vatPct ?? 23

        // Customer block (Top Left)
        const customerStack: Content[] = []
        if (invoice.customerName) customerStack.push({ text: invoice.customerName, bold: true, fontSize: 11, margin: [0, 0, 0, 2] })
        if (invoice.customerAddress?.trim()) {
            const addrLines = invoice.customerAddress.trim().split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
            addrLines.forEach((line) => customerStack.push({ text: line, fontSize: 10, margin: [0, 0, 0, 1] }))
        }
        if (invoice.customerEmail) customerStack.push({ text: invoice.customerEmail, fontSize: 10, margin: [0, 2, 0, 0] })
        if (customerStack.length === 0) customerStack.push({ text: '—', fontSize: 10 })

        // Company block (Top Right): Luxselle Limited + address, right-aligned
        const companyHeaderStack: Content[] = [
            { text: businessName, bold: true, fontSize: 11, alignment: 'right', margin: [0, 0, 0, 2] },
            ...businessAddressLines.map((line) => ({ text: line, fontSize: 10, alignment: 'right' as const, margin: [0, 0, 0, 1] })),
        ]

        // Invoice block (Left): Invoice title, Order ID, Date
        const invoiceBlockStack: Content[] = [
            { text: 'Invoice', style: 'invoiceTitle' },
            { text: `Order ID: ${invoice.invoiceNumber}`, margin: [0, 4, 0, 0] },
            { text: `Date: ${this.formatDate(invoice.issuedAt)}`, margin: [0, 2, 0, 0] },
        ]

        // Order Items: Product | Qty only
        const orderItemsBody: TableCell[][] = [
            [
                { text: 'Product', style: 'tableHeader' },
                { text: 'Qty', style: 'tableHeader', alignment: 'right' },
            ],
        ]
        invoice.lineItems.forEach((item) => {
            orderItemsBody.push([
                item.description,
                { text: item.quantity.toString(), alignment: 'right' },
            ])
        })

        // VAT Breakdown section (Subtotal, VAT, Total; Grand Total is shown separately below)
        const vatBreakdownBody: TableCell[][] = [
            [
                { text: 'Subtotal (excl. VAT):', alignment: 'right', margin: [0, 2, 10, 2] },
                { text: this.formatCurrency(invoice.subtotalEur), alignment: 'right', margin: [0, 2, 0, 2] },
            ],
            [
                { text: `VAT @ ${vatPct}%:`, alignment: 'right', margin: [0, 2, 10, 2] },
                { text: this.formatCurrency(invoice.vatEur), alignment: 'right', margin: [0, 2, 0, 2] },
            ],
            [
                { text: 'Total (incl. VAT):', alignment: 'right', margin: [0, 2, 10, 2] },
                { text: this.formatCurrency(invoice.totalEur), alignment: 'right', margin: [0, 2, 0, 2] },
            ],
        ]

        // Footer: thank you text + company info at bottom
        const footerContent: Content[] = [
            { text: 'Thank you for shopping with Luxselle.', margin: [0, 20, 0, 4] },
            { text: 'This is an automatically generated invoice.', fontSize: 9, color: '#555', margin: [0, 0, 0, 16] },
            { text: businessName, style: 'companyName' },
            ...businessAddressLines.map((line) => ({ text: line, style: 'companyAddress' as const })),
        ]

        const content: Content[] = []

        // Header: left column = logo + recipient below; right column = company
        const leftHeaderStack: Content[] = []
        if (logoDataUrl) {
            leftHeaderStack.push({ image: logoDataUrl, width: 180, margin: [0, 0, 0, 12] as [number, number, number, number] })
        }
        leftHeaderStack.push({ stack: customerStack })
        content.push({
            columns: [
                { stack: leftHeaderStack, width: '*' },
                { stack: companyHeaderStack, width: 'auto' },
            ],
            margin: [0, 0, 0, 20] as [number, number, number, number],
        })

        content.push(
            // Invoice block (left-aligned)
            { stack: invoiceBlockStack, margin: [0, 0, 0, 24] as [number, number, number, number] },
            { text: 'Order Items', style: 'subheader', margin: [0, 0, 0, 4] as [number, number, number, number] },
            // Gold line under Order Items
            {
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 450, y2: 0, lineWidth: 2, lineColor: '#B8860B' }],
                margin: [0, 0, 0, 8] as [number, number, number, number],
            },
        )
        content.push(
            {
                table: { headerRows: 1, widths: ['*', 'auto'], body: orderItemsBody },
                layout: 'lightHorizontalLines',
                margin: [0, 0, 0, 16] as [number, number, number, number],
            },
            { text: 'VAT Breakdown', style: 'subheader', margin: [0, 0, 0, 6] as [number, number, number, number] },
            {
                layout: 'noBorders',
                table: { body: vatBreakdownBody },
                margin: [0, 0, 0, 8] as [number, number, number, number],
            },
            // Grand Total right-aligned (single prominent line)
            { text: `Grand Total: ${this.formatCurrency(invoice.totalEur)}`, bold: true, alignment: 'right', fontSize: 12, margin: [0, 8, 0, 24] as [number, number, number, number] },
        )
        if (invoice.notes) {
            content.push(
                { text: 'Notes', style: 'subheader', margin: [0, 0, 0, 5] as [number, number, number, number] },
                { text: invoice.notes, fontSize: 10, color: '#555' },
            )
        }
        content.push({ stack: footerContent, margin: [0, 24, 0, 0] as [number, number, number, number] })

        return {
            content,
            styles: {
                companyName: { fontSize: 11, bold: true, lineHeight: 1.3 },
                companyAddress: { fontSize: 10, lineHeight: 1.3 },
                invoiceTitle: { fontSize: 20, bold: true },
                tableHeader: { bold: true, fontSize: 10, fillColor: '#f9fafb' },
                subheader: { fontSize: 12, bold: true },
            },
            defaultStyle: { font: 'Helvetica', fontSize: 10 },
        }
    }
}
