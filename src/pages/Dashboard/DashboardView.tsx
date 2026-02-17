/**
 * Dashboard overview: Clean light-theme layout with tiered hierarchy,
 * animated KPI cards, sparklines, collapsible Market Intelligence section.
 * @see docs/CODE_REFERENCE.md
 */
import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Activity,
  AlertCircle,
  Calculator,
  ChevronDown,
  ClipboardList,
  DollarSign,
  Globe,
  Loader2,
  Package,
  RefreshCw,
  TrendingUp,
  User,
  Users,
  Zap,
  Sparkles,
} from 'lucide-react'
import { apiGet } from '../../lib/api'
import { formatCurrency, formatRelativeDate } from '../../lib/formatters'
import type { ActivityEventWithId, KPIs, ProfitSummary, SystemStatus } from '../../types/dashboard'
import { isInsightSource, type InsightSource } from '../../components/layout/routeMeta'
import CommandBar from './CommandBar'
import DashboardSkeleton from './DashboardSkeleton'
import InsightsDrawer from './InsightsDrawer'
import {
  CurrencyWidget,
  HolidaysWidget,
  MarketResearchWidget,
  NewsWidget,
  WeatherWidget,
  CryptoWidget,
} from '../../components/widgets'

interface VatResult {
  netEur: number
  vatEur: number
  grossEur: number
  ratePct: number
}

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
  // Mock 7-point trend data
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

const insightButtonClass =
  'inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 hover:border-gray-300'

