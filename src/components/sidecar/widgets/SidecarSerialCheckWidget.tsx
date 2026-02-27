import { Calendar, Info, Search } from 'lucide-react'
import { formatCurrency } from '../../../lib/formatters'
import { SERIAL_CHECK_BRANDS } from '../../../lib/serialDateDecoder'
import { useSerialDecode } from '../../../hooks/useSerialDecode'

export default function SidecarSerialCheckWidget() {
  const {
    serial,
    setSerial,
    brand,
    setBrand,
    description,
    setDescription,
    result,
    guidance,
    isLoading,
    hasTriedDecode,
    handleDecode,
  } = useSerialDecode()

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Search className="h-3.5 w-3.5 text-gray-500" />
        <p className="text-xs font-semibold text-gray-800">Serial check</p>
      </div>

      <div className="space-y-1.5">
        <input
          type="text"
          value={serial}
          onChange={(event) => setSerial(event.target.value)}
          placeholder="e.g. SR3179"
          className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none"
        />
        <input
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="e.g. Chanel flap medium black"
          className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none"
        />

        <div className="flex items-center gap-1.5">
          <select
            value={brand}
            onChange={(event) => setBrand(event.target.value as SerialCheckBrand)}
            aria-label="Select brand for serial decoding"
            title="Select brand"
            className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-900 focus:border-indigo-300 focus:outline-none"
          >
            {SERIAL_CHECK_BRANDS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleDecode}
            disabled={serial.trim().length === 0 || isLoading}
            className="rounded bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Analyzing…' : 'Decode'}
          </button>
        </div>
      </div>

      {!hasTriedDecode && (
        <div className="mt-2 rounded-md border border-dashed border-gray-200 bg-gray-50/50 px-2 py-1.5 text-[10px] text-gray-500">
          Enter a serial and choose the brand to decode the likely year.
        </div>
      )}

      {result && hasTriedDecode && (
        <div
          className={`mt-2 rounded-md border px-2 py-1.5 text-[11px] ${
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
      {guidance && (
        <div className="mt-2 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[11px] text-indigo-900">
          <p className="font-semibold">Worth: {formatCurrency(guidance.estimatedWorthEur)}</p>
          <p>Max pay: {formatCurrency(guidance.recommendedMaxPayEur)}</p>
        </div>
      )}
    </div>
  )
}
