import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Search, Loader2, Package, Calculator } from 'lucide-react'
import { apiGet, apiPost, ApiError } from '../../lib/api'
import { calculateSimpleLandedCost, DEFAULT_AUCTION_PCT, DEFAULT_CUSTOMS_PCT, DEFAULT_VAT_PCT } from '../../lib/landedCost'
import { formatCurrency, parseNumericInput } from '../../lib/formatters'
import { useResearchSession } from '../../lib/ResearchSessionContext'
import AiThinkingDots from '../feedback/AiThinkingDots'
import AiProgressSteps, { type AiProgressStep } from '../feedback/AiProgressSteps'
import LiveResultPreview from '../feedback/LiveResultPreview'
import type { PriceCheckResult } from '@shared/schemas'

interface InventoryMatch {
  id: string
  brand: string
  model: string
  status: string
  quantity: number
  sellPriceEur: number
}

interface QuickCheckResearchQuery {
  query: string
}

interface QuickCheckSessionResult {
  priceResult: PriceCheckResult
  inventoryMatches: InventoryMatch[]
}

const QUICK_CHECK_STEPS: AiProgressStep[] = [
  { label: 'Searching listings', detail: 'Running quick market lookup.' },
  { label: 'Scoring comparables', detail: 'Matching title and price relevance.' },
  { label: 'Publishing targets', detail: 'Computing avg sell, max buy, and max bid.' },
]

