/**
 * Wrapper for page content with enter/exit transitions.
 * Respects prefers-reduced-motion.
 */
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface PageTransitionProps {
  children: ReactNode
  pathKey: string
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    // Safari <14 uses addListener/removeListener.
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange)
      return () => mediaQuery.removeEventListener('change', onChange)
    }

    mediaQuery.addListener(onChange)
    return () => mediaQuery.removeListener(onChange)
  }, [])

  return prefersReducedMotion
}

export default function PageTransition({ children, pathKey }: PageTransitionProps) {
  const shouldReduceMotion = usePrefersReducedMotion()

  const enterTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 240, damping: 28, mass: 0.85 }
  const exitTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: [0.4, 0, 1, 1] as [number, number, number, number] }

  return (
    <motion.div
      key={pathKey}
      initial={shouldReduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 14, scale: 0.992 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: shouldReduceMotion ? 1 : 0,
        y: shouldReduceMotion ? 0 : -6,
        scale: shouldReduceMotion ? 1 : 0.998,
        transition: exitTransition,
      }}
      transition={enterTransition}
      className="will-change-transform"
    >
      {children}
    </motion.div>
  )
}
