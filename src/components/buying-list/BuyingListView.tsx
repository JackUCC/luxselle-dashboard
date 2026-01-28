import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { 
  Download, 
  Trash2, 
  MessageSquare, 
  List, 
  Layers, 
  Store, 
  Copy,
  Receipt
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
  const [items, setItems] = useState<BuyingListItemWithId[]>([])
  const [suppliers, setSuppliers] = useState<Record<string, SupplierWithId>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [receivingId, setReceivingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'bulk'>('list')

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
    if (!confirm('Receive this item into inventory?')) return

    setReceivingId(id)
    try {
      await apiPost(`/buying-list/${id}/receive`, {})
      toast.success('Item received into inventory')
      loadData()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to receive item'
      toast.error(message)
    } finally {
      setReceivingId(null)
    }
  }

  const handleClearList = async () => {
    if (!confirm('Are you sure you want to clear all cancelled/received items?')) return
    // Mock implementation for now
    toast.success('List cleared')
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
        <div className="text-center py-12 text-gray-500">Loading buying list...</div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-6 text-red-600">{error}</div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          No items in buying list
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
                            src={`https://placehold.co/100x100?text=${item.brand}`} 
                            alt="" 
                            className="h-full w-full object-cover" 
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
                       <span className="rounded-full bg-white border border-gray-200 px-2 py-1 text-xs font-bold text-gray-700">
                          {supplierItems.length} Items
                       </span>
                    </div>
                    
                    <div className="p-4 flex-1">
                       <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Message Preview</div>
                       <div className="rounded-lg bg-gray-50 p-4 text-xs font-mono text-gray-600 whitespace-pre-wrap leading-relaxed border border-gray-100">
                          {message}
                       </div>
                    </div>
                    
                    <div className="bg-gray-900 p-4">
                       <button 
                          onClick={() => copyBulkMessage(supplier?.name || 'Supplier', message)}
                          className="flex w-full items-center justify-center gap-2 text-sm font-medium text-white hover:text-gray-200 transition-colors"
                       >
                          <Copy className="h-4 w-4" />
                          Copy Bulk Message
                       </button>
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
