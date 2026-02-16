/**
 * Dashboard command bar: natural-language intent (inventory, evaluator, suppliers, sourcing) and navigation.
 * @see docs/CODE_REFERENCE.md
 */
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'

type CommandIntent =
  | { type: 'inventory'; query: string; brand?: string; model?: string }
  | { type: 'evaluator'; brand?: string; model?: string }
  | { type: 'suppliers'; focusImport: boolean }
  | { type: 'sourcing'; status?: string }

const supplierKeywords = ['supplier', 'vendors', 'vendor', 'import', 'csv']
const sourcingKeywords = ['sourcing', 'source', 'request']
const evaluatorKeywords = ['buy', 'evaluate', 'eval', 'analyse', 'analyze']
const statusKeywords = ['open', 'sourcing', 'sourced', 'fulfilled', 'lost']

const splitBrandModel = (query: string) => {
  const tokens = query.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) {
    return { brand: '', model: '' }
  }
  const [brand, ...modelParts] = tokens
  return { brand, model: modelParts.join(' ') }
}

const getIntent = (query: string): CommandIntent => {
  const trimmed = query.trim()
  const lower = trimmed.toLowerCase()

  if (supplierKeywords.some((keyword) => lower.includes(keyword))) {
    const focusImport = lower.includes('import') || lower.includes('csv') || lower.includes('upload')
    return { type: 'suppliers', focusImport }
  }

  if (sourcingKeywords.some((keyword) => lower.includes(keyword))) {
    const status = statusKeywords.find((keyword) => lower.includes(keyword))
    return { type: 'sourcing', status }
  }

  if (evaluatorKeywords.some((keyword) => lower.includes(keyword))) {
    const cleaned = trimmed.replace(
      new RegExp(`\\b(${evaluatorKeywords.join('|')})\\b`, 'gi'),
      ''
    )
    const { brand, model } = splitBrandModel(cleaned || trimmed)
    return { type: 'evaluator', brand, model }
  }

  const { brand, model } = splitBrandModel(trimmed)
  return { type: 'inventory', query: trimmed, brand, model }
}

export default function CommandBar({ className = '' }: { className?: string }) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) {
      setError('Enter a request to route.')
      return
    }

    setError(null)
    const intent = getIntent(trimmed)

    if (intent.type === 'suppliers') {
      const params = new URLSearchParams()
      if (intent.focusImport) params.set('focus', 'import')
      navigate(`/supplier-hub${params.toString() ? `?${params.toString()}` : ''}`)
      return
    }

    if (intent.type === 'sourcing') {
      const params = new URLSearchParams()
      if (intent.status) params.set('status', intent.status)
      navigate(`/sourcing${params.toString() ? `?${params.toString()}` : ''}`)
      return
    }

    if (intent.type === 'evaluator') {
      const params = new URLSearchParams()
      if (intent.brand) params.set('brand', intent.brand)
      if (intent.model) params.set('model', intent.model)
      navigate(`/buy-box${params.toString() ? `?${params.toString()}` : ''}`)
      return
    }

    const params = new URLSearchParams()
    params.set('q', intent.query)
    if (intent.brand) params.set('brand', intent.brand)
    if (intent.model) params.set('model', intent.model)
    navigate(`/inventory?${params.toString()}`)
  }

  return (
    <div className={`w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Sparkles className="h-5 w-5 text-sky-500" />
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask Luxselle or search inventory..."
          aria-label="Command bar input"
          className="w-full rounded-2xl border-0 bg-white py-4 pl-12 pr-14 text-lg shadow-soft-lg ring-1 ring-gray-200 placeholder:text-gray-400 transition-shadow focus:ring-2 focus:ring-sky-500"
        />
        
        <button
          type="submit"
          className="absolute right-2 top-2 bottom-2 aspect-square rounded-xl bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 transition-transform active:scale-95"
          aria-label="Submit"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>
      {error && (
        <div className="mt-2 text-center text-sm text-red-600 animate-fade-in">
          {error}
        </div>
      )}
    </div>
  )
}
