import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import {
    X,
    Loader2,
    Upload,
    FileSpreadsheet,
    CheckCircle,
    AlertCircle,
    Download
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
}

export default function ImportInventoryDrawer({ onClose, onImportComplete }: ImportInventoryDrawerProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [result, setResult] = useState<ImportResult | null>(null)
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = async (files: FileList | null) => {
        if (!files || files.length === 0) return
        const file = files[0]

        // Simple extension check
        if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
            toast.error('Please upload an Excel (.xlsx, .xls) or CSV file')
            return
        }

        setIsUploading(true)
        setResult(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await apiPostFormData<{ data: ImportResult }>('/products/import', formData)
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
                    <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-700 mb-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            File Requirements
                        </h3>
                        <p className="text-sm text-blue-600 mb-3">
                            Upload an Excel (.xlsx) or CSV file with the following headers (case-insensitive):
                        </p>
                        <ul className="list-disc list-inside text-sm text-blue-600/80 space-y-1 ml-1">
                            <li>Brand <span className="text-blue-700 font-medium">(required)</span></li>
                            <li>Model <span className="text-blue-700 font-medium">(required)</span></li>
                            <li>Category</li>
                            <li>Condition</li>
                            <li>Colour</li>
                            <li>Cost Price / Cost EUR</li>
                            <li>Sell Price / Sell EUR</li>
                            <li>Quantity</li>
                            <li>Status <span className="text-blue-700 font-medium">(in_stock, sold, reserved)</span></li>
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
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                                } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv, .xlsx, .xls"
                                className="hidden"
                                onChange={(e) => handleFileSelect(e.target.files)}
                            />

                            {isUploading ? (
                                <>
                                    <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                                    <p className="text-sm font-medium text-gray-600">Importing products...</p>
                                </>
                            ) : (
                                <>
                                    <div className="h-16 w-16 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100">
                                        <Upload className="h-8 w-8 text-blue-500" />
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
