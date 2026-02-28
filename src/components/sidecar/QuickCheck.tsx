import { useEffect, useMemo, useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { Search, Loader2, Package, Calculator, Upload, ImageIcon, X } from 'lucide-react'
import { apiGet, apiPost, apiPostFormData, ApiError } from '../../lib/api'
import { calculateSimpleLandedCost, DEFAULT_AUCTION_PCT, DEFAULT_CUSTOMS_PCT, DEFAULT_VAT_PCT } from '../../lib/landedCost'
import { formatCurrency, parseNumericInput } from '../../lib/formatters'
import { useResearchSession } from '../../lib/ResearchSessionContext'

interface VisualSearchResult {
  productId?: string
  supplierItemId?: string
  imageUrl?: string
  title?: string
  score: number
}

interface PriceCheckComp {
  title: string
  price: number
  source: string
  sourceUrl?: string
  previewImageUrl?: string
}

interface PriceCheckResult {
  averageSellingPriceEur: number
  comps: PriceCheckComp[]
  maxBuyEur: number
  maxBidEur: number
}

interface InventoryMatch {
  id: string
  brand: string
  model: string
  status: string
  quantity: number
  sellPriceEur: number
}

interface QuickCheckResearchQuery {
  query: string
}

interface QuickCheckSessionResult {
  priceResult: PriceCheckResult
  inventoryMatches: InventoryMatch[]
}

export default function QuickCheck() {
  const [query, setQuery] = useState('')
  const [bidInput, setBidInput] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isFindingSimilar, setIsFindingSimilar] = useState(false)
  const [visualResults, setVisualResults] = useState<VisualSearchResult[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    session: quickCheckSession,
    startLoading: startQuickCheckLoading,
    setSuccess: setQuickCheckSuccess,
    setError: setQuickCheckError,
  } = useResearchSession<QuickCheckSessionResult, QuickCheckResearchQuery>('quickcheck')
  const isResearching = quickCheckSession.status === 'loading'
  const hasSearched = quickCheckSession.status !== 'idle'
  const errorMessage = quickCheckSession.status === 'error' ? (quickCheckSession.error ?? 'Price check failed') : null
  const result = quickCheckSession.status === 'success' ? (quickCheckSession.result?.priceResult ?? null) : null
  const inventoryMatches = quickCheckSession.status === 'success'
    ? (quickCheckSession.result?.inventoryMatches ?? [])
    : []

  const bid = useMemo(() => parseNumericInput(bidInput), [bidInput])
  const landed = useMemo(() => calculateSimpleLandedCost(bid), [bid])

  useEffect(() => {
    const persistedQuery = quickCheckSession.query
    if (!persistedQuery) return
    setQuery(persistedQuery.query)
  }, [quickCheckSession.query])

  useEffect(() => {
    if (result?.maxBidEur && result.maxBidEur > 0) {
      setBidInput(String(Math.round(result.maxBidEur)))
    }
  }, [result?.maxBidEur])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      toast.error('Enter an item to check')
      return
    }

    const researchQuery: QuickCheckResearchQuery = { query: q }
    startQuickCheckLoading(researchQuery)

    try {
      const [priceRes, invRes] = await Promise.allSettled([
        apiPost<{ data: PriceCheckResult }>('/pricing/price-check', {
          query: q,
        }),
        apiGet<{ data: InventoryMatch[] }>(`/products?q=${encodeURIComponent(q)}&limit=5`),
      ])

      if (priceRes.status !== 'fulfilled') {
        const msg = priceRes.reason instanceof ApiError ? priceRes.reason.message : 'Price check failed'
        setQuickCheckError(msg, researchQuery)
        toast.error(msg)
        return
      }

      const products = invRes.status === 'fulfilled' ? invRes.value.data : []
      const inStockMatches = Array.isArray(products)
        ? products.filter((p: InventoryMatch) => p.status === 'in_stock').slice(0, 3)
        : []

      setQuickCheckSuccess(
        {
          priceResult: priceRes.value.data,
          inventoryMatches: inStockMatches,
        },
        researchQuery
      )
      // Price check still succeeds when inventory lookup fails.
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : 'Price check failed'
      setQuickCheckError(msg, researchQuery)
      toast.error(msg)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    setVisualResults(null)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setVisualResults(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFindSimilar = async () => {
    if (!imageFile) return
    setIsFindingSimilar(true)
    setVisualResults(null)
    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      const { data } = await apiPostFormData<{ data: { results: VisualSearchResult[] } }>(
        '/search/visual',
        formData
      )
      setVisualResults(data?.results ?? [])
      toast.success(data?.results?.length ? `Found ${data.results.length} similar` : 'No similar items')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Find similar failed'
      toast.error(msg)
    } finally {
      setIsFindingSimilar(false)
    }
  }

  return (
    <div className="min-w-0 max-w-full space-y-2">
      <form onSubmit={handleSearch} className="rounded-lux-card border border-lux-200 bg-white p-2.5">
        <label htmlFor="sidecar-quick-search" className="text-xs font-medium text-lux-700">
          Item description
        </label>
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-lux-400" />
            <input
              id="sidecar-quick-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Paste full listing description..."
              className="w-full rounded-lg border border-lux-200 bg-white py-2 pl-8 pr-3 text-sm text-lux-900 placeholder:text-lux-400 focus-visible:border-lux-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold/30"
            />
          </div>
          <button
            type="submit"
            disabled={isResearching}
            className="shrink-0 rounded-lg bg-lux-900 px-3 py-2 text-sm font-medium text-white hover:bg-lux-800 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            {isResearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run'}
          </button>
        </div>
        <p className="mt-1 text-xs text-lux-500">Summary first, with details available below when needed.</p>

        <div className="mt-2 pt-2 border-t border-lux-200 bg-lux-50/50 rounded-lg px-2 py-2 min-h-[72px] flex flex-col justify-center">
          <label className="text-xs font-medium text-lux-700 block">Or search by image</label>
          {imagePreview ? (
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <img src={imagePreview} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleFindSimilar}
                  disabled={isFindingSimilar}
                  className="rounded bg-lux-800 px-2 py-1 text-xs font-medium text-white hover:bg-lux-700 disabled:opacity-50 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                >
                  {isFindingSimilar ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                  {isFindingSimilar ? 'Finding…' : 'Find similar'}
                </button>
                <button type="button" onClick={handleRemoveImage} className="p-1 text-lux-400 hover:text-lux-600 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none" aria-label="Remove image">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <label className="mt-1.5 flex items-center gap-2 rounded border border-dashed border-lux-200 bg-white px-2 py-2 cursor-pointer hover:border-lux-300 min-h-[40px]">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <Upload className="h-3.5 w-3.5 text-lux-400 shrink-0" />
              <span className="text-xs text-lux-500">Upload image</span>
            </label>
          )}
        </div>
      </form>

      {visualResults !== null && (
        <div className="rounded-lux-card border border-lux-200 bg-white p-2.5">
          <p className="text-xs font-medium text-lux-700 mb-2">Visually similar</p>
          {visualResults.length === 0 ? (
            <p className="text-xs text-lux-500">No similar items in index.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
              {visualResults.slice(0, 9).map((r, i) => (
                <div key={i} className="rounded border border-lux-100 overflow-hidden">
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt="" className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-lux-100 flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-lux-400" />
                    </div>
                  )}
                  <p className="truncate text-xs text-lux-600 px-1 py-0.5" title={r.title}>{r.title ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isResearching && (
        <div className="flex items-center gap-2 rounded-lux-card border border-lux-200 bg-white px-3 py-2 text-xs text-lux-600">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Running quick check...
        </div>
      )}

      {errorMessage && !isResearching && (
        <div className="rounded-lux-card border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {errorMessage}
        </div>
      )}

      {result && (
        <article className="space-y-2 rounded-lux-card border border-lux-200 bg-white p-2.5">
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <div className="rounded-lg bg-lux-50 p-2">
              <p className="text-lux-500">Avg sell</p>
              <p className="font-semibold text-lux-800">{formatCurrency(result.averageSellingPriceEur)}</p>
            </div>
            <div className="rounded-lg bg-lux-50 p-2">
              <p className="text-lux-500">Max buy</p>
              <p className="font-semibold text-lux-800">{formatCurrency(result.maxBuyEur)}</p>
            </div>
            <div className="rounded-lg bg-lux-50 p-2">
              <p className="text-lux-500">Max bid</p>
              <p className="font-semibold text-lux-800">{formatCurrency(result.maxBidEur)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-lux-100 bg-lux-50/60 p-2">
            <div className="mb-1 flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5 text-lux-500" />
              <p className="text-xs font-medium text-lux-700">Landed from bid</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-lux-500">Bid €</span>
              <input
                type="text"
                inputMode="decimal"
                value={bidInput}
                onChange={(e) => setBidInput(e.target.value)}
                placeholder="0"
                className="flex-1 rounded border border-lux-200 bg-white px-2 py-1 text-right text-sm font-mono text-lux-900 focus-visible:border-lux-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold/30"
              />
              <span className="whitespace-nowrap text-sm font-bold text-lux-900">{formatCurrency(landed)}</span>
            </div>
            <p className="mt-1 text-xs text-lux-500">Includes +{DEFAULT_AUCTION_PCT}% fee +{DEFAULT_CUSTOMS_PCT}% customs +{DEFAULT_VAT_PCT}% VAT</p>
          </div>

          {result.comps.length > 0 && (
            <details className="rounded-lg border border-lux-100 bg-lux-50/40 px-2 py-1.5 text-xs">
              <summary className="cursor-pointer font-medium text-lux-600 hover:text-lux-800">
                Comparables ({result.comps.length})
              </summary>
              <div className="mt-1.5 max-h-32 space-y-1 overflow-y-auto">
                {result.comps.map((c, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 py-0.5">
                    <span className="min-w-0 truncate text-lux-700">
                      {c.sourceUrl ? (
                        <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="hover:text-lux-gold focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none rounded-sm">
                          {c.title}
                        </a>
                      ) : c.title}
                    </span>
                    <span className="font-mono text-lux-600 whitespace-nowrap">{formatCurrency(c.price)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <details className="rounded-lg border border-lux-100 bg-lux-50/40 px-2 py-1.5 text-xs">
            <summary className="cursor-pointer font-medium text-lux-600 hover:text-lux-800">
              <span className="inline-flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Inventory matches ({inventoryMatches.length})
              </span>
            </summary>
            {inventoryMatches.length === 0 ? (
              <p className="mt-1.5 text-xs text-lux-500">No in-stock matches found for this query.</p>
            ) : (
              <div className="mt-1.5 space-y-1">
                {inventoryMatches.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 py-0.5">
                    <span className="truncate text-lux-700">{p.brand} {p.model}</span>
                    <div className="shrink-0 text-right">
                      <span className="mr-2 text-xs text-lux-500">x{p.quantity}</span>
                      <span className="font-mono text-lux-700">{formatCurrency(p.sellPriceEur)}</span>
                    </div>
                  </div>
                ))}
                <a
                  href="/inventory"
                  target="_blank"
                  rel="noreferrer"
                  className="block pt-1 text-xs text-lux-gold hover:text-lux-gold focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none rounded-sm"
                >
                  Open full inventory
                </a>
              </div>
            )}
          </details>
        </article>
      )}

      {!result && hasSearched && !isResearching && !errorMessage && (
        <div className="rounded-lux-card border border-lux-200 bg-white px-3 py-2 text-xs text-lux-500">
          Search completed but no report was returned. Try a clearer item description.
        </div>
      )}

      {!hasSearched && (
        <div className="rounded-lux-card border border-dashed border-lux-200 bg-white/60 px-3 py-2 text-xs text-lux-500">
          Paste a full listing title and run a quick check. You will get price targets, landed estimate, and inventory context in one place.
        </div>
      )}
    </div>
  )
}
