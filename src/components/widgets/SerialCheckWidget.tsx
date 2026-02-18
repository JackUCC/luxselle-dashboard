/**
 * Compact Serial Check widget for the Dashboard overview. Paste serial + brand → see year.
 * Links to full Serial Check page for more detail.
 */
import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Calendar, Info, ExternalLink } from 'lucide-react'
import { decodeSerialToYear, SERIAL_CHECK_BRANDS, type SerialCheckBrand, type DecodeResult } from '../../lib/serialDateDecoder'

export default function SerialCheckWidget() {
  const [serial, setSerial] = useState('')
  const [brand, setBrand] = useState<SerialCheckBrand>('Louis Vuitton')
  const [result, setResult] = useState<DecodeResult | null>(null)

  const handleDecode = useCallback(() => {
    setResult(decodeSerialToYear(serial, brand))
  }, [serial, brand])

  return (
    <div
      className="lux-card p-6 animate-bento-enter"
      style={{ '--stagger': 2 } as React.CSSProperties}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-gray-100/80 p-2 text-lux-600">
            <Search className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-lux-800">Serial check</h3>
        </div>
        <Link
          to="/serial-check"
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          title="Open full Serial Check page"
        >
          Full page
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-3">
        <div>
          <label htmlFor="widget-serial" className="block text-xs text-lux-600 mb-1">Serial / date code</label>
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
          <label htmlFor="widget-brand" className="block text-xs text-lux-600 mb-1">Brand</label>
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
          className="lux-btn-primary w-full flex items-center justify-center gap-2 !py-2.5"
        >
          <Search className="h-3.5 w-3.5" />
          Find year
        </button>
      </div>
      {result && (
        <div
          className={`mt-4 rounded-xl border px-3 py-2.5 text-sm ${
            result.success
              ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800'
              : 'border-amber-200 bg-amber-50/80 text-amber-800'
          }`}
        >
          <div className="flex items-start gap-2">
            {result.success ? (
              <Calendar className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              {result.success && result.year != null && (
                <p className="font-semibold">Year: {result.year}{result.period ? ` · ${result.period}` : ''}</p>
              )}
              <p className="text-xs opacity-90 mt-0.5">{result.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
