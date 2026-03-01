import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'

import { appRoutes } from '../layout/routeMeta'
import { NAV_GROUPS } from './navGroups'
import { useScrollLock } from '../../lib/useScrollLock'
import { prefetchRoute } from '../../lib/routePrefetch'

interface MobileNavDrawerProps {
  open: boolean
  onClose: () => void
}

export default function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const location = useLocation()
  const lastPathRef = useRef(location.pathname)
  const onCloseRef = useRef(onClose)
  const handleRouteWarmup = (path: string) => () => prefetchRoute(path)
  onCloseRef.current = onClose

  const [mounted, setMounted] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
    } else {
      const timer = setTimeout(() => setMounted(false), 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      lastPathRef.current = location.pathname
      return
    }
    if (location.pathname !== lastPathRef.current) {
      onCloseRef.current()
    }
    lastPathRef.current = location.pathname
  }, [location.pathname, open])

  useScrollLock(open)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!mounted) return null

  return (
    <div className={`fixed inset-0 z-[80] xl:hidden transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`} role="dialog" aria-modal="true" aria-label="Navigation menu">
      <button
        type="button"
        className="absolute inset-0 bg-lux-900/20 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close navigation menu"
      />

      <aside
        className={`relative h-full w-[280px] max-w-[85%] border-r border-lux-200 bg-white transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        data-testid="mobile-nav-drawer"
      >
        <div className="flex h-12 items-center justify-between border-b border-lux-200 px-4">
          <div className="flex items-center gap-2">
            <img
              src="/luxselle-logo.svg"
              alt="Luxselle"
              className="h-6 w-auto max-w-[90px] object-contain object-left"
            />
            <span className="text-xs font-medium uppercase tracking-widest text-lux-400">Engine</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-3 min-h-[44px] min-w-[44px] flex items-center justify-center text-lux-400 transition-colors hover:bg-lux-50 hover:text-lux-600 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-3 pt-4">
          {NAV_GROUPS.map((group) => (
            <section key={group.section} className="space-y-1">
              {group.title ? (
                <h2 className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-lux-400">
                  {group.title}
                </h2>
              ) : null}
              <nav className="space-y-px">
                {appRoutes
                  .filter((route) => route.section === group.section)
                  .map((route) => (
                    <NavLink
                      key={route.path}
                      to={route.path}
                      end={route.path === '/'}
                      onMouseEnter={handleRouteWarmup(route.path)}
                      onFocus={handleRouteWarmup(route.path)}
                      onTouchStart={handleRouteWarmup(route.path)}
                      onClick={onClose}
                      className={({ isActive }: { isActive: boolean }) =>
                        `flex items-center gap-2.5 rounded-lg px-2.5 py-3 min-h-[44px] text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none ${isActive
                          ? 'bg-lux-800 text-white'
                          : 'text-lux-500 hover:bg-lux-50 hover:text-lux-800'
                        }`
                      }
                    >
                      <route.icon className={`h-[15px] w-[15px] shrink-0`} />
                      <span>{route.navLabel}</span>
                    </NavLink>
                  ))}
              </nav>
            </section>
          ))}
        </div>
      </aside>
    </div>
  )
}
