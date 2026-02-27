import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRightLeft, Loader2, RefreshCw } from 'lucide-react'
import { useFxRate } from '../../../hooks/useFxRate'

type Direction = 'eur-to-jpy' | 'jpy-to-eur'

function formatJpy(value: number): string {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value)
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

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
    <div className="rounded-lg border border-gray-100 bg-white p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ArrowRightLeft className="h-3.5 w-3.5 text-gray-500" />
          <p className="text-xs font-semibold text-gray-800">
            {direction === 'eur-to-jpy' ? 'EUR → JPY' : 'JPY → EUR'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDirection((current) => (current === 'eur-to-jpy' ? 'jpy-to-eur' : 'eur-to-jpy'))}
          disabled={!hasRate}
          className="rounded border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Flip
        </button>
      </div>

      {isLoading && !fx ? (
        <div className="space-y-2">
          <div className="h-8 animate-pulse rounded bg-gray-100" />
          <div className="h-10 animate-pulse rounded bg-gray-100" />
        </div>
      ) : errorMessage && !fx ? (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-2 text-[11px] text-amber-800">
          <p className="inline-flex items-start gap-1.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {errorMessage instanceof Error ? errorMessage.message : 'Failed to load FX rate'}
          </p>
          <button
            type="button"
            onClick={loadRate}
            className="rounded border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
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
              className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={loadRate}
              disabled={isLoading}
              className="inline-flex items-center rounded border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              aria-label="Refresh exchange rate"
              title="Refresh exchange rate"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </button>
          </div>

          <div className="mt-2 rounded-md bg-gray-50 px-2 py-1.5">
            <p className="text-[10px] text-gray-500">
              {direction === 'eur-to-jpy'
                ? `1 EUR = ${eurToJpyRate.toFixed(2)} JPY`
                : `1 JPY = ${jpyToEurRate.toFixed(5)} EUR`}
            </p>
            <p className="text-sm font-semibold text-gray-900">
              {direction === 'eur-to-jpy' ? formatJpy(converted) : formatEur(converted)}
            </p>
          </div>
          {amount <= 0 && (
            <p className="mt-1 text-[10px] text-gray-500">Enter an amount to calculate the conversion.</p>
          )}
          {errorMessage && fx && (
            <p className="mt-1 text-[10px] text-amber-700">Using last known rate while refresh failed.</p>
          )}
        </>
      )}
    </div>
  )
}
