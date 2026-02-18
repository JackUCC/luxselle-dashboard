import { useState, useMemo } from 'react'
import { Calculator } from 'lucide-react'

const AUCTION_PCT = 7
const CUSTOMS_PCT = 3
const VAT_PCT = 23

function formatEur(value: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

export default function LandedCostWidget() {
  const [bidInput, setBidInput] = useState('')

  const bid = useMemo(() => {
    const n = parseFloat(bidInput.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [bidInput])

  const { auctionFee, customs, vat, landed } = useMemo(() => {
    if (bid <= 0) return { auctionFee: 0, customs: 0, vat: 0, landed: 0 }
    const afterAuction = bid * (1 + AUCTION_PCT / 100)
    const afterCustoms = afterAuction * (1 + CUSTOMS_PCT / 100)
    const afterVat = afterCustoms * (1 + VAT_PCT / 100)
    return {
      auctionFee: afterAuction - bid,
      customs: afterCustoms - afterAuction,
      vat: afterVat - afterCustoms,
      landed: afterVat,
    }
  }, [bid])

  return (
    <div
      className="lux-card p-6 animate-bento-enter"
      style={{ '--stagger': 1 } as React.CSSProperties}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-xl bg-gray-100/80 p-2 text-lux-600">
          <Calculator className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-lux-800">Landed cost</h3>
      </div>
      <div className="space-y-3">
        <label className="block text-xs text-lux-600">Bid price (€)</label>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={bidInput}
          onChange={(e) => setBidInput(e.target.value)}
          className="lux-input text-right font-mono"
        />
      </div>
      {bid > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-lux-600">Landed price</span>
            <span className="text-xl font-bold font-mono text-lux-800">{formatEur(landed)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-lux-500">
            <span>+{AUCTION_PCT}% fee {formatEur(auctionFee)}</span>
            <span>+{CUSTOMS_PCT}% customs {formatEur(customs)}</span>
            <span>+{VAT_PCT}% VAT {formatEur(vat)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
