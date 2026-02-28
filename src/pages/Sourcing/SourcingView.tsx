/**
 * Sourcing requests: list, filter, create, update status; uses apiGet, apiPost, apiPut.
 * @see docs/CODE_REFERENCE.md
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Pencil, X, Loader2, Users, Trash2 } from 'lucide-react'
import type { SourcingRequest } from '@shared/schemas'
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api'
import PageLayout from '../../components/layout/PageLayout'
import { PageHeader, SectionLabel } from '../../components/design-system'

type SourcingRequestWithId = SourcingRequest & { id: string }

type SourcingResponse = {
  data: SourcingRequestWithId[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'open': return 'bg-lux-200/80 text-lux-800 border-lux-300'
    case 'sourcing': return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'sourced': return 'bg-green-50 text-green-700 border-green-200'
    case 'fulfilled': return 'bg-gray-50 text-gray-700 border-gray-200'
    case 'lost': return 'bg-red-50 text-red-700 border-red-200'
    default: return 'bg-gray-50 text-gray-600 border-gray-200'
  }
}

const getStatusDotColor = (status: string) => {
  switch (status) {
    case 'open': return 'bg-amber-400'
    case 'sourcing': return 'bg-purple-400'
    case 'sourced': return 'bg-emerald-400'
    case 'fulfilled': return 'bg-gray-400'
    case 'lost': return 'bg-rose-400'
    default: return 'bg-gray-300'
  }
}

const STATUSES = ['all', 'open', 'sourcing', 'sourced', 'fulfilled', 'lost'] as const

export default function SourcingView() {
  const [requests, setRequests] = useState<SourcingRequestWithId[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilterState] = useState<string>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingRequest, setEditingRequest] = useState<SourcingRequestWithId | null>(null)
  const [formData, setFormData] = useState({
    customerName: '',
    queryText: '',
    brand: '',
    budget: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    notes: '',
    status: 'open' as 'open' | 'sourcing' | 'sourced' | 'fulfilled' | 'lost',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const loadRequests = () => {
    setIsLoading(true)
    apiGet<SourcingResponse>('/sourcing')
      .then((response) => {
        setRequests(response.data)
        setError(null)
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Failed to load sourcing requests'
        setError(message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    loadRequests()
  }, [])

  useEffect(() => {
    const allowedStatuses = new Set([
      'all',
      'open',
      'sourcing',
      'sourced',
      'fulfilled',
      'lost',
    ])
    const status = searchParams.get('status') ?? 'all'
    setStatusFilterState(allowedStatuses.has(status) ? status : 'all')
  }, [searchParams])

  const setStatusFilter = (status: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (status === 'all') {
      newParams.delete('status')
    } else {
      newParams.set('status', status)
    }
    setSearchParams(newParams)
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await apiPost('/sourcing', {
        ...formData,
        budget: Number(formData.budget),
      })
      toast.success('Sourcing request created')
      setFormData({
        customerName: '',
        queryText: '',
        brand: '',
        budget: '',
        priority: 'medium',
        notes: '',
        status: 'open',
      })
      setShowCreateForm(false)
      loadRequests()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create sourcing request'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditForm = (request: SourcingRequestWithId) => {
    setFormData({
      customerName: request.customerName,
      queryText: request.queryText,
      brand: request.brand ?? '',
      budget: String(request.budget),
      priority: request.priority,
      notes: request.notes ?? '',
      status: request.status,
    })
    setShowDeleteConfirm(false)
    setEditingRequest(request)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRequest) return
    setIsSubmitting(true)
    try {
      await apiPut(`/sourcing/${editingRequest.id}`, {
        customerName: formData.customerName,
        queryText: formData.queryText,
        brand: formData.brand,
        budget: Number(formData.budget),
        priority: formData.priority,
        notes: formData.notes,
        status: formData.status,
      })
      toast.success('Sourcing request updated')
      setEditingRequest(null)
      setShowDeleteConfirm(false)
      loadRequests()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update sourcing request'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!editingRequest) return
    setIsDeleting(true)
    try {
      await apiDelete(`/sourcing/${editingRequest.id}`)
      toast.success('Sourcing request deleted')
      setEditingRequest(null)
      setShowDeleteConfirm(false)
      loadRequests()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete sourcing request'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredRequests = useMemo(() =>
    statusFilter === 'all'
      ? requests
      : requests.filter((req) => req.status === statusFilter),
    [requests, statusFilter]
  )

  return (
    <PageLayout variant="default">
      <section className="space-y-8">
      <PageHeader
        title="Sourcing"
        purpose="Customer requests pipeline."
        actions={
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="lux-btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Request
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium tracking-wide transition-colors ${
              statusFilter === s
                ? 'bg-lux-900 text-white border-lux-900'
                : 'bg-white text-lux-600 border-[var(--lux-border)] hover:border-[var(--lux-border-hover)]'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Create Form Overlay */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-glass-lg animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">New Sourcing Request</h2>
              <button 
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    required
                    className="lux-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                    Brand
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className="lux-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                  Query / Description *
                </label>
                <textarea
                  name="queryText"
                  value={formData.queryText}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="lux-input"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                    Budget (EUR) *
                  </label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    required
                    className="lux-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="lux-input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="lux-btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="lux-btn-primary flex-1"
                >
                  {isSubmitting ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Form Overlay */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-glass-lg animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Edit Sourcing Request</h2>
              <button
                type="button"
                onClick={() => { setEditingRequest(null); setShowDeleteConfirm(false) }}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {showDeleteConfirm ? (
              <div className="space-y-4 py-2">
                <p className="text-sm text-gray-600">Delete this sourcing request? This cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="lux-btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {isDeleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    required
                    className="lux-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                    Brand
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className="lux-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                  Query / Description *
                </label>
                <textarea
                  name="queryText"
                  value={formData.queryText}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="lux-input"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                    Budget (EUR) *
                  </label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    required
                    className="lux-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="lux-input"
                    aria-label="Status"
                  >
                    <option value="open">Open</option>
                    <option value="sourcing">Sourcing</option>
                    <option value="sourced">Sourced</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="lux-input"
                    aria-label="Priority"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  className="lux-input"
                />
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingRequest(null)}
                    className="lux-btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="lux-btn-primary flex-1"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center gap-2 self-start text-sm text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete request
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Requests Pipeline */}
      <div>
        <SectionLabel className="mb-4">Pipeline</SectionLabel>

        {isLoading ? (
          <div className="lux-card flex items-center justify-center gap-2 p-12 text-lux-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading requests…</span>
          </div>
        ) : error ? (
          <div className="lux-card p-6 text-rose-600 bg-rose-50/50">{error}</div>
        ) : filteredRequests.length === 0 ? (
          <div className="lux-card p-12 text-center">
            <Users className="mx-auto h-8 w-8 text-lux-400 mb-3" />
            <p className="text-lux-600 font-medium">No sourcing requests found</p>
            <p className="text-sm text-lux-500 mt-1">
              {statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create a new request to start sourcing items for customers.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRequests.map((request, i) => (
              <div
                key={request.id}
                className={`${
                  request.priority === 'high' && request.status === 'open'
                    ? 'lux-card-accent'
                    : 'lux-card'
                } p-6 animate-bento-enter group`}
                style={{ '--stagger': i } as React.CSSProperties}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${getStatusDotColor(request.status)}`}
                    />
                    <span className="font-medium text-gray-900 truncate">
                      {request.customerName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditForm(request)}
                    className="text-lux-400 hover:text-lux-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
                    aria-label="Edit request"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-sm text-lux-500 mb-4 line-clamp-2">
                  {request.queryText}
                </p>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    {request.brand && (
                      <span className="text-lux-700 font-medium truncate">
                        {request.brand}
                      </span>
                    )}
                    <span className="font-mono text-lux-500 shrink-0">
                      {formatCurrency(request.budget)}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border uppercase tracking-wide shrink-0 ${getStatusStyles(request.status)}`}
                  >
                    {request.status}
                  </span>
                </div>

                <div className="text-[11px] text-lux-400 mt-3">
                  {new Date(request.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </section>
    </PageLayout>
  )
}
