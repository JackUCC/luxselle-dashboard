import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockExpandQuery,
  mockSearchMarketMultiExpanded,
  mockEnrichComparables,
  mockGetRate,
  mockChatCompletionsCreate,
} = vi.hoisted(() => ({
  mockExpandQuery: vi.fn(),
  mockSearchMarketMultiExpanded: vi.fn(),
  mockEnrichComparables: vi.fn(),
  mockGetRate: vi.fn(),
  mockChatCompletionsCreate: vi.fn(),
}))

vi.mock('../search/SearchService', () => ({
  SearchService: class {
    expandQuery = mockExpandQuery
    searchMarketMultiExpanded = mockSearchMarketMultiExpanded
  },
}))

vi.mock('../search/ComparableImageEnrichmentService', () => ({
  ComparableImageEnrichmentService: class {
    enrichComparables = mockEnrichComparables
  },
}))

vi.mock('../fx/FxService', () => ({
  getFxService: () => ({
    getRate: mockGetRate,
  }),
}))

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: mockChatCompletionsCreate } }
  },
}))

import { env } from '../../config/env'
import { PriceCheckService } from './PriceCheckService'

const QUERY_CONTEXT = {
  canonicalDescription: 'Chanel Classic Flap Medium Black',
  keyAttributes: {
    brand: 'Chanel',
    style: 'Classic Flap',
    size: 'Medium',
    material: 'Caviar',
    colour: 'Black',
    hardware: 'Gold',
  },
  searchVariants: ['Chanel Classic Flap Medium Black'],
  matchingCriteria: 'Match brand, style, size, colour, and material',
}

const SEARCH_RESPONSE = {
  results: [{ title: 'Listing 1', url: 'https://designerexchange.ie/item/1', snippet: '' }],
  rawText: 'Live search results with real listing prices from Irish and EU marketplaces.',
  annotations: [{ title: 'Listing 1', url: 'https://designerexchange.ie/item/1' }],
}

describe('PriceCheckService', () => {
  const previousProvider = env.AI_PROVIDER
  const previousKey = env.OPENAI_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    ;(env as { AI_PROVIDER: 'mock' | 'openai' | 'perplexity' }).AI_PROVIDER = 'openai'
    ;(env as { OPENAI_API_KEY?: string }).OPENAI_API_KEY = 'test-key'

    mockExpandQuery.mockResolvedValue(QUERY_CONTEXT)
    mockSearchMarketMultiExpanded.mockResolvedValue(SEARCH_RESPONSE)
    mockEnrichComparables.mockImplementation(async (comparables) => comparables)
    mockGetRate.mockResolvedValue(1)
  })

  afterEach(() => {
    ;(env as { AI_PROVIDER: 'mock' | 'openai' | 'perplexity' }).AI_PROVIDER = previousProvider
    ;(env as { OPENAI_API_KEY?: string }).OPENAI_API_KEY = previousKey
  })

  it('returns mock response shape without requiring comparable image enrichment', async () => {
    ;(env as { AI_PROVIDER: 'mock' | 'openai' | 'perplexity' }).AI_PROVIDER = 'mock'
    ;(env as { OPENAI_API_KEY?: string }).OPENAI_API_KEY = undefined

    const service = new PriceCheckService()
    const result = await service.check({ query: 'Chanel Classic Flap' })

    expect(result.dataSource).toBe('mock')
    expect(result.comps).toHaveLength(2)
    expect(result.comps[0]).toMatchObject({
      title: expect.any(String),
      price: expect.any(Number),
      source: expect.any(String),
      sourceUrl: expect.any(String),
    })
    expect(mockEnrichComparables).not.toHaveBeenCalled()
  })

  it('retries extraction once and succeeds on the second attempt', async () => {
    mockChatCompletionsCreate
      .mockRejectedValueOnce(new Error('transient upstream error'))
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              averageSellingPriceEur: 0,
              comps: [
                {
                  title: 'Designer Exchange listing',
                  price: 3200,
                  source: 'Designer Exchange',
                  sourceUrl: 'https://designerexchange.ie/item/1',
                },
                {
                  title: 'Vestiaire listing',
                  price: 3000,
                  source: 'Vestiaire Collective',
                  sourceUrl: 'https://vestiairecollective.com/item/2',
                },
              ],
            }),
          },
        }],
      })

    const service = new PriceCheckService()
    const result = await service.check({ query: 'Chanel Classic Flap Medium Black' })

    expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(2)
    expect(mockSearchMarketMultiExpanded).toHaveBeenCalledWith(
      QUERY_CONTEXT.searchVariants,
      expect.objectContaining({ userLocation: { country: 'IE' } }),
    )
    expect(result.dataSource).toBe('web_search')
    expect(result.averageSellingPriceEur).toBe(3100)
    expect(result.comps).toHaveLength(2)
  })

  it('returns degraded ai_fallback result when extraction fails on all attempts', async () => {
    mockChatCompletionsCreate
      .mockRejectedValueOnce(new Error('openai timeout'))
      .mockRejectedValueOnce(new Error('openai 500'))

    const service = new PriceCheckService()
    const result = await service.check({ query: 'Chanel Classic Flap Medium Black' })

    expect(mockChatCompletionsCreate).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({
      averageSellingPriceEur: 0,
      comps: [],
      maxBuyEur: 0,
      maxBidEur: 0,
      dataSource: 'ai_fallback',
    })
    expect(typeof result.researchedAt).toBe('string')
    expect(mockEnrichComparables).not.toHaveBeenCalled()
  })



  it('backfills comparable source urls from search annotations and includes diagnostics', async () => {
    mockSearchMarketMultiExpanded.mockResolvedValue({
      ...SEARCH_RESPONSE,
      annotations: [{ title: 'Designer Exchange listing', url: 'https://designerexchange.ie/item/1' }],
    })

    mockChatCompletionsCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            comps: [
              {
                title: 'Designer Exchange listing',
                price: 3200,
                source: 'Designer Exchange',
              },
              {
                title: 'Vestiaire listing',
                price: 3000,
                source: 'Vestiaire Collective',
                sourceUrl: 'https://vestiairecollective.com/item/2',
              },
            ],
          }),
        },
      }],
    })

    const service = new PriceCheckService()
    const result = await service.check({ query: 'Chanel Classic Flap Medium Black' })

    expect(result.comps[0].sourceUrl).toBe('https://designerexchange.ie/item/1')
    expect(result.diagnostics).toMatchObject({
      searchAnnotationCount: 1,
      emptyReason: undefined,
    })
  })

  it('orders comparables with Irish competitors before EU fallback', async () => {
    const service = new PriceCheckService()

    const ordered = (service as unknown as {
      orderCompsByMarketPriority: (
        comps: Array<{ title: string; price: number; source: string; sourceUrl?: string }>,
      ) => Array<{ source: string }>
    }).orderCompsByMarketPriority([
      {
        title: 'Vestiaire listing',
        price: 3000,
        source: 'Vestiaire Collective',
        sourceUrl: 'https://vestiairecollective.com/item/1',
      },
      {
        title: 'Irish listing by URL',
        price: 2900,
        source: 'Unknown Source',
        sourceUrl: 'https://designerexchange.ie/item/2',
      },
      {
        title: 'Irish listing by source name',
        price: 2950,
        source: 'Siopaella',
      },
      {
        title: 'Generic EU listing',
        price: 3050,
        source: 'Generic EU Marketplace',
      },
    ])

    expect(ordered.map((comp) => comp.source)).toEqual([
      'Unknown Source',
      'Siopaella',
      'Vestiaire Collective',
      'Generic EU Marketplace',
    ])
  })
})
