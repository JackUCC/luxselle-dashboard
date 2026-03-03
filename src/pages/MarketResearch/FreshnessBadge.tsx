import { formatRelativeDate } from '../../lib/formatters'
import type { MarketResearchResult } from './types'

interface FreshnessBadgeProps {
  status?: MarketResearchResult['intel'] extends { freshnessStatus?: infer T } ? T : string
  snapshotAgeMinutes?: number
  mode?: 'standard' | 'background' | 'deep_dive'
  generatedAt?: string
}

const MODE_LABELS: Record<string, string> = {
  background: 'Background run',
  deep_dive: 'Deep dive',
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

export default function FreshnessBadge({ status, snapshotAgeMinutes, mode, generatedAt }: FreshnessBadgeProps) {
  const showModePill = mode === 'background' || mode === 'deep_dive'

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1.5">
        <span
          data-testid="market-research-freshness-badge"
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${freshnessTone(status as string | undefined)}`}
        >
          {freshnessLabel(status as string | undefined, snapshotAgeMinutes)}
        </span>
        {showModePill && (
          <span className="bg-lux-100 text-lux-600 text-[11px] font-semibold rounded-full px-2 py-0.5">
            {MODE_LABELS[mode]}
          </span>
        )}
      </div>
      {generatedAt && generatedAt.trim() !== '' && (
        <span className="text-[10px] text-lux-400">{formatRelativeDate(generatedAt)}</span>
      )}
    </div>
  )
}
