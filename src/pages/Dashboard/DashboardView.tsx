/**
 * Dashboard overview: KPIs, recent activity, status and profit widgets; uses apiGet and CommandBar.
 * @see docs/CODE_REFERENCE.md
 */
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Activity,
  AlertCircle,
  Calculator,
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
} from 'lucide-react'
import { apiGet } from '../../lib/api'
import { formatCurrency, formatRelativeDate } from '../../lib/formatters'
import type { ActivityEventWithId, KPIs, ProfitSummary, SystemStatus } from '../../types/dashboard'
import { isInsightSource, type InsightSource } from '../../components/layout/routeMeta'
import CommandBar from './CommandBar'
import DashboardSkeleton from './DashboardSkeleton'
import InsightsDrawer from './InsightsDrawer'
import { CurrencyWidget, HolidaysWidget, MarketResearchWidget, NewsWidget } from '../../components/widgets'

interface VatResult {
  netEur: number
  vatEur: number
  grossEur: number
  ratePct: number
}



const insightButtonClass =
  'inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900'

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
        return 'bg-green-500'
      case 'sourcing_created':
      case 'sourcing_status_changed':
        return 'bg-violet-500'
      case 'supplier_import':
        return 'bg-blue-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <>
      <div className="flex flex-col items-center space-y-10 py-4 sm:py-6">
        <div className="w-full max-w-2xl space-y-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-3xl font-display font-bold text-gray-900 sm:text-4xl">Good afternoon, Jack</h1>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              title="Refresh data"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="w-full">
            <CommandBar />
          </div>

          <div className="flex flex-wrap justify-center gap-2.5">
            <Link
              to="/inventory"
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-soft transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <Package className="h-4 w-4" />
              View Stock
            </Link>
            <Link
              to="/buy-box"
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-soft transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <Calculator className="h-4 w-4" />
              Evaluate Item
            </Link>
            <Link
              to="/sourcing"
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-soft transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <User className="h-4 w-4" />
              Sourcing List
            </Link>
            <button type="button" onClick={() => openInsights('overview')} className={insightButtonClass}>
              Insights
            </button>
          </div>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          <div className="w-full max-w-4xl rounded-lg border border-red-100 bg-red-50 p-5 text-center text-red-700">
            <p>{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="w-full space-y-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lux-card p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => openInsights('overview')}
                    className={insightButtonClass}
                    aria-label="Open inventory value insights"
                  >
                    Insight
                  </button>
                </div>
                <div className="mb-1 text-2xl font-bold text-gray-900">
                  {kpis ? formatCurrency(kpis.totalInventoryValue) : '—'}
                </div>
                <div className="text-sm text-gray-500">Total Inventory Value</div>
              </div>

              <div className="lux-card p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => openInsights('overview')}
                    className={insightButtonClass}
                    aria-label="Open pending buy list insights"
                  >
                    Insight
                  </button>
                </div>
                <div className="mb-1 text-2xl font-bold text-gray-900">
                  {kpis ? formatCurrency(kpis.pendingBuyListValue) : '—'}
                </div>
                <div className="text-sm text-gray-500">Pending Buy List</div>
              </div>

              <div className="lux-card p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => openInsights('activity')}
                    className={insightButtonClass}
                    aria-label="Open sourcing pipeline insights"
                  >
                    Insight
                  </button>
                </div>
                <div className="mb-1 text-2xl font-bold text-gray-900">
                  {kpis ? formatCurrency(kpis.activeSourcingPipeline) : '—'}
                </div>
                <div className="text-sm text-gray-500">Active Sourcing Pipeline</div>
              </div>

              <Link
                to="/inventory?lowStock=1"
                className="lux-card block cursor-pointer rounded-xl p-6 transition-shadow hover:shadow-md hover:ring-2 hover:ring-orange-200"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
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
                <div className="mb-1 text-2xl font-bold text-gray-900">{kpis ? kpis.lowStockAlerts : '—'}</div>
                <div className="text-sm text-gray-500">Low Stock Alerts</div>
              </Link>
            </div>

            <div className="lux-card p-6">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-gray-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">Profit Summary</h3>
                </div>
                <button
                  type="button"
                  onClick={() => openInsights('profit')}
                  className={insightButtonClass}
                  aria-label="Open profit insights"
                >
                  Insight
                </button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="mb-1 text-sm text-gray-500">Total Revenue</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {profit ? formatCurrency(profit.totalRevenue) : '—'}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-sm text-gray-500">Total Cost</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {profit ? formatCurrency(profit.totalCost) : '—'}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-sm text-gray-500">Total Profit</div>
                  <div className={`text-2xl font-bold ${profit && profit.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profit ? formatCurrency(profit.totalProfit) : '—'}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-sm text-gray-500">Avg Margin</div>
                  <div
                    className={`text-2xl font-bold ${profit && profit.avgMarginPct >= 20
                      ? 'text-green-600'
                      : profit && profit.avgMarginPct >= 10
                        ? 'text-orange-600'
                        : 'text-red-600'
                      }`}
                  >
                    {profit ? `${profit.avgMarginPct}%` : '—'}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">{profit ? `${profit.itemsSold} items sold` : ''}</div>
                </div>
              </div>
            </div>

            <div className="lux-card p-6">
              <div className="mb-6 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-gray-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">VAT compliance calculator</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Amount (EUR)</label>
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
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="vat-incl" className="text-sm text-gray-700">
                    Amount includes VAT
                  </label>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">VAT rate % (optional)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={vatRateOverride}
                    onChange={(e) => setVatRateOverride(e.target.value)}
                    placeholder="From settings"
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
                    <div className="text-xs uppercase tracking-wider text-gray-500">Net (EUR)</div>
                    <div className="text-lg font-semibold text-gray-900">{formatCurrency(vatResult.netEur)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gray-500">VAT ({vatResult.ratePct}%)</div>
                    <div className="text-lg font-semibold text-gray-900">{formatCurrency(vatResult.vatEur)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gray-500">Gross (EUR)</div>
                    <div className="text-lg font-semibold text-gray-900">{formatCurrency(vatResult.grossEur)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Market & Logistics Section */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <CurrencyWidget />
              <HolidaysWidget />
              <MarketResearchWidget />
              <NewsWidget />
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 lux-card p-6">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-gray-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900">Recent Activity</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => openInsights('activity')}
                    className={insightButtonClass}
                    aria-label="Open activity insights"
                  >
                    Insight
                  </button>
                </div>

                <div className="space-y-6">
                  {activity.length === 0 ? (
                    <p className="text-sm text-gray-500">No recent activity</p>
                  ) : (
                    activity.map((event) => (
                      <div key={event.id} className="flex gap-4">
                        <div className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${getEventIcon(event.eventType)}`} />
                        <div className="flex-1 space-y-1">
                          <div className="text-sm text-gray-600">{getEventDescription(event)}</div>
                          <div className="text-xs text-gray-400">{formatRelativeDate(event.createdAt)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-gray-900 p-6 text-white shadow-soft-lg">
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="mb-1 text-lg font-display font-bold">System Status</h3>
                    <p className="text-sm text-gray-400">All systems operational.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openInsights('system')}
                    className="inline-flex items-center rounded-full border border-gray-700 px-2.5 py-1 text-xs font-medium text-gray-200 transition-colors hover:bg-gray-800"
                    aria-label="Open system insights"
                  >
                    Insight
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium">Supplier Feeds</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                      <span className="text-xs font-medium text-emerald-500">Live</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                    <div className="flex items-center gap-3">
                      <Zap className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium">AI Engine</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                      <span className="text-xs font-medium text-emerald-500">Ready</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openInsights('system')}
                  className="mt-6 w-full rounded-lg bg-gray-800 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                >
                  Run Diagnostics
                </button>
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