export default function DashboardView() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [profit, setProfit] = useState<ProfitSummary | null>(null)
  const [activity, setActivity] = useState<ActivityEventWithId[]>([])
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vatAmount, setVatAmount] = useState('')
  const [vatInclVat, setVatInclVat] = useState(false)
  const [vatRateOverride, setVatRateOverride] = useState('')
  const [vatResult, setVatResult] = useState<VatResult | null>(null)
  const [vatLoading, setVatLoading] = useState(false)
  const [marketOpen, setMarketOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const insightParam = searchParams.get('insight')
  const insightSource: InsightSource | null = isInsightSource(insightParam) ? insightParam : null

  useEffect(() => {
    loadData()
  }, [])

  const openInsights = (source: InsightSource) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('insight', source)
    setSearchParams(nextParams)
  }

  const closeInsights = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('insight')
    setSearchParams(nextParams)
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

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true)
    try {
      const [kpisRes, profitRes, activityRes, statusRes] = await Promise.all([
        apiGet<{ data: KPIs }>('/dashboard/kpis'),
        apiGet<{ data: ProfitSummary }>('/dashboard/profit-summary'),
        apiGet<{ data: ActivityEventWithId[] }>('/dashboard/activity?limit=5'),
        apiGet<{ data: SystemStatus }>('/dashboard/status'),
      ])
      setKpis(kpisRes.data)
      setProfit(profitRes.data)
      setActivity(activityRes.data)
      setStatus(statusRes.data)
      setError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard'
      setError(message)
      toast.error(message)
    } finally {
      if (!isRefresh) setIsLoading(false)
    }
  }

  const getEventDescription = (event: ActivityEventWithId) => {
    const p = event.payload as Record<string, unknown>
    const str = (key: string) => (p?.[key] != null ? String(p[key]) : '')

    switch (event.eventType) {
      case 'product_created':
        return (
          <span>
            Added{' '}
            <span className="font-medium text-gray-900">
              {str('brand')} {str('model')}
            </span>{' '}
            to inventory
          </span>
        )
      case 'buylist_added':
        return (
          <span>
            Added to buying list:{' '}
            <span className="font-medium text-gray-900">
              {str('brand')} {str('model')}
            </span>
          </span>
        )
      case 'buylist_received':
        return (
          <span>
            Received stock:{' '}
            <span className="font-medium text-gray-900">
              {str('brand')} {str('model')}
            </span>
          </span>
        )
      case 'supplier_import':
        return (
          <span>
            Supplier import completed:{' '}
            <span className="font-medium text-gray-900">{String(p?.success ?? 0)} items</span>
          </span>
        )
      case 'sourcing_created':
        return (
          <span>
            New request from <span className="font-medium text-gray-900">{str('customerName')}</span>
          </span>
        )
      case 'sourcing_status_changed':
        return (
          <span>
            Sourcing update for <span className="font-medium text-gray-900">{str('customerName')}</span>
          </span>
        )
      case 'seed':
        return <span>System database seeded</span>
      default:
        return <span>{event.eventType}</span>
    }
  }

  const handleVatCalculate = async () => {
    const amount = parseFloat(vatAmount)
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error('Enter a valid amount')
      return
    }
    setVatLoading(true)
    try {
      const rateParam = vatRateOverride.trim() ? `&ratePct=${encodeURIComponent(vatRateOverride)}` : ''
      const res = await apiGet<VatResult>(
        `/vat/calculate?amountEur=${encodeURIComponent(amount)}&inclVat=${vatInclVat}${rateParam}`
      )
      setVatResult(res)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'VAT calculation failed')
      setVatResult(null)
    } finally {
      setVatLoading(false)
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'product_created':
      case 'buylist_received':
        return 'bg-emerald-500'
      case 'sourcing_created':
      case 'sourcing_status_changed':
        return 'bg-violet-500'
      case 'supplier_import':
        return 'bg-blue-500'
      default:
        return 'bg-gray-400'
    }
  }

  // Get time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <>
      <div className="flex flex-col items-center space-y-10 py-4 sm:py-6">
        {/* ═══════════ ZONE 1 — Hero + Command ═══════════ */}
        <div className="w-full max-w-2xl space-y-6 text-center">
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

          <div className="w-full">
            <CommandBar />
          </div>

          {/* Quick-action pills */}
          <div className="flex flex-wrap justify-center gap-2.5">
            <Link
              to="/inventory"
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm"
            >
              <Package className="h-4 w-4" />
              Inventory
            </Link>
            <Link
              to="/buy-box"
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm"
            >
              <Calculator className="h-4 w-4" />
              Evaluate
            </Link>
            <Link
              to="/sourcing"
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm"
            >
              <User className="h-4 w-4" />
              Sourcing
            </Link>
            <button type="button" onClick={() => openInsights('overview')} className={insightButtonClass} data-testid="dashboard-insights-button">
              <Sparkles className="h-3 w-3 mr-1" />
              Insights
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
            {/* ═══════════ ZONE 2 — Business Intelligence ═══════════ */}

            {/* ─── KPI Cards ─── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Inventory Value */}
              <div className="lux-card p-6 animate-bento-enter" style={{ '--stagger': 0 } as React.CSSProperties}>
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 border border-blue-100">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <button type="button" onClick={() => openInsights('overview')} className={insightButtonClass} aria-label="Open inventory value insights">
                    Insight
                  </button>
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
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600 border border-rose-100">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <button type="button" onClick={() => openInsights('overview')} className={insightButtonClass} aria-label="Open pending buy list insights">
                    Insight
                  </button>
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
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 border border-indigo-100">
                    <Users className="h-5 w-5" />
                  </div>
                  <button type="button" onClick={() => openInsights('activity')} className={insightButtonClass} aria-label="Open sourcing pipeline insights">
                    Insight
                  </button>
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
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 border border-amber-100">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      openInsights('low-stock')
                    }}
                    className={insightButtonClass}
                    aria-label="Open low stock insights"
                  >
                    Insight
                  </button>
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
              <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">Profit</h3>
                </div>
                <button type="button" onClick={() => openInsights('profit')} className={insightButtonClass} aria-label="Open profit insights">
                  Insight
                </button>
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

            {/* ─── Activity & System Status ─── */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Recent Activity */}
              <div className="lg:col-span-2 lux-card p-6 animate-bento-enter" style={{ '--stagger': 5 } as React.CSSProperties}>
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">Activity</h3>
                  </div>
                  <button type="button" onClick={() => openInsights('activity')} className={insightButtonClass} aria-label="Open activity insights">
                    Insight
                  </button>
                </div>

                <div className="space-y-5">
                  {activity.length === 0 ? (
                    <p className="text-sm text-gray-400">No activity yet</p>
                  ) : (
                    activity.map((event) => (
                      <div key={event.id} className="flex gap-4 group">
                        <div className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${getEventIcon(event.eventType)} shadow-sm`} />
                        <div className="flex-1 space-y-1">
                          <div className="text-sm text-gray-600">{getEventDescription(event)}</div>
                          <div className="text-xs text-gray-400">{formatRelativeDate(event.createdAt)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* System Status */}
              <div className="lux-card p-6 bg-gradient-to-br from-indigo-50/50 to-violet-50/50 animate-bento-enter" style={{ '--stagger': 6 } as React.CSSProperties}>
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="mb-1 text-lg font-display font-bold text-gray-900">Status</h3>
                    <p className="text-sm text-gray-500">All good</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openInsights('system')}
                    className={insightButtonClass}
                    aria-label="Open system insights"
                  >
                    Insight
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Supplier Feeds</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] animate-pulse" />
                      <span className="text-xs font-medium text-emerald-600">Live</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                    <div className="flex items-center gap-3">
                      <Zap className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">AI Engine</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)] animate-pulse" />
                      <span className="text-xs font-medium text-emerald-600">Ready</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openInsights('system')}
                  className="mt-6 w-full rounded-xl bg-white border border-gray-200 py-3 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 shadow-sm"
                >
                  Diagnostics
                </button>
              </div>
            </div>

            {/* ─── VAT Calculator ─── */}
            <div className="lux-card p-6 animate-bento-enter" style={{ '--stagger': 7 } as React.CSSProperties}>
              <div className="mb-6 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-indigo-600" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">VAT calculator</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-500">Amount (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={vatAmount}
                    onChange={(e) => setVatAmount(e.target.value)}
                    placeholder="0.00"
                    className="lux-input w-full"
                    aria-label="Amount in EUR"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="vat-incl"
                    checked={vatInclVat}
                    onChange={(e) => setVatInclVat(e.target.checked)}
                    className="rounded border-gray-300 bg-white text-indigo-600 focus:ring-indigo-500/30"
                  />
                  <label htmlFor="vat-incl" className="text-sm text-gray-600">
                    Price includes VAT
                  </label>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-500">VAT %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={vatRateOverride}
                    onChange={(e) => setVatRateOverride(e.target.value)}
                    placeholder="e.g. 23"
                    className="lux-input w-full"
                    aria-label="VAT rate percentage override"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleVatCalculate}
                    disabled={vatLoading || !vatAmount.trim()}
                    className="lux-btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"
                  >
                    {vatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                    Calculate
                  </button>
                </div>
              </div>
              {vatResult && (
                <div className="mt-6 grid gap-4 border-t border-gray-200 pt-6 sm:grid-cols-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gray-400">Net (EUR)</div>
                    <div className="text-lg font-semibold text-gray-900 font-mono">{formatCurrency(vatResult.netEur)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gray-400">VAT ({vatResult.ratePct}%)</div>
                    <div className="text-lg font-semibold text-gray-900 font-mono">{formatCurrency(vatResult.vatEur)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gray-400">Gross (EUR)</div>
                    <div className="text-lg font-semibold text-gray-900 font-mono">{formatCurrency(vatResult.grossEur)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* ═══════════ ZONE 3 — Market Intelligence (Collapsible) ═══════════ */}
            <div className="lux-card overflow-hidden animate-bento-enter" style={{ '--stagger': 8 } as React.CSSProperties}>
              <button
                type="button"
                onClick={() => setMarketOpen(!marketOpen)}
                className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-gray-50/50"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-50 p-2 text-violet-600 border border-violet-100">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Market & Logistics</h3>
                    <p className="text-xs text-gray-500">Currency · Crypto · Weather · Holidays · News · Pricing</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${marketOpen ? 'rotate-180' : ''}`} />
              </button>

              <div
                className={`grid transition-all duration-500 ease-in-out ${marketOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-gray-200 px-6 pb-6 pt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <CurrencyWidget />
                      <CryptoWidget />
                      <WeatherWidget />
                      <HolidaysWidget />
                      <MarketResearchWidget />
                      <NewsWidget />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <InsightsDrawer
        open={insightSource != null}
        source={insightSource ?? 'overview'}
        onClose={closeInsights}
        kpis={kpis}
        profit={profit}
        activity={activity}
        status={status}
      />
    </>
  )
}
