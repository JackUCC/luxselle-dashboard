import type { MarketResearchResult } from './types'

interface FreshnessBadgeProps {
  status?: MarketResearchResult['intel'] extends { freshnessStatus?: infer T } ? T : string
  snapshotAgeMinutes?: number
}

function freshnessTone(status?: string): string {
  if (status === 'live') return 'bg-emerald-100 text-emerald-800'
  if (status === 'fresh') return 'bg-sky-100 text-sky-800'
  if (status === 'stale') return 'bg-amber-100 text-amber-800'
  if (status === 'expired') return 'bg-rose-100 text-rose-800'
  return 'bg-lux-100 text-lux-700'
}

function freshnessLabel(status?: string, age?: number): string {
  if (status === 'live') return 'Live'
  if (typeof age === 'number') return `Cached · ${age}m`
  if (status === 'fresh') return 'Fresh cache'
  if (status === 'stale') return 'Stale cache'
  if (status === 'expired') return 'Expired cache'
  return 'Freshness unknown'
}

export default function FreshnessBadge({ status, snapshotAgeMinutes }: FreshnessBadgeProps) {
  return (
    <span
      data-testid="market-research-freshness-badge"
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${freshnessTone(status as string | undefined)}`}
    >
      {freshnessLabel(status as string | undefined, snapshotAgeMinutes)}
    </span>
  )
}
