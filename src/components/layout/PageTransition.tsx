/**
 * Wrapper for page content with enter/exit transitions.
 * Respects prefers-reduced-motion.
 */
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface PageTransitionProps {
  children: ReactNode
  pathKey: string
}

export default function PageTransition({ children, pathKey }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion()

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
