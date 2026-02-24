/**
 * Shared types for Dashboard-related data consumed by multiple views and drawers.
 */
import type { Product } from '@shared/schemas'

export interface KPIs {
    totalInventoryValue: number
    totalInventoryPotentialValue: number
    activeSourcingPipeline: number
    lowStockAlerts: number
}

export interface ProfitSummary {
    totalCost: number
    totalRevenue: number
    totalProfit: number
    marginPct: number
    itemsSold: number
    avgMarginPct: number
}

export type ProductWithId = Product & { id: string }
