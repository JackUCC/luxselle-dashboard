/**
 * FX conversion: USD → EUR using the given rate.
 * Used by pricing service and supplier CSV import.
 * @see docs/CODE_REFERENCE.md
 */
export function usdToEur(usd: number, rateUsdToEur: number): number {
  return Number((usd * rateUsdToEur).toFixed(2))
}
