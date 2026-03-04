/**
 * Price Check / Supplier Engine: search-style item lookup, market research, max buy/bid, landed cost.
 * In Sidecar mode, renders the compact QuickCheck component.
 * @see docs/CODE_REFERENCE.md
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, Calculator, Sparkles, Loader2, ChevronDown, ChevronUp, Info, ImageIcon } from 'lucide-react'
import { apiPost, ApiError } from '../../lib/api'
import { formatCurrency, formatRelativeDate } from '../../lib/formatters'
import { CalculatorWidget } from '../../components/widgets'
import LandedCostWidget from '../../components/widgets/LandedCostWidget'
import SidecarView from '../../components/sidecar/SidecarView'
import AiThinkingDots from '../../components/feedback/AiThinkingDots'
import AiProgressSteps, { type AiProgressStep } from '../../components/feedback/AiProgressSteps'
import LiveResultPreview from '../../components/feedback/LiveResultPreview'
import ImageLightbox from '../../components/feedback/ImageLightbox'
import { useLayoutMode } from '../../lib/LayoutModeContext'
import { ITEM_DESCRIPTION_EXAMPLES } from '../../lib/itemDescriptionExamples'
import { useResearchSession } from '../../lib/ResearchSessionContext'
import { sanitizeImageUrl } from '../../lib/sanitizeImageUrl'
import PageLayout from '../../components/layout/PageLayout'
import { PageHeader, SectionLabel } from '../../components/design-system'
import { FloatingInput, LuxSelect } from '../../components/design-system/Input'
import type { PriceCheckResult } from '@shared/schemas'



interface PriceCheckResearchQuery {
  query: string
  condition?: string
  notes?: string
}

const CONDITION_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'new', label: 'New / Pristine' },
  { value: 'excellent', label: 'Excellent (A)' },
  { value: 'good', label: 'Good (B)' },
  { value: 'fair', label: 'Fair (C)' },
  { value: 'used', label: 'Used' },
]

const PRICE_CHECK_STEPS: AiProgressStep[] = [
  { label: 'Searching listings', detail: 'Scanning Irish and EU marketplaces for fresh comparables.' },
  { label: 'Analysing pricing fit', detail: 'Filtering out noisy comps and weighting condition cues.' },
  { label: 'Building report', detail: 'Calculating confidence, max buy, and max bid targets.' },
]

export default function EvaluatorView() {
  const { isSidecar } = useLayoutMode()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'pricecheck' | 'landed'>('pricecheck')
  const [query, setQuery] = useState('')
  const [condition, setCondition] = useState('')
  const [notes, setNotes] = useState('')
  const [fallbackBrand, setFallbackBrand] = useState('')
  const [fallbackStyle, setFallbackStyle] = useState('')
  const [fallbackSize, setFallbackSize] = useState('')
  const [fallbackColour, setFallbackColour] = useState('')
  const [refineOpen, setRefineOpen] = useState(false)
  const [formulaOpen, setFormulaOpen] = useState(false)
  const [failedCompImages, setFailedCompImages] = useState<Record<number, boolean>>({})
  const [loadedCompImages, setLoadedCompImages] = useState<Record<number, boolean>>({})
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title?: string; subtitle?: string; sourceUrl?: string } | null>(null)
  const autoRanQueryRef = useRef<string | null>(null)
  const {
    session: researchSession,
    startLoading: startResearchLoading,
    setSuccess: setResearchSuccess,
    setError: setResearchError,
    clear: clearResearchSession,
  } = useResearchSession<PriceCheckResult, PriceCheckResearchQuery>('buy-box')
  const isResearching = researchSession.status === 'loading'
  const error = researchSession.status === 'error' ? (researchSession.error ?? 'Research failed') : null
  const result = researchSession.status === 'success' ? (researchSession.result ?? null) : null

  const runResearch = useCallback(
    async (q: string, opts?: { condition?: string; notes?: string; strategy?: 'auto' | 'strict' | 'broad' }) => {
      const researchQuery: PriceCheckResearchQuery = {
        query: q,
        condition: opts?.condition || undefined,
        notes: opts?.notes || undefined,
      }
      startResearchLoading(researchQuery)
      try {
        const body: { query: string; condition?: string; notes?: string; strategy?: string } = {
          query: researchQuery.query,
          condition: researchQuery.condition,
          notes: researchQuery.notes,
        }
        if (opts?.strategy) body.strategy = opts.strategy
        const { data } = await apiPost<{ data: PriceCheckResult }>('/pricing/price-check', body)
        setResearchSuccess(data, researchQuery)
        toast.success('Market research complete')
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Research failed'
        setResearchError(msg, researchQuery)
        toast.error(msg)
      }
    },
    [setResearchError, setResearchSuccess, startResearchLoading],
  )

  useEffect(() => {
    const persistedQuery = researchSession.query
    if (!persistedQuery) return
    setQuery(persistedQuery.query)
    setCondition(persistedQuery.condition ?? '')
    setNotes(persistedQuery.notes ?? '')
  }, [researchSession.query])

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

  useEffect(() => {
    if (result?.diagnostics?.missingAttributesHint?.length && result.comps.length === 0) {
      setRefineOpen(true)
    }
  }, [result?.diagnostics?.missingAttributesHint, result?.comps?.length])

  const confidencePct = result
    ? result.comps.length >= 5
      ? 90
      : result.comps.length >= 3
        ? 75
        : result.comps.length >= 1
          ? 50
          : 25
    : 0


  const hasEmptyComparableResult = Boolean(result && result.comps.length === 0)

  const applyFallbackDetailsToNotes = useCallback(() => {
    const fields = [
      fallbackBrand.trim() ? `brand: ${fallbackBrand.trim()}` : '',
      fallbackStyle.trim() ? `style: ${fallbackStyle.trim()}` : '',
      fallbackSize.trim() ? `size: ${fallbackSize.trim()}` : '',
      fallbackColour.trim() ? `colour: ${fallbackColour.trim()}` : '',
    ].filter(Boolean)

    if (fields.length === 0) {
      return
    }

    const fallbackLine = `Fallback details — ${fields.join(' | ')}`
    setNotes((prev) => (prev.trim() ? `${prev.trim()}
${fallbackLine}` : fallbackLine))
    setRefineOpen(true)
  }, [fallbackBrand, fallbackStyle, fallbackSize, fallbackColour])

  const emptyComparableGuidance =
    result?.diagnostics?.emptyReason === 'no_search_data'
      ? 'We could not find enough Irish/EU listings for this text. Add brand, style, size, and colour to improve match quality.'
      : result?.diagnostics?.emptyReason === 'extraction_failed'
        ? 'Market extraction failed. Retry or use broader search.'
        : result?.diagnostics?.emptyReason === 'insufficient_provenance'
          ? 'Listings found but source links could not be verified.'
          : result?.diagnostics?.emptyReason === 'timeout'
            ? 'Search timed out. Retry or use broader search.'
            : 'Not enough matching listings. Add colour/material/hardware.'

  if (isSidecar) {
    return (
      <div className="min-w-0 max-w-full overflow-x-clip">
        <SidecarView initialTab="quick" />
      </div>
    )
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
        <div className="lux-card p-6 animate-bento-enter stagger-0">
          <CalculatorWidget />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Search + Refine */}
          <div className="lux-card evaluator-form-card min-w-0 flex flex-col p-5 lg:p-6 h-fit animate-bento-enter stagger-0">
            <form onSubmit={handleResearch} className="flex flex-col flex-1 min-h-0 gap-4 sm:gap-5">
              <div>
                <FloatingInput
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  label="Search for item"
                  leadingAdornment={<Search className="h-4 w-4 text-lux-400" />}
                  rotatingLabelExamples={ITEM_DESCRIPTION_EXAMPLES}
                  rotatingLabelIntervalMs={3500}
                />
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
                {isResearching ? <AiThinkingDots /> : <Sparkles className="h-4 w-4" />}
                {isResearching ? 'Researching…' : 'Research market'}
              </button>
              {isResearching && (
                <AiProgressSteps
                  isActive={isResearching}
                  steps={PRICE_CHECK_STEPS}
                  compact
                  title="Price-check progress"
                />
              )}
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
                    onClick={clearResearchSession}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700 underline focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                  >
                    Retry
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Results + Landed cost */}
          <div className="min-w-0 space-y-6">
            {!result ? (
              isResearching ? (
                <LiveResultPreview
                  isActive={isResearching}
                  query={query}
                  className="animate-bento-enter stagger-1"
                />
              ) : (
                <div className="lux-card border-dashed border-2 border-lux-200 min-h-[280px] flex flex-col items-center justify-center p-6 animate-bento-enter stagger-1">
                  <Search className="h-12 w-12 mb-4 opacity-30 text-lux-400" />
                  <p className="font-medium text-lux-600">Enter an item and run research</p>
                  <p className="text-sm text-lux-500 mt-1">Irish competitors + Vestiaire Collective</p>
                </div>
              )
            ) : (
              <div className="lux-card min-w-0 p-6 space-y-6 animate-bento-enter stagger-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
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
                  ) : result.dataSource === 'provider_unavailable' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-600/20">
                      AI unavailable
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
                  <div className="text-xl sm:text-2xl font-bold text-lux-900">
                    {result.averageSellingPriceEur > 0 ? formatCurrency(result.averageSellingPriceEur) : '—'}
                  </div>
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
                    <div className="text-xl font-bold text-lux-900 mt-1">
                      {result.maxBuyEur > 0 ? formatCurrency(result.maxBuyEur) : '—'}
                    </div>
                    <div className="text-xs text-lux-500 mt-1">−23% VAT, −20% margin</div>
                  </div>
                  <div className="lux-card-accent rounded-lux-card p-5">
                    <SectionLabel as="span" className="mb-1 block">Max bid target</SectionLabel>
                    <div className="text-xl font-bold text-lux-900">
                      {result.maxBidEur > 0 ? formatCurrency(result.maxBidEur) : '—'}
                    </div>
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
                {result.dataSource === 'provider_unavailable' ? (
                  <div className="rounded-lux-card border border-red-200 bg-red-50/50 p-5 text-sm text-red-800">
                    <p className="font-medium">AI search unavailable</p>
                    <p className="mt-1 text-red-700">
                      AI providers timed out or returned an error. Check `/api/health?test_providers=1` on the backend, then retry.
                    </p>
                  </div>
                ) : result.comps.length > 0 ? (
                  <div>
                    <SectionLabel as="h3" className="mb-2">Comparables</SectionLabel>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.comps.map((c, i) => {
                        const previewImageUrl = sanitizeImageUrl(c.previewImageUrl)
                        return (
                          <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 justify-between text-sm py-2 border-b border-lux-100 last:border-0">
                            <div className="flex min-w-0 w-full sm:flex-1 items-start gap-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!previewImageUrl || failedCompImages[i]) return
                                  setLightboxImage({
                                    url: previewImageUrl,
                                    title: c.title,
                                    subtitle: c.source,
                                    sourceUrl: c.sourceUrl,
                                  })
                                }}
                                className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-lux-200 bg-lux-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold/30"
                                aria-label={previewImageUrl ? `Preview comparable image for ${c.title}` : 'No comparable image available'}
                                disabled={!previewImageUrl || failedCompImages[i]}
                              >
                                {previewImageUrl && !failedCompImages[i] ? (
                                  <>
                                    {!loadedCompImages[i] && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-lux-50">
                                        <ImageIcon className="h-4 w-4 text-lux-300" />
                                      </div>
                                    )}
                                    <img
                                      src={previewImageUrl}
                                      alt={`Comparable listing: ${c.title}`}
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
                                {previewImageUrl && !failedCompImages[i] && (
                                  <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                                )}
                              </button>
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
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lux-card border border-amber-200 bg-amber-50/50 p-5 text-sm text-amber-800 space-y-3">
                    <p>{emptyComparableGuidance}</p>
                    {hasEmptyComparableResult && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <FloatingInput
                          type="text"
                          value={fallbackBrand}
                          onChange={(e) => setFallbackBrand(e.target.value)}
                          label="Brand (fallback)"
                        />
                        <FloatingInput
                          type="text"
                          value={fallbackStyle}
                          onChange={(e) => setFallbackStyle(e.target.value)}
                          label="Style / model"
                        />
                        <FloatingInput
                          type="text"
                          value={fallbackSize}
                          onChange={(e) => setFallbackSize(e.target.value)}
                          label="Bag size"
                        />
                        <FloatingInput
                          type="text"
                          value={fallbackColour}
                          onChange={(e) => setFallbackColour(e.target.value)}
                          label="Colour"
                        />
                      </div>
                    )}
                    {result?.diagnostics?.missingAttributesHint?.length ? (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="text-xs text-amber-700 self-center mr-1">Add:</span>
                        {result.diagnostics.missingAttributesHint.map((hint) => (
                          <span
                            key={hint}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-medium"
                          >
                            {hint}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={applyFallbackDetailsToNotes}
                        className="lux-btn-secondary text-xs px-3 py-2 rounded-md"
                      >
                        Add details to refine notes
                      </button>
                      <button
                        type="button"
                        onClick={() => runResearch(query.trim(), { condition, notes: notes.trim(), strategy: 'broad' })}
                        className="lux-btn-secondary text-xs px-3 py-2 rounded-md"
                      >
                        Retry with broader search
                      </button>
                      {result?.diagnostics?.searchAnnotationCount !== undefined && (
                        <p className="text-xs text-amber-700 self-center">
                          Search sources found: {result.diagnostics.searchAnnotationCount}
                        </p>
                      )}
                    </div>
                    {result.dataSource === 'ai_fallback' && result.comps.length === 0 && result.diagnostics && (
                      <details className="mt-3 rounded-lux-card border border-lux-200 bg-lux-50/50 p-3 text-sm text-lux-700">
                        <summary className="cursor-pointer font-medium hover:text-lux-900 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none rounded-sm">
                          Why no results?
                        </summary>
                        <ul className="mt-2 space-y-1 text-xs text-lux-600 list-disc pl-4">
                          {result.diagnostics.emptyReason && (
                            <li>Reason: {result.diagnostics.emptyReason.replace(/_/g, ' ')}</li>
                          )}
                          {typeof result.diagnostics.searchAnnotationCount === 'number' && (
                            <li>Search citations: {result.diagnostics.searchAnnotationCount}</li>
                          )}
                          {typeof result.diagnostics.searchRawTextLength === 'number' && (
                            <li>Search text length: {result.diagnostics.searchRawTextLength}</li>
                          )}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="lux-card p-6 animate-bento-enter stagger-3">
              <LandedCostWidget />
            </div>
          </div>
        </div>
      )}
      <ImageLightbox
        isOpen={Boolean(lightboxImage)}
        imageUrl={lightboxImage?.url ?? null}
        title={lightboxImage?.title}
        subtitle={lightboxImage?.subtitle}
        sourceUrl={lightboxImage?.sourceUrl}
        onClose={() => setLightboxImage(null)}
      />
    </PageLayout>
  )
}
