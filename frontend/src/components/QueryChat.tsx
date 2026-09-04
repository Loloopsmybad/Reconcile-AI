import { useState } from 'react'
import { MessageSquare, Send, Loader2 } from 'lucide-react'
import { nlQuery } from '../lib/api'
import { Card, CardHeader, CardTitle, Badge } from './ui'

interface Message {
  role: 'user' | 'ai'
  text: string
}

export function QueryChat() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await nlQuery(q)
      setMessages((prev) => [...prev, { role: 'ai', text: res.answer }])
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: 'Query failed. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-white/5">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-emerald-400" />
          <CardTitle>Ask Anything</CardTitle>
          <Badge tone="emerald" className="ml-1">AI</Badge>
        </div>
      </CardHeader>
      <div className="max-h-[300px] overflow-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-zinc-500 py-4">
            Ask about the reconciliation results — e.g. "Which settlements had fee gaps?"
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
              m.role === 'user'
                ? 'bg-violet-500/20 text-violet-200'
                : 'bg-white/5 text-zinc-300'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-white/5 px-3 py-2 text-xs text-zinc-400 flex items-center gap-2">
              <Loader2 className="size-3 animate-spin" />
              Thinking…
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-white/5 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about the reconciliation data…"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-violet-500/60"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-medium text-white hover:bg-violet-400 disabled:opacity-40 transition-colors"
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </div>
    </Card>
  )
}
