import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Supplier, SupplierItem } from '@shared/schemas'
import { apiGet } from '../../lib/api'

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
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const importRef = useRef<HTMLDivElement | null>(null)
  const highlightImport = searchParams.get('focus') === 'import'

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (highlightImport && importRef.current) {
      importRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
    if (!csvFile || !selectedSupplierId) {
      alert('Please select a supplier and file')
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('supplierId', selectedSupplierId)

      const response = await fetch('/api/suppliers/import', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Import failed')
      }

      const data = await response.json()
      setImportResult(data.message || 'Import completed')
      setCsvFile(null)
      
      // Reload items
      await loadData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed'
      setImportResult(`Error: ${message}`)
    } finally {
      setIsImporting(false)
    }
  }

  const handleAddToBuyList = async (item: SupplierItemWithId) => {
    if (!confirm(`Add ${item.title} to buying list?`)) return

    try {
      const response = await fetch('/api/buying-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'supplier',
          supplierId: item.supplierId,
          supplierItemId: item.id,
          brand: item.brand,
          model: item.title,
          category: 'handbag',
          condition: item.conditionRank,
          colour: '',
          targetBuyPriceEur: item.askPriceEur,
          status: 'pending',
          notes: `From supplier item: ${item.externalId}`,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to add to buying list')
      }

      alert('Added to buying list!')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to add to buying list'
      alert(message)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Supplier Hub</h1>
        <p className="text-sm text-gray-500">
          Manage suppliers and import supplier items
        </p>
      </div>

      {/* CSV Import */}
      <div
        ref={importRef}
        className={`rounded-lg border border-gray-200 bg-white p-6 ${
          highlightImport ? 'ring-2 ring-gray-900/20' : ''
        }`}
      >
        <h2 className="mb-4 text-lg font-medium text-gray-900">
          Import Brand Street Tokyo CSV
        </h2>
        <form onSubmit={handleImport} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CSV File *
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isImporting}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isImporting ? 'Importing...' : 'Import CSV'}
          </button>
          {importResult && (
            <div
              className={`rounded-md border p-3 text-sm ${
                importResult.startsWith('Error')
                  ? 'border-red-200 bg-red-50 text-red-600'
                  : 'border-green-200 bg-green-50 text-green-600'
              }`}
            >
              {importResult}
            </div>
          )}
        </form>
      </div>

      {/* Supplier Items Feed */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium text-gray-900">
          Supplier Items ({items.length})
        </h2>
        {isLoading ? (
          <div className="text-sm text-gray-500">Loading items...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-6">
            No supplier items yet. Import a CSV to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Condition
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Ask Price
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500">{item.brand}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.sku}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.conditionRank}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {formatCurrency(item.askPriceEur)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          item.availability === 'uploaded'
                            ? 'bg-green-100 text-green-800'
                            : item.availability === 'sold'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {item.availability}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.availability === 'uploaded' ? (
                        <button
                          type="button"
                          onClick={() => handleAddToBuyList(item)}
                          className="rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-800"
                        >
                          Add to Buy List
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
