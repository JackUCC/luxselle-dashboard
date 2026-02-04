/**
 * Orchestrates AI pricing: selects provider (mock/openai/gemini from env), runs analysis, applies margin and FX (usdToEur).
 * @see docs/CODE_REFERENCE.md
 * References: env, fx.ts, IPricingProvider implementations
 */
import { env } from '../../config/env'
import { ProductRepo } from '../../repos/ProductRepo'
import { TransactionRepo } from '../../repos/TransactionRepo'
import { MockPricingProvider } from './providers/MockPricingProvider'
import { OpenAIProvider } from './providers/OpenAIProvider'
import { GeminiProvider } from './providers/GeminiProvider'
import type { IPricingProvider, PricingAnalysisInput } from './providers/IPricingProvider'

export interface PricingServiceResult {
  estimatedRetailEur: number
  maxBuyPriceEur: number
  historyAvgPaidEur: number | null
  comps: Array<{
    title: string
    price: number
    source: string
    url?: string
  }>
  confidence: number
  provider: string
}

export class PricingService {
  private provider: IPricingProvider
  private providerName: string
  private transactionRepo: TransactionRepo
  private productRepo: ProductRepo

  constructor() {
    this.transactionRepo = new TransactionRepo()
    this.productRepo = new ProductRepo()
    
    // Select provider based on environment
    if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
      this.provider = new OpenAIProvider(env.OPENAI_API_KEY)
      this.providerName = 'openai'
    } else if (env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
      this.provider = new GeminiProvider(env.GEMINI_API_KEY)
      this.providerName = 'gemini'
    } else {
      this.provider = new MockPricingProvider()
      this.providerName = 'mock'
    }
  }

  async analyse(input: PricingAnalysisInput): Promise<PricingServiceResult> {
    // Get pricing estimate from provider
    const providerResult = await this.provider.analyse(input)

    // Calculate max buy price based on target margin
    const targetMarginPct = env.TARGET_MARGIN_PCT
    const maxBuyPriceEur = Math.round(
      providerResult.estimatedRetailEur * (1 - targetMarginPct / 100)
    )

    // Query transaction history for similar items
    const historyAvgPaidEur = await this.getHistoricalAverage(
      input.brand,
      input.model
    )

    return {
      estimatedRetailEur: providerResult.estimatedRetailEur,
      maxBuyPriceEur,
      historyAvgPaidEur,
      comps: providerResult.comps,
      confidence: providerResult.confidence,
      provider: this.providerName,
    }
  }

  private async getHistoricalAverage(
    brand: string,
    model: string
  ): Promise<number | null> {
    try {
      // Get all purchase transactions
      const transactions = await this.transactionRepo.list()
      const purchases = transactions.filter((t) => t.type === 'purchase')

      if (purchases.length === 0) {
        return null
      }

      const brandLower = brand.toLowerCase()
      const modelLower = model.toLowerCase()

      // Filter for similar items (this is simplified)
      const products = await this.productRepo.list()
      const productMap = new Map(products.map((product) => [product.id, product]))
      const similarPurchases = purchases.filter((transaction) => {
        if (!transaction.productId) return false
        const product = productMap.get(transaction.productId)
        if (!product) return false
        return (
          product.brand.toLowerCase().includes(brandLower) &&
          product.model.toLowerCase().includes(modelLower)
        )
      })

      if (similarPurchases.length === 0) {
        return null
      }

      const sum = similarPurchases.reduce((acc, t) => acc + t.amountEur, 0)
      const avg = sum / similarPurchases.length

      return Math.round(avg)
    } catch (error) {
      console.error('Error calculating historical average:', error)
      return null
    }
  }
}
