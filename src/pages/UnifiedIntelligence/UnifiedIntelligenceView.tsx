/**
 * Unified sourcing intelligence: one description-first flow for
 * price check, optional serial context, and landed-cost planning.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Info,
  Loader2,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { apiPost, apiPostFormData, ApiError } from '../../lib/api'
import { formatCurrency, formatRelativeDate } from '../../lib/formatters'
import { CalculatorWidget } from '../../components/widgets'
import LandedCostWidget from '../../components/widgets/LandedCostWidget'
import SidecarView from '../../components/sidecar/SidecarView'
import AiThinkingDots from '../../components/feedback/AiThinkingDots'
import { useLayoutMode } from '../../lib/LayoutModeContext'
import { useResearchSession } from '../../lib/ResearchSessionContext'
import { sanitizeImageUrl } from '../../lib/sanitizeImageUrl'
import PageLayout from '../../components/layout/PageLayout'
import { PageHeader, SectionLabel } from '../../components/design-system'
import { FloatingInput, LuxSelect } from '../../components/design-system/Input'
import {
  decodeSerialToYear,
  SERIAL_CHECK_BRANDS,
  type DecodeResult,
  type SerialCheckBrand,
} from '../../lib/serialDateDecoder'
import { calculateSerialPricingGuidance } from '../../lib/serialValuation'
import type { SerialDecodeResult, SerialPricingGuidance } from '@shared/schemas'
import { deriveSourcingDecision, type DecisionTone } from '../../lib/sourcingDecision'

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
  dataSource?: 'web_search' | 'ai_fallback'
  researchedAt?: string
}

interface VisualSearchResult {
  productId?: string
  supplierItemId?: string
  imageUrl?: string
  title?: string
  score: number
}

interface PriceCheckResearchQuery {
  query: string
  condition?: string
  notes?: string
}

interface SerialCheckQuery {
  serial: string
  brand: SerialCheckBrand
  description: string
}

interface SerialCheckSessionResult {
  decodeResult: DecodeResult
  pricingGuidance: SerialPricingGuidance
  marketAverageEur: number
  compsCount: number
}

const CONDITION_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'new', label: 'New / Pristine' },
  { value: 'excellent', label: 'Excellent (A)' },
  { value: 'good', label: 'Good (B)' },
  { value: 'fair', label: 'Fair (C)' },
  { value: 'used', label: 'Used' },
]

const SERIAL_BRAND_OPTIONS = SERIAL_CHECK_BRANDS.map((brand) => ({ value: brand, label: brand }))

function getDecisionToneStyles(tone: DecisionTone): {
  wrapper: string
  title: string
  iconClass: string
  Icon: typeof CheckCircle2
} {
  switch (tone) {
    case 'good':
      return {
        wrapper: 'border-emerald-200 bg-emerald-50/70',
        title: 'text-emerald-800',
        iconClass: 'text-emerald-600',
        Icon: CheckCircle2,
      }
    case 'caution':
      return {
        wrapper: 'border-amber-200 bg-amber-50/70',
        title: 'text-amber-900',
        iconClass: 'text-amber-700',
        Icon: AlertTriangle,
      }
    case 'stop':
      return {
        wrapper: 'border-rose-200 bg-rose-50/70',
        title: 'text-rose-800',
        iconClass: 'text-rose-600',
        Icon: AlertTriangle,
      }
    case 'neutral':
    default:
      return {
        wrapper: 'border-lux-200 bg-lux-50/70',
        title: 'text-lux-800',
        iconClass: 'text-lux-500',
        Icon: Info,
      }
  }
}

export default function UnifiedIntelligenceView() {
  const { isSidecar } = useLayoutMode()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [condition, setCondition] = useState('')
  const [notes, setNotes] = useState('')
  const [serial, setSerial] = useState('')
  const [brand, setBrand] = useState<SerialCheckBrand>('Louis Vuitton')
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [isFindingSimilar, setIsFindingSimilar] = useState(false)
  const [refineOpen, setRefineOpen] = useState(false)
  const [formulaOpen, setFormulaOpen] = useState(false)
  const [visualResults, setVisualResults] = useState<VisualSearchResult[] | null>(null)
  const [failedCompImages, setFailedCompImages] = useState<Record<number, boolean>>({})
  const [loadedCompImages, setLoadedCompImages] = useState<Record<number, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autoRanQueryRef = useRef<string | null>(null)

  const {
    session: researchSession,
    startLoading: startResearchLoading,
    setSuccess: setResearchSuccess,
    setError: setResearchError,
    clear: clearResearchSession,
  } = useResearchSession<PriceCheckResult, PriceCheckResearchQuery>('buy-box')

  const {
    session: serialSession,
    startLoading: startSerialLoading,
    setSuccess: setSerialSuccess,
    setError: setSerialError,
    clear: clearSerialSession,
  } = useResearchSession<SerialCheckSessionResult, SerialCheckQuery>('serial-check')

  const isResearching = researchSession.status === 'loading'
  const priceCheckError = researchSession.status === 'error' ? (researchSession.error ?? 'Research failed') : null
  const result = researchSession.status === 'success' ? (researchSession.result ?? null) : null

  const isSerialLoading = serialSession.status === 'loading'
  const serialError = serialSession.status === 'error' ? (serialSession.error ?? 'Could not run serial analysis') : null
  const serialResult = serialSession.status === 'success' ? (serialSession.result ?? null) : null

  const runResearch = useCallback(async (q: string, opts?: { condition?: string; notes?: string }) => {
    const researchQuery: PriceCheckResearchQuery = {
      query: q,
      condition: opts?.condition || undefined,
      notes: opts?.notes || undefined,
    }

    startResearchLoading(researchQuery)

    try {
      const { data } = await apiPost<{ data: PriceCheckResult }>('/pricing/price-check', {
        query: researchQuery.query,
        condition: researchQuery.condition,
        notes: researchQuery.notes,
      })
      setResearchSuccess(data, researchQuery)
      toast.success('Market research complete')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Research failed'
      setResearchError(msg, researchQuery)
      toast.error(msg)
    }
  }, [setResearchError, setResearchSuccess, startResearchLoading])

  useEffect(() => {
    const persistedQuery = researchSession.query
    if (!persistedQuery) return
    setQuery(persistedQuery.query)
    setCondition(persistedQuery.condition ?? '')
    setNotes(persistedQuery.notes ?? '')
  }, [researchSession.query])

  useEffect(() => {
    const persistedSerialQuery = serialSession.query
    if (!persistedSerialQuery) return
    setSerial(persistedSerialQuery.serial)
    setBrand(persistedSerialQuery.brand)
  }, [serialSession.query])

  useEffect(() => {
    const urlQuery = searchParams.get('q')
    if (!urlQuery || autoRanQueryRef.current === urlQuery) return
    autoRanQueryRef.current = urlQuery
    const shouldRun = searchParams.get('run') === '1'
    setQuery(urlQuery)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('q')
    nextParams.delete('run')
    setSearchParams(nextParams, { replace: true })

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

  const hasSerialDescriptionDrift = useMemo(() => {
    if (serialSession.status !== 'success' || !serialSession.query) return false
    return serialSession.query.description.trim() !== query.trim()
  }, [serialSession.query, serialSession.status, query])

  const decision = deriveSourcingDecision({
    maxBidEur: result?.maxBidEur,
    maxBuyEur: result?.maxBuyEur,
    serialRecommendedMaxPayEur: serialResult?.pricingGuidance.recommendedMaxPayEur,
  })

  const decisionStyles = getDecisionToneStyles(decision.tone)
  const decisionSuggestionLabel = decision.constrainedBy === 'serial-check'
    ? 'Serial-adjusted max pay'
    : 'Price-check max bid'

  if (isSidecar) {
    return (
      <div className="min-w-0 max-w-full overflow-x-clip">
        <SidecarView initialTab="quick" />
      </div>
    )
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
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAnalyzeImage = async () => {
    if (!uploadedImage) return
    setIsAnalyzingImage(true)
    if (researchSession.status === 'error') clearResearchSession()

    try {
      const formData = new FormData()
      formData.append('image', uploadedImage)
      const { data } = await apiPostFormData<{ data: { query?: string; condition?: string } }>(
        '/pricing/analyze-image',
        formData
      )
      if (data?.query) setQuery(data.query)
      if (data?.condition) setCondition(data.condition)
      toast.success('Image analyzed and search updated')
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
      toast.error('Enter an item description first')
      return
    }
    runResearch(q, { condition, notes: notes.trim() })
  }

  const handleSerialAnalysis = async () => {
    const normalizedSerial = serial.trim()
    const normalizedDescription = query.trim()

    if (!normalizedDescription) {
      toast.error('Enter item description first, then run serial analysis')
      return
    }

    if (!normalizedSerial) {
      toast.error('Serial check is optional, but you need a serial/date code to run it')
      return
    }

    const serialQuery: SerialCheckQuery = {
      serial: normalizedSerial,
      brand,
      description: normalizedDescription,
    }

    startSerialLoading(serialQuery)

    try {
      let decoded = decodeSerialToYear(normalizedSerial, brand)

      if (decoded.source === 'rule_based' && (decoded.precision === 'unknown' || decoded.confidence < 0.7)) {
        try {
          const { data } = await apiPost<{ data: SerialDecodeResult }>('/ai/serial-decode', {
            serial: normalizedSerial,
            brand,
            itemDescription: normalizedDescription,
          })
          decoded = data
        } catch {
          // Keep rule-based decode when AI decode is unavailable.
        }
      }

      let marketAverage = result?.averageSellingPriceEur ?? 0
      let compsCount = result?.comps.length ?? 0

      if (marketAverage <= 0) {
        const { data: marketData } = await apiPost<{ data: PriceCheckResult }>('/pricing/price-check', {
          query: normalizedDescription,
          condition: condition || undefined,
          notes: notes.trim() || undefined,
        })
        marketAverage = marketData.averageSellingPriceEur
        compsCount = marketData.comps.length
      }

      const guidance = calculateSerialPricingGuidance({
        marketAverageEur: marketAverage,
        decode: decoded,
      })

      setSerialSuccess(
        {
          decodeResult: decoded,
          pricingGuidance: guidance,
          marketAverageEur: marketAverage,
          compsCount,
        },
        serialQuery
      )

      toast.success('Serial context updated')
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not run serial analysis'
      setSerialError(message, serialQuery)
      toast.error(message)
    }
  }

  return (
    <PageLayout variant="content">
      <PageHeader
        title="Sourcing Intelligence"
        purpose="Description-first flow for market price, optional serial context, and landed-cost planning."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-6">
          <div className="lux-card evaluator-form-card flex flex-col p-5 lg:p-6 h-fit animate-bento-enter stagger-0">
            <form onSubmit={handleResearch} className="flex flex-col flex-1 min-h-0 gap-4 sm:gap-5">
              <div>
                <FloatingInput
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  label="Item description"
                  leadingAdornment={<Search className="h-4 w-4 text-lux-400" />}
                />
                <p className="mt-1 text-xs text-lux-400">
                  Start with the full listing description, then optionally layer serial context.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-lux-400 mb-1.5">
                  Or upload image
                </label>
                {imagePreview ? (
                  <div className="relative aspect-video rounded-lux-card overflow-hidden border border-lux-200">
                    <img src={imagePreview} alt="Upload preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-1 bg-black/50 px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAnalyzeImage}
                          disabled={isAnalyzingImage}
                          className="text-xs text-white hover:text-lux-200 flex items-center gap-1 min-h-[44px] px-2 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                        >
                          {isAnalyzingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          {isAnalyzingImage ? 'Analyzing...' : 'Analyze with AI'}
                        </button>
                        <button
                          type="button"
                          onClick={handleFindSimilar}
                          disabled={isFindingSimilar}
                          className="text-xs text-white hover:text-lux-200 flex items-center gap-1 min-h-[44px] px-2 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                        >
                          {isFindingSimilar ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                          {isFindingSimilar ? 'Finding...' : 'Find similar'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-white hover:text-rose-300 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="block border-2 border-dashed border-lux-200 rounded-lux-card p-6 text-center cursor-pointer hover:border-lux-300 transition-colors">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    <Upload className="mx-auto h-8 w-8 text-lux-400 mb-2" />
                    <p className="text-sm text-lux-500">Drop image or click to upload</p>
                    <p className="text-xs text-lux-400 mt-1">AI can suggest search text before research</p>
                  </label>
                )}
              </div>

              <div className="border border-lux-200 rounded-lux-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setRefineOpen(!refineOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-lux-600 hover:bg-lux-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                >
                  Refine market search (condition, notes)
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
                      <p className="mt-1 text-xs text-lux-400">Size, color, hardware, and any defects</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isResearching}
                className="lux-btn-primary w-full rounded-[10px] py-3 text-sm flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
              >
                {isResearching ? <AiThinkingDots /> : <Sparkles className="h-4 w-4" />}
                {isResearching ? 'Researching...' : 'Research market'}
              </button>
              {isResearching && (
                <div className="relative h-1 w-full overflow-hidden rounded-full bg-lux-100">
                  <div className="absolute inset-y-0 left-0 w-1/4 rounded-full bg-lux-gold animate-progress-indeterminate" />
                </div>
              )}
              {priceCheckError && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-rose-600 font-medium text-center" data-testid="price-check-inline-error">
                    {priceCheckError}
                  </p>
                  <button
                    type="button"
                    onClick={clearResearchSession}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700 underline focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                  >
                    Retry
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="lux-card p-5 lg:p-6 animate-bento-enter stagger-1">
            <SectionLabel as="h2" className="mb-2">Serial context (optional)</SectionLabel>
            <p className="text-xs text-lux-500">
              Add a serial/date code to tighten your max pay target with age-adjusted guidance.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-lux-500 mb-1">Brand</label>
                <LuxSelect
                  value={brand}
                  onValueChange={(value) => setBrand(value as SerialCheckBrand)}
                  options={SERIAL_BRAND_OPTIONS}
                  ariaLabel="Serial brand"
                />
              </div>
              <FloatingInput
                type="text"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                label="Serial/date code"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSerialAnalysis}
                disabled={isSerialLoading}
                className="lux-btn-secondary inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
              >
                {isSerialLoading ? <AiThinkingDots /> : <Sparkles className="h-4 w-4" />}
                {isSerialLoading ? 'Analyzing serial...' : 'Analyze serial'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSerial('')
                  clearSerialSession()
                }}
                className="text-xs font-medium text-lux-500 hover:text-lux-700 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
              >
                Clear serial context
              </button>
            </div>

            {serialError && (
              <p className="mt-3 text-sm font-medium text-rose-600">{serialError}</p>
            )}

            {hasSerialDescriptionDrift && !serialError && (
              <p className="mt-3 text-xs text-amber-700">
                Description changed after serial analysis. Re-run serial analysis to refresh guidance.
              </p>
            )}

            {serialResult && (
              <div className="mt-4 space-y-3">
                <div className={`rounded-lux-card border p-4 text-sm ${serialResult.decodeResult.success ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'}`}>
                  <p className="font-medium text-lux-800">
                    {serialResult.decodeResult.success && serialResult.decodeResult.year != null
                      ? `Decode: ${serialResult.decodeResult.year}${serialResult.decodeResult.period ? ` - ${serialResult.decodeResult.period}` : ''}`
                      : 'Decode could not be fully confirmed'}
                  </p>
                  <p className="mt-1 text-xs text-lux-600">{serialResult.decodeResult.message}</p>
                  <p className="mt-1 text-xs text-lux-500">
                    Confidence: {Math.round(serialResult.decodeResult.confidence * 100)}%
                  </p>
                </div>

                <div className="rounded-lux-card border border-lux-200 bg-lux-50/70 p-4">
                  <p className="text-xs text-lux-500 uppercase tracking-wide">Serial-adjusted guidance</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] text-lux-500 uppercase tracking-wide">Market avg</p>
                      <p className="text-sm font-semibold text-lux-800">
                        {formatCurrency(serialResult.pricingGuidance.marketAverageEur)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-lux-500 uppercase tracking-wide">Estimated worth</p>
                      <p className="text-sm font-semibold text-lux-800">
                        {formatCurrency(serialResult.pricingGuidance.estimatedWorthEur)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-lux-500 uppercase tracking-wide">Recommended max pay</p>
                      <p className="text-sm font-semibold text-lux-800">
                        {formatCurrency(serialResult.pricingGuidance.recommendedMaxPayEur)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-lux-600">{serialResult.pricingGuidance.summary}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {!result ? (
            <div className="lux-card border-dashed border-2 border-lux-200 min-h-[240px] flex flex-col items-center justify-center p-6 animate-bento-enter stagger-2">
              <Search className="h-12 w-12 mb-4 opacity-30 text-lux-400" />
              <p className="font-medium text-lux-600">Run market research to start decisioning</p>
              <p className="text-sm text-lux-500 mt-1">You will get price targets, comparables, and a landed-cost prefill.</p>
            </div>
          ) : (
            <div className="lux-card p-6 space-y-6 animate-bento-enter stagger-2">
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
                  <span className="ml-2 text-lux-400">- Researched {formatRelativeDate(result.researchedAt)}</span>
                )}
              </p>
              <div className="lux-card-accent rounded-lux-card p-5 text-center">
                <SectionLabel as="span" className="mb-1 block">Avg. selling price (second-hand)</SectionLabel>
                <div className="text-xl sm:text-2xl font-bold text-lux-900">
                  {result.averageSellingPriceEur > 0 ? formatCurrency(result.averageSellingPriceEur) : '-'}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="lux-card-accent rounded-lux-card p-5">
                  <div className="flex items-center gap-1.5">
                    <SectionLabel as="span">Max buy target</SectionLabel>
                    <button
                      type="button"
                      onClick={() => setFormulaOpen((open) => !open)}
                      className="text-lux-400 hover:text-lux-600 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                      title="Show formula"
                      aria-label="Show formula breakdown"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-xl font-bold text-lux-900 mt-1">
                    {result.maxBuyEur > 0 ? formatCurrency(result.maxBuyEur) : '-'}
                  </div>
                  <div className="text-xs text-lux-500 mt-1">-23% VAT, -20% margin</div>
                </div>
                <div className="lux-card-accent rounded-lux-card p-5">
                  <SectionLabel as="span" className="mb-1 block">Max bid target</SectionLabel>
                  <div className="text-xl font-bold text-lux-900">
                    {result.maxBidEur > 0 ? formatCurrency(result.maxBidEur) : '-'}
                  </div>
                  <div className="text-xs text-lux-500 mt-1">-7% auction fee</div>
                </div>
              </div>
              {formulaOpen && (
                <div className="rounded-lux-card bg-lux-50 border border-lux-200 p-5 text-xs text-lux-600 font-mono space-y-1">
                  <div>Avg selling price: {formatCurrency(result.averageSellingPriceEur)}</div>
                  <div>- VAT (23%): {formatCurrency(result.averageSellingPriceEur)} / 1.23 = {formatCurrency(result.averageSellingPriceEur / 1.23)}</div>
                  <div>- Margin (20%): ex-VAT x 0.80 = {formatCurrency(result.maxBuyEur)} (Max buy)</div>
                  <div>- Auction fee (7%): Max buy / 1.07 = {formatCurrency(result.maxBidEur)} (Max bid)</div>
                </div>
              )}
              {result.comps.length > 0 ? (
                <div>
                  <SectionLabel as="h3" className="mb-2">Comparables</SectionLabel>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.comps.map((comp, index) => {
                      const previewImageUrl = sanitizeImageUrl(comp.previewImageUrl)
                      return (
                        <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 justify-between text-sm py-2 border-b border-lux-100 last:border-0">
                          <div className="flex min-w-0 w-full sm:flex-1 items-start gap-2.5">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-lux-200 bg-lux-50">
                              {previewImageUrl && !failedCompImages[index] ? (
                                <>
                                  {!loadedCompImages[index] && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-lux-50">
                                      <ImageIcon className="h-4 w-4 text-lux-300" />
                                    </div>
                                  )}
                                  <img
                                    src={previewImageUrl}
                                    alt=""
                                    loading="lazy"
                                    className={`h-full w-full object-cover ${loadedCompImages[index] ? 'opacity-100' : 'opacity-0'}`}
                                    onLoad={() => setLoadedCompImages((prev) => ({ ...prev, [index]: true }))}
                                    onError={() => {
                                      setFailedCompImages((prev) => ({ ...prev, [index]: true }))
                                      setLoadedCompImages((prev) => ({ ...prev, [index]: false }))
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
                              {comp.sourceUrl ? (
                                <a
                                  href={comp.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-lux-800 hover:text-lux-gold truncate block focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none rounded-sm"
                                >
                                  {comp.title}
                                </a>
                              ) : (
                                <span className="text-lux-800 truncate block">{comp.title}</span>
                              )}
                              <span className="text-xs text-lux-500">{comp.source}</span>
                            </div>
                          </div>
                          <span className="font-mono text-lux-700 whitespace-nowrap self-start sm:self-auto pl-[58px] sm:pl-0">
                            {formatCurrency(comp.price)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lux-card border border-amber-200 bg-amber-50/50 p-5 text-sm text-amber-800">
                  No comparable listings found. Prices shown are AI estimates and may be less reliable.
                </div>
              )}
            </div>
          )}

          <div className={`lux-card border p-5 animate-bento-enter stagger-3 ${decisionStyles.wrapper}`}>
            <SectionLabel as="h2" className={`mb-2 ${decisionStyles.title}`}>Decision Summary</SectionLabel>
            <div className="flex items-start gap-2.5">
              <decisionStyles.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${decisionStyles.iconClass}`} />
              <div className="min-w-0">
                <p className={`text-sm font-medium ${decisionStyles.title}`}>{decision.summary}</p>
                <p className="mt-1 text-xs text-lux-600">
                  Recommended max pay:{' '}
                  {decision.recommendedMaxPayEur ? formatCurrency(decision.recommendedMaxPayEur) : 'Run price check first'}
                </p>
                {decision.constrainedBy !== 'none' && (
                  <p className="mt-1 text-xs text-lux-500">
                    Constraint source: {decision.constrainedBy === 'serial-check' ? 'Serial check' : 'Price check'}
                  </p>
                )}
                {decision.notes.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-lux-600 list-disc pl-4">
                    {decision.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {visualResults !== null && (
            <div className="lux-card p-6 animate-bento-enter stagger-4">
              <SectionLabel className="mb-2">Visual Matches</SectionLabel>
              <p className="text-sm text-lux-500 mb-4">From your inventory and supplier catalogs.</p>
              {visualResults.length === 0 ? (
                <p className="text-sm text-lux-500">
                  No similar items in the index yet. Add product images or import supplier catalogs.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {visualResults.map((visualResult, index) => (
                    <div key={index} className="rounded-lux-card border border-lux-200 overflow-hidden bg-white">
                      {visualResult.imageUrl ? (
                        <img src={visualResult.imageUrl} alt="" className="w-full aspect-square object-cover" />
                      ) : (
                        <div className="w-full aspect-square bg-lux-50 flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-lux-400" />
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-xs text-lux-800 truncate" title={visualResult.title}>{visualResult.title ?? '-'}</p>
                        <p className="text-xs text-lux-500">{Math.round(visualResult.score * 100)}% match</p>
                        {visualResult.productId && (
                          <a
                            href={`/inventory?highlight=${visualResult.productId}`}
                            className="text-xs text-lux-gold hover:underline mt-0.5 inline-block focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none rounded-sm"
                          >
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

          <LandedCostWidget
            suggestedBid={decision.recommendedMaxPayEur}
            suggestionLabel={decisionSuggestionLabel}
          />

          <details className="lux-card p-5 animate-bento-enter stagger-5">
            <summary className="cursor-pointer text-sm font-medium text-lux-700 hover:text-lux-900 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none rounded">
              Advanced landed-cost calculator
            </summary>
            <div className="mt-4">
              <CalculatorWidget />
            </div>
          </details>
        </div>
      </div>
    </PageLayout>
  )
}
