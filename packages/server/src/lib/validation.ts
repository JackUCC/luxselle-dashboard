/**
 * Shared validation utilities for AI output and API responses.
 * Used to clamp numeric fields and filter invalid comparables.
 */

const DEFAULT_PRICE_MIN = 0
const DEFAULT_PRICE_MAX = 500_000
const COMP_PRICE_MIN = 10
const COMP_PRICE_MAX = 500_000

/**
 * Clamp a number to [min, max]. Returns min if value is NaN or below min, max if above max.
 */
export function clamp(value: number, min: number, max: number): number {
  const n = Number(value)
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}

/**
 * Validate a price in EUR: clamp to [0, 500_000] by default.
 */
export function validatePriceEur(
  value: number,
  min: number = DEFAULT_PRICE_MIN,
  max: number = DEFAULT_PRICE_MAX,
): number {
  return Math.round(clamp(Number(value) || 0, min, max))
}

/**
 * Filter comparables to only those with valid price range (10..500_000 EUR).
 */
export function filterValidComps<T extends { price?: number }>(comps: T[]): T[] {
  if (!Array.isArray(comps)) return []
  return comps.filter(
    (c) =>
      typeof c === 'object' &&
      c != null &&
      typeof c.price === 'number' &&
      !Number.isNaN(c.price) &&
      c.price >= COMP_PRICE_MIN &&
      c.price <= COMP_PRICE_MAX,
  )
}

/**
 * Clamp confidence to [0, 1].
 */
export function clampConfidence(value: number): number {
  return clamp(Number(value) || 0, 0, 1)
}
