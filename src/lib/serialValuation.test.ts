import { describe, it, expect } from 'vitest'
import { calculateSerialPricingGuidance } from './serialValuation'
import type { SerialDecodeResult } from '@shared/schemas'

function buildDecode(overrides: Partial<SerialDecodeResult>): SerialDecodeResult {
  return {
    success: true,
    source: 'rule_based',
    precision: 'exact_year',
    confidence: 0.9,
    message: 'ok',
    rationale: [],
    uncertainties: [],
    ...overrides,
  }
}

describe('serialValuation', () => {
  it('adjusts worth and max pay using age and confidence', () => {
    const decode = buildDecode({
      year: 2015,
      productionWindow: { startYear: 2015, endYear: 2015 },
      confidence: 0.9,
    })

    const result = calculateSerialPricingGuidance({
      marketAverageEur: 3000,
      decode,
      nowYear: 2026,
    })

    expect(result.marketAverageEur).toBe(3000)
    expect(result.adjustment.ageYears).toBe(11)
    expect(result.adjustment.ageAdjustmentPct).toBe(-12)
    expect(result.adjustment.confidencePenaltyPct).toBeCloseTo(1.2)
    expect(result.adjustment.totalAdjustmentPct).toBeCloseTo(-13.2)
    expect(result.estimatedWorthEur).toBeGreaterThan(0)
    expect(result.recommendedMaxPayEur).toBeGreaterThan(0)
  })

  it('uses production window midpoint when exact year is unavailable', () => {
    const decode = buildDecode({
      precision: 'year_window',
      year: undefined,
      productionWindow: { startYear: 2018, endYear: 2020 },
      confidence: 0.7,
    })

    const result = calculateSerialPricingGuidance({
      marketAverageEur: 2500,
      decode,
      nowYear: 2026,
    })

    expect(result.adjustment.ageYears).toBe(7)
    expect(result.adjustment.ageAdjustmentPct).toBe(-7)
    expect(result.adjustment.confidencePenaltyPct).toBeCloseTo(3.6)
    expect(result.summary).toContain('Age-adjusted')
  })

  it('applies only confidence penalty when no year information exists', () => {
    const decode = buildDecode({
      success: false,
      precision: 'unknown',
      confidence: 0.4,
      year: undefined,
      productionWindow: undefined,
    })

    const result = calculateSerialPricingGuidance({
      marketAverageEur: 1800,
      decode,
      nowYear: 2026,
    })

    expect(result.adjustment.ageYears).toBe(0)
    expect(result.adjustment.ageAdjustmentPct).toBe(0)
    expect(result.adjustment.confidencePenaltyPct).toBeCloseTo(7.2)
    expect(result.summary).toContain('No reliable production year')
  })
})
