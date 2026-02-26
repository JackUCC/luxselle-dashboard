export interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rect' | 'circle' | 'card' | 'table'
}

const variantClasses: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: 'h-4 w-full rounded-lux-input',
  rect: 'rounded-lux-card',
  circle: 'rounded-full',
  card: 'rounded-lux-card h-24 w-full',
  table: 'rounded-lux-input h-10 w-full',
}

export default function Skeleton({ className = '', variant = 'text' }: SkeletonProps) {
  return <div className={`lux-skeleton ${variantClasses[variant]} ${className}`.trim()} aria-hidden="true" />
}
