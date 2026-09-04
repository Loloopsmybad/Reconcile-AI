import { Fragment, useEffect, useState } from 'react'
import { ShieldAlert, Wallet, CalendarClock, ChevronDown, ChevronRight } from 'lucide-react'
import type { Unmatched } from '../lib/types'
import { Card, CardContent, CardHeader, CardTitle, Badge } from './ui'
import { flashRows } from '../lib/anim'

const CODE_TONE: Record<string, 'amber' | 'sky' | 'rose' | 'violet' | 'emerald'> = {
  ORPHAN: 'amber',
  FEE_DIFF: 'amber',
  TPLUS1: 'sky',
  REF_DIFF: 'violet',
  EXACT_MATCH: 'emerald',
}
const CODE_LABEL: Record<string, string> = {
  ORPHAN: 'Orphan',
  FEE_DIFF: 'Fee gap',
  TPLUS1: 'T+1',
  REF_DIFF: 'Ref diff',
}

export function ExceptionTable({ exceptions }: { exceptions: Unmatched[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (exceptions.length) flashRows('.exception-row')
  }, [exceptions])

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Card className="result-table overflow-hidden border-amber-500/20">
      <CardHeader className="border-b border-white/5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-amber-400" />
          <CardTitle>Honest Exceptions</CardTitle>
          <Badge tone="amber" className="ml-1">{exceptions.length}</Badge>
        </div>
        <span className="text-xs text-zinc-500">
          Every unresolved record, explained — nothing hidden
        </span>
      </CardHeader>
      <div className="max-h-[360px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#0f0f12]">
            <tr className="border-b border-white/5 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              <th className="px-5 py-3 w-8"></th>
              <th className="px-5 py-3">Record ID</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Reason</th>
              <th className="px-5 py-3">Code</th>
              <th className="px-5 py-3">Suggestion</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map((u) => {
              const rowKey = u.id ?? u.razorpay_id ?? ''
              const code = u.reason_code ?? ''
              const isOpen = expanded.has(rowKey)
              return (
                <Fragment key={rowKey}>
                  <tr className="exception-row border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                    <td className="px-2 py-3">
                      <button
                        onClick={() => toggle(rowKey)}
                        className="rounded p-0.5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10 transition-colors"
                        aria-label={isOpen ? 'Collapse' : 'Expand'}
                      >
                        {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-300">{u.id ?? u.razorpay_id}</td>
                    <td className="px-3 py-3 text-right font-medium tabular text-zinc-200">₹{Number(u.amount ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-3 font-mono text-xs text-zinc-400">{u.date}</td>
                    <td className="px-3 py-3 text-xs text-amber-200/90 max-w-[200px] truncate">{u.reason}</td>
                    <td className="px-3 py-3">
                      {code ? <Badge tone={CODE_TONE[code] ?? 'default'}>{CODE_LABEL[code] ?? code}</Badge> : <span className="text-xs text-zinc-500">—</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-500">{u.suggestion ?? '—'}</td>
                  </tr>
                  {isOpen && u.field_diffs && u.field_diffs.length > 0 && (
                    <tr className="exception-row border-b border-white/5 bg-white/[0.015]">
                      <td colSpan={7} className="px-5 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Field differences</div>
                        <div className="flex flex-wrap gap-3">
                          {u.field_diffs.map((d, i) => (
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
                </Fragment>
              )
            })}
            {exceptions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm text-zinc-500">
                  No exceptions — everything reconciled ✓
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {exceptions.length > 0 && (
        <CardContent className="border-t border-white/5 pt-4">
          <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5"><Wallet className="size-3.5 text-amber-400" /> Orphan / pending settlement</span>
            <span className="flex items-center gap-1.5"><CalendarClock className="size-3.5 text-sky-400" /> T+1 lag not yet landed</span>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
