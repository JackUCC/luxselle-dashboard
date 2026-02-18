/**
 * Dashboard API: KPIs, recent activity, aggregates from products, buying list, sourcing, jobs, transactions.
 * @see docs/CODE_REFERENCE.md
 * References: Express, repos
 */
import { Router } from 'express'
import { ZodError } from 'zod'
import { env } from '../config/env'
import { ProductRepo } from '../repos/ProductRepo'
import { BuyingListItemRepo } from '../repos/BuyingListItemRepo'
import { SourcingRequestRepo } from '../repos/SourcingRequestRepo'
import { ActivityEventRepo } from '../repos/ActivityEventRepo'
import { SystemJobRepo } from '../repos/SystemJobRepo'
import { TransactionRepo } from '../repos/TransactionRepo'
import { SettingsRepo } from '../repos/SettingsRepo'

const router = Router()
const productRepo = new ProductRepo()
const buyingListRepo = new BuyingListItemRepo()
const sourcingRepo = new SourcingRequestRepo()
const activityRepo = new ActivityEventRepo()
const systemJobRepo = new SystemJobRepo()
const transactionRepo = new TransactionRepo()
const settingsRepo = new SettingsRepo()

// KPIs: inventory value (in_stock), pending buy list value, active sourcing pipeline, low stock count
router.get('/kpis', async (_req, res, next) => {
  try {
    const logValidationSource = (source: string, e: unknown) => {
      const details = e instanceof ZodError ? e.issues : undefined
      console.warn(JSON.stringify({ level: 'warn', message: 'kpis_validation_source', source, error: e instanceof Error ? e.message : String(e), details }))
    }
    let products, buyingListItems, sourcingRequests, settings
    try {
      products = await productRepo.list()
    } catch (e) {
      logValidationSource('products', e)
      throw e
    }
    try {
      buyingListItems = await buyingListRepo.list()
    } catch (e) {
      logValidationSource('buyingList', e)
      throw e
    }
    try {
      sourcingRequests = await sourcingRepo.list()
    } catch (e) {
      logValidationSource('sourcing', e)
      throw e
    }
    try {
      settings = await settingsRepo.getSettings()
    } catch (e) {
      logValidationSource('settings', e)
      throw e
    }

    // Total Inventory Cost (sum cost where status=in_stock)
    const totalInventoryValue = products
      .filter((p) => p.status === 'in_stock')
      .reduce((sum, p) => sum + p.costPriceEur * p.quantity, 0)

    // Total Inventory Potential Value (sum sell price where status=in_stock)
    const totalInventoryPotentialValue = products
      .filter((p) => p.status === 'in_stock')
      .reduce((sum, p) => sum + p.sellPriceEur * p.quantity, 0)

    // Pending Buy List Value (sum target price where status IN [pending, ordered])
    const pendingBuyListValue = buyingListItems
      .filter((item) => item.status === 'pending' || item.status === 'ordered')
      .reduce((sum, item) => sum + item.targetBuyPriceEur, 0)

    // Active Sourcing Pipeline (sum budgets where status IN [open, sourcing])
    const activeSourcingPipeline = sourcingRequests
      .filter(
        (req) => req.status === 'open' || req.status === 'sourcing'
      )
      .reduce((sum, req) => sum + req.budget, 0)

    // Low Stock Alerts (count where quantity < threshold from settings)
    const lowStockThreshold = settings?.lowStockThreshold ?? 2
    const lowStockAlerts = products.filter(
      (p) => p.status === 'in_stock' && p.quantity < lowStockThreshold
    ).length

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.json({
      data: {
        totalInventoryValue,
        totalInventoryPotentialValue,
        pendingBuyListValue,
        activeSourcingPipeline,
        lowStockAlerts,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Recent activity: activity events sorted by createdAt desc, optional limit
router.get('/activity', async (req, res, next) => {
  try {
    const limit = parseInt(String(req.query.limit || '20'))
    const allEvents = await activityRepo.list()
    const recentEvents = allEvents
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)

    res.json({ data: recentEvents })
  } catch (error) {
    next(error)
  }
})

// Get system status
router.get('/status', async (_req, res, next) => {
  try {
    const jobs = await systemJobRepo.list()
    const lastImportJob = jobs
      .filter((job) => job.jobType === 'supplier_import')
      .sort((a, b) => (b.lastRunAt || '').localeCompare(a.lastRunAt || ''))[0]

    res.json({
      data: {
        aiProvider: env.AI_PROVIDER,
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
    const [products, transactions] = await Promise.all([
      productRepo.list(),
      transactionRepo.list(),
    ])

    // Get sold products
    const soldProducts = products.filter((p) => p.status === 'sold')
    const itemsSold = soldProducts.length

    // Calculate from sold products
    const totalCost = soldProducts.reduce((sum, p) => sum + p.costPriceEur, 0)
    const totalRevenue = soldProducts.reduce((sum, p) => sum + p.sellPriceEur, 0)
    
    // Also include actual sale transactions for more accuracy
    const saleTransactions = transactions.filter((t) => t.type === 'sale')
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
