import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useScrollLock } from '../../lib/useScrollLock'
import {
    X,
    Loader2,
    Upload,
    FileSpreadsheet,
    CheckCircle,
    AlertCircle,
} from 'lucide-react'
import { apiPostFormData, ApiError } from '../../lib/api'

interface ImportInventoryDrawerProps {
    onClose: () => void
    onImportComplete: () => void
}

interface ImportResult {
    created: number
    errors: number
    errorDetails: { row: number; error: string }[]
    createdWithWarnings?: number
    productIdsWithMissingInfo?: string[]
}

export default function ImportInventoryDrawer({ onClose, onImportComplete }: ImportInventoryDrawerProps) {
    const navigate = useNavigate()
    const [isUploading, setIsUploading] = useState(false)
    const [result, setResult] = useState<ImportResult | null>(null)
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useScrollLock(true)

    const hasMissingInfo = (result?.createdWithWarnings ?? 0) > 0 || (result?.productIdsWithMissingInfo?.length ?? 0) > 0

    const handleFileSelect = async (files: FileList | null) => {
        if (!files || files.length === 0) return
        const file = files[0]

        if (!file.name.match(/\.(xlsx|xls|csv|pdf)$/i)) {
            toast.error('Please upload an Excel (.xlsx, .xls), CSV, or PDF (Luxselle inventory) file')
            return
        }

        setIsUploading(true)
        setResult(null)

        try {
            const formData = new FormData()
            formData.append('file', file)
            const isPdf = file.name.toLowerCase().endsWith('.pdf')
            const endpoint = isPdf ? '/products/import-pdf' : '/products/import'
            const response = await apiPostFormData<{ data: ImportResult }>(endpoint, formData)
            setResult(response.data)

            if (response.data.created > 0) {
                toast.success(`Successfully imported ${response.data.created} items`)
                onImportComplete()
            } else if (response.data.errors > 0) {
                toast.error('Import completed with errors')
            } else {
                toast.success('No items found to import')
            }

        } catch (err: unknown) {
            const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Import failed'
            toast.error(message)
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
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
        <>
            <div
                className="fixed inset-0 bg-gray-500/20 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 border-l border-gray-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-900">Import Inventory</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Instructions */}
                    <div className="rounded-lg bg-lux-200/80 p-4 border border-lux-300">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-lux-800 mb-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            File Requirements
                        </h3>
                        <p className="text-sm text-lux-700 mb-3">
                            <strong>PDF:</strong> Luxselle inventory pricing PDF — we’ll extract brand, title, SKU, purchase price, customs, VAT, and selling price. Or upload <strong>Excel/CSV</strong> with these columns (case-insensitive). Image is handled separately after import.
                        </p>
                        <ul className="list-disc list-inside text-sm text-lux-700 space-y-1 ml-1">
                            <li>Brand <span className="text-lux-800 font-medium">(required)</span>, Model <span className="text-lux-800 font-medium">(required)</span></li>
                            <li>Category, Condition, Colour</li>
                            <li>Cost EUR, VAT EUR, Customs EUR, Landed EUR</li>
                            <li>Sell EUR, Margin EUR, Margin %</li>
                            <li>Quantity, Status (in_stock, sold, reserved)</li>
                            <li>SKU, Notes</li>
                        </ul>
                    </div>

                    {/* Upload Area */}
                    {!result && (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative h-64 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${isDragOver
                                ? 'border-lux-600 bg-lux-200/80'
                                : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                                } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.xlsx,.xls,.pdf"
                                className="hidden"
                                onChange={(e) => handleFileSelect(e.target.files)}
                            />

                            {isUploading ? (
                                <>
                                    <Loader2 className="h-10 w-10 text-lux-700 animate-spin" />
                                    <p className="text-sm font-medium text-gray-600">Importing products...</p>
                                </>
                            ) : (
                                <>
                                    <div className="h-16 w-16 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100">
                                        <Upload className="h-8 w-8 text-lux-700" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-medium text-gray-900">Click to upload or drag and drop</p>
                                        <p className="text-sm text-gray-500 mt-1">Excel or CSV files only</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Results */}
                    {result && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-100 mx-auto mb-2 border border-emerald-200">
                                        <CheckCircle className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <div className="text-2xl font-bold text-emerald-700">{result.created}</div>
                                    <div className="text-sm font-medium text-emerald-600/80">Imported</div>
                                </div>
                                <div className={`rounded-xl border p-4 text-center ${result.errors > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                                    <div className={`flex items-center justify-center h-10 w-10 rounded-full mx-auto mb-2 ${result.errors > 0 ? 'bg-red-100 border border-red-200' : 'bg-gray-100 border border-gray-200'}`}>
                                        <AlertCircle className={`h-6 w-6 ${result.errors > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                                    </div>
                                    <div className={`text-2xl font-bold ${result.errors > 0 ? 'text-red-600' : 'text-gray-500'}`}>{result.errors}</div>
                                    <div className={`text-sm font-medium ${result.errors > 0 ? 'text-red-500/80' : 'text-gray-400'}`}>Errors</div>
                                </div>
                            </div>

                            {hasMissingInfo && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                                    <p className="text-sm text-amber-800">
                                        {(result.createdWithWarnings ?? 0)} product(s) have missing information (e.g. cost/sell price or category).
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClose()
                                            navigate('/inventory?missingInfo=1')
                                        }}
                                        className="mt-2 text-sm font-medium text-amber-700 hover:text-amber-900 underline"
                                    >
                                        View in list
                                    </button>
                                </div>
                            )}

                            {result.errorDetails.length > 0 && (
                                <div className="rounded-lg border border-red-200 bg-white overflow-hidden shadow-sm">
                                    <div className="bg-red-50 px-4 py-2 border-b border-red-100">
                                        <h4 className="text-sm font-medium text-red-600">Error Details (First {result.errorDetails.length})</h4>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-gray-100">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {result.errorDetails.map((err, i) => (
                                                    <tr key={i}>
                                                        <td className="px-4 py-2 text-sm text-gray-500 font-mono">{err.row}</td>
                                                        <td className="px-4 py-2 text-sm text-red-500">{err.error}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setResult(null)}
                                className="w-full lux-btn-secondary"
                            >
                                Upload Another File
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </>
    )
}
