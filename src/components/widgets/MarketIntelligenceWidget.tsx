import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Search } from 'lucide-react'
import SectionLabel from '../design-system/SectionLabel'
import PredictiveInput from '../design-system/PredictiveInput'
import { POPULAR_SUGGESTIONS } from '../../lib/searchSuggestions'
import { apiGet } from '../../lib/api'

const POPULAR_SEARCHES = [
  'Chanel Classic Flap Medium',
  'Hermès Birkin 25',
  'Louis Vuitton Neverfull MM',
  'Gucci Marmont Small',
]

export default function MarketIntelligenceWidget() {
  const [query, setQuery] = useState('')
  const [snapshotStatus, setSnapshotStatus] = useState<string>('No cached snapshot yet')
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    apiGet<{
      data: Array<{
        brand: string
        model: string
        snapshotAgeMinutes: number
        freshnessStatus: 'live' | 'fresh' | 'stale' | 'expired' | 'unknown'
      }>
    }>('/market-research/snapshots?limit=1')
      .then((res) => {
        if (cancelled) return
        const latest = res.data?.[0]
        if (!latest) {
          setSnapshotStatus('No cached snapshot yet')
          return
        }
        if (latest.freshnessStatus === 'live') {
          setSnapshotStatus(`Live snapshot · ${latest.brand} ${latest.model}`)
          return
        }
        setSnapshotStatus(`Cached ${latest.snapshotAgeMinutes}m · ${latest.brand} ${latest.model}`)
      })
      .catch(() => {
        if (!cancelled) setSnapshotStatus('Snapshot status unavailable')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/evaluate?q=${encodeURIComponent(query.trim())}&run=1`)
  }

  const handlePopularClick = (label: string) => {
    navigate(`/evaluate?q=${encodeURIComponent(label)}&run=1`)
  }

  const handleImageClick = () => {
    fileRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      navigate('/evaluate', { state: { imageFile: file } })
    }
  }

  return (
    <div className="lux-card lux-card-accent p-6 sm:col-span-2 animate-bento-enter stagger-0">
      <SectionLabel className="mb-4">Market Intelligence</SectionLabel>

      <form onSubmit={handleSubmit} className="relative">
        <div className="relative rounded-lux-input border border-lux-200 bg-white transition-[border-color,box-shadow] focus-within:border-lux-gold/50 focus-within:ring-2 focus-within:ring-lux-gold/20">
          <PredictiveInput
            value={query}
            onChange={setQuery}
            onSelect={(selected) => navigate(`/evaluate?q=${encodeURIComponent(selected)}&run=1`)}
            popularItems={POPULAR_SUGGESTIONS}
            placeholder="Search brand, model, SKU, or paste image..."
            ariaLabel="Search market intelligence"
            listboxLabel="Market intelligence suggestions"
            className="lux-input h-12 pl-4 pr-28 text-sm border-0 focus:ring-0 focus:border-0 bg-transparent"
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={handleImageClick}
              className="flex h-9 w-9 items-center justify-center rounded-full text-lux-400 transition-colors hover:bg-lux-100 hover:text-lux-600 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
              aria-label="Upload image for visual search"
            >
              <Camera className="h-4 w-4" />
            </button>
            <button
              type="submit"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-lux-900 text-white transition-transform hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          title="Upload image for visual search"
          aria-label="Upload image for visual search"
        />
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          data-testid="market-intelligence-snapshot-status"
          className="rounded-full bg-lux-100 px-2.5 py-1 text-[11px] font-semibold text-lux-700"
        >
          {snapshotStatus}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-lux-400 shrink-0">
          Popular
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {POPULAR_SEARCHES.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => handlePopularClick(label)}
              className="rounded-full border border-lux-200 bg-white px-2.5 py-1 text-xs font-medium text-lux-700 transition-colors hover:border-lux-gold/40 hover:bg-lux-50/80 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
