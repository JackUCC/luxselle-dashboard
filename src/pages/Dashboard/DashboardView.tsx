/**
 * Dashboard overview: bento-grid layout with KPIs + quick tools.
 * In Sidecar mode, shows QuickCheck (compact price + inventory check) instead.
 * @see docs/CODE_REFERENCE.md
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowRightToLine, RefreshCw } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../lib/api'
import type { KPIs, ProfitSummary } from '../../types/dashboard'
import DashboardSkeleton from './DashboardSkeleton'
import SidecarView from '../../components/sidecar/SidecarView'
import { useLayoutMode } from '../../lib/LayoutModeContext'
import PageLayout from '../../components/layout/PageLayout'
import { AnimatedNumber, BentoGrid, Button, PageHeader, StatCard } from '../../components/design-system'
import MarketIntelligenceWidget from '../../components/widgets/MarketIntelligenceWidget'
import LandedCostWidget from '../../components/widgets/LandedCostWidget'
import EurToYenWidget from '../../components/widgets/EurToYenWidget'
import SerialCheckWidget from '../../components/widgets/SerialCheckWidget'
import SourcingSitesWidget from '../../components/widgets/SourcingSitesWidget'
import ActiveSourcingWidget from '../../components/widgets/ActiveSourcingWidget'

export default function DashboardView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isSidecar } = useLayoutMode()
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [profit, setProfit] = useState<ProfitSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true)
    try {
      const [kpisRes, profitRes] = await Promise.all([
        apiGet<{ data: KPIs }>('/dashboard/kpis'),
        apiGet<{ data: ProfitSummary }>('/dashboard/profit-summary'),
      ])
      setKpis(kpisRes.data)
      setProfit(profitRes.data ?? null)
      setError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard'
      setError(message)
      toast.error(message)
    } finally {
      if (!isRefresh) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isSidecar) loadData()
  }, [isSidecar, loadData])

  if (isSidecar) {
    return <SidecarView />
  }

  const handleRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await loadData(true)
      toast.success('Dashboard refreshed')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSwitchToSidecar = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('mode', 'sidecar')
    navigate({ search: `?${nextParams.toString()}` })
  }

  const inventoryValue = kpis?.totalInventoryValue ?? 0
  const potentialValue = kpis?.totalInventoryPotentialValue ?? 0
  const margin = potentialValue - inventoryValue

  return (
    <PageLayout variant="content">
      <PageHeader
        title="Overview"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={handleSwitchToSidecar}
              className="inline-flex items-center gap-1.5 text-xs py-1.5"
              title="Switch to sidecar mode"
              aria-label="Switch dashboard to sidecar mode"
            >
              <ArrowRightToLine className="h-3.5 w-3.5" />
              Sidecar
            </Button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="rounded-lg p-2 text-lux-400 transition-colors hover:bg-lux-100 hover:text-lux-600 disabled:opacity-40"
              title="Refresh data"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </>
        }
      />

      {isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="lux-card p-6 text-center">
          <p className="text-sm text-rose-600 font-medium">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Row 1: Market Intelligence (2-col) + Landed Cost */}
          <BentoGrid columns={3}>
            <MarketIntelligenceWidget />
            <LandedCostWidget />
          </BentoGrid>

          {/* Row 2: Currency Converter + Inventory Cost + Potential Value */}
          <BentoGrid columns={3}>
            <EurToYenWidget />
            <StatCard
              label="Inventory Cost"
              value={<AnimatedNumber value={inventoryValue} prefix="€" />}
              stagger={4}
            />
            <StatCard
              label="Potential Value"
              value={<AnimatedNumber value={potentialValue} prefix="€" />}
              secondary={
                <span className="inline-flex items-center rounded-full bg-white/80 border border-lux-200/60 px-2.5 py-1 text-[12px] font-medium text-lux-700">
                  €{margin.toLocaleString(undefined, { maximumFractionDigits: 0 })} margin
                </span>
              }
              stagger={5}
            />
          </BentoGrid>

          {/* Row 3: Serial Check + Sourcing Sites + Active Sourcing */}
          <BentoGrid columns={3}>
            <SerialCheckWidget />
            <SourcingSitesWidget />
            <ActiveSourcingWidget />
          </BentoGrid>
        </div>
      )}
    </PageLayout>
  )
}
