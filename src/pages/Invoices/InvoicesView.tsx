/**
 * Invoices list and detail: list saved invoices, view/print for accounting.
 * Create in-person invoices or add invoices by uploading a PDF.
 * Uses design-system: PageHeader, ListRow, Modal, Button, Input.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Download, FileText, Loader2, Plus, Upload, X, Trash2 } from 'lucide-react'
import type { Invoice } from '@shared/schemas'
import { apiGet, apiPost, apiPostFormData, apiDelete } from '../../lib/api'
import PageLayout from '../../components/layout/PageLayout'
import { Button, Input, Modal, PageHeader, SectionLabel } from '../../components/design-system'
import { useLayoutMode } from '../../lib/LayoutModeContext'

type InvoiceWithId = Invoice & { id: string }

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value)

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr))

const todayIso = () => new Date().toISOString().slice(0, 10)

type AddMode = 'none' | 'in-person' | 'upload'

export default function InvoicesView() {
  const { isSidecar } = useLayoutMode()
  const [invoices, setInvoices] = useState<InvoiceWithId[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
      .then((res) => { setInvoices(res.data); setError(null) })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load invoices'
        toast.error(message)
        setError(message)
        setInvoices([])
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    setIsLoading(true)
    fetchInvoices()
  }, [fetchInvoices])

  const handleExportPdf = async () => {
    if (!selected) return

    if (selected.pdfUrl) {
      window.open(selected.pdfUrl, '_blank')
      return
    }

    const toastId = toast.loading('Generating PDF...')
    try {
      const updated = await apiPost<InvoiceWithId>(`/invoices/${selected.id}/generate-pdf`, {})
      setSelected(updated)
      setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)))
      toast.success('PDF generated', { id: toastId })
      if (updated.pdfUrl) {
        window.open(updated.pdfUrl, '_blank')
      }
    } catch (err) {
      toast.error('Failed to generate PDF', { id: toastId })
    }
  }

  const handleDeleteInvoice = async () => {
    if (!selected) return
    const toastId = toast.loading('Deleting invoice...')
    try {
      await apiDelete(`/invoices/${selected.id}`)
      setInvoices((prev) => prev.filter((inv) => inv.id !== selected.id))
      setSelected(null)
      toast.success('Invoice deleted', { id: toastId })
    } catch (err) {
      toast.error('Failed to delete invoice', { id: toastId })
    }
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
      const updated = await apiPost<InvoiceWithId>(`/invoices/${created.id}/generate-pdf`, {})
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
    <PageLayout variant="default">
      <div className={isSidecar ? 'min-w-0 max-w-full overflow-auto space-y-8' : 'space-y-8'}>
      <PageHeader
        title="Invoices"
        actions={
          <>
            <Button
              variant="primary"
              onClick={openCreateModal}
              aria-label="Create invoice"
              data-testid="invoice-create-cta"
              className="inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
            <Button
              variant="secondary"
              onClick={openUploadModal}
              aria-label="Add invoice from PDF"
              className="inline-flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Add PDF
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-lux-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading invoices...</span>
        </div>
      ) : error ? (
        <div className="lux-card p-8 text-center">
          <p className="font-medium text-rose-600">{error}</p>
          <Button variant="secondary" onClick={() => { setIsLoading(true); fetchInvoices() }} className="mt-4">
            Retry
          </Button>
        </div>
      ) : invoices.length === 0 ? (
        <div className="lux-card border-dashed p-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-lux-500" />
          <p className="font-medium text-lux-600">No invoices yet</p>
          <p className="mt-1 text-body-sm text-lux-500">
            Create an invoice or upload a PDF to get started.
          </p>
          <Button variant="primary" onClick={openCreateModal} className="mt-6 inline-flex items-center gap-2" aria-label="Create invoice (empty state)">
            <Plus className="h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className={`grid gap-5 ${isSidecar ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'}`}>
            {invoices.map((inv, index) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => setSelected(inv)}
                className={`lux-card p-5 text-left transition-all animate-bento-enter hover:-translate-y-0.5 ${
                  selected?.id === inv.id ? 'ring-2 ring-lux-900' : ''
                }`}
                style={{ '--stagger': index } as React.CSSProperties}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="font-semibold text-lux-900">{inv.invoiceNumber}</span>
                  <span className="text-body-sm text-lux-500">{formatDate(inv.issuedAt)}</span>
                </div>
                <div className="font-mono text-xl font-bold text-lux-900">
                  {formatCurrency(inv.totalEur)}
                </div>
                {inv.customerName && (
                  <div className="mt-1 text-body-sm text-lux-600">{inv.customerName}</div>
                )}
              </button>
            ))}
          </div>

          {selected && (
            <div className="lux-card p-6 animate-bento-enter print:border-2 print:shadow-none print:border-lux-200" style={{ '--stagger': 1 } as React.CSSProperties}>
              <div className="mb-6 flex items-start justify-between no-print">
                <SectionLabel>Invoice detail</SectionLabel>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleExportPdf} className="inline-flex items-center gap-2" aria-label="Export PDF">
                    <Download className="h-4 w-4" />
                    {selected.pdfUrl ? 'Download PDF' : 'Generate PDF'}
                  </Button>
                  <Button variant="secondary" onClick={handleDeleteInvoice} className="inline-flex items-center gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200" aria-label="Delete Invoice">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="rounded-lg p-2 text-lux-500 hover:bg-lux-100 hover:text-lux-700"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="invoice-content">
                <div className="flex items-start justify-between border-b border-lux-200 pb-4">
                  <div>
                    <div className="font-mono text-card-header font-bold text-lux-900">{selected.invoiceNumber}</div>
                    <div className="mt-1 text-body-sm text-lux-500">Issued {formatDate(selected.issuedAt)}</div>
                  </div>
                  <div className="text-right text-body-sm text-lux-600">
                    {selected.customerName && <div>{selected.customerName}</div>}
                    {selected.customerEmail && <div>{selected.customerEmail}</div>}
                  </div>
                </div>
                <table className="mt-6 w-full text-body-sm">
                  <thead>
                    <tr className="border-b border-lux-200 text-left text-lux-500">
                      <th className="pb-2 font-semibold">Description</th>
                      <th className="pb-2 font-semibold text-right">Qty</th>
                      <th className="pb-2 font-semibold text-right">Unit price</th>
                      <th className="pb-2 font-semibold text-right">VAT %</th>
                      <th className="pb-2 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lineItems.map((line, i) => (
                      <tr key={i} className="border-b border-lux-100">
                        <td className="py-2">{line.description}</td>
                        <td className="py-2 text-right">{line.quantity}</td>
                        <td className="py-2 text-right">{formatCurrency(line.unitPriceEur)}</td>
                        <td className="py-2 text-right">{line.vatPct}%</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(line.amountEur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-6 space-y-1 border-t border-lux-200 pt-4 text-body-sm">
                  <div className="flex justify-between text-lux-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selected.subtotalEur)}</span>
                  </div>
                  <div className="flex justify-between text-lux-600">
                    <span>VAT</span>
                    <span>{formatCurrency(selected.vatEur)}</span>
                  </div>
                  <div className="lux-card-accent mt-3 flex justify-between rounded-xl p-3 text-body font-semibold text-lux-900">
                    <span>Total</span>
                    <span>{formatCurrency(selected.totalEur)}</span>
                  </div>
                </div>
                {selected.notes && (
                  <p className="mt-4 border-t border-lux-100 pt-4 text-body-sm text-lux-500">{selected.notes}</p>
                )}
              </div>
            </div>
          )}
        </div>

      )}

      {/* Create in-person invoice modal */}
      <Modal isOpen={addMode === 'in-person'} onClose={closeAddModal} size="md" titleId="create-invoice-title">
        <div className="max-h-[90vh] overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between border-b border-lux-200 pb-4">
            <h2 id="create-invoice-title" className="text-card-header font-semibold text-lux-800">Create in-person invoice</h2>
            <button type="button" onClick={closeAddModal} className="rounded-lg p-2 text-lux-500 hover:bg-lux-100 hover:text-lux-700" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleCreateInPerson} className="space-y-6">
            <section className="space-y-3" aria-labelledby="create-sale-heading">
              <SectionLabel as="h3" id="create-sale-heading" className="border-b border-lux-100 pb-1">Sale details</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-date" className="mb-1 block text-ui-label font-medium text-lux-700">Date</label>
                  <Input
                    id="create-date"
                    type="date"
                    value={createForm.issuedAt}
                    onChange={(e) => setCreateForm((f) => ({ ...f, issuedAt: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="create-amount" className="mb-1 block text-ui-label font-medium text-lux-700">Amount paid (incl. VAT) €</label>
                  <Input
                    id="create-amount"
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={createForm.amountPaidEur}
                    onChange={(e) => setCreateForm((f) => ({ ...f, amountPaidEur: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </section>
            <section className="space-y-3" aria-labelledby="create-item-heading">
              <SectionLabel as="h3" id="create-item-heading" className="border-b border-lux-100 pb-1">Item</SectionLabel>
              <div>
                <label htmlFor="create-description" className="mb-1 block text-ui-label font-medium text-lux-700">Item description <span className="text-rose-500">*</span></label>
                <Input
                  id="create-description"
                  type="text"
                  required
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Chanel Matelasse bag"
                />
              </div>
              <div>
                <label htmlFor="create-sku" className="mb-1 block text-ui-label font-medium text-lux-600">SKU <span className="font-normal text-lux-400">(optional)</span></label>
                <Input
                  id="create-sku"
                  type="text"
                  value={createForm.sku}
                  onChange={(e) => setCreateForm((f) => ({ ...f, sku: e.target.value }))}
                  placeholder="e.g. 158105SAV"
                />
              </div>
            </section>
            <section className="space-y-3" aria-labelledby="create-customer-heading">
              <SectionLabel as="h3" id="create-customer-heading" className="border-b border-lux-100 pb-1">Customer <span className="font-normal text-lux-400">(optional)</span></SectionLabel>
              <div>
                <label htmlFor="create-customer-name" className="mb-1 block text-ui-label font-medium text-lux-700">Name</label>
                <Input
                  id="create-customer-name"
                  type="text"
                  value={createForm.customerName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, customerName: e.target.value }))}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label htmlFor="create-customer-email" className="mb-1 block text-ui-label font-medium text-lux-700">Email</label>
                <Input
                  id="create-customer-email"
                  type="email"
                  value={createForm.customerEmail}
                  onChange={(e) => setCreateForm((f) => ({ ...f, customerEmail: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label htmlFor="create-customer-address" className="mb-1 block text-ui-label font-medium text-lux-700">Address</label>
                <textarea
                  id="create-customer-address"
                  rows={2}
                  value={createForm.customerAddress}
                  onChange={(e) => setCreateForm((f) => ({ ...f, customerAddress: e.target.value }))}
                  className="lux-input w-full resize-y"
                  placeholder="Street, City, Postcode, Country"
                />
              </div>
            </section>
            <div className="flex gap-2 border-t border-lux-200 pt-4">
              <Button type="button" variant="secondary" onClick={closeAddModal} className="flex-1">Cancel</Button>
              <button
                type="submit"
                disabled={createSubmitting}
                className="lux-btn-primary flex flex-1 items-center justify-center gap-2 disabled:opacity-50"
              >
                {createSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create invoice
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Add invoice (PDF upload) modal */}
      <Modal isOpen={addMode === 'upload'} onClose={closeAddModal} size="md" titleId="upload-invoice-title">
        <div className="max-h-[90vh] overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between border-b border-lux-200 pb-4">
            <h2 id="upload-invoice-title" className="text-card-header font-semibold text-lux-800">Add invoice (PDF)</h2>
            <button type="button" onClick={closeAddModal} className="rounded-lg p-2 text-lux-500 hover:bg-lux-100 hover:text-lux-700" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mb-4 text-body-sm text-lux-500">
            Upload a PDF invoice to store it here. Enter the invoice number (required); other fields are optional.
          </p>
          <form onSubmit={handleUploadInvoice} className="space-y-4">
            <div>
              <label htmlFor="upload-file" className="mb-1 block text-ui-label font-medium text-lux-700">PDF file <span className="text-rose-500">*</span></label>
              <input
                id="upload-file"
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                aria-label="Choose PDF invoice file"
                onChange={(e) => setUploadForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
                className="w-full text-body-sm text-lux-600 file:mr-3 file:rounded-lux-input file:border-2 file:border-lux-200 file:bg-lux-50 file:px-4 file:py-2 file:font-medium file:text-lux-700 hover:file:bg-lux-100"
              />
              {uploadForm.file && (
                <p className="mt-1 text-body-sm text-lux-500">{uploadForm.file.name}</p>
              )}
            </div>
            <div>
              <label htmlFor="upload-invoice-number" className="mb-1 block text-ui-label font-medium text-lux-700">Invoice number <span className="text-rose-500">*</span></label>
              <Input
                id="upload-invoice-number"
                type="text"
                required
                value={uploadForm.invoiceNumber}
                onChange={(e) => setUploadForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                placeholder="e.g. INV-2024-001"
              />
            </div>
            <section className="space-y-3 border-t border-lux-100 pt-4" aria-labelledby="upload-optional-heading">
              <SectionLabel as="h3" id="upload-optional-heading">Optional details</SectionLabel>
              <div>
                <label htmlFor="upload-customer-name" className="mb-1 block text-ui-label font-medium text-lux-700">Customer name</label>
                <Input
                  id="upload-customer-name"
                  type="text"
                  value={uploadForm.customerName}
                  onChange={(e) => setUploadForm((f) => ({ ...f, customerName: e.target.value }))}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label htmlFor="upload-customer-email" className="mb-1 block text-ui-label font-medium text-lux-700">Customer email</label>
                <Input
                  id="upload-customer-email"
                  type="email"
                  value={uploadForm.customerEmail}
                  onChange={(e) => setUploadForm((f) => ({ ...f, customerEmail: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label htmlFor="upload-amount" className="mb-1 block text-ui-label font-medium text-lux-700">Amount (€)</label>
                <Input
                  id="upload-amount"
                  type="number"
                  step="0.01"
                  min={0}
                  value={uploadForm.amountEur}
                  onChange={(e) => setUploadForm((f) => ({ ...f, amountEur: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="upload-description" className="mb-1 block text-ui-label font-medium text-lux-700">Description</label>
                <Input
                  id="upload-description"
                  type="text"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description"
                />
              </div>
              <div>
                <label htmlFor="upload-notes" className="mb-1 block text-ui-label font-medium text-lux-700">Notes</label>
                <textarea
                  id="upload-notes"
                  rows={2}
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm((f) => ({ ...f, notes: e.target.value }))}
                  className="lux-input w-full resize-y"
                  placeholder="Internal notes"
                />
              </div>
            </section>
            <div className="flex gap-2 border-t border-lux-200 pt-4">
              <Button type="button" variant="secondary" onClick={closeAddModal} className="flex-1">Cancel</Button>
              <button
                type="submit"
                disabled={uploadSubmitting}
                className="lux-btn-primary flex flex-1 items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploadSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add invoice
              </button>
            </div>
          </form>
        </div>
      </Modal>
      </div>
    </PageLayout>
  )
}
