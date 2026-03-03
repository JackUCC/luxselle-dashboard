import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number | string
  prefix?: string
  suffix?: string
  /** Animation duration in ms. Default 800. */
  duration?: number
  /** Delay before starting animation in ms. */
  delay?: number
  /** Called when animation completes. */
  onComplete?: () => void
}

export default function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  duration = 800,
  delay = 0,
  onComplete,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState('—')
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (value === null || value === undefined) return
    const numVal = typeof value === 'string' ? parseFloat(value) : value
    if (!Number.isFinite(numVal)) {
      setDisplay(String(value))
      return
    }

    const rafRef = { current: 0 }
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const runAnimation = () => {
      const start = performance.now()

      const animate = (now: number) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        const current = numVal * eased

        if (numVal >= 1000) {
          setDisplay(`${prefix}${current.toLocaleString(undefined, { maximumFractionDigits: 0 })}${suffix}`)
        } else if (numVal >= 1) {
          setDisplay(`${prefix}${current.toFixed(1)}${suffix}`)
        } else {
          setDisplay(`${prefix}${current.toFixed(2)}${suffix}`)
        }

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate)
        } else {
          onCompleteRef.current?.()
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    if (delay > 0) {
      timeoutId = setTimeout(runAnimation, delay)
    } else {
      runAnimation()
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      cancelAnimationFrame(rafRef.current)
    }
  }, [value, prefix, suffix, duration, delay])

  return (
    <span className="tabular-nums">
      {display}
    </span>
  )
}
