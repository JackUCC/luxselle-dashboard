/**
 * Buying list: list items, add/update; uses apiGet, apiPost (and apiPut/apiDelete where implemented).
 * @see docs/CODE_REFERENCE.md
 */
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { 
  Download, 
  Trash2, 
  MessageSquare, 
  List, 
  Layers, 
  Store, 
  Copy,
  Receipt,
  Loader2,
  ClipboardList,
  ChevronDown,
  Mail,
  Phone
} from 'lucide-react'
import type { BuyingListItem, Supplier } from '@shared/schemas'
import { apiGet, apiPost } from '../../lib/api'

type BuyingListItemWithId = BuyingListItem & { id: string }
type SupplierWithId = Supplier & { id: string }

type BuyingListResponse = {
  data: BuyingListItemWithId[]
}

type SuppliersResponse = {
  data: SupplierWithId[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)

const statusColors = {
  pending: 'bg-yellow-50 text-yellow-700',
  ordered: 'bg-blue-50 text-blue-700',
  received: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-50 text-gray-700',
}

export default function BuyingListView() {
  const navigate = useNavigate()
  const [items, setItems] = useState<BuyingListItemWithId[]>([])
  const [suppliers, setSuppliers] = useState<Record<string, SupplierWithId>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [receivingId, setReceivingId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // URL param state
  const statusFilter = searchParams.get('status') ?? 'all'
  const viewMode = (searchParams.get('view') ?? 'list') as 'list' | 'bulk'

  const setStatusFilter = useCallback((status: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (status === 'all') {
      newParams.delete('status')
    } else {
      newParams.set('status', status)
    }
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const setViewMode = useCallback((mode: 'list' | 'bulk') => {
    const newParams = new URLSearchParams(searchParams)
    if (mode === 'list') {
      newParams.delete('view')
    } else {
      newParams.set('view', mode)
    }
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [itemsRes, suppliersRes] = await Promise.all([
        apiGet<BuyingListResponse>('/buying-list'),
        apiGet<SuppliersResponse>('/suppliers'),
      ])
      
      setItems(itemsRes.data)
      const supplierMap = suppliersRes.data.reduce((acc, s) => ({ ...acc, [s.id]: s }), {})
      setSuppliers(supplierMap)
      setError(null)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load buying list'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleReceive = async (id: string) => {
    setReceivingId(id)
    try {
      await apiPost(`/buying-list/${id}/receive`, {})
      toast.success('Item received into inventory', {
        icon: '📦',
      })
      navigate('/inventory')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to receive item'
      toast.error(message)
    } finally {
      setReceivingId(null)
    }
  }

  const handleClearList = async () => {
    // TODO: Implement clear list endpoint
    toast.error('Clear list not yet implemented')
  }

  const handleExportPO = () => {
    toast.success('Exporting Purchase Order...')
  }

  const copyBulkMessage = (supplierName: string, message: string) => {
    navigator.clipboard.writeText(message)
    toast.success(`Message for ${supplierName} copied!`)
  }

  const filteredItems =
    statusFilter === 'all'
      ? items
      : items.filter((item) => item.status === statusFilter)

  const totalValue = filteredItems.reduce(
    (sum, item) => sum + item.targetBuyPriceEur,
    0
  )

  // Group by supplier for Bulk View
  const itemsBySupplier = filteredItems.reduce((acc, item) => {
    const supplierId = item.supplierId || 'unknown'
    if (!acc[supplierId]) acc[supplierId] = []
    acc[supplierId].push(item)
    return acc
  }, {} as Record<string, BuyingListItemWithId[]>)

  const generateBulkMessage = (supplierId: string, supplierItems: BuyingListItemWithId[]) => {
    const supplier = suppliers[supplierId]
    const name = supplier ? supplier.name : 'Supplier'
    const date = new Date().toLocaleDateString('en-US')
    
    let msg = `Hi ${name},\n\n`
    msg += `We would like to place a bulk order/inquiry for the following items (Date: ${date}):\n\n`
    
    supplierItems.forEach((item, idx) => {
      msg += `${idx + 1}. [${item.id.slice(-4)}] ${item.brand} ${item.model} - ${item.colour || item.condition} (A)\n`
    })
    
    msg += `\nPlease confirm availability and total price including shipping to our Ireland warehouse.\n\n`
    msg += `Best,\nLuxselle Buying Team`
    
    return msg
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Buying List</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review pending purchases.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="relative">
            <label htmlFor="buying-list-status-filter" className="sr-only">Filter by status</label>
            <select
              id="buying-list-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="ordered">Ordered</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
              List View
            </button>
            <button
              onClick={() => setViewMode('bulk')}
              className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'bulk' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Layers className="h-4 w-4" />
              Bulk Order
            </button>
          </div>
          
          <button 
            onClick={handleExportPO}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export PO
          </button>
          
          <button 
            onClick={handleClearList}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear List
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading buying list...</span>
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-6 text-red-600">{error}</div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-gray-400 mb-3" />
          <p className="text-gray-500 font-medium">No items in buying list</p>
          <p className="text-sm text-gray-400 mt-1">
            {statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Use the Evaluator to add items to your buying list.'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Est. Cost</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100 border border-gray-200">
                          <img 
                            src={`https://placehold.co/100x100?text=${encodeURIComponent(item.brand)}`} 
                            alt="" 
                            className="h-full w-full object-cover" 
                            onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100?text=No+image' }}
                          />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{item.brand} {item.model}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">BA{item.id.slice(-4)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                       <div className="flex flex-col">
                        <span>{item.condition} · {item.colour || 'N/A'}</span>
                        <span className="text-xs text-gray-400 capitalize">{item.sourceType} Source</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900">
                      {formatCurrency(item.targetBuyPriceEur)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[item.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.supplierId ? (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                            <Store className="h-3 w-3" />
                            {suppliers[item.supplierId]?.name || 'Unknown Supplier'}
                          </div>
                        </div>
                      ) : (
                         <span className="text-xs text-gray-400 italic">No supplier</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2">
                        {item.status === 'pending' || item.status === 'ordered' ? (
                          <button 
                            onClick={() => handleReceive(item.id)}
                            disabled={receivingId === item.id}
                            className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
                          >
                            <Receipt className="h-3 w-3" />
                            {receivingId === item.id ? 'Receiving...' : 'Receive'}
                          </button>
                        ) : null}
                        <button className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-blue-600 transition-colors">
                          <MessageSquare className="h-3 w-3" />
                          CONTACT
                        </button>
                        <button 
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-end gap-6 rounded-lg bg-gray-50 p-4 border border-gray-200">
             <div className="text-right">
               <div className="text-xs text-gray-500 uppercase tracking-wide">Total Est. Cost</div>
               <div className="text-xl font-bold text-gray-900">{formatCurrency(totalValue)}</div>
             </div>
             <button className="lux-btn-primary bg-indigo-600 hover:bg-indigo-700">
                Generate Purchase Order
             </button>
          </div>
        </>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
           {Object.keys(itemsBySupplier).map(supplierId => {
              const supplierItems = itemsBySupplier[supplierId]
              const supplier = suppliers[supplierId]
              const message = generateBulkMessage(supplierId, supplierItems)
              const totalCost = supplierItems.reduce((sum, item) => sum + item.targetBuyPriceEur, 0)
              
              // Generate WhatsApp URL
              const whatsappNumber = supplier?.whatsappNumber || supplier?.phone?.replace(/[^0-9]/g, '')
              const whatsappUrl = whatsappNumber 
                ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
                : null
              
              // Generate Email URL
              const emailUrl = supplier?.email 
                ? `mailto:${supplier.email}?subject=${encodeURIComponent(`Bulk Order Inquiry - ${new Date().toLocaleDateString()}`)}&body=${encodeURIComponent(message)}`
                : null
              
              return (
                 <div key={supplierId} className="lux-card flex flex-col overflow-hidden">
                    <div className="border-b border-gray-100 bg-gray-50/50 p-4 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500">
                             <Store className="h-4 w-4" />
                          </div>
                          <div>
                             <h3 className="font-bold text-gray-900 text-sm">
                                {supplier ? supplier.name : 'Unknown Supplier'}
                             </h3>
                             {supplier?.email && (
                                <div className="text-xs text-gray-400">{supplier.email}</div>
                             )}
                          </div>
                       </div>
                       <div className="text-right">
                          <span className="rounded-full bg-white border border-gray-200 px-2 py-1 text-xs font-bold text-gray-700">
                             {supplierItems.length} Items
                          </span>
                          <div className="text-xs font-mono text-gray-500 mt-1">
                             {formatCurrency(totalCost)}
                          </div>
                       </div>
                    </div>
                    
                    <div className="p-4 flex-1">
                       <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Message Preview</div>
                       <div className="rounded-lg bg-gray-50 p-4 text-xs font-mono text-gray-600 whitespace-pre-wrap leading-relaxed border border-gray-100 max-h-48 overflow-y-auto">
                          {message}
                       </div>
                    </div>
                    
                    <div className="border-t border-gray-100 p-4 space-y-2">
                       {/* Primary action: Copy */}
                       <button 
                          onClick={() => copyBulkMessage(supplier?.name || 'Supplier', message)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                       >
                          <Copy className="h-4 w-4" />
                          Copy Message
                       </button>
                       
                       {/* Secondary actions: WhatsApp & Email */}
                       <div className="flex gap-2">
                          {whatsappUrl && (
                             <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
                             >
                                <Phone className="h-4 w-4" />
                                WhatsApp
                             </a>
                          )}
                          {emailUrl && (
                             <a
                                href={emailUrl}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                             >
                                <Mail className="h-4 w-4" />
                                Email
                             </a>
                          )}
                          {!whatsappUrl && !emailUrl && (
                             <div className="flex-1 text-center text-xs text-gray-400 py-2">
                                No contact info available
                             </div>
                          )}
                       </div>
                    </div>
                 </div>
              )
           })}
           {Object.keys(itemsBySupplier).length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500">
                 No items to show in bulk view.
              </div>
           )}
        </div>
      )}
    </section>
  )
}
