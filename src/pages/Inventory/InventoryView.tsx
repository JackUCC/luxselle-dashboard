/**
 * Inventory list: product list with search/sort, virtualized list, and ProductDetailDrawer; uses apiGet.
 * @see docs/CODE_REFERENCE.md
 */
import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import toast from 'react-hot-toast'
import {
  Search,
  LayoutList,
  LayoutGrid,
  Plus,
  MoreVertical,
  ChevronDown,
  Loader2,
  Package,
  Download
} from 'lucide-react'
import { apiGet } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'
import { PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE_SMALL } from '../../lib/placeholder'
import type { ProductWithId } from '../../types/dashboard'
import ProductDetailDrawer from './ProductDetailDrawer'

interface ProductsResponse {
  data: ProductWithId[]
}



const getStatusColor = (status: string) => {
  switch (status) {
    case 'in_stock': return 'bg-green-100 text-green-700'
    case 'sold': return 'bg-gray-100 text-gray-700'
    case 'reserved': return 'bg-orange-100 text-orange-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'in_stock': return 'IN STOCK'
    case 'sold': return 'SOLD'
    case 'reserved': return 'RESERVED'
    default: return status.toUpperCase().replace('_', ' ')
  }
}

export default function InventoryView() {
  const [products, setProducts] = useState<ProductWithId[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [searchParams, setSearchParams] = useSearchParams()

  const query = (searchParams.get('q') ?? '').trim()
  const brandFilter = (searchParams.get('brand') ?? '').trim()
  const statusFilter = (searchParams.get('status') ?? '').trim()
  const lowStockFilter = searchParams.get('lowStock') === '1'
  const selectedProductId = searchParams.get('product')

  const openProductDrawer = useCallback((productId: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('product', productId)
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const closeProductDrawer = useCallback(() => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('product')
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const handleProductUpdated = useCallback((updated: ProductWithId) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    )
  }, [])

  const LOW_STOCK_THRESHOLD = 2 // matches settings.lowStockThreshold default

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const brand = product.brand.toLowerCase()
      const model = product.model.toLowerCase()
      const composite = `${brand} ${model}`
      const normalizedQuery = query.toLowerCase()

      if (normalizedQuery && !composite.includes(normalizedQuery)) return false
      if (brandFilter && !brand.includes(brandFilter.toLowerCase())) return false
      if (statusFilter && product.status !== statusFilter) return false
      // Low stock filter: in_stock and quantity below threshold (from Dashboard link)
      if (lowStockFilter) {
        if (product.status !== 'in_stock') return false
        if (product.quantity >= LOW_STOCK_THRESHOLD) return false
      }
      return true
    })
  }, [products, query, brandFilter, statusFilter, lowStockFilter])

  const handleExportCSV = useCallback(() => {
    const headers = ['Brand', 'Model', 'Category', 'Condition', 'Colour', 'Cost EUR', 'Sell EUR', 'Status', 'Quantity']
    const rows = filteredProducts.map(p => [
      p.brand,
      p.model,
      p.category || '',
      p.condition || '',
      p.colour || '',
      p.costPriceEur,
      p.sellPriceEur,
      p.status,
      p.quantity
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `luxselle-inventory-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${filteredProducts.length} items to CSV`)
  }, [filteredProducts])

  useEffect(() => {
    let active = true
    setIsLoading(true)
    apiGet<ProductsResponse>('/products')
      .then((response) => {
        if (!active) return
        setProducts(response.data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!active) return
        const message = err instanceof Error ? err.message : 'Failed to load products'
        setError(message)
        toast.error(message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const brands = useMemo(() =>
    Array.from(new Set(products.map(p => p.brand))).sort()
    , [products])

  // Virtualization for large tables (>50 items)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const shouldVirtualize = filteredProducts.length > 50

  const rowVirtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 72, // Approximate row height in pixels
    overscan: 5,
    enabled: shouldVirtualize && viewMode === 'table',
  })

  return (
    <section className="space-y-6">
      {/* Header & Controls */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">Manage stock levels and product details.</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filter inventory..."
                value={query}
                onChange={(e) => {
                  const newParams = new URLSearchParams(searchParams)
                  if (e.target.value) newParams.set('q', e.target.value)
                  else newParams.delete('q')
                  setSearchParams(newParams)
                }}
                className="lux-input pl-10"
              />
            </div>

            {/* View Toggles */}
            <div className="flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`rounded p-1.5 transition-colors ${viewMode === 'table' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredProducts.length === 0}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button className="lux-btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>
        </div>

        {/* Low stock banner (from Dashboard link) */}
        {lowStockFilter && (
          <div className="flex items-center justify-between rounded-lg bg-orange-50 border border-orange-200 px-4 py-3">
            <p className="text-sm font-medium text-orange-800">
              Showing low stock items (quantity &lt; {LOW_STOCK_THRESHOLD})
            </p>
            <button
              type="button"
              onClick={() => {
                const newParams = new URLSearchParams(searchParams)
                newParams.delete('lowStock')
                setSearchParams(newParams)
              }}
              className="text-sm font-medium text-orange-600 hover:text-orange-800"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              className="appearance-none rounded-lg border border-gray-200 bg-white pl-4 pr-10 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={brandFilter}
              onChange={(e) => {
                const newParams = new URLSearchParams(searchParams)
                if (e.target.value) newParams.set('brand', e.target.value)
                else newParams.delete('brand')
                setSearchParams(newParams)
              }}
            >
              <option value="">All Brands</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              className="appearance-none rounded-lg border border-gray-200 bg-white pl-4 pr-10 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={statusFilter}
              onChange={(e) => {
                const newParams = new URLSearchParams(searchParams)
                if (e.target.value) newParams.set('status', e.target.value)
                else newParams.delete('status')
                setSearchParams(newParams)
              }}
            >
              <option value="">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="sold">Sold</option>
              <option value="reserved">Reserved</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading inventory...</span>
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <Package className="mx-auto h-8 w-8 text-gray-400 mb-3" />
          <p className="text-gray-500 font-medium">No items found</p>
          <p className="text-sm text-gray-400 mt-1">
            {query || brandFilter || statusFilter ? 'Try adjusting your filters.' : 'Add your first inventory item to get started.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div
          ref={shouldVirtualize ? tableContainerRef : null}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          style={shouldVirtualize ? { maxHeight: '600px', overflow: 'auto' } : undefined}
        >
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid / Sell</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="relative px-6 py-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {shouldVirtualize ? (
                <>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const product = filteredProducts[virtualRow.index]
                    return (
                      <tr
                        key={product.id}
                        onClick={() => openProductDrawer(product.id)}
                        className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                        style={{
                          height: `${virtualRow.size}px`,
                        }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 border border-gray-200">
                              {product.imageUrls?.[0] && (
                                <img src={product.imageUrls[0]} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE_SMALL }} />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{product.brand} {product.model}</div>
                              <div className="text-xs text-gray-500 font-mono mt-0.5">BA{product.id.slice(-4)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                            {product.quantity} units
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-400 w-8">PAID</span>
                              <span className="font-medium text-gray-900">{formatCurrency(product.costPriceEur)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-400 w-8">SELL</span>
                              <span className="font-medium text-gray-900">{formatCurrency(product.sellPriceEur)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusColor(product.status)} border-current/10`}>
                            {getStatusLabel(product.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                            }}
                            className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </>
              ) : (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => openProductDrawer(product.id)}
                    className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 border border-gray-200">
                          {product.imageUrls?.[0] && (
                            <img src={product.imageUrls[0]} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE_SMALL }} />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{product.brand} {product.model}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">BA{product.id.slice(-4)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                        {product.quantity} units
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 w-8">PAID</span>
                          <span className="font-medium text-gray-900">{formatCurrency(product.costPriceEur)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 w-8">SELL</span>
                          <span className="font-medium text-gray-900">{formatCurrency(product.sellPriceEur)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusColor(product.status)} border-current/10`}>
                        {getStatusLabel(product.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // Menu will be added later
                        }}
                        className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              onClick={() => openProductDrawer(product.id)}
              className="group relative overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="aspect-[4/3] bg-gray-100 relative">
                {product.imageUrls?.[0] && (
                  <img src={product.imageUrls[0]} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE }} />
                )}
                <div className="absolute top-3 right-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-white/90 backdrop-blur-sm shadow-sm border border-gray-200 text-gray-900`}>
                    {getStatusLabel(product.status)}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-1 text-xs font-medium text-gray-500">{product.brand}</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-4 line-clamp-1">{product.model}</h3>

                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">Price</div>
                    <div className="font-mono text-sm font-medium text-gray-900">{formatCurrency(product.sellPriceEur)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">Qty</div>
                    <div className="text-sm font-medium text-gray-900">{product.quantity}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Detail Drawer */}
      {selectedProductId && (
        <ProductDetailDrawer
          productId={selectedProductId}
          onClose={closeProductDrawer}
          onProductUpdated={handleProductUpdated}
        />
      )}
    </section>
  )
}
