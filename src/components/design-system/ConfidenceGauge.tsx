import { useEffect, useRef, useState } from 'react'
import AnimatedNumber from './AnimatedNumber'

interface ConfidenceGaugeProps {
  /** Confidence value from 0 to 1 */
  value: number
  /** Diameter in pixels (default 100) */
  size?: number
}

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function getColor(pct: number): string {
  if (pct < 50) return '#ef4444'
  if (pct <= 75) return '#f59e0b'
  return '#10b981'
}

export default function ConfidenceGauge({ value, size = 100 }: ConfidenceGaugeProps) {
  const pct = Math.round(value * 100)
  const targetOffset = CIRCUMFERENCE * (1 - pct / 100)
  const [offset, setOffset] = useState(CIRCUMFERENCE)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const start = performance.now()
    const from = CIRCUMFERENCE
    const to = targetOffset
    const duration = 800

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setOffset(from + (to - from) * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [targetOffset])

  const color = getColor(pct)

  return (
    <div className="inline-flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="-rotate-90"
        role="img"
        aria-label={`Confidence: ${pct}%`}
      >
        <circle
          cx={50}
          cy={50}
          r={RADIUS}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={8}
        />
        <circle
          cx={50}
          cy={50}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
        <foreignObject x={0} y={0} width={100} height={100} className="rotate-90 origin-center">
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-xl sm:text-2xl font-bold text-lux-900 tabular-nums leading-none">
              <AnimatedNumber value={pct} suffix="%" />
            </span>
          </div>
        </foreignObject>
      </svg>
      <span className="text-xs text-lux-500 uppercase tracking-wide mt-0.5">Confidence</span>
    </div>
  )
}
