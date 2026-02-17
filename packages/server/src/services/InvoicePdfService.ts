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
        return new Intl.DateTimeFormat('en-IE', { dateStyle: 'medium' }).format(new Date(dateStr))
    }

    private buildDocDefinition(invoice: Invoice, settings: Settings | null): TDocumentDefinitions {
        const businessName = settings?.businessName || 'Luxselle'
        const businessAddress = settings?.businessAddress || ''
        const businessVat = settings?.businessVatNumber
        const businessLogo = settings?.businessLogoUrl

        // Build header content
        const headerStack: Content[] = [
            { text: businessName, style: 'headerRight', bold: true },
        ]
        if (businessAddress) headerStack.push({ text: businessAddress, style: 'headerRight' })
        if (businessVat) headerStack.push({ text: `VAT No: ${businessVat}`, style: 'headerRight' })
        if (settings?.businessEmail) headerStack.push({ text: settings.businessEmail, style: 'headerRight' })
        if (settings?.businessWebsite) headerStack.push({ text: settings.businessWebsite, style: 'headerRight' })

        const headerColumn: Content[] = [
            {
                text: 'INVOICE',
                style: 'headerLeft',
                alignment: 'left',
                fontSize: 20,
                bold: true,
                margin: [0, 10, 0, 0]
            },
            {
                stack: headerStack,
                alignment: 'right',
            }
        ]

        // Line items table body
        const tableBody: TableCell[][] = [
            [
                { text: 'Description', style: 'tableHeader' },
                { text: 'Qty', style: 'tableHeader', alignment: 'right' },
                { text: 'Unit Price', style: 'tableHeader', alignment: 'right' },
                { text: 'VAT %', style: 'tableHeader', alignment: 'right' },
                { text: 'Amount', style: 'tableHeader', alignment: 'right' },
            ]
        ]

        invoice.lineItems.forEach(item => {
            tableBody.push([
                item.description,
                { text: item.quantity.toString(), alignment: 'right' },
                { text: this.formatCurrency(item.unitPriceEur), alignment: 'right' },
                { text: `${item.vatPct}%`, alignment: 'right' },
                { text: this.formatCurrency(item.amountEur), alignment: 'right' },
            ])
        })

        return {
            content: [
                {
                    columns: headerColumn,
                    margin: [0, 0, 0, 40]
                },
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { text: 'Billed To:', bold: true, margin: [0, 0, 0, 5] },
                                { text: invoice.customerName, bold: true },
                                invoice.customerEmail ? { text: invoice.customerEmail } : '',
                            ]
                        },
                        {
                            width: 'auto',
                            stack: [
                                {
                                    columns: [
                                        { text: 'Invoice No:', width: 80, bold: true },
                                        { text: invoice.invoiceNumber, alignment: 'right' }
                                    ],
                                    margin: [0, 0, 0, 2]
                                },
                                {
                                    columns: [
                                        { text: 'Date:', width: 80, bold: true },
                                        { text: this.formatDate(invoice.issuedAt), alignment: 'right' }
                                    ],
                                    margin: [0, 0, 0, 2]
                                },
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 40]
                },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto', 'auto', 'auto', 'auto'],
                        body: tableBody
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 0, 0, 20]
                },
                {
                    columns: [
                        { width: '*', text: '' },
                        {
                            width: 'auto',
                            layout: 'noBorders',
                            table: {
                                body: [
                                    [
                                        { text: 'Subtotal:', alignment: 'right', margin: [0, 2, 10, 2] },
                                        { text: this.formatCurrency(invoice.subtotalEur), alignment: 'right', margin: [0, 2, 0, 2] }
                                    ],
                                    [
                                        { text: 'VAT:', alignment: 'right', margin: [0, 2, 10, 2] },
                                        { text: this.formatCurrency(invoice.vatEur), alignment: 'right', margin: [0, 2, 0, 2] }
                                    ],
                                    [
                                        { text: 'Total:', bold: true, alignment: 'right', margin: [0, 5, 10, 0] },
                                        { text: this.formatCurrency(invoice.totalEur), bold: true, alignment: 'right', margin: [0, 5, 0, 0] }
                                    ],
                                ]
                            }
                        }
                    ]
                },
                invoice.notes ? { text: 'Notes', style: 'subheader', margin: [0, 20, 0, 5] } : '',
                invoice.notes ? { text: invoice.notes, fontSize: 10, color: '#555' } : '',
            ],
            styles: {
                headerLeft: {
                    fontSize: 18,
                    bold: true
                },
                headerRight: {
                    fontSize: 10,
                    color: '#555',
                    lineHeight: 1.3
                },
                tableHeader: {
                    bold: true,
                    fontSize: 10,
                    color: 'black',
                    fillColor: '#f9fafb'
                },
                subheader: {
                    fontSize: 12,
                    bold: true
                }
            },
            defaultStyle: {
                font: 'Roboto',
                fontSize: 10
            }
        }
    }
}
