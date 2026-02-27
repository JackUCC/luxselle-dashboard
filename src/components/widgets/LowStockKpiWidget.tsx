/**
 * Low-stock KPI widget for Dashboard. Displays lowStockAlerts and links to /inventory?lowStock=1 when clicked.
 */
import { Package } from 'lucide-react'
import type { KPIs } from '../../types/dashboard'
import StatCard from '../design-system/StatCard'

interface LowStockKpiWidgetProps {
  kpis: KPIs | null
  stagger?: number
}

export default function LowStockKpiWidget({ kpis, stagger = 0 }: LowStockKpiWidgetProps) {
  const count = kpis?.lowStockAlerts ?? 0

  return (
    <StatCard
      label={
        <span className="inline-flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" />
          Low Stock
        </span>
      }
      value={count}
      secondary={
        count > 0 ? (
          <span className="text-[13px] font-medium text-amber-600">View {count} item{count !== 1 ? 's' : ''}</span>
        ) : (
          <span className="text-[13px] text-lux-400">All stocked</span>
        )
      }
      href="/inventory?lowStock=1"
      stagger={stagger}
    />
  )
}
