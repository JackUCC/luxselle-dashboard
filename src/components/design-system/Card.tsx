import type { CSSProperties, ReactNode } from 'react'

export interface CardProps {
  children: ReactNode
  className?: string
  elevated?: boolean
  accent?: boolean
  style?: CSSProperties
  /** Use for evaluator form card layout */
  evaluatorFormCard?: boolean
}

export default function Card({
  children,
  className = '',
  elevated = false,
  accent = false,
  style,
  evaluatorFormCard = false,
}: CardProps) {
  const base = accent ? 'lux-card-accent' : 'lux-card'
  const elevatedClass = elevated ? 'shadow-soft-lg' : ''
  const formClass = evaluatorFormCard ? 'evaluator-form-card' : ''
  return (
    <div
      className={`${base} ${elevatedClass} ${formClass} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  )
}
