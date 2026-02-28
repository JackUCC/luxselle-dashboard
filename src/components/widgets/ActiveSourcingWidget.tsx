import { useState, useEffect } from 'react'
import { ChevronRight, Radio } from 'lucide-react'
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
  sourcing: 'bg-emerald-400',
  sourced: 'bg-emerald-400',
  fulfilled: 'bg-emerald-600',
  lost: 'bg-red-400',
}

export default function ActiveSourcingWidget() {
  const [items, setItems] = useState<SourcingRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiGet<{ data: SourcingRequest[] }>('/sourcing')
      .then((res) => {
        if (cancelled) return
        const active = res.data
          .filter((r) => r.status === 'open' || r.status === 'sourcing')
          .slice(0, 5)
        setItems(active)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="lux-card p-6 animate-bento-enter stagger-8">
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
              to={`/sourcing`}
              className="flex items-center justify-between rounded-lux-card px-3 py-2.5 transition-colors hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2 w-2 rounded-full ${STATUS_COLORS[item.status] ?? 'bg-lux-300'}`}
                />
                <span className="text-sm font-medium text-lux-700">
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
