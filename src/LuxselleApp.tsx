/**
 * App shell: React Query, React Router, responsive navigation, deep-state breadcrumbs,
 * Toaster, ErrorBoundary, and route definitions.
 * Legacy redirects: /evaluator → /buy-box, /suppliers → /supplier-hub.
 * On init, checks API health and shows a banner if backend is not configured.
 * @see docs/CODE_REFERENCE.md
 * References: react-router-dom, @tanstack/react-query, react-hot-toast, lucide-react
 */
import { useEffect, useMemo, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AlertCircle, Bell, Menu } from 'lucide-react'

import { API_BASE } from './lib/api'
import { ErrorBoundary } from './components/ErrorBoundary'
import DeepStateBreadcrumb from './components/layout/DeepStateBreadcrumb'
import { appRoutes, getRouteMeta } from './components/layout/routeMeta'
import MobileNavDrawer from './components/navigation/MobileNavDrawer'
import WideScreenSideRail from './components/navigation/WideScreenSideRail'
import DashboardView from './pages/Dashboard/DashboardView'
import InventoryView from './pages/Inventory/InventoryView'
import EvaluatorView from './pages/BuyBox/EvaluatorView'
import SupplierHubView from './pages/SupplierHub/SupplierHubView'
import SourcingView from './pages/Sourcing/SourcingView'
import BuyingListView from './pages/BuyingList/BuyingListView'
import JobsView from './pages/Jobs/JobsView'
import InvoicesView from './pages/Invoices/InvoicesView'
import MarketResearchView from './pages/MarketResearch/MarketResearchView'
import { queryClient } from './lib/queryClient'
import { ServerStatusProvider, useServerStatus } from './lib/ServerStatusContext'

const AppContent = () => {
  const { isConnected, refetchStatus } = useServerStatus()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  const activeRoute = useMemo(() => getRouteMeta(location.pathname), [location.pathname])

  return (
    <div className="min-h-screen bg-lux-50 text-gray-900 font-sans">
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

      <div className="2xl:flex">
        <WideScreenSideRail />

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
            <div className="mx-auto max-w-8xl px-4 sm:px-6">
              <div className="flex h-16 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 2xl:hidden"
                    onClick={() => setMobileNavOpen(true)}
                    aria-label="Open navigation menu"
                    data-testid="mobile-nav-toggle"
                  >
                    <Menu className="h-5 w-5" />
                  </button>

                  <div className="flex items-center gap-2 2xl:hidden">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
                      L
                    </div>
                    <span className="font-display text-sm font-semibold tracking-tight text-gray-900">Luxselle</span>
                  </div>

                  <div className="hidden min-w-0 items-center gap-2 2xl:flex">
                    <p className="truncate text-sm font-medium text-gray-500">
                      {activeRoute?.label ?? 'Dashboard'}
                    </p>
                  </div>
                </div>

                <nav className="hidden flex-1 items-center gap-1 overflow-x-auto no-scrollbar lg:flex 2xl:hidden">
                  {appRoutes.map((route) => (
                    <NavLink
                      key={route.path}
                      to={route.path}
                      end={route.path === '/'}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${isActive
                          ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
                        }`
                      }
                    >
                      <route.icon className="h-4 w-4" />
                      <span className="whitespace-nowrap">{route.navLabel}</span>
                    </NavLink>
                  ))}
                </nav>

                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    className="relative rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 shadow-sm ring-2 ring-white animate-pulse" />
                  </button>

                  <div className="hidden rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-500 md:block">
                    Control Center
                  </div>

                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm ring-2 ring-white">
                    JK
                  </div>
                </div>
              </div>
            </div>
          </header>

          <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

          <Toaster
            position="top-center"
            toastOptions={{
              className: 'text-sm font-medium !bg-white !text-gray-900 !border !border-gray-100 !shadow-lg',
              duration: 4000,
            }}
          />

          <main className="mx-auto max-w-8xl px-4 py-6 sm:px-6 sm:py-8">
            <DeepStateBreadcrumb />
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<DashboardView />} />
                <Route path="/inventory" element={<InventoryView />} />
                <Route path="/buy-box" element={<EvaluatorView />} />
                <Route path="/market-research" element={<MarketResearchView />} />
                <Route path="/supplier-hub" element={<SupplierHubView />} />
                <Route path="/buying-list" element={<BuyingListView />} />
                <Route path="/sourcing" element={<SourcingView />} />
                <Route path="/jobs" element={<JobsView />} />
                <Route path="/invoices" element={<InvoicesView />} />

                {/* Redirects for legacy routes */}
                <Route path="/evaluator" element={<Navigate to="/buy-box" replace />} />
                <Route path="/suppliers" element={<Navigate to="/supplier-hub" replace />} />
              </Routes>
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
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ServerStatusProvider>
    </QueryClientProvider>
  )
}

export default LuxselleApp
