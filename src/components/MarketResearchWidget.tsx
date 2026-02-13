import { useState } from 'react'
import { Search, ExternalLink, ShoppingBag, Tag } from 'lucide-react'

export default function MarketResearchWidget() {
    const [searchTerm, setSearchTerm] = useState('')

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (!searchTerm.trim()) return
        // Open Google Shopping by default on enter
        window.open(`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchTerm)}`, '_blank')
    }

    const openLink = (url: string) => {
        if (!searchTerm.trim()) return
        window.open(url, '_blank')
    }

    return (
        <div className="lux-card p-6 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-6">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                    <Search className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900 uppercase tracking-wider text-xs">Market Pricing Research</h3>
            </div>

            <form onSubmit={handleSearch} className="mb-6">
                <div className="relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="e.g. Chanel Classic Flap"
                        className="lux-input pr-10"
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                </div>
            </form>

            <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">One-Click Search</p>

                <button
                    onClick={() => openLink(`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchTerm)}`)}
                    disabled={!searchTerm}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-gray-700">Google Shopping</span>
                    </div>
                    <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                    onClick={() => openLink(`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}&LH_Sold=1&LH_Complete=1`)}
                    disabled={!searchTerm}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    <div className="flex items-center gap-3">
                        <Tag className="h-4 w-4 text-red-500" />
                        <span className="font-medium text-gray-700">eBay Sold Items</span>
                    </div>
                    <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                    onClick={() => openLink(`https://www.vestiairecollective.com/search/?q=${encodeURIComponent(searchTerm)}`)}
                    disabled={!searchTerm}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-4 w-4 flex items-center justify-center font-serif font-bold text-orange-900 bg-orange-100 rounded-sm text-[10px]">V</div>
                        <span className="font-medium text-gray-700">Vestiaire Collective</span>
                    </div>
                    <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>

            <div className="mt-auto pt-4 text-[10px] text-gray-400 text-center">
                External market data links
            </div>
        </div>
    )
}
