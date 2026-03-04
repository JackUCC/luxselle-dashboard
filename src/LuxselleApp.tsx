/**
 * App shell: React Query, React Router, responsive navigation, deep-state breadcrumbs,
 * Toaster, ErrorBoundary, and route definitions.
 * Supports two layout modes: Overview (full dashboard) and Sidecar (compact panel).
 * Route views are lazy-loaded to improve INP (Interaction to Next Paint) on nav clicks.
 * @see docs/CODE_REFERENCE.md
 */
import { Suspense, useEffect, useRef, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Menu } from 'lucide-react'

import { ErrorBoundary } from './components/ErrorBoundary'
import AnimatedRoutes from './components/layout/AnimatedRoutes'
import DeepStateBreadcrumb from './components/layout/DeepStateBreadcrumb'
import DockBar from './components/navigation/DockBar'
import MobileNavDrawer from './components/navigation/MobileNavDrawer'
import SidecarNav from './components/navigation/SidecarNav'
import Skeleton from './components/feedback/Skeleton'
import { queryClient } from './lib/queryClient'
import { ServerStatusProvider, useServerStatus } from './lib/ServerStatusContext'
import { LayoutModeProvider, getSidecarPath, useLayoutMode } from './lib/LayoutModeContext'
import { ResearchSessionProvider } from './lib/ResearchSessionContext'
import { getRouteMeta } from './components/layout/routeMeta'

const SidecarFallback = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="space-y-3 py-3"
    aria-hidden="true"
  >
    <div className="rounded-xl border border-lux-200 bg-white p-3">
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full rounded-md" variant="rect" />
        ))}
      </div>
    </div>
    <div className="space-y-2 rounded-xl border border-lux-200 bg-white p-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-28 w-full rounded-lg" variant="rect" />
    </div>
  </motion.div>
)

const OverviewFallback = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="min-h-[40vh] space-y-5"
    aria-hidden="true"
  >
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-lux-200 bg-white p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-8 w-36" variant="rect" />
          <Skeleton className="mt-3 h-3 w-20" />
        </div>
      ))}
    </div>
  </motion.div>
)

const AppContent = () => {
  const { isConnected, refetchStatus } = useServerStatus()
  const { isSidecar } = useLayoutMode()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const previousLocationRef = useRef(location)
  const routeMeta = getRouteMeta(location.pathname)

  useEffect(() => {
    const previous = previousLocationRef.current
    const previousMode = new URLSearchParams(previous.search).get('mode')
    const currentMode = new URLSearchParams(location.search).get('mode')
    const changedPath = location.pathname !== previous.pathname

    // Preserve sidecar intent when internal links drop `mode=sidecar` across routes.
    if (previousMode === 'sidecar' && currentMode !== 'sidecar' && changedPath) {
      navigate(getSidecarPath(location.pathname, location.search), { replace: true })
      return
    }

    previousLocationRef.current = location
  }, [location, navigate])

  if (isSidecar) {
    return (
      <div className="min-h-screen overflow-x-clip bg-white text-lux-800 font-sans">
        <SidecarNav />
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'text-xs font-medium !bg-white !text-lux-800 !border !border-lux-200 !shadow-elevated !rounded-lux-modal animate-slide-left',
            success: {
              className: 'text-xs font-medium !bg-white !text-lux-800 !border !border-lux-200 !border-l-4 !border-l-emerald-500 !shadow-elevated !rounded-lux-modal animate-slide-left',
              duration: 3000,
            },
            error: {
              className: 'text-xs font-medium !bg-white !text-lux-800 !border !border-lux-200 !border-l-4 !border-l-red-500 !shadow-elevated !rounded-lux-modal animate-slide-left',
              duration: 5000,
            },
          }}
        />
        <main className="px-2.5 py-3 min-[360px]:px-3 min-[420px]:px-4">
          <ErrorBoundary>
            <Suspense fallback={<SidecarFallback />}>
              <AnimatedRoutes />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-lux-800 font-sans">
      {isConnected === false && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">
          <div className="mx-auto flex max-w-8xl flex-wrap items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Backend not configured. Set VITE_API_BASE in Vercel to your Railway URL, then redeploy.</span>
            <button
              type="button"
              onClick={() => refetchStatus()}
              className="rounded-md bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <DockBar />

      <div className="sticky top-0 z-50 flex h-12 items-center justify-between gap-2 border-b border-lux-200 bg-white/80 backdrop-blur-sm px-4 xl:hidden">
        <button
          type="button"
          className="rounded-md p-1.5 text-lux-500 transition-colors hover:bg-lux-50 hover:text-lux-800 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
          data-testid="mobile-nav-toggle"
        >
          <Menu className="h-5 w-5" />
        </button>
        {routeMeta ? (
          <span className="min-w-0 truncate text-xs font-medium text-lux-800" data-testid="mobile-page-title">
            {routeMeta.label}
          </span>
        ) : null}
        {!routeMeta ? <span className="w-9" /> : null}
      </div>

      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <Toaster
        position="top-right"
        toastOptions={{
          className: 'text-xs font-medium !bg-white !text-lux-800 !border !border-lux-200 !shadow-elevated !rounded-lux-modal animate-slide-left',
          success: {
            className: 'text-xs font-medium !bg-white !text-lux-800 !border !border-lux-200 !border-l-4 !border-l-emerald-500 !shadow-elevated !rounded-lux-modal animate-slide-left',
            duration: 3000,
          },
          error: {
            className: 'text-xs font-medium !bg-white !text-lux-800 !border !border-lux-200 !border-l-4 !border-l-red-500 !shadow-elevated !rounded-lux-modal animate-slide-left',
            duration: 5000,
          },
        }}
      />

      <main className="mx-auto max-w-8xl px-4 py-5 min-[360px]:px-5 sm:px-6 sm:py-6 xl:pl-32 2xl:pl-36">
        <DeepStateBreadcrumb />
        <ErrorBoundary>
          <Suspense fallback={<OverviewFallback />}>
            <AnimatedRoutes />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}

const LuxselleApp = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ServerStatusProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <LayoutModeProvider>
            <ResearchSessionProvider>
              <AppContent />
            </ResearchSessionProvider>
          </LayoutModeProvider>
        </BrowserRouter>
      </ServerStatusProvider>
    </QueryClientProvider>
  )
}

export default LuxselleApp
