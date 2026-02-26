import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
  className?: string
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'lux-btn-primary',
  secondary: 'lux-btn-secondary',
  ghost: 'lux-btn-ghost',
}

export default function Button({
  variant = 'primary',
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const base = variantClasses[variant]
  return (
    <button
      type={type}
      className={`${base} min-h-[24px] min-w-[24px] ${className}`.trim()}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  )
}
