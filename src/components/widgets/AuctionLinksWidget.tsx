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
      className="lux-card p-5 animate-bento-enter"
      style={{ '--stagger': 4 } as React.CSSProperties}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-violet-50 p-1.5 text-violet-500 border border-violet-100">
          <Gavel className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-xs font-semibold text-lux-800">Auction sites</h3>
      </div>
      <div className="space-y-2">
        {AUCTION_SITES.map((site) => (
          <a
            key={site.url}
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 rounded-lg border border-lux-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-violet-200 hover:bg-violet-50/40 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            <div className="min-w-0">
              <span className="block text-xs font-medium text-lux-800">{site.name}</span>
              <span className="block text-xs text-lux-500">{site.description}</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-lux-400" aria-hidden />
          </a>
        ))}
      </div>
    </div>
  )
}
