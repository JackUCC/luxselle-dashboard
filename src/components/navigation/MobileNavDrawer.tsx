import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'

import { appRoutes } from '../layout/routeMeta'

interface MobileNavDrawerProps {
  open: boolean
  onClose: () => void
}

const groups = [
  { title: 'Core', section: 'core' as const },
  { title: 'Operations', section: 'operations' as const },
]

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
    // Close drawer when route changes via browser navigation.
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
    <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close navigation menu"
      />

      <aside
        className="relative h-full w-[86%] max-w-sm border-r border-gray-200 bg-white shadow-2xl animate-in slide-in-from-left duration-300"
        data-testid="mobile-nav-drawer"
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900 text-xs font-bold text-white">
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
            className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto p-5">
          {groups.map((group) => (
            <section key={group.section} className="space-y-2">
              <h2 className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
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
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-gray-900 text-white shadow-sm'
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
    </div>
  )
}
