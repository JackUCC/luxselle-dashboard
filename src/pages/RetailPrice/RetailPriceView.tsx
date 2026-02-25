/**
 * What was this retail? — Paste item description to get an estimate of the brand's official
 * retail price (new, from the brand). Helps compare brand-new cost vs second-hand market.
 */
import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Tag, Loader2, Euro, Info } from 'lucide-react'
import { apiPost } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'

interface RetailLookupResult {
  retailPriceEur: number | null
  currency: string
  productName: string | null
  note: string
}

export default function RetailPriceView() {
  const [description, setDescription] = useState('')
  const [result, setResult] = useState<RetailLookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLookup = useCallback(async () => {
    const trimmed = description.trim()
    if (!trimmed) {
      toast.error('Paste an item description first')
      return
    }
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const { data } = await apiPost<{ data: RetailLookupResult }>('/ai/retail-lookup', {
        description: trimmed,
      })
      setResult(data)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Lookup failed'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [description])

  const handleClear = useCallback(() => {
    setDescription('')
    setResult(null)
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-lux-800">
          What was this retail?
        </h1>
        <p className="mt-1 text-sm text-lux-600">
          Paste the item description (e.g. brand, model, style) to get an estimate of the
          <strong> brand’s official retail price</strong> — what it costs new, directly from the brand.
          This helps you compare against second-hand and make better buying decisions.
        </p>
      </div>

      <div className="lux-card p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="retail-description" className="block text-sm font-medium text-gray-700 mb-1.5">
              Item description
            </label>
            <textarea
              id="retail-description"
              data-testid="retail-description"
              rows={4}
              className="lux-input"
              placeholder="e.g. Chanel Classic Flap Medium, black caviar leather, gold hardware"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              data-testid="retail-lookup-btn"
              onClick={handleLookup}
              disabled={loading}
              className="lux-btn-primary flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Tag className="h-4 w-4" />
              )}
              {loading ? 'Looking up…' : 'Look up retail price'}
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="lux-btn-secondary flex items-center gap-2"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="lux-card p-6 text-center border-rose-200 bg-rose-50/60">
          <p className="text-sm text-rose-600 font-medium">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            Retry
          </button>
        </div>
      )}

      {result && (
        <div
          data-testid="retail-result"
          className={`rounded-2xl border p-6 shadow-sm ${
            result.retailPriceEur != null
              ? 'border-emerald-200 bg-emerald-50/60'
              : 'border-amber-200 bg-amber-50/60'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                result.retailPriceEur != null ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {result.retailPriceEur != null ? (
                <Euro className="h-5 w-5" />
              ) : (
                <Info className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {result.productName && (
                <p className="text-sm font-medium text-gray-800">{result.productName}</p>
              )}
              {result.retailPriceEur != null && (
                <p className="mt-1 font-display text-2xl font-semibold text-lux-800">
                  {formatCurrency(result.retailPriceEur)}
                </p>
              )}
              <p className="mt-2 text-sm text-gray-600">{result.note}</p>
              <p className="mt-1 text-xs text-gray-500">
                Official / boutique price (new from brand). Verify on the brand’s website for your region.
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Estimates are indicative. Always check the brand’s official site for current retail prices in your country.
      </p>
    </div>
  )
}
