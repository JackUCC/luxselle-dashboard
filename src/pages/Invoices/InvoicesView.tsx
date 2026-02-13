/**
 * Invoices list and detail: list saved invoices, view/print for accounting.
 * @see docs/CODE_REFERENCE.md
 */
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ExternalLink, FileText, Loader2, Printer, X } from 'lucide-react'
import type { Invoice } from '@shared/schemas'
import { apiGet } from '../../lib/api'

type InvoiceWithId = Invoice & { id: string }

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value)

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr))

export default function InvoicesView() {
  const [invoices, setInvoices] = useState<InvoiceWithId[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<InvoiceWithId | null>(null)

  useEffect(() => {
    apiGet<{ data: InvoiceWithId[] }>('/invoices?limit=100')
      .then((res) => setInvoices(res.data))
      .catch(() => {
        toast.error('Failed to load invoices')
        setInvoices([])
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Invoices</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create invoices from sales and store them for accounting.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading invoices...</span>
        </div>
      ) : invoices.length === 0 ? (
        <div className="lux-card p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium">No invoices yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Record a sale in Inventory → Product detail → History, then choose &quot;Create invoice&quot;.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="lux-card p-4">
            <h2 className="font-semibold text-gray-900 mb-4">All invoices</h2>
            <ul className="space-y-2">
              {invoices.map((inv) => (
                <li key={inv.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(inv)}
                    className={`w-full text-left rounded-lg border p-4 transition-colors ${
                      selected?.id === inv.id
                        ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-sm font-medium text-gray-900">{inv.invoiceNumber}</span>
                      <span className="text-sm text-gray-500">{formatDate(inv.issuedAt)}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatCurrency(inv.totalEur)}
                      {inv.customerName ? ` · ${inv.customerName}` : ''}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {selected && (
            <div className="lux-card p-6 print:shadow-none">
              <div className="flex items-start justify-between mb-6 no-print">
                <h2 className="font-semibold text-gray-900">Invoice detail</h2>
                <div className="flex gap-2">
                  {selected.pdfUrl && (
                    <a
                      href={selected.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                      aria-label="View PDF"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View PDF
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    aria-label="Print invoice"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="invoice-content">
                <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                  <div>
                    <div className="font-mono font-bold text-lg text-gray-900">{selected.invoiceNumber}</div>
                    <div className="text-sm text-gray-500 mt-1">Issued {formatDate(selected.issuedAt)}</div>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    {selected.customerName && <div>{selected.customerName}</div>}
                    {selected.customerEmail && <div>{selected.customerEmail}</div>}
                  </div>
                </div>
                <table className="w-full mt-6 text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-2 font-medium">Description</th>
                      <th className="pb-2 font-medium text-right">Qty</th>
                      <th className="pb-2 font-medium text-right">Unit price</th>
                      <th className="pb-2 font-medium text-right">VAT %</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lineItems.map((line, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2">{line.description}</td>
                        <td className="py-2 text-right">{line.quantity}</td>
                        <td className="py-2 text-right">{formatCurrency(line.unitPriceEur)}</td>
                        <td className="py-2 text-right">{line.vatPct}%</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(line.amountEur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-6 pt-4 border-t border-gray-200 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selected.subtotalEur)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>VAT</span>
                    <span>{formatCurrency(selected.vatEur)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 text-base pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(selected.totalEur)}</span>
                  </div>
                </div>
                {selected.notes && (
                  <p className="mt-4 text-sm text-gray-500 border-t border-gray-100 pt-4">{selected.notes}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
