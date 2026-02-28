/**
 * App shell: React Query, React Router, responsive navigation, deep-state breadcrumbs,
 * Toaster, ErrorBoundary, and route definitions.
 * Supports two layout modes: Overview (full dashboard) and Sidecar (compact panel).
 * Route views are lazy-loaded to improve INP (Interaction to Next Paint) on nav clicks.
 * @see docs/CODE_REFERENCE.md
 */
import { Suspense, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { AlertCircle, Menu } from 'lucide-react'

import { ErrorBoundary } from './components/ErrorBoundary'
import AnimatedRoutes from './components/layout/AnimatedRoutes'
import DeepStateBreadcrumb from './components/layout/DeepStateBreadcrumb'
import DockBar from './components/navigation/DockBar'
import MobileNavDrawer from './components/navigation/MobileNavDrawer'
import SidecarNav from './components/navigation/SidecarNav'
import { queryClient } from './lib/queryClient'
import { ServerStatusProvider, useServerStatus } from './lib/ServerStatusContext'
import { LayoutModeProvider, useLayoutMode } from './lib/LayoutModeContext'
import { getRouteMeta } from './components/layout/routeMeta'

const SidecarFallback = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="flex items-center justify-center py-12 text-xs text-lux-400"
    aria-hidden
  >
    Loading…
  </motion.div>
)

const OverviewFallback = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="min-h-[40vh] flex items-center justify-center text-xs text-lux-400"
    aria-hidden
  >
    Loading…
  </motion.div>
)

const AppContent = () => {
  const { isConnected, refetchStatus } = useServerStatus()
  const { isSidecar } = useLayoutMode()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()
  const routeMeta = getRouteMeta(location.pathname)

  if (isSidecar) {
    return (
      <div className="min-h-screen bg-white text-lux-800 font-sans">
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
        <main className="px-3 py-3">
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
    <div className="min-h-screen bg-white text-lux-800 font-sans">
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
          <Menu className="h-4 w-4" />
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

      <main className="mx-auto max-w-8xl px-5 py-5 sm:px-6 sm:py-6 xl:pl-24">
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
            <AppContent />
          </LayoutModeProvider>
        </BrowserRouter>
      </ServerStatusProvider>
    </QueryClientProvider>
  )
}

export default LuxselleApp
