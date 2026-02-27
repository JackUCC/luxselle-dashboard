import { useCallback, useState, useEffect } from 'react'
import { ChevronRight, Radio, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../lib/api'
import SectionLabel from '../design-system/SectionLabel'

interface SourcingRequest {
  id: string
  itemDescription: string
  brand?: string
  status: string
  priority?: string
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-amber-400',
  sourcing: 'bg-blue-400',
  sourced: 'bg-emerald-400',
  fulfilled: 'bg-emerald-600',
  lost: 'bg-red-400',
}

export default function ActiveSourcingWidget() {
  const [items, setItems] = useState<SourcingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<{ data: SourcingRequest[] }>('/sourcing')
      const active = res.data
        .filter((r) => r.status === 'open' || r.status === 'sourcing')
        .slice(0, 5)
      setItems(active)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sourcing'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div
      className="lux-card-accent p-6 animate-bento-enter"
      style={{ '--stagger': 8 } as React.CSSProperties}
    >
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>Active Sourcing</SectionLabel>
        <Radio className="h-4 w-4 text-amber-500 animate-pulse-slow" />
      </div>

      {loading && items.length === 0 && !error ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-5 w-3/4 rounded bg-lux-200/60 animate-pulse" />
          ))}
        </div>
      ) : error && items.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <p className="inline-flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-lux-500">No active requests</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/sourcing`}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-white/60"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2 w-2 rounded-full ${STATUS_COLORS[item.status] ?? 'bg-lux-300'}`}
                />
                <span className="text-[14px] font-medium text-lux-700">
                  {item.itemDescription || item.brand || 'Untitled'}
                </span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-lux-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
