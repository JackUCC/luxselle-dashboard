import type { ReactNode } from 'react'

export type BadgeVariant = 'status-success' | 'status-warning' | 'status-danger' | 'count'

export interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  'status-success': 'bg-emerald-100 text-emerald-800',
  'status-warning': 'bg-amber-100 text-amber-800',
  'status-danger': 'bg-rose-100 text-rose-800',
  count: 'bg-lux-200 text-lux-700',
}

export default function Badge({
  children,
  variant = 'count',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-ui-label font-medium ${variantClasses[variant]} ${className}`.trim()}
    >
      {children}
    </span>
  )
}
