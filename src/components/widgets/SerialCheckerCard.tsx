/**
 * Serial Check card for Market Research: decode serial/date codes with optional
 * item description for serial-adjusted pricing guidance. Styled to match the
 * Market Research page (Competitor Activity card pattern).
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Hash, Sparkles } from 'lucide-react'
import { apiPost, ApiError } from '../../lib/api'
import { formatCurrency } from '../../lib/formatters'
import {
  decodeSerialToYear,
  SERIAL_CHECK_BRANDS,
  type DecodeResult,
  type SerialCheckBrand,
} from '../../lib/serialDateDecoder'
import { calculateSerialPricingGuidance } from '../../lib/serialValuation'
import type { PriceCheckResult, SerialDecodeResult, SerialPricingGuidance } from '@shared/schemas'
import { useResearchSession } from '../../lib/ResearchSessionContext'
import { FloatingInput, LuxSelect } from '../design-system/Input'
import AiThinkingDots from '../feedback/AiThinkingDots'
import AiProgressSteps, { type AiProgressStep } from '../feedback/AiProgressSteps'

interface SerialCheckQuery {
  serial: string
  brand: SerialCheckBrand
  description: string
}

interface SerialCheckSessionResult {
  decodeResult: DecodeResult
  pricingGuidance: SerialPricingGuidance
  marketAverageEur: number
  compsCount: number
}

const SERIAL_BRAND_OPTIONS = SERIAL_CHECK_BRANDS.map((brand) => ({ value: brand, label: brand }))

const SERIAL_STEPS: AiProgressStep[] = [
  { label: 'Decoding serial', detail: 'Applying brand-specific date/serial patterns.' },
  { label: 'Cross-checking with AI', detail: 'Running AI fallback when confidence is low.' },
  { label: 'Merging market guidance', detail: 'Combining decode output with price baseline.' },
]

export default function SerialCheckerCard() {
  const [serial, setSerial] = useState('')
  const [brand, setBrand] = useState<SerialCheckBrand>('Louis Vuitton')
  const [description, setDescription] = useState('')

  const {
    session: serialSession,
    startLoading: startSerialLoading,
    setSuccess: setSerialSuccess,
    setError: setSerialError,
    clear: clearSerialSession,
  } = useResearchSession<SerialCheckSessionResult, SerialCheckQuery>('serial-check')

  const isSerialLoading = serialSession.status === 'loading'
  const serialError = serialSession.status === 'error' ? (serialSession.error ?? 'Could not run serial analysis') : null
  const serialResult = serialSession.status === 'success' ? (serialSession.result ?? null) : null

  useEffect(() => {
    const persisted = serialSession.query
    if (!persisted) return
    setSerial(persisted.serial)
    setBrand(persisted.brand)
    setDescription(persisted.description ?? '')
  }, [serialSession.query])

  const handleAnalyze = useCallback(async () => {
    const normalizedSerial = serial.trim()
    const normalizedDescription = description.trim()

    if (!normalizedSerial) {
      toast.error('Enter a serial/date code to analyze')
      return
    }

    const serialQuery: SerialCheckQuery = {
      serial: normalizedSerial,
      brand,
      description: normalizedDescription,
    }

    startSerialLoading(serialQuery)

    try {
      let decoded = decodeSerialToYear(normalizedSerial, brand)

      if (decoded.source === 'rule_based' && (decoded.precision === 'unknown' || decoded.confidence < 0.7)) {
        try {
          const { data } = await apiPost<{ data: SerialDecodeResult }>('/ai/serial-decode', {
            serial: normalizedSerial,
            brand,
            itemDescription: normalizedDescription || undefined,
          })
          decoded = data
        } catch {
          // Keep rule-based decode when AI decode is unavailable
        }
      }

      let marketAverage = 0
      let compsCount = 0

      if (normalizedDescription) {
        try {
          const { data: marketData } = await apiPost<{ data: PriceCheckResult }>('/pricing/price-check', {
            query: normalizedDescription,
            condition: undefined,
            notes: undefined,
          })
          marketAverage = marketData.averageSellingPriceEur
          compsCount = marketData.comps.length
        } catch {
          // Decode still shown; guidance will use zero market baseline
        }
      }

      const guidance = calculateSerialPricingGuidance({
        marketAverageEur: marketAverage,
        decode: decoded,
      })

      setSerialSuccess(
        {
          decodeResult: decoded,
          pricingGuidance: guidance,
          marketAverageEur: marketAverage,
          compsCount,
        },
        serialQuery
      )
      toast.success('Serial context updated')
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not run serial analysis'
      setSerialError(message, serialQuery)
      toast.error(message)
    }
  }, [serial, brand, description, startSerialLoading, setSerialSuccess, setSerialError])

  const handleClear = useCallback(() => {
    setSerial('')
    setDescription('')
    clearSerialSession()
  }, [clearSerialSession])

  return (
    <div className="lux-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-lux-400 uppercase tracking-[0.06em]">
          <Hash className="h-4 w-4" />
          Serial Check
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-lux-500 mb-1">Brand</label>
            <LuxSelect
              value={brand}
              onValueChange={(value) => setBrand(value as SerialCheckBrand)}
              options={SERIAL_BRAND_OPTIONS}
              ariaLabel="Serial brand"
              preferOpenUp
              dropdownMaxHeight={180}
            />
          </div>
          <FloatingInput
            type="text"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            label="Serial/date code"
          />
        </div>
        <FloatingInput
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          label="Item description (optional, for pricing guidance)"
        />

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isSerialLoading}
            className="lux-btn-primary inline-flex min-h-[44px] items-center gap-2 px-4 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            {isSerialLoading ? <AiThinkingDots /> : <Sparkles className="h-4 w-4" />}
            {isSerialLoading ? 'Analyzing...' : 'Analyze'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex min-h-[44px] items-center rounded-lg border border-lux-200 px-3 text-xs font-medium text-lux-500 hover:bg-lux-50 hover:text-lux-700 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            Clear
          </button>
        </div>

        {isSerialLoading && (
          <AiProgressSteps
            isActive={isSerialLoading}
            steps={SERIAL_STEPS}
            compact
            title="Serial analysis progress"
            className="mt-2"
          />
        )}

        {serialError && (
          <div className="rounded-lux-card border border-rose-200 bg-rose-50/60 p-3 text-center">
            <p className="text-sm font-medium text-rose-600">{serialError}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isSerialLoading || !serial.trim()}
                className="inline-flex min-h-[36px] items-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={clearSerialSession}
                className="inline-flex min-h-[36px] items-center rounded-lg px-3 py-1.5 text-xs font-medium text-lux-600 hover:bg-lux-100 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {serialResult && (
          <div className="space-y-3 mt-4">
            <div
              className={`rounded-lux-card border p-4 text-sm ${
                serialResult.decodeResult.success ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'
              }`}
            >
              <p className="font-medium text-lux-800">
                {serialResult.decodeResult.success && serialResult.decodeResult.year != null
                  ? `Decode: ${serialResult.decodeResult.year}${serialResult.decodeResult.period ? ` · ${serialResult.decodeResult.period}` : ''}`
                  : 'Decode could not be fully confirmed'}
              </p>
              <p className="mt-1 text-xs text-lux-600">{serialResult.decodeResult.message}</p>
              <p className="mt-1 text-xs text-lux-500">
                Confidence: {Math.round(serialResult.decodeResult.confidence * 100)}%
              </p>
            </div>
            {serialResult.compsCount > 0 && (
              <div className="rounded-lux-card border border-lux-200 bg-lux-50/70 p-4">
                <p className="text-xs text-lux-500 uppercase tracking-wide">Serial-adjusted guidance</p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] text-lux-500 uppercase tracking-wide">Market avg</p>
                    <p className="text-sm font-semibold text-lux-800">
                      {formatCurrency(serialResult.pricingGuidance.marketAverageEur)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-lux-500 uppercase tracking-wide">Estimated worth</p>
                    <p className="text-sm font-semibold text-lux-800">
                      {formatCurrency(serialResult.pricingGuidance.estimatedWorthEur)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-lux-500 uppercase tracking-wide">Recommended max pay</p>
                    <p className="text-sm font-semibold text-lux-800">
                      {formatCurrency(serialResult.pricingGuidance.recommendedMaxPayEur)}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-lux-600">{serialResult.pricingGuidance.summary}</p>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-lux-500 pt-1">
          For full price check and landed cost, use{' '}
          <Link
            to="/evaluate"
            className="font-medium text-lux-700 hover:text-lux-900 underline focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none rounded-sm"
          >
            Sourcing Intelligence
          </Link>
        </p>
      </div>
    </div>
  )
}
