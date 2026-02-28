import { useMemo, useState } from 'react'
import SectionLabel from '../design-system/SectionLabel'
import {
  DEFAULT_AUCTION_FEE_PCT,
  DEFAULT_CUSTOMS_PCT,
  DEFAULT_IMPORT_VAT_PCT
} from '../../lib/constants'

function formatEur(value: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

export default function LandedCostWidget() {
  const [bidInput, setBidInput] = useState('')

  const bid = useMemo(() => {
    const n = parseFloat(bidInput.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [bidInput])

  const landed = useMemo(() => {
    if (bid <= 0) return 0
    return bid * (1 + DEFAULT_AUCTION_FEE_PCT / 100) * (1 + DEFAULT_CUSTOMS_PCT / 100) * (1 + DEFAULT_IMPORT_VAT_PCT / 100)
  }, [bid])

  return (
    <div
      className="lux-card p-6 animate-bento-enter"
      style={{ '--stagger': 1 } as React.CSSProperties}
    >
      <SectionLabel className="mb-4">Landed Cost Calculator</SectionLabel>

      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-lux-400">
        Bid Price
      </label>
      <div className="relative">
        <span className="absolute left-px top-1/2 -translate-y-1/2 text-sm font-medium text-lux-400">
          €
        </span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={bidInput}
          onChange={(e) => setBidInput(e.target.value)}
          className="lux-input h-12 pl-8 text-xl font-semibold font-mono text-lux-800"
        />
      </div>

      <div className="mt-5 flex items-baseline justify-between border-t border-lux-200/60 pt-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-lux-400">
          Est. Landed
        </span>
        <span className="text-xl font-semibold font-mono text-lux-800">
          {formatEur(landed)}
        </span>
      </div>
    </div>
  )
}
