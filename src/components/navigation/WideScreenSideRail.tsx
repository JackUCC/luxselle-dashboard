import { NavLink, useLocation } from 'react-router-dom'

import { appRoutes } from '../layout/routeMeta'
import { NAV_GROUPS } from './navGroups'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${isActive
    ? 'bg-lux-gold/10 text-black border border-lux-gold/30'
    : 'text-gray-600 hover:bg-gray-100/60 hover:text-black'
  }`
}

export default function WideScreenSideRail() {
  const { pathname } = useLocation()
  return (
    <aside
      className="sticky top-0 hidden h-screen w-72 flex-col border-r border-gray-200/60 bg-lux-50 px-5 py-6 xl:flex"
      data-testid="wide-screen-side-rail"
    >
      <div className="flex items-center gap-3 px-2 py-1">
        <img
          src="/luxselle-logo.svg"
          alt="Luxselle"
          className="h-9 w-auto max-w-[140px] object-contain object-left"
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black">Supplier Engine</p>
      </div>

      <div className="mt-8 flex-1 space-y-7 overflow-y-auto pb-3 no-scrollbar [contain:layout]">
        {NAV_GROUPS.map((group) => (
          <section key={group.section} className="space-y-1.5">
            {group.title ? (
              <h2 className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600">
                {group.title}
              </h2>
            ) : null}
            <nav className="space-y-0.5" aria-label={group.title || 'Main'}>
              {appRoutes
                .filter((route) => route.section === group.section)
                .map((route) => (
                  <NavLink
                    key={route.path}
                    to={route.path}
                    end={route.path === '/'}
                    className={navLinkClass}
                  >
                    <route.icon className={`h-4 w-4 shrink-0 ${route.path === pathname ? 'text-lux-gold' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <span>{route.navLabel}</span>
                  </NavLink>
                ))}
            </nav>
          </section>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-2 px-3 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="text-xs text-gray-600">All systems online</span>
      </div>
    </aside>
  )
}
