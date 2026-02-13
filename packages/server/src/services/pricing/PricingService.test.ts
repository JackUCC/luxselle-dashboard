import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  basePricingInput,
  makeProduct,
  makeTransaction,
} from '../../test-utils/pricingFixtures'

const listMock = vi.fn()
const productListMock = vi.fn()

const defaultEnv = {
  NODE_ENV: 'test',
  PORT: 3001,
  FIREBASE_USE_EMULATOR: true,
  FIREBASE_PROJECT_ID: 'luxselle-dashboard',
  FIREBASE_STORAGE_BUCKET: 'luxselle-dashboard.firebasestorage.app',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
  AI_PROVIDER: 'mock',
  OPENAI_API_KEY: '',
  GEMINI_API_KEY: '',
  BASE_CURRENCY: 'EUR',
  TARGET_MARGIN_PCT: 35,
}

const loadPricingService = async (overrides: Partial<typeof defaultEnv> = {}) => {
  vi.resetModules()
  listMock.mockReset()
  productListMock.mockReset()

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
      GEMINI_API_KEY: '',
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

  it('selects gemini provider when configured', async () => {
    vi.resetModules()
    listMock.mockReset()
    productListMock.mockReset()

    const analyseMock = vi.fn().mockResolvedValue({
      estimatedRetailEur: 3000,
      confidence: 0.85,
      comps: [{ title: 'Test Comp', price: 2900, source: 'Gemini' }],
    })

    vi.doMock('../../config/env', () => ({
      env: { ...defaultEnv, AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'test-key' },
    }))
    vi.doMock('./providers/GeminiProvider', () => ({
      GeminiProvider: class { analyse = analyseMock },
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

    expect(result.provider).toBe('gemini')
  })
})
