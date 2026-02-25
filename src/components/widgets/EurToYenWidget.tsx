/**
 * EUR ⇄ JPY calculator with live rate (Frankfurter API, no key required).
 * Direction is dynamic: EUR→JPY or JPY→EUR.
 * Optional: VITE_FX_API_URL for custom/proxy endpoint.
 */
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchEurToJpy, type FxResult } from '../../lib/fxRate'

type Direction = 'eur-to-jpy' | 'jpy-to-eur'

function formatJpy(value: number): string {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value)
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

export default function EurToYenWidget() {
  const [fx, setFx] = useState<FxResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [direction, setDirection] = useState<Direction>('eur-to-jpy')
  const [amountInput, setAmountInput] = useState('')

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

  const amount = (() => {
    const n = parseFloat(amountInput.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : 0
  })()
  const eurToJpyRate = fx?.rate ?? 0
  const jpyToEurRate = eurToJpyRate > 0 ? 1 / eurToJpyRate : 0
  const result = direction === 'eur-to-jpy'
    ? amount * eurToJpyRate
    : amount * jpyToEurRate

  const sourceLabel = direction === 'eur-to-jpy' ? 'Amount (€)' : 'Amount (¥)'
  const rateLine = direction === 'eur-to-jpy'
    ? <>1 EUR = <span className="font-mono font-medium text-lux-700">{eurToJpyRate.toLocaleString('en-GB', { maximumFractionDigits: 2 })}</span> JPY</>
    : <>1 JPY = <span className="font-mono font-medium text-lux-700">{jpyToEurRate.toLocaleString('en-GB', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}</span> EUR</>

  return (
    <div
      className="lux-card p-5 animate-bento-enter"
      style={{ '--stagger': 3 } as React.CSSProperties}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-amber-50 p-1.5 text-amber-600 border border-amber-100">
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-[13px] font-semibold text-lux-800">
              {direction === 'eur-to-jpy' ? 'EUR → JPY' : 'JPY → EUR'}
            </h3>
            <button
              type="button"
              onClick={() => setDirection((d) => (d === 'eur-to-jpy' ? 'jpy-to-eur' : 'eur-to-jpy'))}
              className="rounded px-1 py-0.5 text-[11px] font-medium text-amber-600 hover:bg-amber-50 transition-colors"
              title={direction === 'eur-to-jpy' ? 'Switch to JPY → EUR' : 'Switch to EUR → JPY'}
              aria-label="Toggle conversion direction"
            >
              ⇄
            </button>
          </div>
        </div>
        {fx && (
          <button
            type="button"
            onClick={() => loadRate(true)}
            disabled={refreshing}
            className="rounded-md p-1 text-lux-400 transition-colors hover:bg-lux-50 hover:text-lux-600 disabled:opacity-50"
            title="Refresh rate"
            aria-label="Refresh exchange rate"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {loading && !fx ? (
        <div className="space-y-2">
          <div className="h-9 rounded-lg bg-lux-200/60 animate-pulse" />
          <div className="text-[11px] text-lux-400">Loading live rate…</div>
        </div>
      ) : error && !fx ? (
        <div className="text-[13px] text-amber-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => loadRate()}
            className="mt-1.5 text-[11px] font-medium text-amber-600 hover:underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {fx && (
            <div className="mb-2 text-[11px] text-lux-500">
              {rateLine}
              <span className="ml-1 text-lux-400">· {fx.date}</span>
            </div>
          )}
          <div className="space-y-2">
            <div>
              <label htmlFor="eur-yen-input" className="block text-[11px] font-medium text-lux-500 mb-1">{sourceLabel}</label>
              <input
                id="eur-yen-input"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="lux-input text-right font-mono"
              />
            </div>
            {amount > 0 && fx && (
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-amber-600">≈</span>
                  <span className="text-base font-semibold font-mono text-amber-900">
                    {direction === 'eur-to-jpy' ? formatJpy(result) : formatEur(result)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
