import type { SerialDecodeResult, SerialPricingGuidance } from '@shared/schemas'

export interface SerialValuationInput {
  marketAverageEur: number
  decode: SerialDecodeResult
  nowYear?: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundMoney(value: number): number {
  return Math.round(value)
}

function computeAnchorYear(decode: SerialDecodeResult): number | null {
  if (typeof decode.year === 'number') return decode.year
  if (decode.productionWindow) {
    return Math.round((decode.productionWindow.startYear + decode.productionWindow.endYear) / 2)
  }
  return null
}

function computeAgeAdjustmentPct(ageYears: number): number {
  if (ageYears <= 2) return 0
  if (ageYears <= 5) return -3
  if (ageYears <= 10) return -7
  if (ageYears <= 15) return -12
  if (ageYears <= 20) return -18
  return -25
}

export function calculateSerialPricingGuidance(input: SerialValuationInput): SerialPricingGuidance {
  const marketAverageEur = Math.max(0, input.marketAverageEur)
  const nowYear = input.nowYear ?? new Date().getFullYear()
  const anchorYear = computeAnchorYear(input.decode)
  const ageYears = anchorYear != null ? Math.max(0, nowYear - anchorYear) : 0

  const ageAdjustmentPct = anchorYear != null ? computeAgeAdjustmentPct(ageYears) : 0
  const confidencePenaltyPct = clamp((1 - input.decode.confidence) * 12, 0, 12)
  const totalAdjustmentPct = ageAdjustmentPct - confidencePenaltyPct

  const estimatedWorthEur = roundMoney(
    marketAverageEur * (1 + totalAdjustmentPct / 100),
  )
  const recommendedMaxPayEur = roundMoney(
    estimatedWorthEur / 1.23 * 0.8,
  )

  const summary = anchorYear == null
    ? 'No reliable production year was detected, so pricing stays close to market baseline with a confidence penalty.'
    : `Age-adjusted from market average using approx. ${ageYears} years old and decode confidence ${Math.round(input.decode.confidence * 100)}%.`

  return {
    marketAverageEur,
    estimatedWorthEur: Math.max(0, estimatedWorthEur),
    recommendedMaxPayEur: Math.max(0, recommendedMaxPayEur),
    adjustment: {
      ageYears,
      ageAdjustmentPct,
      confidencePenaltyPct,
      totalAdjustmentPct,
    },
    summary,
  }
}
