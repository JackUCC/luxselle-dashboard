/**
 * Price Check / Supplier Engine: search-style item lookup, market research, max buy/bid, landed cost.
 * In Sidecar mode, renders the compact QuickCheck component.
 * @see docs/CODE_REFERENCE.md
 */
import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { Search, Calculator, Sparkles, Upload, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { apiPost, apiPostFormData, ApiError } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'
import { CalculatorWidget } from '../../components/widgets'
import LandedCostWidget from '../../components/widgets/LandedCostWidget'
import SidecarView from '../../components/sidecar/SidecarView'
import { useLayoutMode } from '../../lib/LayoutModeContext'

interface PriceCheckComp {
  title: string
  price: number
  source: string
  sourceUrl?: string
}

interface PriceCheckResult {
  averageSellingPriceEur: number
  comps: PriceCheckComp[]
  maxBuyEur: number
  maxBidEur: number
}

const CONDITION_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'new', label: 'New / Pristine' },
  { value: 'excellent', label: 'Excellent (A)' },
  { value: 'good', label: 'Good (B)' },
  { value: 'fair', label: 'Fair (C)' },
  { value: 'used', label: 'Used' },
]

export default function EvaluatorView() {
  const { isSidecar } = useLayoutMode()
  const [activeTab, setActiveTab] = useState<'pricecheck' | 'landed'>('pricecheck')
  const [query, setQuery] = useState('')
  const [condition, setCondition] = useState('')
  const [notes, setNotes] = useState('')
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PriceCheckResult | null>(null)
  const [refineOpen, setRefineOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (isSidecar) {
    return <SidecarView initialTab="quick" />
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setUploadedImage(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setUploadedImage(null)
    setImagePreview(null)
    fileInputRef.current && (fileInputRef.current.value = '')
  }

  const handleAnalyzeImage = async () => {
    if (!uploadedImage) return
    setIsAnalyzingImage(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('image', uploadedImage)
      const { data } = await apiPostFormData<{ data: { query?: string; condition?: string } }>(
        '/pricing/analyze-image',
        formData
      )
      if (data?.query) setQuery(data.query)
      if (data?.condition) setCondition(data.condition)
      toast.success('Image analyzed — search updated')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Analyze failed'
      toast.error(msg)
    } finally {
      setIsAnalyzingImage(false)
    }
  }

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      toast.error('Enter an item name to search')
      return
    }
    setIsResearching(true)
    setError(null)
    setResult(null)
    try {
      const { data } = await apiPost<{ data: PriceCheckResult }>('/pricing/price-check', {
        query: q,
        condition: condition || undefined,
        notes: notes.trim() || undefined,
      })
      setResult(data)
      toast.success('Market research complete')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Research failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsResearching(false)
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold text-lux-800">Price Check</h1>
        <p className="text-sm text-lux-600 mt-1">
          Research market price (Irish + Vestiaire), then see max buy and max bid.
        </p>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('pricecheck')}
          className={`flex-1 pb-3 text-sm font-medium transition-colors ${activeTab === 'pricecheck' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Search className="mb-1 mr-2 inline-block h-4 w-4" />
          Price Check
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('landed')}
          className={`flex-1 pb-3 text-sm font-medium transition-colors ${activeTab === 'landed' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Calculator className="mb-1 mr-2 inline-block h-4 w-4" />
          Landed Cost
        </button>
      </div>

      {activeTab === 'landed' ? (
        <div className="lux-card p-6">
          <CalculatorWidget />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Search + Refine */}
          <div className="lux-card evaluator-form-card flex flex-col p-4 sm:p-5 lg:p-6 h-fit">
            <form onSubmit={handleResearch} className="flex flex-col flex-1 min-h-0 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                  Search for item
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Chanel Classic Flap Medium Black"
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Optional image */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
                  Or drop / upload image
                </label>
                {imagePreview ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
                    <img src={imagePreview} alt="Upload" className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-2 py-1.5">
                      <button
                        type="button"
                        onClick={handleAnalyzeImage}
                        disabled={isAnalyzingImage}
                        className="text-xs text-white hover:text-indigo-200 flex items-center gap-1"
                      >
                        {isAnalyzingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {isAnalyzingImage ? 'Analyzing…' : 'Analyze with AI'}
                      </button>
                      <button type="button" onClick={handleRemoveImage} className="text-white hover:text-red-300" aria-label="Remove image">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="block border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-gray-300 transition-colors">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Drop image or click to upload</p>
                    <p className="text-xs text-gray-400 mt-1">AI will suggest search text</p>
                  </label>
                )}
              </div>

              {/* Refine (collapsible) */}
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setRefineOpen(!refineOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Refine results (condition, notes)
                  {refineOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {refineOpen && (
                  <div className="px-3 pb-3 pt-0 space-y-3 border-t border-gray-100">
                    <div>
                      <label id="refine-condition-label" className="block text-xs text-gray-500 mb-1">Condition</label>
                      <select
                        id="refine-condition"
                        aria-labelledby="refine-condition-label"
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm text-gray-900"
                      >
                        {CONDITION_OPTIONS.map((o) => (
                          <option key={o.value || 'any'} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Notes</label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Size, colour, features…"
                        className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isResearching}
                className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isResearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isResearching ? 'Researching…' : 'Research market'}
              </button>
              {error && <p className="text-sm text-rose-600 font-medium text-center">{error}</p>}
            </form>
          </div>

          {/* Results + Landed cost */}
          <div className="space-y-6">
            {!result ? (
              <div className="lux-card border-dashed border-2 min-h-[280px] flex flex-col items-center justify-center p-6">
                <Search className="h-12 w-12 mb-4 opacity-30 text-lux-500" />
                <p className="font-medium text-lux-600">Enter an item and run research</p>
                <p className="text-sm text-lux-500 mt-1">Irish competitors + Vestiaire Collective</p>
              </div>
            ) : (
              <div className="lux-card p-6 space-y-6">
                <h2 className="text-lg font-medium text-lux-800">Market breakdown</h2>
                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <div className="text-xs text-lux-500 uppercase tracking-wide mb-1">Avg. selling price (second-hand)</div>
                  <div className="text-2xl font-bold text-lux-800">{formatCurrency(result.averageSellingPriceEur)}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-100 p-4 bg-white">
                    <div className="text-xs text-lux-500 uppercase tracking-wide mb-1">Max buy</div>
                    <div className="text-xl font-bold text-lux-800">{formatCurrency(result.maxBuyEur)}</div>
                    <div className="text-xs text-lux-500 mt-1">−23% VAT, −20% margin</div>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4 bg-white">
                    <div className="text-xs text-lux-500 uppercase tracking-wide mb-1">Max bid</div>
                    <div className="text-xl font-bold text-lux-800">{formatCurrency(result.maxBidEur)}</div>
                    <div className="text-xs text-lux-500 mt-1">−7% auction fee</div>
                  </div>
                </div>
                {result.comps.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-lux-500 uppercase tracking-wide mb-2">Comparables</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.comps.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                          <div className="min-w-0 pr-2">
                            {c.sourceUrl ? (
                              <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="text-gray-900 hover:text-indigo-600 truncate block">
                                {c.title}
                              </a>
                            ) : (
                              <span className="text-gray-900 truncate block">{c.title}</span>
                            )}
                            <span className="text-xs text-gray-500">{c.source}</span>
                          </div>
                          <span className="font-mono text-gray-700 whitespace-nowrap">{formatCurrency(c.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Landed cost from bid (7% + 3% + 23%) */}
            <div className="lux-card p-6">
              <LandedCostWidget />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
