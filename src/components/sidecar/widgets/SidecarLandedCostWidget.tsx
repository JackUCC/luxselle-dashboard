import { useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import { formatCurrency } from '../../../lib/formatters'
import {
  DEFAULT_AUCTION_FEE_PCT,
  DEFAULT_CUSTOMS_PCT,
  DEFAULT_IMPORT_VAT_PCT
} from '../../../lib/constants'

export default function SidecarLandedCostWidget() {
  const [bidInput, setBidInput] = useState('')

  const bid = useMemo(() => {
    const n = parseFloat(bidInput.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [bidInput])

  const landed = useMemo(() => {
    if (bid <= 0) return 0
    return bid * (1 + DEFAULT_AUCTION_FEE_PCT / 100) * (1 + DEFAULT_CUSTOMS_PCT / 100) * (1 + DEFAULT_IMPORT_VAT_PCT / 100)
  }, [bid])
  const hasBid = bid > 0

  return (
    <div className="rounded-lg border border-lux-100 bg-white p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Calculator className="h-3.5 w-3.5 text-lux-500" />
        <p className="text-xs font-semibold text-lux-800">Landed cost</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-lux-500">Bid €</span>
        <input
          type="text"
          inputMode="decimal"
          value={bidInput}
          onChange={(event) => setBidInput(event.target.value)}
          placeholder="0"
          className="flex-1 rounded border border-lux-200 px-2 py-1 text-right text-sm font-mono text-lux-900 focus:border-lux-300 focus:outline-none"
        />
      </div>
      {hasBid ? (
        <div className="mt-2 rounded-md bg-lux-50 px-2 py-1.5">
          <p className="text-xs text-lux-500">Estimated landed</p>
          <p className="text-sm font-semibold text-lux-900">{formatCurrency(landed)}</p>
        </div>
      ) : (
        <div className="mt-2 rounded-md border border-dashed border-lux-200 bg-lux-50/50 px-2 py-1.5">
          <p className="text-xs text-lux-500">Enter a bid price to see landed cost.</p>
        </div>
      )}
      <p className="mt-1 text-xs text-lux-500">+{DEFAULT_AUCTION_FEE_PCT}% fee +{DEFAULT_CUSTOMS_PCT}% customs +{DEFAULT_IMPORT_VAT_PCT}% VAT</p>
    </div>
  )
}
