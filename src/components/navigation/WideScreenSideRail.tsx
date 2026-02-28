import { NavLink, useLocation } from 'react-router-dom'

import { appRoutes } from '../layout/routeMeta'
import { NAV_GROUPS } from './navGroups'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none ${isActive
    ? 'bg-lux-800 text-white'
    : 'text-lux-500 hover:bg-lux-200/50 hover:text-lux-800'
  }`
}

export default function WideScreenSideRail() {
  const { pathname } = useLocation()
  return (
    <aside
      className="sticky top-0 hidden h-screen w-56 flex-col border-r border-lux-200 bg-white px-3 py-4 xl:flex"
      data-testid="wide-screen-side-rail"
    >
      <div className="flex items-center gap-2 px-2.5 mb-1">
        <img
          src="/luxselle-logo.svg"
          alt="Luxselle"
          className="h-7 w-auto max-w-[100px] object-contain object-left"
        />
        <span className="text-xs font-medium uppercase tracking-widest text-lux-400">Engine</span>
      </div>

      <div className="mt-6 flex-1 space-y-5 overflow-y-auto pb-3 no-scrollbar [contain:layout]">
        {NAV_GROUPS.map((group) => (
          <section key={group.section} className="space-y-0.5">
            {group.title ? (
              <h2 className="px-2.5 pb-1 text-xs font-semibold uppercase tracking-widest text-lux-400">
                {group.title}
              </h2>
            ) : null}
            <nav className="space-y-px" aria-label={group.title || 'Main'}>
              {appRoutes
                .filter((route) => route.section === group.section)
                .map((route) => (
                  <NavLink
                    key={route.path}
                    to={route.path}
                    end={route.path === '/'}
                    className={navLinkClass}
                  >
                    <route.icon className={`h-[15px] w-[15px] shrink-0 ${route.path === pathname ? 'text-white/70' : 'text-lux-400 group-hover:text-lux-600'}`} />
                    <span>{route.navLabel}</span>
                  </NavLink>
                ))}
            </nav>
          </section>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-2 px-2.5 py-1.5 border-t border-lux-200 pt-3">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="text-xs text-lux-400">Online</span>
      </div>
    </aside>
  )
}
