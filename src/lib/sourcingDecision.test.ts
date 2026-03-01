import { describe, expect, it } from 'vitest'
import { deriveSourcingDecision } from './sourcingDecision'

describe('deriveSourcingDecision', () => {
  it('returns neutral when no usable pricing inputs exist', () => {
    const decision = deriveSourcingDecision({})
    expect(decision.tone).toBe('neutral')
    expect(decision.recommendedMaxPayEur).toBeNull()
    expect(decision.constrainedBy).toBe('none')
  })

  it('uses price-check max bid when serial context is absent', () => {
    const decision = deriveSourcingDecision({
      maxBidEur: 3200,
      maxBuyEur: 3420,
    })

    expect(decision.tone).toBe('good')
    expect(decision.recommendedMaxPayEur).toBe(3200)
    expect(decision.constrainedBy).toBe('price-check')
  })

  it('tightens recommendation when serial guidance is lower', () => {
    const decision = deriveSourcingDecision({
      maxBidEur: 3200,
      serialRecommendedMaxPayEur: 2400,
    })

    expect(decision.tone).toBe('caution')
    expect(decision.recommendedMaxPayEur).toBe(2400)
    expect(decision.constrainedBy).toBe('serial-check')
  })

  it('returns stop when serial guidance is far below market-only max bid', () => {
    const decision = deriveSourcingDecision({
      maxBidEur: 3200,
      serialRecommendedMaxPayEur: 1500,
    })

    expect(decision.tone).toBe('stop')
    expect(decision.recommendedMaxPayEur).toBe(1500)
    expect(decision.constrainedBy).toBe('serial-check')
  })

  it('ignores invalid or non-positive values', () => {
    const decision = deriveSourcingDecision({
      maxBidEur: Number.NaN,
      serialRecommendedMaxPayEur: 0,
      maxBuyEur: -200,
    })

    expect(decision.tone).toBe('neutral')
    expect(decision.recommendedMaxPayEur).toBeNull()
  })
})
