import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import SectionLabel from './SectionLabel'

export interface StatCardProps {
  /** Short label (e.g. "Inventory Cost") */
  label: ReactNode
  /** Primary value display (e.g. animated number) */
  value: ReactNode
  /** Optional secondary line or badge below value */
  secondary?: ReactNode
  /** Click navigates to this path (card becomes a link) */
  href?: string
  /** Click handler (card becomes a button when onClick provided, unless href takes precedence) */
  onClick?: () => void
  /** Use warm accent background */
  accent?: boolean
  /** Stagger index for animate-bento-enter */
  stagger?: number
  className?: string
}

export default function StatCard({
  label,
  value,
  secondary,
  href,
  onClick,
  accent = false,
  stagger = 0,
  className = '',
}: StatCardProps) {
  const baseClasses = accent ? 'lux-card-accent' : 'lux-card'
  const interactive = Boolean(href || onClick)
  const sharedClasses = [
    baseClasses,
    'p-6 animate-bento-enter',
    interactive && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold focus-visible:ring-offset-2',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const style: CSSProperties = { '--stagger': stagger } as CSSProperties

  const content = (
    <>
      <SectionLabel className="mb-4">{label}</SectionLabel>
      <p className="text-2xl sm:text-3xl font-semibold font-mono text-lux-800 leading-none">{value}</p>
      {secondary && <div className="mt-3">{secondary}</div>}
    </>
  )

  if (href && !onClick) {
    return (
      <Link to={href} className={sharedClasses} style={style} aria-label={`${label}: view details`}>
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${sharedClasses} text-left w-full`}
        style={style}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={sharedClasses} style={style}>
      {content}
    </div>
  )
}
