/**
 * Product detail side drawer: view/edit product, images, transactions; uses apiGet, apiPut, apiPost, apiDelete.
 * @see docs/CODE_REFERENCE.md
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { useScrollLock } from '../../lib/useScrollLock'
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
  Search,
} from 'lucide-react'
import type { Product, ProductImage } from '@shared/schemas'
import { apiGet, apiPut, apiPost, apiDelete, apiPostFormData, ApiError } from '../../lib/api'
import { PLACEHOLDER_IMAGE, PLACEHOLDER_IMAGE_SMALL } from '../../lib/placeholder'
import ConfirmationModal from '../../components/common/ConfirmationModal'

type ProductWithId = Product & { id: string }

interface ProductDetailDrawerProps {
  productId: string | null
  onClose: () => void
  onProductUpdated?: (product: ProductWithId) => void
  onProductDeleted?: (id: string) => void
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
    case 'sold': return 'bg-lux-100 text-lux-700 border-lux-200'
    case 'reserved': return 'bg-amber-100 text-amber-700 border-amber-200'
    default: return 'bg-lux-100 text-lux-700 border-lux-200'
  }
}

export default function ProductDetailDrawer({
  productId,
  onClose,
  onProductUpdated,
  onProductDeleted,
}: ProductDetailDrawerProps) {
  const [product, setProduct] = useState<ProductWithId | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('details')
  const [editedFields, setEditedFields] = useState<Partial<Product>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [openSellInvoiceSignal, setOpenSellInvoiceSignal] = useState(0)

  useScrollLock(true)

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

  const handleDeleteProduct = useCallback(async () => {
    if (!product?.id) return
    setIsDeleting(true)
    try {
      await apiDelete(`/products/${product.id}`)
      toast.success('Product deleted')
      onProductDeleted?.(product.id)
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }, [product, onClose, onProductDeleted])

  if (!productId) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-lux-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 border-l border-lux-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-lux-200 bg-lux-50/80">
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-10 w-10 rounded-lg bg-lux-100 animate-pulse" />
            ) : product?.imageUrls?.[0] ? (
              <img
                src={product.imageUrls[0]}
                alt=""
                className="h-10 w-10 rounded-lg object-cover border border-lux-200"
                onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE_SMALL }}
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-lux-100 border border-lux-200 flex items-center justify-center">
                <Package className="h-5 w-5 text-lux-400" />
              </div>
            )}
            <div>
              {isLoading ? (
                <>
                  <div className="h-5 w-32 bg-lux-100 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-lux-50 rounded animate-pulse mt-1" />
                </>
              ) : (
                <>
                  <h2 className="font-semibold text-lux-900">
                    {product?.brand} {product?.title || product?.model}
                  </h2>
                  <p className="text-xs text-lux-500 font-mono">
                    {product?.sku || `BA${product?.id.slice(-4)}`}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && product && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="rounded-lg p-2 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                aria-label="Delete product"
              >
                {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-lux-400 hover:text-lux-600 hover:bg-lux-100 transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-lux-200 px-6 bg-white">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none ${activeTab === tab.id
                ? 'border-lux-gold text-lux-800'
                : 'border-transparent text-lux-500 hover:text-lux-700 hover:border-lux-200'
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
            <div className="flex items-center justify-center gap-2 py-12 text-lux-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading product...</span>
            </div>
          ) : !product ? (
            <div className="text-center py-12 text-lux-500">Product not found</div>
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
                  onStatusChange={(status) => {
                    if (status === 'sold') {
                      setActiveTab('history')
                      setOpenSellInvoiceSignal((prev) => prev + 1)
                      return
                    }
                    handleFieldChange('status', status)
                  }}
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
                  product={product}
                  sellPrice={product.sellPriceEur}
                  openSellInvoiceSignal={openSellInvoiceSignal}
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
          <div className="border-t border-lux-200 px-6 py-4 bg-lux-50/80 flex items-center justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-lux-500 hover:text-lux-700 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="lux-btn-primary flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
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

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message={`Are you sure you want to delete "${product?.brand} ${product?.title || product?.model}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isConfirming={isDeleting}
      />
    </>
  )
}

// === Tab Components ===

interface VisualSearchResult {
  productId?: string
  supplierItemId?: string
  imageUrl?: string
  title?: string
  score: number
}

interface ImagesTabProps {
  product: ProductWithId
  onProductUpdated: (product: ProductWithId) => void
}

function ImagesTab({ product, onProductUpdated }: ImagesTabProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isFindingSimilar, setIsFindingSimilar] = useState(false)
  const [visualResults, setVisualResults] = useState<VisualSearchResult[] | null>(null)
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

  const primaryImageUrl = images[0]?.url ?? legacyUrls[0]
  const handleFindSimilar = async () => {
    if (!primaryImageUrl) return
    setIsFindingSimilar(true)
    setVisualResults(null)
    try {
      const { data } = await apiPost<{ data: { results: VisualSearchResult[] } }>('/search/visual', {
        imageUrl: primaryImageUrl,
      })
      const results = (data?.results ?? []).filter((r) => r.productId !== product.id)
      setVisualResults(results)
      toast.success(results.length ? `Found ${results.length} similar items` : 'No similar items found')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Find similar failed'
      toast.error(msg)
    } finally {
      setIsFindingSimilar(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lux-900">Product Images</h3>
        <div className="flex items-center gap-2">
          {primaryImageUrl && (
            <button
              type="button"
              onClick={handleFindSimilar}
              disabled={isFindingSimilar}
              className="lux-btn-secondary text-sm flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
            >
              {isFindingSimilar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isFindingSimilar ? 'Finding…' : 'Find similar'}
            </button>
          )}
          <input
            ref={fileInputRef}
            id="product-images-upload"
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            aria-label="Upload product image"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="lux-btn-secondary text-sm flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Upload
          </button>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${isDragOver
          ? 'border-lux-600 bg-lux-200/80'
          : 'border-lux-300 bg-lux-50 hover:bg-lux-100'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <Upload className="mx-auto h-6 w-6 text-lux-400 mb-2" />
        <p className="text-sm text-lux-600">
          {isUploading ? 'Uploading...' : 'Drag and drop an image, or click Upload'}
        </p>
        <p className="text-xs text-lux-400 mt-1">PNG, JPG up to 10MB</p>
      </div>

      {/* Images Grid */}
      {hasImages && (
        <div className="grid grid-cols-2 gap-4">
          {/* New format images */}
          {images.map((img) => (
            <div
              key={img.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-lux-200 group"
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
                  className="px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5 border border-transparent shadow-sm focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
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
              className="relative aspect-square rounded-lg overflow-hidden border border-lux-200"
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
          <ImageIcon className="mx-auto h-8 w-8 text-lux-300 mb-2" />
          <p className="text-sm text-lux-400">No images yet</p>
        </div>
      )}

      {visualResults !== null && (
        <div className="pt-4 border-t border-lux-200">
          <h3 className="font-medium text-lux-900 mb-2">Visually similar items</h3>
          {visualResults.length === 0 ? (
            <p className="text-sm text-lux-500">No similar items in the index.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {visualResults.map((r, i) => (
                <div key={i} className="rounded-lg border border-lux-200 overflow-hidden bg-white">
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt="" className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-lux-100 flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-lux-400" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-xs text-lux-900 truncate" title={r.title}>{r.title ?? '—'}</p>
                    <p className="text-xs text-lux-500">{Math.round(r.score * 100)}% match</p>
                    {r.productId && (
                      <a href={`/inventory?highlight=${r.productId}`} className="text-xs text-lux-gold hover:underline mt-0.5 inline-block focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none rounded-sm">
                        View in Inventory
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface DetailsTabProps {
  product: ProductWithId
  getCurrentValue: <K extends keyof Product>(field: K) => Product[K]
  onFieldChange: (field: keyof Product, value: unknown) => void
  onStatusChange: (status: Product['status']) => void
}

function DetailsTab({ product, getCurrentValue, onFieldChange, onStatusChange }: DetailsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="product-details-sku" className="block text-sm font-medium text-lux-700 mb-1">SKU</label>
        <input
          id="product-details-sku"
          type="text"
          value={getCurrentValue('sku') ?? ''}
          onChange={(e) => onFieldChange('sku', e.target.value)}
          className="lux-input"
          placeholder="e.g. 28643AV"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="product-details-brand" className="block text-sm font-medium text-lux-700 mb-1">Brand</label>
          <input
            id="product-details-brand"
            type="text"
            value={getCurrentValue('brand')}
            onChange={(e) => onFieldChange('brand', e.target.value)}
            className="lux-input"
          />
        </div>
        <div>
          <label htmlFor="product-details-model" className="block text-sm font-medium text-lux-700 mb-1">Model</label>
          <input
            id="product-details-model"
            type="text"
            value={getCurrentValue('model')}
            onChange={(e) => onFieldChange('model', e.target.value)}
            className="lux-input"
          />
        </div>
      </div>
      <div>
        <label htmlFor="product-details-title" className="block text-sm font-medium text-lux-700 mb-1">Title</label>
        <input
          id="product-details-title"
          type="text"
          value={getCurrentValue('title') ?? ''}
          onChange={(e) => onFieldChange('title', e.target.value)}
          className="lux-input"
          placeholder="Full product title"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="product-details-category" className="block text-sm font-medium text-lux-700 mb-1">Category</label>
          <input
            id="product-details-category"
            type="text"
            value={getCurrentValue('category') ?? ''}
            onChange={(e) => onFieldChange('category', e.target.value)}
            placeholder="e.g., Handbag, Watch"
            className="lux-input"
          />
        </div>
        <div>
          <label htmlFor="product-details-condition" className="block text-sm font-medium text-lux-700 mb-1">Condition</label>
          <input
            id="product-details-condition"
            type="text"
            value={getCurrentValue('condition') ?? ''}
            onChange={(e) => onFieldChange('condition', e.target.value)}
            placeholder="e.g., Excellent, Good"
            className="lux-input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="product-details-colour" className="block text-sm font-medium text-lux-700 mb-1">Colour</label>
        <input
          id="product-details-colour"
          type="text"
          value={getCurrentValue('colour') ?? ''}
          onChange={(e) => onFieldChange('colour', e.target.value)}
          placeholder="e.g., Black, Navy"
          className="lux-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="product-details-status" className="block text-sm font-medium text-lux-400 mb-1">Status</label>
          <div className="relative">
            <select
              id="product-details-status"
              value={getCurrentValue('status')}
              onChange={(e) => onStatusChange(e.target.value as Product['status'])}
              className="lux-input appearance-none pr-10 w-full"
            >
              <option value="in_stock">In Stock</option>
              <option value="sold">Sold</option>
              <option value="reserved">Reserved</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lux-500 pointer-events-none" />
          </div>
        </div>
        <div>
          <label htmlFor="product-details-quantity" className="block text-sm font-medium text-lux-400 mb-1">Quantity</label>
          <input
            id="product-details-quantity"
            type="number"
            min="0"
            value={getCurrentValue('quantity')}
            onChange={(e) => onFieldChange('quantity', parseInt(e.target.value) || 0)}
            className="lux-input"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-lux-200">
        <h4 className="text-sm font-medium text-lux-700 mb-3">Record Info</h4>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-lux-500">Created</dt>
            <dd className="font-medium text-lux-900">
              {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-lux-500">Updated</dt>
            <dd className="font-medium text-lux-900">
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
  const customsEur = getCurrentValue('customsEur') ?? 0
  const vatEur = getCurrentValue('vatEur') ?? 0
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
          <label htmlFor="product-financials-cost" className="block text-sm font-medium text-lux-700 mb-1">Purchase / Cost (EUR)</label>
          <div className="relative">
            <span className="absolute left-px top-1/2 -translate-y-1/2 text-lux-400">€</span>
            <input
              id="product-financials-cost"
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
          <label htmlFor="product-financials-sell" className="block text-sm font-medium text-lux-700 mb-1">Sell Price (EUR)</label>
          <div className="relative">
            <span className="absolute left-px top-1/2 -translate-y-1/2 text-lux-400">€</span>
            <input
              id="product-financials-sell"
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="product-financials-customs" className="block text-sm font-medium text-lux-700 mb-1">Customs (EUR)</label>
          <div className="relative">
            <span className="absolute left-px top-1/2 -translate-y-1/2 text-lux-400">€</span>
            <input
              id="product-financials-customs"
              type="number"
              min="0"
              step="0.01"
              value={customsEur}
              onChange={(e) => onFieldChange('customsEur', parseFloat(e.target.value) || 0)}
              className="lux-input pl-7"
            />
          </div>
        </div>
        <div>
          <label htmlFor="product-financials-vat" className="block text-sm font-medium text-lux-700 mb-1">VAT (EUR)</label>
          <div className="relative">
            <span className="absolute left-px top-1/2 -translate-y-1/2 text-lux-400">€</span>
            <input
              id="product-financials-vat"
              type="number"
              min="0"
              step="0.01"
              value={vatEur}
              onChange={(e) => onFieldChange('vatEur', parseFloat(e.target.value) || 0)}
              className="lux-input pl-7"
            />
          </div>
        </div>
      </div>

      {/* VAT (from settings rate) */}
      {sellPrice > 0 && vatInfo && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-5">
          <div className="text-sm text-lux-700">
            VAT (at {vatInfo.ratePct}%): <span className="font-semibold text-lux-900">{formatCurrency(vatInfo.vatEur)}</span>
            <span className="text-lux-500 ml-1">— sell price treated as gross</span>
          </div>
        </div>
      )}

      {/* Margin Summary */}
      <div className="rounded-lg bg-lux-50 border border-lux-200 p-5">
        <h4 className="text-sm font-medium text-lux-700 mb-4">Margin Analysis</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-lux-900">{formatCurrency(margin)}</div>
            <div className="text-xs text-lux-500 mt-1">Profit</div>
          </div>
          <div className="text-center border-x border-lux-200">
            <div className={`text-xl sm:text-2xl font-bold ${marginPct >= 20 ? 'text-emerald-600' : marginPct >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
              {marginPct.toFixed(1)}%
            </div>
            <div className="text-xs text-lux-500 mt-1">Margin %</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl font-bold text-lux-900">
              {costPrice > 0 ? ((sellPrice / costPrice - 1) * 100).toFixed(1) : '0.0'}%
            </div>
            <div className="text-xs text-lux-500 mt-1">Markup %</div>
          </div>
        </div>
      </div>

      {/* Price History placeholder */}
      <div className="pt-4 border-t border-lux-200">
        <h4 className="text-sm font-medium text-lux-700 mb-3">Price Comparison</h4>
        <div className="rounded-lg border border-dashed border-lux-200 p-6 text-center">
          <DollarSign className="mx-auto h-6 w-6 text-lux-400 mb-2" />
          <p className="text-sm text-lux-500">
            Price history and market comparison coming soon
          </p>
        </div>
      </div>
    </div>
  )
}

interface HistoryTabProps {
  productId: string
  product: ProductWithId
  sellPrice: number
  openSellInvoiceSignal: number
  onProductUpdated?: () => void
}

interface Transaction {
  id: string
  type: 'purchase' | 'sale' | 'adjustment'
  amountEur: number
  occurredAt: string
  notes?: string
}

function HistoryTab({ productId, product, sellPrice, openSellInvoiceSignal, onProductUpdated }: HistoryTabProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState<'sale' | 'adjustment' | null>(null)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [invoiceCustomerName, setInvoiceCustomerName] = useState('')
  const [invoiceCustomerEmail, setInvoiceCustomerEmail] = useState('')
  const [invoiceDescription, setInvoiceDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const resetSaleModalState = useCallback(() => {
    setAmount(String(sellPrice))
    setNotes('')
    setInvoiceCustomerName('')
    setInvoiceCustomerEmail('')
    setInvoiceDescription(product.title?.trim() || `${product.brand} ${product.model}`.trim())
  }, [product.brand, product.model, product.title, sellPrice])

  const handleOpenModal = (type: 'sale' | 'adjustment') => {
    setShowModal(type)
    if (type === 'sale') {
      resetSaleModalState()
      return
    }
    setAmount('')
    setNotes('')
  }

  useEffect(() => {
    if (openSellInvoiceSignal > 0) {
      handleOpenModal('sale')
    }
  }, [openSellInvoiceSignal])

  const handleCloseModal = () => {
    setShowModal(null)
    setAmount('')
    setNotes('')
  }

  const handleSubmit = async () => {
    if (!showModal || !amount) return

    setIsSubmitting(true)
    try {
      if (showModal === 'sale') {
        await apiPost(`/products/${productId}/sell-with-invoice`, {
          amountEur: parseFloat(amount),
          customerName: invoiceCustomerName || undefined,
          customerEmail: invoiceCustomerEmail || undefined,
          notes: notes || undefined,
          description: invoiceDescription || undefined,
        })
        toast.success('Sale and invoice created')
      } else {
        await apiPost(`/products/${productId}/transactions`, {
          type: 'adjustment',
          amountEur: parseFloat(amount),
          notes: notes || undefined,
        })
        toast.success('Adjustment recorded')
      }
      handleCloseModal()
      fetchTransactions()
      onProductUpdated?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save transaction'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'bg-lux-200 text-lux-800'
      case 'sale': return 'bg-emerald-100 text-emerald-700'
      case 'adjustment': return 'bg-amber-100 text-amber-700'
      default: return 'bg-lux-100 text-lux-700'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lux-900">Transaction History</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenModal('sale')}
            className="lux-btn-primary text-sm flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            <DollarSign className="h-4 w-4" />
            Record Sale
          </button>
          <button
            onClick={() => handleOpenModal('adjustment')}
            className="lux-btn-secondary text-sm flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            <Plus className="h-4 w-4" />
            Adjustment
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-lux-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading history...</span>
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-lux-300 p-8 text-center bg-lux-50">
          <History className="mx-auto h-8 w-8 text-lux-400 mb-3" />
          <p className="text-sm text-lux-900 font-medium">No transactions yet</p>
          <p className="text-xs text-lux-500 mt-1">
            Record a sale or adjustment to track this product's history
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-lg border border-lux-200 p-5"
            >
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeColor(tx.type)}`}>
                  {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                </span>
                <div>
                  <div className="text-sm font-medium text-lux-900">
                    {formatCurrency(tx.amountEur)}
                  </div>
                  <div className="text-xs text-lux-500">
                    {new Date(tx.occurredAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {tx.notes && (
                <p className="text-sm text-lux-500 truncate max-w-[200px]">{tx.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={handleCloseModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lux-card shadow-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-lux-900">
                  {showModal === 'sale' ? 'Record Sale + Create Invoice' : 'Record Adjustment'}
                </h3>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="text-lux-400 hover:text-lux-600 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                  aria-label="Close transaction dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div>
                <label htmlFor="product-transaction-amount" className="block text-sm font-medium text-lux-700 mb-1">Amount (EUR)</label>
                <div className="relative">
                  <span className="absolute left-px top-1/2 -translate-y-1/2 text-lux-400">€</span>
                  <input id="product-transaction-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="lux-input pl-7" autoFocus />
                </div>
              </div>

              {showModal === 'sale' && (
                <>
                  <div>
                    <label htmlFor="product-transaction-description" className="block text-sm font-medium text-lux-700 mb-1">Description</label>
                    <input id="product-transaction-description" type="text" value={invoiceDescription} onChange={(e) => setInvoiceDescription(e.target.value)} placeholder="Invoice line description" className="lux-input w-full" />
                  </div>
                  <div>
                    <label htmlFor="product-transaction-customer-name" className="block text-sm font-medium text-lux-700 mb-1">Customer name (optional)</label>
                    <input id="product-transaction-customer-name" type="text" value={invoiceCustomerName} onChange={(e) => setInvoiceCustomerName(e.target.value)} placeholder="e.g. John Smith" className="lux-input w-full" />
                  </div>
                  <div>
                    <label htmlFor="product-transaction-customer-email" className="block text-sm font-medium text-lux-700 mb-1">Customer email (optional)</label>
                    <input id="product-transaction-customer-email" type="email" value={invoiceCustomerEmail} onChange={(e) => setInvoiceCustomerEmail(e.target.value)} placeholder="customer@example.com" className="lux-input w-full" />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="product-transaction-notes" className="block text-sm font-medium text-lux-700 mb-1">Notes (optional)</label>
                <textarea id="product-transaction-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={showModal === 'sale' ? 'e.g., Sold via Vestiaire Collective' : 'e.g., Price reduction'} rows={3} className="lux-input resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={handleCloseModal} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-lux-700 hover:text-lux-900 transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none">Cancel</button>
                <button onClick={handleSubmit} disabled={isSubmitting || !amount} className="lux-btn-primary flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {showModal === 'sale' ? 'Record Sale + Invoice' : 'Record Adjustment'}
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
      <h3 className="font-medium text-lux-900">Product Notes</h3>
      <label htmlFor="product-notes" className="sr-only">Product notes</label>
      <textarea
        id="product-notes"
        value={getCurrentValue('notes') ?? ''}
        onChange={(e) => onFieldChange('notes', e.target.value)}
        placeholder="Add notes about this product (condition details, provenance, special instructions...)"
        rows={10}
        className="lux-input resize-none"
      />
      <p className="text-xs text-lux-400">
        Notes are internal only and won't be shown to customers.
      </p>
    </div>
  )
}
