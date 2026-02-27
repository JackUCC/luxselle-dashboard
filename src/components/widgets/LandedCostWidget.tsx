import { useState, useMemo } from 'react'
import { calculateSimpleLandedCost } from '../../lib/landedCost'
import { formatEur, parseNumericInput } from '../../lib/formatters'
import SectionLabel from '../design-system/SectionLabel'

export default function LandedCostWidget() {
  const [bidInput, setBidInput] = useState('')

  const bid = useMemo(() => parseNumericInput(bidInput), [bidInput])
  const landed = useMemo(() => calculateSimpleLandedCost(bid), [bid])

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
