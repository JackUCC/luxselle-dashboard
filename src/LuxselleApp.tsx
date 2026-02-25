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
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { AlertCircle, Menu } from 'lucide-react'

import { ErrorBoundary } from './components/ErrorBoundary'
import DeepStateBreadcrumb from './components/layout/DeepStateBreadcrumb'
import MobileNavDrawer from './components/navigation/MobileNavDrawer'
import WideScreenSideRail from './components/navigation/WideScreenSideRail'
import SidecarNav from './components/navigation/SidecarNav'
import { queryClient } from './lib/queryClient'
import { ServerStatusProvider, useServerStatus } from './lib/ServerStatusContext'
import { LayoutModeProvider, useLayoutMode } from './lib/LayoutModeContext'
import { appRoutes } from './components/layout/routeMeta'

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
      <div className="min-h-screen bg-lux-50 text-lux-800 font-sans">
        <SidecarNav />
        <Toaster
          position="top-center"
          toastOptions={{
            className: 'text-[13px] font-medium !bg-white !text-lux-800 !border !border-lux-200 !shadow-soft !rounded-lg',
            duration: 3000,
          }}
        />
        <main className="px-3 py-3">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center py-12 text-[13px] text-lux-400" aria-hidden>Loading…</div>}>
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
    <div className="min-h-screen bg-lux-50 text-lux-800 font-sans">
      {isConnected === false && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] font-medium text-amber-800">
          <div className="mx-auto flex max-w-8xl flex-wrap items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Backend not configured. Set VITE_API_BASE in Vercel to your Railway URL, then redeploy.</span>
            <button
              type="button"
              onClick={() => refetchStatus()}
              className="rounded-md bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-300"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="xl:flex">
        <WideScreenSideRail />

        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-50 flex h-12 items-center border-b border-lux-200 bg-white/80 backdrop-blur-sm px-4 xl:hidden">
            <button
              type="button"
              className="rounded-md p-1.5 text-lux-500 transition-colors hover:bg-lux-50 hover:text-lux-800"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              data-testid="mobile-nav-toggle"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>

          <header className="sticky top-0 z-40 hidden h-14 items-center border-b border-gray-200/60 bg-white/95 px-4 backdrop-blur sm:px-6 xl:flex 2xl:hidden">
            <nav className="flex items-center gap-2">
              {appRoutes.map((route) => (
                <NavLink
                  key={route.path}
                  to={route.path}
                  end={route.path === '/'}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-lux-200/80 text-lux-800'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  {route.path === '/buy-box' ? 'Buy Box' : route.navLabel}
                </NavLink>
              ))}
            </nav>
          </header>

          <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

          <Toaster
            position="top-center"
            toastOptions={{
              className: 'text-[13px] font-medium !bg-white !text-lux-800 !border !border-lux-200 !shadow-soft !rounded-lg',
              duration: 4000,
            }}
          />

          <main className="mx-auto max-w-8xl px-5 py-5 sm:px-6 sm:py-6">
            <DeepStateBreadcrumb />
            <ErrorBoundary>
              <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-[13px] text-lux-400" aria-hidden>Loading…</div>}>
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
