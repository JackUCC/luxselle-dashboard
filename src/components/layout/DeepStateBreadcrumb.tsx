import { ChevronRight } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { getDeepStateRule, getRouteMeta } from './routeMeta'

export default function DeepStateBreadcrumb() {
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const route = getRouteMeta(location.pathname)
  const rule = getDeepStateRule(location.pathname)

  if (!route) return null

  const hasDeepState = rule?.keys.some((key) => {
    const value = searchParams.get(key)
    return value != null && value.trim() !== ''
  })
  const labels = rule ? rule.toCrumbLabel(searchParams).filter(Boolean) : []

  if (!hasDeepState || !labels.length) {
    return (
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px] font-medium text-lux-400"
        data-testid="deep-state-breadcrumb"
      >
        <span className="text-lux-800">{route.label}</span>
      </nav>
    )
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px] font-medium text-lux-400"
      data-testid="deep-state-breadcrumb"
    >
      <Link to={route.path} className="rounded px-1.5 py-0.5 transition-colors hover:text-lux-800">
        {route.label}
      </Link>
      {labels.map((label, index) => {
        const last = index === labels.length - 1
        return (
          <div key={`${label}-${index}`} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-lux-300" />
            <span className={last ? 'text-lux-800' : ''}>{label}</span>
          </div>
        )
      })}
    </nav>
  )
}
