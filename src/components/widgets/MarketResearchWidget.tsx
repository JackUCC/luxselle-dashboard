import { useState } from 'react'
import { Search, ExternalLink, ShoppingBag, Tag } from 'lucide-react'

export default function MarketResearchWidget() {
    const [searchTerm, setSearchTerm] = useState('')

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (!searchTerm.trim()) return
        window.open(`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchTerm)}`, '_blank')
    }

    const openLink = (url: string) => {
        if (!searchTerm.trim()) return
        window.open(url, '_blank')
    }

    return (
        <div className="lux-card p-6 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-6">
                <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400 border border-indigo-500/20">
                    <Search className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-200 uppercase tracking-wider text-xs">Market Pricing</h3>
            </div>

            <form onSubmit={handleSearch} className="mb-6">
                <div className="relative group">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="e.g. Chanel Classic Flap"
                        className="lux-input pr-10"
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1 transition-colors"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                </div>
            </form>

            <div className="space-y-2">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">One-Click Search</p>

                <button
                    onClick={() => openLink(`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchTerm)}`)}
                    disabled={!searchTerm}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all text-left disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="h-4 w-4 text-blue-400" />
                        <span className="font-medium text-gray-300">Google Shopping</span>
                    </div>
                    <ExternalLink className="h-3 w-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                    onClick={() => openLink(`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}&LH_Sold=1&LH_Complete=1`)}
                    disabled={!searchTerm}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all text-left disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                    <div className="flex items-center gap-3">
                        <Tag className="h-4 w-4 text-rose-400" />
                        <span className="font-medium text-gray-300">eBay Sold Items</span>
                    </div>
                    <ExternalLink className="h-3 w-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                    onClick={() => openLink(`https://www.vestiairecollective.com/search/?q=${encodeURIComponent(searchTerm)}`)}
                    disabled={!searchTerm}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all text-left disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-4 w-4 flex items-center justify-center font-serif font-bold text-amber-400 bg-amber-500/10 rounded-sm text-[10px]">V</div>
                        <span className="font-medium text-gray-300">Vestiaire Collective</span>
                    </div>
                    <ExternalLink className="h-3 w-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>

            <div className="mt-auto pt-4 text-[10px] text-gray-600 text-center">
                External market data links
            </div>
        </div>
    )
}
