import { Router } from 'express'
import { env } from '../config/env'
import { ProductRepo } from '../repos/ProductRepo'
import { BuyingListItemRepo } from '../repos/BuyingListItemRepo'
import { SourcingRequestRepo } from '../repos/SourcingRequestRepo'
import { ActivityEventRepo } from '../repos/ActivityEventRepo'
import { SystemJobRepo } from '../repos/SystemJobRepo'
import { TransactionRepo } from '../repos/TransactionRepo'

const router = Router()
const productRepo = new ProductRepo()
const buyingListRepo = new BuyingListItemRepo()
const sourcingRepo = new SourcingRequestRepo()
const activityRepo = new ActivityEventRepo()
const systemJobRepo = new SystemJobRepo()
const transactionRepo = new TransactionRepo()

// Get KPIs
router.get('/kpis', async (_req, res, next) => {
  try {
    const [products, buyingListItems, sourcingRequests] = await Promise.all([
      productRepo.list(),
      buyingListRepo.list(),
      sourcingRepo.list(),
    ])

    // Total Inventory Value (sum cost where status=in_stock)
    const totalInventoryValue = products
      .filter((p) => p.status === 'in_stock')
      .reduce((sum, p) => sum + p.costPriceEur * p.quantity, 0)

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

    // Low Stock Alerts (count where quantity < threshold)
    const lowStockThreshold = 2 // Could get from settings
    const lowStockAlerts = products.filter(
      (p) => p.status === 'in_stock' && p.quantity < lowStockThreshold
    ).length

    res.json({
      data: {
        totalInventoryValue,
        pendingBuyListValue,
        activeSourcingPipeline,
        lowStockAlerts,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Get recent activity
router.get('/activity', async (req, res, next) => {
  try {
    const limit = parseInt(String(req.query.limit || '20'))
    const allEvents = await activityRepo.list()
    
    // Sort by createdAt descending and take the limit
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
