import type { ButtonHTMLAttributes, ReactNode } from 'react'

type IconButtonSize = 'sm' | 'md' | 'lg'
type IconButtonTone = 'default' | 'danger'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  size?: IconButtonSize
  tone?: IconButtonTone
  rounded?: 'md' | 'full'
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'min-h-[36px] min-w-[36px]',
  md: 'min-h-[44px] min-w-[44px]',
  lg: 'min-h-[48px] min-w-[48px]',
}

const toneClasses: Record<IconButtonTone, string> = {
  default: 'text-lux-500 hover:bg-lux-100 hover:text-lux-700',
  danger: 'text-rose-500 hover:bg-rose-50 hover:text-rose-700',
}

export default function IconButton({
  icon,
  label,
  size = 'md',
  tone = 'default',
  rounded = 'md',
  className = '',
  type = 'button',
  ...rest
}: IconButtonProps) {
  const roundedClass = rounded === 'full' ? 'rounded-full' : 'rounded-lg'

  return (
    <button
      type={type}
      aria-label={label}
      className={[
        'inline-flex items-center justify-center transition-colors',
        sizeClasses[size],
        toneClasses[tone],
        roundedClass,
        'focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none',
        className,
      ].join(' ')}
      {...rest}
    >
      {icon}
    </button>
  )
}
