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
import { Button, Card, EmptyState, PageHeader, SectionLabel } from '../../components/design-system'

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
      <PageHeader
        title="Retail Price"
        purpose="Estimate official boutique price for an item description and compare new-retail context with resale decisions."
      />

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
            className="min-h-[44px] rounded-full border border-lux-200 bg-white px-3 py-1 text-xs font-medium text-lux-700 transition-colors hover:bg-lux-50 hover:border-lux-300 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            {item.length > 40 ? `${item.slice(0, 37)}…` : item}
          </button>
        ))}
      </div>

      {/* Two-column: Form + Result */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Form */}
        <div className="space-y-6">
          <Card className="p-6">
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
                <Button
                  variant="primary"
                  data-testid="retail-lookup-btn"
                  onClick={handleLookup}
                  isLoading={loading}
                  className="inline-flex items-center gap-2"
                >
                  {!loading && <Tags className="h-4 w-4" />}
                  {loading ? 'Looking up…' : 'Look up retail price'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleClear}
                  disabled={loading}
                  className="inline-flex items-center gap-2"
                >
                  Clear
                </Button>
              </div>

              <p className="text-xs text-lux-400 pt-1">
                Estimates are indicative. Always check the brand's official site for current retail prices.
              </p>
            </div>
          </Card>
        </div>

        {/* Right: Result or empty state */}
        <div>
          {loading ? (
            <Card className="mb-6 p-6 animate-bento-enter stagger-1">
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-lux-400" />
                <p className="text-sm font-medium text-lux-700">Looking up official retail price…</p>
                <p className="mt-1 text-xs text-lux-500">Checking available sources for brand pricing context.</p>
              </div>
            </Card>
          ) : error ? (
            <Card className="mb-6 border-rose-200 bg-rose-50/60 p-6 text-center animate-bento-enter stagger-1">
              <p className="text-sm text-rose-600 font-medium">{error}</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLookup}
                  disabled={!description.trim()}
                >
                  Retry lookup
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </Button>
              </div>
            </Card>
          ) : result ? (
            <div
              data-testid="retail-result"
              className={`lux-card p-6 animate-bento-enter stagger-1 ${
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
                    <p className="mt-2 text-3xl sm:text-4xl font-bold font-mono leading-none text-lux-900">
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
          ) : (
            <Card className="min-h-[320px] border-2 border-dashed border-lux-200 animate-bento-enter stagger-1">
              <EmptyState
                icon={Tags}
                title="Ready to look up"
                description="Paste an item description or select an example to get the brand's official retail price."
              />
            </Card>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
