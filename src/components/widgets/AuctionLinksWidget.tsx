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
        <div className="rounded-xl bg-violet-50/70 p-2 text-violet-500">
          <Gavel className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-lux-800">Auction sites</h3>
      </div>
      <div className="space-y-3">
        {AUCTION_SITES.map((site) => (
          <a
            key={site.url}
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 rounded-xl border border-black/[0.04] bg-white px-4 py-3 text-left transition-colors hover:border-violet-200 hover:bg-violet-50/40"
          >
            <div className="min-w-0">
              <span className="block text-sm font-medium text-lux-800">{site.name}</span>
              <span className="block text-xs text-lux-600">{site.description}</span>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          </a>
        ))}
      </div>
    </div>
  )
}
