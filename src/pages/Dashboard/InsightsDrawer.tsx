import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight, Sparkles, X } from 'lucide-react'

import { insightLabelMap, type InsightSource } from '../../components/layout/routeMeta'
import { formatCurrency } from '../../lib/formatters'
import type { ActivityEventWithId, KPIs, ProfitSummary, SystemStatus } from '../../types/dashboard'

export interface InsightPanelProps {
  open: boolean
  source: InsightSource
  onClose: () => void
  kpis: KPIs | null
  profit: ProfitSummary | null
  activity: ActivityEventWithId[]
  status: SystemStatus | null
}

const getInsightBullets = (
  source: InsightSource,
  data: Pick<InsightPanelProps, 'kpis' | 'profit' | 'activity' | 'status'>
): string[] => {
  const { kpis, profit, activity, status } = data

  if (source === 'low-stock') {
    return [
      kpis
        ? `${kpis.lowStockAlerts} item(s) are under low-stock threshold.`
        : 'Low-stock status is being calculated.',
      'Review affected SKUs and queue buy-list additions before demand spikes.',
      'Use the one-click inventory filter to action replenishment quickly.',
    ]
  }

  if (source === 'profit') {
    return [
      profit
        ? `Profit snapshot: ${formatCurrency(profit.totalProfit)} at ${profit.avgMarginPct}% average margin.`
        : 'Profit snapshot is being prepared.',
      'Compare total cost vs revenue trend before committing large purchases.',
      'Flag underperforming categories for repricing this week.',
    ]
  }

  if (source === 'activity') {
    return [
      activity.length
        ? `${activity.length} recent event(s) captured across inventory, sourcing, and suppliers.`
        : 'No activity recorded in the current window.',
      'Prioritize unresolved events before opening new tasks.',
      'Use activity timing to identify bottlenecks in your daily flow.',
    ]
  }

  if (source === 'system') {
    return [
      status
        ? `AI: ${status.aiProvider.toUpperCase()} | Data mode: ${status.firebaseMode.toUpperCase()}.`
        : 'System health is loading.',
      status?.lastSupplierImport?.status
        ? `Last supplier import status: ${status.lastSupplierImport.status}.`
        : 'No supplier import history available yet.',
      'Run diagnostics before major imports if there are pending operational alerts.',
    ]
  }

  return [
    kpis
      ? `Inventory value is ${formatCurrency(kpis.totalInventoryValue)} with ${kpis.lowStockAlerts} low-stock alert(s).`
      : 'Operational overview is loading.',
    profit
      ? `Pending buy-list value stands at ${formatCurrency(kpis?.pendingBuyListValue ?? 0)}.`
      : 'Profit and buying signals are still loading.',
    'Use focused insights below to prioritize your next action.',
  ]
}

const getActions = (source: InsightSource) => {
  if (source === 'low-stock') {
    return [{ label: 'Open Low Stock Filter', to: '/inventory?lowStock=1' }]
  }

  if (source === 'profit') {
    return [{ label: 'Review Inventory Margins', to: '/inventory' }]
  }

  if (source === 'activity') {
    return [{ label: 'Open Jobs', to: '/jobs' }]
  }

  if (source === 'system') {
    return [{ label: 'Open Supplier Hub', to: '/supplier-hub' }]
  }

  return [
    { label: 'Open Inventory', to: '/inventory' },
    { label: 'Open Buying List', to: '/buying-list' },
  ]
}

export default function InsightsDrawer({
  open,
  source,
  onClose,
  kpis,
  profit,
  activity,
  status,
}: InsightPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const bullets = useMemo(
    () => getInsightBullets(source, { kpis, profit, activity, status }),
    [source, kpis, profit, activity, status]
  )
  const actions = useMemo(() => getActions(source), [source])

  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement as HTMLElement | null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return

      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = originalOverflow
      previousFocus?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-gray-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close insights drawer"
      />

      <aside
        ref={panelRef}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-hidden border-l border-gray-200 bg-white shadow-2xl animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="insights-drawer-title"
        data-testid="dashboard-insights-drawer"
      >
        <header className="border-b border-gray-200 bg-gray-50/70 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Insights</p>
              <h2 id="insights-drawer-title" className="font-display text-xl font-semibold text-gray-900">
                {insightLabelMap[source]}
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label="Close insights"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2 text-gray-700">
              <Sparkles className="h-4 w-4" />
              <p className="text-sm font-semibold">What matters now</p>
            </div>
            <ul className="space-y-3">
              {bullets.map((bullet, index) => (
                <li key={index} className="flex gap-2 text-sm text-gray-600">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-semibold">Suggested Action</p>
            </div>
            <p className="text-sm text-amber-800">
              Review this insight and execute one follow-up action to keep operations ahead of demand.
            </p>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Quick links</p>
            <div className="space-y-2">
              {actions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  <span>{action.label}</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  )
}
