import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  basePricingInput,
  makeProduct,
  makeTransaction,
} from '../../test-utils/pricingFixtures'

const listMock = vi.fn()
const productListMock = vi.fn()
const settingsGetMock = vi.fn()
const analyseMock = vi.fn()

const defaultEnv = {
  NODE_ENV: 'test',
  PORT: 3001,
  FIREBASE_USE_EMULATOR: true,
  FIREBASE_PROJECT_ID: 'luxselle-dashboard',
  FIREBASE_STORAGE_BUCKET: 'luxselle-dashboard.firebasestorage.app',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8082',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9198',
  AI_ROUTING_MODE: 'dynamic',
  OPENAI_API_KEY: 'test-openai-key',
  PERPLEXITY_API_KEY: 'test-perplexity-key',
  BASE_CURRENCY: 'EUR',
  TARGET_MARGIN_PCT: 35,
}

const defaultProviderResult = {
  estimatedRetailEur: 3000,
  confidence: 0.82,
  comps: [
    {
      title: 'Designer Exchange Listing',
      price: 2900,
      source: 'Designer Exchange',
      sourceUrl: 'https://designerexchange.ie/item',
      marketCountry: 'IE',
    },
    {
      title: 'Vestiaire Listing',
      price: 3020,
      source: 'Vestiaire Collective',
      sourceUrl: 'https://vestiairecollective.com/item',
      marketCountry: 'EU',
    },
  ],
  provider: 'hybrid' as const,
}

const loadPricingService = async (overrides: Partial<typeof defaultEnv> = {}) => {
  vi.resetModules()
  listMock.mockReset()
  productListMock.mockReset()
  settingsGetMock.mockReset()
  analyseMock.mockReset()
  listMock.mockResolvedValue([])
  productListMock.mockResolvedValue([])
  settingsGetMock.mockResolvedValue(null)
  analyseMock.mockResolvedValue(defaultProviderResult)

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

  vi.doMock('./providers/OpenAIProvider', () => ({
    OpenAIProvider: class {
      analyse = analyseMock
    },
  }))

  const module = await import('./PricingService')
  return module.PricingService
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PricingService', () => {
  beforeEach(() => {
    listMock.mockResolvedValue([])
    productListMock.mockResolvedValue([])
  })

  it('calculates max buy price using target margin', async () => {
    const PricingService = await loadPricingService({ TARGET_MARGIN_PCT: 35 })
    const service = new PricingService()
    const result = await service.analyse(basePricingInput)

    const expected = Math.round(result.estimatedRetailEur * (1 - 35 / 100))
    expect(result.maxBuyPriceEur).toBe(expected)
  })

  it('handles margin edge cases', async () => {
    const PricingServiceZero = await loadPricingService({ TARGET_MARGIN_PCT: 0 })
    const serviceZero = new PricingServiceZero()
    const resultZero = await serviceZero.analyse(basePricingInput)
    expect(resultZero.maxBuyPriceEur).toBe(Math.round(resultZero.estimatedRetailEur))

    const PricingServiceFull = await loadPricingService({ TARGET_MARGIN_PCT: 100 })
    const serviceFull = new PricingServiceFull()
    const resultFull = await serviceFull.analyse(basePricingInput)
    expect(resultFull.maxBuyPriceEur).toBe(0)
  })

  it('handles large estimated retail values', async () => {
    const PricingService = await loadPricingService({ TARGET_MARGIN_PCT: 10 })
    analyseMock.mockResolvedValueOnce({
      ...defaultProviderResult,
      estimatedRetailEur: 1_000_000,
    })
    const service = new PricingService()
    const result = await service.analyse(basePricingInput)

    expect(result.maxBuyPriceEur).toBe(900000)
  })

  it('returns null when no purchase history exists', async () => {
    const PricingService = await loadPricingService()
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

  it('passes through provider label from dynamic provider', async () => {
    const PricingService = await loadPricingService()
    const service = new PricingService()
    const result = await service.analyse(basePricingInput)

    expect(result.provider).toBe('hybrid')
  })

  it('applies IE-first market policy with EU fallback', async () => {
    const PricingService = await loadPricingService()
    analyseMock.mockResolvedValueOnce({
      ...defaultProviderResult,
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
    const service = new PricingService()
    const result = await service.analyse(basePricingInput)

    expect(result.marketSummary.marketCountry).toBe('IE')
    expect(result.marketSummary.ieCount).toBe(1)
    expect(result.marketSummary.fallbackUsed).toBe(true)
    expect(result.comps.some((comp) => comp.marketScope === 'IE')).toBe(true)
    expect(result.comps.some((comp) => comp.marketScope === 'EU_FALLBACK')).toBe(true)
  })

  it('classifies Vestiaire as EU fallback under IE-first policy', async () => {
    const PricingService = await loadPricingService()
    analyseMock.mockResolvedValueOnce({
      ...defaultProviderResult,
      comps: [
        {
          title: 'Designer Exchange Listing',
          price: 2950,
          source: 'Designer Exchange',
          sourceUrl: 'https://designerexchange.ie/item',
          marketCountry: 'IE',
        },
        {
          title: 'Vestiaire Listing',
          price: 3020,
          source: 'Vestiaire Collective',
          sourceUrl: 'https://vestiairecollective.com/item',
          marketCountry: 'IE',
        },
      ],
    })
    const service = new PricingService()
    const result = await service.analyse(basePricingInput)

    const vestiaireComp = result.comps.find((comp) =>
      comp.source.toLowerCase().includes('vestiaire'),
    )

    expect(vestiaireComp).toBeDefined()
    expect(vestiaireComp?.marketScope).toBe('EU_FALLBACK')
    expect(vestiaireComp?.marketCountry).toBe('EU')
    expect(result.comps[0].marketScope).toBe('IE')
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
