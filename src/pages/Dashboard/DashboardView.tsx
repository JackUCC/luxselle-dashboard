/**
 * Dashboard overview: KPIs, quick tools (landed cost, serial check, EUR-JPY), profit.
 * In Sidecar mode, shows QuickCheck (compact price + inventory check) instead.
 * @see docs/CODE_REFERENCE.md
 */
import { useEffect, useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { Package, RefreshCw, TrendingUp } from 'lucide-react'
import { apiGet } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'
import type { KPIs, ProfitSummary } from '../../types/dashboard'
import DashboardSkeleton from './DashboardSkeleton'
import AiPromptBar from '../../components/widgets/AiPromptBar'
import LandedCostWidget from '../../components/widgets/LandedCostWidget'
import SerialCheckWidget from '../../components/widgets/SerialCheckWidget'
import EurToYenWidget from '../../components/widgets/EurToYenWidget'
import AuctionLinksWidget from '../../components/widgets/AuctionLinksWidget'
import QuickCheck from '../../components/sidecar/QuickCheck'
import { useLayoutMode } from '../../lib/LayoutModeContext'

// ─── Animated Counter ───
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number | string; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState('—')
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (value === null || value === undefined) return
    const numVal = typeof value === 'string' ? parseFloat(value) : value
    if (!Number.isFinite(numVal)) { setDisplay(String(value)); return }

    const duration = 1000
    const start = performance.now()
    let raf: number

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
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

// ─── Mini Sparkline for KPIs ───
function KPISparkline({ color = '#6366F1' }: { color?: string }) {
  const data = [40, 55, 45, 60, 50, 65, 58]
  const w = 60; const h = 20
  const min = Math.min(...data); const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')

  return (
    <svg width={w} height={h} className="opacity-40">
      <defs>
        <linearGradient id={`kpi-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M0,${h} L${points.replace(/ /g, ' L')} L${w},${h} Z`} fill={`url(#kpi-grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Profit Bar ───
function ProfitBar({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
  const pct = maxValue > 0 ? (Math.abs(value) / maxValue) * 100 : 0
  const barColor = color === 'text-emerald-600' ? '#10B981' : color === 'text-rose-600' ? '#E11D48' : '#6366F1'
  const barColorEnd = color === 'text-emerald-600' ? '#059669' : color === 'text-rose-600' ? '#BE123C' : '#4F46E5'
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-lux-600">{label}</span>
        <span className={`font-bold font-mono ${color}`}>{formatCurrency(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(pct, 100)}%`, background: `linear-gradient(90deg, ${barColor}, ${barColorEnd})` }}
        />
      </div>
    </div>
  )
}

export default function DashboardView() {
  const { isSidecar } = useLayoutMode()
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [profit, setProfit] = useState<ProfitSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  if (isSidecar) {
    return (
      <section className="space-y-3">
        <h1 className="text-base font-bold text-gray-900">Quick Check</h1>
        <p className="text-xs text-gray-500">Market price, landed cost, and inventory in one view.</p>
        <QuickCheck />
      </section>
    )
  }
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

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

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true)
    try {
      const [kpisRes, profitRes] = await Promise.all([
        apiGet<{ data: KPIs }>('/dashboard/kpis'),
        apiGet<{ data: ProfitSummary }>('/dashboard/profit-summary'),
      ])
      setKpis(kpisRes.data)
      setProfit(profitRes.data)
      setError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard'
      setError(message)
      toast.error(message)
    } finally {
      if (!isRefresh) setIsLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-lux-800">
          {getGreeting()}, Jack
        </h1>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className="lux-btn-secondary self-start sm:self-center flex items-center gap-2 !px-4 !py-2.5 disabled:opacity-40"
          title="Refresh data"
          aria-label="Refresh dashboard data"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="lux-card p-8 text-center">
          <p className="text-rose-600 font-medium">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="lux-btn-secondary mt-4 !text-rose-600"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-12">
          <AiPromptBar />

          <section aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="text-xs font-semibold uppercase tracking-widest text-lux-500 mb-5">
              Overview
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="lux-card p-7 animate-bento-enter" style={{ '--stagger': 0 } as React.CSSProperties}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-lux-600 mb-1.5">Inventory cost</p>
                    <p className="text-2xl font-bold font-mono text-lux-800">
                      <AnimatedNumber value={kpis?.totalInventoryValue ?? 0} prefix="€" />
                    </p>
                  </div>
                  <div className="rounded-xl bg-lux-200/80 p-2.5 text-lux-800 shrink-0">
                    <Package className="h-5 w-5" />
                  </div>
                </div>
                <KPISparkline color="#1D1D1F" />
              </div>
              <div className="lux-card p-7 animate-bento-enter" style={{ '--stagger': 1 } as React.CSSProperties}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-lux-600 mb-1.5">Potential value</p>
                    <p className="text-2xl font-bold font-mono text-lux-800">
                      <AnimatedNumber value={kpis?.totalInventoryPotentialValue ?? 0} prefix="€" />
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/70 p-2.5 text-emerald-500 shrink-0">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <KPISparkline color="#10B981" />
              </div>
            </div>
          </section>

          <section aria-labelledby="tools-heading">
            <h2 id="tools-heading" className="text-xs font-semibold uppercase tracking-widest text-lux-500 mb-5">
              Quick tools
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6 [&>*]:min-w-0">
              <LandedCostWidget />
              <SerialCheckWidget />
              <EurToYenWidget />
              <AuctionLinksWidget />
            </div>
          </section>

          <section aria-labelledby="profit-heading">
            <h2 id="profit-heading" className="text-xs font-semibold uppercase tracking-widest text-lux-500 mb-5">
              Profit
            </h2>
            <div className="lux-card p-7 animate-bento-enter" style={{ '--stagger': 5 } as React.CSSProperties}>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <ProfitBar
                  label="Revenue"
                  value={profit?.totalRevenue ?? 0}
                  maxValue={Math.max(profit?.totalRevenue ?? 0, profit?.totalCost ?? 0, 1)}
                  color="text-indigo-600"
                />
                <ProfitBar
                  label="Cost"
                  value={profit?.totalCost ?? 0}
                  maxValue={Math.max(profit?.totalRevenue ?? 0, profit?.totalCost ?? 0, 1)}
                  color="text-rose-600"
                />
                <ProfitBar
                  label="Profit"
                  value={profit?.totalProfit ?? 0}
                  maxValue={Math.max(profit?.totalRevenue ?? 0, profit?.totalCost ?? 0, 1)}
                  color="text-emerald-600"
                />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Margin</span>
                    <span className={`font-bold font-mono ${profit && profit.avgMarginPct >= 20 ? 'text-emerald-600' : profit && profit.avgMarginPct >= 10 ? 'text-amber-600' : 'text-rose-600'}`}>
                      <AnimatedNumber value={profit?.avgMarginPct ?? 0} suffix="%" />
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">{profit ? `${profit.itemsSold} items sold` : ''}</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
