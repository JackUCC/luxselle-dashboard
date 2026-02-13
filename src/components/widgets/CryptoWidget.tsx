import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Coins } from 'lucide-react'

interface CryptoAsset {
    id: string
    name: string
    symbol: string
    priceUsd: string
    changePercent24Hr: string
}

interface SparklineData {
    priceUsd: string
    time: number
}

const TARGET_ASSETS = ['bitcoin', 'ethereum', 'solana']

const CRYPTO_ICONS: Record<string, string> = {
    bitcoin: '₿',
    ethereum: 'Ξ',
    solana: '◎',
}

const CRYPTO_COLORS: Record<string, { gradient: string; glow: string; stroke: string }> = {
    bitcoin: { gradient: 'from-amber-500/20 to-orange-500/10', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]', stroke: '#F59E0B' },
    ethereum: { gradient: 'from-blue-500/20 to-indigo-500/10', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.2)]', stroke: '#6366F1' },
    solana: { gradient: 'from-violet-500/20 to-purple-500/10', glow: 'shadow-[0_0_15px_rgba(139,92,246,0.2)]', stroke: '#8B5CF6' },
}

function MiniSparkline({ data, color, width = 80, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) {
    if (data.length < 2) return null
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((val - min) / range) * height
        return `${x},${y}`
    })

    const gradientId = `spark-${color.replace('#', '')}`

    return (
        <svg width={width} height={height} className="overflow-visible">
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            {/* Fill area */}
            <path
                d={`M0,${height} L${points.join(' L')} L${width},${height} Z`}
                fill={`url(#${gradientId})`}
            />
            {/* Line */}
            <polyline
                points={points.join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export default function CryptoWidget() {
    const [assets, setAssets] = useState<CryptoAsset[]>([])
    const [sparklines, setSparklines] = useState<Record<string, number[]>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchCrypto = async () => {
        setLoading(true)
        setError(null)
        try {
            // Fetch prices
            const ids = TARGET_ASSETS.join(',')
            const res = await fetch(`https://api.coincap.io/v2/assets?ids=${ids}`)
            if (!res.ok) throw new Error('Failed to fetch crypto data')
            const json = await res.json()
            setAssets(json.data)

            // Fetch 24h sparkline for each
            const sparkData: Record<string, number[]> = {}
            const now = Date.now()
            const oneDayAgo = now - 24 * 60 * 60 * 1000

            await Promise.all(
                TARGET_ASSETS.map(async (id) => {
                    try {
                        const histRes = await fetch(
                            `https://api.coincap.io/v2/assets/${id}/history?interval=h1&start=${oneDayAgo}&end=${now}`
                        )
                        if (histRes.ok) {
                            const histJson = await histRes.json()
                            sparkData[id] = (histJson.data as SparklineData[]).map((d) => parseFloat(d.priceUsd))
                        }
                    } catch {
                        // Sparkline is optional, fail silently
                    }
                })
            )
            setSparklines(sparkData)
        } catch (err) {
            setError('Crypto data unavailable')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCrypto()
        const interval = setInterval(fetchCrypto, 5 * 60 * 1000) // 5 min refresh
        return () => clearInterval(interval)
    }, [])

    const formatPrice = (price: string) => {
        const num = parseFloat(price)
        if (num >= 1000) return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
        if (num >= 1) return `$${num.toFixed(2)}`
        return `$${num.toFixed(4)}`
    }

    return (
        <div className="lux-card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-violet-500/10 p-2 text-violet-400 border border-violet-500/20">
                        <Coins className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-200 uppercase tracking-wider text-xs">Crypto</h3>
                </div>
                <button
                    onClick={fetchCrypto}
                    disabled={loading}
                    className="text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-50"
                    title="Refresh crypto"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-3">
                {error ? (
                    <div className="text-center text-sm text-rose-400 py-2 bg-rose-500/10 rounded-xl border border-rose-500/20">{error}</div>
                ) : loading && assets.length === 0 ? (
                    <div className="space-y-3 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-white/[0.04] rounded-xl w-full" />
                        ))}
                    </div>
                ) : (
                    assets.map((asset) => {
                        const change = parseFloat(asset.changePercent24Hr)
                        const isPositive = change >= 0
                        const colors = CRYPTO_COLORS[asset.id] || CRYPTO_COLORS.bitcoin
                        const TrendIcon = isPositive ? TrendingUp : TrendingDown

                        return (
                            <div key={asset.id} className={`flex items-center justify-between p-3 rounded-xl bg-gradient-to-r ${colors.gradient} border border-white/[0.06] transition-all hover:border-white/[0.1] ${colors.glow}`}>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-lg font-bold text-gray-200 border border-white/[0.06]">
                                        {CRYPTO_ICONS[asset.id] || asset.symbol.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-200 text-sm">{asset.name}</div>
                                        <div className="text-[10px] text-gray-500 uppercase">{asset.symbol}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Sparkline */}
                                    {sparklines[asset.id] && sparklines[asset.id].length > 2 && (
                                        <MiniSparkline data={sparklines[asset.id]} color={colors.stroke} />
                                    )}

                                    <div className="text-right">
                                        <div className="font-bold text-gray-100 font-mono text-sm">
                                            {formatPrice(asset.priceUsd)}
                                        </div>
                                        <div className={`flex items-center justify-end gap-0.5 text-[10px] font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            <TrendIcon className="h-3 w-3" />
                                            <span>{isPositive ? '+' : ''}{change.toFixed(2)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.06] text-[10px] text-gray-600 text-center">
                Powered by CoinCap • Auto-refreshes every 5min
            </div>
        </div>
    )
}
