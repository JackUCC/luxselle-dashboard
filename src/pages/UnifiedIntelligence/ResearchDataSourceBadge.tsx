import type { PriceCheckResult } from '@shared/schemas'

interface ResearchDataSourceBadgeProps {
  dataSource?: PriceCheckResult['dataSource']
}

export default function ResearchDataSourceBadge({ dataSource }: ResearchDataSourceBadgeProps) {
  if (dataSource === 'web_search') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Live data
      </span>
    )
  }

  if (dataSource === 'ai_fallback') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20">
        AI estimate
      </span>
    )
  }

  if (dataSource === 'provider_unavailable') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-600/20">
        AI unavailable
      </span>
    )
  }

  return null
}
