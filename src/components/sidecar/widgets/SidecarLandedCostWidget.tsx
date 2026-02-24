import { useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import { formatCurrency } from '../../../lib/formatters'

const AUCTION_PCT = 7
const CUSTOMS_PCT = 3
const VAT_PCT = 23

export default function SidecarLandedCostWidget() {
  const [bidInput, setBidInput] = useState('')

  const bid = useMemo(() => {
    const n = parseFloat(bidInput.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [bidInput])

  const landed = useMemo(() => {
    if (bid <= 0) return 0
    return bid * (1 + AUCTION_PCT / 100) * (1 + CUSTOMS_PCT / 100) * (1 + VAT_PCT / 100)
  }, [bid])

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Calculator className="h-3.5 w-3.5 text-gray-500" />
        <p className="text-xs font-semibold text-gray-800">Landed cost</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-500">Bid €</span>
        <input
          type="text"
          inputMode="decimal"
          value={bidInput}
          onChange={(event) => setBidInput(event.target.value)}
          placeholder="0"
          className="flex-1 rounded border border-gray-200 px-2 py-1 text-right text-sm font-mono text-gray-900 focus:border-indigo-300 focus:outline-none"
        />
      </div>
      <div className="mt-2 rounded-md bg-gray-50 px-2 py-1.5">
        <p className="text-[10px] text-gray-500">Estimated landed</p>
        <p className="text-sm font-semibold text-gray-900">{formatCurrency(landed)}</p>
      </div>
      <p className="mt-1 text-[10px] text-gray-500">+{AUCTION_PCT}% fee +{CUSTOMS_PCT}% customs +{VAT_PCT}% VAT</p>
    </div>
  )
}
