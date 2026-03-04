import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import SectionLabel from '../design-system/SectionLabel'
import PredictiveInput from '../design-system/PredictiveInput'
import { POPULAR_SUGGESTIONS } from '../../lib/searchSuggestions'

const POPULAR_SEARCHES = [
  'Chanel Classic Flap Medium',
  'Hermès Birkin 25',
  'Louis Vuitton Neverfull MM',
  'Gucci Marmont Small',
]

const TYPING_PHRASES = [
  'Chanel Classic Flap Medium',
  'Hermès Birkin 25',
  'Louis Vuitton Neverfull MM',
  'Gucci Marmont Small',
  'Search brand, model, or SKU…',
]

const TYPING_SPEED_MS = 70
const HOLD_AFTER_PHRASE_MS = 2200
const DELETE_SPEED_MS = 35

function useTypingPlaceholder(phrases: string[], paused: boolean) {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (paused) return
    const phrase = phrases[phraseIndex] ?? ''
    const isAtEnd = !isDeleting && charIndex >= phrase.length
    const isAtStart = isDeleting && charIndex <= 0

    const timeout = window.setTimeout(
      () => {
        if (isDeleting) {
          if (charIndex <= 0) {
            setIsDeleting(false)
            setPhraseIndex((i) => (i + 1) % phrases.length)
            setCharIndex(0)
          } else {
            setCharIndex((c) => c - 1)
          }
        } else {
          if (charIndex >= phrase.length) {
            setIsDeleting(true)
            setCharIndex(phrase.length)
          } else {
            setCharIndex((c) => c + 1)
          }
        }
      },
      isAtEnd ? HOLD_AFTER_PHRASE_MS : isAtStart ? TYPING_SPEED_MS : isDeleting ? DELETE_SPEED_MS : TYPING_SPEED_MS,
    )
    return () => clearTimeout(timeout)
  }, [phrases, phraseIndex, charIndex, isDeleting, paused])

  const phrase = phrases[phraseIndex] ?? ''
  const text = isDeleting ? phrase.slice(0, charIndex) : phrase.slice(0, charIndex) + '|'
  return text || '|'
}

export default function MarketIntelligenceWidget() {
  const [query, setQuery] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const navigate = useNavigate()

  const typingPlaceholder = useTypingPlaceholder(TYPING_PHRASES, inputFocused)
  const showTypingEffect = !query.trim() && !inputFocused
  const placeholder = showTypingEffect ? typingPlaceholder : 'Search brand, model, or SKU...'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/evaluate?q=${encodeURIComponent(query.trim())}&run=1`)
  }

  const handlePopularClick = (label: string) => {
    navigate(`/evaluate?q=${encodeURIComponent(label)}&run=1`)
  }

  return (
    <div
      className="lux-card p-6 sm:col-span-2 h-full min-h-0 flex flex-col animate-bento-enter stagger-0 transition-colors"
      role="region"
      aria-label="Market Intelligence - search"
    >
      <SectionLabel className="mb-4">Market Intelligence</SectionLabel>

      <form onSubmit={handleSubmit} className="relative">
        <div className="relative rounded-lux-input border border-lux-200 bg-white transition-[border-color,box-shadow] focus-within:border-lux-gold/50 focus-within:ring-2 focus-within:ring-lux-gold/20">
          <PredictiveInput
            value={query}
            onChange={setQuery}
            onSelect={(selected) => navigate(`/evaluate?q=${encodeURIComponent(selected)}&run=1`)}
            popularItems={POPULAR_SUGGESTIONS}
            placeholder={placeholder}
            ariaLabel="Search market intelligence"
            listboxLabel="Market intelligence suggestions"
            className="lux-input h-12 pl-4 pr-28 text-sm border-0 focus:ring-0 focus:border-0 bg-transparent"
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-lux-gold text-white transition-transform hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
              aria-label="Search"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </form>

      <div className="mt-5 pt-4 border-t border-lux-100">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-lux-gold mb-2">Popular</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_SEARCHES.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => handlePopularClick(label)}
              className="rounded-full border border-lux-200 bg-white px-3 py-1.5 text-xs font-medium text-lux-700 transition-colors hover:border-lux-gold/40 hover:bg-lux-50/80 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
