/**
 * Dashboard API: KPIs, recent activity, aggregates from products, sourcing, jobs, transactions.
 * @see docs/CODE_REFERENCE.md
 */
import { Router } from 'express'
import { env } from '../config/env'
import { ProductRepo } from '../repos/ProductRepo'
import { SourcingRequestRepo } from '../repos/SourcingRequestRepo'
import { ActivityEventRepo } from '../repos/ActivityEventRepo'
import { SystemJobRepo } from '../repos/SystemJobRepo'
import { TransactionRepo } from '../repos/TransactionRepo'
import { getAiRouter } from '../services/ai/AiRouter'

const router = Router()
const productRepo = new ProductRepo()
const sourcingRepo = new SourcingRequestRepo()
const activityRepo = new ActivityEventRepo()
const systemJobRepo = new SystemJobRepo()
const transactionRepo = new TransactionRepo()
const aiRouter = getAiRouter()
const DASHBOARD_IN_STOCK_SCAN_LIMIT = 2000
const DASHBOARD_SOURCING_SCAN_LIMIT = 2000
const DASHBOARD_STATUS_SCAN_LIMIT = 200
const DASHBOARD_ACTIVITY_LIMIT_DEFAULT = 20
const DASHBOARD_ACTIVITY_LIMIT_MAX = 100
const DASHBOARD_SOLD_SCAN_LIMIT = 2000
const DASHBOARD_SALE_TRANSACTION_SCAN_LIMIT = 2000

// KPIs: inventory value (in_stock), pending buy list value, active sourcing pipeline
router.get('/kpis', async (_req, res, next) => {
  try {
    const [inStockProducts, sourcingRequests] = await Promise.all([
      productRepo.listByStatus('in_stock', { limit: DASHBOARD_IN_STOCK_SCAN_LIMIT }),
      sourcingRepo.listByStatuses(['open', 'sourcing'], { limit: DASHBOARD_SOURCING_SCAN_LIMIT }),
    ])

    // Total Inventory Cost (sum cost where status=in_stock)
    const totalInventoryValue = inStockProducts.reduce(
      (sum, p) => sum + p.costPriceEur * p.quantity,
      0
    )

    // Total Inventory Potential Value (sum sell price where status=in_stock)
    const totalInventoryPotentialValue = inStockProducts.reduce(
      (sum, p) => sum + p.sellPriceEur * p.quantity,
      0
    )

    // Total number of bags/items in inventory (sum quantity where status=in_stock)
    const totalInventoryItems = inStockProducts.reduce((sum, p) => sum + p.quantity, 0)

    // Active Sourcing Pipeline (sum budgets where status IN [open, sourcing])
    const activeSourcingPipeline = sourcingRequests.reduce((sum, req) => sum + req.budget, 0)

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.json({
      data: {
        totalInventoryValue,
        totalInventoryPotentialValue,
        totalInventoryItems,
        activeSourcingPipeline,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Recent activity: activity events sorted by createdAt desc, optional limit
router.get('/activity', async (req, res, next) => {
  try {
    const rawLimit = Number.parseInt(String(req.query.limit ?? DASHBOARD_ACTIVITY_LIMIT_DEFAULT), 10)
    const limit = Number.isNaN(rawLimit)
      ? DASHBOARD_ACTIVITY_LIMIT_DEFAULT
      : Math.max(1, Math.min(rawLimit, DASHBOARD_ACTIVITY_LIMIT_MAX))
    const recentEvents = await activityRepo.listRecent(limit)

    res.json({ data: recentEvents })
  } catch (error) {
    next(error)
  }
})

// Get system status
router.get('/status', async (_req, res, next) => {
  try {
    const jobs = await systemJobRepo.listRecent(DASHBOARD_STATUS_SCAN_LIMIT)
    const aiDiagnostics = aiRouter.getDiagnostics()
    const lastImportJob = jobs.find((job) => job.jobType === 'supplier_import')

    res.json({
      data: {
        aiRoutingMode: aiDiagnostics.aiRoutingMode,
        providerAvailability: aiDiagnostics.providerAvailability,
        lastProviderByTask: aiDiagnostics.lastProviderByTask,
        firebaseMode: env.FIREBASE_USE_EMULATOR ? 'emulator' : 'real',
        lastSupplierImport: lastImportJob
          ? {
              status: lastImportJob.status,
              lastRunAt: lastImportJob.lastRunAt,
              lastError: lastImportJob.lastError,
            }
          : null,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Get profit summary
router.get('/profit-summary', async (_req, res, next) => {
  try {
    const [soldProducts, saleTransactions] = await Promise.all([
      productRepo.listByStatus('sold', { limit: DASHBOARD_SOLD_SCAN_LIMIT }),
      transactionRepo.listByType('sale', { limit: DASHBOARD_SALE_TRANSACTION_SCAN_LIMIT }),
    ])
    const itemsSold = soldProducts.length

    // Calculate from sold products (multiply by quantity for multi-unit sales)
    const totalCost = soldProducts.reduce((sum, p) => sum + p.costPriceEur * p.quantity, 0)
    const totalRevenue = soldProducts.reduce((sum, p) => sum + p.sellPriceEur * p.quantity, 0)

    // Also include actual sale transactions for more accuracy
    const transactionRevenue = saleTransactions.reduce((sum, t) => sum + t.amountEur, 0)

    // Use transaction revenue if available, otherwise use sell prices
    const actualRevenue = transactionRevenue > 0 ? transactionRevenue : totalRevenue

    const totalProfit = actualRevenue - totalCost
    const marginPct = actualRevenue > 0 ? (totalProfit / actualRevenue) * 100 : 0

    // Calculate average margin per item
    const avgMarginPct = itemsSold > 0
      ? soldProducts.reduce((sum, p) => {
          const margin = p.sellPriceEur > 0
            ? ((p.sellPriceEur - p.costPriceEur) / p.sellPriceEur) * 100
            : 0
          return sum + margin
        }, 0) / itemsSold
      : 0

    res.json({
      data: {
        totalCost,
        totalRevenue: actualRevenue,
        totalProfit,
        marginPct: Math.round(marginPct * 10) / 10,
        itemsSold,
        avgMarginPct: Math.round(avgMarginPct * 10) / 10,
      },
    })
  } catch (error) {
    next(error)
  }
})

export { router as dashboardRouter }
