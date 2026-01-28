/**
 * Convert USD to EUR using the given rate (used by pricing/import logic).
 */
export function usdToEur(usd: number, rateUsdToEur: number): number {
  return Number((usd * rateUsdToEur).toFixed(2))
}
