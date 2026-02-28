/**
 * Market Research: AI-driven market intelligence for luxury goods.
 * Deep analysis of pricing trends, demand, competitive landscape.
 * Irish & EU market: Designer Exchange, Luxury Exchange, Siopella, Vestiaire.
 * @see docs/CODE_REFERENCE.md
 */
import { useState, useMemo, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
    Search,
    BarChart3,
    Sparkles,
    Loader2,
    ExternalLink,
    ChevronRight,
    Zap,
    History,
    Store,
    Bookmark,
    Star,
} from 'lucide-react'
import { apiGet, apiPost, apiPut, ApiError } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'
import { useServerStatus } from '../../lib/ServerStatusContext'
import { useResearchSession } from '../../lib/ResearchSessionContext'
import PageLayout from '../../components/layout/PageLayout'
import { PageHeader, TypewriterText } from '../../components/design-system'
import { FloatingInput, LuxSelect } from '../../components/design-system/Input'
import AiThinkingDots from '../../components/feedback/AiThinkingDots'
import Skeleton from '../../components/feedback/Skeleton'

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

import type { MarketComparable, MarketComparablePayload, MarketResearchResult, MarketResearchResultPayload } from './types'

// ─── Types ─────────────────────────────────────────────────────
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
    condition?: string
}

interface CompetitorFeedResult {
    items: CompetitorFeedItem[]
    generatedAt: string
}

interface MarketResearchFormData {
    brand: string
    model: string
    category: string
    condition: string
    colour: string
    year: string
    notes: string
    currentAskPriceEur: string
}

const DEFAULT_FORM_DATA: MarketResearchFormData = {
    brand: '',
    model: '',
    category: 'Handbag',
    condition: 'excellent',
    colour: '',
    year: '',
    notes: '',
    currentAskPriceEur: '',
}

const PREVIOUS_SEARCHES_KEY = 'luxselle_market_research_previous'
const PREVIOUS_SEARCHES_MAX = 6
const FADE_DELAY_CLASSES = [
    'fade-delay-0',
    'fade-delay-1',
    'fade-delay-2',
    'fade-delay-3',
    'fade-delay-4',
    'fade-delay-5',
    'fade-delay-6',
    'fade-delay-7',
    'fade-delay-8',
    'fade-delay-9',
    'fade-delay-10',
    'fade-delay-11',
    'fade-delay-12',
]

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

import MarketResearchResultPanel, { TREND_CONFIG } from './MarketResearchResultPanel'

// ─── Competitor feed helpers ───────────────────────────────────
const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
    'Designer Exchange': { label: 'DE', className: 'bg-blue-100 text-blue-700' },
    'Luxury Exchange':   { label: 'LE', className: 'bg-amber-100 text-amber-700' },
    'Siopella':          { label: 'S',  className: 'bg-emerald-100 text-emerald-700' },
}

function relativeDate(isoDate?: string): string | null {
    if (!isoDate) return null
    const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000)
    if (days <= 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
}

// ─── Helpers ───────────────────────────────────────────────────
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

// ─── Brand tiers for cross-brand suggestions ──────────────────
const BRAND_TIERS: Record<string, string[]> = {
    ultra:   ['Chanel', 'Hermès'],
    premium: ['Louis Vuitton', 'Dior', 'Gucci', 'Prada', 'Bottega Veneta', 'Fendi', 'Givenchy', 'Loewe'],
}

