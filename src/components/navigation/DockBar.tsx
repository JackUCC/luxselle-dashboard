import { NavLink, useLocation } from 'react-router-dom'
import { LayoutGroup, motion } from 'framer-motion'

import { appRoutes } from '../layout/routeMeta'
import { NAV_GROUPS } from './navGroups'
import { prefetchRoute } from '../../lib/routePrefetch'

export default function DockBar() {
  const { pathname } = useLocation()
  const handleRouteWarmup = (path: string) => () => prefetchRoute(path)

  let staggerIndex = 0

  return (
    <nav
      className="fixed left-4 top-1/2 z-50 hidden -translate-y-1/2 xl:flex flex-col items-center rounded-[24px] border border-white/60 bg-white/80 px-3 py-6 shadow-glass-lg backdrop-blur-2xl"
      data-testid="dock-bar"
      aria-label="Main navigation"
    >
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: staggerIndex++ * 0.05 }}
      >
        <NavLink
          to="/"
          className="group mb-2 flex h-[70px] w-[60px] items-center justify-center rounded-[14px] transition-transform duration-200 hover:scale-110 hover:[filter:drop-shadow(0_0_8px_rgb(184_134_11_/_0.4))] focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:ring-offset-2 focus-visible:outline-none"
          title="Luxselle"
        >
          <img
            src="/luxselle-logo.svg"
            alt="Luxselle"
            className="h-auto w-[60px] max-w-[60px] object-contain transition-all duration-200 group-hover:[filter:brightness(0.92)_sepia(0.28)_saturate(1.35)_hue-rotate(4deg)]"
          />
        </NavLink>
      </motion.div>

      <div className="my-1.5 h-px w-6 bg-lux-300/40" />

      <LayoutGroup>
        {NAV_GROUPS.map((group, groupIndex) => {
          const routes = appRoutes.filter((r) => r.section === group.section)
          if (!routes.length) return null

          return (
            <div key={group.section} className="flex flex-col items-center">
              {groupIndex > 0 && (
                <div className="my-2 h-px w-6 bg-lux-300/40" />
              )}
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-lux-400">
                {group.title}
              </p>
              <div className="flex flex-col items-center gap-1">
                {routes.map((route) => {
                  const isActive = route.path === '/'
                    ? pathname === '/'
                    : pathname.startsWith(route.path)
                  const delay = staggerIndex++ * 0.05

                  return (
                    <motion.div
                      key={route.path}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay }}
                    >
                      <NavLink
                        to={route.path}
                        end={route.path === '/'}
                        onMouseEnter={handleRouteWarmup(route.path)}
                        onFocus={handleRouteWarmup(route.path)}
                        onTouchStart={handleRouteWarmup(route.path)}
                        aria-label={route.navLabel}
                        className="group relative flex items-center rounded-[14px] focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:ring-offset-2 focus-visible:outline-none"
                      >
                        <span className="relative flex h-11 w-11 items-center justify-center">
                          {isActive && (
                            <motion.div
                              layoutId="nav-active-pill"
                              className="absolute inset-0 rounded-[14px] bg-lux-100"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span
                            className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-[14px] transition-all duration-200 group-hover:scale-110 ${
                              isActive
                                ? 'text-lux-900'
                                : 'text-lux-400 group-hover:bg-white/80 group-hover:text-lux-700'
                            }`}
                          >
                            <route.icon className="h-5 w-5" />
                          </span>
                        </span>
                        <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-lux-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-all duration-150 group-hover:ml-3 group-hover:opacity-100">
                          {route.navLabel}
                        </span>
                      </NavLink>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </LayoutGroup>
    </nav>
  )
}
