/**
 * Compact Serial Check widget for the Dashboard overview. Paste serial + brand → see year.
 * Links to full Serial Check page for more detail.
 */
import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Search, Calendar, Info } from 'lucide-react'
import { apiPost, ApiError } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'
import { decodeSerialToYear, SERIAL_CHECK_BRANDS, type SerialCheckBrand, type DecodeResult } from '../../lib/serialDateDecoder'
import { calculateSerialPricingGuidance } from '../../lib/serialValuation'
import type { SerialDecodeResult, SerialPricingGuidance } from '@shared/schemas'
import SectionLabel from '../design-system/SectionLabel'

interface PriceCheckResult {
  averageSellingPriceEur: number
  maxBuyEur: number
  maxBidEur: number
  comps: Array<{ title: string; price: number; source: string; sourceUrl?: string }>
}

export default function SerialCheckWidget() {
  const [serial, setSerial] = useState('')
  const [brand, setBrand] = useState<SerialCheckBrand>('Louis Vuitton')
  const [description, setDescription] = useState('')
  const [result, setResult] = useState<DecodeResult | null>(null)
  const [guidance, setGuidance] = useState<SerialPricingGuidance | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleDecode = useCallback(async () => {
    const normalizedDescription = description.trim()
    if (!serial.trim()) { toast.error('Enter serial'); return }
    if (!normalizedDescription) { toast.error('Add item description'); return }
    setIsLoading(true)
    setGuidance(null)
    try {
      let decoded = decodeSerialToYear(serial, brand)
      if (decoded.precision === 'unknown' || decoded.confidence < 0.7) {
        try {
          const { data } = await apiPost<{ data: SerialDecodeResult }>('/ai/serial-decode', {
            brand, serial, itemDescription: normalizedDescription,
          })
          decoded = data
        } catch { /* keep local result */ }
      }
      const { data: market } = await apiPost<{ data: PriceCheckResult }>('/pricing/price-check', {
        query: normalizedDescription,
      })
      setResult(decoded)
      setGuidance(calculateSerialPricingGuidance({
        marketAverageEur: market.averageSellingPriceEur,
        decode: decoded,
      }))
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Decode failed')
      setResult(decodeSerialToYear(serial, brand))
    } finally {
      setIsLoading(false)
    }
  }, [serial, brand, description])

  return (
    <div
      className="lux-card p-6 animate-bento-enter"
      style={{ '--stagger': 6 } as React.CSSProperties}
    >
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>Serial Check</SectionLabel>
        <Search className="h-4 w-4 text-lux-400" />
      </div>

      <div className="space-y-3">
        <select
          id="widget-brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value as SerialCheckBrand)}
          className="lux-input"
          title="Select brand"
          aria-label="Select brand"
        >
          {SERIAL_CHECK_BRANDS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <input
          id="widget-serial"
          type="text"
          placeholder="e.g. SR3179 or 25xxxxxx"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          className="lux-input"
        />

        <input
          id="widget-description"
          type="text"
          placeholder="Item description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="lux-input hidden"
        />

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleDecode}
            disabled={isLoading}
            className="lux-btn-primary flex-1 flex items-center justify-center gap-1.5 h-10"
          >
            <Search className="h-3.5 w-3.5" />
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
          <button
            type="button"
            onClick={() => { setSerial(''); setResult(null); setGuidance(null) }}
            className="text-[13px] font-medium text-lux-500 hover:text-lux-700 transition-colors px-3"
          >
            Clear
          </button>
        </div>
      </div>

      {result && (
        <div
          className={`mt-4 rounded-xl border px-3 py-2.5 text-[13px] ${
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
                <p className="font-semibold">Year: {result.year}{result.period ? ` · ${result.period}` : ''}</p>
              )}
              {result.productionWindow && (
                <p className="text-[11px] opacity-90">Window: {result.productionWindow.startYear}-{result.productionWindow.endYear}</p>
              )}
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
