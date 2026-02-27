import { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { formatEur, formatJpy } from '../../lib/formatters'
import { useFxRate } from '../../hooks/useFxRate'
import SectionLabel from '../design-system/SectionLabel'

type Direction = 'eur-to-jpy' | 'jpy-to-eur'

export default function EurToYenWidget() {
  const { fx, loading, error, retry } = useFxRate()
  const [direction, setDirection] = useState<Direction>('eur-to-jpy')
  const [amountInput, setAmountInput] = useState('1000')

  const amount = (() => {
    const n = parseFloat(amountInput.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : 0
  })()
  const eurToJpyRate = fx?.rate ?? 0
  const jpyToEurRate = eurToJpyRate > 0 ? 1 / eurToJpyRate : 0
  const result = direction === 'eur-to-jpy'
    ? amount * eurToJpyRate
    : amount * jpyToEurRate

  const currencySymbol = direction === 'eur-to-jpy' ? '€' : '¥'
  const resultLabel = direction === 'eur-to-jpy' ? 'Yen (¥)' : 'Euro (€)'

  return (
    <div
      className="lux-card p-6 animate-bento-enter"
      style={{ '--stagger': 3 } as React.CSSProperties}
    >
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>Currency Converter</SectionLabel>
        <button
          type="button"
          onClick={() => setDirection((d) => (d === 'eur-to-jpy' ? 'jpy-to-eur' : 'eur-to-jpy'))}
          className="rounded-md p-1.5 text-lux-400 transition-colors hover:bg-lux-100 hover:text-lux-600"
          aria-label="Swap currency direction"
        >
          <ArrowUpDown className="h-4 w-4" />
        </button>
      </div>

      {loading && !fx ? (
        <div className="space-y-3">
          <div className="h-12 rounded-lg bg-lux-200/60 animate-pulse" />
          <div className="h-5 w-1/2 rounded bg-lux-200/60 animate-pulse" />
        </div>
      ) : error && !fx ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void retry()}
            className="rounded border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] font-medium text-lux-400">
              {currencySymbol}
            </span>
            <input
              id="eur-yen-input"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="lux-input h-12 pl-9 text-[22px] font-semibold font-mono text-lux-800"
            />
          </div>

          {fx && amount > 0 && (
            <div className="mt-4 rounded-xl bg-lux-50 px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-lux-400">
                  {resultLabel}
                </span>
                <span className="text-[18px] font-semibold font-mono text-lux-800">
                  {direction === 'eur-to-jpy' ? formatJpy(result) : formatEur(result)}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
