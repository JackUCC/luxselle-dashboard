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
        className="relative h-full w-[86%] max-w-sm border-r border-gray-200/60 bg-white animate-in slide-in-from-left duration-300"
        data-testid="mobile-nav-drawer"
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-5">
          <div className="flex items-center gap-2.5">
            <img
              src="/luxselle-logo.svg"
              alt="Luxselle"
              className="h-7 w-auto max-w-[100px] object-contain object-left"
            />
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black">Dashboard</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto p-5">
          {NAV_GROUPS.map((group) => (
            <section key={group.section} className="space-y-1.5">
              {group.title ? (
                <h2 className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                  {group.title}
                </h2>
              ) : null}
              <nav className="space-y-0.5">
                {appRoutes
                  .filter((route) => route.section === group.section)
                  .map((route) => (
                    <NavLink
                      key={route.path}
                      to={route.path}
                      end={route.path === '/'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${isActive
                          ? 'bg-blue-50/80 text-blue-600'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
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
