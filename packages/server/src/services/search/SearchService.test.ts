import { beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '../../config/env'

const { mockWebSearch, mockExtractStructuredJson } = vi.hoisted(() => ({
  mockWebSearch: vi.fn(),
  mockExtractStructuredJson: vi.fn(),
}))

vi.mock('../ai/AiRouter', () => ({
  getAiRouter: () => ({
    webSearch: mockWebSearch,
    extractStructuredJson: mockExtractStructuredJson,
  }),
}))

vi.mock('../../config/env', () => ({
  env: {
    AI_ROUTING_MODE: 'dynamic',
    OPENAI_API_KEY: 'test-openai-key',
    PERPLEXITY_API_KEY: 'test-perplexity-key',
    SEARCH_ENRICHMENT_ENABLED: true,
    SEARCH_ENRICHMENT_MAX_COUNT: 1,
    SEARCH_ENRICHMENT_CACHE_TTL_MS: 60_000,
    SEARCH_DOMAIN_ALLOWLIST: 'vestiairecollective.com,designerexchange.ie,luxuryexchange.ie,siopaella.com',
    SEARCH_DOMAIN_DENYLIST: 'blocked.example',
  },
}))

describe('SearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    env.SEARCH_ENRICHMENT_ENABLED = true
    env.SEARCH_ENRICHMENT_MAX_COUNT = 1
  })

  it('filters search annotations by allowlist/denylist domain rules', async () => {
    const { SearchService } = await import('./SearchService')
    const service = new SearchService()

    mockWebSearch.mockResolvedValueOnce({
      data: {
        rawText: 'result text',
        annotations: [
          { url: 'https://vestiairecollective.com/item/1', title: 'Allowed' },
          { url: 'https://blocked.example/item/2', title: 'Denied by denylist' },
          { url: 'https://not-on-allowlist.com/item/3', title: 'Denied by allowlist' },
        ],
      },
      provider: 'perplexity',
      fallbackUsed: false,
    })

    const result = await service.searchMarket('query')

    expect(result.annotations).toEqual([
      { url: 'https://vestiairecollective.com/item/1', title: 'Allowed' },
    ])
    expect(result.results).toHaveLength(1)
  })

  it('supports global enrichment disable fallback', async () => {
    env.SEARCH_ENRICHMENT_ENABLED = false
    const { SearchService } = await import('./SearchService')
    const service = new SearchService()

    mockWebSearch.mockResolvedValueOnce({
      data: {
        rawText: 'result text',
        annotations: [{ url: 'https://vestiairecollective.com/item/1', title: 'Allowed' }],
      },
      provider: 'openai',
      fallbackUsed: false,
    })

    const result = await service.searchAndExtract<{ ok: boolean }>({
      searchQuery: 'query',
      extractionPrompt: 'extract',
    })

    expect(result.extracted).toBeNull()
    expect(mockExtractStructuredJson).not.toHaveBeenCalled()
    env.SEARCH_ENRICHMENT_ENABLED = true
  })

  it('caps enrichment calls and tracks failure metrics', async () => {
    const { SearchService } = await import('./SearchService')
    const service = new SearchService()

    mockWebSearch.mockResolvedValue({
      data: {
        rawText: 'result text',
        annotations: [{ url: 'https://designerexchange.ie/item/1', title: 'Listing' }],
      },
      provider: 'perplexity',
      fallbackUsed: false,
    })

    mockExtractStructuredJson.mockResolvedValueOnce({
      data: { ok: true },
      provider: 'openai',
      fallbackUsed: false,
    })

    const first = await service.searchAndExtract<{ ok: boolean }>({
      searchQuery: 'query',
      extractionPrompt: 'extract',
    })
    const second = await service.searchAndExtract<{ ok: boolean }>({
      searchQuery: 'query',
      extractionPrompt: 'extract',
    })

    expect(first.extracted).toEqual({ ok: true })
    expect(second.extracted).toBeNull()
    expect(mockExtractStructuredJson).toHaveBeenCalledTimes(1)

    const metrics = service.getEnrichmentMetrics()
    expect(metrics.extractionAttempts).toBe(1)
    expect(metrics.extractionSuccesses).toBe(1)
    expect(metrics.extractionSuccessRate).toBe(1)
  })

  it('searches Irish domains before EU fallback in multi-market mode', async () => {
    const { SearchService } = await import('./SearchService')
    const service = new SearchService()
    const searchMarketSpy = vi.spyOn(service, 'searchMarket').mockResolvedValue({
      results: [],
      rawText: '',
      annotations: [],
    })

    await service.searchMarketMulti('chanel classic flap', {
      userLocation: { country: 'IE' },
    })

    expect(searchMarketSpy).toHaveBeenCalledTimes(3)
    expect(searchMarketSpy.mock.calls[0][1]?.domains).toEqual([
      'designerexchange.ie',
      'luxuryexchange.ie',
      'siopaella.com',
    ])
    expect(searchMarketSpy.mock.calls[1][1]?.domains).toEqual([
      'vestiairecollective.com',
    ])
    expect(searchMarketSpy.mock.calls[2][1]?.domains).toEqual([])
  })

  it('keeps Irish-first ordering for each expanded query variant', async () => {
    const { SearchService } = await import('./SearchService')
    const service = new SearchService()
    const searchMarketSpy = vi.spyOn(service, 'searchMarket').mockResolvedValue({
      results: [],
      rawText: '',
      annotations: [],
    })

    await service.searchMarketMultiExpanded(
      ['chanel classic flap black', 'chanel timeless classic black'],
      { userLocation: { country: 'IE' } },
    )

    expect(searchMarketSpy).toHaveBeenCalledTimes(5)
    const domainsByCall = searchMarketSpy.mock.calls.map((call) => call[1]?.domains ?? [])

    expect(domainsByCall).toEqual([
      ['designerexchange.ie', 'luxuryexchange.ie', 'siopaella.com'],
      ['vestiairecollective.com'],
      ['designerexchange.ie', 'luxuryexchange.ie', 'siopaella.com'],
      ['vestiairecollective.com'],
      [],
    ])
  })
})
