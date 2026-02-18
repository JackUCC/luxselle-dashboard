/**
 * Quick links to auction sites: AUCNET (Brand Auction) and Star Buyers. Opens in new tab.
 */
import { ExternalLink, Gavel } from 'lucide-react'

const AUCTION_SITES = [
  {
    name: 'AUCNET',
    description: 'Brand Auction',
    url: 'https://member.brand-auc.com/login',
  },
  {
    name: 'Star Buyers',
    description: 'Global Auction',
    url: 'https://www.starbuyers-global-auction.com/home',
  },
] as const

export default function AuctionLinksWidget() {
  return (
    <div
      className="lux-card p-6 animate-bento-enter"
      style={{ '--stagger': 4 } as React.CSSProperties}
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-xl bg-violet-50 p-2 text-violet-600 border border-violet-100">
          <Gavel className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Auction sites</h3>
      </div>
      <div className="space-y-3">
        {AUCTION_SITES.map((site) => (
          <a
            key={site.url}
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-all hover:border-violet-200 hover:bg-violet-50/50 hover:shadow-sm"
          >
            <div className="min-w-0">
              <span className="block text-sm font-medium text-gray-900">{site.name}</span>
              <span className="block text-xs text-gray-500">{site.description}</span>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          </a>
        ))}
      </div>
    </div>
  )
}
