/**
 * Compact Serial Check widget for the Dashboard overview.
 * This widget is decode-first; detailed pricing context lives in /evaluate.
 */
import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { Search, Calendar, Info } from 'lucide-react'
import { apiPost, ApiError } from '../../lib/api'
import { decodeSerialToYear, SERIAL_CHECK_BRANDS, type SerialCheckBrand, type DecodeResult } from '../../lib/serialDateDecoder'
import type { SerialDecodeResult } from '@shared/schemas'
import SectionLabel from '../design-system/SectionLabel'

export default function SerialCheckWidget() {
  const [serial, setSerial] = useState('')
  const [brand, setBrand] = useState<SerialCheckBrand>('Louis Vuitton')
  const [result, setResult] = useState<DecodeResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleDecode = useCallback(async () => {
    if (!serial.trim()) { toast.error('Enter serial'); return }
    setIsLoading(true)
    try {
      let decoded = decodeSerialToYear(serial, brand)
      if (decoded.precision === 'unknown' || decoded.confidence < 0.7) {
        try {
          const { data } = await apiPost<{ data: SerialDecodeResult }>('/ai/serial-decode', {
            brand,
            serial,
          })
          decoded = data
        } catch { /* keep local result */ }
      }
      setResult(decoded)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Decode failed')
      setResult(decodeSerialToYear(serial, brand))
    } finally {
      setIsLoading(false)
    }
  }, [serial, brand])

  return (
    <div className="lux-card p-6 animate-bento-enter stagger-6">
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

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleDecode}
            disabled={isLoading}
            className="lux-btn-primary flex-1 flex items-center justify-center gap-1.5 h-10 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            <Search className="h-3.5 w-3.5" />
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
          <button
            type="button"
            onClick={() => { setSerial(''); setResult(null) }}
            className="text-xs font-medium text-lux-500 hover:text-lux-700 transition-colors px-3 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            Clear
          </button>
        </div>
      </div>

      <p className="text-xs text-lux-500">
        Need pricing context too?{' '}
        <Link
          to="/evaluate"
          className="font-medium text-lux-700 hover:text-lux-900 underline focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none rounded-sm"
        >
          Open Sourcing Intelligence
        </Link>
      </p>

      {result && (
        <div
          className={`mt-4 rounded-lux-card border px-3 py-2.5 text-xs ${
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
                <p className="text-xs opacity-90">Window: {result.productionWindow.startYear}-{result.productionWindow.endYear}</p>
              )}
              <p className="text-xs opacity-80 mt-0.5">{result.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
