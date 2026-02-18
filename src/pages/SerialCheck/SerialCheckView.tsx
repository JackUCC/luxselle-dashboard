/**
 * Serial Number Check: paste serial + select brand to see decoded production year.
 * Helps inform purchasing decisions. Decoding is a guide only; authentication by an expert is recommended.
 */
import { useState, useCallback } from 'react'
import { Search, Calendar, Info } from 'lucide-react'
import { decodeSerialToYear, SERIAL_CHECK_BRANDS, type SerialCheckBrand, type DecodeResult } from '../../lib/serialDateDecoder'

export default function SerialCheckView() {
  const [serial, setSerial] = useState('')
  const [brand, setBrand] = useState<SerialCheckBrand>('Louis Vuitton')
  const [result, setResult] = useState<DecodeResult | null>(null)

  const handleDecode = useCallback(() => {
    const decoded = decodeSerialToYear(serial, brand)
    setResult(decoded)
  }, [serial, brand])

  const handleClear = useCallback(() => {
    setSerial('')
    setResult(null)
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-lux-800">
          Serial number check
        </h1>
        <p className="mt-1 text-sm text-lux-600">
          Paste the serial or date code and select the brand to see when the bag was likely made.
        </p>
      </div>

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
              className="lux-btn-primary flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Find year
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

      {result && (
        <div
          data-testid="decode-result"
          className={`rounded-2xl border p-6 shadow-sm ${
            result.success
              ? 'border-emerald-200 bg-emerald-50/60'
              : 'border-amber-200 bg-amber-50/60'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                result.success ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {result.success ? (
                <Calendar className="h-5 w-5" />
              ) : (
                <Info className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {result.success && result.year != null && (
                <p className="font-display text-xl font-semibold text-lux-800">
                  Year: {result.year}
                  {result.period ? ` · ${result.period}` : ''}
                </p>
              )}
              <p className="mt-1 text-sm text-gray-700">{result.message}</p>
              {result.note && (
                <p className="mt-2 text-xs text-lux-500">{result.note}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        This tool is a guide only. Date codes do not confirm authenticity; use a professional
        authenticator when in doubt.
      </p>
    </div>
  )
}
