import { useState, useEffect, useRef, useCallback } from 'react'

interface TypewriterTextProps {
  text: string
  speed?: number
  onComplete?: () => void
  className?: string
}

export default function TypewriterText({
  text,
  speed = 20,
  onComplete,
  className = '',
}: TypewriterTextProps) {
  const [displayedCount, setDisplayedCount] = useState(0)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const accumulatorRef = useRef<number>(0)
  const countRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const tick = useCallback(
    (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const delta = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp
      accumulatorRef.current += delta

      const charsToAdd = Math.floor(accumulatorRef.current / speed)
      if (charsToAdd > 0) {
        accumulatorRef.current -= charsToAdd * speed
        const next = Math.min(countRef.current + charsToAdd, text.length)
        countRef.current = next
        setDisplayedCount(next)

        if (next >= text.length) {
          onCompleteRef.current?.()
          return
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    },
    [speed, text.length],
  )

  useEffect(() => {
    countRef.current = 0
    accumulatorRef.current = 0
    lastTimeRef.current = 0
    setDisplayedCount(0)

    if (prefersReducedMotion.current || !text) {
      setDisplayedCount(text.length)
      if (text) onCompleteRef.current?.()
      return
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [text, tick])

  const done = displayedCount >= text.length

  return (
    <span className={className}>
      {text.slice(0, displayedCount)}
      {!done && (
        <span
          className="inline-block w-[2px] h-[1em] align-text-bottom bg-lux-gold ml-px"
          style={{ animation: 'lux-pulse 1s step-end infinite' }}
          aria-hidden="true"
        />
      )}
    </span>
  )
}
