import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Camera } from 'lucide-react'
import SectionLabel from '../design-system/SectionLabel'
import PredictiveInput from '../design-system/PredictiveInput'
import { POPULAR_SUGGESTIONS } from '../../lib/searchSuggestions'

const POPULAR_SEARCHES = [
  'Chanel Classic Flap Medium',
  'Hermès Birkin 25',
  'Louis Vuitton Neverfull MM',
  'Gucci Marmont Small',
]

export default function MarketIntelligenceWidget() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

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
    <div className="lux-card p-6 sm:col-span-2 animate-bento-enter stagger-0">
      <SectionLabel className="mb-4">Market Intelligence</SectionLabel>

      <form onSubmit={handleSubmit} className="relative">
        <PredictiveInput
          value={query}
          onChange={setQuery}
          onSelect={(selected) => navigate(`/evaluate?q=${encodeURIComponent(selected)}&run=1`)}
          popularItems={POPULAR_SUGGESTIONS}
          placeholder="Search brand, model, SKU, or paste image..."
          ariaLabel="Search market intelligence"
          listboxLabel="Market intelligence suggestions"
          className="lux-input h-12 pl-4 pr-24 text-sm"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleImageClick}
            className="rounded-full p-2 text-lux-400 transition-colors hover:bg-lux-100 hover:text-lux-600 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
            aria-label="Upload image for visual search"
          >
            <Camera className="h-4.5 w-4.5" />
          </button>
          <button
            type="submit"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-lux-900 text-white transition-transform hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
            aria-label="Search"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
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
        <span className="text-xs font-medium uppercase tracking-wider text-lux-400">
          Popular:
        </span>
        {POPULAR_SEARCHES.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => handlePopularClick(label)}
            className="rounded-full border border-lux-200 bg-white px-3 py-1.5 text-xs font-medium text-lux-700 transition-colors hover:border-lux-300 hover:bg-lux-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
