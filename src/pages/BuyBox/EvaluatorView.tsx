/**
 * Price Check / Supplier Engine: search-style item lookup, market research, max buy/bid, landed cost.
 * In Sidecar mode, renders the compact QuickCheck component.
 * @see docs/CODE_REFERENCE.md
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, Calculator, Sparkles, Upload, X, Loader2, ChevronDown, ChevronUp, Info, ImageIcon } from 'lucide-react'
import { apiPost, apiPostFormData, ApiError } from '../../lib/api'
import { formatCurrency, formatRelativeDate } from '../../lib/formatters'
import { CalculatorWidget } from '../../components/widgets'
import LandedCostWidget from '../../components/widgets/LandedCostWidget'
import SidecarView from '../../components/sidecar/SidecarView'
import { useLayoutMode } from '../../lib/LayoutModeContext'
import PageLayout from '../../components/layout/PageLayout'
import { PageHeader, SectionLabel } from '../../components/design-system'
import { FloatingInput, LuxSelect } from '../../components/design-system/Input'

interface PriceCheckComp {
  title: string
  price: number
  source: string
  sourceUrl?: string
  previewImageUrl?: string
}

interface PriceCheckResult {
  averageSellingPriceEur: number
  comps: PriceCheckComp[]
  maxBuyEur: number
  maxBidEur: number
  dataSource?: 'web_search' | 'ai_fallback' | 'mock'
  researchedAt?: string
}

interface VisualSearchResult {
  productId?: string
  supplierItemId?: string
  imageUrl?: string
  title?: string
  score: number
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
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [formulaOpen, setFormulaOpen] = useState(false)
  const [isFindingSimilar, setIsFindingSimilar] = useState(false)
  const [visualResults, setVisualResults] = useState<VisualSearchResult[] | null>(null)
  const [failedCompImages, setFailedCompImages] = useState<Record<number, boolean>>({})
  const [loadedCompImages, setLoadedCompImages] = useState<Record<number, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autoRanQueryRef = useRef<string | null>(null)

  const runResearch = useCallback(async (q: string, opts?: { condition?: string; notes?: string }) => {
    setIsResearching(true)
    setError(null)
    setResult(null)
    try {
      const { data } = await apiPost<{ data: PriceCheckResult }>('/pricing/price-check', {
        query: q,
        condition: opts?.condition || undefined,
        notes: opts?.notes || undefined,
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
  }, [])

  useEffect(() => {
    const urlQuery = searchParams.get('q')
    if (!urlQuery || autoRanQueryRef.current === urlQuery) return
    autoRanQueryRef.current = urlQuery
    const shouldRun = searchParams.get('run') === '1'
    setQuery(urlQuery)
    setSearchParams({}, { replace: true })
    if (shouldRun) {
      runResearch(urlQuery)
    }
  }, [searchParams, setSearchParams, runResearch])

  useEffect(() => {
    setFailedCompImages({})
    setLoadedCompImages({})
  }, [result?.comps])

  const confidencePct = result
    ? result.comps.length >= 5
      ? 90
      : result.comps.length >= 3
        ? 75
        : result.comps.length >= 1
          ? 50
          : 25
    : 0

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
    setVisualResults(null)
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

  const handleFindSimilar = async () => {
    if (!uploadedImage) return
    setIsFindingSimilar(true)
    setVisualResults(null)
    try {
      const formData = new FormData()
      formData.append('image', uploadedImage)
      const { data } = await apiPostFormData<{ data: { results: VisualSearchResult[] } }>(
        '/search/visual',
        formData
      )
      setVisualResults(data?.results ?? [])
      toast.success(data?.results?.length ? `Found ${data.results.length} similar items` : 'No similar items found')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Find similar failed'
      toast.error(msg)
    } finally {
      setIsFindingSimilar(false)
    }
  }

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      toast.error('Enter an item name to search')
      return
    }
    runResearch(q, { condition, notes: notes.trim() })
  }

  return (
    <PageLayout variant="content">
      <PageHeader
        title="Price Check"
        purpose="Research market price (Irish + Vestiaire), then see max buy and max bid."
      />

      <div className="flex border-b border-lux-200">
        <button
          type="button"
          onClick={() => setActiveTab('pricecheck')}
          className={`flex-1 py-3 min-h-[44px] text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none ${activeTab === 'pricecheck' ? 'border-b-2 border-lux-900 text-lux-900' : 'text-lux-400 hover:text-lux-600'}`}
        >
          <Search className="mb-1 mr-2 inline-block h-4 w-4" />
          Price Check
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('landed')}
          className={`flex-1 py-3 min-h-[44px] text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none ${activeTab === 'landed' ? 'border-b-2 border-lux-900 text-lux-900' : 'text-lux-400 hover:text-lux-600'}`}
        >
          <Calculator className="mb-1 mr-2 inline-block h-4 w-4" />
          Landed Cost
        </button>
      </div>

      {activeTab === 'landed' ? (
        <div className="lux-card p-6 animate-bento-enter" style={{ '--stagger': 0 } as React.CSSProperties}>
          <CalculatorWidget />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Search + Refine */}
          <div className="lux-card evaluator-form-card flex flex-col p-5 lg:p-6 h-fit animate-bento-enter" style={{ '--stagger': 0 } as React.CSSProperties}>
            <form onSubmit={handleResearch} className="flex flex-col flex-1 min-h-0 gap-4 sm:gap-5">
              <div>
                <FloatingInput
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  label="Search for item"
                  leadingAdornment={<Search className="h-4 w-4 text-lux-400" />}
                />
                <p className="mt-1 text-xs text-lux-400">e.g. Chanel Classic Flap Medium Black</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-lux-400 mb-1.5">
                  Or drop / upload image
                </label>
                {imagePreview ? (
                  <div className="relative aspect-video rounded-lux-card overflow-hidden border border-lux-200">
                    <img src={imagePreview} alt="Upload" className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-1 bg-black/50 px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAnalyzeImage}
                          disabled={isAnalyzingImage}
                          className="text-xs text-white hover:text-lux-200 flex items-center gap-1 min-h-[44px] px-2 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                        >
                          {isAnalyzingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          {isAnalyzingImage ? 'Analyzing…' : 'Analyze with AI'}
                        </button>
                        <button
                          type="button"
                          onClick={handleFindSimilar}
                          disabled={isFindingSimilar}
                          className="text-xs text-white hover:text-lux-200 flex items-center gap-1 min-h-[44px] px-2 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                        >
                          {isFindingSimilar ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                          {isFindingSimilar ? 'Finding…' : 'Find similar'}
                        </button>
                      </div>
                      <button type="button" onClick={handleRemoveImage} className="text-white hover:text-red-300 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none" aria-label="Remove image">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="block border-2 border-dashed border-lux-200 rounded-lux-card p-6 text-center cursor-pointer hover:border-lux-300 transition-colors">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    <Upload className="mx-auto h-8 w-8 text-lux-400 mb-2" />
                    <p className="text-sm text-lux-500">Drop image or click to upload</p>
                    <p className="text-xs text-lux-400 mt-1">AI will suggest search text</p>
                  </label>
                )}
              </div>

              {/* Refine (collapsible) */}
              <div className="border border-lux-200 rounded-lux-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setRefineOpen(!refineOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-lux-600 hover:bg-lux-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                >
                  Refine results (condition, notes)
                  {refineOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {refineOpen && (
                  <div className="px-3 pb-3 pt-0 space-y-3 border-t border-lux-100">
                    <div>
                      <label htmlFor="refine-condition" className="block text-xs text-lux-500 mb-1">Condition</label>
                      <LuxSelect
                        id="refine-condition"
                        value={condition}
                        onValueChange={setCondition}
                        options={CONDITION_OPTIONS}
                        ariaLabel="Condition"
                      />
                    </div>
                    <div>
                      <FloatingInput
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        label="Notes"
                      />
                      <p className="mt-1 text-xs text-lux-400">Size, colour, features…</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isResearching}
                className="lux-btn-primary w-full rounded-[10px] py-3 text-sm flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
              >
                {isResearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isResearching ? 'Researching…' : 'Research market'}
              </button>
              {error && (
                <div className="flex flex-col items-center gap-2">
                  <p
                    className="text-sm text-rose-600 font-medium text-center"
                    data-testid="price-check-inline-error"
                  >
                    {error}
                  </p>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700 underline focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                  >
                    Retry
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Results + Landed cost */}
          <div className="space-y-6">
            {!result ? (
              <div className="lux-card border-dashed border-2 border-lux-200 min-h-[280px] flex flex-col items-center justify-center p-6 animate-bento-enter" style={{ '--stagger': 1 } as React.CSSProperties}>
                <Search className="h-12 w-12 mb-4 opacity-30 text-lux-400" />
                <p className="font-medium text-lux-600">Enter an item and run research</p>
                <p className="text-sm text-lux-500 mt-1">Irish competitors + Vestiaire Collective</p>
              </div>
            ) : (
              <div className="lux-card p-6 space-y-6 animate-bento-enter" style={{ '--stagger': 1 } as React.CSSProperties}>
                <div className="flex items-center justify-between">
                  <SectionLabel>Market Research</SectionLabel>
                  {result.dataSource === 'web_search' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Live data
                    </span>
                  ) : result.dataSource === 'ai_fallback' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20">
                      AI estimate
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-lux-500">
                  Based on {result.comps.length} comparable listing{result.comps.length !== 1 ? 's' : ''} | Confidence: {confidencePct}%
                  {result.researchedAt && (
                    <span className="ml-2 text-lux-400">· Researched {formatRelativeDate(result.researchedAt)}</span>
                  )}
                </p>
                <div className="lux-card-accent rounded-lux-card p-5 text-center">
                  <SectionLabel as="span" className="mb-1 block">Avg. selling price (second-hand)</SectionLabel>
                  <div className="text-xl sm:text-2xl font-bold text-lux-900">{formatCurrency(result.averageSellingPriceEur)}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="lux-card-accent rounded-lux-card p-5">
                    <div className="flex items-center gap-1.5">
                      <SectionLabel as="span">Max buy target</SectionLabel>
                      <button
                        type="button"
                        onClick={() => setFormulaOpen((o) => !o)}
                        className="text-lux-400 hover:text-lux-600 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                        title="Show formula"
                        aria-label="Show formula breakdown"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-xl font-bold text-lux-900 mt-1">{formatCurrency(result.maxBuyEur)}</div>
                    <div className="text-xs text-lux-500 mt-1">−23% VAT, −20% margin</div>
                  </div>
                  <div className="lux-card-accent rounded-lux-card p-5">
                    <SectionLabel as="span" className="mb-1 block">Max bid target</SectionLabel>
                    <div className="text-xl font-bold text-lux-900">{formatCurrency(result.maxBidEur)}</div>
                    <div className="text-xs text-lux-500 mt-1">−7% auction fee</div>
                  </div>
                </div>
                {formulaOpen && (
                  <div className="rounded-lux-card bg-lux-50 border border-lux-200 p-5 text-xs text-lux-600 font-mono space-y-1">
                    <div>Avg selling price: {formatCurrency(result.averageSellingPriceEur)}</div>
                    <div>− VAT (23%): {formatCurrency(result.averageSellingPriceEur)} / 1.23 = {formatCurrency(result.averageSellingPriceEur / 1.23)}</div>
                    <div>− Margin (20%): ex-VAT × 0.80 = {formatCurrency(result.maxBuyEur)} (Max buy)</div>
                    <div>− Auction fee (7%): Max buy / 1.07 = {formatCurrency(result.maxBidEur)} (Max bid)</div>
                  </div>
                )}
                {result.comps.length > 0 ? (
                  <div>
                    <SectionLabel as="h3" className="mb-2">Comparables</SectionLabel>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.comps.map((c, i) => (
                        <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 justify-between text-sm py-2 border-b border-lux-100 last:border-0">
                          <div className="flex min-w-0 w-full sm:flex-1 items-start gap-2.5">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-lux-200 bg-lux-50">
                              {c.previewImageUrl && !failedCompImages[i] ? (
                                <>
                                  {!loadedCompImages[i] && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-lux-50">
                                      <ImageIcon className="h-4 w-4 text-lux-300" />
                                    </div>
                                  )}
                                  <img
                                    src={c.previewImageUrl}
                                    alt=""
                                    loading="lazy"
                                    className={`h-full w-full object-cover ${loadedCompImages[i] ? 'opacity-100' : 'opacity-0'}`}
                                    onLoad={() => setLoadedCompImages((prev) => ({ ...prev, [i]: true }))}
                                    onError={() => {
                                      setFailedCompImages((prev) => ({ ...prev, [i]: true }))
                                      setLoadedCompImages((prev) => ({ ...prev, [i]: false }))
                                    }}
                                  />
                                </>
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <ImageIcon className="h-4 w-4 text-lux-300" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 pr-1">
                              {c.sourceUrl ? (
                                <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="text-lux-800 hover:text-lux-gold truncate block focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none rounded-sm">
                                  {c.title}
                                </a>
                              ) : (
                                <span className="text-lux-800 truncate block">{c.title}</span>
                              )}
                              <span className="text-xs text-lux-500">{c.source}</span>
                            </div>
                          </div>
                          <span className="font-mono text-lux-700 whitespace-nowrap self-start sm:self-auto pl-[58px] sm:pl-0">{formatCurrency(c.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lux-card border border-amber-200 bg-amber-50/50 p-5 text-sm text-amber-800">
                    No comparable listings found. Prices shown are AI estimates and may be less reliable.
                  </div>
                )}
              </div>
            )}

            {/* Visual search results (when user clicked Find similar) */}
            {visualResults !== null && (
              <div className="lux-card p-6 animate-bento-enter" style={{ '--stagger': 2 } as React.CSSProperties}>
                <SectionLabel className="mb-2">Visual Matches</SectionLabel>
                <p className="text-sm text-lux-500 mb-4">From your inventory and supplier catalogs.</p>
                {visualResults.length === 0 ? (
                  <p className="text-sm text-lux-500">No similar items in the index yet. Add product images or import supplier catalogs.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {visualResults.map((r, i) => (
                      <div key={i} className="rounded-lux-card border border-lux-200 overflow-hidden bg-white">
                        {r.imageUrl ? (
                          <img src={r.imageUrl} alt="" className="w-full aspect-square object-cover" />
                        ) : (
                          <div className="w-full aspect-square bg-lux-50 flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-lux-400" />
                          </div>
                        )}
                        <div className="p-2">
                          <p className="text-xs text-lux-800 truncate" title={r.title}>{r.title ?? '—'}</p>
                          <p className="text-xs text-lux-500">{Math.round(r.score * 100)}% match</p>
                          {r.productId && (
                            <a href={`/inventory?highlight=${r.productId}`} className="text-xs text-lux-gold hover:underline mt-0.5 inline-block focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none rounded-sm">View in Inventory</a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="lux-card p-6 animate-bento-enter" style={{ '--stagger': 3 } as React.CSSProperties}>
              <LandedCostWidget />
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
