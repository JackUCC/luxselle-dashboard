import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

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

export default function CommandBar() {
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
      navigate(`/suppliers${params.toString() ? `?${params.toString()}` : ''}`)
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
      navigate(`/evaluator${params.toString() ? `?${params.toString()}` : ''}`)
      return
    }

    const params = new URLSearchParams()
    params.set('q', intent.query)
    if (intent.brand) params.set('brand', intent.brand)
    if (intent.model) params.set('model', intent.model)
    navigate(`/inventory?${params.toString()}`)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-sm font-medium text-gray-900 mb-2">Ask Luxselle...</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Try "Chanel Classic Flap" or "supplier import"'
            aria-label="Command bar input"
            className="w-full flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Go
          </button>
        </div>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-600">
            {error}
          </div>
        )}
        <div className="text-xs text-gray-500">
          Routes inventory searches, evaluator requests, supplier actions, and sourcing
          status filters.
        </div>
      </form>
    </div>
  )
}
