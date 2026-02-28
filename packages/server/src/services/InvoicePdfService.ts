import PdfPrinter from 'pdfmake'
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces'
import type { Invoice, Settings } from '@shared/schemas'

const fonts = {
    Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
    },
}

export class InvoicePdfService {
    async generate(invoice: Invoice, settings: Settings | null): Promise<Buffer> {
        const docDefinition = this.buildDocDefinition(invoice, settings)
        const printer = new PdfPrinter(fonts)
        const pdfDoc = printer.createPdfKitDocument(docDefinition)
        
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = []
            pdfDoc.on('data', (chunk) => chunks.push(chunk))
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)))
            pdfDoc.on('error', reject)
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

        // Customer block (Top Left)
        const customerStack: Content[] = []
        if (invoice.customerName) customerStack.push({ text: invoice.customerName, bold: true, fontSize: 11, margin: [0, 0, 0, 2] })
        if (invoice.customerAddress?.trim()) {
            const addrLines = invoice.customerAddress.trim().split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
            addrLines.forEach((line) => customerStack.push({ text: line, fontSize: 10, margin: [0, 0, 0, 1] }))
        }
        if (invoice.customerEmail) customerStack.push({ text: invoice.customerEmail, fontSize: 10, margin: [0, 2, 0, 0] })
        // If no customer info, placeholder
        if (customerStack.length === 0) customerStack.push({ text: '—', fontSize: 10 })

        // Invoice Info (Top Right)
        const invoiceInfoStack: Content[] = [
            { text: 'Invoice', style: 'invoiceTitle', alignment: 'right' },
            { text: `Order ID: ${invoice.invoiceNumber}`, alignment: 'right', margin: [0, 4, 0, 0] },
            { text: `Date: ${this.formatDate(invoice.issuedAt)}`, alignment: 'right', margin: [0, 2, 0, 0] },
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

        // Footer: thank you text + company info at bottom
        const footerContent: Content[] = [
            { text: 'Thank you for shopping with Luxselle.', margin: [0, 20, 0, 4] },
            { text: 'This is an automatically generated invoice.', fontSize: 9, color: '#555', margin: [0, 0, 0, 16] },
            { text: businessName, style: 'companyName' },
            ...businessAddressLines.map((line) => ({ text: line, style: 'companyAddress' as const })),
        ]

        return {
            content: [
                // Header Row: Customer (Left) | Invoice (Right)
                {
                    columns: [
                        { stack: customerStack, width: '*' },
                        { stack: invoiceInfoStack, width: 'auto' },
                    ],
                    margin: [0, 0, 0, 32],
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
            defaultStyle: { font: 'Helvetica', fontSize: 10 },
        }
    }
}
