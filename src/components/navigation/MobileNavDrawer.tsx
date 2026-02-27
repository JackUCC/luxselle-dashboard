import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'

import { appRoutes } from '../layout/routeMeta'
import { NAV_GROUPS } from './navGroups'
import { useScrollLock } from '../../lib/useScrollLock'

interface MobileNavDrawerProps {
  open: boolean
  onClose: () => void
}

export default function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const location = useLocation()
  const lastPathRef = useRef(location.pathname)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] xl:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <button
        type="button"
        className="absolute inset-0 bg-lux-900/20 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close navigation menu"
      />

      <aside
        className="relative h-full w-[280px] max-w-[85%] border-r border-lux-200 bg-white animate-in slide-in-from-left duration-200"
        data-testid="mobile-nav-drawer"
      >
        <div className="flex h-12 items-center justify-between border-b border-lux-200 px-4">
          <div className="flex items-center gap-2">
            <img
              src="/luxselle-logo.svg"
              alt="Luxselle"
              className="h-6 w-auto max-w-[90px] object-contain object-left"
            />
            <span className="text-[10px] font-medium uppercase tracking-widest text-lux-400">Engine</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-lux-400 transition-colors hover:bg-lux-50 hover:text-lux-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-3 pt-4">
          {NAV_GROUPS.map((group) => (
            <section key={group.section} className="space-y-0.5">
              {group.title ? (
                <h2 className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-lux-400">
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
                      onClick={onClose}
                      className={({ isActive }: { isActive: boolean }) =>
                        `flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-colors duration-150 ${isActive
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
