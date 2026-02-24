import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowRightLeft, Loader2, RefreshCw } from 'lucide-react'
import { fetchEurToJpy, type FxResult } from '../../../lib/fxRate'

type Direction = 'eur-to-jpy' | 'jpy-to-eur'

function formatJpy(value: number): string {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value)
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

export default function SidecarFxWidget() {
  const [fx, setFx] = useState<FxResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [direction, setDirection] = useState<Direction>('eur-to-jpy')
  const [amountInput, setAmountInput] = useState('')

  const loadRate = async () => {
    setIsLoading(true)
    try {
      const next = await fetchEurToJpy()
      setFx(next)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load FX rate'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRate()
  }, [])

  const amount = useMemo(() => {
    const n = parseFloat(amountInput.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [amountInput])

  const eurToJpyRate = fx?.rate ?? 0
  const jpyToEurRate = eurToJpyRate > 0 ? 1 / eurToJpyRate : 0
  const converted = direction === 'eur-to-jpy' ? amount * eurToJpyRate : amount * jpyToEurRate
  const sourceLabel = direction === 'eur-to-jpy' ? 'Amount €' : 'Amount ¥'

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
          className="rounded border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
        >
          Flip
        </button>
      </div>

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
    </div>
  )
}
