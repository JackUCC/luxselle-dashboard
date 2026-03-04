/**
 * Rotating item description examples with flip/roll animation.
 * Used below evaluator form inputs to inspire detailed descriptions.
 * Respects prefers-reduced-motion.
 */
import { useEffect, useState } from 'react'

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
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange)
      return () => mediaQuery.removeEventListener('change', onChange)
    }
    mediaQuery.addListener(onChange)
    return () => mediaQuery.removeListener(onChange)
  }, [])

  return prefersReducedMotion
}

export interface RotatingExamplesProps {
  examples: readonly string[]
  prefix?: string
  intervalMs?: number
  className?: string
}

export default function RotatingExamples({
  examples,
  prefix = '',
  intervalMs = 3500,
  className = '',
}: RotatingExamplesProps) {
  const [index, setIndex] = useState(0)
  const prefersReducedMotion = usePrefersReducedMotion()
  const effectiveInterval = prefersReducedMotion ? 0 : intervalMs

  useEffect(() => {
    if (effectiveInterval <= 0 || examples.length <= 1) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % examples.length)
    }, effectiveInterval)
    return () => clearInterval(id)
  }, [effectiveInterval, examples.length])

  const example = examples[index % examples.length] ?? examples[0]

  return (
    <p className={`mt-1 text-xs text-lux-400 ${className}`.trim()}>
      {prefix}
      <span
        className="inline-block min-h-[1.25rem] overflow-hidden align-bottom"
        style={{ perspective: prefersReducedMotion ? undefined : '200px' }}
      >
        <span
          key={index}
          className={prefersReducedMotion ? '' : 'animate-flip-roll inline-block'}
        >
          &quot;{example}&quot;
        </span>
      </span>
    </p>
  )
}
