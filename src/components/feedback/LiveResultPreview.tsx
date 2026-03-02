import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import AiProgressSteps, { type AiProgressStep } from './AiProgressSteps'

interface LiveResultPreviewProps {
  isActive: boolean
  query?: string
  className?: string
  compact?: boolean
}

const RESULT_PREVIEW_STEPS: AiProgressStep[] = [
  { label: 'Searching listings', detail: 'Gathering fresh listings and historical comps.' },
  { label: 'Analysing comparables', detail: 'Scoring title, condition, and pricing fit.' },
  { label: 'Building report', detail: 'Computing confidence and decision targets.' },
]

export default function LiveResultPreview({
  isActive,
  query,
  className = '',
  compact = false,
}: LiveResultPreviewProps) {
  const previewLineCount = useMemo(() => {
    if (!isActive) return 1
    const queryBoost = query?.trim().length ? 1 : 0
    return Math.min(4, 2 + queryBoost)
  }, [isActive, query])

  return (
    <div className={`lux-card p-4 ${className}`}>
      <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-lux-500">
        <Sparkles className="h-3.5 w-3.5 text-lux-gold" />
        Live Result Preview
      </div>

      <AiProgressSteps
        steps={RESULT_PREVIEW_STEPS}
        isActive={isActive}
        compact={compact}
        title={compact ? 'AI flow' : 'AI is building your analysis'}
      />

      <div className={`mt-3 ${compact ? 'space-y-1.5' : 'space-y-2'}`}>
        <p className="text-xs text-lux-500">
          {query?.trim() ? (
            <>
              Tracking query: <span className="font-medium text-lux-700">{query.trim()}</span>
            </>
          ) : (
            'Preparing draft output from your current inputs.'
          )}
        </p>
        <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
          {['Avg Sell', 'Max Buy', 'Max Bid'].map((metric) => (
            <div key={metric} className="rounded-lg border border-lux-200 bg-lux-50/60 p-2">
              <p className="text-[11px] text-lux-500 uppercase tracking-wide">{metric}</p>
              <div className="mt-1 h-4 w-14 rounded bg-lux-200/90 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-lux-200 bg-white/80 p-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-lux-500">Incoming comparables</p>
          <div className="mt-2 space-y-1.5">
            {Array.from({ length: previewLineCount }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-2">
                <div className="h-3 w-2/3 rounded bg-lux-200/90 animate-pulse" />
                <div className="h-3 w-12 rounded bg-lux-200/90 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
