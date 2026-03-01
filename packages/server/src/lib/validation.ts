/**
 * Shared validation utilities for AI output and API responses.
 * Used to clamp numeric fields and filter invalid comparables.
 */

const DEFAULT_PRICE_MIN = 0
const DEFAULT_PRICE_MAX = 500_000
const COMP_PRICE_MIN = 50
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

/** Normalize URL for dedupe: protocol + hostname (no www) + pathname, no trailing slash. */
function normalizeUrlForDedupe(url?: string): string {
  if (!url?.trim()) return ''
  try {
    const u = new URL(url.trim())
    return `${u.protocol}//${u.hostname.toLowerCase().replace(/^www\./, '')}${u.pathname}`.replace(/\/$/, '')
  } catch {
    return url.trim().toLowerCase()
  }
}

/**
 * Dedupe comparables by normalized sourceUrl; keeps first occurrence.
 */
export function dedupeCompsBySourceUrl<T extends { sourceUrl?: string }>(comps: T[]): T[] {
  if (!Array.isArray(comps)) return []
  const seen = new Set<string>()
  return comps.filter((c) => {
    const key = normalizeUrlForDedupe(c.sourceUrl)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Filter comparables to those whose price lies in [median * lowMult, median * highMult].
 * If fewer than 3 comps, returns input unchanged.
 */
export function filterPriceOutliers<T extends { price: number }>(
  comps: T[],
  lowMult: number = 0.55,
  highMult: number = 1.9,
): T[] {
  if (!Array.isArray(comps) || comps.length < 3) return comps
  const prices = comps.map((c) => c.price).filter((p) => typeof p === 'number' && !Number.isNaN(p))
  if (prices.length < 3) return comps
  const sorted = [...prices].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
  const low = median * lowMult
  const high = median * highMult
  return comps.filter((c) => c.price >= low && c.price <= high)
}
