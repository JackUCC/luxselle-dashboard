import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRightLeft, Loader2, RefreshCw } from 'lucide-react'
import { useFxRate } from '../../../hooks/useFxRate'
import { formatEur, formatJpy } from '../../../lib/formatters'

type Direction = 'eur-to-jpy' | 'jpy-to-eur'

export default function SidecarFxWidget() {
  const { data: fx, isLoading, error: errorMessage, refresh: loadRate } = useFxRate()
  const [direction, setDirection] = useState<Direction>('eur-to-jpy')
  const [amountInput, setAmountInput] = useState('')

  const amount = useMemo(() => {
    const n = parseFloat(amountInput.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [amountInput])

  const eurToJpyRate = fx?.rate ?? 0
  const jpyToEurRate = eurToJpyRate > 0 ? 1 / eurToJpyRate : 0
  const converted = direction === 'eur-to-jpy' ? amount * eurToJpyRate : amount * jpyToEurRate
  const sourceLabel = direction === 'eur-to-jpy' ? 'Amount €' : 'Amount ¥'
  const hasRate = eurToJpyRate > 0

  return (
    <div className="rounded-lg border border-lux-100 bg-white p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ArrowRightLeft className="h-3.5 w-3.5 text-lux-500" />
          <p className="text-xs font-semibold text-lux-800">
            {direction === 'eur-to-jpy' ? 'EUR → JPY' : 'JPY → EUR'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDirection((current) => (current === 'eur-to-jpy' ? 'jpy-to-eur' : 'eur-to-jpy'))}
          disabled={!hasRate}
          className="rounded border border-lux-200 px-2 py-1 text-xs font-medium text-lux-600 hover:bg-lux-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
        >
          Flip
        </button>
      </div>

      {isLoading && !fx ? (
        <div className="space-y-2">
          <div className="h-8 animate-pulse rounded bg-lux-100" />
          <div className="h-10 animate-pulse rounded bg-lux-100" />
        </div>
      ) : errorMessage && !fx ? (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-2 text-xs text-amber-800">
          <p className="inline-flex items-start gap-1.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {errorMessage instanceof Error ? errorMessage.message : 'Failed to load FX rate'}
          </p>
          <button
            type="button"
            onClick={loadRate}
            className="rounded border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder={sourceLabel}
              className="min-w-0 flex-1 rounded border border-lux-200 px-2 py-1.5 text-sm font-mono text-lux-900 placeholder:text-lux-400 focus:border-lux-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={loadRate}
              disabled={isLoading}
              className="inline-flex items-center rounded border border-lux-200 p-1.5 text-lux-600 hover:bg-lux-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
              aria-label="Refresh exchange rate"
              title="Refresh exchange rate"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="mt-2 rounded-md bg-lux-50 px-2 py-1.5">
            <p className="text-xs text-lux-500">
              {direction === 'eur-to-jpy'
                ? `1 EUR = ${eurToJpyRate.toFixed(2)} JPY`
                : `1 JPY = ${jpyToEurRate.toFixed(5)} EUR`}
            </p>
            <p className="text-sm font-semibold text-lux-900">
              {direction === 'eur-to-jpy' ? formatJpy(converted) : formatEur(converted)}
            </p>
          </div>
          {amount <= 0 && (
            <p className="mt-1 text-xs text-lux-500">Enter an amount to calculate the conversion.</p>
          )}
          {errorMessage && fx && (
            <p className="mt-1 text-xs text-amber-700">Using last known rate while refresh failed.</p>
          )}
        </>
      )}
    </div>
  )
}
