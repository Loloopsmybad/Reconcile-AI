import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Search } from 'lucide-react'
import type { Match } from '../lib/types'
import { Card, CardHeader, CardTitle, Badge } from './ui'
import { flashRows } from '../lib/anim'

const CONF_TONE = (c: number) =>
  c >= 0.95 ? 'emerald' : c >= 0.85 ? 'sky' : c >= 0.7 ? 'amber' : 'rose'

const TIER_TONE: Record<number, 'violet' | 'sky' | 'emerald'> = { 1: 'violet', 2: 'sky', 3: 'emerald' }
const TIER_LABEL: Record<number, string> = { 1: 'Exact', 2: 'Fuzzy', 3: 'AI' }

export function MatchTable({ matches }: { matches: Match[] }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(
    () =>
      matches.filter((m) =>
        (m.razorpay_id + m.bank_id + m.order_id).toLowerCase().includes(q.toLowerCase()),
      ),
    [matches, q],
  )

  useEffect(() => {
    if (filtered.length) flashRows('.match-row')
  }, [filtered])

  return (
    <Card className="result-table overflow-hidden">
      <CardHeader className="border-b border-white/5">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="size-4 text-violet-400" />
          <CardTitle>Matched Transactions</CardTitle>
          <Badge tone="violet" className="ml-1">{matches.length}</Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter…"
            className="w-48 rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-xs text-zinc-200 outline-none placeholder:text-zinc-500 focus:border-violet-500/60 focus:bg-white/10 transition-colors"
          />
        </div>
      </CardHeader>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#0f0f12]">
            <tr className="border-b border-white/5 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <th className="px-5 py-3">Settlement ID</th>
              <th className="px-5 py-3">Bank Txn</th>
              <th className="px-5 py-3">Order</th>
              <th className="px-5 py-3">Tier</th>
              <th className="px-5 py-3 text-right">Confidence</th>
              <th className="px-5 py-3">Explanation</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.razorpay_id + m.bank_id} className="match-row border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                <td className="px-5 py-3 font-mono text-xs text-zinc-300">{m.razorpay_id}</td>
                <td className="px-5 py-3 font-mono text-xs text-zinc-400">{m.bank_id}</td>
                <td className="px-5 py-3 font-mono text-xs text-zinc-400">{m.order_id}</td>
                <td className="px-5 py-3"><Badge tone={TIER_TONE[m.tier]}>{TIER_LABEL[m.tier] ?? `T${m.tier}`}</Badge></td>
                <td className="px-5 py-3 text-right">
                  <Badge tone={CONF_TONE(m.confidence)} className="tabular">{(m.confidence * 100).toFixed(0)}%</Badge>
                </td>
                <td className="px-5 py-3 text-xs text-zinc-500">{m.explanation}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-zinc-500">
                  No matches
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
