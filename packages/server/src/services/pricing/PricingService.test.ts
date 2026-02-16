import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  basePricingInput,
  makeProduct,
  makeTransaction,
} from '../../test-utils/pricingFixtures'

const listMock = vi.fn()
const productListMock = vi.fn()
const settingsGetMock = vi.fn()

const defaultEnv = {
  NODE_ENV: 'test',
  PORT: 3001,
  FIREBASE_USE_EMULATOR: true,
  FIREBASE_PROJECT_ID: 'luxselle-dashboard',
  FIREBASE_STORAGE_BUCKET: 'luxselle-dashboard.firebasestorage.app',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8082',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9198',
  AI_PROVIDER: 'mock',
  OPENAI_API_KEY: '',
  BASE_CURRENCY: 'EUR',
  TARGET_MARGIN_PCT: 35,
}

const loadPricingService = async (overrides: Partial<typeof defaultEnv> = {}) => {
  vi.resetModules()
  listMock.mockReset()
  productListMock.mockReset()
  settingsGetMock.mockReset()
  settingsGetMock.mockResolvedValue(null)

  vi.doMock('../../config/env', () => ({
    env: { ...defaultEnv, ...overrides },
  }))

  vi.doMock('../../repos/TransactionRepo', () => ({
    TransactionRepo: class {
      list = listMock
    },
  }))

  vi.doMock('../../repos/ProductRepo', () => ({
    ProductRepo: class {
      list = productListMock
    },
  }))

  vi.doMock('../../repos/SettingsRepo', () => ({
    SettingsRepo: class {
      getSettings = settingsGetMock
    },
  }))

  const module = await import('./PricingService')
  return module.PricingService
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PricingService', () => {
  it('calculates max buy price using target margin', async () => {
    const PricingService = await loadPricingService({ TARGET_MARGIN_PCT: 35 })
    listMock.mockResolvedValueOnce([])
    productListMock.mockResolvedValueOnce([])
    const service = new PricingService()
    const result = await service.analyse(basePricingInput)

    const expected = Math.round(result.estimatedRetailEur * (1 - 35 / 100))
    expect(result.maxBuyPriceEur).toBe(expected)
  })

  it('handles margin edge cases', async () => {
    const PricingServiceZero = await loadPricingService({ TARGET_MARGIN_PCT: 0 })
    listMock.mockResolvedValueOnce([])
    productListMock.mockResolvedValueOnce([])
    const serviceZero = new PricingServiceZero()
    const resultZero = await serviceZero.analyse(basePricingInput)
    expect(resultZero.maxBuyPriceEur).toBe(Math.round(resultZero.estimatedRetailEur))

    const PricingServiceFull = await loadPricingService({ TARGET_MARGIN_PCT: 100 })
    listMock.mockResolvedValueOnce([])
    productListMock.mockResolvedValueOnce([])
    const serviceFull = new PricingServiceFull()
    const resultFull = await serviceFull.analyse(basePricingInput)
    expect(resultFull.maxBuyPriceEur).toBe(0)
  })

  it('handles large estimated retail values', async () => {
    const PricingService = await loadPricingService({ TARGET_MARGIN_PCT: 10 })
    const { MockPricingProvider } = await import('./providers/MockPricingProvider')
    vi.spyOn(MockPricingProvider.prototype, 'analyse').mockResolvedValue({
      estimatedRetailEur: 1000000,
      confidence: 0.8,
      comps: [],
    })
    listMock.mockResolvedValueOnce([])
    productListMock.mockResolvedValueOnce([])
    const service = new PricingService()
    const result = await service.analyse(basePricingInput)

    expect(result.maxBuyPriceEur).toBe(900000)
  })

  it('returns null when no purchase history exists', async () => {
    const PricingService = await loadPricingService()
    listMock.mockResolvedValueOnce([])
    productListMock.mockResolvedValueOnce([])
    const service = new PricingService()
    const result = await service.analyse(basePricingInput)

    expect(result.historyAvgPaidEur).toBeNull()
  })

  it('calculates historical average from purchase transactions', async () => {
    const PricingService = await loadPricingService()
    const product = makeProduct('product-1', 'Chanel', 'Classic Flap')
    listMock.mockResolvedValueOnce([
      { ...makeTransaction(1000, 'purchase'), productId: product.id },
      { ...makeTransaction(2000, 'purchase'), productId: product.id },
      makeTransaction(500, 'sale'),
    ])
    productListMock.mockResolvedValueOnce([product])
    const service = new PricingService()
    const result = await service.analyse(basePricingInput)

    expect(result.historyAvgPaidEur).toBe(1500)
  })

  it('returns null when purchase history does not match brand/model', async () => {
    const PricingService = await loadPricingService()
    const product = makeProduct('product-2', 'Louis Vuitton', 'Neverfull')
    listMock.mockResolvedValueOnce([
      { ...makeTransaction(1000, 'purchase'), productId: product.id },
    ])
    productListMock.mockResolvedValueOnce([product])
    const service = new PricingService()
    const result = await service.analyse(basePricingInput)

    expect(result.historyAvgPaidEur).toBeNull()
  })

  it('selects mock provider by default', async () => {
    const PricingService = await loadPricingService({
      AI_PROVIDER: 'mock',
      OPENAI_API_KEY: '',
    })
    listMock.mockResolvedValueOnce([])
    productListMock.mockResolvedValueOnce([])
    const service = new PricingService()
    const result = await service.analyse(basePricingInput)

    expect(result.provider).toBe('mock')
  })

  it('selects openai provider when configured', async () => {
    vi.resetModules()
    listMock.mockReset()
    productListMock.mockReset()

    const analyseMock = vi.fn().mockResolvedValue({
      estimatedRetailEur: 3000,
      confidence: 0.85,
      comps: [{ title: 'Test Comp', price: 2900, source: 'OpenAI' }],
    })

    vi.doMock('../../config/env', () => ({
      env: { ...defaultEnv, AI_PROVIDER: 'openai', OPENAI_API_KEY: 'test-key' },
    }))
    vi.doMock('./providers/OpenAIProvider', () => ({
      OpenAIProvider: class { analyse = analyseMock },
    }))
    vi.doMock('../../repos/TransactionRepo', () => ({
      TransactionRepo: class { list = listMock },
    }))
    vi.doMock('../../repos/ProductRepo', () => ({
      ProductRepo: class { list = productListMock },
    }))

    listMock.mockResolvedValueOnce([])
    productListMock.mockResolvedValueOnce([])
    const { PricingService } = await import('./PricingService')
    const service = new PricingService()
    const result = await service.analyse(basePricingInput)

    expect(result.provider).toBe('openai')
  })

  it('applies IE-first market policy with EU fallback', async () => {
    const PricingService = await loadPricingService()
    const { MockPricingProvider } = await import('./providers/MockPricingProvider')
    vi.spyOn(MockPricingProvider.prototype, 'analyse').mockResolvedValue({
      estimatedRetailEur: 3000,
      confidence: 0.82,
      comps: [
        {
          title: 'IE Comp',
          price: 2900,
          source: 'adverts.ie',
          sourceUrl: 'https://adverts.ie/item',
          marketCountry: 'IE',
        },
        {
          title: 'EU Comp 1',
          price: 3050,
          source: 'Vestiaire',
          sourceUrl: 'https://vestiairecollective.com/item',
          marketCountry: 'EU',
        },
        {
          title: 'EU Comp 2',
          price: 2950,
          source: 'Rebag',
          sourceUrl: 'https://rebag.com/item',
          marketCountry: 'EU',
        },
      ],
    })

    settingsGetMock.mockResolvedValueOnce({
      pricingIeSourceAllowlist: ['adverts.ie'],
      pricingMarketCountryDefault: 'IE',
      pricingMarketMode: 'ie_first_eu_fallback',
    })
    listMock.mockResolvedValueOnce([])
    productListMock.mockResolvedValueOnce([])

    const service = new PricingService()
    const result = await service.analyse(basePricingInput)

    expect(result.marketSummary.marketCountry).toBe('IE')
    expect(result.marketSummary.ieCount).toBe(1)
    expect(result.marketSummary.fallbackUsed).toBe(true)
    expect(result.comps.some((comp) => comp.marketScope === 'IE')).toBe(true)
    expect(result.comps.some((comp) => comp.marketScope === 'EU_FALLBACK')).toBe(true)
  })

  it('calculates auction landed cost breakdown deterministically', async () => {
    const PricingService = await loadPricingService()
    const service = new PricingService()
    const result = service.calculateAuctionLandedCost({
      hammerEur: 1000,
      buyerPremiumPct: 10,
      platformFeePct: 5,
      fixedFeeEur: 20,
      paymentFeePct: 2,
      shippingEur: 40,
      insuranceEur: 10,
      customsDutyPct: 4,
      importVatPct: 23,
      platformId: 'test',
      platformName: 'Test Auction',
    })

    expect(result.buyerPremiumEur).toBe(100)
    expect(result.platformFeeEur).toBe(70)
    expect(result.paymentFeeEur).toBe(23.4)
    expect(result.preImportSubtotalEur).toBe(1193.4)
    expect(result.customsValueEur).toBe(1243.4)
    expect(result.customsDutyEur).toBe(49.74)
    expect(result.vatBaseEur).toBe(1293.14)
    expect(result.importVatEur).toBe(297.42)
    expect(result.landedCostEur).toBe(1590.56)
  })
})
