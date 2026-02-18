/**
 * Live EUR → JPY rate. Uses Frankfurter (no API key, CORS-friendly).
 * Optional: set VITE_FX_API_URL to proxy or use another provider (expects { rates: { JPY: number } } or { data: { rate: number } }).
 */

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest?symbols=JPY'

export interface FxResult {
  rate: number
  date: string
  source: string
}

export async function fetchEurToJpy(): Promise<FxResult> {
  const url = import.meta.env.VITE_FX_API_URL || FRANKFURTER_URL
  const res = await fetch(url)
  if (!res.ok) throw new Error(`FX API error: ${res.status}`)
  const data = (await res.json()) as { rates?: { JPY?: number }; date?: string; data?: { rate?: number } }
  const rate = data.rates?.JPY ?? data.data?.rate
  if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid FX rate')
  return {
    rate,
    date: data.date ?? new Date().toISOString().slice(0, 10),
    source: url.includes('frankfurter') ? 'Frankfurter' : 'Custom',
  }
}
