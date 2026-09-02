import { useMemo, useState } from 'react'
import type { Match } from '../lib/types'
import { cn } from '../lib/utils'

const CONF_COLOR = (c: number) =>
  c >= 0.95 ? 'text-emerald-400' : c >= 0.85 ? 'text-blue-400' : c >= 0.7 ? 'text-amber-400' : 'text-red-400'

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

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <h3 className="font-semibold">Matched Transactions</h3>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter…"
          className="w-48 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs outline-none focus:border-blue-500"
        />
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-900/95">
            <tr className="border-b border-slate-800 text-left text-xs text-slate-400">
              <th className="px-6 py-3">Settlement ID</th>
              <th className="px-6 py-3">Bank Txn</th>
              <th className="px-6 py-3">Order</th>
              <th className="px-6 py-3">Tier</th>
              <th className="px-6 py-3 text-right">Confidence</th>
              <th className="px-6 py-3">Explanation</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.razorpay_id + m.bank_id} className="border-b border-slate-800/60 transition-colors hover:bg-slate-800/30">
                <td className="px-6 py-3 font-mono text-xs">{m.razorpay_id}</td>
                <td className="px-6 py-3 font-mono text-xs">{m.bank_id}</td>
                <td className="px-6 py-3 font-mono text-xs">{m.order_id}</td>
                <td className="px-6 py-3">
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-300">
                    {TIER_LABEL[m.tier] ?? `T${m.tier}`}
                  </span>
                </td>
                <td className={cn('px-6 py-3 text-right font-semibold tabular', CONF_COLOR(m.confidence))}>
                  {(m.confidence * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-3 text-xs text-slate-400">{m.explanation}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-6 text-center text-slate-500">
                  No matches
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
