import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { DEFAULT_ORG_ID } from '@shared/schemas'
import { SavedResearchService } from './SavedResearchService'

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}))

vi.mock('../repos/SavedResearchRepo', () => ({
  SavedResearchRepo: class {
    create = mockCreate
    findAll = vi.fn()
    findById = vi.fn()
    update = vi.fn()
    softDelete = vi.fn()
  },
}))

const baseResult = {
  provider: 'openai+web_search',
  brand: 'Chanel',
  model: 'Classic Flap',
  estimatedMarketValueEur: 6480,
  priceRangeLowEur: 6400,
  priceRangeHighEur: 6550,
  suggestedBuyPriceEur: 4212,
  suggestedSellPriceEur: 6480,
  demandLevel: 'high' as const,
  priceTrend: 'stable' as const,
  marketLiquidity: 'moderate' as const,
  recommendation: 'buy' as const,
  confidence: 0.7,
  marketSummary: 'Stable market with healthy resale demand.',
  keyInsights: ['Healthy demand in EU market'],
  riskFactors: ['Condition variance between listings'],
}

describe('SavedResearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes nullable optional fields before saving', async () => {
    mockCreate.mockImplementation(async (doc: Record<string, unknown>) => ({ id: 'saved-1', ...doc }))
    const service = new SavedResearchService()

    const saved = await service.save('user-1', {
      brand: 'Chanel',
      model: 'Classic Flap',
      category: 'Handbag',
      condition: 'good',
      starred: false,
      result: {
        ...baseResult,
        trendingScore: null,
        seasonalNotes: null,
        comparables: [
          {
            title: 'Chanel Classic Flap Medium',
            priceEur: 6480,
            source: 'Vestiaire Collective',
            sourceUrl: null,
            previewImageUrl: null,
            condition: 'good',
            daysListed: null,
            dataOrigin: null,
          },
        ],
      },
    })

    expect(saved.id).toBe('saved-1')
    expect(mockCreate).toHaveBeenCalledTimes(1)

    const createdDoc = mockCreate.mock.calls[0][0] as Record<string, unknown>
    expect(createdDoc.userId).toBe('user-1')
    expect(createdDoc.organisationId).toBe(DEFAULT_ORG_ID)

    const result = createdDoc.result as Record<string, unknown>
    expect(result.trendingScore).toBeUndefined()
    expect(result.seasonalNotes).toBeUndefined()

    const comparables = result.comparables as Array<Record<string, unknown>>
    expect(comparables).toHaveLength(1)
    expect(comparables[0].sourceUrl).toBeUndefined()
    expect(comparables[0].previewImageUrl).toBeUndefined()
    expect(comparables[0].daysListed).toBeUndefined()
    expect(comparables[0].dataOrigin).toBeUndefined()
  })

  it('rejects payloads with invalid required result fields', async () => {
    const service = new SavedResearchService()

    await expect(
      service.save('user-1', {
        brand: 'Chanel',
        model: 'Classic Flap',
        category: 'Handbag',
        condition: 'good',
        result: {
          ...baseResult,
          estimatedMarketValueEur: 'invalid-number',
          comparables: [],
        },
      })
    ).rejects.toBeInstanceOf(ZodError)

    expect(mockCreate).not.toHaveBeenCalled()
  })
})
