type RouteImporter = () => Promise<unknown>

const routeImporters: Record<string, RouteImporter> = {
  '/': () => import('../pages/Dashboard/DashboardView'),
  '/inventory': () => import('../pages/Inventory/InventoryView'),
  '/evaluate': () => import('../pages/UnifiedIntelligence/UnifiedIntelligenceView'),
  '/buy-box': () => import('../pages/UnifiedIntelligence/UnifiedIntelligenceView'),
  '/serial-check': () => import('../pages/UnifiedIntelligence/UnifiedIntelligenceView'),
  '/retail-price': () => import('../pages/RetailPrice/RetailPriceView'),
  '/market-research': () => import('../pages/MarketResearch/MarketResearchView'),
  '/sourcing': () => import('../pages/Sourcing/SourcingView'),
  '/invoices': () => import('../pages/Invoices/InvoicesView'),
}

const prefetchedRoutes = new Set<string>()

export function prefetchRoute(path: string) {
  if (prefetchedRoutes.has(path)) return
  const importer = routeImporters[path]
  if (!importer) return

  prefetchedRoutes.add(path)
  void importer().catch(() => {
    // Ignore preload errors; route navigation handles retries.
    prefetchedRoutes.delete(path)
  })
}
