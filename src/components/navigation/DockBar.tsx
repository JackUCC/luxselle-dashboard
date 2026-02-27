import { NavLink, useLocation } from 'react-router-dom'

import { appRoutes } from '../layout/routeMeta'
import { NAV_GROUPS } from './navGroups'

export default function DockBar() {
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed top-4 left-1/2 z-50 hidden -translate-x-1/2 xl:flex items-center rounded-[22px] border border-white/40 bg-white/60 px-4 py-2.5 shadow-glass-lg backdrop-blur-2xl"
      data-testid="dock-bar"
      aria-label="Main navigation"
    >
      <NavLink
        to="/"
        className="mr-2 flex items-center opacity-70 transition-opacity hover:opacity-100"
        title="Luxselle"
      >
        <img
          src="/luxselle-logo.svg"
          alt="Luxselle"
          className="h-5 w-auto max-w-[72px] object-contain"
        />
      </NavLink>

      <div className="mx-1.5 h-6 w-px bg-lux-300/40" />

      {NAV_GROUPS.map((group, groupIndex) => {
        const routes = appRoutes.filter((r) => r.section === group.section)
        if (!routes.length) return null

        return (
          <div key={group.section} className="flex items-center">
            {groupIndex > 0 && (
              <div className="mx-2.5 h-6 w-px bg-lux-300/40" />
            )}
            <div className="flex items-center gap-1.5">
              {routes.map((route) => {
                const isActive = route.path === '/'
                  ? pathname === '/'
                  : pathname.startsWith(route.path)

                return (
                  <NavLink
                    key={route.path}
                    to={route.path}
                    end={route.path === '/'}
                    aria-label={route.navLabel}
                    className="group relative flex flex-col items-center"
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-[14px] transition-all duration-200 hover:scale-110 ${
                        isActive
                          ? 'bg-lux-100 text-lux-900 shadow-sm'
                          : 'text-lux-400 hover:bg-white/80 hover:text-lux-700'
                      }`}
                    >
                      <route.icon className="h-5 w-5" />
                    </span>
                    <span
                      className={`mt-0.5 h-1 w-1 rounded-full transition-opacity duration-200 ${
                        isActive ? 'bg-lux-900 opacity-100' : 'opacity-0'
                      }`}
                    />
                    <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-lux-900 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-all duration-150 group-hover:-top-10 group-hover:opacity-100">
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
