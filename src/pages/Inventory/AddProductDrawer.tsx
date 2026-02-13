import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import {
    X,
    Loader2,
    Save,
    Upload,
    ChevronDown,
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
    category: '',
    condition: '',
    colour: '',
    costPriceEur: 0,
    sellPriceEur: 0,
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
                className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 border-l border-gray-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-900">Add New Product</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Image Upload */}
                        <div className="flex flex-col items-center justify-center">
                            <div
                                className="relative h-40 w-40 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
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
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileSelect(e.target.files)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Brand <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={product.brand}
                                    onChange={(e) => handleFieldChange('brand', e.target.value)}
                                    className="lux-input w-full"
                                    placeholder="e.g. Chanel"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Model <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={product.model}
                                    onChange={(e) => handleFieldChange('model', e.target.value)}
                                    className="lux-input w-full"
                                    placeholder="e.g. Classic Flap"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <input
                                    type="text"
                                    value={product.category}
                                    onChange={(e) => handleFieldChange('category', e.target.value)}
                                    className="lux-input w-full"
                                    placeholder="e.g. Handbag"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                                <input
                                    type="text"
                                    value={product.condition}
                                    onChange={(e) => handleFieldChange('condition', e.target.value)}
                                    className="lux-input w-full"
                                    placeholder="e.g. Excellent"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Colour</label>
                            <input
                                type="text"
                                value={product.colour}
                                onChange={(e) => handleFieldChange('colour', e.target.value)}
                                className="lux-input w-full"
                                placeholder="e.g. Black"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (EUR)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                                    <input
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sell Price (EUR)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                                    <input
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={product.quantity}
                                    onChange={(e) => handleFieldChange('quantity', parseInt(e.target.value) || 0)}
                                    className="lux-input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <div className="relative">
                                    <select
                                        value={product.status}
                                        onChange={(e) => handleFieldChange('status', e.target.value)}
                                        className="lux-input appearance-none pr-10 w-full"
                                    >
                                        <option value="in_stock">In Stock</option>
                                        <option value="sold">Sold</option>
                                        <option value="reserved">Reserved</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                                value={product.notes}
                                onChange={(e) => handleFieldChange('notes', e.target.value)}
                                className="lux-input h-24 resize-none w-full"
                                placeholder="Internal notes..."
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="lux-btn-primary flex items-center gap-2"
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
