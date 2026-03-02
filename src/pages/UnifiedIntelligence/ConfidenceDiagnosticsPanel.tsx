import type { PriceCheckResult } from '@shared/schemas'

interface ConfidenceDiagnosticsPanelProps {
  confidenceBreakdown?: PriceCheckResult['confidenceBreakdown']
  trendSignalLabel: string
}

export default function ConfidenceDiagnosticsPanel({
  confidenceBreakdown,
  trendSignalLabel,
}: ConfidenceDiagnosticsPanelProps) {
  if (!confidenceBreakdown) {
    return null
  }

  return (
    <div className="rounded-lux-card border border-lux-200 bg-lux-50/60 p-3 text-xs text-lux-700">
      <p className="font-medium text-lux-800">Confidence diagnostics</p>
      <p className="mt-1">
        Evidence: {confidenceBreakdown.evidenceCount}
        {' '}· Provenance: {Math.round(confidenceBreakdown.provenanceRatio * 100)}%
        {' '}· Freshness weight: {Math.round(confidenceBreakdown.freshnessWeight * 100)}%
        {' '}· {trendSignalLabel}
      </p>
    </div>
  )
}
