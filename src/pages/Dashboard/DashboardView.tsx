/**
 * Dashboard overview: bento-grid layout with KPIs + quick tools.
 * In Sidecar mode, shows QuickCheck (compact price + inventory check) instead.
 * @see docs/CODE_REFERENCE.md
 */
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowRightToLine, RefreshCw } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../lib/api'
import type { KPIs, ProfitSummary } from '../../types/dashboard'
import DashboardSkeleton from './DashboardSkeleton'
import SidecarView from '../../components/sidecar/SidecarView'
import { useLayoutMode } from '../../lib/LayoutModeContext'
import PageLayout from '../../components/layout/PageLayout'
import { AnimatedNumber, BentoGrid, Button, PageHeader, SectionLabel } from '../../components/design-system'
import MarketIntelligenceWidget from '../../components/widgets/MarketIntelligenceWidget'
import LandedCostWidget from '../../components/widgets/LandedCostWidget'
import EurToYenWidget from '../../components/widgets/EurToYenWidget'
import SourcingSitesWidget from '../../components/widgets/SourcingSitesWidget'
import ActiveSourcingWidget from '../../components/widgets/ActiveSourcingWidget'
import AiMarketPulseWidget from '../../components/widgets/AiMarketPulseWidget'
import { staggerClass } from '../../lib/staggerClass'

export default function DashboardView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isSidecar } = useLayoutMode()
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [profit, setProfit] = useState<ProfitSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [costAnimated, setCostAnimated] = useState(false)
  const [potentialAnimated, setPotentialAnimated] = useState(false)

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

  useEffect(() => {
    if (kpis) {
      setCostAnimated(false)
      setPotentialAnimated(false)
    }
  }, [kpis])

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
        title="Quick Controls"
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
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-lux-400 transition-colors hover:bg-lux-100 hover:text-lux-600 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
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
        <div className="lux-card border-rose-200 bg-rose-50/60 p-6 text-center animate-bento-enter stagger-0">
          <p className="text-sm text-rose-600 font-medium">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Row 1: Market Intelligence (2-col) + Sourcing Sites */}
          <BentoGrid columns={3}>
            <MarketIntelligenceWidget />
            <SourcingSitesWidget />
          </BentoGrid>

          {/* Row 2: Currency Converter + Landed Cost + Active Sourcing */}
          <BentoGrid columns={3}>
            <EurToYenWidget />
            <LandedCostWidget />
            <ActiveSourcingWidget />
          </BentoGrid>

          {/* Row 3: Inventory & Value | AI Market Pulse (50/50) */}
          <BentoGrid columns={2}>
            <div
              className={`lux-card p-5 h-full min-h-0 flex flex-col animate-bento-enter ${staggerClass(4)}`}
              data-testid="inventory-value-card"
            >
              <SectionLabel className="mb-3">Inventory & Value</SectionLabel>
              <div className="grid grid-cols-2 gap-0 flex-1 min-h-0">
                <div className="pr-4 flex flex-col">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-lux-400">Cost</p>
                  <p className="text-xl sm:text-2xl font-semibold font-mono text-lux-800 leading-tight mt-0.5">
                    <AnimatedNumber
                      value={inventoryValue}
                      prefix="€"
                      duration={450}
                      onComplete={() => setCostAnimated(true)}
                    />
                  </p>
                  <p className="text-sm font-medium text-lux-600 mt-2">
                    {kpis?.totalInventoryItems ?? 0} {(kpis?.totalInventoryItems ?? 0) === 1 ? 'bag' : 'bags'}
                  </p>
                </div>
                <div className="pl-4 border-l border-lux-200 flex flex-col">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-lux-400">Potential</p>
                  <p className="text-xl sm:text-2xl font-semibold font-mono text-lux-800 leading-tight mt-0.5">
                    <AnimatedNumber
                      value={potentialValue}
                      prefix="€"
                      delay={450}
                      duration={500}
                      onComplete={() => setPotentialAnimated(true)}
                    />
                  </p>
                  {potentialAnimated && (
                    <p className="text-sm font-semibold text-lux-700 mt-2 animate-slide-up">
                      €{margin.toLocaleString(undefined, { maximumFractionDigits: 0 })} margin
                    </p>
                  )}
                </div>
              </div>
            </div>
            <AiMarketPulseWidget />
          </BentoGrid>
        </div>
      )}
    </PageLayout>
  )
}
