/**
 * Retail Price lookup — paste item description to estimate the brand's official
 * retail price (new, from the brand). Compare brand-new cost vs second-hand market.
 */
import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Tags, Loader2, Euro, Info, Sparkles } from 'lucide-react'
import { apiPost } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'
import PageLayout from '../../components/layout/PageLayout'
import { PageHeader } from '../../components/design-system'
import SectionLabel from '../../components/design-system/SectionLabel'

interface RetailLookupResult {
  retailPriceEur: number | null
  currency: string
  productName: string | null
  note: string
}

const EXAMPLE_ITEMS = [
  'Chanel Classic Flap Medium, black caviar, gold hardware',
  'Hermès Birkin 25, Togo leather, gold hardware',
  'Louis Vuitton Neverfull MM, Monogram canvas',
  'Rolex Submariner Date 126610LN',
  'Gucci Ace Sneakers, white leather',
]

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
    setError(null)
  }, [])

  return (
    <PageLayout variant="content">
      <PageHeader title="Retail Price" />

      {/* Example chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-lux-400">
          <Sparkles className="h-3 w-3" /> Examples
        </span>
        {EXAMPLE_ITEMS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setDescription(item)}
            className="rounded-full border border-lux-200 bg-white px-3 py-1 text-xs font-medium text-lux-700 hover:bg-lux-50 hover:border-lux-300 transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            {item.length > 40 ? `${item.slice(0, 37)}…` : item}
          </button>
        ))}
      </div>

      {/* Two-column: Form + Result */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Form */}
        <div className="space-y-6">
          <div className="lux-card p-6">
            <SectionLabel className="mb-5">Item Lookup</SectionLabel>

            <div className="space-y-4">
              <div>
                <label htmlFor="retail-description" className="block text-xs font-medium text-lux-600 mb-1.5">
                  Item description
                </label>
                <textarea
                  id="retail-description"
                  data-testid="retail-description"
                  rows={5}
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
                  className="lux-btn-primary flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Tags className="h-4 w-4" />
                  )}
                  {loading ? 'Looking up…' : 'Look up retail price'}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={loading}
                  className="lux-btn-secondary flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                >
                  Clear
                </button>
              </div>

              <p className="text-xs text-lux-400 pt-1">
                Estimates are indicative. Always check the brand's official site for current retail prices.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Result or empty state */}
        <div>
          {error && (
            <div className="lux-card p-6 text-center border-rose-200 bg-rose-50/60 mb-6">
              <p className="text-sm text-rose-600 font-medium">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
              >
                Dismiss
              </button>
            </div>
          )}

          {result ? (
            <div
              data-testid="retail-result"
              className={`lux-card p-6 ${
                result.retailPriceEur != null
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-amber-200 bg-amber-50/40'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    result.retailPriceEur != null ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {result.retailPriceEur != null ? (
                    <Euro className="h-6 w-6" />
                  ) : (
                    <Info className="h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {result.productName && (
                    <p className="text-xs font-semibold text-lux-800">{result.productName}</p>
                  )}
                  {result.retailPriceEur != null && (
                    <p className="mt-2 text-[36px] font-bold font-mono leading-none text-lux-900">
                      {formatCurrency(result.retailPriceEur)}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-lux-600 leading-relaxed">{result.note}</p>
                  <p className="mt-2 text-xs text-lux-400">
                    Official boutique price (new from brand). Verify on the brand's website for your region.
                  </p>
                </div>
              </div>
            </div>
          ) : !error ? (
            <div className="lux-card border-dashed border-2 border-lux-200 min-h-[320px] flex flex-col items-center justify-center text-lux-400 p-8">
              <Tags className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm font-medium text-lux-500">Ready to look up</p>
              <p className="text-xs opacity-60 mt-1 max-w-xs text-center">
                Paste an item description or select an example to get the brand's official retail price.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </PageLayout>
  )
}
