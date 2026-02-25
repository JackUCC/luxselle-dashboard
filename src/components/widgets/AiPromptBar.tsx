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
      className="flex items-center gap-2 rounded-lg border border-lux-200 bg-white px-3 py-1.5 transition-all focus-within:border-lux-800 focus-within:ring-1 focus-within:ring-lux-800/10 animate-bento-enter"
      style={{ '--stagger': 0 } as React.CSSProperties}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-lux-50 text-lux-500 border border-lux-200/60">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask about inventory, KPIs, buying, or sales..."
        className="min-w-0 flex-1 bg-transparent text-[13px] text-lux-800 placeholder:text-lux-400 focus:outline-none"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !prompt.trim()}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-lux-800 text-white transition-colors hover:bg-lux-700 disabled:opacity-40"
        aria-label="Send"
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </form>
  )
}
