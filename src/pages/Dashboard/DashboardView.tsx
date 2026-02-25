/**
 * Dashboard overview: KPIs + quick tools.
 * In Sidecar mode, shows QuickCheck (compact price + inventory check) instead.
 * @see docs/CODE_REFERENCE.md
 */
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowRightToLine, Package, RefreshCw, TrendingUp } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../lib/api'
import type { KPIs } from '../../types/dashboard'
import DashboardSkeleton from './DashboardSkeleton'
import AiPromptBar from '../../components/widgets/AiPromptBar'
import LandedCostWidget from '../../components/widgets/LandedCostWidget'
import SerialCheckWidget from '../../components/widgets/SerialCheckWidget'
import EurToYenWidget from '../../components/widgets/EurToYenWidget'
import AuctionLinksWidget from '../../components/widgets/AuctionLinksWidget'
import SidecarView from '../../components/sidecar/SidecarView'
import { useLayoutMode } from '../../lib/LayoutModeContext'

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
      <header className="flex items-center justify-between gap-4 mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-lux-800">
          Overview
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSwitchToSidecar}
            className="inline-flex items-center gap-1.5 rounded-lg bg-lux-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-lux-700"
            title="Switch to sidecar mode"
            aria-label="Switch dashboard to sidecar mode"
          >
            <ArrowRightToLine className="h-3.5 w-3.5" />
            Sidecar
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-lux-200 bg-white px-3 py-1.5 text-xs font-medium text-lux-700 transition-colors hover:bg-lux-50 disabled:opacity-40"
            title="Refresh data"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

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
        <div className="space-y-8">
          <AiPromptBar />

          <section aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="text-[11px] font-semibold uppercase tracking-wider text-lux-500 mb-3">
              Key metrics
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="lux-card p-5 animate-bento-enter" style={{ '--stagger': 0 } as React.CSSProperties}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-lux-500 mb-1">Inventory cost</p>
                    <p className="text-lg font-semibold font-mono text-lux-800">
                      <AnimatedNumber value={kpis?.totalInventoryValue ?? 0} prefix="€" />
                    </p>
                  </div>
                  <div className="rounded-lg bg-lux-50 p-2 text-lux-600 shrink-0 border border-lux-200/60">
                    <Package className="h-4 w-4" />
                  </div>
                </div>
              </div>
              <div className="lux-card p-5 animate-bento-enter" style={{ '--stagger': 1 } as React.CSSProperties}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-lux-500 mb-1">Potential value</p>
                    <p className="text-lg font-semibold font-mono text-lux-800">
                      <AnimatedNumber value={kpis?.totalInventoryPotentialValue ?? 0} prefix="€" />
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 shrink-0 border border-emerald-100">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="tools-heading">
            <h2 id="tools-heading" className="text-[11px] font-semibold uppercase tracking-wider text-lux-500 mb-3">
              Quick tools
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <LandedCostWidget />
              <SerialCheckWidget />
              <EurToYenWidget />
              <AuctionLinksWidget />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
