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
    <nav className="sticky top-0 z-40 border-b border-gray-200/60 bg-white/95 backdrop-blur">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <div className="mr-1 flex shrink-0 items-center gap-1">
          <img
            src="/luxselle-logo.svg"
            alt="Luxselle"
            className="h-5 w-auto object-contain"
          />
          <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Jarvis</span>
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
                className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'bg-lux-gold/10 text-black'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                <route.icon className="h-3.5 w-3.5" />
                <span>{route.label}</span>
              </NavLink>
            )
          })}
        </div>

        <Link
          to="/"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
          title="Exit sidecar and return to overview"
          aria-label="Exit sidecar and return to overview"
        >
          <ArrowLeftToLine className="h-3.5 w-3.5" />
          Exit
        </Link>
      </div>
    </nav>
  )
}
