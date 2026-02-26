/**
 * Serial Number Check: paste serial + select brand to see decoded production year.
 * Helps inform purchasing decisions. Decoding is a guide only; authentication by an expert is recommended.
 */
import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Search, Calendar, Info, Loader2 } from 'lucide-react'
import { apiPost, ApiError } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'
import { decodeSerialToYear, SERIAL_CHECK_BRANDS, type SerialCheckBrand, type DecodeResult } from '../../lib/serialDateDecoder'
import { PageHeader } from '../../components/design-system'
import { calculateSerialPricingGuidance } from '../../lib/serialValuation'
import type { SerialDecodeResult, SerialPricingGuidance } from '@shared/schemas'

interface PriceCheckComp {
  title: string
  price: number
  source: string
  sourceUrl?: string
}

interface PriceCheckResult {
  averageSellingPriceEur: number
  comps: PriceCheckComp[]
  maxBuyEur: number
  maxBidEur: number
}

export default function SerialCheckView() {
  const [serial, setSerial] = useState('')
  const [brand, setBrand] = useState<SerialCheckBrand>('Louis Vuitton')
  const [description, setDescription] = useState('')
  const [decodeResult, setDecodeResult] = useState<DecodeResult | null>(null)
  const [pricingGuidance, setPricingGuidance] = useState<SerialPricingGuidance | null>(null)
  const [marketResult, setMarketResult] = useState<PriceCheckResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleDecode = useCallback(async () => {
    const normalizedDescription = description.trim()
    if (!serial.trim()) {
      toast.error('Enter a serial / date code first')
      return
    }
    if (!normalizedDescription) {
      toast.error('Enter an item description to estimate worth and max pay')
      return
    }

    setIsLoading(true)
    setDecodeResult(null)
    setPricingGuidance(null)
    setMarketResult(null)

    try {
      let decoded = decodeSerialToYear(serial, brand)

      if (decoded.source === 'rule_based' && (decoded.precision === 'unknown' || decoded.confidence < 0.7)) {
        try {
          const { data } = await apiPost<{ data: SerialDecodeResult }>('/ai/serial-decode', {
            serial,
            brand,
            itemDescription: normalizedDescription,
          })
          decoded = data
        } catch {
          // Keep local decode when heuristic decode fails.
        }
      }

      const { data: marketData } = await apiPost<{ data: PriceCheckResult }>('/pricing/price-check', {
        query: normalizedDescription,
      })

      const guidance = calculateSerialPricingGuidance({
        marketAverageEur: marketData.averageSellingPriceEur,
        decode: decoded,
      })

      setDecodeResult(decoded)
      setMarketResult(marketData)
      setPricingGuidance(guidance)
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not run serial analysis'
      toast.error(message)
      setDecodeResult(decodeSerialToYear(serial, brand))
    } finally {
      setIsLoading(false)
    }
  }, [serial, brand, description])

  const handleClear = useCallback(() => {
    setSerial('')
    setDescription('')
    setDecodeResult(null)
    setPricingGuidance(null)
    setMarketResult(null)
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Serial Check"
        purpose="Paste serial, select brand, and add item details to get a tighter decode plus age-adjusted price guidance."
      />

      <div className="lux-card p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="serial-input" className="block text-sm font-medium text-gray-700 mb-1.5">
              Serial / date code
            </label>
            <textarea
              id="serial-input"
              data-testid="serial-input"
              rows={2}
              className="lux-input"
              placeholder="e.g. SR3179 or 25xxxxxx"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="description-input" className="block text-sm font-medium text-gray-700 mb-1.5">
              Item description (for market lookup)
            </label>
            <textarea
              id="description-input"
              rows={2}
              className="lux-input"
              placeholder="e.g. Chanel Classic Flap Medium black caviar"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="brand-select" className="block text-sm font-medium text-gray-700 mb-1.5">
              Brand
            </label>
            <select
              id="brand-select"
              data-testid="brand-select"
              className="lux-input"
              value={brand}
              onChange={(e) => setBrand(e.target.value as SerialCheckBrand)}
            >
              {SERIAL_CHECK_BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              data-testid="decode-btn"
              onClick={handleDecode}
              disabled={isLoading}
              className="lux-btn-primary flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isLoading ? 'Analyzing…' : 'Analyze serial'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="lux-btn-secondary flex items-center gap-2"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {!decodeResult && !isLoading && (
        <div className="lux-card border-dashed border-2 min-h-[120px] flex flex-col items-center justify-center p-6 text-center">
          <Search className="h-10 w-10 mb-3 opacity-30 text-lux-500" />
          <p className="text-sm text-lux-600">Enter a serial and item description, then click <strong>Analyze serial</strong> to see decode and price guidance.</p>
        </div>
      )}

      {decodeResult && (
        <div
          data-testid="decode-result"
          className={`rounded-2xl border p-6 shadow-sm ${
            decodeResult.success
              ? 'border-emerald-200 bg-emerald-50/60'
              : 'border-amber-200 bg-amber-50/60'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                decodeResult.success ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {decodeResult.success ? (
                <Calendar className="h-5 w-5" />
              ) : (
                <Info className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {decodeResult.success && decodeResult.year != null && (
                <p className="font-display text-xl font-semibold text-lux-800">
                  Year: {decodeResult.year}
                  {decodeResult.period ? ` · ${decodeResult.period}` : ''}
                </p>
              )}
              {decodeResult.productionWindow && (
                <p className="mt-1 text-sm text-gray-700">
                  Production window: {decodeResult.productionWindow.startYear} - {decodeResult.productionWindow.endYear}
                </p>
              )}
              <p className="mt-1 text-sm text-gray-700">{decodeResult.message}</p>
              <p className="mt-1 text-xs text-gray-600">
                Confidence: {Math.round(decodeResult.confidence * 100)}% · Source: {decodeResult.source === 'rule_based' ? 'Rule based' : 'AI heuristic'}
              </p>
              {decodeResult.note && <p className="mt-2 text-xs text-lux-500">{decodeResult.note}</p>}
            </div>
          </div>
        </div>
      )}

      {pricingGuidance && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-lux-800">Price guidance</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-indigo-100 bg-white p-3">
              <p className="text-xs text-lux-500 uppercase tracking-wide">Market average</p>
              <p className="mt-1 text-lg font-semibold text-lux-800">{formatCurrency(pricingGuidance.marketAverageEur)}</p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-white p-3">
              <p className="text-xs text-lux-500 uppercase tracking-wide">Estimated worth</p>
              <p className="mt-1 text-lg font-semibold text-lux-800">{formatCurrency(pricingGuidance.estimatedWorthEur)}</p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-white p-3">
              <p className="text-xs text-lux-500 uppercase tracking-wide">Recommended max pay</p>
              <p className="mt-1 text-lg font-semibold text-lux-800">{formatCurrency(pricingGuidance.recommendedMaxPayEur)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-700">{pricingGuidance.summary}</p>
          <p className="mt-1 text-xs text-gray-600">
            Adjustment: age {pricingGuidance.adjustment.ageAdjustmentPct}% · confidence penalty -{pricingGuidance.adjustment.confidencePenaltyPct.toFixed(1)}%
          </p>
          {marketResult && marketResult.comps.length > 0 && (
            <p className="mt-1 text-xs text-gray-600">
              Based on {marketResult.comps.length} market comparables.
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        This tool is a guide only. Date codes do not confirm authenticity; use a professional
        authenticator when in doubt.
      </p>
    </div>
  )
}
