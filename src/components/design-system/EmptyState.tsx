import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  /** Optional CTA (e.g. Button or Link) */
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`.trim()}
    >
      {Icon && (
        <div className="mb-4 rounded-full bg-lux-100 p-4">
          <Icon className="h-8 w-8 text-lux-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-lux-900">{title}</h3>
      {description && <p className="mt-2 text-sm text-lux-500 max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
