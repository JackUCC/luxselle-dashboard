import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockExpandQuery,
  mockSearchMarketMultiExpanded,
  mockEnrichComparables,
  mockGetRate,
  mockExtractStructuredJson,
} = vi.hoisted(() => ({
  mockExpandQuery: vi.fn(),
  mockSearchMarketMultiExpanded: vi.fn(),
  mockEnrichComparables: vi.fn(),
  mockGetRate: vi.fn(),
  mockExtractStructuredJson: vi.fn(),
}))

vi.mock('../search/SearchService', () => ({
  SearchService: class {
    expandQuery = mockExpandQuery
    searchMarketMultiExpanded = mockSearchMarketMultiExpanded
  },
}))

vi.mock('../ai/AiRouter', () => ({
  getAiRouter: () => ({
    extractStructuredJson: mockExtractStructuredJson,
  }),
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
  results: [
    { title: 'Listing 1', url: 'https://designerexchange.ie/item/1', snippet: '' },
    { title: 'Listing 2', url: 'https://vestiairecollective.com/item/2', snippet: '' },
  ],
  rawText: 'Live search results with real listing prices from Irish and EU marketplaces.',
  annotations: [
    { title: 'Listing 1', url: 'https://designerexchange.ie/item/1' },
    { title: 'Listing 2', url: 'https://vestiairecollective.com/item/2' },
  ],
}

describe('PriceCheckService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExpandQuery.mockResolvedValue(QUERY_CONTEXT)
    mockSearchMarketMultiExpanded.mockResolvedValue(SEARCH_RESPONSE)
    mockEnrichComparables.mockImplementation(async (comparables) => comparables)
    mockGetRate.mockResolvedValue(1)
  })

  it('returns degraded ai_fallback shape when extraction is unavailable', async () => {
    mockExtractStructuredJson.mockRejectedValue(new Error('no provider available'))

    const service = new PriceCheckService()
    const result = await service.check({ query: 'Chanel Classic Flap' })

    expect(result.dataSource).toBe('ai_fallback')
    expect(result.comps).toEqual([])
    expect(result.averageSellingPriceEur).toBe(0)
    expect(result.maxBuyEur).toBe(0)
    expect(result.maxBidEur).toBe(0)
    expect(result.diagnostics?.emptyReason).toBe('extraction_failed')
    expect(mockEnrichComparables).not.toHaveBeenCalled()
  })

  it('returns provider_unavailable when all search providers fail', async () => {
    mockSearchMarketMultiExpanded.mockResolvedValue({
      results: [],
      rawText: '',
      annotations: [],
      providerError: true,
    })

    const service = new PriceCheckService()
    const result = await service.check({ query: 'Chanel Classic Flap' })

    expect(result).toMatchObject({
      averageSellingPriceEur: 0,
      comps: [],
      maxBuyEur: 0,
      maxBidEur: 0,
      dataSource: 'provider_unavailable',
    })
    expect(mockExtractStructuredJson).not.toHaveBeenCalled()
    expect(mockEnrichComparables).not.toHaveBeenCalled()
  })

  it('returns web_search result when extraction returns valid comparables', async () => {
    mockExtractStructuredJson.mockResolvedValueOnce({
      data: {
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
      },
      provider: 'openai',
      fallbackUsed: false,
    })

    const service = new PriceCheckService()
    const result = await service.check({ query: 'Chanel Classic Flap Medium Black' })

    expect(mockExtractStructuredJson).toHaveBeenCalledTimes(1)
    expect(mockSearchMarketMultiExpanded).toHaveBeenCalledWith(
      QUERY_CONTEXT.searchVariants,
      expect.objectContaining({ userLocation: { country: 'IE' } }),
    )
    expect(result.dataSource).toBe('web_search')
    expect(result.averageSellingPriceEur).toBe(3100)
    expect(result.comps).toHaveLength(2)
  })

  it('returns degraded ai_fallback result when extraction returns too few valid comparables', async () => {
    mockExtractStructuredJson.mockResolvedValueOnce({
      data: {
        comps: [
          {
            title: 'Listing without URL',
            price: 3200,
            source: 'Designer Exchange',
          },
        ],
      },
      provider: 'openai',
      fallbackUsed: false,
    })

    const service = new PriceCheckService()
    const result = await service.check({ query: 'Chanel Classic Flap Medium Black' })

    expect(result).toMatchObject({
      averageSellingPriceEur: 0,
      comps: [],
      maxBuyEur: 0,
      maxBidEur: 0,
      dataSource: 'ai_fallback',
    })
    expect(result.diagnostics?.emptyReason).toBe('insufficient_valid_comps')
    expect(mockEnrichComparables).not.toHaveBeenCalled()
  })

  it('backfills comparable source urls from search annotations and includes diagnostics', async () => {
    mockSearchMarketMultiExpanded.mockResolvedValue({
      ...SEARCH_RESPONSE,
      annotations: [
        { title: 'Designer Exchange listing', url: 'https://designerexchange.ie/item/1' },
        { title: 'Vestiaire listing', url: 'https://vestiairecollective.com/item/2' },
      ],
    })

    mockExtractStructuredJson.mockResolvedValueOnce({
      data: {
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
      },
      provider: 'openai',
      fallbackUsed: false,
    })

    const service = new PriceCheckService()
    const result = await service.check({ query: 'Chanel Classic Flap Medium Black' })

    expect(result.comps[0].sourceUrl).toBe('https://designerexchange.ie/item/1')
    expect(result.comps[1].sourceUrl).toBe('https://vestiairecollective.com/item/2')
    expect(result.diagnostics).toMatchObject({
      searchAnnotationCount: 2,
      emptyReason: undefined,
    })
  })

  it('returns insufficient_provenance when all comps filtered out by citation set', async () => {
    mockSearchMarketMultiExpanded.mockResolvedValue({
      ...SEARCH_RESPONSE,
      annotations: [{ title: 'Only this URL counts', url: 'https://designerexchange.ie/item/1' }],
    })

    mockExtractStructuredJson.mockResolvedValueOnce({
      data: {
        comps: [
          {
            title: 'Uncited listing A',
            price: 3200,
            source: 'Other',
            sourceUrl: 'https://other.com/item/a',
          },
          {
            title: 'Uncited listing B',
            price: 3000,
            source: 'Other',
            sourceUrl: 'https://other.com/item/b',
          },
        ],
      },
      provider: 'openai',
      fallbackUsed: false,
    })

    const service = new PriceCheckService()
    const result = await service.check({ query: 'Chanel Classic Flap Medium Black' })

    expect(result.comps).toHaveLength(0)
    expect(result.diagnostics?.emptyReason).toBe('insufficient_provenance')
    expect(result.diagnostics?.extractedCompCount).toBe(2)
    expect(result.diagnostics?.validCompCount).toBe(0)
    expect(result.diagnostics?.filteredOutCount).toBe(2)
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
