import { forwardRef } from 'react'
import { Search, ShoppingBag } from 'lucide-react'

/** Bag inside magnifying glass — "bag finder" icon for Sourcing nav. */
const BagFinderIcon = forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={className} aria-hidden {...props}>
      <span className="relative inline-flex h-full w-full items-center justify-center">
        <Search className="absolute inset-0 h-full w-full" strokeWidth={2} />
        <ShoppingBag className="relative h-[48%] w-[48%]" strokeWidth={2} />
      </span>
    </span>
  )
)
BagFinderIcon.displayName = 'BagFinderIcon'

export default BagFinderIcon
