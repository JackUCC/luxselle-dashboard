/**
 * Market Research: AI-driven market intelligence for luxury goods.
 * Deep analysis of pricing trends, demand, competitive landscape.
 * Irish & EU market: Designer Exchange, Luxury Exchange, Siopella, Vestiaire.
 * @see docs/CODE_REFERENCE.md
 */
import { useState, useMemo, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Search,
    BarChart3,
    Sparkles,
    Loader2,
    ExternalLink,
    ChevronRight,
    Zap,
    AlertTriangle,
    CheckCircle2,
    ShieldCheck,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    History,
    Store,
} from 'lucide-react'
import { apiGet, apiPost, ApiError } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'
import { useServerStatus } from '../../lib/ServerStatusContext'
import PageLayout from '../../components/layout/PageLayout'
import { PageHeader } from '../../components/design-system'
import { FloatingInput, LuxSelect } from '../../components/design-system/Input'

// ─── Brand database ────────────────────────────────────────────
const BRAND_MODELS: Record<string, string[]> = {
    'Chanel': ['Classic Flap', '2.55', 'Boy', 'Gabrielle', '19', 'Coco Handle', 'Vanity Case'],
    'Hermès': ['Birkin', 'Kelly', 'Constance', 'Evelyne', 'Picotin', 'Lindy', 'Garden Party'],
    'Louis Vuitton': ['Speedy', 'Neverfull', 'Pochette Metis', 'Alma', 'Capucines', 'OnTheGo', 'Twist'],
    'Gucci': ['Marmont', 'Dionysus', 'Jackie', 'Horsebit 1955', 'Ophidia', 'Bamboo', 'Soho Disco'],
    'Prada': ['Galleria', 'Cahier', 'Cleo', 'Re-Edition 2005', 'Hobo', 'Sidonie'],
    'Dior': ['Lady Dior', 'Saddle', 'Book Tote', '30 Montaigne', 'Diorama', 'Miss Dior'],
    'Bottega Veneta': ['Pouch', 'Cassette', 'Jodie', 'Arco', 'Cabat', 'Intrecciato'],
    'Fendi': ['Baguette', 'Peekaboo', 'By The Way', 'Kan I', 'Mon Tresor'],
    'Givenchy': ['Antigona', 'Pandora', 'GV3', 'Cut Out'],
    'Loewe': ['Puzzle', 'Hammock', 'Barcelona', 'Gate', 'Flamenco'],
}

// ─── Types ─────────────────────────────────────────────────────
interface MarketComparable {
    title: string
    priceEur: number
    source: string
    sourceUrl?: string
    previewImageUrl?: string
    condition: string
    daysListed?: number
}

interface MarketComparablePayload extends Omit<MarketComparable, 'previewImageUrl'> {
    previewImageUrl?: string
    thumbnailUrl?: string
    imageUrl?: string
}

interface MarketResearchResult {
    provider: string
    brand: string
    model: string
    estimatedMarketValueEur: number
    priceRangeLowEur: number
    priceRangeHighEur: number
    suggestedBuyPriceEur: number
    suggestedSellPriceEur: number
    demandLevel: 'very_high' | 'high' | 'moderate' | 'low' | 'very_low'
    priceTrend: 'rising' | 'stable' | 'declining'
    marketLiquidity: 'fast_moving' | 'moderate' | 'slow_moving'
    recommendation: 'strong_buy' | 'buy' | 'hold' | 'pass'
    confidence: number
    marketSummary: string
    keyInsights: string[]
    riskFactors: string[]
    comparables: MarketComparable[]
    seasonalNotes?: string
}

interface MarketResearchResultPayload extends Omit<MarketResearchResult, 'comparables'> {
    comparables: MarketComparablePayload[]
}

interface TrendingItem {
    brand: string
    model: string
    category: string
    demandLevel: string
    priceTrend: string
    avgPriceEur: number
    searchVolume: 'high' | 'medium' | 'low'
}

