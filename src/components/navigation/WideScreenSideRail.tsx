import { NavLink } from 'react-router-dom'

import { appRoutes } from '../layout/routeMeta'
import { NAV_GROUPS } from './navGroups'

export default function WideScreenSideRail() {
  return (
    <aside
      className="sticky top-0 hidden h-screen w-72 flex-col border-r border-gray-200 bg-slate-50/90 px-5 py-6 backdrop-blur-xl xl:flex"
      data-testid="wide-screen-side-rail"
    >
      {/* Gradient accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-transparent opacity-50" />

      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white shadow-sm px-3 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm">
          L
        </div>
        <div>
          <p className="font-display text-base font-semibold text-gray-900">Luxselle</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Operations Hub</p>
        </div>
      </div>

      <div className="mt-8 flex-1 space-y-7 overflow-y-auto pb-3 no-scrollbar">
        {NAV_GROUPS.map((group) => (
          <section key={group.section} className="space-y-2">
            <h2 className="px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              {group.title}
            </h2>
            <nav className="space-y-1">
              {appRoutes
                .filter((route) => route.section === group.section)
                .map((route) => (
                  <NavLink
                    key={route.path}
                    to={route.path}
                    end={route.path === '/'}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                        ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
                      }`
                    }
                  >
                    <route.icon className={`h-4 w-4 ${route.path === location.pathname ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
                    <span>{route.navLabel}</span>
                    {/* Active glow dot */}
                  </NavLink>
                ))}
            </nav>
          </section>
        ))}
      </div>

      {/* Bottom status indicator */}
      <div className="mt-auto flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse" />
        <span className="text-xs font-medium text-gray-600">All systems online</span>
      </div>
    </aside>
  )
}
