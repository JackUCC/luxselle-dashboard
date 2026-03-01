import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { Calendar, Info, Search } from 'lucide-react'
import { apiPost, ApiError } from '../../../lib/api'
import { formatCurrency } from '../../../lib/formatters'
import {
  decodeSerialToYear,
  SERIAL_CHECK_BRANDS,
  type DecodeResult,
  type SerialCheckBrand,
} from '../../../lib/serialDateDecoder'
import { calculateSerialPricingGuidance } from '../../../lib/serialValuation'
import type { SerialDecodeResult, SerialPricingGuidance } from '@shared/schemas'

interface PriceCheckResult {
  averageSellingPriceEur: number
  maxBuyEur: number
  maxBidEur: number
  comps: Array<{ title: string; price: number; source: string; sourceUrl?: string; previewImageUrl?: string }>
}

export default function SidecarSerialCheckWidget() {
  const [serial, setSerial] = useState('')
  const [brand, setBrand] = useState<SerialCheckBrand>('Louis Vuitton')
  const [description, setDescription] = useState('')
  const [result, setResult] = useState<DecodeResult | null>(null)
  const [guidance, setGuidance] = useState<SerialPricingGuidance | null>(null)
  const [hasTriedDecode, setHasTriedDecode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDecode = useCallback(async () => {
    const normalizedDescription = description.trim()
    if (!serial.trim()) {
      toast.error('Enter serial')
      return
    }
    setHasTriedDecode(true)
    setIsLoading(true)
    setGuidance(null)

    try {
      let decoded = decodeSerialToYear(serial, brand)
      if (decoded.precision === 'unknown' || decoded.confidence < 0.7) {
        try {
          const { data } = await apiPost<{ data: SerialDecodeResult }>('/ai/serial-decode', {
            serial,
            brand,
            ...(normalizedDescription ? { itemDescription: normalizedDescription } : {}),
          })
          decoded = data
        } catch {
          // keep local decode
        }
      }

      setResult(decoded)

      if (normalizedDescription) {
        const { data: market } = await apiPost<{ data: PriceCheckResult }>('/pricing/price-check', {
          query: normalizedDescription,
        })
        setGuidance(calculateSerialPricingGuidance({
          marketAverageEur: market.averageSellingPriceEur,
          decode: decoded,
        }))
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Decode failed'
      toast.error(message)
      setResult(decodeSerialToYear(serial, brand))
    } finally {
      setIsLoading(false)
    }
  }, [serial, brand, description])

  return (
    <div className="rounded-lg border border-lux-100 bg-white p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Search className="h-3.5 w-3.5 text-lux-500" />
        <p className="text-xs font-semibold text-lux-800">Serial check</p>
      </div>

      <div className="space-y-1.5">
        <input
          type="text"
          value={serial}
          onChange={(event) => setSerial(event.target.value)}
          placeholder="e.g. SR3179"
          className="w-full rounded border border-lux-200 px-2 py-1.5 text-xs text-lux-900 placeholder:text-lux-400 focus:border-lux-300 focus:outline-none"
        />
        <input
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Item description (optional, for pricing)"
          className="w-full rounded border border-lux-200 px-2 py-1.5 text-xs text-lux-900 placeholder:text-lux-400 focus:border-lux-300 focus:outline-none"
        />

        <div className="flex items-center gap-1.5">
          <select
            value={brand}
            onChange={(event) => setBrand(event.target.value as SerialCheckBrand)}
            aria-label="Select brand for serial decoding"
            title="Select brand"
            className="min-w-0 flex-1 rounded border border-lux-200 px-2 py-1.5 text-xs text-lux-900 focus:border-lux-300 focus:outline-none"
          >
            {SERIAL_CHECK_BRANDS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleDecode}
            disabled={serial.trim().length === 0 || isLoading}
            className="rounded bg-lux-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-lux-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            {isLoading ? 'Analyzing…' : 'Decode'}
          </button>
        </div>
      </div>

      {!hasTriedDecode && (
        <div className="mt-2 rounded-md border border-dashed border-lux-200 bg-lux-50/50 px-2 py-1.5 text-xs text-lux-500">
          Enter a serial and choose the brand to decode the likely year.
        </div>
      )}

      {result && hasTriedDecode && (
        <div
          className={`mt-2 rounded-md border px-2 py-1.5 text-xs ${
            result.success
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          <div className="flex items-start gap-1.5">
            {result.success ? (
              <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            <div className="min-w-0">
              {result.success && result.year != null && (
                <p className="font-semibold">Year: {result.year}{result.period ? ` · ${result.period}` : ''}</p>
              )}
              {result.productionWindow && (
                <p>Window: {result.productionWindow.startYear}-{result.productionWindow.endYear}</p>
              )}
              <p>Confidence: {Math.round(result.confidence * 100)}%</p>
              <p>{result.message}</p>
            </div>
          </div>
        </div>
      )}
      {result && !guidance && description.trim().length === 0 && (
        <div className="mt-2 rounded-md border border-lux-200 bg-lux-50 px-2 py-1.5 text-xs text-lux-600">
          Add an item description to get worth and max-pay guidance.
        </div>
      )}
      {guidance && (
        <div className="mt-2 rounded-md border border-lux-200 bg-lux-50 px-2 py-1.5 text-xs text-lux-900">
          <p className="font-semibold">Worth: {formatCurrency(guidance.estimatedWorthEur)}</p>
          <p>Max pay: {formatCurrency(guidance.recommendedMaxPayEur)}</p>
        </div>
      )}
    </div>
  )
}
