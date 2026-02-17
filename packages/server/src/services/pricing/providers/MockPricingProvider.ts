/** Mock pricing for tests and local dev; deterministic from brand/model/condition. @see docs/CODE_REFERENCE.md */
import type {
  IPricingProvider,
  PricingAnalysisInput,
  PricingAnalysisResult,
} from './IPricingProvider'

export class MockPricingProvider implements IPricingProvider {
  async analyse(input: PricingAnalysisInput): Promise<PricingAnalysisResult> {
    // Deterministic mock pricing based on input
    const basePrice = this.calculateBasePrice(input.brand, input.model)
    const conditionMultiplier = this.getConditionMultiplier(input.condition)
    const estimatedRetailEur = Math.round(basePrice * conditionMultiplier)

    // Mock comparables
    const comps = [
      {
        title: `${input.brand} ${input.model} - Similar`,
        price: Math.round(estimatedRetailEur * 0.95),
        source: 'Designer Exchange',
        sourceUrl: 'https://www.designerexchange.ie/',
        marketCountry: 'IE',
      },
      {
        title: `${input.brand} ${input.model} - Like New`,
        price: Math.round(estimatedRetailEur * 1.05),
        source: 'Luxury Exchange',
        sourceUrl: 'https://www.luxuryexchange.ie/',
        marketCountry: 'IE',
      },
      {
        title: `${input.brand} ${input.model} - ${input.condition}`,
        price: Math.round(estimatedRetailEur * 1.02),
        source: 'Vestiaire Collective',
        sourceUrl: 'https://www.vestiairecollective.com/',
        marketCountry: 'EU',
      },
      {
        title: `${input.brand} ${input.model} - Certified`,
        price: Math.round(estimatedRetailEur * 0.98),
        source: 'Siopella',
        sourceUrl: 'https://www.siopaella.com/',
        marketCountry: 'IE',
      },
    ]

    return {
      estimatedRetailEur,
      confidence: 0.7,
      comps,
    }
  }

  private calculateBasePrice(brand: string, model: string): number {
    // Simple hash-based pricing for deterministic results
    const str = `${brand}${model}`.toLowerCase()
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash = hash & hash
    }
    const basePrice = 1000 + (Math.abs(hash) % 9000)
    return basePrice
  }

  private getConditionMultiplier(condition: string): number {
    const multipliers: Record<string, number> = {
      new: 1.2,
      excellent: 1.1,
      good: 1.0,
      fair: 0.85,
      poor: 0.7,
    }
    return multipliers[condition.toLowerCase()] || 1.0
  }
}
