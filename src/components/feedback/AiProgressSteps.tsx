import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

export interface AiProgressStep {
  label: string
  detail?: string
}

interface AiProgressStepsProps {
  steps: AiProgressStep[]
  isActive: boolean
  className?: string
  title?: string
  compact?: boolean
  stepDurationMs?: number
}

export default function AiProgressSteps({
  steps,
  isActive,
  className = '',
  title = 'AI Progress',
  compact = false,
  stepDurationMs = 1300,
}: AiProgressStepsProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0)

  useEffect(() => {
    if (!isActive || steps.length <= 1) {
      setActiveStepIndex(0)
      return
    }

    setActiveStepIndex(0)
    const interval = window.setInterval(() => {
      setActiveStepIndex((current) => {
        if (current >= steps.length - 1) return current
        return current + 1
      })
    }, stepDurationMs)

    return () => {
      window.clearInterval(interval)
    }
  }, [isActive, stepDurationMs, steps.length])

  const progress = useMemo(() => {
    if (!steps.length) return 0
    if (!isActive) return 0
    return Math.max(12, ((activeStepIndex + 1) / steps.length) * 100)
  }, [activeStepIndex, isActive, steps.length])

  const currentStepLabel = steps[activeStepIndex]?.label ?? 'Starting'

  if (steps.length === 0) return null

  if (compact) {
    return (
      <div className={`rounded-lux-card border border-lux-200 bg-lux-50/70 p-3 ${className}`}>
        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.08em] text-lux-500">
          <span>{title}</span>
          <span>
            Step {Math.min(activeStepIndex + 1, steps.length)} / {steps.length}
          </span>
        </div>
        <div className="mt-2 relative h-1.5 w-full overflow-hidden rounded-full bg-lux-200/80">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-lux-gold via-amber-400 to-emerald-400 transition-[width] duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-medium text-lux-700" aria-live="polite">
          {currentStepLabel}
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-lux-card border border-lux-200 bg-lux-50/70 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-lux-500">{title}</p>
        <p className="text-xs text-lux-500" aria-live="polite">
          {currentStepLabel}
        </p>
      </div>
      <div className="mt-2 relative h-1.5 w-full overflow-hidden rounded-full bg-lux-200/80">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-lux-gold via-amber-400 to-emerald-400 transition-[width] duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-4 space-y-2">
        {steps.map((step, index) => {
          const isDone = index < activeStepIndex
          const isCurrent = index === activeStepIndex
          return (
            <div
              key={`${step.label}-${index}`}
              className={`rounded-lg border px-3 py-2 transition-all ${
                isDone
                  ? 'border-emerald-200 bg-emerald-50/80'
                  : isCurrent
                    ? 'border-lux-gold/30 bg-white shadow-[0_4px_14px_rgba(184,134,11,0.12)]'
                    : 'border-lux-200 bg-white/70'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin text-lux-gold" />
                  ) : (
                    <Circle className="h-4 w-4 text-lux-300" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-medium ${isCurrent ? 'text-lux-900' : 'text-lux-700'}`}>
                    {step.label}
                  </span>
                  {step.detail && <span className="mt-0.5 block text-xs text-lux-500">{step.detail}</span>}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
