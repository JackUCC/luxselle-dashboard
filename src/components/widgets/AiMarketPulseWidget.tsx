import { useState, useEffect } from 'react'
import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { apiGet } from '../../lib/api'
import { formatRelativeDate } from '../../lib/formatters'
import SectionLabel from '../design-system/SectionLabel'

interface TrendingItem {
  brand: string
  model: string
  category: string
  demandLevel: string
  priceTrend: string
  avgPriceEur: number
  searchVolume: 'high' | 'medium' | 'low'
}

interface TrendingResult {
  provider: string
  items: TrendingItem[]
  generatedAt: string
}

const DEMAND_LABELS: Record<string, string> = {
  very_high: 'very high',
  high: 'high',
  moderate: 'moderate',
}

const TREND_VERBS: Record<string, string> = {
  rising: 'rising',
  declining: 'declining',
  stable: 'holding steady',
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'rising') return <TrendingUp className="h-4 w-4 shrink-0 text-emerald-500" />
  if (trend === 'declining') return <TrendingDown className="h-4 w-4 shrink-0 text-rose-500" />
  return <Minus className="h-4 w-4 shrink-0 text-amber-500" />
}

function isStaleData(generatedAt: string | null): boolean {
  if (!generatedAt) return false
  const ageMs = Date.now() - new Date(generatedAt).getTime()
  return ageMs > 60 * 60 * 1000  // 60 minutes
}

function formatInsight(item: TrendingItem): string {
  const demand = DEMAND_LABELS[item.demandLevel] ?? item.demandLevel
  const verb = TREND_VERBS[item.priceTrend] ?? item.priceTrend
  const price = item.avgPriceEur.toLocaleString(undefined, { maximumFractionDigits: 0 })
  return `${item.model} demand is ${demand} \u2014 prices ${verb} around \u20AC${price}`
}

export default function AiMarketPulseWidget() {
  const [items, setItems] = useState<TrendingItem[]>([])
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiGet<{ data: TrendingResult }>('/market-research/trending')
      .then((res) => {
        if (cancelled) return
        setItems(res.data.items.slice(0, 4))
        setGeneratedAt(res.data.generatedAt ?? null)
      })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const snapshotAgeMinutes = generatedAt
    ? Math.max(0, Math.round((Date.now() - new Date(generatedAt).getTime()) / 60000))
    : null
  const freshnessLabel = snapshotAgeMinutes == null
    ? 'Freshness unknown'
    : snapshotAgeMinutes <= 5
      ? 'Live'
      : snapshotAgeMinutes <= 60
        ? `Cached ${snapshotAgeMinutes}m`
        : `Stale ${snapshotAgeMinutes}m`
  const freshnessClass = snapshotAgeMinutes == null
    ? 'bg-lux-100 text-lux-700'
    : snapshotAgeMinutes <= 5
      ? 'bg-emerald-100 text-emerald-800'
      : snapshotAgeMinutes <= 60
        ? 'bg-sky-100 text-sky-800'
        : 'bg-amber-100 text-amber-800'

  return (
    <div className="lux-card p-5 h-full min-h-0 flex flex-col animate-bento-enter stagger-9">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <SectionLabel className="mb-0">AI Market Pulse</SectionLabel>
        </div>
        <span
          data-testid="ai-market-pulse-freshness"
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${freshnessClass}`}
        >
          {freshnessLabel}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2.5 flex-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="h-3.5 w-3.5 rounded bg-lux-200/60 animate-pulse shrink-0 mt-0.5" />
              <div className="h-3.5 w-full rounded bg-lux-200/60 animate-pulse" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-xs text-lux-500">Unable to load market insights right now.</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-lux-500">No trending data available.</p>
      ) : (
        <ul className="space-y-2 flex-1 min-h-0 overflow-auto">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 border-b border-lux-100 pb-2 last:border-0 last:pb-0">
              <TrendIcon trend={item.priceTrend} />
              <p className="text-xs leading-snug text-lux-700">
                <span className="font-semibold text-lux-900">{item.brand}</span>{' '}
                {formatInsight(item)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {generatedAt && (
        <p className="mt-2 pt-2 border-t border-lux-100 text-[11px] text-lux-400 shrink-0">
          {isStaleData(generatedAt) ? (
            <span className="text-amber-500">Data may be outdated · {formatRelativeDate(generatedAt)}</span>
          ) : (
            <span>Updated {formatRelativeDate(generatedAt)}</span>
          )}
        </p>
      )}
    </div>
  )
}
