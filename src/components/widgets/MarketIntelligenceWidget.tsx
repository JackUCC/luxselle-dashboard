import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Camera } from 'lucide-react'
import SectionLabel from '../design-system/SectionLabel'
import PredictiveInput from '../design-system/PredictiveInput'
import { POPULAR_SUGGESTIONS } from '../../lib/searchSuggestions'

const RECENT_SEARCHES = [
  { label: 'Hermes Birkin 30', image: '/placeholder-birkin.jpg' },
  { label: 'Chanel Classic Flap', image: '/placeholder-chanel.jpg' },
]

export default function MarketIntelligenceWidget() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/buy-box?q=${encodeURIComponent(query.trim())}&run=1`)
  }

  const handleRecentClick = (label: string) => {
    navigate(`/buy-box?q=${encodeURIComponent(label)}&run=1`)
  }

  const handleImageClick = () => {
    fileRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      navigate('/buy-box', { state: { imageFile: file } })
    }
  }

  return (
    <div
      className="lux-card p-6 sm:col-span-2 animate-bento-enter"
      style={{ '--stagger': 0 } as React.CSSProperties}
    >
      <SectionLabel className="mb-4">Market Intelligence</SectionLabel>

      <form onSubmit={handleSubmit} className="relative">
        <PredictiveInput
          value={query}
          onChange={setQuery}
          onSelect={(selected) => navigate(`/buy-box?q=${encodeURIComponent(selected)}&run=1`)}
          popularItems={POPULAR_SUGGESTIONS}
          placeholder="Search brand, model, SKU, or paste image..."
          className="lux-input h-12 pl-4 pr-24 text-[15px]"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleImageClick}
            className="rounded-full p-2 text-lux-400 transition-colors hover:bg-lux-100 hover:text-lux-600"
            aria-label="Upload image for visual search"
          >
            <Camera className="h-4.5 w-4.5" />
          </button>
          <button
            type="submit"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-lux-900 text-white transition-transform hover:scale-105 active:scale-95"
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

      <div className="mt-4 flex items-center gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-lux-400">
          Recent:
        </span>
        {RECENT_SEARCHES.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => handleRecentClick(item.label)}
            className="flex items-center gap-2 rounded-full border border-lux-200 bg-white px-3 py-1.5 text-[13px] font-medium text-lux-700 transition-colors hover:border-lux-300 hover:bg-lux-50"
          >
            <div className="h-5 w-5 overflow-hidden rounded-full bg-lux-100">
              <div className="h-full w-full bg-lux-200" />
            </div>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
