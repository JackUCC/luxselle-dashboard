import { beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '../../config/env'

const responsesCreate = vi.fn()
const chatCreate = vi.fn()

vi.mock('../../config/env', () => ({
  env: {
    AI_PROVIDER: 'openai',
    OPENAI_API_KEY: 'test-key',
    SEARCH_ENRICHMENT_ENABLED: true,
    SEARCH_ENRICHMENT_MAX_COUNT: 1,
    SEARCH_ENRICHMENT_CACHE_TTL_MS: 60_000,
    SEARCH_DOMAIN_ALLOWLIST: 'vestiairecollective.com,designerexchange.ie,luxuryexchange.ie,siopaella.com',
    SEARCH_DOMAIN_DENYLIST: 'blocked.example',
  },
}))

vi.mock('openai', () => ({
  default: class OpenAI {
    responses = { create: responsesCreate }
    chat = { completions: { create: chatCreate } }
  },
}))

describe('SearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters search annotations by allowlist/denylist domain rules', async () => {
    const { SearchService } = await import('./SearchService')
    const service = new SearchService()

    responsesCreate.mockResolvedValueOnce({
      output_text: 'result text',
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              annotations: [
                { type: 'url_citation', url: 'https://vestiairecollective.com/item/1', title: 'Allowed' },
                { type: 'url_citation', url: 'https://blocked.example/item/2', title: 'Denied by denylist' },
                { type: 'url_citation', url: 'https://not-on-allowlist.com/item/3', title: 'Denied by allowlist' },
              ],
            },
          ],
        },
      ],
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

    responsesCreate.mockResolvedValueOnce({
      output_text: 'result text',
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', annotations: [{ type: 'url_citation', url: 'https://vestiairecollective.com/item/1', title: 'Allowed' }] }],
        },
      ],
    })

    const result = await service.searchAndExtract<{ ok: boolean }>({
      searchQuery: 'query',
      extractionPrompt: 'extract',
    })

    expect(result.extracted).toBeNull()
    expect(chatCreate).not.toHaveBeenCalled()
    env.SEARCH_ENRICHMENT_ENABLED = true
  })

  it('caps enrichment calls and tracks failure metrics', async () => {
    const { SearchService } = await import('./SearchService')
    const service = new SearchService()

    responsesCreate.mockResolvedValue({
      output_text: 'result text',
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', annotations: [{ type: 'url_citation', url: 'https://designerexchange.ie/item/1', title: 'Listing' }] }],
        },
      ],
    })

    chatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{"ok":true}' } }],
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
