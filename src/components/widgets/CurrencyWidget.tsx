import { useEffect, useState } from 'react'
import { DollarSign, RefreshCw, TrendingUp } from 'lucide-react'

interface ExchangeRates {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

const TARGET_CURRENCIES = [
  { code: 'USD', symbol: '$', flag: '🇺🇸', color: 'text-emerald-400' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', color: 'text-blue-400' },
  { code: 'CNY', symbol: '¥', flag: '🇨🇳', color: 'text-rose-400' },
]

// Mock sparkline data for visual appeal
const MOCK_SPARKLINES: Record<string, number[]> = {
  USD: [1.08, 1.09, 1.085, 1.092, 1.088, 1.095, 1.091],
  GBP: [0.86, 0.855, 0.858, 0.862, 0.859, 0.864, 0.861],
  CNY: [7.85, 7.82, 7.88, 7.86, 7.90, 7.87, 7.89],
}

function TinySparkline({ data, color }: { data: number[]; color: string }) {
  const width = 48
  const height = 16
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function CurrencyWidget() {
  const [rates, setRates] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchRates = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CNY')
      if (!res.ok) throw new Error('Failed to fetch rates')
      const data: ExchangeRates = await res.json()
      setRates(data.rates)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRates()
  }, [])

  return (
    <div className="lux-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-blue-500/10 p-2 text-blue-400 border border-blue-500/20">
            <DollarSign className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-gray-200 uppercase tracking-wider text-xs">Exchange Rates</h3>
        </div>
        <button
          onClick={fetchRates}
          disabled={loading}
          className="text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-50"
          title="Refresh rates"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-3">
        {error ? (
          <div className="text-center text-sm text-rose-400 py-2 bg-rose-500/10 rounded-xl border border-rose-500/20">{error}</div>
        ) : loading && !rates ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-white/[0.04] rounded-xl w-full" />
            ))}
          </div>
        ) : (
          TARGET_CURRENCIES.map((currency) => (
            <div key={currency.code} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all">
              <div className="flex items-center gap-3">
                <span className="text-xl" role="img" aria-label={currency.code}>{currency.flag}</span>
                <div>
                  <div className="font-semibold text-gray-200 text-sm">{currency.code}</div>
                  <div className="text-[10px] text-gray-500">1 EUR =</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TinySparkline data={MOCK_SPARKLINES[currency.code] || []} color={currency.color.replace('text-', '').includes('emerald') ? '#34D399' : currency.color.includes('blue') ? '#60A5FA' : '#FB7185'} />
                <div className="text-right">
                  <div className="font-bold text-gray-100 font-mono">
                    {currency.symbol}{rates?.[currency.code]?.toFixed(4)}
                  </div>
                  <div className="text-[10px] items-center justify-end flex gap-1 text-emerald-400">
                    <TrendingUp className="h-3 w-3" />
                    <span>Live</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/[0.06] text-[10px] text-gray-600 text-center">
        Frankfurter API
        {lastUpdated && <span> • {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
      </div>
    </div>
  )
}
