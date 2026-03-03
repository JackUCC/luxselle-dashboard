import { useState, useCallback } from 'react'
import { ArrowUpDown } from 'lucide-react'
import SectionLabel from '../design-system/SectionLabel'
import { useFxRate } from '../../hooks/useFxRate'
import { formatEur, formatJpy } from '../../lib/formatters'

type Direction = 'eur-to-jpy' | 'jpy-to-eur'

const EU_FLAG = '🇪🇺'
const JP_FLAG = '🇯🇵'

function formatSourceDisplay(amount: number, direction: Direction): string {
  if (direction === 'eur-to-jpy') {
    return amount.toLocaleString('en-GB', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }
  return amount.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function sourcePrefix(direction: Direction): string {
  return direction === 'eur-to-jpy' ? '€ ' : '¥ '
}

function formatRateDate(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T12:00:00Z')
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return isoDate
  }
}

export default function EurToYenWidget() {
  const { data: fx, isLoading: loading, error, refresh } = useFxRate()
  const [direction, setDirection] = useState<Direction>('eur-to-jpy')
  const [amountInput, setAmountInput] = useState('1000')
  const [inputFocused, setInputFocused] = useState(false)

  const amount = (() => {
    const n = parseFloat(amountInput.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : 0
  })()
  const eurToJpyRate = fx?.rate ?? 0
  const jpyToEurRate = eurToJpyRate > 0 ? 1 / eurToJpyRate : 0
  const result = direction === 'eur-to-jpy'
    ? amount * eurToJpyRate
    : amount * jpyToEurRate

  const displayValue = inputFocused
    ? amountInput
    : formatSourceDisplay(amount, direction)

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '')
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) setAmountInput(raw === '' ? '' : raw)
  }, [])

  const handleBlur = useCallback(() => {
    setInputFocused(false)
    const n = parseFloat(amountInput.replace(/,/g, ''))
    if (Number.isFinite(n) && n >= 0) setAmountInput(String(n))
  }, [amountInput])

  const rateLine =
    direction === 'eur-to-jpy'
      ? fx && `1 EUR = ${eurToJpyRate.toFixed(2)} JPY (Approx.)`
      : fx && `1 JPY = ${jpyToEurRate.toFixed(6)} EUR (Approx.)`

  const sourceLabel = direction === 'eur-to-jpy' ? 'Euro (€)' : 'Japanese Yen (¥)'
  const sourceFlag = direction === 'eur-to-jpy' ? EU_FLAG : JP_FLAG
  const targetLabel = direction === 'eur-to-jpy' ? 'Japanese Yen (¥)' : 'Euro (€)'
  const targetFlag = direction === 'eur-to-jpy' ? JP_FLAG : EU_FLAG
  const targetFormatted = direction === 'eur-to-jpy' ? formatJpy(result) : formatEur(result)

  return (
    <div className="lux-card p-6 h-full min-h-0 flex flex-col animate-bento-enter stagger-3">
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
          <div className="h-14 rounded-[14px] bg-lux-200/60 animate-pulse" />
          <div className="h-5 w-1/2 rounded bg-lux-200/60 animate-pulse mx-auto" />
          <div className="h-14 rounded-[14px] bg-lux-200/60 animate-pulse" />
        </div>
      ) : !fx ? (
        <div className="space-y-3 rounded-[14px] border border-lux-200 bg-lux-50 px-4 py-6 text-center">
          <p className="text-sm text-lux-600">Couldn&apos;t load rate</p>
          <p className="text-xs text-lux-500 mt-1">{error?.message ?? 'Network or server error'}</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="mt-3 rounded-lg bg-lux-200/80 px-4 py-2 text-sm font-medium text-lux-800 hover:bg-lux-200 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Source currency row (input) */}
          <div className="rounded-[14px] bg-lux-50 px-4 py-3 flex items-center gap-3">
            <span className="flex shrink-0 items-center gap-2" aria-hidden="true">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-lg shadow-sm">
                {sourceFlag}
              </span>
              <span className="text-sm font-medium text-lux-600">{sourceLabel}</span>
            </span>
            <div className="flex flex-1 items-center justify-end gap-0.5">
              <span className="text-xl font-semibold font-mono text-lux-800">
                {sourcePrefix(direction)}
              </span>
              <input
                id="eur-yen-input"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={displayValue}
                onChange={handleInputChange}
                onFocus={() => setInputFocused(true)}
                onBlur={handleBlur}
                aria-label={
                  direction === 'eur-to-jpy' ? 'Euro amount' : 'Japanese Yen amount'
                }
                className="lux-input h-10 min-w-0 flex-1 rounded-lg border-0 bg-transparent py-0 pl-0 pr-0 text-right text-xl font-semibold font-mono text-lux-800 focus:shadow-none focus-visible:ring-2 focus-visible:ring-lux-gold/20 focus-visible:ring-inset"
              />
            </div>
          </div>

          {/* Rate line */}
          {rateLine && (
            <div className="text-center">
              <p className="text-sm text-lux-400">{rateLine}</p>
              {fx?.date && (
                <p className="mt-0.5 text-xs text-lux-500">
                  Rate as of {formatRateDate(fx.date)}
                  {fx.source ? ` · ${fx.source}` : ''}
                </p>
              )}
            </div>
          )}

          {/* Target currency row (output) */}
          <div
            className="rounded-[14px] bg-lux-50 px-4 py-3 flex items-center gap-3"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="flex shrink-0 items-center gap-2" aria-hidden="true">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-lg shadow-sm">
                {targetFlag}
              </span>
              <span className="text-sm font-medium text-lux-600">{targetLabel}</span>
            </span>
            <span className="ml-auto text-xl font-semibold font-mono text-lux-800 tabular-nums">
              {targetFormatted}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
