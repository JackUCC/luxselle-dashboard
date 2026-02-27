import { useMemo, useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { Search, Loader2, Package, Calculator, Upload, ImageIcon, X } from 'lucide-react'
import { apiGet, apiPost, apiPostFormData, ApiError } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'

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

const AUCTION_PCT = 7
const CUSTOMS_PCT = 3
const VAT_PCT = 23

export default function QuickCheck() {
  const [query, setQuery] = useState('')
  const [isResearching, setIsResearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<PriceCheckResult | null>(null)
  const [inventoryMatches, setInventoryMatches] = useState<InventoryMatch[]>([])
  const [bidInput, setBidInput] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isFindingSimilar, setIsFindingSimilar] = useState(false)
  const [visualResults, setVisualResults] = useState<VisualSearchResult[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const bid = useMemo(() => {
    const n = parseFloat(bidInput.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [bidInput])

  const landed = useMemo(() => {
    if (bid <= 0) return 0
    return bid * (1 + AUCTION_PCT / 100) * (1 + CUSTOMS_PCT / 100) * (1 + VAT_PCT / 100)
  }, [bid])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) {
      toast.error('Enter an item to check')
      return
    }

    setHasSearched(true)
    setIsResearching(true)
    setErrorMessage(null)
    setResult(null)
    setInventoryMatches([])

    try {
      const [priceRes, invRes] = await Promise.allSettled([
        apiPost<{ data: PriceCheckResult }>('/pricing/price-check', {
          query: q,
        }),
        apiGet<{ data: InventoryMatch[] }>(`/products?q=${encodeURIComponent(q)}&limit=5`),
      ])

      if (priceRes.status === 'fulfilled') {
        setResult(priceRes.value.data)
        if (priceRes.value.data.maxBidEur > 0) {
          setBidInput(String(Math.round(priceRes.value.data.maxBidEur)))
        }
      } else {
        const msg = priceRes.reason instanceof ApiError ? priceRes.reason.message : 'Price check failed'
        setErrorMessage(msg)
        toast.error(msg)
      }

      if (invRes.status === 'fulfilled') {
        const products = invRes.value.data
        if (Array.isArray(products)) {
          setInventoryMatches(products.filter((p: InventoryMatch) => p.status === 'in_stock').slice(0, 3))
        }
      }
    } finally {
      setIsResearching(false)
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
      <form onSubmit={handleSearch} className="rounded-xl border border-gray-200 bg-white p-2.5">
        <label htmlFor="sidecar-quick-search" className="text-[11px] font-medium text-gray-700">
          Item description
        </label>
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              id="sidecar-quick-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Paste full listing description..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={isResearching}
            className="shrink-0 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isResearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run'}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-gray-500">Summary first, with details available below when needed.</p>

        <div className="mt-2 pt-2 border-t border-gray-200 bg-gray-50/50 rounded-lg px-2 py-2 min-h-[72px] flex flex-col justify-center">
          <label className="text-[11px] font-medium text-gray-700 block">Or search by image</label>
          {imagePreview ? (
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <img src={imagePreview} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleFindSimilar}
                  disabled={isFindingSimilar}
                  className="rounded bg-gray-800 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {isFindingSimilar ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                  {isFindingSimilar ? 'Finding…' : 'Find similar'}
                </button>
                <button type="button" onClick={handleRemoveImage} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Remove image">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <label className="mt-1.5 flex items-center gap-2 rounded border border-dashed border-gray-200 bg-white px-2 py-2 cursor-pointer hover:border-gray-300 min-h-[40px]">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <Upload className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="text-[11px] text-gray-500">Upload image</span>
            </label>
          )}
        </div>
      </form>

      {visualResults !== null && (
        <div className="rounded-xl border border-gray-200 bg-white p-2.5">
          <p className="text-[11px] font-medium text-gray-700 mb-2">Visually similar</p>
          {visualResults.length === 0 ? (
            <p className="text-[11px] text-gray-500">No similar items in index.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
              {visualResults.slice(0, 9).map((r, i) => (
                <div key={i} className="rounded border border-gray-100 overflow-hidden">
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt="" className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <p className="truncate text-[10px] text-gray-600 px-1 py-0.5" title={r.title}>{r.title ?? '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isResearching && (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Running quick check...
        </div>
      )}

      {errorMessage && !isResearching && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {errorMessage}
        </div>
      )}

      {result && (
        <article className="space-y-2 rounded-xl border border-gray-200 bg-white p-2.5">
          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            <div className="rounded-lg bg-gray-50 p-2">
              <p className="text-gray-500">Avg sell</p>
              <p className="font-semibold text-gray-800">{formatCurrency(result.averageSellingPriceEur)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <p className="text-gray-500">Max buy</p>
              <p className="font-semibold text-gray-800">{formatCurrency(result.maxBuyEur)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <p className="text-gray-500">Max bid</p>
              <p className="font-semibold text-gray-800">{formatCurrency(result.maxBidEur)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-2">
            <div className="mb-1 flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5 text-gray-500" />
              <p className="text-[11px] font-medium text-gray-700">Landed from bid</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500">Bid €</span>
              <input
                type="text"
                inputMode="decimal"
                value={bidInput}
                onChange={(e) => setBidInput(e.target.value)}
                placeholder="0"
                className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-right text-sm font-mono text-gray-900 focus:border-indigo-300 focus:outline-none"
              />
              <span className="whitespace-nowrap text-sm font-bold text-gray-900">{formatCurrency(landed)}</span>
            </div>
            <p className="mt-1 text-[10px] text-gray-500">Includes +{AUCTION_PCT}% fee +{CUSTOMS_PCT}% customs +{VAT_PCT}% VAT</p>
          </div>

          {result.comps.length > 0 && (
            <details className="rounded-lg border border-gray-100 bg-gray-50/40 px-2 py-1.5 text-xs">
              <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">
                Comparables ({result.comps.length})
              </summary>
              <div className="mt-1.5 max-h-32 space-y-1 overflow-y-auto">
                {result.comps.map((c, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 py-0.5">
                    <span className="min-w-0 truncate text-gray-700">
                      {c.sourceUrl ? (
                        <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="hover:text-indigo-600">
                          {c.title}
                        </a>
                      ) : c.title}
                    </span>
                    <span className="font-mono text-gray-600 whitespace-nowrap">{formatCurrency(c.price)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <details className="rounded-lg border border-gray-100 bg-gray-50/40 px-2 py-1.5 text-xs">
            <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">
              <span className="inline-flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Inventory matches ({inventoryMatches.length})
              </span>
            </summary>
            {inventoryMatches.length === 0 ? (
              <p className="mt-1.5 text-[11px] text-gray-500">No in-stock matches found for this query.</p>
            ) : (
              <div className="mt-1.5 space-y-1">
                {inventoryMatches.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 py-0.5">
                    <span className="truncate text-gray-700">{p.brand} {p.model}</span>
                    <div className="shrink-0 text-right">
                      <span className="mr-2 text-[11px] text-gray-500">x{p.quantity}</span>
                      <span className="font-mono text-gray-700">{formatCurrency(p.sellPriceEur)}</span>
                    </div>
                  </div>
                ))}
                <a
                  href="/inventory"
                  target="_blank"
                  rel="noreferrer"
                  className="block pt-1 text-[11px] text-indigo-600 hover:text-indigo-700"
                >
                  Open full inventory
                </a>
              </div>
            )}
          </details>
        </article>
      )}

      {!result && hasSearched && !isResearching && !errorMessage && (
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
          Search completed but no report was returned. Try a clearer item description.
        </div>
      )}

      {!hasSearched && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white/60 px-3 py-2 text-[11px] text-gray-500">
          Paste a full listing title and run a quick check. You will get price targets, landed estimate, and inventory context in one place.
        </div>
      )}
    </div>
  )
}