interface TrendingResult {
    provider: string
    items: TrendingItem[]
    generatedAt: string
}

/** Competitor feed item (Designer Exchange, Luxury Exchange, Siopella). */
interface CompetitorFeedItem {
    title: string
    priceEur: number
    source: string
    sourceUrl?: string
    listedAt?: string
}

interface CompetitorFeedResult {
    items: CompetitorFeedItem[]
    generatedAt: string
}

const PREVIOUS_SEARCHES_KEY = 'luxselle_market_research_previous'
const PREVIOUS_SEARCHES_MAX = 6

/** Editable: key bags to show as quick-select (merge with trending when loaded). */
const KEY_TRENDING_BAGS: { brand: string; model: string }[] = [
    { brand: 'Chanel', model: 'Classic Flap' },
    { brand: 'Louis Vuitton', model: 'Pochette Metis' },
    { brand: 'Hermès', model: 'Birkin 25' },
    { brand: 'Bottega Veneta', model: 'Jodie' },
]

const CATEGORY_OPTIONS = [
    { value: 'Handbag', label: 'Handbag' },
    { value: 'Wallet', label: 'Wallet' },
    { value: 'Shoes', label: 'Shoes' },
    { value: 'Watch', label: 'Watch' },
    { value: 'Jewelry', label: 'Jewelry' },
    { value: 'Accessory', label: 'Accessory' },
    { value: 'Clothing', label: 'Clothing' },
]

const CONDITION_OPTIONS = [
    { value: 'new', label: 'New / Pristine' },
    { value: 'excellent', label: 'Excellent (A)' },
    { value: 'good', label: 'Good (B)' },
    { value: 'fair', label: 'Fair (C)' },
    { value: 'used', label: 'Used' },
]

