/**
 * Orchestrates AI pricing: selects provider (mock/openai from env), runs analysis, applies margin and FX (usdToEur).
 * @see docs/CODE_REFERENCE.md
 * References: env, fx.ts, IPricingProvider implementations
 */
import { env } from '../../config/env'
import { ProductRepo } from '../../repos/ProductRepo'
import { SettingsRepo } from '../../repos/SettingsRepo'
import { TransactionRepo } from '../../repos/TransactionRepo'
import { MockPricingProvider } from './providers/MockPricingProvider'
import { OpenAIProvider } from './providers/OpenAIProvider'
import type { IPricingProvider, PricingAnalysisInput } from './providers/IPricingProvider'
import type { PricingComparable, PricingMarketSummary } from '@shared/schemas'

export interface PricingServiceResult {
  estimatedRetailEur: number
  maxBuyPriceEur: number
  historyAvgPaidEur: number | null
  comps: PricingComparable[]
  confidence: number
  provider: string
  marketSummary: PricingMarketSummary
}

export interface AuctionLandedCostInput {
  platformId?: string
  platformName?: string
  hammerEur: number
  buyerPremiumPct: number
  platformFeePct: number
  fixedFeeEur: number
  paymentFeePct: number
  shippingEur: number
  insuranceEur: number
  customsDutyPct: number
  importVatPct: number
}

export interface AuctionLandedCostResult {
  platformId?: string
  platformName?: string
  calculatedAt: string
  hammerEur: number
  buyerPremiumPct: number
  platformFeePct: number
  fixedFeeEur: number
  paymentFeePct: number
  shippingEur: number
  insuranceEur: number
  customsDutyPct: number
  importVatPct: number
  buyerPremiumEur: number
  platformFeeEur: number
  paymentFeeEur: number
  preImportSubtotalEur: number
  customsValueEur: number
  customsDutyEur: number
  vatBaseEur: number
  importVatEur: number
  landedCostEur: number
}

export class PricingService {
  private provider: IPricingProvider
  private providerName: string
  private transactionRepo: TransactionRepo
  private productRepo: ProductRepo
  private settingsRepo: SettingsRepo

