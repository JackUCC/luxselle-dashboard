import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowLeftToLine, Menu } from 'lucide-react'

import { appRoutes } from '../layout/routeMeta'
import { NAV_GROUPS } from './navGroups'
import Drawer from '../design-system/Drawer'

export default function SidecarNav() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  const toWithSidecar = (path: string) => {
    const params = new URLSearchParams(location.pathname === path ? location.search : '')
    params.set('mode', 'sidecar')
    return `${path}?${params.toString()}`
  }

  return (
    <>
      <nav className="sticky top-0 z-40 flex items-center gap-2 border-b border-lux-200 bg-white/95 backdrop-blur px-3 py-2">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex min-h-[24px] min-w-[24px] items-center justify-center rounded-lg p-1.5 text-lux-600 transition-colors hover:bg-lux-100 hover:text-lux-900 focus:outline-none focus:ring-2 focus:ring-lux-gold"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <img
            src="/luxselle-logo.svg"
            alt="Luxselle"
            className="h-4 w-auto object-contain"
          />
        </div>
        <Link
          to={{ pathname: '/', search: '' }}
          replace
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-lux-200 px-2 py-1.5 text-ui-label font-medium text-lux-600 transition-colors hover:bg-lux-50 focus:outline-none focus:ring-2 focus:ring-lux-gold"
          title="Exit sidecar and return to overview"
          aria-label="Exit sidecar and return to overview"
        >
          <ArrowLeftToLine className="h-3.5 w-3.5" />
          Exit
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
          {NAV_GROUPS.map((group) => (
            <section key={group.section}>
              <h2 className="mb-1 px-2 text-ui-label font-semibold uppercase tracking-wider text-lux-500">
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
                        onClick={() => setDrawerOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-lux-200/80 text-lux-900'
                              : 'text-lux-600 hover:bg-lux-100 hover:text-lux-900'
                          }`
                        }
                      >
                        <route.icon className="h-4 w-4 shrink-0" />
                        <span>{route.navLabel}</span>
                      </NavLink>
                  ))}
              </nav>
            </section>
          ))}
        </div>
      </Drawer>
    </>
  )
}
