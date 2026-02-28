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

  const duration = shouldReduceMotion ? 0 : 0.3
  const exitDuration = shouldReduceMotion ? 0 : 0.15

  return (
    <motion.div
      key={pathKey}
      initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: shouldReduceMotion ? 1 : 0,
        y: 0,
        transition: { duration: exitDuration },
      }}
      transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
