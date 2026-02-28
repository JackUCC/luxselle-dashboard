import React, { type ButtonHTMLAttributes, type ReactNode, useEffect, useState, isValidElement, cloneElement } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Check } from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  flashSuccess?: boolean
  children: ReactNode
  className?: string
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'lux-btn-primary',
  secondary: 'lux-btn-secondary',
  ghost: 'lux-btn-ghost',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  flashSuccess = false,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const [isFlashing, setIsFlashing] = useState(false)

  useEffect(() => {
    if (flashSuccess) {
      setIsFlashing(true)
      const timer = setTimeout(() => setIsFlashing(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [flashSuccess])

  const baseVariant = variantClasses[variant]
  const baseSize = sizeClasses[size]

  let hasAnimatedIcon = false

  const processedChildren = React.Children.map(children, (child) => {
    if (isValidElement<{ className?: string }>(child)) {
      const childType = child.type
      const typedChildType = childType as { displayName?: string; name?: string }
      const name =
        typeof childType === 'string'
          ? childType
          : ((typedChildType.displayName ?? typedChildType.name) || '')

      let animationClass = ''
      if (name.includes('Arrow') || name.includes('Chevron')) {
        animationClass = 'group-hover:translate-x-0.5 transition-transform'
        hasAnimatedIcon = true
      } else if (name.includes('Sparkle') || name.includes('Star')) {
        animationClass = 'group-hover:rotate-12 transition-transform'
        hasAnimatedIcon = true
      }
      
      if (animationClass) {
        return cloneElement(child, {
          className: `${child.props.className || ''} ${animationClass}`.trim()
        })
      }
    }
    return child
  })

  const loadingClass = isLoading ? 'loading opacity-70 cursor-not-allowed' : ''
  const flashClass = isFlashing ? '!border-lux-success !text-lux-success' : ''
  const iconGroupClass = hasAnimatedIcon ? 'group' : ''

  const computedClasses = [
    baseVariant,
    baseSize,
    'inline-flex items-center justify-center active:scale-[0.97] transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
    loadingClass,
    flashClass,
    iconGroupClass,
    className
  ].filter(Boolean).join(' ')

  return (
    <button
      type={type}
      className={computedClasses}
      disabled={disabled || isLoading}
      {...rest}
    >
      <AnimatePresence initial={false}>
        {isLoading ? (
          <motion.span
            key="loading-spinner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="inline-flex"
          >
            <Loader2 className="h-[1em] w-[1em] animate-spin" />
          </motion.span>
        ) : null}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {isFlashing && !isLoading ? (
          <motion.span
            key="flash-success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="inline-flex"
          >
            <Check className="h-[1em] w-[1em] text-lux-success" />
          </motion.span>
        ) : null}
      </AnimatePresence>
      {processedChildren}
    </button>
  )
}
