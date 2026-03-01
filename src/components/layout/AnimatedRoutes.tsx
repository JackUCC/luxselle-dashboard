/**
 * Route definitions with AnimatePresence for smooth page transitions.
 * Uses useRoutes + PageTransition for enter/exit animations.
 */
import { lazy } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Navigate, useLocation, useRoutes } from 'react-router-dom'

import PageTransition from './PageTransition'

const DashboardView = lazy(() => import('../../pages/Dashboard/DashboardView'))
const InventoryView = lazy(() => import('../../pages/Inventory/InventoryView'))
const UnifiedIntelligenceView = lazy(() => import('../../pages/UnifiedIntelligence/UnifiedIntelligenceView'))
const SourcingView = lazy(() => import('../../pages/Sourcing/SourcingView'))
const InvoicesView = lazy(() => import('../../pages/Invoices/InvoicesView'))
const MarketResearchView = lazy(() => import('../../pages/MarketResearch/MarketResearchView'))
const SavedResearchView = lazy(() => import('../../pages/SavedResearch/SavedResearchView'))
const RetailPriceView = lazy(() => import('../../pages/RetailPrice/RetailPriceView'))
const JobsView = lazy(() => import('../../pages/Jobs/JobsView'))

function LegacyRedirect({ to }: { to: string }) {
  const location = useLocation()
  return <Navigate to={{ pathname: to, search: location.search }} replace />
}

const routes = [
  { path: '/', element: <DashboardView /> },
  { path: '/inventory', element: <InventoryView /> },
  { path: '/evaluate', element: <UnifiedIntelligenceView /> },
  { path: '/buy-box', element: <LegacyRedirect to="/evaluate" /> },
  { path: '/serial-check', element: <LegacyRedirect to="/evaluate" /> },
  { path: '/retail-price', element: <RetailPriceView /> },
  { path: '/market-research', element: <MarketResearchView /> },
  { path: '/saved-research', element: <SavedResearchView /> },
  { path: '/sourcing', element: <SourcingView /> },
  { path: '/invoices', element: <InvoicesView /> },
  { path: '/jobs', element: <JobsView /> },
  { path: '/evaluator', element: <LegacyRedirect to="/evaluate" /> },
]

export default function AnimatedRoutes() {
  const location = useLocation()
  const element = useRoutes(routes)

  if (element == null) {
    return null
  }

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname} pathKey={location.pathname}>
        {element}
      </PageTransition>
    </AnimatePresence>
  )
}
