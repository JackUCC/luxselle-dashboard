import PdfPrinter from 'pdfmake'
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces'
import type { Invoice, Settings } from '@shared/schemas'

const fonts = {
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
    },
}

export class InvoicePdfService {
    private printer: PdfPrinter

    constructor() {
        this.printer = new PdfPrinter(fonts)
    }

    async generate(invoice: Invoice, settings: Settings | null): Promise<Buffer> {
        const docDefinition = this.buildDocDefinition(invoice, settings)
        const pdfDoc = this.printer.createPdfKitDocument(docDefinition)

        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = []
            pdfDoc.on('data', (chunk) => chunks.push(chunk))
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)))
            pdfDoc.on('error', (err) => reject(err))
            pdfDoc.end()
        })
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

    private buildDocDefinition(invoice: Invoice, settings: Settings | null): TDocumentDefinitions {
        const { name: businessName, addressLines: businessAddressLines } = this.companyBlock(settings)
        const vatPct = invoice.lineItems[0]?.vatPct ?? 23

        // Header: company at top (left)
        const headerContent: Content[] = [
            { text: businessName, style: 'companyName' },
            ...businessAddressLines.map((line) => ({ text: line, style: 'companyAddress' as const })),
            { text: ' ', margin: [0, 0, 0, 10] },
            { text: 'Invoice', style: 'invoiceTitle' },
            { text: `Order ID: ${invoice.invoiceNumber}`, margin: [0, 4, 0, 0] },
            { text: `Date: ${this.formatDate(invoice.issuedAt)}`, margin: [0, 2, 0, 0] },
        ]

        // Customer block
        const customerStack: Content[] = [
            { text: 'Billed To:', bold: true, margin: [0, 0, 0, 5] },
            { text: invoice.customerName || '—', bold: true },
        ]
        if (invoice.customerEmail) customerStack.push({ text: invoice.customerEmail })
        if (invoice.customerAddress?.trim()) {
            const addrLines = invoice.customerAddress.trim().split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
            addrLines.forEach((line) => customerStack.push({ text: line }))
        }

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

        // VAT Breakdown section
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
            [
                { text: 'Grand Total:', bold: true, alignment: 'right', margin: [0, 5, 10, 0] },
                { text: this.formatCurrency(invoice.totalEur), bold: true, alignment: 'right', margin: [0, 5, 0, 0] },
            ],
        ]

        // Footer: thank you text + company again
        const footerContent: Content[] = [
            { text: 'Thank you for shopping with Luxselle.', margin: [0, 20, 0, 4] },
            { text: 'This is an automatically generated invoice.', fontSize: 9, color: '#555', margin: [0, 0, 0, 16] },
            { text: businessName, style: 'companyName' },
            ...businessAddressLines.map((line) => ({ text: line, style: 'companyAddress' as const })),
        ]

        return {
            content: [
                { stack: headerContent, margin: [0, 0, 0, 24] },
                {
                    columns: [
                        { width: '*', stack: customerStack },
                        { width: 'auto', text: '' },
                    ],
                    margin: [0, 0, 0, 24],
                },
                { text: 'Order Items', style: 'subheader', margin: [0, 0, 0, 6] },
                {
                    table: { headerRows: 1, widths: ['*', 'auto'], body: orderItemsBody },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 16],
                },
                { text: 'VAT Breakdown', style: 'subheader', margin: [0, 0, 0, 6] },
                {
                    layout: 'noBorders',
                    table: { body: vatBreakdownBody },
                    margin: [0, 0, 0, 24],
                },
                ...(invoice.notes ? [{ text: 'Notes', style: 'subheader' as const, margin: [0, 0, 0, 5] }, { text: invoice.notes, fontSize: 10, color: '#555' }] : []),
                { stack: footerContent, margin: [0, 24, 0, 0] },
            ],
            styles: {
                companyName: { fontSize: 11, bold: true, lineHeight: 1.3 },
                companyAddress: { fontSize: 10, lineHeight: 1.3 },
                invoiceTitle: { fontSize: 20, bold: true },
                tableHeader: { bold: true, fontSize: 10, fillColor: '#f9fafb' },
                subheader: { fontSize: 12, bold: true },
            },
            defaultStyle: { font: 'Roboto', fontSize: 10 },
        }
    }
}
