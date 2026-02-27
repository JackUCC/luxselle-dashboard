import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number | string
  prefix?: string
  suffix?: string
}

export default function AnimatedNumber({ value, prefix = '', suffix = '' }: AnimatedNumberProps) {
  const [display, setDisplay] = useState('—')
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (value === null || value === undefined) return
    const numVal = typeof value === 'string' ? parseFloat(value) : value
    if (!Number.isFinite(numVal)) {
      setDisplay(String(value))
      return
    }

    const duration = 800
    const start = performance.now()
    let raf: number

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

      if (progress < 1) raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [value, prefix, suffix])

  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  )
}
