import type { ReactNode } from 'react'

export interface CardProps {
  children: ReactNode
  className?: string
  elevated?: boolean
  /** Use for evaluator form card layout */
  evaluatorFormCard?: boolean
}

export default function Card({
  children,
  className = '',
  elevated = false,
  evaluatorFormCard = false,
}: CardProps) {
  const base = 'lux-card'
  const elevatedClass = elevated ? 'shadow-soft-lg' : ''
  const formClass = evaluatorFormCard ? 'evaluator-form-card' : ''
  return (
    <div
      className={`${base} ${elevatedClass} ${formClass} ${className}`.trim()}
    >
      {children}
    </div>
  )
}
