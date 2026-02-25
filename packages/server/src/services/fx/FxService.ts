/**
 * Live FX rates from Frankfurter (base EUR). In-memory cache with 1h TTL.
 * Used for prompt injection (GBP/USD → EUR) and optional API for frontend.
 */
const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?base=EUR'
const TTL_MS = 3600_000 // 1 hour

export interface FxRates {
  /** Amount of foreign currency per 1 EUR (e.g. rates.USD = 1.08 means 1 EUR = 1.08 USD) */
  rates: Record<string, number>
  fetchedAt: number
}

const DEFAULT_RATES: Record<string, number> = {
  USD: 1.08,
  GBP: 0.85,
  JPY: 165,
}

export class FxService {
  private cache: FxRates | null = null

  private isStale(): boolean {
    return !this.cache || Date.now() - this.cache.fetchedAt > TTL_MS
  }

  /**
   * Fetch and cache rates from Frankfurter (base EUR).
   * On failure returns default rates and does not throw.
   */
  async refresh(): Promise<FxRates> {
    try {
      const res = await fetch(FRANKFURTER_URL)
      if (!res.ok) throw new Error(`Fx fetch ${res.status}`)
      const data = (await res.json()) as { rates?: Record<string, number> }
      const rates = data.rates ?? DEFAULT_RATES
      this.cache = { rates, fetchedAt: Date.now() }
      return this.cache
    } catch {
      this.cache = { rates: { ...DEFAULT_RATES }, fetchedAt: Date.now() }
      return this.cache
    }
  }

  /**
   * Get cached rates, refreshing if stale. Returns rates as "per 1 EUR".
   */
  async getRates(): Promise<Record<string, number>> {
    if (this.isStale()) await this.refresh()
    return this.cache!.rates
  }

  /**
   * Get conversion rate: 1 unit of `from` = returned number of `to`.
   * E.g. getRate('GBP', 'EUR') => 1.17 (1 GBP = 1.17 EUR).
   */
  async getRate(from: string, to: string): Promise<number> {
    const rates = await this.getRates()
    if (to.toUpperCase() === 'EUR') {
      const perEur = rates[from.toUpperCase()]
      if (perEur == null || perEur <= 0) return from.toUpperCase() === 'EUR' ? 1 : 0
      return 1 / perEur
    }
    if (from.toUpperCase() === 'EUR') {
      return rates[to.toUpperCase()] ?? 0
    }
    const fromPerEur = rates[from.toUpperCase()]
    const toPerEur = rates[to.toUpperCase()]
    if (fromPerEur == null || toPerEur == null || fromPerEur <= 0) return 0
    return toPerEur / fromPerEur
  }

  /**
   * Get rates in "per 1 EUR" form for frontend (same as Frankfurter from=EUR).
   */
  async getRatesPerEur(): Promise<Record<string, number>> {
    return this.getRates()
  }
}

let defaultInstance: FxService | null = null

export function getFxService(): FxService {
  if (!defaultInstance) defaultInstance = new FxService()
  return defaultInstance
}
