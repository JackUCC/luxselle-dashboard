import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowLeftToLine, Calculator, FileText, LayoutGrid, Package, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface SidecarRoute {
  path: string
  label: string
  icon: LucideIcon
}

const sidecarRoutes: SidecarRoute[] = [
  { path: '/', label: 'Home', icon: LayoutGrid },
  { path: '/buy-box', label: 'Price Check', icon: Calculator },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/serial-check', label: 'Serial', icon: Search },
  { path: '/invoices', label: 'Invoices', icon: FileText },
]

const SIDECAR_SUFFIX = '?mode=sidecar'

export default function SidecarNav() {
  const { pathname } = useLocation()

  return (
    <nav className="sticky top-0 z-40 border-b border-lux-200 bg-white/95 backdrop-blur">
      <div className="flex items-center gap-1 px-2 py-1">
        <div className="mr-1 flex shrink-0 items-center gap-1">
          <img
            src="/luxselle-logo.svg"
            alt="Luxselle"
            className="h-4 w-auto object-contain"
          />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto no-scrollbar">
          {sidecarRoutes.map((route) => {
            const isActive = route.path === '/' ? pathname === '/' : pathname.startsWith(route.path)
            return (
              <NavLink
                key={route.path}
                to={`${route.path}${SIDECAR_SUFFIX}`}
                end={route.path === '/'}
                title={route.label}
                aria-label={route.label}
                className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'bg-lux-800 text-white'
                    : 'text-lux-500 hover:bg-lux-50 hover:text-lux-800'
                }`}
              >
                <route.icon className="h-3 w-3" />
                <span>{route.label}</span>
              </NavLink>
            )
          })}
        </div>

        <Link
          to="/"
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-lux-200 px-1.5 py-1 text-[11px] font-medium text-lux-600 transition-colors hover:bg-lux-50"
          title="Exit sidecar and return to overview"
          aria-label="Exit sidecar and return to overview"
        >
          <ArrowLeftToLine className="h-3 w-3" />
          Exit
        </Link>
      </div>
    </nav>
  )
}
