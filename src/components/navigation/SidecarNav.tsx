import { NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { Calculator, LayoutGrid, Package, FileText, Search } from 'lucide-react'
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

export default function SidecarNav() {
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const modeParam = searchParams.get('mode') === 'sidecar' ? '?mode=sidecar' : ''

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200/60 bg-white/95 backdrop-blur px-2 py-1.5">
      <div className="flex items-center gap-1">
        <img
          src="/luxselle-logo.svg"
          alt="Luxselle"
          className="h-5 w-auto object-contain"
        />
        <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Engine</span>
      </div>

      <div className="flex items-center gap-0.5">
        {sidecarRoutes.map((route) => {
          const isActive = route.path === '/' ? pathname === '/' : pathname.startsWith(route.path)
          return (
            <NavLink
              key={route.path}
              to={`${route.path}${modeParam}`}
              title={route.label}
              className={`rounded-lg p-1.5 transition-colors ${
                isActive
                  ? 'bg-lux-gold/10 text-black'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <route.icon className="h-4 w-4" />
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