function generateSuggestions(brand: string, model: string): { brand: string; model: string }[] {
    const suggestions: { brand: string; model: string }[] = []

    const sameModels = (BRAND_MODELS[brand] ?? []).filter(m => m !== model)
    for (const m of sameModels.slice(0, 2)) {
        suggestions.push({ brand, model: m })
    }

    const tier = Object.values(BRAND_TIERS).find(brands => brands.includes(brand))
    if (tier) {
        const peer = tier.find(b => b !== brand && BRAND_MODELS[b]?.length)
        if (peer) suggestions.push({ brand: peer, model: BRAND_MODELS[peer][0] })
    }

    return suggestions.slice(0, 3)
}
// ═════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════
export default function MarketResearchView() {
    const [formData, setFormData] = useState<MarketResearchFormData>(DEFAULT_FORM_DATA)
    const {
        session: researchSession,
        startLoading: startResearchLoading,
        setSuccess: setResearchSuccess,
        setError: setResearchError,
        clear: clearResearchSession,
    } = useResearchSession<MarketResearchResult, MarketResearchFormData>('market-research')
    const [feedError, setFeedError] = useState<string | null>(null)
    const isLoading = researchSession.status === 'loading'
    const result = researchSession.status === 'success' ? (researchSession.result ?? null) : null
    const researchError = researchSession.status === 'error' ? (researchSession.error ?? 'Analysis failed') : null
    const error = researchError ?? feedError

    const [trending, setTrending] = useState<TrendingResult | null>(null)
    const [isTrendingLoading, setIsTrendingLoading] = useState(false)
    const [competitorFeed, setCompetitorFeed] = useState<CompetitorFeedResult | null>(null)
    const [isCompetitorLoading, setIsCompetitorLoading] = useState(false)
    const [competitorRefreshKey, setCompetitorRefreshKey] = useState(0)
    const [previousSearches, setPreviousSearches] = useState<{ brand: string; model: string }[]>([])

    const [savedId, setSavedId] = useState<string | null>(null)
    const [isSaved, setIsSaved] = useState(false)
    const [isStarred, setIsStarred] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

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
    }, [competitorRefreshKey])

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

    useEffect(() => {
        const persistedQuery = researchSession.query
        if (!persistedQuery) return
        setFormData((prev) => ({ ...prev, ...persistedQuery }))
    }, [researchSession.query])

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
        setFeedError(null)
        startResearchLoading(formData)
        try {
            const { data } = await apiPost<{ data: MarketResearchResultPayload }>('/market-research/analyse', {
                ...formData,
                currentAskPriceEur: formData.currentAskPriceEur ? Number(formData.currentAskPriceEur) : undefined,
            })
            const normalizedResult = normalizeMarketResearchResult({
                ...data,
                comparables: data.comparables.map(normalizeComparableImage),
            })
            setResearchSuccess(normalizedResult, formData)
            setSavedId(null)
            setIsSaved(false)
            setIsStarred(false)
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
            setResearchError(msg, formData)
            toast.error(msg)
        }
    }

    const handleSave = async () => {
        if (!result || isSaved) return
        setIsSaving(true)
        try {
            const { data } = await apiPost<{ data: { id: string; starred: boolean } }>('/saved-research', {
                brand: result.brand,
                model: result.model,
                category: formData.category,
                condition: formData.condition,
                result,
                starred: isStarred,
            })
            setSavedId(data.id)
            setIsSaved(true)
            setIsStarred(Boolean(data.starred))
            toast.success("Research saved")
        } catch (err) {
            toast.error("Failed to save research")
        } finally {
            setIsSaving(false)
        }
    }

    const handleToggleStar = async () => {
        if (isSaved && savedId) {
            try {
                const nextStarred = !isStarred
                await apiPut(`/saved-research/${savedId}`, { starred: nextStarred })
                setIsStarred(nextStarred)
                toast.success(nextStarred ? "Added to starred" : "Removed from starred")
            } catch {
                toast.error("Failed to update star")
            }
        } else {
            if (!result) return
            setIsSaving(true)
            try {
                const { data } = await apiPost<{ data: { id: string; starred: boolean } }>('/saved-research', {
                    brand: result.brand,
                    model: result.model,
                    category: formData.category,
                    condition: formData.condition,
                    result,
                    starred: true,
                })
                setSavedId(data.id)
                setIsSaved(true)
                setIsStarred(Boolean(data.starred))
                toast.success("Research saved & starred")
            } catch (err) {
                toast.error("Failed to save research")
            } finally {
                setIsSaving(false)
            }
        }
    }

    const loadTrending = async () => {
        setIsTrendingLoading(true)
        setFeedError(null)
        try {
            const { data } = await apiGet<{ data: TrendingResult }>('/market-research/trending')
            setTrending(data)
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to load trends'
            setFeedError(msg)
            toast.error(msg)
        } finally {
            setIsTrendingLoading(false)
        }
    }

    const loadCompetitorFeed = () => {
        setCompetitorRefreshKey((k) => k + 1)
    }

    const quickResearch = (brand: string, model: string) => {
        setFormData(prev => ({ ...prev, brand, model }))
        clearResearchSession()
    }

    const handleDismissError = () => {
        setFeedError(null)
        if (researchSession.status === 'error') {
            clearResearchSession()
        }
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
                        onClick={handleDismissError}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* ─── Quick-select chips ─── */}
            {(previousSearches.length > 0 || KEY_TRENDING_BAGS.length > 0) && (
                <div className="flex flex-nowrap overflow-x-auto no-scrollbar pb-2 items-center gap-2">
                    {previousSearches.length > 0 && (
                        <>
                            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-wider text-lux-400">
                                <History className="h-3 w-3" /> Recent
                            </span>
                            {previousSearches.map((p, i) => (
                                <button
                                    key={`prev-${p.brand}-${p.model}-${i}`}
                                    type="button"
                                    onClick={() => quickResearch(p.brand, p.model)}
                                    className="shrink-0 min-h-[44px] rounded-full border border-lux-200 bg-white px-3 py-2 sm:py-1 text-xs font-medium text-lux-700 hover:bg-lux-50 hover:border-lux-300 transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                                >
                                    {p.brand} {p.model}
                                </button>
                            ))}
                            <div className="mx-1 h-4 w-px bg-lux-200 shrink-0" />
                        </>
                    )}
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-500">
                        <Zap className="h-3 w-3" /> Trending
                    </span>
                    {KEY_TRENDING_BAGS.map(({ brand, model }) => (
                        <button
                            key={`trend-${brand}-${model}`}
                            type="button"
                            onClick={() => quickResearch(brand, model)}
                            className="shrink-0 min-h-[44px] rounded-full border border-amber-200 bg-amber-50/60 px-3 py-2 sm:py-1 text-xs font-medium text-lux-800 hover:bg-amber-100 transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
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
                                <label htmlFor="mr-brand" className="block text-xs font-medium text-lux-600 mb-1.5">Brand *</label>
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
                                        <label htmlFor="mr-model" className="block text-xs font-medium text-lux-600 mb-1.5">Model *</label>
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="mr-category" className="block text-xs font-medium text-lux-600 mb-1.5">Category *</label>
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
                                    <label htmlFor="mr-condition" className="block text-xs font-medium text-lux-600 mb-1.5">Condition *</label>
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
                                    leadingAdornment={<span className="text-sm font-medium">€</span>}
                                />
                                <p className="text-xs text-lux-400 mt-1">Optional — helps calibrate analysis</p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !formData.brand || !formData.model}
                                className="lux-btn-primary w-full py-3 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                            >
                                {isLoading ? (
                                    <><AiThinkingDots /> Researching...</>
                                ) : (
                                    <><Sparkles className="h-4 w-4" /> Research Market</>
                                )}
                            </button>
                            {isLoading && (
                                <div className="relative h-1 w-full overflow-hidden rounded-full bg-lux-100 mt-2">
                                    <div className="absolute inset-y-0 left-0 w-1/4 rounded-full bg-lux-gold animate-progress-indeterminate" />
                                </div>
                            )}
                        </form>
                    </div>
                </div>

                {/* ─── Results panel ─── */}
                <div>
                    {!result ? (
                        <div className="lux-card border-dashed border-2 min-h-[500px] flex flex-col items-center justify-center text-lux-400">
                            <BarChart3 className="h-14 w-14 mb-4 opacity-20 animate-float" />
                            <p className="text-lg font-medium">Ready to research</p>
                            <p className="text-sm opacity-60 mt-1 max-w-sm text-center">Select a product or use a quick-select above. Market data from Irish & EU suppliers (Designer Exchange, Luxury Exchange, Siopella, Vestiaire).</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* AI Executive Summary */}
                            <div className="relative lux-card p-5 overflow-hidden border-l-2 lux-market-accent-border">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-lux-400 uppercase tracking-wide mb-2">
                                    <Sparkles className="h-3.5 w-3.5 text-lux-gold" />
                                    AI Analysis
                                </div>
                                <TypewriterText
                                    text={result.marketSummary}
                                    speed={20}
                                    className="text-sm text-lux-700"
                                />
                            </div>

                            <MarketResearchResultPanel 
                                result={result} 
                                headerActions={
                                    <div className="flex items-center gap-2 border-l border-lux-200/50 pl-6">
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={isSaving || isSaved}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none ${
                                                isSaved 
                                                    ? 'bg-lux-100 text-lux-800' 
                                                    : 'bg-white border border-lux-200 text-lux-700 hover:bg-lux-50'
                                            }`}
                                        >
                                            {isSaving ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-lux-800' : ''}`} />
                                            )}
                                            {isSaved ? 'Saved' : 'Save'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleToggleStar}
                                            disabled={isSaving}
                                            className={`p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold/30 ${
                                                isStarred ? 'text-lux-gold bg-lux-50' : 'text-lux-400 hover:text-lux-600 hover:bg-lux-50'
                                            }`}
                                            title={isStarred ? "Remove star" : "Star this research"}
                                        >
                                            <Star className={`h-5 w-5 ${isStarred ? 'fill-lux-gold' : ''}`} />
                                        </button>
                                    </div>
                                }
                            />

                            {/* Smart Suggestions */}
                            {(() => {
                                const suggestions = generateSuggestions(result.brand, result.model)
                                if (suggestions.length === 0) return null
                                return (
                                    <div className="lux-card p-5">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-lux-400 uppercase tracking-wide mb-3">
                                            <Sparkles className="h-3.5 w-3.5 text-lux-gold" />
                                            AI suggests also checking
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {suggestions.map((s, i) => (
                                                <button
                                                    key={`${s.brand}-${s.model}`}
                                                    type="button"
                                                    onClick={() => quickResearch(s.brand, s.model)}
                                                    className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-lux-200 px-3 py-1.5 text-xs font-medium text-lux-700 transition-all hover:bg-lux-50 hover:border-lux-300 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none animate-fade-in ${FADE_DELAY_CLASSES[Math.min(i, FADE_DELAY_CLASSES.length - 1)]}`}
                                                >
                                                    <Sparkles className="h-3 w-3 text-lux-gold" />
                                                    {s.brand} {s.model}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })()}
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
                            className="text-xs text-lux-600 hover:text-lux-900 font-medium flex items-center gap-1 transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
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
                                        className="group flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-lux-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                                    >
                                        <div className="min-w-0">
                                            <div className="text-xs font-medium text-lux-800 truncate group-hover:text-lux-900 transition-colors">
                                                {item.brand} {item.model}
                                            </div>
                                            <div className="text-xs text-lux-400">{item.category}</div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-xs font-semibold text-lux-800">{formatCurrency(item.avgPriceEur)}</span>
                                            <TrendIcon className={`h-4 w-4 ${trendCfg.color}`} />
                                        </div>
                                    </button>
                                )
                            })}
                            <p className="text-xs text-lux-400 text-center pt-2 uppercase tracking-wider">
                                via {trending.provider} · Irish & EU · {new Date(trending.generatedAt).toLocaleTimeString()}
                            </p>
                        </div>
                    ) : isTrendingLoading ? (
                        <div className="space-y-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center justify-between py-2.5 px-3">
                                    <div className="space-y-1.5 flex-1">
                                        <Skeleton className="h-3.5 w-32" />
                                        <Skeleton className="h-2.5 w-20" />
                                    </div>
                                    <Skeleton className="h-3.5 w-16" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-lux-400">
                            <Zap className="h-6 w-6 mx-auto mb-2 opacity-20" />
                            <p className="text-xs">Click Refresh to load trends</p>
                        </div>
                    )}
                </div>

                {/* Competitor Activity */}
                <div className="lux-card p-6">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-lux-400 uppercase tracking-[0.06em] mb-1">
                        <Store className="h-4 w-4" />
                        Competitor Activity
                    </div>
                    <p className="text-xs text-lux-400 mb-4">Recent listings from Designer Exchange, Luxury Exchange, Siopella.</p>
                    {isCompetitorLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center justify-between py-2.5 px-3">
                                    <div className="space-y-1.5 flex-1">
                                        <Skeleton className="h-3.5 w-40" />
                                        <Skeleton className="h-2.5 w-24" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-3.5 w-14" />
                                        <Skeleton className="h-8 w-8 rounded-lg" variant="rect" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : competitorFeed && competitorFeed.items.length > 0 ? (
                        <div className="space-y-1 max-h-80 overflow-y-auto no-scrollbar">
                            {competitorFeed.items.map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-lux-50 transition-colors"
                                >
                                    <div className="min-w-0 flex-1 pr-2">
                                        <div className="text-xs font-medium text-lux-800 truncate">{item.title}</div>
                                        <div className="text-xs text-lux-400">{item.source}</div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs font-semibold text-lux-800">{formatCurrency(item.priceEur)}</span>
                                        {item.sourceUrl && (
                                            <a
                                                href={item.sourceUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 text-lux-400 transition-colors hover:text-lux-700 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                                                aria-label="Open listing"
                                                title={`Open listing: ${item.title}`}
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <p className="text-xs text-lux-400 text-center pt-2">
                                Updated {new Date(competitorFeed.generatedAt).toLocaleTimeString()}
                            </p>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-lux-400 text-xs">
                            No competitor feed available.
                        </div>
                    )}
                </div>
            </div>
        </PageLayout>
    )
}
