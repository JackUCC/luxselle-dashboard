import { useState } from 'react'
import {
    TrendingUp,
    Minus,
    TrendingDown,
    ArrowDownRight,
    ArrowUpRight,
    Clock,
    CheckCircle2,
    ShieldCheck,
    AlertTriangle,
    ExternalLink,
} from 'lucide-react'
import { formatCurrency } from '../../lib/formatters'
import { ConfidenceGauge } from '../../components/design-system'
import type { MarketResearchResult, MarketComparable } from './types'

export const DEMAND_CONFIG = {
    very_high: { label: 'Very High', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', pct: 95 },
    high: { label: 'High', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', pct: 75 },
    moderate: { label: 'Moderate', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', pct: 50 },
    low: { label: 'Low', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', pct: 25 },
    very_low: { label: 'Very Low', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', pct: 10 },
}

export const TREND_CONFIG = {
    rising: { label: 'Rising', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    stable: { label: 'Stable', icon: Minus, color: 'text-lux-700', bg: 'bg-lux-200/80' },
    declining: { label: 'Declining', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
}

export const RECOMMENDATION_CONFIG = {
    strong_buy: { label: 'Strong Buy', color: 'text-emerald-700', bg: 'bg-gradient-to-r from-emerald-50 to-green-50', border: 'border-emerald-300', icon: '🟢' },
    buy: { label: 'Buy', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: '🟡' },
    hold: { label: 'Hold', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: '🟠' },
    pass: { label: 'Pass', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: '🔴' },
}

export const LIQUIDITY_CONFIG = {
    fast_moving: { label: 'Fast Moving', sublabel: '< 14 days avg', color: 'text-emerald-600' },
    moderate: { label: 'Moderate', sublabel: '14-30 days avg', color: 'text-amber-600' },
    slow_moving: { label: 'Slow Moving', sublabel: '30+ days avg', color: 'text-red-600' },
}

const FALLBACK_COMPARABLE_TITLE = 'Untitled listing'

interface MarketResearchResultPanelProps {
    result: MarketResearchResult
    headerActions?: React.ReactNode
}

export default function MarketResearchResultPanel({ result, headerActions }: MarketResearchResultPanelProps) {
    const [failedComparableImages, setFailedComparableImages] = useState<Record<string, boolean>>({})

    return (
        <div className="space-y-5">
            {/* Recommendation Banner */}
            {(() => {
                const rec = RECOMMENDATION_CONFIG[result.recommendation]
                return (
                    <div className={`lux-card overflow-hidden ${rec.bg} border ${rec.border}`}>
                        <div className="p-5 flex items-center justify-between">
                            <div>
                                <div className="text-xs text-lux-500 uppercase tracking-wide mb-1">Recommendation</div>
                                <div className={`text-xl sm:text-2xl font-display font-bold ${rec.color} flex items-center gap-2`}>
                                    <span>{rec.icon}</span> {rec.label}
                                </div>
                                <div className="text-sm text-lux-600 mt-1.5 max-w-md">{result.marketSummary}</div>
                            </div>
                            <div className="flex items-center gap-6 text-right shrink-0">
                                <ConfidenceGauge value={result.confidence} />
                                {headerActions && (
                                    <div className="flex items-center">
                                        {headerActions}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* Price Intelligence */}
            <div className="lux-card p-5">
                <div className="text-xs font-medium text-lux-400 uppercase tracking-wide mb-4">Price Intelligence</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="text-xs text-lux-500 mb-1">Market Value</div>
                        <div className="text-xl font-bold text-lux-900">{formatCurrency(result.estimatedMarketValueEur)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-lux-500 mb-1 flex items-center justify-center gap-1">
                            <ArrowDownRight className="h-3 w-3 text-green-600" /> Buy At
                        </div>
                        <div className="text-xl font-bold text-green-700">{formatCurrency(result.suggestedBuyPriceEur)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-lux-500 mb-1 flex items-center justify-center gap-1">
                            <ArrowUpRight className="h-3 w-3 text-lux-700" /> Sell At
                        </div>
                        <div className="text-xl font-bold text-lux-800">{formatCurrency(result.suggestedSellPriceEur)}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs text-lux-500 mb-1">Price Range</div>
                        <div className="text-sm font-semibold text-lux-700">
                            {formatCurrency(result.priceRangeLowEur)} – {formatCurrency(result.priceRangeHighEur)}
                        </div>
                    </div>
                </div>

                {/* Price range bar */}
                <div className="mt-4 px-2">
                    <div className="relative h-2 bg-lux-100 rounded-full overflow-hidden">
                        <div
                            className="absolute h-full bg-gradient-to-r from-green-400 via-amber-400 to-lux-gold rounded-full"
                            style={{
                                left: `${((result.priceRangeLowEur / result.priceRangeHighEur) * 80)}%`,
                                width: `${Math.max(20, 100 - (result.priceRangeLowEur / result.priceRangeHighEur) * 80)}%`
                            }}
                        />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-lux-400">
                        <span>{formatCurrency(result.priceRangeLowEur)}</span>
                        <span>{formatCurrency(result.priceRangeHighEur)}</span>
                    </div>
                </div>
            </div>

            {/* Market Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Demand */}
                {(() => {
                    const d = DEMAND_CONFIG[result.demandLevel]
                    return (
                        <div className={`lux-card p-5 border ${d.border} ${d.bg}`}>
                            <div className="text-xs text-lux-500 uppercase tracking-wide mb-2">Demand</div>
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
                        <div className={`lux-card p-5 ${t.bg}`}>
                            <div className="text-xs text-lux-500 uppercase tracking-wide mb-2">Price Trend</div>
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
                        <div className="lux-card p-5">
                            <div className="text-xs text-lux-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Liquidity
                            </div>
                            <div className={`text-lg font-bold ${l.color}`}>{l.label}</div>
                            <div className="text-xs text-lux-400 mt-0.5">{l.sublabel}</div>
                        </div>
                    )
                })()}
            </div>

            {/* Key Insights + Risk */}
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="lux-card p-5">
                    <div className="flex items-center gap-2 text-xs font-medium text-lux-400 uppercase tracking-wide mb-3">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Key Insights
                    </div>
                    <ul className="space-y-2.5">
                        {result.keyInsights.map((insight, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-lux-700">
                                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{insight}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="lux-card p-5">
                    <div className="flex items-center gap-2 text-xs font-medium text-lux-400 uppercase tracking-wide mb-3">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        Risk Factors
                    </div>
                    <ul className="space-y-2.5">
                        {result.riskFactors.map((risk, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-lux-700">
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <span>{risk}</span>
                            </li>
                        ))}
                    </ul>
                    {result.seasonalNotes && (
                        <div className="mt-3 pt-3 border-t border-lux-100 text-xs text-lux-500 italic">
                            📅 {result.seasonalNotes}
                        </div>
                    )}
                </div>
            </div>

            {/* Comparables */}
            {result.comparables.length > 0 && (
                <div className="lux-card p-5">
                    <div className="text-xs font-medium text-lux-400 uppercase tracking-wide mb-4">
                        Market Comparables ({result.comparables.length})
                    </div>
                    <div className="space-y-3">
                        {result.comparables.map((comp, i) => (
                            <div
                                key={i}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 py-3 px-4 rounded-lux-card bg-lux-50 border border-lux-100 hover:border-lux-200 transition-colors"
                            >
                                <div className="min-w-0 flex items-center gap-3 w-full sm:flex-1 pr-0 sm:pr-4">
                                    {comp.previewImageUrl && !failedComparableImages[comp.previewImageUrl] ? (
                                        <img
                                            src={comp.previewImageUrl}
                                            alt={comp.title !== FALLBACK_COMPARABLE_TITLE ? comp.title : `${result.brand} ${result.model} comparable`}
                                            className="w-12 h-12 rounded-lg object-cover border border-lux-200 bg-white shrink-0"
                                            loading="lazy"
                                            onError={() => {
                                                setFailedComparableImages(prev => ({ ...prev, [comp.previewImageUrl!]: true }))
                                            }}
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg border border-lux-200 bg-white shrink-0 grid place-items-center text-xs text-lux-400 font-medium">
                                            No image
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-lux-900 truncate">{comp.title}</div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-lux-500">
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
                                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                                    <span className="text-lg font-bold text-lux-900">{formatCurrency(comp.priceEur)}</span>
                                    {comp.sourceUrl && (
                                        <a
                                            href={comp.sourceUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-1.5 rounded-lg text-lux-400 hover:text-lux-gold hover:bg-lux-50 transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                                            aria-label={`Open comparable listing: ${comp.title}`}
                                            title={`Open listing: ${comp.title}`}
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
                <p className="text-xs text-lux-400 uppercase tracking-widest">
                    Powered by {result.provider} · {result.brand} {result.model}
                </p>
            </div>
        </div>
    )
}
