import { NavLink, useLocation } from 'react-router-dom'

import { appRoutes } from '../layout/routeMeta'
import { NAV_GROUPS } from './navGroups'
import { prefetchRoute } from '../../lib/routePrefetch'

export default function DockBar() {
  const { pathname } = useLocation()
  const handleRouteWarmup = (path: string) => () => prefetchRoute(path)

  return (
    <nav
      className="fixed left-4 top-1/2 z-50 hidden -translate-y-1/2 xl:flex flex-col items-center rounded-[24px] border border-white/60 bg-white/80 px-3 py-6 shadow-glass-lg backdrop-blur-2xl"
      data-testid="dock-bar"
      aria-label="Main navigation"
    >
      <NavLink
        to="/"
        className="mb-2 flex h-[70px] w-[60px] items-center justify-center opacity-70 transition-opacity hover:opacity-100"
        title="Luxselle"
      >
        <img
          src="/luxselle-logo.svg"
          alt="Luxselle"
          className="h-auto w-[60px] max-w-[60px] object-contain"
        />
      </NavLink>

      <div className="my-1.5 h-px w-6 bg-lux-300/40" />

      {NAV_GROUPS.map((group, groupIndex) => {
        const routes = appRoutes.filter((r) => r.section === group.section)
        if (!routes.length) return null

        return (
          <div key={group.section} className="flex flex-col items-center">
            {groupIndex > 0 && (
              <div className="my-2 h-px w-6 bg-lux-300/40" />
            )}
            <div className="flex flex-col items-center gap-1.5">
              {routes.map((route) => {
                const isActive = route.path === '/'
                  ? pathname === '/'
                  : pathname.startsWith(route.path)

                return (
                  <NavLink
                    key={route.path}
                    to={route.path}
                    end={route.path === '/'}
                    onMouseEnter={handleRouteWarmup(route.path)}
                    onFocus={handleRouteWarmup(route.path)}
                    onTouchStart={handleRouteWarmup(route.path)}
                    aria-label={route.navLabel}
                    className="group relative flex items-center"
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-[14px] transition-all duration-200 group-hover:scale-110 ${
                        isActive
                          ? 'bg-lux-100 text-lux-900 shadow-sm'
                          : 'text-lux-400 group-hover:bg-white/80 group-hover:text-lux-700'
                      }`}
                    >
                      <route.icon className="h-5 w-5" />
                    </span>
                    <span
                      className={`absolute left-0 top-1/2 -translate-x-[10px] -translate-y-1/2 h-1 w-1 rounded-full transition-opacity duration-200 ${
                        isActive ? 'bg-lux-900 opacity-100' : 'opacity-0'
                      }`}
                    />
                    <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-lux-900 px-3 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-lg transition-all duration-150 group-hover:ml-3 group-hover:opacity-100">
                      {route.navLabel}
                    </span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
