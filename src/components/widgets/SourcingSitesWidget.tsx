import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import SectionLabel from '../design-system/SectionLabel'

const SOURCING_SITES = [
  { name: 'AUCNET', url: 'https://member.brand-auc.com/login' },
  { name: 'Star Buyers', url: 'https://www.starbuyers-global-auction.com/home' },
]

export default function SourcingSitesWidget() {
  return (
    <div
      className="lux-card p-6 animate-bento-enter"
      style={{ '--stagger': 7 } as React.CSSProperties}
    >
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>Sourcing Sites</SectionLabel>
        <Link
          to="/sourcing"
          className="rounded-md p-1 text-lux-400 transition-colors hover:text-lux-600"
          aria-label="View sourcing page"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-1">
        {SOURCING_SITES.map((site) => (
          <a
            key={site.url}
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-medium text-lux-700 transition-colors hover:bg-lux-50"
          >
            {site.name}
            <ChevronRight className="h-3.5 w-3.5 text-lux-300" />
          </a>
        ))}
      </div>
    </div>
  )
}
