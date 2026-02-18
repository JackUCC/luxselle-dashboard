import { useState, useRef } from 'react'
import { Sparkles, Send } from 'lucide-react'
import { apiPost } from '../../lib/api'
import toast from 'react-hot-toast'

export default function AiPromptBar() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = prompt.trim()
    if (!trimmed || loading) return

    setLoading(true)
    try {
      const response = await apiPost<{ data: { reply: string } }>('/ai/prompt', { prompt: trimmed })
      const reply = response.data?.reply ?? 'No response.'
      toast.success(reply, { duration: 6000 })
      setPrompt('')
      inputRef.current?.focus()
    } catch (err) {
      console.error(err)
      toast.error('Could not get AI response.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm transition-shadow focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/20 animate-bento-enter"
      style={{ '--stagger': 0 } as React.CSSProperties}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Sparkles className="h-4 w-4" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask about inventory, KPIs, buying, or sales..."
        className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !prompt.trim()}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600"
        aria-label="Send"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  )
}
