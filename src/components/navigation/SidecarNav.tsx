import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowLeftToLine, Menu } from 'lucide-react'

import { getExitSidecarPath } from '../../lib/LayoutModeContext'
import { prefetchRoute } from '../../lib/routePrefetch'
import { appRoutes } from '../layout/routeMeta'
import { NAV_GROUPS } from './navGroups'
import Drawer from '../design-system/Drawer'

export default function SidecarNav() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const handleRouteWarmup = (path: string) => () => prefetchRoute(path)

  const toWithSidecar = (path: string) => {
    const params = new URLSearchParams(location.pathname === path ? location.search : '')
    params.set('mode', 'sidecar')
    return `${path}?${params.toString()}`
  }

  return (
    <>
      <nav className="sticky top-0 z-40 flex items-center gap-2 border-b border-lux-200 bg-gradient-to-r from-white via-lux-50/85 to-white px-3 py-2.5 shadow-[0_2px_10px_rgba(15,23,42,0.06)] backdrop-blur">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-lux-200 bg-white/95 p-2 text-lux-600 transition-all hover:-translate-y-0.5 hover:border-lux-300 hover:bg-white hover:text-lux-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold/30"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <img
            src="/luxselle-logo.svg"
            alt="Luxselle"
            className="h-4 w-auto object-contain"
          />
          <span className="rounded-full border border-lux-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-lux-500">
            Sidecar
          </span>
        </div>
        <Link
          to={getExitSidecarPath('/', location.search)}
          replace
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl border border-lux-200 bg-white px-2.5 py-1.5 text-ui-label font-semibold text-lux-700 transition-all hover:-translate-y-0.5 hover:border-lux-300 hover:bg-lux-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold/30"
          title="Exit sidecar and return to overview"
          aria-label="Exit sidecar and return to overview"
        >
          <ArrowLeftToLine className="h-4 w-4" />
          <span className="hidden min-[380px]:inline">Exit</span>
        </Link>
      </nav>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        position="left"
        title="Navigate"
        titleId="sidecar-nav-title"
      >
        <div className="space-y-5">
          {NAV_GROUPS.map((group) => {
            return (
              <section key={group.section} className="px-1">
                <h2 className="mb-1 px-2 text-ui-label font-semibold uppercase tracking-[0.14em] text-lux-500">
                  {group.title}
                </h2>
                <nav className="space-y-px" aria-label={group.title}>
                  {appRoutes
                    .filter((route) => route.section === group.section)
                    .map((route) => (
                      <NavLink
                        key={route.path}
                        to={toWithSidecar(route.path)}
                        end={route.path === '/'}
                        onMouseEnter={handleRouteWarmup(route.path)}
                        onFocus={handleRouteWarmup(route.path)}
                        onTouchStart={handleRouteWarmup(route.path)}
                        onClick={() => setDrawerOpen(false)}
                        className={({ isActive }) =>
                          `group relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none ${
                            isActive
                              ? 'border border-lux-gold/30 bg-white text-lux-900 shadow-[0_4px_12px_rgba(15,23,42,0.08)]'
                              : 'border border-transparent text-lux-600 hover:-translate-y-0.5 hover:bg-white/80 hover:text-lux-900'
                          }`
                        }
                      >
                        <route.icon className="h-5 w-5 shrink-0 text-lux-500 group-hover:text-lux-700" />
                        <span>{route.navLabel}</span>
                      </NavLink>
                    ))}
                </nav>
              </section>
            )
          })}
        </div>
      </Drawer>
    </>
  )
}
