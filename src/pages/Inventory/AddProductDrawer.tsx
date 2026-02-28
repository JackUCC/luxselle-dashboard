import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { useScrollLock } from '../../lib/useScrollLock'
import {
    X,
    Loader2,
    Save,
    Upload,
    ChevronDown,
    Sparkles,
} from 'lucide-react'
import { apiPost, apiPostFormData, ApiError } from '../../lib/api'
import type { Product } from '@shared/schemas'

interface AddProductDrawerProps {
    onClose: () => void
    onProductAdded: () => void
}

const INITIAL_PRODUCT: Partial<Product> = {
    brand: '',
    model: '',
    title: '',
    sku: '',
    category: '',
    condition: '',
    colour: '',
    costPriceEur: 0,
    sellPriceEur: 0,
    customsEur: 0,
    vatEur: 0,
    quantity: 1,
    status: 'in_stock',
    notes: '',
}

export default function AddProductDrawer({ onClose, onProductAdded }: AddProductDrawerProps) {
    const [product, setProduct] = useState<Partial<Product>>(INITIAL_PRODUCT)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useScrollLock(true)

    const handleFieldChange = (field: keyof Product, value: unknown) => {
        setProduct((prev) => ({ ...prev, [field]: value }))
    }

    const handleFileSelect = (files: FileList | null) => {
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
        setSelectedImage(file)
        const url = URL.createObjectURL(file)
        setImagePreview(url)
    }

    const handleSubmit = async () => {
        // Basic validation
        if (!product.brand?.trim() || !product.model?.trim()) {
            toast.error('Brand and Model are required')
            return
        }

        setIsSubmitting(true)

        try {
            // 1. Create product
            const response = await apiPost<{ data: Product & { id: string } }>('/products', product)
            const newProduct = response.data

            // 2. Upload image if selected
            if (selectedImage) {
                const formData = new FormData()
                formData.append('image', selectedImage)
                await apiPostFormData(`/products/${newProduct.id}/images`, formData)
            }

            toast.success('Product added successfully')
            onProductAdded()
            onClose()
        } catch (err: unknown) {
            const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to add product'
            toast.error(message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <div
                className="fixed inset-0 bg-lux-500/20 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 border-l border-lux-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-lux-100 bg-lux-50/50">
                    <h2 className="text-lg font-semibold text-lux-900">Add New Product</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-lux-400 hover:text-lux-600 hover:bg-lux-100 transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                        aria-label="Close add product drawer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Image Upload */}
                        <div className="flex flex-col items-center justify-center">
                            <div
                                className="relative h-40 w-40 rounded-lux-card overflow-hidden border-2 border-dashed border-lux-300 bg-lux-50 hover:bg-lux-100 transition-colors cursor-pointer group focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-lux-400">
                                        <Upload className="h-8 w-8 mb-2" />
                                        <span className="text-xs font-medium">Add Image</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">Change</span>
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                id="add-product-image"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileSelect(e.target.files)}
                                aria-label="Upload product image"
                            />
                        </div>

                        <div>
                            <label htmlFor="add-product-sku" className="block text-sm font-medium text-lux-700 mb-1">SKU</label>
                            <input
                                id="add-product-sku"
                                type="text"
                                value={product.sku ?? ''}
                                onChange={(e) => handleFieldChange('sku', e.target.value)}
                                className="lux-input w-full"
                                placeholder="e.g. 28643AV"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="add-product-brand" className="block text-sm font-medium text-lux-700 mb-1">Brand <span className="text-red-500">*</span></label>
                                <input
                                    id="add-product-brand"
                                    type="text"
                                    value={product.brand}
                                    onChange={(e) => handleFieldChange('brand', e.target.value)}
                                    className="lux-input w-full"
                                    placeholder="e.g. Chanel"
                                />
                            </div>
                            <div>
                                <label htmlFor="add-product-model" className="block text-sm font-medium text-lux-700 mb-1">Model / Title <span className="text-red-500">*</span></label>
                                <input
                                    id="add-product-model"
                                    type="text"
                                    value={product.model}
                                    onChange={(e) => handleFieldChange('model', e.target.value)}
                                    className="lux-input w-full"
                                    placeholder="e.g. Classic Flap"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="add-product-title" className="block text-sm font-medium text-lux-700 mb-1">Full title (optional)</label>
                            <input
                                id="add-product-title"
                                type="text"
                                value={product.title ?? ''}
                                onChange={(e) => handleFieldChange('title', e.target.value)}
                                className="lux-input w-full"
                                placeholder="Full product name from invoice"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="add-product-category" className="block text-sm font-medium text-lux-700 mb-1">Category</label>
                                <input
                                    id="add-product-category"
                                    type="text"
                                    value={product.category}
                                    onChange={(e) => handleFieldChange('category', e.target.value)}
                                    className="lux-input w-full"
                                    placeholder="e.g. Handbag"
                                />
                            </div>
                            <div>
                                <label htmlFor="add-product-condition" className="block text-sm font-medium text-lux-700 mb-1">Condition</label>
                                <input
                                    id="add-product-condition"
                                    type="text"
                                    value={product.condition}
                                    onChange={(e) => handleFieldChange('condition', e.target.value)}
                                    className="lux-input w-full"
                                    placeholder="e.g. Excellent"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="add-product-colour" className="block text-sm font-medium text-lux-700 mb-1">Colour</label>
                            <input
                                id="add-product-colour"
                                type="text"
                                value={product.colour}
                                onChange={(e) => handleFieldChange('colour', e.target.value)}
                                className="lux-input w-full"
                                placeholder="e.g. Black"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="add-product-cost-price-eur" className="block text-sm font-medium text-lux-700 mb-1">Purchase / Cost (EUR)</label>
                                <div className="relative">
                                    <span className="absolute left-px top-1/2 -translate-y-1/2 text-lux-400">€</span>
                                    <input
                                        id="add-product-cost-price-eur"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={product.costPriceEur}
                                        onChange={(e) => handleFieldChange('costPriceEur', parseFloat(e.target.value) || 0)}
                                        className="lux-input pl-7 w-full"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="add-product-sell-price-eur" className="block text-sm font-medium text-lux-700 mb-1">Sell Price (EUR)</label>
                                <div className="relative">
                                    <span className="absolute left-px top-1/2 -translate-y-1/2 text-lux-400">€</span>
                                    <input
                                        id="add-product-sell-price-eur"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={product.sellPriceEur}
                                        onChange={(e) => handleFieldChange('sellPriceEur', parseFloat(e.target.value) || 0)}
                                        className="lux-input pl-7 w-full"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="add-product-customs-eur" className="block text-sm font-medium text-lux-700 mb-1">Customs (EUR)</label>
                                <div className="relative">
                                    <span className="absolute left-px top-1/2 -translate-y-1/2 text-lux-400">€</span>
                                    <input
                                        id="add-product-customs-eur"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={product.customsEur ?? 0}
                                        onChange={(e) => handleFieldChange('customsEur', parseFloat(e.target.value) || 0)}
                                        className="lux-input pl-7 w-full"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="add-product-vat-eur" className="block text-sm font-medium text-lux-700 mb-1">VAT (EUR)</label>
                                <div className="relative">
                                    <span className="absolute left-px top-1/2 -translate-y-1/2 text-lux-400">€</span>
                                    <input
                                        id="add-product-vat-eur"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={product.vatEur ?? 0}
                                        onChange={(e) => handleFieldChange('vatEur', parseFloat(e.target.value) || 0)}
                                        className="lux-input pl-7 w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="add-product-quantity" className="block text-sm font-medium text-lux-700 mb-1">Quantity</label>
                                <input
                                    id="add-product-quantity"
                                    type="number"
                                    min="0"
                                    value={product.quantity}
                                    onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 0)}
                                    className="lux-input w-full"
                                />
                            </div>
                            <div>
                                <label htmlFor="add-product-status" className="block text-sm font-medium text-lux-700 mb-1">Status</label>
                                <div className="relative">
                                    <select
                                        id="add-product-status"
                                        value={product.status}
                                        onChange={(e) => handleFieldChange('status', e.target.value)}
                                        className="lux-input appearance-none pr-10 w-full"
                                    >
                                        <option value="in_stock">In Stock</option>
                                        <option value="sold">Sold</option>
                                        <option value="reserved">Reserved</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lux-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label htmlFor="add-product-notes" className="block text-sm font-medium text-lux-700">Notes / Description</label>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!product.brand || !product.model) {
                                            toast.error('Please enter Brand and Model first')
                                            return
                                        }
                                        const toastId = toast.loading('Generating description...')
                                        try {
                                            const res = await apiPost<{ data: { description: string } }>('/ai/generate-description', { product })
                                            setProduct(prev => ({ ...prev, notes: res.data.description }))
                                            toast.success('Description generated', { id: toastId })
                                        } catch (err) {
                                            toast.error('Failed to generate', { id: toastId })
                                        }
                                    }}
                                    className="text-xs flex items-center gap-1 text-lux-gold hover:text-lux-gold font-medium focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                                >
                                    <Sparkles className="h-3 w-3" />
                                    Generate with AI
                                </button>
                            </div>
                            <textarea
                                id="add-product-notes"
                                value={product.notes}
                                onChange={(e) => handleFieldChange('notes', e.target.value)}
                                className="lux-input h-32 resize-none w-full"
                                placeholder="Internal notes or product description..."
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-lux-100 px-6 py-4 bg-lux-50/50 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-lux-500 hover:text-lux-700 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="lux-btn-primary flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        Add Product
                    </button>
                </div>
            </div>
        </>
    )
}
