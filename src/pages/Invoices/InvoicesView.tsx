/**
 * Invoices list and detail: list saved invoices, view/print for accounting.
 * Create in-person invoices or add invoices by uploading a PDF.
 * @see docs/CODE_REFERENCE.md
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ExternalLink, FileText, Loader2, Plus, Printer, Upload, X } from 'lucide-react'
import type { Invoice } from '@shared/schemas'
import { apiGet, apiPost, apiPostFormData } from '../../lib/api'

type InvoiceWithId = Invoice & { id: string }

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value)

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr))

const todayIso = () => new Date().toISOString().slice(0, 10)

type AddMode = 'none' | 'in-person' | 'upload'

export default function InvoicesView() {
  const [invoices, setInvoices] = useState<InvoiceWithId[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<InvoiceWithId | null>(null)
  const [addMode, setAddMode] = useState<AddMode>('none')
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createForm, setCreateForm] = useState({
    issuedAt: todayIso(),
    amountPaidEur: '',
    description: '',
    sku: '',
    customerName: '',
    customerEmail: '',
    customerAddress: '',
  })
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    invoiceNumber: '',
    customerName: '',
    customerEmail: '',
    amountEur: '',
    description: '',
    notes: '',
  })
  const [uploadSubmitting, setUploadSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchInvoices = useCallback(() => {
    return apiGet<{ data: InvoiceWithId[] }>('/invoices?limit=100')
      .then((res) => setInvoices(res.data))
      .catch(() => {
        toast.error('Failed to load invoices')
        setInvoices([])
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    setIsLoading(true)
    fetchInvoices()
  }, [fetchInvoices])

  const handlePrint = () => {
    window.print()
  }

  const openCreateModal = () => {
    setCreateForm({
      issuedAt: todayIso(),
      amountPaidEur: '',
      description: '',
      sku: '',
      customerName: '',
      customerEmail: '',
      customerAddress: '',
    })
    setAddMode('in-person')
  }

  const openUploadModal = () => {
    setUploadForm({
      file: null,
      invoiceNumber: '',
      customerName: '',
      customerEmail: '',
      amountEur: '',
      description: '',
      notes: '',
    })
    setAddMode('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const closeAddModal = () => setAddMode('none')

  const handleCreateInPerson = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(createForm.amountPaidEur)
    if (Number.isNaN(amount) || amount < 0) {
      toast.error('Enter a valid amount (incl. VAT)')
      return
    }
    if (!createForm.description.trim()) {
      toast.error('Item description is required')
      return
    }
    setCreateSubmitting(true)
    try {
      const issuedAt = createForm.issuedAt ? new Date(createForm.issuedAt).toISOString() : new Date().toISOString()
      const created = await apiPost<InvoiceWithId>('/invoices', {
        fromInPerson: true,
        issuedAt,
        amountPaidEur: amount,
        description: createForm.description.trim(),
        sku: createForm.sku.trim() || undefined,
        customerName: createForm.customerName.trim() || undefined,
        customerEmail: createForm.customerEmail.trim() || undefined,
        customerAddress: createForm.customerAddress.trim() || undefined,
      })
      const updated = await apiPost<InvoiceWithId>(`/invoices/${created.id}/generate-pdf`)
      await fetchInvoices()
      closeAddModal()
      setSelected(updated)
      toast.success('Invoice created and PDF stored')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invoice')
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleUploadInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadForm.file) {
      toast.error('Please select a PDF file')
      return
    }
    const invoiceNumber = uploadForm.invoiceNumber.trim()
    if (!invoiceNumber) {
      toast.error('Invoice number is required')
      return
    }
    setUploadSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadForm.file)
      formData.append('invoiceNumber', invoiceNumber)
      if (uploadForm.customerName.trim()) formData.append('customerName', uploadForm.customerName.trim())
      if (uploadForm.customerEmail.trim()) formData.append('customerEmail', uploadForm.customerEmail.trim())
      if (uploadForm.amountEur.trim()) formData.append('amountEur', uploadForm.amountEur.trim())
      if (uploadForm.description.trim()) formData.append('description', uploadForm.description.trim())
      if (uploadForm.notes.trim()) formData.append('notes', uploadForm.notes.trim())
      const created = await apiPostFormData<InvoiceWithId>('/invoices/upload', formData)
      await fetchInvoices()
      closeAddModal()
      setSelected(created)
      toast.success('Invoice added and PDF stored')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload invoice')
    } finally {
      setUploadSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create invoices from sales and store them for accounting.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
            aria-label="Create in-person invoice"
          >
            <Plus className="h-4 w-4" />
            Create in-person invoice
          </button>
          <button
            type="button"
            onClick={openUploadModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            aria-label="Add invoice from PDF"
          >
            <Upload className="h-4 w-4" />
            Add invoice (PDF)
          </button>
        </div>
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
            Create an in-person invoice or upload a PDF invoice to get started.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Create in-person invoice
            </button>
            <button
              type="button"
              onClick={openUploadModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Upload className="h-4 w-4" />
              Add invoice (PDF)
            </button>
          </div>
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

      {/* Create in-person invoice modal */}
      {addMode === 'in-person' && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" aria-hidden onClick={closeAddModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="create-invoice-title">
            <div className="lux-card w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
                <h2 id="create-invoice-title" className="text-lg font-semibold text-gray-900">Create in-person invoice</h2>
                <button type="button" onClick={closeAddModal} className="p-2 text-gray-400 hover:text-gray-600" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateInPerson} className="space-y-6">
                <section className="space-y-3" aria-labelledby="create-sale-heading">
                  <h3 id="create-sale-heading" className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-1">Sale details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="create-date" className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        id="create-date"
                        type="date"
                        value={createForm.issuedAt}
                        onChange={(e) => setCreateForm((f) => ({ ...f, issuedAt: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      />
                    </div>
                    <div>
                      <label htmlFor="create-amount" className="block text-sm font-medium text-gray-700 mb-1">Amount (incl. VAT) €</label>
                      <input
                        id="create-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={createForm.amountPaidEur}
                        onChange={(e) => setCreateForm((f) => ({ ...f, amountPaidEur: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </section>
                <section className="space-y-3" aria-labelledby="create-item-heading">
                  <h3 id="create-item-heading" className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-1">Item</h3>
                  <div>
                    <label htmlFor="create-description" className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-red-500">*</span></label>
                    <input
                      id="create-description"
                      type="text"
                      required
                      value={createForm.description}
                      onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="e.g. Chanel Matelasse bag"
                    />
                  </div>
                  <div>
                    <label htmlFor="create-sku" className="block text-sm font-medium text-gray-600 mb-1">SKU <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      id="create-sku"
                      type="text"
                      value={createForm.sku}
                      onChange={(e) => setCreateForm((f) => ({ ...f, sku: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="e.g. 158105SAV"
                    />
                  </div>
                </section>
                <section className="space-y-3" aria-labelledby="create-customer-heading">
                  <h3 id="create-customer-heading" className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-1">Customer <span className="text-gray-400 font-normal">(optional)</span></h3>
                  <div>
                    <label htmlFor="create-customer-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      id="create-customer-name"
                      type="text"
                      value={createForm.customerName}
                      onChange={(e) => setCreateForm((f) => ({ ...f, customerName: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <label htmlFor="create-customer-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      id="create-customer-email"
                      type="email"
                      value={createForm.customerEmail}
                      onChange={(e) => setCreateForm((f) => ({ ...f, customerEmail: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="create-customer-address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      id="create-customer-address"
                      rows={2}
                      value={createForm.customerAddress}
                      onChange={(e) => setCreateForm((f) => ({ ...f, customerAddress: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="Street, City, Postcode, Country"
                    />
                  </div>
                </section>
                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <button type="button" onClick={closeAddModal} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                    Cancel
                  </button>
                  <button type="submit" disabled={createSubmitting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50">
                    {createSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Create invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Add invoice (PDF upload) modal */}
      {addMode === 'upload' && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" aria-hidden onClick={closeAddModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="upload-invoice-title">
            <div className="lux-card w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
                <h2 id="upload-invoice-title" className="text-lg font-semibold text-gray-900">Add invoice (PDF)</h2>
                <button type="button" onClick={closeAddModal} className="p-2 text-gray-400 hover:text-gray-600" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Upload a PDF invoice to store it here. Enter the invoice number (required); other fields are optional.
              </p>
              <form onSubmit={handleUploadInvoice} className="space-y-4">
                <div>
                  <label htmlFor="upload-file" className="block text-sm font-medium text-gray-700 mb-1">PDF file <span className="text-red-500">*</span></label>
                  <input
                    id="upload-file"
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    aria-label="Choose PDF invoice file"
                    onChange={(e) => setUploadForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
                    className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:bg-gray-50 file:font-medium file:text-gray-700 hover:file:bg-gray-100"
                  />
                  {uploadForm.file && (
                    <p className="mt-1 text-sm text-gray-500">{uploadForm.file.name}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="upload-invoice-number" className="block text-sm font-medium text-gray-700 mb-1">Invoice number <span className="text-red-500">*</span></label>
                  <input
                    id="upload-invoice-number"
                    type="text"
                    required
                    value={uploadForm.invoiceNumber}
                    onChange={(e) => setUploadForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                    placeholder="e.g. INV-2024-001"
                  />
                </div>
                <section className="space-y-3 pt-2 border-t border-gray-100" aria-labelledby="upload-optional-heading">
                  <h3 id="upload-optional-heading" className="text-sm font-medium text-gray-600">Optional details</h3>
                  <div>
                    <label htmlFor="upload-customer-name" className="block text-sm font-medium text-gray-700 mb-1">Customer name</label>
                    <input
                      id="upload-customer-name"
                      type="text"
                      value={uploadForm.customerName}
                      onChange={(e) => setUploadForm((f) => ({ ...f, customerName: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <label htmlFor="upload-customer-email" className="block text-sm font-medium text-gray-700 mb-1">Customer email</label>
                    <input
                      id="upload-customer-email"
                      type="email"
                      value={uploadForm.customerEmail}
                      onChange={(e) => setUploadForm((f) => ({ ...f, customerEmail: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="upload-amount" className="block text-sm font-medium text-gray-700 mb-1">Amount (€)</label>
                    <input
                      id="upload-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={uploadForm.amountEur}
                      onChange={(e) => setUploadForm((f) => ({ ...f, amountEur: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label htmlFor="upload-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      id="upload-description"
                      type="text"
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="Brief description"
                    />
                  </div>
                  <div>
                    <label htmlFor="upload-notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      id="upload-notes"
                      rows={2}
                      value={uploadForm.notes}
                      onChange={(e) => setUploadForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      placeholder="Internal notes"
                    />
                  </div>
                </section>
                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <button type="button" onClick={closeAddModal} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                    Cancel
                  </button>
                  <button type="submit" disabled={uploadSubmitting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50">
                    {uploadSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Add invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