export default function QuickCheck() {
  const [query, setQuery] = useState('')
  const [bidInput, setBidInput] = useState('')
  const {
    session: quickCheckSession,
    startLoading: startQuickCheckLoading,
    setSuccess: setQuickCheckSuccess,
    setError: setQuickCheckError,
  } = useResearchSession<QuickCheckSessionResult, QuickCheckResearchQuery>('quickcheck')
  const isResearching = quickCheckSession.status === 'loading'
  const hasSearched = quickCheckSession.status !== 'idle'
  const errorMessage = quickCheckSession.status === 'error' ? (quickCheckSession.error ?? 'Price check failed') : null
  const result = quickCheckSession.status === 'success' ? (quickCheckSession.result?.priceResult ?? null) : null
  const inventoryMatches = quickCheckSession.status === 'success'
    ? (quickCheckSession.result?.inventoryMatches ?? [])
    : []

  const bid = useMemo(() => parseNumericInput(bidInput), [bidInput])
  const landed = useMemo(() => calculateSimpleLandedCost(bid), [bid])

  useEffect(() => {
    const persistedQuery = quickCheckSession.query
    if (!persistedQuery) return
    setQuery(persistedQuery.query)
  }, [quickCheckSession.query])

  useEffect(() => {
    if (result?.maxBidEur && result.maxBidEur > 0) {
      setBidInput(String(Math.round(result.maxBidEur)))
    }
  }, [result?.maxBidEur])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      toast.error('Enter an item to check')
      return
    }

    const researchQuery: QuickCheckResearchQuery = { query: q }
    startQuickCheckLoading(researchQuery)

    try {
      const [priceRes, invRes] = await Promise.allSettled([
        apiPost<{ data: PriceCheckResult }>('/pricing/price-check', {
          query: q,
        }),
        apiGet<{ data: InventoryMatch[] }>(`/products?q=${encodeURIComponent(q)}&limit=5`),
      ])

      if (priceRes.status !== 'fulfilled') {
        const msg = priceRes.reason instanceof ApiError ? priceRes.reason.message : 'Price check failed'
        setQuickCheckError(msg, researchQuery)
        toast.error(msg)
        return
      }

      const products = invRes.status === 'fulfilled' ? invRes.value.data : []
      const inStockMatches = Array.isArray(products)
        ? products.filter((p: InventoryMatch) => p.status === 'in_stock').slice(0, 3)
        : []

      setQuickCheckSuccess(
        {
          priceResult: priceRes.value.data,
          inventoryMatches: inStockMatches,
        },
        researchQuery
      )
      // Price check still succeeds when inventory lookup fails.
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : 'Price check failed'
      setQuickCheckError(msg, researchQuery)
      toast.error(msg)
    }
  }

  return (
    <div className="min-w-0 max-w-full space-y-2 overflow-x-clip">
      <form onSubmit={handleSearch} className="rounded-lux-card border border-lux-200 bg-white p-2.5">
        <label htmlFor="sidecar-quick-search" className="text-xs font-medium text-lux-700">
          Item description
        </label>
        <div className="mt-1 flex flex-col gap-2 min-[360px]:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-lux-400" />
            <input
              id="sidecar-quick-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Paste full listing description..."
              className="min-h-[44px] w-full rounded-lg border border-lux-200 bg-white py-2 pl-8 pr-3 text-sm text-lux-900 placeholder:text-lux-400 focus-visible:border-lux-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold/30"
            />
          </div>
          <button
            type="submit"
            disabled={isResearching}
            className="min-h-[44px] w-full shrink-0 rounded-lg bg-lux-900 px-3 py-2 text-sm font-medium text-white hover:bg-lux-800 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none min-[360px]:w-auto"
          >
            {isResearching ? <AiThinkingDots /> : 'Run'}
          </button>
        </div>
        <p className="mt-1 text-xs text-lux-500">Summary first, with details available below when needed.</p>

      </form>

      {isResearching && (
        <div className="space-y-2 rounded-lux-card border border-lux-200 bg-white px-2.5 py-2 text-xs text-lux-600">
          <AiProgressSteps
            isActive={isResearching}
            steps={QUICK_CHECK_STEPS}
            compact
            title="Quick check progress"
          />
          <LiveResultPreview isActive={isResearching} query={query} compact />
        </div>
      )}

      {errorMessage && !isResearching && (
        <div className="rounded-lux-card border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {errorMessage}
        </div>
      )}

      {result && (
        <article className="space-y-2 rounded-lux-card border border-lux-200 bg-white p-2.5 overflow-hidden">
          <div className="grid grid-cols-1 gap-1.5 text-xs min-[360px]:grid-cols-3">
            <div className="rounded-lg bg-lux-50 p-2">
              <p className="text-lux-500">Avg sell</p>
              <p className="font-semibold text-lux-800">{formatCurrency(result.averageSellingPriceEur)}</p>
            </div>
            <div className="rounded-lg bg-lux-50 p-2">
              <p className="text-lux-500">Max buy</p>
              <p className="font-semibold text-lux-800">{formatCurrency(result.maxBuyEur)}</p>
            </div>
            <div className="rounded-lg bg-lux-50 p-2">
              <p className="text-lux-500">Max bid</p>
              <p className="font-semibold text-lux-800">{formatCurrency(result.maxBidEur)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-lux-100 bg-lux-50/60 p-2">
            <div className="mb-1 flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5 text-lux-500" />
              <p className="text-xs font-medium text-lux-700">Landed from bid</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-lux-500">Bid €</span>
              <input
                type="text"
                inputMode="decimal"
                value={bidInput}
                onChange={(e) => setBidInput(e.target.value)}
                placeholder="0"
                className="min-w-[72px] flex-1 rounded border border-lux-200 bg-white px-2 py-1 text-right text-sm font-mono text-lux-900 focus-visible:border-lux-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold/30 min-[420px]:min-w-[92px]"
              />
              <span className="whitespace-nowrap text-sm font-bold text-lux-900">{formatCurrency(landed)}</span>
            </div>
            <p className="mt-1 text-xs text-lux-500">Includes +{DEFAULT_AUCTION_PCT}% fee +{DEFAULT_CUSTOMS_PCT}% customs +{DEFAULT_VAT_PCT}% VAT</p>
          </div>

          {result.comps.length > 0 && (
            <details className="rounded-lg border border-lux-100 bg-lux-50/40 px-2 py-1.5 text-xs">
              <summary className="cursor-pointer font-medium text-lux-600 hover:text-lux-800">
                Comparables ({result.comps.length})
              </summary>
              <div className="mt-1.5 max-h-32 space-y-1 overflow-y-auto">
                {result.comps.map((c, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 py-0.5">
                    <span className="min-w-0 truncate text-lux-700">
                      {c.sourceUrl ? (
                        <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="hover:text-lux-gold focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none rounded-sm">
                          {c.title}
                        </a>
                      ) : c.title}
                    </span>
                    <span className="font-mono text-lux-600 whitespace-nowrap">{formatCurrency(c.price)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <details className="rounded-lg border border-lux-100 bg-lux-50/40 px-2 py-1.5 text-xs">
            <summary className="cursor-pointer font-medium text-lux-600 hover:text-lux-800">
              <span className="inline-flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Inventory matches ({inventoryMatches.length})
              </span>
            </summary>
            {inventoryMatches.length === 0 ? (
              <p className="mt-1.5 text-xs text-lux-500">No in-stock matches found for this query.</p>
            ) : (
              <div className="mt-1.5 space-y-1">
                {inventoryMatches.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 py-0.5">
                    <span className="truncate text-lux-700">{p.brand} {p.model}</span>
                    <div className="shrink-0 text-right">
                      <span className="mr-2 text-xs text-lux-500">x{p.quantity}</span>
                      <span className="font-mono text-lux-700">{formatCurrency(p.sellPriceEur)}</span>
                    </div>
                  </div>
                ))}
                <a
                  href="/inventory"
                  target="_blank"
                  rel="noreferrer"
                  className="block pt-1 text-xs text-lux-gold hover:text-lux-gold focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none rounded-sm"
                >
                  Open full inventory
                </a>
              </div>
            )}
          </details>
        </article>
      )}

      {!result && hasSearched && !isResearching && !errorMessage && (
        <div className="rounded-lux-card border border-lux-200 bg-white px-3 py-2 text-xs text-lux-500">
          Search completed but no report was returned. Try a clearer item description.
        </div>
      )}

      {!hasSearched && (
        <div className="rounded-lux-card border border-dashed border-lux-200 bg-white/60 px-3 py-2 text-xs text-lux-500">
          Paste a full listing title and run a quick check. You will get price targets, landed estimate, and inventory context in one place.
        </div>
      )}
    </div>
  )
}
