export interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rect' | 'circle'
}

const variantClasses: Record<NonNullable<SkeletonProps['variant']>, string> = {
  text: 'h-4 w-full rounded-md',
  rect: 'rounded-xl',
  circle: 'rounded-full',
}

export default function Skeleton({ className = '', variant = 'text' }: SkeletonProps) {
  return <div className={`lux-skeleton ${variantClasses[variant]} ${className}`.trim()} aria-hidden="true" />
}
