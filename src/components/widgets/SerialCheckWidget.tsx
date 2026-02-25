/**
 * Compact Serial Check widget for the Dashboard overview. Paste serial + brand → see year.
 * Links to full Serial Check page for more detail.
 */
import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { Search, Calendar, Info, ExternalLink } from 'lucide-react'
import { apiPost, ApiError } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'
import { decodeSerialToYear, SERIAL_CHECK_BRANDS, type SerialCheckBrand, type DecodeResult } from '../../lib/serialDateDecoder'
import { calculateSerialPricingGuidance } from '../../lib/serialValuation'
import type { SerialDecodeResult, SerialPricingGuidance } from '@shared/schemas'

interface PriceCheckResult {
  averageSellingPriceEur: number
  maxBuyEur: number
  maxBidEur: number
  comps: Array<{ title: string; price: number; source: string; sourceUrl?: string }>
}

export default function SerialCheckWidget() {
  const [serial, setSerial] = useState('')
  const [brand, setBrand] = useState<SerialCheckBrand>('Louis Vuitton')
  const [result, setResult] = useState<DecodeResult | null>(null)
  const [description, setDescription] = useState('')
  const [guidance, setGuidance] = useState<SerialPricingGuidance | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleDecode = useCallback(async () => {
    const normalizedDescription = description.trim()
    if (!serial.trim()) {
      toast.error('Enter serial')
      return
    }
    if (!normalizedDescription) {
      toast.error('Add item description')
      return
    }
    setIsLoading(true)
    setGuidance(null)
    try {
      let decoded = decodeSerialToYear(serial, brand)
      if (decoded.precision === 'unknown' || decoded.confidence < 0.7) {
        try {
          const { data } = await apiPost<{ data: SerialDecodeResult }>('/ai/serial-decode', {
            brand,
            serial,
            itemDescription: normalizedDescription,
          })
          decoded = data
        } catch {
          // keep local result
        }
      }
      const { data: market } = await apiPost<{ data: PriceCheckResult }>('/pricing/price-check', {
        query: normalizedDescription,
      })
      const valuation = calculateSerialPricingGuidance({
        marketAverageEur: market.averageSellingPriceEur,
        decode: decoded,
      })
      setResult(decoded)
      setGuidance(valuation)
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Decode failed'
      toast.error(message)
      setResult(decodeSerialToYear(serial, brand))
    } finally {
      setIsLoading(false)
    }
  }, [serial, brand, description])

  return (
    <div
      className="lux-card p-5 animate-bento-enter"
      style={{ '--stagger': 2 } as React.CSSProperties}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-lux-50 p-1.5 text-lux-500 border border-lux-200/60">
            <Search className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-[13px] font-semibold text-lux-800">Serial check</h3>
        </div>
        <Link
          to="/serial-check"
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-lux-400 transition-colors hover:bg-lux-50 hover:text-lux-600"
          title="Open full Serial Check page"
        >
          Full page
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-2">
        <div>
          <label htmlFor="widget-serial" className="block text-[11px] font-medium text-lux-500 mb-1">Serial / date code</label>
          <input
            id="widget-serial"
            type="text"
            placeholder="e.g. SR3179"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            className="lux-input"
          />
        </div>
        <div>
          <label htmlFor="widget-description" className="block text-[11px] font-medium text-lux-500 mb-1">Item description</label>
          <input
            id="widget-description"
            type="text"
            placeholder="e.g. Chanel flap medium black"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="lux-input"
          />
        </div>
        <div>
          <label htmlFor="widget-brand" className="block text-[11px] font-medium text-lux-500 mb-1">Brand</label>
          <select
            id="widget-brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value as SerialCheckBrand)}
            className="lux-input"
          >
            {SERIAL_CHECK_BRANDS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleDecode}
          disabled={isLoading}
          className="lux-btn-primary w-full flex items-center justify-center gap-1.5"
        >
          <Search className="h-3.5 w-3.5" />
          {isLoading ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>
      {result && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-[13px] ${
            result.success
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          <div className="flex items-start gap-2">
            {result.success ? (
              <Calendar className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            ) : (
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              {result.success && result.year != null && (
                <p className="font-semibold text-[13px]">Year: {result.year}{result.period ? ` · ${result.period}` : ''}</p>
              )}
              {result.productionWindow && (
                <p className="text-[11px] opacity-90">Window: {result.productionWindow.startYear}-{result.productionWindow.endYear}</p>
              )}
              <p className="text-[11px] opacity-90">Confidence: {Math.round(result.confidence * 100)}%</p>
              <p className="text-[11px] opacity-80 mt-0.5">{result.message}</p>
            </div>
          </div>
        </div>
      )}
      {guidance && (
        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-2.5 text-xs text-indigo-900">
          <p className="font-semibold">Worth: {formatCurrency(guidance.estimatedWorthEur)}</p>
          <p>Max pay: {formatCurrency(guidance.recommendedMaxPayEur)}</p>
        </div>
      )}
    </div>
  )
}
