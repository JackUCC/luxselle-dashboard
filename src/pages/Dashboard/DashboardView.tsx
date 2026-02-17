/**
 * Dashboard overview: Clean light-theme layout with KPI cards and profit summary.
 * @see docs/CODE_REFERENCE.md
 */
import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  ClipboardList,
  DollarSign,
  Package,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react'
import { apiGet } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'
import type { KPIs, ProfitSummary } from '../../types/dashboard'
import DashboardSkeleton from './DashboardSkeleton'

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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">{label}</span>
        <span className={`font-bold font-mono ${color}`}>{formatCurrency(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(pct, 100)}%`, background: `linear-gradient(90deg, ${barColor}, ${barColorEnd})` }}
        />
      </div>
    </div>
  )
}

export default function DashboardView() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [profit, setProfit] = useState<ProfitSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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
    <div className="flex flex-col items-center space-y-10 py-4 sm:py-6">
      {/* ─── Greeting ─── */}
      <div className="w-full max-w-2xl text-center">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-3xl font-display font-bold sm:text-4xl text-gray-900">
            {getGreeting()}, Jack
          </h1>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="rounded-full border border-gray-200 bg-white p-2 text-gray-400 transition-all hover:bg-gray-50 hover:text-gray-600 disabled:opacity-50 shadow-sm"
            title="Refresh data"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="w-full max-w-4xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center text-rose-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-3 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="w-full space-y-8">
          {/* ─── KPI Cards ─── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Inventory Value */}
            <div className="lux-card p-6 animate-bento-enter" style={{ '--stagger': 0 } as React.CSSProperties}>
              <div className="mb-4">
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 border border-blue-100 w-fit">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="mb-1 text-2xl font-bold text-gray-900 font-mono">
                    <AnimatedNumber value={kpis?.totalInventoryValue ?? 0} prefix="€" />
                  </div>
                  <div className="text-sm text-gray-500">Inventory value</div>
                </div>
                <KPISparkline color="#3B82F6" />
              </div>
            </div>

            {/* Pending Buy List */}
            <div className="lux-card p-6 animate-bento-enter" style={{ '--stagger': 1 } as React.CSSProperties}>
              <div className="mb-4">
                <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600 border border-rose-100 w-fit">
                  <ClipboardList className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="mb-1 text-2xl font-bold text-gray-900 font-mono">
                    <AnimatedNumber value={kpis?.pendingBuyListValue ?? 0} prefix="€" />
                  </div>
                  <div className="text-sm text-gray-500">Pending buy list</div>
                </div>
                <KPISparkline color="#F43F5E" />
              </div>
            </div>

            {/* Active Sourcing Pipeline */}
            <div className="lux-card p-6 animate-bento-enter" style={{ '--stagger': 2 } as React.CSSProperties}>
              <div className="mb-4">
                <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 border border-indigo-100 w-fit">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="mb-1 text-2xl font-bold text-gray-900 font-mono">
                    <AnimatedNumber value={kpis?.activeSourcingPipeline ?? 0} prefix="€" />
                  </div>
                  <div className="text-sm text-gray-500">Sourcing pipeline</div>
                </div>
                <KPISparkline color="#6366F1" />
              </div>
            </div>

            {/* Low Stock Alerts */}
            <Link
              to="/inventory?lowStock=1"
              className="lux-card block cursor-pointer p-6 transition-all hover:shadow-lg hover:border-rose-200 animate-bento-enter"
              style={{ '--stagger': 3 } as React.CSSProperties}
            >
              <div className="mb-4">
                <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 border border-amber-100 w-fit">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="mb-1 text-2xl font-bold text-gray-900 font-mono">
                    <AnimatedNumber value={kpis?.lowStockAlerts ?? 0} />
                  </div>
                  <div className="text-sm text-gray-500">Low stock</div>
                </div>
                <KPISparkline color="#F59E0B" />
              </div>
            </Link>
          </div>

          {/* ─── Profit Summary ─── */}
          <div className="lux-card p-6 animate-bento-enter" style={{ '--stagger': 4 } as React.CSSProperties}>
            <div className="mb-6 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">Profit</h3>
            </div>

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
        </div>
      )}
    </div>
  )
}
