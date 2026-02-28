import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockEnrichComparables } = vi.hoisted(() => ({
  mockEnrichComparables: vi.fn(),
}))

vi.mock('./ComparableEnrichmentService', () => ({
  ComparableEnrichmentService: class {
    enrichComparables = mockEnrichComparables
  },
}))

import { env } from '../../config/env'
import { PriceCheckService } from './PriceCheckService'

describe('PriceCheckService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnrichComparables.mockResolvedValue([])
  })

  it('returns mock response shape without requiring comparable image enrichment', async () => {
    const previousProvider = env.AI_PROVIDER
    const previousKey = env.OPENAI_API_KEY

    ;(env as { AI_PROVIDER: 'mock' | 'openai' }).AI_PROVIDER = 'mock'
    ;(env as { OPENAI_API_KEY?: string }).OPENAI_API_KEY = undefined

    try {
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
    } finally {
      ;(env as { AI_PROVIDER: 'mock' | 'openai' }).AI_PROVIDER = previousProvider
      ;(env as { OPENAI_API_KEY?: string }).OPENAI_API_KEY = previousKey
    }
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
