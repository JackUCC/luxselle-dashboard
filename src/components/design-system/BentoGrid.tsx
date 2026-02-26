import type { ReactNode } from 'react'

interface BentoGridProps {
  children: ReactNode
  className?: string
  columns?: 2 | 3
}

export default function BentoGrid({
  children,
  className = '',
  columns = 3,
}: BentoGridProps) {
  const colClass = columns === 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div className={`grid gap-4 ${colClass} ${className}`.trim()}>
      {children}
    </div>
  )
}
