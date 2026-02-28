import { useState, useEffect } from 'react'
import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { apiGet } from '../../lib/api'
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

function formatInsight(item: TrendingItem): string {
  const demand = DEMAND_LABELS[item.demandLevel] ?? item.demandLevel
  const verb = TREND_VERBS[item.priceTrend] ?? item.priceTrend
  const price = item.avgPriceEur.toLocaleString(undefined, { maximumFractionDigits: 0 })
  return `${item.model} demand is ${demand} \u2014 prices ${verb} around \u20AC${price}`
}

export default function AiMarketPulseWidget() {
  const [items, setItems] = useState<TrendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiGet<{ data: TrendingResult }>('/market-research/trending')
      .then((res) => {
        if (cancelled) return
        setItems(res.data.items.slice(0, 4))
      })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div
      className="lux-card p-5 animate-bento-enter"
      style={{ '--stagger': 9 } as React.CSSProperties}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <SectionLabel>AI Market Pulse</SectionLabel>
        </div>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="h-4 w-4 rounded bg-lux-200/60 animate-pulse shrink-0 mt-0.5" />
              <div className="h-4 w-full rounded bg-lux-200/60 animate-pulse" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-xs text-lux-500">Unable to load market insights right now.</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-lux-500">No trending data available.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <TrendIcon trend={item.priceTrend} />
              <p className="text-xs leading-snug text-lux-700">
                <span className="font-semibold text-lux-900">{item.brand}</span>{' '}
                {formatInsight(item)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
