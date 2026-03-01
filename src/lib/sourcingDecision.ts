export type DecisionTone = 'neutral' | 'good' | 'caution' | 'stop'

export interface SourcingDecisionInput {
  maxBidEur?: number | null
  maxBuyEur?: number | null
  serialRecommendedMaxPayEur?: number | null
}

export interface SourcingDecision {
  tone: DecisionTone
  recommendedMaxPayEur: number | null
  constrainedBy: 'none' | 'price-check' | 'serial-check'
  summary: string
  notes: string[]
}

function toPositiveNumber(value: number | null | undefined): number | null {
  if (typeof value !== 'number') return null
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

export function deriveSourcingDecision(input: SourcingDecisionInput): SourcingDecision {
  const maxBid = toPositiveNumber(input.maxBidEur)
  const maxBuy = toPositiveNumber(input.maxBuyEur)
  const serialMaxPay = toPositiveNumber(input.serialRecommendedMaxPayEur)

  if (!maxBid && !serialMaxPay) {
    return {
      tone: 'neutral',
      recommendedMaxPayEur: null,
      constrainedBy: 'none',
      summary: 'Run a market price check to generate a decision target.',
      notes: [],
    }
  }

  if (maxBid && !serialMaxPay) {
    return {
      tone: 'good',
      recommendedMaxPayEur: maxBid,
      constrainedBy: 'price-check',
      summary: 'Price-check target is ready. Serial context is optional.',
      notes: maxBuy ? [`Max buy before auction fee: EUR ${Math.round(maxBuy)}`] : [],
    }
  }

  if (!maxBid && serialMaxPay) {
    return {
      tone: 'caution',
      recommendedMaxPayEur: serialMaxPay,
      constrainedBy: 'serial-check',
      summary: 'Serial context is available, but market check is missing.',
      notes: ['Run price check to validate against live comparables.'],
    }
  }

  const combinedTarget = Math.min(maxBid as number, serialMaxPay as number)
  const constrainedBy = combinedTarget === (serialMaxPay as number) ? 'serial-check' : 'price-check'
  const ratio = combinedTarget / (maxBid as number)

  if (ratio < 0.55) {
    return {
      tone: 'stop',
      recommendedMaxPayEur: combinedTarget,
      constrainedBy,
      summary: 'Serial age/confidence materially reduces safe buy range.',
      notes: ['Only proceed if condition is exceptional and liquidity is high.'],
    }
  }

  if (ratio < 0.85) {
    return {
      tone: 'caution',
      recommendedMaxPayEur: combinedTarget,
      constrainedBy,
      summary: 'Use the tighter serial-adjusted ceiling for safer margin protection.',
      notes: ['Serial context is more conservative than market-only pricing.'],
    }
  }

  return {
    tone: 'good',
    recommendedMaxPayEur: combinedTarget,
    constrainedBy,
    summary: 'Market and serial signals are aligned. Use this as your max pay target.',
    notes: [],
  }
}
