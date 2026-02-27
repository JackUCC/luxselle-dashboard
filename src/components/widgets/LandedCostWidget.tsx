import { useState, useMemo } from 'react'
import SectionLabel from '../design-system/SectionLabel'
import { AUCTION_PCT, computeLandedCost } from '../../lib/landedCost'

function formatEur(value: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

export default function LandedCostWidget() {
  const [bidInput, setBidInput] = useState('')

  const bid = useMemo(() => {
    const n = parseFloat(bidInput.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [bidInput])

  const landed = useMemo(() => computeLandedCost(bid), [bid])

  return (
    <div
      className="lux-card p-6 animate-bento-enter"
      style={{ '--stagger': 1 } as React.CSSProperties}
    >
      <SectionLabel className="mb-4">Landed Cost Calculator</SectionLabel>

      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-lux-400">
        Bid Price
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px] font-medium text-lux-400">
          €
        </span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={bidInput}
          onChange={(e) => setBidInput(e.target.value)}
          className="lux-input h-12 pl-8 text-[20px] font-semibold font-mono text-lux-800"
        />
      </div>

      <div className="mt-5 flex items-baseline justify-between border-t border-lux-200/60 pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-lux-400">
          Est. Landed
        </span>
        <span className="text-[20px] font-semibold font-mono text-lux-800">
          {formatEur(landed)}
        </span>
      </div>
    </div>
  )
}
