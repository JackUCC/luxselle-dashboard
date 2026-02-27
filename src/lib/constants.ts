/**
 * Shared constants for simple landed-cost and bid calculators (Dashboard and Sidecar widgets).
 */

export const AUCTION_PCT = 7
export const CUSTOMS_PCT = 3
export const VAT_PCT = 23

/**
 * Simple landed cost from bid (EUR): bid × (1 + auction%) × (1 + customs%) × (1 + vat%).
 */
export function computeSimpleLandedCost(
  bidEur: number,
  auctionPct: number = AUCTION_PCT,
  customsPct: number = CUSTOMS_PCT,
  vatPct: number = VAT_PCT
): number {
  if (bidEur <= 0) return 0
  return bidEur * (1 + auctionPct / 100) * (1 + customsPct / 100) * (1 + vatPct / 100)
}
