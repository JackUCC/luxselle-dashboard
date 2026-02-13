/**
 * Product detail side drawer: view/edit product, images, transactions; uses apiGet, apiPut, apiPost, apiDelete.
 * @see docs/CODE_REFERENCE.md
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  X,
  Image as ImageIcon,
  FileText,
  DollarSign,
  History,
  StickyNote,
  Loader2,
  Save,
  ChevronDown,
  Package,
  Plus,
  Upload,
  Trash2,
} from 'lucide-react'
import type { Product, ProductImage } from '@shared/schemas'
import { apiGet, apiPut, apiPost, apiDelete, apiPostFormData, ApiError } from '../../lib/api'
import { PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE_SMALL } from '../../lib/placeholder'

type ProductWithId = Product & { id: string }

interface ProductDetailDrawerProps {
  productId: string | null
  onClose: () => void
  onProductUpdated?: (product: ProductWithId) => void
}

type TabId = 'images' | 'details' | 'financials' | 'history' | 'notes'

const tabs: { id: TabId; label: string; icon: typeof ImageIcon }[] = [
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'details', label: 'Details', icon: FileText },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'history', label: 'History', icon: History },
  { id: 'notes', label: 'Notes', icon: StickyNote },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value)

const getStatusColor = (status: string) => {
  switch (status) {
    case 'in_stock': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'sold': return 'bg-gray-100 text-gray-700 border-gray-200'
    case 'reserved': return 'bg-amber-100 text-amber-700 border-amber-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function ProductDetailDrawer({
  productId,
  onClose,
  onProductUpdated,
}: ProductDetailDrawerProps) {
  const [product, setProduct] = useState<ProductWithId | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('details')
  const [editedFields, setEditedFields] = useState<Partial<Product>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch product data
  useEffect(() => {
    if (!productId) return

    setIsLoading(true)
    setEditedFields({})
    setHasChanges(false)

    apiGet<{ data: ProductWithId }>(`/products/${productId}`)
      .then((response) => {
        setProduct(response.data)
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load product'
        toast.error(message)
        onClose()
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [productId, onClose])

  const handleFieldChange = useCallback((field: keyof Product, value: unknown) => {
    setEditedFields((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!product || !hasChanges) return

    setIsSaving(true)
    try {
      const response = await apiPut<{ data: ProductWithId }>(`/products/${product.id}`, {
        ...product,
        ...editedFields,
      })
      setProduct(response.data)
      setEditedFields({})
      setHasChanges(false)
      onProductUpdated?.(response.data)
      toast.success('Product updated')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update product'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }, [product, editedFields, hasChanges, onProductUpdated])

  const handleCancel = useCallback(() => {
    setEditedFields({})
    setHasChanges(false)
  }, [])

  const getCurrentValue = <K extends keyof Product>(field: K): Product[K] => {
    if (field in editedFields) {
      return editedFields[field] as Product[K]
    }
    return product?.[field] as Product[K]
  }

  if (!productId) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 border-l border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-10 w-10 rounded-lg bg-gray-100 animate-pulse" />
            ) : product?.imageUrls?.[0] ? (
              <img
                src={product.imageUrls[0]}
                alt=""
                className="h-10 w-10 rounded-lg object-cover border border-gray-200"
                onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE_SMALL }}
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                <Package className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <div>
              {isLoading ? (
                <>
                  <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-gray-50 rounded animate-pulse mt-1" />
                </>
              ) : (
                <>
                  <h2 className="font-semibold text-gray-900">
                    {product?.brand} {product?.model}
                  </h2>
                  <p className="text-xs text-gray-500 font-mono">
                    BA{product?.id.slice(-4)}
                  </p>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 bg-white">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading product...</span>
            </div>
          ) : !product ? (
            <div className="text-center py-12 text-gray-500">Product not found</div>
          ) : (
            <>
              {activeTab === 'images' && (
                <ImagesTab
                  product={product}
                  onProductUpdated={(updated) => {
                    setProduct(updated)
                    onProductUpdated?.(updated)
                  }}
                />
              )}
              {activeTab === 'details' && (
                <DetailsTab
                  product={product}
                  getCurrentValue={getCurrentValue}
                  onFieldChange={handleFieldChange}
                />
              )}
              {activeTab === 'financials' && (
                <FinancialsTab
                  product={product}
                  getCurrentValue={getCurrentValue}
                  onFieldChange={handleFieldChange}
                />
              )}
              {activeTab === 'history' && (
                <HistoryTab
                  productId={product.id}
                  sellPrice={product.sellPriceEur}
                  onProductUpdated={() => {
                    // Refetch product to get updated status
                    apiGet<{ data: ProductWithId }>(`/products/${product.id}`).then((response) => {
                      setProduct(response.data)
                      onProductUpdated?.(response.data)
                    })
                  }}
                />
              )}
              {activeTab === 'notes' && (
                <NotesTab
                  getCurrentValue={getCurrentValue}
                  onFieldChange={handleFieldChange}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {hasChanges && !isLoading && (
          <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 flex items-center justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="lux-btn-primary flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// === Tab Components ===

interface ImagesTabProps {
  product: ProductWithId
  onProductUpdated: (product: ProductWithId) => void
}

function ImagesTab({ product, onProductUpdated }: ImagesTabProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use new images array if available, fall back to legacy imageUrls
  const images: ProductImage[] = product.images ?? []
  const legacyUrls = product.imageUrls ?? []
  const hasImages = images.length > 0 || legacyUrls.length > 0

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const { product: updatedProduct } = await apiPostFormData<{ product: ProductWithId }>(
        `/products/${product.id}/images`,
        formData,
      )
      if (updatedProduct) onProductUpdated(updatedProduct)
      toast.success('Image uploaded')
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to upload image'
      toast.error(message)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (imageId: string) => {
    setDeletingId(imageId)
    try {
      const response = await apiDelete(`/products/${product.id}/images/${imageId}`)
      onProductUpdated(response as unknown as ProductWithId)
      toast.success('Image deleted')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete image'
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Product Images</h3>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="lux-btn-secondary text-sm flex items-center gap-2"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Upload
        </button>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${isDragOver
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <Upload className="mx-auto h-6 w-6 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          {isUploading ? 'Uploading...' : 'Drag and drop an image, or click Upload'}
        </p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
      </div>

      {/* Images Grid */}
      {hasImages && (
        <div className="grid grid-cols-2 gap-4">
          {/* New format images */}
          {images.map((img) => (
            <div
              key={img.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group"
            >
              <img
                src={img.thumbnailUrl ?? img.url}
                alt="Product"
                className="h-full w-full object-cover"
                onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => handleDelete(img.id)}
                  disabled={deletingId === img.id}
                  className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5 border border-transparent shadow-sm"
                >
                  {deletingId === img.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Remove
                </button>
              </div>
            </div>
          ))}
          {/* Legacy format images (display only, no delete) */}
          {images.length === 0 && legacyUrls.map((url, index) => (
            <div
              key={`legacy-${index}`}
              className="relative aspect-square rounded-lg overflow-hidden border border-gray-200"
            >
              <img
                src={url}
                alt={`Product image ${index + 1}`}
                className="h-full w-full object-cover"
                onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE }}
              />
            </div>
          ))}
        </div>
      )}

      {!hasImages && !isUploading && (
        <div className="text-center py-4">
          <ImageIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No images yet</p>
        </div>
      )}
    </div>
  )
}

