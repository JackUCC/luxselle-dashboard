import { describe, expect, it } from 'vitest'
import { NO_FABRICATION_RULE } from '../noFabrication'
import {
  buildPriceCheckExtractionPrompt,
} from './priceCheckPrompts'
import {
  buildPricingExtractionPrompt,
} from './pricingPrompts'
import {
  COMPETITOR_FEED_SYSTEM_PROMPT,
  buildMarketResearchExtractionPrompt,
} from './marketResearchPrompts'

describe('AI prompt builders', () => {
  it('price-check extraction prompt enforces source URLs, no-fabrication, and FX/market rules', () => {
    const prompt = buildPriceCheckExtractionPrompt({
      query: 'Chanel Classic Flap',
      refine: 'Excellent condition',
      queryContext: {
        canonicalDescription: 'Chanel Classic Flap Medium Caviar Black',
        keyAttributes: {
          brand: 'Chanel',
          style: 'Classic Flap',
          size: 'Medium',
          material: 'Caviar',
          colour: 'Black',
          hardware: 'GHW',
        },
        searchVariants: ['Chanel Classic Flap Medium', 'Chanel Timeless Classic Medium'],
        matchingCriteria: 'Match brand/style/size/colour/material',
      },
      hasSearchData: true,
      searchRawText: 'listing data',
      annotations: [{ title: 'Designer Exchange', url: 'https://designerexchange.ie/item/1' }],
      gbpToEur: 1.17,
      usdToEur: 0.92,
    })

    expect(prompt).toContain('sourceUrl')
    expect(prompt).toContain(NO_FABRICATION_RULE)
    expect(prompt).toContain('1 GBP = 1.17 EUR')
    expect(prompt).toContain('Prioritize Irish competitor sources first')
  })

  it('pricing extraction prompt enforces source URLs, no-fabrication, and FX/market rules', () => {
    const prompt = buildPricingExtractionPrompt({
      input: {
        brand: 'Hermès',
        model: 'Birkin 30',
        category: 'Handbag',
        condition: 'Excellent',
        colour: 'Black',
        notes: '',
      },
      marketCountry: 'IE',
      marketMode: 'ie_first_eu_fallback',
      hasSearchData: true,
      searchRawText: 'listing data',
      annotations: [{ title: 'Vestiaire', url: 'https://vestiairecollective.com/item/1' }],
      gbpToEur: 1.16,
      usdToEur: 0.93,
    })

    expect(prompt).toContain('sourceUrl')
    expect(prompt).toContain(NO_FABRICATION_RULE)
    expect(prompt).toContain('1 GBP = 1.16 EUR')
    expect(prompt).toContain('Prioritize Irish competitor sources first')
  })

  it('market-research prompts enforce source URLs and no-fabrication rules', () => {
    const extractionPrompt = buildMarketResearchExtractionPrompt({
      input: {
        brand: 'Dior',
        model: 'Lady Dior',
        category: 'Handbag',
        condition: 'Excellent',
      },
      searchContext: 'results and citations',
      gbpRate: 1.2,
      usdRate: 0.95,
      queryContext: {
        canonicalDescription: 'Dior Lady Dior Medium Cannage',
        searchVariants: ['Dior Lady Dior Medium', 'Dior Cannage Lady Dior'],
        matchingCriteria: 'Match style family and size',
        keyAttributes: {
          brand: 'Dior',
          style: 'Lady Dior',
          size: 'Medium',
          material: 'Lambskin',
          colour: 'Black',
        },
      },
    })

    expect(extractionPrompt).toContain('sourceUrl')
    expect(extractionPrompt).toContain(NO_FABRICATION_RULE)
    expect(extractionPrompt).toContain('1 GBP = 1.20 EUR')
    expect(COMPETITOR_FEED_SYSTEM_PROMPT).toContain(NO_FABRICATION_RULE)
  })
})
