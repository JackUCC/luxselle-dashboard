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

  if (shouldReduceMotion) {
    return <div key={pathKey}>{children}</div>
  }

  return (
    <motion.div
      key={pathKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
