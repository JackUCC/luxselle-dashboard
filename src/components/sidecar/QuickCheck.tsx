import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Search, Loader2, Package, Calculator } from 'lucide-react'
import { apiGet, apiPost, ApiError } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'

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
  const [result, setResult] = useState<PriceCheckResult | null>(null)
  const [inventoryMatches, setInventoryMatches] = useState<InventoryMatch[]>([])
  const [bidInput, setBidInput] = useState('')

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
    if (!q) { toast.error('Enter an item to check'); return }
    setIsResearching(true)
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

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chanel Classic Flap..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <button
          type="submit"
          disabled={isResearching}
          className="shrink-0 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isResearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
        </button>
      </form>

      {result && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Avg. selling price</div>
            <div className="text-lg font-bold text-gray-900">{formatCurrency(result.averageSellingPriceEur)}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Max buy</div>
              <div className="text-sm font-bold text-gray-900">{formatCurrency(result.maxBuyEur)}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Max bid</div>
              <div className="text-sm font-bold text-gray-900">{formatCurrency(result.maxBidEur)}</div>
            </div>
          </div>

          {result.comps.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                {result.comps.length} comparable{result.comps.length !== 1 ? 's' : ''}
              </summary>
              <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                {result.comps.map((c, i) => (
                  <div key={i} className="flex justify-between py-0.5">
                    <span className="truncate text-gray-700 pr-2">
                      {c.sourceUrl ? (
                        <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="hover:text-indigo-600">{c.title}</a>
                      ) : c.title}
                    </span>
                    <span className="font-mono text-gray-600 whitespace-nowrap">{formatCurrency(c.price)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Landed cost calculator */}
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Calculator className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">Landed cost</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Bid €</span>
          <input
            type="text"
            inputMode="decimal"
            value={bidInput}
            onChange={(e) => setBidInput(e.target.value)}
            placeholder="0"
            className="flex-1 rounded border border-gray-200 px-2 py-1 text-right text-sm font-mono text-gray-900 focus:border-indigo-300 focus:outline-none"
          />
          {bid > 0 && (
            <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
              → {formatCurrency(landed)}
            </span>
          )}
        </div>
        {bid > 0 && (
          <div className="mt-1 text-[10px] text-gray-400">
            +{AUCTION_PCT}% fee +{CUSTOMS_PCT}% customs +{VAT_PCT}% VAT
          </div>
        )}
      </div>

      {/* Inventory check */}
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Package className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700">In stock?</span>
        </div>
        {inventoryMatches.length === 0 ? (
          <p className="text-xs text-gray-400">
            {result ? 'No matching items in inventory' : 'Run a check to see inventory matches'}
          </p>
        ) : (
          <div className="space-y-1">
            {inventoryMatches.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs py-0.5">
                <span className="truncate text-gray-700 pr-2">{p.brand} {p.model}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-gray-500">x{p.quantity}</span>
                  <span className="font-mono text-gray-700">{formatCurrency(p.sellPriceEur)}</span>
                </div>
              </div>
            ))}
            <a
              href="/inventory"
              target="_blank"
              rel="noreferrer"
              className="block text-[10px] text-indigo-500 hover:text-indigo-700 mt-1"
            >
              Open full inventory →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
