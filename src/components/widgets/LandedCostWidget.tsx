import { useEffect, useMemo, useState } from 'react'
import SectionLabel from '../design-system/SectionLabel'
import {
  DEFAULT_AUCTION_FEE_PCT,
  DEFAULT_CUSTOMS_PCT,
  DEFAULT_IMPORT_VAT_PCT
} from '../../lib/constants'

function formatEur(value: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

interface LandedCostWidgetProps {
  suggestedBid?: number | null
  suggestionLabel?: string
  stretch?: boolean
}

export default function LandedCostWidget({
  suggestedBid = null,
  suggestionLabel = 'Suggested bid target',
  stretch = false,
}: LandedCostWidgetProps) {
  const [bidInput, setBidInput] = useState('')

  const hasSuggestion = typeof suggestedBid === 'number' && Number.isFinite(suggestedBid) && suggestedBid > 0

  const bid = useMemo(() => {
    const n = parseFloat(bidInput.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [bidInput])

  const landed = useMemo(() => {
    if (bid <= 0) return 0
    return bid * (1 + DEFAULT_AUCTION_FEE_PCT / 100) * (1 + DEFAULT_CUSTOMS_PCT / 100) * (1 + DEFAULT_IMPORT_VAT_PCT / 100)
  }, [bid])

  useEffect(() => {
    if (!hasSuggestion) return
    setBidInput(Math.round(suggestedBid as number).toString())
  }, [hasSuggestion, suggestedBid])

  const layoutClass = stretch ? 'h-full min-h-0 flex flex-col' : 'self-start flex flex-col'
  return (
    <div className={`lux-card p-6 animate-bento-enter stagger-1 ${layoutClass}`}>
      <SectionLabel className="mb-4">Landed Cost Calculator</SectionLabel>

      <label className="mb-2 flex flex-col justify-end items-start text-[13px] font-semibold uppercase tracking-wider text-lux-800 font-system-ui">
        Bid Price
      </label>
      <div className="flex items-center rounded-lux-input border border-lux-200 bg-[#F5F5F7] h-12 overflow-hidden transition-[border-color,box-shadow] focus-within:border-lux-gold focus-within:shadow-[0_0_0_3px_rgba(184,134,11,0.2)]">
        <span className="pl-4 text-xl font-semibold font-mono text-lux-500 flex-shrink-0" aria-hidden>
          €
        </span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={bidInput}
          onChange={(e) => setBidInput(e.target.value)}
          className="flex-1 min-w-0 h-full border-0 bg-transparent pl-3 pr-4 text-xl font-semibold font-mono text-lux-800 placeholder:text-lux-400 focus:outline-none focus:ring-0"
        />
      </div>

      <div className="mt-5 flex items-baseline justify-between border-t border-lux-200/60 pt-4">
        <span className="text-[13px] font-semibold uppercase tracking-wider text-lux-800">
          Est. Landed
        </span>
        <span className="text-xl font-semibold font-mono text-lux-800">
          {formatEur(landed)}
        </span>
      </div>
      {hasSuggestion ? (
        <p className="mt-2 text-xs text-lux-500">
          {suggestionLabel}: {formatEur(suggestedBid as number)} (auto-filled)
        </p>
      ) : null}
    </div>
  )
}