interface DetailsTabProps {
  product: ProductWithId
  getCurrentValue: <K extends keyof Product>(field: K) => Product[K]
  onFieldChange: (field: keyof Product, value: unknown) => void
}

function DetailsTab({ product, getCurrentValue, onFieldChange }: DetailsTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
          <input
            type="text"
            value={getCurrentValue('brand')}
            onChange={(e) => onFieldChange('brand', e.target.value)}
            className="lux-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <input
            type="text"
            value={getCurrentValue('model')}
            onChange={(e) => onFieldChange('model', e.target.value)}
            className="lux-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <input
            type="text"
            value={getCurrentValue('category') ?? ''}
            onChange={(e) => onFieldChange('category', e.target.value)}
            placeholder="e.g., Handbag, Watch"
            className="lux-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
          <input
            type="text"
            value={getCurrentValue('condition') ?? ''}
            onChange={(e) => onFieldChange('condition', e.target.value)}
            placeholder="e.g., Excellent, Good"
            className="lux-input"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Colour</label>
        <input
          type="text"
          value={getCurrentValue('colour') ?? ''}
          onChange={(e) => onFieldChange('colour', e.target.value)}
          placeholder="e.g., Black, Navy"
          className="lux-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
          <div className="relative">
            <select
              value={getCurrentValue('status')}
              onChange={(e) => onFieldChange('status', e.target.value)}
              className="lux-input appearance-none pr-10 w-full"
            >
              <option value="in_stock">In Stock</option>
              <option value="sold">Sold</option>
              <option value="reserved">Reserved</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Quantity</label>
          <input
            type="number"
            min="0"
            value={getCurrentValue('quantity')}
            onChange={(e) => onFieldChange('quantity', parseInt(e.target.value) || 0)}
            className="lux-input"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Record Info</h4>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="font-medium text-gray-900">
              {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Updated</dt>
            <dd className="font-medium text-gray-900">
              {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString() : '—'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

interface FinancialsTabProps {
  product: ProductWithId
  getCurrentValue: <K extends keyof Product>(field: K) => Product[K]
  onFieldChange: (field: keyof Product, value: unknown) => void
}

function FinancialsTab({ product, getCurrentValue, onFieldChange }: FinancialsTabProps) {
  const costPrice = getCurrentValue('costPriceEur') ?? 0
  const sellPrice = getCurrentValue('sellPriceEur') ?? 0
  const margin = sellPrice - costPrice
  const marginPct = sellPrice > 0 ? (margin / sellPrice) * 100 : 0
  const [vatInfo, setVatInfo] = useState<{ ratePct: number; vatEur: number } | null>(null)

  useEffect(() => {
    if (!(sellPrice > 0)) {
      setVatInfo(null)
      return
    }
    apiGet<{ ratePct: number; vatEur: number }>(
      `/vat/calculate?amountEur=${encodeURIComponent(sellPrice)}&inclVat=true`
    )
      .then((res) => setVatInfo({ ratePct: res.ratePct, vatEur: res.vatEur }))
      .catch(() => setVatInfo(null))
  }, [sellPrice])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (EUR)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costPrice}
              onChange={(e) => onFieldChange('costPriceEur', parseFloat(e.target.value) || 0)}
              className="lux-input pl-7"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sell Price (EUR)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={sellPrice}
              onChange={(e) => onFieldChange('sellPriceEur', parseFloat(e.target.value) || 0)}
              className="lux-input pl-7"
            />
          </div>
        </div>
      </div>

      {/* VAT (from settings rate) */}
      {sellPrice > 0 && vatInfo && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <div className="text-sm text-gray-700">
            VAT (at {vatInfo.ratePct}%): <span className="font-semibold text-gray-900">{formatCurrency(vatInfo.vatEur)}</span>
            <span className="text-gray-500 ml-1">— sell price treated as gross</span>
          </div>
        </div>
      )}

      {/* Margin Summary */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Margin Analysis</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(margin)}</div>
            <div className="text-xs text-gray-500 mt-1">Profit</div>
          </div>
          <div className="text-center border-x border-gray-200">
            <div className={`text-2xl font-bold ${marginPct >= 20 ? 'text-green-600' : marginPct >= 10 ? 'text-orange-600' : 'text-red-600'}`}>
              {marginPct.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Margin %</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {costPrice > 0 ? ((sellPrice / costPrice - 1) * 100).toFixed(1) : '0.0'}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Markup %</div>
          </div>
        </div>
      </div>

      {/* Price History placeholder */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Price Comparison</h4>
        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center">
          <DollarSign className="mx-auto h-6 w-6 text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">
            Price history and market comparison coming soon
          </p>
        </div>
      </div>
    </div>
  )
}

interface HistoryTabProps {
  productId: string
  sellPrice: number
  onProductUpdated?: () => void
}

interface Transaction {
  id: string
  type: 'purchase' | 'sale' | 'adjustment'
  amountEur: number
  occurredAt: string
  notes?: string
}

type SaleForInvoice = { transactionId: string; amountEur: number; productId: string }

function HistoryTab({ productId, sellPrice, onProductUpdated }: HistoryTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState<'sale' | 'adjustment' | null>(null)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saleForInvoice, setSaleForInvoice] = useState<SaleForInvoice | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceCustomerName, setInvoiceCustomerName] = useState('')
  const [invoiceCustomerEmail, setInvoiceCustomerEmail] = useState('')
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false)

  const fetchTransactions = useCallback(() => {
    setIsLoading(true)
    apiGet<{ data: Transaction[] }>(`/products/${productId}/transactions`)
      .then((response) => {
        setTransactions(response.data)
      })
      .catch(() => {
        setTransactions([])
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [productId])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleOpenModal = (type: 'sale' | 'adjustment') => {
    setShowModal(type)
    setAmount(type === 'sale' ? String(sellPrice) : '')
    setNotes('')
  }

  const handleCloseModal = () => {
    setShowModal(null)
    setAmount('')
    setNotes('')
  }

  const handleSubmit = async () => {
    if (!showModal || !amount) return

    setIsSubmitting(true)
    try {
      const res = await apiPost<{ data: { id: string; amountEur: number } }>(`/products/${productId}/transactions`, {
        type: showModal,
        amountEur: parseFloat(amount),
        notes: notes || undefined,
      })
      toast.success(showModal === 'sale' ? 'Sale recorded' : 'Adjustment recorded')
      handleCloseModal()
      fetchTransactions()
      onProductUpdated?.()
      if (showModal === 'sale' && res?.data) {
        setSaleForInvoice({
          transactionId: res.data.id,
          amountEur: res.data.amountEur,
          productId,
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create transaction'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateInvoice = async () => {
    if (!saleForInvoice) return
    setInvoiceSubmitting(true)
    try {
      await apiPost('/invoices', {
        fromSale: true,
        transactionId: saleForInvoice.transactionId,
        productId: saleForInvoice.productId,
        amountEur: saleForInvoice.amountEur,
        customerName: invoiceCustomerName || undefined,
        customerEmail: invoiceCustomerEmail || undefined,
        description: 'Sale',
      })
      toast.success('Invoice created')
      setSaleForInvoice(null)
      setShowInvoiceModal(false)
      setInvoiceCustomerName('')
      setInvoiceCustomerEmail('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invoice')
    } finally {
      setInvoiceSubmitting(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'bg-blue-100 text-blue-700'
      case 'sale': return 'bg-green-100 text-green-700'
      case 'adjustment': return 'bg-orange-100 text-orange-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Transaction History</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenModal('sale')}
            className="lux-btn-primary text-sm flex items-center gap-1.5"
          >
            <DollarSign className="h-4 w-4" />
            Record Sale
          </button>
          <button
            onClick={() => handleOpenModal('adjustment')}
            className="lux-btn-secondary text-sm flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Adjustment
          </button>
        </div>
      </div>

      {saleForInvoice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4">
          <span className="text-sm text-amber-800">
            Sale recorded ({formatCurrency(saleForInvoice.amountEur)}). Create an invoice for accounting?
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSaleForInvoice(null)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => setShowInvoiceModal(true)}
              className="lux-btn-primary text-sm"
            >
              Create invoice
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading history...</span>
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center bg-gray-50">
          <History className="mx-auto h-8 w-8 text-gray-400 mb-3" />
          <p className="text-sm text-gray-900 font-medium">No transactions yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Record a sale or adjustment to track this product's history
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeColor(tx.type)}`}>
                  {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(tx.amountEur)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(tx.occurredAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {tx.notes && (
                <p className="text-sm text-gray-500 truncate max-w-[200px]">{tx.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Transaction Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={handleCloseModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {showModal === 'sale' ? 'Record Sale' : 'Record Adjustment'}
                </h3>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (EUR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="lux-input pl-7"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={showModal === 'sale' ? 'e.g., Sold via Vestiaire Collective' : 'e.g., Price reduction'}
                  rows={3}
                  className="lux-input resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !amount}
                  className="lux-btn-primary flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {showModal === 'sale' ? 'Record Sale' : 'Record Adjustment'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create invoice modal (after sale) */}
      {showInvoiceModal && saleForInvoice && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setShowInvoiceModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Create invoice for this sale</h3>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close invoice modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Amount: {formatCurrency(saleForInvoice.amountEur)} (VAT will be calculated from settings)
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer name (optional)</label>
                <input
                  type="text"
                  value={invoiceCustomerName}
                  onChange={(e) => setInvoiceCustomerName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="lux-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer email (optional)</label>
                <input
                  type="email"
                  value={invoiceCustomerEmail}
                  onChange={(e) => setInvoiceCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="lux-input w-full"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  disabled={invoiceSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInvoice}
                  disabled={invoiceSubmitting}
                  className="lux-btn-primary flex items-center gap-2"
                >
                  {invoiceSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create invoice
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface NotesTabProps {
  getCurrentValue: <K extends keyof Product>(field: K) => Product[K]
  onFieldChange: (field: keyof Product, value: unknown) => void
}

function NotesTab({ getCurrentValue, onFieldChange }: NotesTabProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-900">Product Notes</h3>
      <textarea
        value={getCurrentValue('notes') ?? ''}
        onChange={(e) => onFieldChange('notes', e.target.value)}
        placeholder="Add notes about this product (condition details, provenance, special instructions...)"
        rows={10}
        className="lux-input resize-none"
      />
      <p className="text-xs text-gray-400">
        Notes are internal only and won't be shown to customers.
      </p>
    </div>
  )
}
