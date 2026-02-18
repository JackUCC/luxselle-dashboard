import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'

import { appRoutes } from '../layout/routeMeta'
import { NAV_GROUPS } from './navGroups'

interface MobileNavDrawerProps {
  open: boolean
  onClose: () => void
}

export default function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const location = useLocation()
  const lastPathRef = useRef(location.pathname)

  useEffect(() => {
    if (!open) {
      lastPathRef.current = location.pathname
      return
    }
    if (location.pathname !== lastPathRef.current) {
      onClose()
    }
    lastPathRef.current = location.pathname
  }, [location.pathname, open, onClose])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] xl:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <button
        type="button"
        className="absolute inset-0 bg-gray-500/20 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close navigation menu"
      />

      <aside
        className="relative h-full w-[86%] max-w-sm border-r border-gray-200 bg-white shadow-2xl animate-in slide-in-from-left duration-300"
        data-testid="mobile-nav-drawer"
      >
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-transparent opacity-50" />

        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
              L
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-gray-900">Luxselle</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">Control</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto p-5">
          {NAV_GROUPS.map((group) => (
            <section key={group.section} className="space-y-2">
              {group.title ? (
                <h2 className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                  {group.title}
                </h2>
              ) : null}
              <nav className="space-y-1">
                {appRoutes
                  .filter((route) => route.section === group.section)
                  .map((route) => (
                    <NavLink
                      key={route.path}
                      to={route.path}
                      end={route.path === '/'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                          ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
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
    </div>
  )
}
