/**
 * Sourcing requests: list, filter, create, update status; uses apiGet, apiPost, apiPut.
 * @see docs/CODE_REFERENCE.md
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search, Filter, Pencil, X, Loader2, Users, ChevronDown } from 'lucide-react'
import type { SourcingRequest } from '@shared/schemas'
import { apiGet, apiPost, apiPut } from '../../lib/api'

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
    case 'open': return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'sourcing': return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'sourced': return 'bg-green-50 text-green-700 border-green-200'
    case 'fulfilled': return 'bg-gray-50 text-gray-700 border-gray-200'
    case 'lost': return 'bg-red-50 text-red-700 border-red-200'
    default: return 'bg-gray-50 text-gray-600 border-gray-200'
  }
}

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
      loadRequests()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update sourcing request'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredRequests =
    statusFilter === 'all'
      ? requests
      : requests.filter((req) => req.status === statusFilter)

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Sourcing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Customer requests pipeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <label htmlFor="sourcing-status-filter" className="sr-only">Filter by status</label>
            <select
              id="sourcing-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="sourcing">Sourcing</option>
              <option value="sourced">Sourced</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="lost">Lost</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="lux-btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Request
          </button>
        </div>
      </div>

      {/* Create Form Overlay */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl animate-fade-in">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Edit Sourcing Request</h2>
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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

              <div className="pt-4 flex gap-3">
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
            </form>
          </div>
        </div>
      )}

      {/* Requests List */}
      <div className="lux-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading requests...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-red-600 bg-red-50">{error}</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-8 w-8 text-gray-400 mb-3" />
            <p className="text-gray-500 font-medium">No sourcing requests found</p>
            <p className="text-sm text-gray-400 mt-1">
              {statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create a new request to start sourcing items for customers.'}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Budget</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="relative px-6 py-4">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{request.customerName}</div>
                    <div className="text-xs text-gray-500">Added {new Date(request.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{request.brand || 'Unspecified Brand'}</div>
                    <div className="text-sm text-gray-500">{request.queryText}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-gray-600">
                    {formatCurrency(request.budget)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${getStatusStyles(request.status)} uppercase tracking-wide`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => openEditForm(request)}
                      className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Edit request"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
