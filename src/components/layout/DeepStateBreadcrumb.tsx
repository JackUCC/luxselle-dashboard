import { ChevronRight } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { getDeepStateRule, getRouteMeta } from './routeMeta'

export default function DeepStateBreadcrumb() {
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const route = getRouteMeta(location.pathname)
  const rule = getDeepStateRule(location.pathname)

  if (!route || !rule) return null

  const hasDeepState = rule.keys.some((key) => {
    const value = searchParams.get(key)
    return value != null && value.trim() !== ''
  })

  if (!hasDeepState) return null

  const labels = rule.toCrumbLabel(searchParams).filter(Boolean)
  if (!labels.length) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-5 flex items-center gap-1 overflow-x-auto no-scrollbar text-xs font-medium text-gray-500"
      data-testid="deep-state-breadcrumb"
    >
      <Link to={route.path} className="rounded px-1.5 py-1 transition-colors hover:text-gray-800">
        {route.label}
      </Link>
      {labels.map((label, index) => {
        const last = index === labels.length - 1
        return (
          <div key={`${label}-${index}`} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            <span className={last ? 'text-gray-900' : ''}>{label}</span>
          </div>
        )
      })}
    </nav>
  )
}
