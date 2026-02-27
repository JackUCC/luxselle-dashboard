import type { ReactNode } from 'react'

export interface PageLayoutProps {
  children: ReactNode
  /** 'default' = full width (Inventory/Sourcing/Jobs/Invoices), 'narrow' = max-w-2xl, 'content' = max-w-6xl */
  variant?: 'default' | 'narrow' | 'content'
  className?: string
}

const variantClasses = {
  default: '',
  narrow: 'mx-auto max-w-2xl',
  content: 'mx-auto max-w-6xl',
}

export default function PageLayout({ children, variant = 'default', className = '' }: PageLayoutProps) {
  const base = 'w-full space-y-8'
  const variantClass = variantClasses[variant]
  return (
    <div className={[base, variantClass, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
