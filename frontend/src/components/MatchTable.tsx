import { Fragment, useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Search, ChevronDown, ChevronRight } from 'lucide-react'
import type { Match } from '../lib/types'
import { Card, CardHeader, CardTitle, Badge } from './ui'
import { flashRows } from '../lib/anim'

const CONF_TONE = (c: number) =>
  c >= 0.95 ? 'emerald' : c >= 0.85 ? 'sky' : c >= 0.7 ? 'amber' : 'rose'

const TIER_TONE: Record<number, 'violet' | 'sky' | 'emerald'> = { 1: 'violet', 2: 'sky', 3: 'emerald' }
const TIER_LABEL: Record<number, string> = { 1: 'Exact', 2: 'Fuzzy', 3: 'AI' }

const CODE_TONE: Record<string, 'emerald' | 'amber' | 'sky' | 'violet' | 'rose' | 'default'> = {
  EXACT_MATCH: 'emerald',
  FUZZY_MATCH: 'sky',
  FEE_DIFF: 'amber',
  TPLUS1: 'sky',
  REF_DIFF: 'violet',
  ORPHAN: 'rose',
}
const CODE_LABEL: Record<string, string> = {
  EXACT_MATCH: 'Exact',
  FUZZY_MATCH: 'Fuzzy',
  FEE_DIFF: 'Fee gap',
  TPLUS1: 'T+1',
  REF_DIFF: 'Ref diff',
  ORPHAN: 'Orphan',
}

export function MatchTable({ matches }: { matches: Match[] }) {
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const filtered = useMemo(
    () =>
      matches.filter((m) =>
        (m.razorpay_id + m.bank_id + m.order_id + m.reason_code).toLowerCase().includes(q.toLowerCase()),
      ),
    [matches, q],
  )

  useEffect(() => {
    if (filtered.length) flashRows('.match-row')
  }, [filtered])

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

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
              <th className="px-5 py-3 w-8"></th>
              <th className="px-5 py-3">Settlement</th>
              <th className="px-5 py-3">Bank Txn</th>
              <th className="px-5 py-3">Tier</th>
              <th className="px-5 py-3">Reason</th>
              <th className="px-5 py-3 text-right">Conf.</th>
              <th className="px-5 py-3">Explanation</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const rowKey = m.razorpay_id + m.bank_id
              const isOpen = expanded.has(rowKey)
              const hasDiffs = m.field_diffs && m.field_diffs.length > 0
              const code = m.reason_code ?? ''
              return (
                <Fragment key={rowKey}>
                  <tr className="match-row border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                    <td className="px-2 py-3">
                      <button
                        onClick={() => toggle(rowKey)}
                        className="rounded p-0.5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10 transition-colors"
                        aria-label={isOpen ? 'Collapse' : 'Expand'}
                      >
                        {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-300">{m.razorpay_id}</td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-400">{m.bank_id}</td>
                    <td className="px-3 py-3"><Badge tone={TIER_TONE[m.tier]}>{TIER_LABEL[m.tier] ?? `T${m.tier}`}</Badge></td>
                    <td className="px-3 py-3">
                      {code ? <Badge tone={CODE_TONE[code] ?? 'default'}>{CODE_LABEL[code] ?? code}</Badge> : <span className="text-xs text-zinc-500">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Badge tone={CONF_TONE(m.confidence)} className="tabular">{(m.confidence * 100).toFixed(0)}%</Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-500 max-w-[220px] truncate">{m.explanation}</td>
                  </tr>
                  {isOpen && hasDiffs && (
                    <tr className="match-row border-b border-white/5 bg-white/[0.015]">
                      <td colSpan={7} className="px-5 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Field differences</div>
                        <div className="flex flex-wrap gap-3">
                          {m.field_diffs!.map((d, i) => (
                            <div key={i} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                              <div className="text-[10px] font-medium text-zinc-400 mb-1">{d.field}</div>
                              <div className="flex items-center gap-2 font-mono text-xs">
                                <span className="text-rose-400/90">{d.source_value}</span>
                                <span className="text-zinc-600">→</span>
                                <span className="text-emerald-400/90">{d.bank_value}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                  {isOpen && (!hasDiffs || m.field_diffs?.length === 0) && (
                    <tr className="match-row border-b border-white/5 bg-white/[0.015]">
                      <td colSpan={7} className="px-5 py-3 text-xs text-zinc-500 italic">No field differences — all fields match exactly.</td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm text-zinc-500">
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
