import { describe, expect, it } from 'vitest'
import { MarketResearchService } from './MarketResearchService'

describe('MarketResearchService comparable enrichment', () => {
  it('enriches comparables with annotation urls and preserves previewImageUrl through formatting', () => {
    const service = new MarketResearchService() as unknown as {
      enrichComparables: (comparables: unknown, annotations: Array<{ url: string; title: string }>) => unknown
      formatResult: (parsed: unknown, input: unknown, provider: string) => { comparables: Array<{ sourceUrl?: string; previewImageUrl?: string }> }
    }

    const parsed = {
      estimatedMarketValueEur: 4500,
      priceRangeLowEur: 4000,
      priceRangeHighEur: 5000,
      suggestedBuyPriceEur: 3200,
      suggestedSellPriceEur: 4500,
      demandLevel: 'high',
      priceTrend: 'stable',
      marketLiquidity: 'moderate',
      recommendation: 'buy',
      confidence: 0.8,
      marketSummary: 'Strong market',
      keyInsights: [],
      riskFactors: [],
      comparables: [
        {
          title: 'Chanel Classic Flap Medium',
          priceEur: 4700,
          source: 'Vestiaire Collective',
          condition: 'excellent',
          previewImageUrl: 'https://images.example.com/flap.jpg',
          dataOrigin: 'web_search',
        },
      ],
    }

    parsed.comparables = service.enrichComparables(parsed.comparables, [
      {
        title: 'Chanel Classic Flap Medium Caviar',
        url: 'https://vestiairecollective.com/items/123',
      },
    ]) as typeof parsed.comparables

    const result = service.formatResult(
      parsed,
      { brand: 'Chanel', model: 'Classic Flap' },
      'openai+web_search',
    )

    expect(result.comparables).toHaveLength(1)
    expect(result.comparables[0].sourceUrl).toBe('https://vestiairecollective.com/items/123')
    expect(result.comparables[0].previewImageUrl).toBe('https://images.example.com/flap.jpg')
  })

  it('builds degraded analysis with providerStatus unavailable', () => {
    const service = new MarketResearchService() as unknown as {
      buildDegradedAnalysis: (
        input: {
          brand: string
          model: string
          category: string
          condition: string
          currentAskPriceEur?: number
        },
        reason: string,
      ) => { providerStatus?: 'available' | 'unavailable' }
    }

    const result = service.buildDegradedAnalysis(
      {
        brand: 'Chanel',
        model: 'Classic Flap',
        category: 'Handbag',
        condition: 'excellent',
        currentAskPriceEur: 4200,
      },
      'No sufficient live search data found.',
    )

    expect(result.providerStatus).toBe('unavailable')
  })
})