  constructor() {
    this.transactionRepo = new TransactionRepo()
    this.productRepo = new ProductRepo()
    this.settingsRepo = new SettingsRepo()
    
    // Select provider based on environment
    if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
      this.provider = new OpenAIProvider(env.OPENAI_API_KEY)
      this.providerName = 'openai'
    } else {
      this.provider = new MockPricingProvider()
      this.providerName = 'mock'
    }
  }

  async analyse(input: PricingAnalysisInput): Promise<PricingServiceResult> {
    const settings = await this.getSettingsSafe()
    const marketCountry = input.marketCountry ?? settings?.pricingMarketCountryDefault ?? 'IE'
    const marketMode = input.marketMode ?? settings?.pricingMarketMode ?? 'ie_first_eu_fallback'

    // Get pricing estimate from provider
    const providerResult = await this.provider.analyse({
      ...input,
      marketCountry,
      marketMode,
    })
    const allowlist = settings?.pricingIeSourceAllowlist ?? []
    const marketProcessed = this.applyIeFirstMarketPolicy(providerResult.comps, allowlist, marketCountry)

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
      comps: marketProcessed.comps,
      confidence: providerResult.confidence,
      provider: this.providerName,
      marketSummary: marketProcessed.summary,
    }
  }

  calculateAuctionLandedCost(input: AuctionLandedCostInput): AuctionLandedCostResult {
    const buyerPremiumEur = this.roundMoney(input.hammerEur * (input.buyerPremiumPct / 100))
    const platformFeeEur = this.roundMoney(
      input.hammerEur * (input.platformFeePct / 100) + input.fixedFeeEur,
    )
    const paymentFeeBase = input.hammerEur + buyerPremiumEur + platformFeeEur
    const paymentFeeEur = this.roundMoney(paymentFeeBase * (input.paymentFeePct / 100))
    const preImportSubtotalEur = this.roundMoney(
      input.hammerEur + buyerPremiumEur + platformFeeEur + paymentFeeEur,
    )
    const customsValueEur = this.roundMoney(preImportSubtotalEur + input.shippingEur + input.insuranceEur)
    const customsDutyEur = this.roundMoney(customsValueEur * (input.customsDutyPct / 100))
    const vatBaseEur = this.roundMoney(customsValueEur + customsDutyEur)
    const importVatEur = this.roundMoney(vatBaseEur * (input.importVatPct / 100))
    const landedCostEur = this.roundMoney(
      preImportSubtotalEur +
        input.shippingEur +
        input.insuranceEur +
        customsDutyEur +
        importVatEur,
    )

    return {
      platformId: input.platformId,
      platformName: input.platformName,
      calculatedAt: new Date().toISOString(),
      hammerEur: this.roundMoney(input.hammerEur),
      buyerPremiumPct: input.buyerPremiumPct,
      platformFeePct: input.platformFeePct,
      fixedFeeEur: this.roundMoney(input.fixedFeeEur),
      paymentFeePct: input.paymentFeePct,
      shippingEur: this.roundMoney(input.shippingEur),
      insuranceEur: this.roundMoney(input.insuranceEur),
      customsDutyPct: input.customsDutyPct,
      importVatPct: input.importVatPct,
      buyerPremiumEur,
      platformFeeEur,
      paymentFeeEur,
      preImportSubtotalEur,
      customsValueEur,
      customsDutyEur,
      vatBaseEur,
      importVatEur,
      landedCostEur,
    }
  }

  private applyIeFirstMarketPolicy(
    rawComps: Array<{
      title: string
      price: number
      source: string
      sourceUrl?: string
      marketCountry?: string
      url?: string
    }>,
    ieSourceAllowlist: string[],
    marketCountry: 'IE',
  ): { comps: PricingComparable[]; summary: PricingMarketSummary } {
    const allowlist = ieSourceAllowlist
      .map((value) => this.normalizeAllowlistDomain(value))
      .filter(Boolean)
    const normalized = rawComps.map((comp) => {
      const sourceUrl = comp.sourceUrl ?? comp.url
      const isIe = this.isIeComparable(comp.source, sourceUrl, comp.marketCountry, allowlist)
      return {
        title: comp.title,
        price: Math.round(comp.price),
        source: comp.source,
        sourceUrl,
        marketCountry: isIe ? 'IE' : 'EU',
        marketScope: isIe ? 'IE' : 'EU_FALLBACK',
      } satisfies PricingComparable
    })

    const ieComps = normalized.filter((comp) => comp.marketScope === 'IE')
    const euComps = normalized.filter((comp) => comp.marketScope === 'EU_FALLBACK')
    const fallbackSlots = ieComps.length >= 2 ? 0 : Math.max(0, 4 - ieComps.length)
    const selected = [...ieComps, ...euComps.slice(0, fallbackSlots)]
    const fallbackUsed = fallbackSlots > 0 && euComps.length > 0

    return {
      comps: selected,
      summary: {
        marketCountry,
        marketMode: 'ie_first_eu_fallback',
        ieCount: ieComps.length,
        euFallbackCount: fallbackUsed ? Math.min(fallbackSlots, euComps.length) : 0,
        fallbackUsed,
      },
    }
  }

  private isIeComparable(
    source: string,
    sourceUrl: string | undefined,
    marketCountry: string | undefined,
    allowlist: string[],
  ): boolean {
    if ((marketCountry ?? '').toUpperCase() === 'IE') return true

    const sourceHost = this.extractHostname(source)
    const sourceUrlHost = this.extractHostname(sourceUrl)

    return allowlist.some((domain) =>
      this.hostnameMatches(sourceHost, domain) || this.hostnameMatches(sourceUrlHost, domain),
    )
  }

  private normalizeAllowlistDomain(value: string): string {
    return this.extractHostname(value)
  }

  private extractHostname(value?: string): string {
    if (!value) return ''
    const trimmed = value.trim().toLowerCase()
    if (!trimmed) return ''

    try {
      const withProtocol =
        trimmed.startsWith('http://') || trimmed.startsWith('https://')
          ? trimmed
          : `https://${trimmed}`
      return new URL(withProtocol).hostname.toLowerCase().replace(/^www\./, '')
    } catch {
      return trimmed
        .replace(/^https?:\/\//, '')
        .split('/')[0]
        .replace(/^www\./, '')
    }
  }

  private hostnameMatches(candidate: string, domain: string): boolean {
    if (!candidate || !domain) return false
    return candidate === domain || candidate.endsWith(`.${domain}`)
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100
  }

  private async getSettingsSafe() {
    try {
      return await this.settingsRepo.getSettings()
    } catch {
      return null
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
