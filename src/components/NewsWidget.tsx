import { useEffect, useState } from 'react'
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react'

interface NewsItem {
    title: string
    pubDate: string
    link: string
    guid: string
    author: string
    thumbnail: string
    description: string
}

export default function NewsWidget() {
    const [news, setNews] = useState<NewsItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Using a public RSS to JSON bridge
    // Feed: Business of Fashion (BoF) or similar. Using a reliable reliable fashion feed.
    // Example: Vogue Business or similar public feed.
    const RSS_URL = 'https://www.voguebusiness.com/feed/rss'
    // API to convert RSS to JSON
    const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`

    const fetchNews = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(API_URL)
            if (!res.ok) throw new Error('Failed to load news')
            const data = await res.json()

            if (data.status === 'ok') {
                setNews(data.items.slice(0, 4)) // Top 4 stories
            } else {
                throw new Error('News feed currently unavailable')
            }
        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.error(err)
            setError('Could not load industry news')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchNews()
    }, [])

    return (
        <div className="lux-card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-stone-100 p-2 text-stone-800">
                        <Newspaper className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 uppercase tracking-wider text-xs">Luxury Industry News</h3>
                </div>
                <button
                    onClick={fetchNews}
                    disabled={loading}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    title="Refresh news"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {error ? (
                    <div className="text-center text-sm text-gray-400 py-8 italic">{error}</div>
                ) : loading ? (
                    <div className="space-y-4 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-3">
                                <div className="h-16 w-16 bg-gray-100 rounded-lg shrink-0"></div>
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-3 bg-gray-100 rounded w-full"></div>
                                    <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {news.map((item) => (
                            <a
                                key={item.guid}
                                href={item.link}
                                target="_blank"
                                rel="noreferrer"
                                className="flex gap-3 group hover:bg-gray-50 -mx-2 p-2 rounded-lg transition-colors"
                            >
                                {/* Thumbnail if available, else fallback */}
                                <div className="h-16 w-16 bg-gray-200 rounded-lg overflow-hidden shrink-0 border border-gray-100 text-gray-300 flex items-center justify-center">
                                    {item.thumbnail ? (
                                        <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <Newspaper className="h-6 w-6" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug group-hover:text-stone-600 transition-colors">
                                        {item.title}
                                    </h4>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(item.pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                        <ExternalLink className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-[10px] text-gray-400 text-center">
                Powered by Vogue Business RSS
            </div>
        </div>
    )
}
