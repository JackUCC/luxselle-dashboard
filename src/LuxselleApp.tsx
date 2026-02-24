/**
 * App shell: React Query, React Router, responsive navigation, deep-state breadcrumbs,
 * Toaster, ErrorBoundary, and route definitions.
 * Supports two layout modes: Overview (full dashboard) and Sidecar (compact panel).
 * Route views are lazy-loaded to improve INP (Interaction to Next Paint) on nav clicks.
 * @see docs/CODE_REFERENCE.md
 */
import { lazy, Suspense, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AlertCircle, Menu } from 'lucide-react'

import { ErrorBoundary } from './components/ErrorBoundary'
import DeepStateBreadcrumb from './components/layout/DeepStateBreadcrumb'
import MobileNavDrawer from './components/navigation/MobileNavDrawer'
import WideScreenSideRail from './components/navigation/WideScreenSideRail'
import SidecarNav from './components/navigation/SidecarNav'
import { queryClient } from './lib/queryClient'
import { ServerStatusProvider, useServerStatus } from './lib/ServerStatusContext'
import { LayoutModeProvider, useLayoutMode } from './lib/LayoutModeContext'

const DashboardView = lazy(() => import('./pages/Dashboard/DashboardView'))
const InventoryView = lazy(() => import('./pages/Inventory/InventoryView'))
const EvaluatorView = lazy(() => import('./pages/BuyBox/EvaluatorView'))
const SourcingView = lazy(() => import('./pages/Sourcing/SourcingView'))
const JobsView = lazy(() => import('./pages/Jobs/JobsView'))
const InvoicesView = lazy(() => import('./pages/Invoices/InvoicesView'))
const MarketResearchView = lazy(() => import('./pages/MarketResearch/MarketResearchView'))
const SerialCheckView = lazy(() => import('./pages/SerialCheck/SerialCheckView'))
const RetailPriceView = lazy(() => import('./pages/RetailPrice/RetailPriceView'))

const AppContent = () => {
  const { isConnected, refetchStatus } = useServerStatus()
  const { isSidecar } = useLayoutMode()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  if (isSidecar) {
    return (
      <div className="min-h-screen bg-lux-50 text-black font-sans">
        <SidecarNav />
        <Toaster
          position="top-center"
          toastOptions={{
            className: 'text-sm font-medium !bg-white !text-black !border !border-lux-gold/40 !shadow-elevated !rounded-xl',
            duration: 3000,
          }}
        />
        <main className="px-3 py-4">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center py-12 text-sm text-gray-500" aria-hidden>Loading…</div>}>
              <Routes>
                <Route path="/" element={<DashboardView />} />
                <Route path="/inventory" element={<InventoryView />} />
                <Route path="/buy-box" element={<EvaluatorView />} />
                <Route path="/serial-check" element={<SerialCheckView />} />
                <Route path="/retail-price" element={<RetailPriceView />} />
                <Route path="/market-research" element={<MarketResearchView />} />
                <Route path="/sourcing" element={<SourcingView />} />
                <Route path="/jobs" element={<JobsView />} />
                <Route path="/invoices" element={<InvoicesView />} />
                <Route path="/evaluator" element={<Navigate to="/buy-box" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-lux-50 text-black font-sans">
      {isConnected === false && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm font-medium text-amber-800">
          <div className="mx-auto flex max-w-8xl flex-wrap items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Backend not configured. Set VITE_API_BASE in Vercel (Settings → Environment Variables) to your Railway URL, then redeploy. Env vars only apply to new builds.</span>
            <button
              type="button"
              onClick={() => refetchStatus()}
              className="rounded bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-300"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="xl:flex">
        <WideScreenSideRail />

        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-50 flex h-14 items-center px-4 sm:px-6 xl:hidden">
            <button
              type="button"
              className="rounded-lg border border-gray-100 bg-white/80 p-1.5 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              data-testid="mobile-nav-toggle"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>
          </div>

          <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

          <Toaster
            position="top-center"
            toastOptions={{
              className: 'text-sm font-medium !bg-white !text-black !border !border-lux-gold/40 !shadow-elevated !rounded-xl',
              duration: 4000,
            }}
          />

          <main className="mx-auto max-w-8xl px-4 py-6 sm:px-6 sm:py-8">
            <DeepStateBreadcrumb />
            <ErrorBoundary>
              <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500" aria-hidden>Loading…</div>}>
                <Routes>
                  <Route path="/" element={<DashboardView />} />
                  <Route path="/inventory" element={<InventoryView />} />
                  <Route path="/buy-box" element={<EvaluatorView />} />
                  <Route path="/serial-check" element={<SerialCheckView />} />
                  <Route path="/retail-price" element={<RetailPriceView />} />
                  <Route path="/market-research" element={<MarketResearchView />} />
                  <Route path="/sourcing" element={<SourcingView />} />
                  <Route path="/jobs" element={<JobsView />} />
                  <Route path="/invoices" element={<InvoicesView />} />

                  {/* Legacy redirect */}
                  <Route path="/evaluator" element={<Navigate to="/buy-box" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
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
