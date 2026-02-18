/**
 * EUR → JPY calculator with live rate (Frankfurter API, no key required).
 * Optional: VITE_FX_API_URL for custom/proxy endpoint.
 */
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchEurToJpy, type FxResult } from '../../lib/fxRate'

function formatJpy(value: number): string {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value)
}

export default function EurToYenWidget() {
  const [fx, setFx] = useState<FxResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eurInput, setEurInput] = useState('')

  const loadRate = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const result = await fetchEurToJpy()
      setFx(result)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load rate'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadRate()
  }, [loadRate])

  const eur = (() => {
    const n = parseFloat(eurInput.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : 0
  })()
  const jpy = fx ? eur * fx.rate : 0

  return (
    <div
      className="lux-card p-6 animate-bento-enter"
      style={{ '--stagger': 3 } as React.CSSProperties}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-amber-50 p-2 text-amber-600 border border-amber-100">
            <ArrowRight className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">EUR → JPY</h3>
        </div>
        {fx && (
          <button
            type="button"
            onClick={() => loadRate(true)}
            disabled={refreshing}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            title="Refresh rate"
            aria-label="Refresh exchange rate"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {loading && !fx ? (
        <div className="space-y-3">
          <div className="h-10 rounded-lg bg-gray-100 animate-pulse" />
          <div className="text-xs text-gray-400">Loading live rate…</div>
        </div>
      ) : error && !fx ? (
        <div className="text-sm text-amber-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => loadRate()}
            className="mt-2 text-xs font-medium text-amber-600 hover:underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {fx && (
            <div className="mb-3 text-xs text-gray-500">
              1 EUR = <span className="font-mono font-medium text-gray-700">{fx.rate.toLocaleString('en-GB', { maximumFractionDigits: 2 })}</span> JPY
              <span className="ml-1">· {fx.date}</span>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label htmlFor="eur-yen-input" className="block text-xs text-gray-500 mb-1">Amount (€)</label>
              <input
                id="eur-yen-input"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={eurInput}
                onChange={(e) => setEurInput(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-right font-mono text-gray-900 placeholder:text-gray-300 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            {eur > 0 && fx && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-amber-700">≈</span>
                  <span className="text-lg font-bold font-mono text-amber-900">{formatJpy(jpy)}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
