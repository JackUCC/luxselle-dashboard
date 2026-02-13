import { useEffect, useState } from 'react'
import { DollarSign, RefreshCw, TrendingUp } from 'lucide-react'

// Simple interface for the API response
interface ExchangeRates {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

// Targeted currencies and their flags/symbols
const TARGET_CURRENCIES = [
  { code: 'USD', symbol: '$', flag: '🇺🇸' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧' },
  { code: 'CNY', symbol: '¥', flag: '🇨🇳' },
]

export default function CurrencyWidget() {
  const [rates, setRates] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchRates = async () => {
    setLoading(true)
    setError(null)
    try {
      // Using Frankfurter API (free, no key required)
      const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CNY')
      if (!res.ok) throw new Error('Failed to fetch rates')
      const data: ExchangeRates = await res.json()
      setRates(data.rates)
      setLastUpdated(new Date())
    } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-gray-900 uppercase tracking-wider text-xs">Exchange Rates (Base: EUR)</h3>
        </div>
        <button 
          onClick={fetchRates} 
          disabled={loading}
          className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          title="Refresh rates"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center space-y-4">
        {error ? (
          <div className="text-center text-sm text-red-500 py-2 bg-red-50 rounded-lg">{error}</div>
        ) : loading && !rates ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg w-full"></div>
            ))}
          </div>
        ) : (
          TARGET_CURRENCIES.map((currency) => (
            <div key={currency.code} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-xl" role="img" aria-label={currency.code}>{currency.flag}</span>
                <div>
                  <div className="font-semibold text-gray-900">{currency.code}</div>
                  <div className="text-xs text-gray-400">1 EUR =</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900 font-mono">
                   {currency.symbol}{rates?.[currency.code]?.toFixed(4)}
                </div>
                {/* Mock trend indicator for visual flair */}
                <div className="text-[10px] items-center justify-end flex gap-1 text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>Live</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 text-[10px] text-gray-400 text-center">
        Data provided by Frankfurter API
        {lastUpdated && <span> • Updated {lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
      </div>
    </div>
  )
}
