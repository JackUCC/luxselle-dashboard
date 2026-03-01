/**
 * Shared no-fabrication policy for AI-powered market/pricing extraction.
 * Every fallback path should prefer empty comparable evidence over invented values.
 */

export const NO_FABRICATION_RULE = 'Do NOT invent or fabricate any listing, price, or URL.'

export const NO_FABRICATION_FALLBACK_POLICY =
  'When evidence is missing, return empty comparables with zero/null pricing signals instead of guessed values.'

export function hasValidEvidenceSourceUrl(value?: string): boolean {
  if (!value) return false

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function keepEvidenceBackedComparables<T extends { sourceUrl?: string }>(
  comparables: T[],
): Array<T & { sourceUrl: string }> {
  return comparables.filter(
    (comparable): comparable is T & { sourceUrl: string } =>
      hasValidEvidenceSourceUrl(comparable.sourceUrl),
  )
}

export function buildEmptyComparableFallback<T>(): T[] {
  return []
}
