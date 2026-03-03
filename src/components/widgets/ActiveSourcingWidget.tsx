import { useState, useEffect } from 'react'
import { ChevronRight, Radio } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { SourcingRequest } from '@shared/schemas'
import { apiGet } from '../../lib/api'
import SectionLabel from '../design-system/SectionLabel'

type SourcingRequestWithId = SourcingRequest & { id: string }

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-amber-400',
  sourcing: 'bg-emerald-400',
  sourced: 'bg-emerald-400',
  fulfilled: 'bg-emerald-600',
  lost: 'bg-red-400',
}

const POLL_INTERVAL_MS = 45 * 1000

function fetchActiveSourcing(
  setItems: (items: SourcingRequestWithId[]) => void,
  setLoading: (v: boolean) => void,
  cancelled: { current: boolean }
) {
  apiGet<{ data: SourcingRequestWithId[] }>('/sourcing')
    .then((res) => {
      if (cancelled.current) return
      const active = res.data
        .filter((r) => r.status === 'open' || r.status === 'sourcing')
        .slice(0, 5)
      setItems(active)
    })
    .catch(() => {})
    .finally(() => {
      if (!cancelled.current) setLoading(false)
    })
}

export default function ActiveSourcingWidget() {
  const [items, setItems] = useState<SourcingRequestWithId[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cancelled = { current: false }
    fetchActiveSourcing(setItems, setLoading, cancelled)
    const interval = setInterval(() => {
      fetchActiveSourcing(setItems, setLoading, cancelled)
    }, POLL_INTERVAL_MS)
    return () => {
      cancelled.current = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="lux-card p-6 h-full min-h-0 flex flex-col animate-bento-enter stagger-8">
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>Active Sourcing</SectionLabel>
        <Radio className="h-4 w-4 text-amber-500 animate-pulse-slow" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-5 w-3/4 rounded bg-lux-200/60 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-lux-500">No active requests</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <Link
              key={item.id}
              to="/sourcing"
              className="flex items-center justify-between gap-2 rounded-lux-card px-3 py-2.5 transition-colors hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${STATUS_COLORS[item.status] ?? 'bg-lux-300'}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-lux-700 truncate">
                    {item.customerName?.trim() || '—'}
                  </div>
                  <div className="text-xs text-lux-500 truncate">
                    {item.queryText?.trim() || '—'}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-lux-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
