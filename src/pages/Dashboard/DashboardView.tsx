/**
 * Dashboard overview: KPIs + quick tools.
 * In Sidecar mode, shows QuickCheck (compact price + inventory check) instead.
 * @see docs/CODE_REFERENCE.md
 */
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowRightToLine, Package, RefreshCw, TrendingUp } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../lib/api'
import type { KPIs } from '../../types/dashboard'
import DashboardSkeleton from './DashboardSkeleton'
import LandedCostWidget from '../../components/widgets/LandedCostWidget'
import SidecarView from '../../components/sidecar/SidecarView'
import { useLayoutMode } from '../../lib/LayoutModeContext'
import { Button, PageHeader } from '../../components/design-system'

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

  return (
    <div className="w-full max-w-5xl mx-auto">
      <PageHeader
        title="Overview"
        purpose="Key metrics and quick access to tools."
        actions={
          <>
            <Button
              variant="primary"
              onClick={handleSwitchToSidecar}
              className="inline-flex items-center gap-1.5 text-xs py-1.5"
              title="Switch to sidecar mode"
              aria-label="Switch dashboard to sidecar mode"
            >
              <ArrowRightToLine className="h-3.5 w-3.5" />
              Sidecar
            </Button>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-1.5 text-xs py-1.5 disabled:opacity-40"
              title="Refresh data"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
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
        <div className="space-y-10 pt-2">
          <section aria-labelledby="overview-heading" className="scroll-mt-4">
            <h2 id="overview-heading" className="mb-4 text-ui-label font-semibold uppercase tracking-wider text-lux-500">
              Key metrics
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="lux-card p-5 animate-bento-enter" style={{ '--stagger': 0 } as React.CSSProperties}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="mb-1 text-ui-label font-medium uppercase tracking-wider text-lux-500">Inventory cost</p>
                    <p className="font-mono text-lg font-semibold text-lux-800">
                      <AnimatedNumber value={kpis?.totalInventoryValue ?? 0} prefix="€" />
                    </p>
                  </div>
                  <div className="shrink-0 rounded-lg border border-lux-200/60 bg-lux-50 p-2 text-lux-600">
                    <Package className="h-4 w-4" />
                  </div>
                </div>
              </div>
              <div className="lux-card p-5 animate-bento-enter" style={{ '--stagger': 1 } as React.CSSProperties}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="mb-1 text-ui-label font-medium uppercase tracking-wider text-lux-500">Potential value</p>
                    <p className="font-mono text-lg font-semibold text-lux-800">
                      <AnimatedNumber value={kpis?.totalInventoryPotentialValue ?? 0} prefix="€" />
                    </p>
                  </div>
                  <div className="shrink-0 rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="tools-heading" className="scroll-mt-4">
            <h2 id="tools-heading" className="mb-4 text-ui-label font-semibold uppercase tracking-wider text-lux-500">
              Quick tool
            </h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 max-w-md">
                <LandedCostWidget />
              </div>
              <Link
                to="/market-research"
                className="inline-flex items-center gap-1.5 text-body-sm font-medium text-lux-gold hover:text-lux-700"
              >
                More tools
                <ArrowRightToLine className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
