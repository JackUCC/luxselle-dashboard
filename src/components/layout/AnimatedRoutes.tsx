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
const EvaluatorView = lazy(() => import('../../pages/BuyBox/EvaluatorView'))
const SourcingView = lazy(() => import('../../pages/Sourcing/SourcingView'))
const InvoicesView = lazy(() => import('../../pages/Invoices/InvoicesView'))
const MarketResearchView = lazy(() => import('../../pages/MarketResearch/MarketResearchView'))
const SerialCheckView = lazy(() => import('../../pages/SerialCheck/SerialCheckView'))
const RetailPriceView = lazy(() => import('../../pages/RetailPrice/RetailPriceView'))

const routes = [
  { path: '/', element: <DashboardView /> },
  { path: '/inventory', element: <InventoryView /> },
  { path: '/buy-box', element: <EvaluatorView /> },
  { path: '/serial-check', element: <SerialCheckView /> },
  { path: '/retail-price', element: <RetailPriceView /> },
  { path: '/market-research', element: <MarketResearchView /> },
  { path: '/sourcing', element: <SourcingView /> },
  { path: '/invoices', element: <InvoicesView /> },
  { path: '/evaluator', element: <Navigate to="/buy-box" replace /> },
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
