import { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import SectionLabel from '../design-system/SectionLabel'
import { useFxRate } from '../../hooks/useFxRate'
import { formatEur, formatJpy } from '../../lib/formatters'

type Direction = 'eur-to-jpy' | 'jpy-to-eur'

export default function EurToYenWidget() {
  const { data: fx, isLoading: loading } = useFxRate()
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
    <div className="lux-card p-6 animate-bento-enter stagger-3">
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>Currency Converter</SectionLabel>
        <button
          type="button"
          onClick={() => setDirection((d) => (d === 'eur-to-jpy' ? 'jpy-to-eur' : 'eur-to-jpy'))}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-1.5 text-lux-400 transition-colors hover:bg-lux-100 hover:text-lux-600 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
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
      ) : (
        <>
          <div className="relative">
            <span className="absolute left-px top-1/2 -translate-y-1/2 text-lg font-medium text-lux-400">
              {currencySymbol}
            </span>
            <input
              id="eur-yen-input"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="lux-input h-12 pl-12 text-xl font-semibold font-mono text-lux-800"
            />
          </div>

          {fx && amount > 0 && (
            <div className="mt-4 rounded-[14px] bg-lux-50 px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-lux-400">
                  {resultLabel}
                </span>
                <span className="text-lg font-semibold font-mono text-lux-800">
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
