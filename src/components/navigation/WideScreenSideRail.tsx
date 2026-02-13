import { NavLink } from 'react-router-dom'

import { appRoutes } from '../layout/routeMeta'

const groups = [
  { title: 'Core', section: 'core' as const },
  { title: 'Operations', section: 'operations' as const },
]

export default function WideScreenSideRail() {
  return (
    <aside
      className="sticky top-0 hidden h-screen w-72 flex-col border-r border-gray-200 bg-white/95 px-5 py-6 backdrop-blur 2xl:flex"
      data-testid="wide-screen-side-rail"
    >
      <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-sm font-bold text-white">
          L
        </div>
        <div>
          <p className="font-display text-base font-semibold text-gray-900">Luxselle</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Operations Hub</p>
        </div>
      </div>

      <div className="mt-8 flex-1 space-y-7 overflow-y-auto pb-3 no-scrollbar">
        {groups.map((group) => (
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
                      `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-gray-900 text-white shadow-soft-lg'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                  >
                    <route.icon className="h-4 w-4" />
                    <span>{route.navLabel}</span>
                  </NavLink>
                ))}
            </nav>
          </section>
        ))}
      </div>
    </aside>
  )
}