// ─── Helpers ───────────────────────────────────────────────────
const DEMAND_CONFIG = {
    very_high: { label: 'Very High', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', pct: 95 },
    high: { label: 'High', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', pct: 75 },
    moderate: { label: 'Moderate', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', pct: 50 },
    low: { label: 'Low', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', pct: 25 },
    very_low: { label: 'Very Low', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', pct: 10 },
}

const TREND_CONFIG = {
    rising: { label: 'Rising', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    stable: { label: 'Stable', icon: Minus, color: 'text-lux-700', bg: 'bg-lux-200/80' },
    declining: { label: 'Declining', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
}

const RECOMMENDATION_CONFIG = {
    strong_buy: { label: 'Strong Buy', color: 'text-emerald-700', bg: 'bg-gradient-to-r from-emerald-50 to-green-50', border: 'border-emerald-300', icon: '🟢' },
    buy: { label: 'Buy', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: '🟡' },
    hold: { label: 'Hold', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: '🟠' },
    pass: { label: 'Pass', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: '🔴' },
}

const LIQUIDITY_CONFIG = {
    fast_moving: { label: 'Fast Moving', sublabel: '< 14 days avg', color: 'text-emerald-600' },
    moderate: { label: 'Moderate', sublabel: '14-30 days avg', color: 'text-amber-600' },
    slow_moving: { label: 'Slow Moving', sublabel: '30+ days avg', color: 'text-red-600' },
}

const normalizeComparableImage = (comparable: MarketComparablePayload): MarketComparable => ({
    ...comparable,
    previewImageUrl: comparable.previewImageUrl ?? comparable.thumbnailUrl ?? comparable.imageUrl,
})

const FALLBACK_COMPARABLE_TITLE = 'Untitled listing'

function normalizeComparableTitle(value: unknown): string {
    if (typeof value !== 'string') return FALLBACK_COMPARABLE_TITLE
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : FALLBACK_COMPARABLE_TITLE
}

function normalizeMarketResearchResult(result: MarketResearchResult): MarketResearchResult {
    return {
        ...result,
        comparables: result.comparables.map(comp => ({
            ...comp,
            title: normalizeComparableTitle(comp.title),
        })),
    }
}

// ═════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════
export default function MarketResearchView() {
    const [formData, setFormData] = useState({
        brand: '',
        model: '',
        category: 'Handbag',
        condition: 'excellent',
        colour: '',
        year: '',
        notes: '',
        currentAskPriceEur: '',
    })
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<MarketResearchResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    const [trending, setTrending] = useState<TrendingResult | null>(null)
    const [isTrendingLoading, setIsTrendingLoading] = useState(false)
    const [competitorFeed, setCompetitorFeed] = useState<CompetitorFeedResult | null>(null)
    const [isCompetitorLoading, setIsCompetitorLoading] = useState(false)
    const [previousSearches, setPreviousSearches] = useState<{ brand: string; model: string }[]>([])
    const [failedComparableImages, setFailedComparableImages] = useState<Record<string, boolean>>({})

    const availableModels = useMemo(() => {
        if (!formData.brand) return []
        return BRAND_MODELS[formData.brand] ?? []
    }, [formData.brand])

    const brandOptions = useMemo(
        () => Object.keys(BRAND_MODELS).sort().map(brand => ({ value: brand, label: brand })),
        [],
    )

    const modelOptions = useMemo(
        () => availableModels.map(model => ({ value: model, label: model })),
        [availableModels],
    )

    // Pre-load trending and competitor feed on mount
    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setIsTrendingLoading(true)
            try {
                const { data } = await apiGet<{ data: TrendingResult }>('/market-research/trending')
                if (!cancelled) setTrending(data)
            } catch {
                if (!cancelled) setTrending(null)
            } finally {
                if (!cancelled) setIsTrendingLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setIsCompetitorLoading(true)
            try {
                const { data } = await apiGet<{ data: CompetitorFeedResult }>('/market-research/competitor-feed')
                if (!cancelled) setCompetitorFeed(data)
            } catch {
                if (!cancelled) setCompetitorFeed(null)
            } finally {
                if (!cancelled) setIsCompetitorLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [])

    // Restore previous searches from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem(PREVIOUS_SEARCHES_KEY)
            if (raw) {
                const parsed = JSON.parse(raw) as { brand: string; model: string }[]
                if (Array.isArray(parsed)) setPreviousSearches(parsed.slice(0, PREVIOUS_SEARCHES_MAX))
            }
        } catch {
            setPreviousSearches([])
        }
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => {
            if (name === 'brand') return { ...prev, brand: value, model: '' }
            return { ...prev, [name]: value }
        })
    }

    const handleSelectChange = (field: 'brand' | 'model' | 'category' | 'condition', value: string) => {
        setFormData(prev => {
            if (field === 'brand') return { ...prev, brand: value, model: '' }
            return { ...prev, [field]: value }
        })
    }

    const handleAnalyse = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        try {
            const { data } = await apiPost<{ data: MarketResearchResultPayload }>('/market-research/analyse', {
                ...formData,
                currentAskPriceEur: formData.currentAskPriceEur ? Number(formData.currentAskPriceEur) : undefined,
            })
            setFailedComparableImages({})
            setResult(
                normalizeMarketResearchResult({
                    ...data,
                    comparables: data.comparables.map(normalizeComparableImage),
                })
            )
            // Persist as previous search
            const entry = { brand: formData.brand, model: formData.model }
            setPreviousSearches(prev => {
                const next = [entry, ...prev.filter(p => !(p.brand === entry.brand && p.model === entry.model))]
                const slice = next.slice(0, PREVIOUS_SEARCHES_MAX)
                try {
                    localStorage.setItem(PREVIOUS_SEARCHES_KEY, JSON.stringify(slice))
                } catch (e) { console.warn('Failed to persist search history to localStorage', e) }
                return slice
            })
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Analysis failed'
            setError(msg)
            toast.error(msg)
        } finally {
            setIsLoading(false)
        }
    }

    const loadTrending = async () => {
        setIsTrendingLoading(true)
        setError(null)
        try {
            const { data } = await apiGet<{ data: TrendingResult }>('/market-research/trending')
            setTrending(data)
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to load trends'
            setError(msg)
            toast.error(msg)
        } finally {
            setIsTrendingLoading(false)
        }
    }

    const quickResearch = (brand: string, model: string) => {
        setFormData(prev => ({ ...prev, brand, model }))
        setResult(null)
    }

    const { status } = useServerStatus()

    return (
        <PageLayout variant="content">
            <PageHeader
                title="Market Research"
                purpose="Irish & EU market — Designer Exchange, Luxury Exchange, Siopella, Vestiaire."
                actions={
                    <>
                        {status?.aiProvider === 'mock' && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-ui-label font-medium text-amber-800">Mock Data</span>
                        )}
                        {status?.aiProvider === 'openai' && (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-ui-label font-medium text-emerald-800">AI: OpenAI</span>
                        )}
                    </>
                }
            />

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

            {/* ─── Quick-select chips ─── */}
            {(previousSearches.length > 0 || KEY_TRENDING_BAGS.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                    {previousSearches.length > 0 && (
                        <>
                            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-lux-400">
                                <History className="h-3 w-3" /> Recent
                            </span>
                            {previousSearches.map((p, i) => (
                                <button
                                    key={`prev-${p.brand}-${p.model}-${i}`}
                                    type="button"
                                    onClick={() => quickResearch(p.brand, p.model)}
                                    className="rounded-full border border-lux-200 bg-white px-3 py-1 text-[12px] font-medium text-lux-700 hover:bg-lux-50 hover:border-lux-300 transition-colors"
                                >
                                    {p.brand} {p.model}
                                </button>
                            ))}
                            <div className="mx-1 h-4 w-px bg-lux-200" />
                        </>
                    )}
                    <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-amber-500">
                        <Zap className="h-3 w-3" /> Trending
                    </span>
                    {KEY_TRENDING_BAGS.map(({ brand, model }) => (
                        <button
                            key={`trend-${brand}-${model}`}
                            type="button"
                            onClick={() => quickResearch(brand, model)}
                            className="rounded-full border border-amber-200 bg-amber-50/60 px-3 py-1 text-[12px] font-medium text-lux-800 hover:bg-amber-100 transition-colors"
                        >
                            {brand} {model}
                        </button>
                    ))}
                </div>
            )}

            {/* ─── Main 2-column: Form + Results ─── */}
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-6">
                    {/* Research Form */}
                    <div className="lux-card p-6">
                        <div className="flex items-center gap-2 text-[12px] font-semibold text-lux-400 uppercase tracking-[0.06em] mb-5">
                            <Search className="h-4 w-4" />
                            Research Query
                        </div>

                        <form onSubmit={handleAnalyse} className="space-y-4">
                            <div>
                                <label htmlFor="mr-brand" className="block text-[12px] font-medium text-lux-600 mb-1.5">Brand *</label>
                                <LuxSelect
                                    id="mr-brand"
                                    name="brand"
                                    value={formData.brand}
                                    onValueChange={(value) => handleSelectChange('brand', value)}
                                    options={brandOptions}
                                    placeholder="Select Brand"
                                    required
                                    ariaLabel="Brand"
                                />
                            </div>

                            <div>
                                {modelOptions.length > 0 ? (
                                    <>
                                        <label htmlFor="mr-model" className="block text-[12px] font-medium text-lux-600 mb-1.5">Model *</label>
                                        <LuxSelect
                                            id="mr-model"
                                            name="model"
                                            value={formData.model}
                                            onValueChange={(value) => handleSelectChange('model', value)}
                                            options={modelOptions}
                                            placeholder="Select Model"
                                            disabled={!formData.brand}
                                            required
                                            ariaLabel="Model"
                                        />
                                    </>
                                ) : (
                                    <FloatingInput
                                        id="mr-model"
                                        type="text"
                                        name="model"
                                        value={formData.model}
                                        onChange={handleChange}
                                        label="Model *"
                                        required
                                        disabled={!formData.brand}
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="mr-category" className="block text-[12px] font-medium text-lux-600 mb-1.5">Category *</label>
                                    <LuxSelect
                                        id="mr-category"
                                        name="category"
                                        value={formData.category}
                                        onValueChange={(value) => handleSelectChange('category', value)}
                                        options={CATEGORY_OPTIONS}
                                        required
                                        ariaLabel="Category"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="mr-condition" className="block text-[12px] font-medium text-lux-600 mb-1.5">Condition *</label>
                                    <LuxSelect
                                        id="mr-condition"
                                        name="condition"
                                        value={formData.condition}
                                        onValueChange={(value) => handleSelectChange('condition', value)}
                                        options={CONDITION_OPTIONS}
                                        required
                                        ariaLabel="Condition"
                                    />
                                </div>
                            </div>

                            <div>
                                <FloatingInput
                                    id="mr-askPrice"
                                    type="number"
                                    name="currentAskPriceEur"
                                    value={formData.currentAskPriceEur}
                                    onChange={handleChange}
                                    label="Current Ask Price (EUR)"
                                    step="0.01"
                                    leadingAdornment={<span className="text-[15px] font-medium">€</span>}
                                />
                                <p className="text-[11px] text-lux-400 mt-1">Optional — helps calibrate analysis</p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !formData.brand || !formData.model}
                                className="lux-btn-primary w-full py-3 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Researching...</>
                                ) : (
                                    <><Sparkles className="h-4 w-4" /> Research Market</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ─── Results panel ─── */}
                <div>
                    {!result ? (
                        <div className="lux-card border-dashed border-2 min-h-[500px] flex flex-col items-center justify-center text-gray-400">
                            <BarChart3 className="h-14 w-14 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Ready to research</p>
                            <p className="text-sm opacity-60 mt-1 max-w-sm text-center">Select a product or use a quick-select above. Market data from Irish & EU suppliers (Designer Exchange, Luxury Exchange, Siopella, Vestiaire).</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Recommendation Banner */}
                            {(() => {
                                const rec = RECOMMENDATION_CONFIG[result.recommendation]
                                return (
                                    <div className={`lux-card overflow-hidden ${rec.bg} border ${rec.border}`}>
                                        <div className="p-5 flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Recommendation</div>
                                                <div className={`text-2xl font-display font-bold ${rec.color} flex items-center gap-2`}>
                                                    <span>{rec.icon}</span> {rec.label}
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1.5 max-w-md">{result.marketSummary}</div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Confidence</div>
                                                <div className="text-3xl font-bold text-gray-900">
                                                    {(result.confidence * 100).toFixed(0)}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* Price Intelligence */}
                            <div className="lux-card p-5">
                                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Price Intelligence</div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className="text-xs text-gray-500 mb-1">Market Value</div>
                                        <div className="text-xl font-bold text-gray-900">{formatCurrency(result.estimatedMarketValueEur)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                                            <ArrowDownRight className="h-3 w-3 text-green-600" /> Buy At
                                        </div>
                                        <div className="text-xl font-bold text-green-700">{formatCurrency(result.suggestedBuyPriceEur)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                                            <ArrowUpRight className="h-3 w-3 text-lux-700" /> Sell At
                                        </div>
                                        <div className="text-xl font-bold text-lux-800">{formatCurrency(result.suggestedSellPriceEur)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-gray-500 mb-1">Price Range</div>
                                        <div className="text-sm font-semibold text-gray-700">
                                            {formatCurrency(result.priceRangeLowEur)} – {formatCurrency(result.priceRangeHighEur)}
                                        </div>
                                    </div>
                                </div>

                                {/* Price range bar */}
                                <div className="mt-4 px-2">
                                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="absolute h-full bg-gradient-to-r from-green-400 via-amber-400 to-lux-gold rounded-full"
                                            style={{
                                                left: `${((result.priceRangeLowEur / result.priceRangeHighEur) * 80)}%`,
                                                width: `${Math.max(20, 100 - (result.priceRangeLowEur / result.priceRangeHighEur) * 80)}%`
                                            }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                                        <span>{formatCurrency(result.priceRangeLowEur)}</span>
                                        <span>{formatCurrency(result.priceRangeHighEur)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Market Indicators */}
                            <div className="grid grid-cols-3 gap-4">
                                {/* Demand */}
                                {(() => {
                                    const d = DEMAND_CONFIG[result.demandLevel]
                                    return (
                                        <div className={`lux-card p-4 border ${d.border} ${d.bg}`}>
                                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Demand</div>
                                            <div className={`text-lg font-bold ${d.color}`}>{d.label}</div>
                                            <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-700 ${d.pct >= 75 ? 'bg-emerald-500' : d.pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                                                    }`} style={{ width: `${d.pct}%` }} />
                                            </div>
                                        </div>
                                    )
                                })()}

                                {/* Trend */}
                                {(() => {
                                    const t = TREND_CONFIG[result.priceTrend]
                                    const TrendIcon = t.icon
                                    return (
                                        <div className={`lux-card p-4 ${t.bg}`}>
                                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Price Trend</div>
                                            <div className={`text-lg font-bold ${t.color} flex items-center gap-2`}>
                                                <TrendIcon className="h-5 w-5" />
                                                {t.label}
                                            </div>
                                        </div>
                                    )
                                })()}

                                {/* Liquidity */}
                                {(() => {
                                    const l = LIQUIDITY_CONFIG[result.marketLiquidity]
                                    return (
                                        <div className="lux-card p-4">
                                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> Liquidity
                                            </div>
                                            <div className={`text-lg font-bold ${l.color}`}>{l.label}</div>
                                            <div className="text-[10px] text-gray-400 mt-0.5">{l.sublabel}</div>
                                        </div>
                                    )
                                })()}
                            </div>

                            {/* Key Insights + Risk */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="lux-card p-5">
                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        Key Insights
                                    </div>
                                    <ul className="space-y-2.5">
                                        {result.keyInsights.map((insight, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                                <span>{insight}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="lux-card p-5">
                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                        Risk Factors
                                    </div>
                                    <ul className="space-y-2.5">
                                        {result.riskFactors.map((risk, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                                <span>{risk}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {result.seasonalNotes && (
                                        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 italic">
                                            📅 {result.seasonalNotes}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Comparables */}
                            {result.comparables.length > 0 && (
                                <div className="lux-card p-5">
                                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">
                                        Market Comparables ({result.comparables.length})
                                    </div>
                                    <div className="space-y-3">
                                        {result.comparables.map((comp, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors"
                                            >
                                                <div className="min-w-0 flex items-center gap-3 flex-1 pr-4">
                                                    {comp.previewImageUrl && !failedComparableImages[comp.previewImageUrl] ? (
                                                        <img
                                                            src={comp.previewImageUrl}
                                                            alt={comp.title !== FALLBACK_COMPARABLE_TITLE ? comp.title : `${result.brand} ${result.model} comparable`}
                                                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 bg-white shrink-0"
                                                            loading="lazy"
                                                            onError={() => {
                                                                setFailedComparableImages(prev => ({ ...prev, [comp.previewImageUrl!]: true }))
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white shrink-0 grid place-items-center text-[10px] text-gray-400 font-medium">
                                                            No image
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-medium text-gray-900 truncate">{comp.title}</div>
                                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                            <span>{comp.source}</span>
                                                            <span>·</span>
                                                            <span className="capitalize">{comp.condition}</span>
                                                            {comp.daysListed != null && (
                                                                <>
                                                                    <span>·</span>
                                                                    <span>{comp.daysListed}d listed</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-lg font-bold text-gray-900">{formatCurrency(comp.priceEur)}</span>
                                                    {comp.sourceUrl && (
                                                        <a
                                                            href={comp.sourceUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="text-center">
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                                    Powered by {result.provider} · {result.brand} {result.model}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Full-width: Trending + Competitor side by side ─── */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Trending Now */}
                <div className="lux-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-[12px] font-semibold text-lux-400 uppercase tracking-[0.06em]">
                            <Zap className="h-4 w-4 text-amber-500" />
                            Trending Now
                        </div>
                        <button
                            onClick={loadTrending}
                            disabled={isTrendingLoading}
                            className="text-[12px] text-lux-600 hover:text-lux-900 font-medium flex items-center gap-1 transition-colors"
                        >
                            {isTrendingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
                            Refresh
                        </button>
                    </div>

                    {trending ? (
                        <div className="space-y-1">
                            {trending.items.map((item, i) => {
                                const trendCfg = TREND_CONFIG[item.priceTrend as keyof typeof TREND_CONFIG] ?? TREND_CONFIG.stable
                                const TrendIcon = trendCfg.icon
                                return (
                                    <button
                                        key={i}
                                        onClick={() => quickResearch(item.brand, item.model)}
                                        className="w-full text-left flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-lux-50 transition-colors group"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-[13px] font-medium text-lux-800 truncate group-hover:text-lux-900 transition-colors">
                                                {item.brand} {item.model}
                                            </div>
                                            <div className="text-[11px] text-lux-400">{item.category}</div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-[13px] font-semibold text-lux-800">{formatCurrency(item.avgPriceEur)}</span>
                                            <TrendIcon className={`h-4 w-4 ${trendCfg.color}`} />
                                        </div>
                                    </button>
                                )
                            })}
                            <p className="text-[10px] text-lux-400 text-center pt-2 uppercase tracking-wider">
                                via {trending.provider} · Irish & EU · {new Date(trending.generatedAt).toLocaleTimeString()}
                            </p>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-lux-400">
                            {isTrendingLoading ? (
                                <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-lux-500" />
                            ) : (
                                <Zap className="h-6 w-6 mx-auto mb-2 opacity-20" />
                            )}
                            <p className="text-[13px]">{isTrendingLoading ? 'Loading trends…' : 'Click Refresh to load trends'}</p>
                        </div>
                    )}
                </div>

                {/* Competitor Activity */}
                <div className="lux-card p-6">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-lux-400 uppercase tracking-[0.06em] mb-1">
                        <Store className="h-4 w-4" />
                        Competitor Activity
                    </div>
                    <p className="text-[11px] text-lux-400 mb-4">Recent listings from Designer Exchange, Luxury Exchange, Siopella.</p>
                    {isCompetitorLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-lux-500" />
                        </div>
                    ) : competitorFeed && competitorFeed.items.length > 0 ? (
                        <div className="space-y-1 max-h-80 overflow-y-auto no-scrollbar">
                            {competitorFeed.items.map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-lux-50 transition-colors"
                                >
                                    <div className="min-w-0 flex-1 pr-2">
                                        <div className="text-[13px] font-medium text-lux-800 truncate">{item.title}</div>
                                        <div className="text-[11px] text-lux-400">{item.source}</div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[13px] font-semibold text-lux-800">{formatCurrency(item.priceEur)}</span>
                                        {item.sourceUrl && (
                                            <a
                                                href={item.sourceUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1 rounded-lg text-lux-400 hover:text-lux-700 transition-colors"
                                                aria-label="Open listing"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <p className="text-[10px] text-lux-400 text-center pt-2">
                                Updated {new Date(competitorFeed.generatedAt).toLocaleTimeString()}
                            </p>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-lux-400 text-[13px]">
                            No competitor feed available.
                        </div>
                    )}
                </div>
            </div>
        </PageLayout>
    )
}
