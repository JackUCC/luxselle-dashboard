import { useMemo, useState } from 'react'
import { ArrowUpDown, Loader2 } from 'lucide-react'
import { calculateMaxBuyPrice } from '../../../lib/landedCost'
import { formatCurrency, formatJpy } from '../../../lib/formatters'
import { useFxRate } from '../../../hooks/useFxRate'
import {
  DEFAULT_AUCTION_FEE_PCT,
  DEFAULT_CUSTOMS_PCT,
  DEFAULT_IMPORT_VAT_PCT,
  DEFAULT_PAYMENT_FEE_PCT
} from '../../../lib/constants'

function parseNumber(value: string): number {
  const n = parseFloat(value.replace(/,/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export default function SidecarBidWidget() {
  const { data: fx, isLoading } = useFxRate()
  const [sellPriceInput, setSellPriceInput] = useState('')
  const [targetMarginInput, setTargetMarginInput] = useState('30')
  const [shippingInput, setShippingInput] = useState('0')

  const sellPriceEur = parseNumber(sellPriceInput)
  const targetMarginPct = parseNumber(targetMarginInput)
  const shippingJpy = parseNumber(shippingInput)

  const rate = fx?.rate ?? 160

  const maxBuyJpy = useMemo(() => {
    return calculateMaxBuyPrice({
      targetSellPriceEur: sellPriceEur,
      desiredMarginPct: targetMarginPct,
      currency: 'JPY',
      rates: { JPY: rate },
      shipping: shippingJpy,
      insurance: 0,
      customsPct: DEFAULT_CUSTOMS_PCT,
      importVatPct: DEFAULT_IMPORT_VAT_PCT,
      platformFeePct: DEFAULT_AUCTION_FEE_PCT,
      paymentFeePct: DEFAULT_PAYMENT_FEE_PCT,
      fixedFee: 0,
    })
  }, [sellPriceEur, targetMarginPct, shippingJpy, rate])

  const maxBuyEur = rate > 0 ? maxBuyJpy / rate : 0
  const hasSellPrice = sellPriceEur > 0
  const marginOutOfRange = targetMarginPct >= 100

  return (
    <div className="rounded-lg border border-lux-100 bg-white p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-lux-500" />
          <p className="text-xs font-semibold text-lux-800">Bid target</p>
        </div>
        {isLoading && <Loader2 className="h-3 w-3 animate-spin text-lux-400" />}
      </div>

      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <input
            type="text"
            inputMode="decimal"
            value={sellPriceInput}
            onChange={(event) => setSellPriceInput(event.target.value)}
            placeholder="Sell €"
            className="rounded border border-lux-200 px-2 py-1.5 text-xs text-lux-900 placeholder:text-lux-400 focus:border-lux-300 focus:outline-none"
          />
          <input
            type="text"
            inputMode="decimal"
            value={targetMarginInput}
            onChange={(event) => setTargetMarginInput(event.target.value)}
            placeholder="Margin %"
            className="rounded border border-lux-200 px-2 py-1.5 text-xs text-lux-900 placeholder:text-lux-400 focus:border-lux-300 focus:outline-none"
          />
        </div>
        <input
          type="text"
          inputMode="decimal"
          value={shippingInput}
          onChange={(event) => setShippingInput(event.target.value)}
          placeholder="Shipping ¥"
          className="w-full rounded border border-lux-200 px-2 py-1.5 text-xs text-lux-900 placeholder:text-lux-400 focus:border-lux-300 focus:outline-none"
        />
      </div>

      {!hasSellPrice ? (
        <div className="mt-2 rounded-md border border-dashed border-lux-200 bg-lux-50/50 px-2 py-1.5">
          <p className="text-xs text-lux-500">Enter a sell target to generate a max bid.</p>
        </div>
      ) : (
        <div className="mt-2 rounded-md bg-lux-50 px-2 py-1.5">
          <p className="text-xs text-lux-500">Suggested max buy (JPY)</p>
          <p className="text-sm font-semibold text-lux-900">{formatJpy(Math.max(0, maxBuyJpy))}</p>
          <p className="text-xs text-lux-500">~ {formatCurrency(Math.max(0, maxBuyEur))}</p>
        </div>
      )}
      {marginOutOfRange && (
        <p className="mt-1 text-xs text-amber-700">Target margin should stay below 100%.</p>
      )}
      <p className="mt-1 text-xs text-lux-500">Using quick profile: {DEFAULT_AUCTION_FEE_PCT}% fee, {DEFAULT_CUSTOMS_PCT}% customs, {DEFAULT_IMPORT_VAT_PCT}% VAT.</p>
    </div>
  )
}
