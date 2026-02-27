import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, Lightbulb } from 'lucide-react'
import { apiPost } from '../../lib/api'
import type { KPIs, ProfitSummary } from '../../types/dashboard'
import toast from 'react-hot-toast'

interface AiInsightsWidgetProps {
    kpis: KPIs | null
    profit: ProfitSummary | null
}

interface BusinessInsights {
    insights: string[]
    generatedAt: string
}

export default function AiInsightsWidget({ kpis, profit }: AiInsightsWidgetProps) {
    const [insights, setInsights] = useState<BusinessInsights | null>(null)
    const [loading, setLoading] = useState(false)
    const [hasGenerated, setHasGenerated] = useState(false)

    const generateInsights = async () => {
        if (!kpis || loading) return

        setLoading(true)
        try {
            const response = await apiPost<{ data: BusinessInsights }>('/ai/insights', {
                kpis: {
                    ...kpis,
                    revenue: profit?.totalRevenue,
                    margin: profit?.avgMarginPct
                }
            })
            setInsights(response.data)
            setHasGenerated(true)
            toast.success('AI Insights generated')
        } catch (error) {
            console.error(error)
            toast.error('Failed to generate insights')
        } finally {
            setLoading(false)
        }
    }

    // Auto-generate on first load if we have data and haven't generated yet?
    // Or simpler: just let user click. Let's start with user click to save tokens/cost.

    if (!kpis) return null

    return (
        <div className="lux-card relative overflow-hidden p-6">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-gradient-to-br from-amber-500/10 to-lux-gold/10 blur-xl" />

            <div className="relative flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-lux-gold/90 p-2 text-white shadow-sm">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <h3 className="font-display font-semibold text-lux-900">AI Business Insights</h3>
                </div>

                <button
                    onClick={generateInsights}
                    disabled={loading}
                    className="group flex items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100/80 disabled:opacity-50 transition-all"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
                    {loading ? 'Analyzing...' : insights ? 'Refresh' : 'Generate'}
                </button>
            </div>

            {!insights && !loading && (
                <div className="flex flex-col items-center justify-center py-6 text-center text-sm text-lux-500 bg-lux-50/80 rounded-xl border border-dashed border-lux-200">
                    <Lightbulb className="h-8 w-8 text-lux-300 mb-2" />
                    <p>Click Generate to analyze your inventory & sales data.</p>
                </div>
            )}

            {loading && !insights && (
                <div className="space-y-3 py-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-lux-100" />
                    <div className="h-4 w-full animate-pulse rounded bg-lux-100" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-lux-100" />
                </div>
            )}

            {insights && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {insights.insights.map((insight, i) => (
                        <div key={i} className="flex gap-3 items-start text-sm text-lux-700 bg-white/60 rounded-lg p-2 border border-lux-200/60">
                            <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lux-gold" />
                            <p className="leading-relaxed">{insight}</p>
                        </div>
                    ))}
                    <div className="text-[10px] text-lux-400 pt-2 text-right">
                        Generated {new Date(insights.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            )}
        </div>
    )
}
