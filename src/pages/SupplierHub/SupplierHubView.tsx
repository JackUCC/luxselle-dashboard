/**
 * Supplier hub: list suppliers and items, CSV import; uses apiGet, apiPostFormData.
 * @see docs/CODE_REFERENCE.md
 */
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { 
  Plus, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Loader2,
  Filter,
  X
} from 'lucide-react'
import type { Supplier, SupplierItem } from '@shared/schemas'
import { apiGet, apiPostFormData } from '../../lib/api'

type SupplierWithId = Supplier & { id: string }
type SupplierItemWithId = SupplierItem & { id: string }

type SuppliersResponse = {
  data: SupplierWithId[]
}

type SupplierItemsResponse = {
  data: SupplierItemWithId[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)

export default function SupplierHubView() {
  const [suppliers, setSuppliers] = useState<SupplierWithId[]>([])
  const [items, setItems] = useState<SupplierItemWithId[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [isImportExpanded, setIsImportExpanded] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const importRef = useRef<HTMLDivElement | null>(null)
  
  // URL param filters
  const highlightImport = searchParams.get('focus') === 'import'
  const supplierFilter = searchParams.get('supplier') ?? ''
  const brandFilter = searchParams.get('brand') ?? ''
  const availabilityFilter = searchParams.get('availability') ?? ''
  const importSupplierId = searchParams.get('importSupplier') ?? ''

  const hasActiveFilters = supplierFilter || brandFilter || availabilityFilter

  const setFilter = useCallback((key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  const clearFilters = useCallback(() => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('supplier')
    newParams.delete('brand')
    newParams.delete('availability')
    setSearchParams(newParams)
  }, [searchParams, setSearchParams])

  // Get unique brands from items for filter dropdown
  const brands = useMemo(() => {
    return Array.from(new Set(items.map(item => item.brand))).sort()
  }, [items])

  // Filter items based on URL params
  const filteredItems = useMemo(() => {
    let filtered = items
    if (supplierFilter) {
      filtered = filtered.filter(item => item.supplierId === supplierFilter)
    }
    if (brandFilter) {
      filtered = filtered.filter(item => item.brand.toLowerCase().includes(brandFilter.toLowerCase()))
    }
    if (availabilityFilter) {
      filtered = filtered.filter(item => item.availability === availabilityFilter)
    }
    return filtered
  }, [items, supplierFilter, brandFilter, availabilityFilter])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (highlightImport) {
      setIsImportExpanded(true)
      setTimeout(() => {
        importRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [highlightImport])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [suppliersRes, itemsRes] = await Promise.all([
        apiGet<SuppliersResponse>('/suppliers'),
        apiGet<SupplierItemsResponse>('/suppliers/items/all'),
      ])
      setSuppliers(suppliersRes.data)
      setItems(itemsRes.data)
      setError(null)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load data'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0])
      setImportResult(null)
    }
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvFile || !importSupplierId) {
      toast.error('Please select a supplier and file')
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('supplierId', importSupplierId)

      const data = await apiPostFormData<{ message?: string; data?: unknown }>('/suppliers/import', formData)
      setImportResult(data.message || 'Import completed')
      setCsvFile(null)
      await loadData()
      toast.success('Import completed successfully')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed'
      setImportResult(`Error: ${message}`)
      toast.error(message)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Connected Sources</h1>
        <p className="text-sm text-gray-500 mt-1">Manage external inventory feeds and integrations.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading sources...</span>
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
      ) : (
        <>
          {/* Connected Sources Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="lux-card p-6 flex flex-col justify-between group hover:shadow-md transition-all">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2 rounded-lg ${
                      supplier.status === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                      supplier.status === 'active' ? 'bg-green-100 text-green-700' : 
                      supplier.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {supplier.status}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-gray-900 mb-1">{supplier.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5em]">{supplier.notes}</p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="text-xs font-medium text-gray-500">
                    {supplier.itemCount || 0} ITEMS
                  </div>
                  <button className="flex items-center gap-1 text-xs font-bold text-gray-900 uppercase tracking-wide hover:text-blue-600 transition-colors">
                    Catalog
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Connect New Source Card */}
            <button className="lux-card p-6 flex flex-col items-center justify-center text-center border-dashed border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-gray-900 transition-colors mb-3">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="font-medium text-gray-900">Connect Source</h3>
              <p className="text-xs text-gray-500 mt-1">Add a new supplier feed</p>
            </button>
          </div>

          {/* Gallery / Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Recent Arrivals
                {hasActiveFilters && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({filteredItems.length} items)
                  </span>
                )}
              </h2>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Filter className="h-4 w-4" />
                <span>Filter:</span>
              </div>
              
              {/* Supplier Filter */}
              <div className="relative">
                <select
                  value={supplierFilter}
                  onChange={(e) => setFilter('supplier', e.target.value)}
                  className="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Brand Filter */}
              <div className="relative">
                <select
                  value={brandFilter}
                  onChange={(e) => setFilter('brand', e.target.value)}
                  className="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">All Brands</option>
                  {brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Availability Filter */}
              <div className="relative">
                <select
                  value={availabilityFilter}
                  onChange={(e) => setFilter('availability', e.target.value)}
                  className="appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">All Status</option>
                  <option value="uploaded">Uploaded</option>
                  <option value="sold">Sold</option>
                  <option value="waiting">Waiting</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>

            {filteredItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
                <FileText className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                <p className="text-gray-500 font-medium">
                  {hasActiveFilters ? 'No items match your filters' : 'No supplier items yet'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {hasActiveFilters 
                    ? 'Try adjusting your filters or clear them to see all items.' 
                    : 'Connect a source and run an import to see items here.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                {filteredItems.slice(0, 20).map((item) => (
                  <div key={item.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={item.imageUrl || `https://placehold.co/400x400?text=${encodeURIComponent(item.brand)}`} 
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => { e.currentTarget.src = `https://placehold.co/400x400?text=${encodeURIComponent(item.brand)}` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <div className="text-white text-xs font-bold">{item.brand}</div>
                      <div className="text-white/80 text-[10px] truncate">{item.title}</div>
                      <div className="text-white font-mono text-xs mt-1">{formatCurrency(item.askPriceEur)}</div>
                    </div>
                    <div className="absolute top-2 right-2">
                       <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full bg-white/90 shadow-sm text-[10px] font-bold ${
                          item.brand === 'Hermès' ? 'text-orange-600' : 'text-gray-900'
                       }`}>
                          {item.brand[0]}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin / Import Section */}
          <div ref={importRef} className="border-t border-gray-200 pt-8">
            <button 
              onClick={() => setIsImportExpanded(!isImportExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Admin / Data Import</span>
              {isImportExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {isImportExpanded && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-base font-semibold text-gray-900">Import Supplier CSV</h2>
                  <a href="#" className="text-xs text-blue-600 hover:underline">Download template</a>
                </div>
                
                <form onSubmit={handleImport} className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                      Select Supplier
                    </label>
                    <select
                      value={importSupplierId}
                      onChange={(e) => setFilter('importSupplier', e.target.value)}
                      required
                      className="lux-input"
                    >
                      <option value="">Choose a supplier...</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                      CSV File
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      required
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-900 file:text-white hover:file:bg-gray-800"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isImporting}
                      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {isImporting ? 'Processing Import...' : 'Run Import'}
                    </button>
                  </div>

                  {importResult && (
                    <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${
                      importResult.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {importResult.startsWith('Error') ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      {importResult}
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
