/**
 * Dashboard overview: bento-grid layout with KPIs + quick tools.
 * In Sidecar mode, shows QuickCheck (compact price + inventory check) instead.
 * @see docs/CODE_REFERENCE.md
 */
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowRightToLine, RefreshCw, TrendingUp } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../lib/api'
import type { KPIs } from '../../types/dashboard'
import DashboardSkeleton from './DashboardSkeleton'
import SidecarView from '../../components/sidecar/SidecarView'
import { useLayoutMode } from '../../lib/LayoutModeContext'
import PageLayout from '../../components/layout/PageLayout'
import { Button, PageHeader } from '../../components/design-system'
import SectionLabel from '../../components/design-system/SectionLabel'
import MarketIntelligenceWidget from '../../components/widgets/MarketIntelligenceWidget'
import LandedCostWidget from '../../components/widgets/LandedCostWidget'
import EurToYenWidget from '../../components/widgets/EurToYenWidget'
import SerialCheckWidget from '../../components/widgets/SerialCheckWidget'
import SourcingSitesWidget from '../../components/widgets/SourcingSitesWidget'
import ActiveSourcingWidget from '../../components/widgets/ActiveSourcingWidget'

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number | string; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState('—')
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (value === null || value === undefined) return
    const numVal = typeof value === 'string' ? parseFloat(value) : value
    if (!Number.isFinite(numVal)) { setDisplay(String(value)); return }

    const duration = 800
    const start = performance.now()
    let raf: number

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = numVal * eased

      if (numVal >= 1000) {
        setDisplay(`${prefix}${current.toLocaleString(undefined, { maximumFractionDigits: 0 })}${suffix}`)
      } else if (numVal >= 1) {
        setDisplay(`${prefix}${current.toFixed(1)}${suffix}`)
      } else {
        setDisplay(`${prefix}${current.toFixed(2)}${suffix}`)
      }

      if (progress < 1) raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [value, prefix, suffix])

  return <span ref={ref} className="tabular-nums">{display}</span>
}

export default function DashboardView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isSidecar } = useLayoutMode()
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true)
    try {
      const kpisRes = await apiGet<{ data: KPIs }>('/dashboard/kpis')
      setKpis(kpisRes.data)
      setError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard'
      setError(message)
      toast.error(message)
    } finally {
      if (!isRefresh) setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isSidecar) loadData()
  }, [isSidecar])

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
        purpose="Daily metrics and quick tools."
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
        <div className="space-y-4">
          {/* Row 1: Market Intelligence (2-col) + Landed Cost */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <MarketIntelligenceWidget />
            <LandedCostWidget />
          </div>

          {/* Row 2: Currency Converter + Inventory Cost + Potential Value */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <EurToYenWidget />

            <div
              className="lux-card p-6 animate-bento-enter"
              style={{ '--stagger': 4 } as React.CSSProperties}
            >
              <SectionLabel className="mb-4">Inventory Cost</SectionLabel>
              <p className="text-[32px] font-semibold font-mono text-lux-800 leading-none">
                <AnimatedNumber value={inventoryValue} prefix="€" />
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[13px] text-emerald-600 font-medium">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+2.4%</span>
                <span className="text-lux-400 font-normal">vs last month</span>
              </div>
            </div>

            <div
              className="lux-card-accent p-6 animate-bento-enter"
              style={{ '--stagger': 5 } as React.CSSProperties}
            >
              <SectionLabel className="mb-4">Potential Value</SectionLabel>
              <p className="text-[32px] font-semibold font-mono text-lux-800 leading-none">
                <AnimatedNumber value={potentialValue} prefix="€" />
              </p>
              <div className="mt-3">
                <span className="inline-flex items-center rounded-full bg-white/80 border border-lux-200/60 px-2.5 py-1 text-[12px] font-medium text-lux-700">
                  €{margin.toLocaleString(undefined, { maximumFractionDigits: 0 })} margin
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Serial Check + Sourcing Sites + Active Sourcing */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <SerialCheckWidget />
            <SourcingSitesWidget />
            <ActiveSourcingWidget />
          </div>
        </div>
      )}
    </PageLayout>
  )
}
