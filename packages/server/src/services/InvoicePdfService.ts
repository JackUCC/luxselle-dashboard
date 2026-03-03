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
const GOLD_ACCENT = '#c9a05b'

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

        // Bill To (recipient)
        const billToStack: Content[] = [{ text: 'BILL TO:', style: 'addressHeading' }]
        if (invoice.customerName) billToStack.push({ text: invoice.customerName, bold: true, fontSize: 11, margin: [0, 4, 0, 0] })
        if (invoice.customerAddress?.trim()) {
            const addrLines = invoice.customerAddress.trim().split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
            addrLines.forEach((line) => billToStack.push({ text: line, fontSize: 11, margin: [0, 1, 0, 0], color: '#555' }))
        }
        if (invoice.customerEmail) billToStack.push({ text: invoice.customerEmail, fontSize: 11, margin: [0, 4, 0, 0], color: '#555' })
        if (billToStack.length === 1) billToStack.push({ text: '—', fontSize: 11, color: '#555' })

        // From (company)
        const fromStack: Content[] = [
            { text: 'FROM:', style: 'addressHeading' },
            { text: businessName, bold: true, fontSize: 11, margin: [0, 4, 0, 0] },
            ...businessAddressLines.map((line) => ({ text: line, fontSize: 11, margin: [0, 1, 0, 0] as [number, number, number, number], color: '#555' })),
        ]

        // Header: logo left | INVOICE title + Order ID + Date right
        const headerLeft: Content[] = []
        if (logoDataUrl) {
            headerLeft.push({ image: logoDataUrl, width: 120, margin: [0, 0, 0, 0] as [number, number, number, number] })
        }
        const headerRight: Content[] = [
            { text: 'INVOICE', style: 'invoiceTitle', alignment: 'right' as const },
            { text: `Invoice ID: ${invoice.invoiceNumber}`, fontSize: 11, color: '#666', alignment: 'right' as const, margin: [0, 5, 0, 0] as [number, number, number, number] },
            { text: `Date: ${this.formatDate(invoice.issuedAt)}`, fontSize: 11, color: '#666', alignment: 'right' as const, margin: [0, 2, 0, 0] as [number, number, number, number] },
        ]

        // Order Items: Product | Qty (polished table with light header)
        const orderItemsBody: TableCell[][] = [
            [
                { text: 'Product', style: 'tableHeader' },
                { text: 'Qty', style: 'tableHeader', alignment: 'right' as const },
            ],
        ]
        invoice.lineItems.forEach((item) => {
            orderItemsBody.push([
                { text: item.description, fontSize: 11 },
                { text: item.quantity.toString(), alignment: 'right' as const, fontSize: 11 },
            ])
        })

        // Totals: right-aligned table, grand total in gold
        const totalsBody: TableCell[][] = [
            [
                { text: 'Subtotal (excl. VAT):', fontSize: 11 },
                { text: this.formatCurrency(invoice.subtotalEur), alignment: 'right' as const, fontSize: 11 },
            ],
            [
                { text: `VAT @ ${vatPct}%:`, fontSize: 11 },
                { text: this.formatCurrency(invoice.vatEur), alignment: 'right' as const, fontSize: 11 },
            ],
            [
                { text: 'Total (incl. VAT):', fontSize: 11 },
                { text: this.formatCurrency(invoice.totalEur), alignment: 'right' as const, fontSize: 11 },
            ],
            [
                { text: 'Grand Total:', style: 'grandTotalLabel' },
                { text: this.formatCurrency(invoice.totalEur), alignment: 'right' as const, style: 'grandTotalValue' },
            ],
        ]

        const content: Content[] = []

        // Header row with bottom border
        content.push({
            columns: [
                { stack: headerLeft, width: '*' },
                { stack: headerRight, width: 'auto' },
            ],
            margin: [0, 0, 0, 20] as [number, number, number, number],
        })
        content.push({
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#eee' }],
            margin: [0, 0, 0, 20] as [number, number, number, number],
        })

        // Addresses: From | Bill To
        content.push({
            columns: [
                { stack: fromStack, width: '*' },
                { stack: billToStack, width: '*' },
            ],
            margin: [0, 0, 0, 40] as [number, number, number, number],
        })

        // Items table
        content.push({
            table: { headerRows: 1, widths: ['*', 'auto'], body: orderItemsBody },
            layout: 'lightHorizontalLines',
            margin: [0, 0, 0, 30] as [number, number, number, number],
        })

        // Totals section right-aligned
        content.push({
            columns: [
                { text: '', width: '*' },
                {
                    table: { headerRows: 0, widths: [200, 120], body: totalsBody },
                    layout: 'noBorders',
                    width: 320,
                },
            ],
            margin: [0, 0, 0, 30] as [number, number, number, number],
        })

        if (invoice.notes) {
            content.push(
                { text: 'Notes', style: 'addressHeading', margin: [0, 24, 0, 8] as [number, number, number, number] },
                { text: invoice.notes, fontSize: 11, color: '#555', margin: [0, 0, 0, 24] as [number, number, number, number] },
            )
        }

        // Footer
        content.push({
            stack: [
                {
                    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#eee' }],
                    margin: [0, 20, 0, 20] as [number, number, number, number],
                },
                { text: 'Thank you for shopping with Luxselle.', alignment: 'center' as const, fontSize: 12, color: '#888' },
                { text: 'This is an automatically generated invoice.', alignment: 'center' as const, fontSize: 11, color: '#888', margin: [0, 4, 0, 0] as [number, number, number, number] },
            ],
            margin: [0, 24, 0, 0] as [number, number, number, number],
        })

        return {
            pageSize: 'A4',
            pageMargins: [50, 50, 50, 50],
            background: function () {
                return {
                    canvas: [
                        { type: 'line', x1: 50, y1: 0, x2: 545, y2: 0, lineWidth: 5, lineColor: GOLD_ACCENT },
                    ],
                    margin: [0, 0, 0, 0] as [number, number, number, number],
                }
            },
            content,
            styles: {
                addressHeading: { fontSize: 12, bold: true, color: '#333' },
                invoiceTitle: { fontSize: 28, bold: true, color: GOLD_ACCENT, letterSpacing: 1 },
                tableHeader: { bold: true, fontSize: 11, fillColor: '#fcfcfc', color: '#333' },
                grandTotalLabel: { fontSize: 12, bold: true },
                grandTotalValue: { fontSize: 12, bold: true, color: GOLD_ACCENT },
            },
            defaultStyle: { font: 'Helvetica', fontSize: 10, color: '#333' },
        }
    }
}
