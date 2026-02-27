import { NavLink, useLocation } from 'react-router-dom'

import { appRoutes } from '../layout/routeMeta'
import { NAV_GROUPS } from './navGroups'

export default function DockBar() {
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed top-4 left-1/2 z-50 hidden -translate-x-1/2 xl:flex items-center gap-1 rounded-2xl border border-white/20 bg-white/70 px-3 py-2 shadow-[0_2px_20px_rgba(0,0,0,0.08),0_0_1px_rgba(0,0,0,0.1)] backdrop-blur-xl"
      data-testid="dock-bar"
      aria-label="Main navigation"
    >
      <NavLink
        to="/"
        className="mr-1 flex items-center"
        title="Luxselle"
      >
        <img
          src="/luxselle-logo.svg"
          alt="Luxselle"
          className="h-5 w-auto max-w-[72px] object-contain"
        />
      </NavLink>

      <div className="mx-1 h-5 w-px bg-lux-200/80" />

      {NAV_GROUPS.map((group, groupIndex) => {
        const routes = appRoutes.filter((r) => r.section === group.section)
        if (!routes.length) return null

        return (
          <div key={group.section} className="flex items-center">
            {groupIndex > 0 && (
              <div className="mx-1 h-5 w-px bg-lux-200/80" />
            )}
            <div className="flex items-center gap-0.5">
              {routes.map((route) => {
                const isActive = route.path === '/'
                  ? pathname === '/'
                  : pathname.startsWith(route.path)

                return (
                  <NavLink
                    key={route.path}
                    to={route.path}
                    end={route.path === '/'}
                    title={route.navLabel}
                    aria-label={route.navLabel}
                    className="group relative flex flex-col items-center"
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-lux-800 text-white shadow-sm'
                          : 'text-lux-400 hover:bg-lux-100 hover:text-lux-700'
                      }`}
                    >
                      <route.icon className="h-[17px] w-[17px]" />
                    </span>
                    <span
                      className={`mt-0.5 h-[3px] w-[3px] rounded-full transition-opacity duration-200 ${
                        isActive ? 'bg-lux-800 opacity-100' : 'opacity-0'
                      }`}
                    />
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
