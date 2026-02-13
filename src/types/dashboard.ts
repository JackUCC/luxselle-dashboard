/**
 * Shared types for Dashboard-related data consumed by multiple views and drawers.
 */
import type { ActivityEvent, Product } from '@shared/schemas'

export type ActivityEventWithId = ActivityEvent & { id: string }

export interface KPIs {
    totalInventoryValue: number
    pendingBuyListValue: number
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

export interface SystemStatus {
    aiProvider: string
    firebaseMode: string
    lastSupplierImport: {
        status: string
        lastRunAt?: string
        lastError?: string
    } | null
}

export type ProductWithId = Product & { id: string }
