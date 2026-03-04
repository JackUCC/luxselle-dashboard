/**
 * Unified sourcing intelligence: one description-first flow for
 * price check, optional serial context, and landed-cost planning.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
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
} from 'lucide-react'
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
import { useResearchSession } from '../../lib/ResearchSessionContext'
import { sanitizeImageUrl } from '../../lib/sanitizeImageUrl'
import PageLayout from '../../components/layout/PageLayout'
import { PageHeader, SectionLabel } from '../../components/design-system'
import { FloatingInput, LuxSelect } from '../../components/design-system/Input'
import type { PriceCheckResult } from '@shared/schemas'
import { ITEM_DESCRIPTION_EXAMPLES } from '../../lib/itemDescriptionExamples'
import { deriveSourcingDecision, type DecisionTone } from '../../lib/sourcingDecision'
import ConfidenceDiagnosticsPanel from './ConfidenceDiagnosticsPanel'
import ResearchDataSourceBadge from './ResearchDataSourceBadge'



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
  { label: 'Searching listings', detail: 'Scanning Irish and EU marketplaces for comparables.' },
  { label: 'Analysing price fit', detail: 'Reviewing condition and title relevance.' },
  { label: 'Building sourcing report', detail: 'Calculating targets and confidence.' },
]

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
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [condition, setCondition] = useState('')
  const [notes, setNotes] = useState('')
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
  const priceCheckError = researchSession.status === 'error' ? (researchSession.error ?? 'Research failed') : null
  const result = researchSession.status === 'success' ? (researchSession.result ?? null) : null

  const decision = useMemo(
    () =>
      deriveSourcingDecision({
        maxBidEur: result?.maxBidEur ?? null,
        maxBuyEur: result?.maxBuyEur ?? null,
      }),
    [result?.maxBidEur, result?.maxBuyEur],
  )

  const decisionStyles = useMemo(() => getDecisionToneStyles(decision.tone), [decision.tone])

  const confidencePct = useMemo(
    () => (result?.confidenceBreakdown?.score != null ? Math.round(result.confidenceBreakdown.score * 100) : 0),
    [result?.confidenceBreakdown?.score],
  )

  const trendSignalLabel = useMemo(() => {
    if (!result?.trendSignal || result.trendSignal === 'unknown') return ''
    const labels: Record<string, string> = {
      up: '📈 Prices trending up',
      down: '📉 Prices trending down',
      flat: '➡️ Prices stable',
    }
    return labels[result.trendSignal] ?? ''
  }, [result?.trendSignal])

  const decisionSuggestionLabel = useMemo(() => {
    if (!decision.recommendedMaxPayEur) return undefined
    return `AI suggests max €${Math.round(decision.recommendedMaxPayEur)}`
  }, [decision.recommendedMaxPayEur])

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

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      toast.error('Enter an item description first')
      return
    }
    runResearch(q, { condition, notes: notes.trim() })
  }

  return (
    <PageLayout variant="content">
      <PageHeader
        title="Sourcing Intelligence"
        purpose="Description-first flow for market price, optional serial context, and landed-cost planning."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="min-w-0 space-y-6">
          <div className="lux-card evaluator-form-card flex flex-col p-5 lg:p-6 h-fit animate-bento-enter stagger-0">
            <form onSubmit={handleResearch} className="flex flex-col flex-1 min-h-0 gap-4 sm:gap-5">
              <div>
                <FloatingInput
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  label="Item description"
                  leadingAdornment={<Search className="h-4 w-4 text-lux-400" />}
                  rotatingLabelExamples={ITEM_DESCRIPTION_EXAMPLES}
                  rotatingLabelIntervalMs={3500}
                />
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
                <AiProgressSteps
                  isActive={isResearching}
                  steps={PRICE_CHECK_STEPS}
                  compact
                  title="Market research progress"
                />
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

        <div className="min-w-0 space-y-6">
          {!result ? (
            isResearching ? (
              <LiveResultPreview
                isActive={isResearching}
                query={query}
                className="animate-bento-enter stagger-2"
              />
            ) : (
              <div className="lux-card border-dashed border-2 border-lux-200 min-h-[240px] flex flex-col items-center justify-center p-6 animate-bento-enter stagger-2">
                <Search className="h-12 w-12 mb-4 opacity-30 text-lux-400" />
                <p className="font-medium text-lux-600">Run market research to start decisioning</p>
                <p className="text-sm text-lux-500 mt-1">You will get price targets, comparables, and a landed-cost prefill.</p>
              </div>
            )
          ) : (
            <div className="lux-card min-w-0 p-6 space-y-6 animate-bento-enter stagger-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SectionLabel>Market Research</SectionLabel>
                <ResearchDataSourceBadge dataSource={result.dataSource} />
              </div>
              <p className="text-sm text-lux-500">
                Based on {result.comps.length} comparable listing{result.comps.length !== 1 ? 's' : ''} | Confidence: {confidencePct}%
                {result.researchedAt && (
                  <span className="ml-2 text-lux-400">- Researched {formatRelativeDate(result.researchedAt)}</span>
                )}
              </p>
              <ConfidenceDiagnosticsPanel confidenceBreakdown={result.confidenceBreakdown} trendSignalLabel={trendSignalLabel} />
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
                    {result.comps.map((comp, index) => {
                      const previewImageUrl = sanitizeImageUrl(comp.previewImageUrl)
                      return (
                        <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 justify-between text-sm py-2 border-b border-lux-100 last:border-0">
                          <div className="flex min-w-0 w-full sm:flex-1 items-start gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (!previewImageUrl || failedCompImages[index]) return
                                setLightboxImage({
                                  url: previewImageUrl,
                                  title: comp.title,
                                  subtitle: comp.source,
                                  sourceUrl: comp.sourceUrl,
                                })
                              }}
                              className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-lux-200 bg-lux-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold/30"
                              aria-label={previewImageUrl ? `Preview comparable image for ${comp.title}` : 'No comparable image available'}
                              disabled={!previewImageUrl || failedCompImages[index]}
                            >
                              {previewImageUrl && !failedCompImages[index] ? (
                                <>
                                  {!loadedCompImages[index] && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-lux-50">
                                      <ImageIcon className="h-4 w-4 text-lux-300" />
                                    </div>
                                  )}
                                  <img
                                    src={previewImageUrl}
                                    alt={`Comparable listing: ${comp.title}`}
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
                              {previewImageUrl && !failedCompImages[index] && (
                                <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                              )}
                            </button>
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
                <div className="space-y-3">
                  <div className="rounded-lux-card border border-amber-200 bg-amber-50/50 p-5 text-sm text-amber-800">
                    No comparable listings found. Prices shown are AI estimates and may be less reliable.
                  </div>
                  {result.dataSource === 'ai_fallback' && result.comps.length === 0 && result.diagnostics && (
                    <details className="rounded-lux-card border border-lux-200 bg-lux-50/50 p-3 text-sm text-lux-700">
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
                    Constraint source: Price check
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

        </div>
      </div>
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
