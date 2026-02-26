import type { ReactNode } from 'react'

export interface ListRowProps {
  children: ReactNode
  isSelected?: boolean
  onClick?: () => void
  className?: string
  /** Use for keyboard nav; apply focus-visible ring */
  as?: 'button' | 'div'
}

export default function ListRow({
  children,
  isSelected = false,
  onClick,
  className = '',
  as = 'div',
}: ListRowProps) {
  const base =
    'flex w-full items-center gap-3 border-l-4 py-3 px-4 text-left transition-colors duration-150 ' +
    (isSelected
      ? 'border-l-lux-gold bg-lux-50'
      : 'border-l-transparent hover:border-l-lux-gold hover:bg-lux-50/80 focus-visible:border-l-lux-gold focus-visible:bg-lux-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold focus-visible:ring-offset-1')

  if (as === 'button') {
    return (
      <button
        type="button"
        className={`${base} ${className}`.trim()}
        onClick={onClick}
      >
        {children}
      </button>
    )
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`${base} ${className}`.trim()}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}
