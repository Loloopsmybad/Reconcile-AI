import { useEffect } from 'react'
import { ShieldAlert, Wallet, CalendarClock } from 'lucide-react'
import type { Unmatched } from '../lib/types'
import { Card, CardContent, CardHeader, CardTitle, Badge } from './ui'
import { flashRows } from '../lib/anim'

export function ExceptionTable({ exceptions }: { exceptions: Unmatched[] }) {
  useEffect(() => {
    if (exceptions.length) flashRows('.exception-row')
  }, [exceptions])

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
              <th className="px-5 py-3">Record ID</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Reason</th>
              <th className="px-5 py-3">Suggestion</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map((u) => (
              <tr key={u.id ?? u.razorpay_id} className="exception-row border-b border-white/5 transition-colors hover:bg-white/[0.03]">
                <td className="px-5 py-3 font-mono text-xs text-zinc-300">{u.id ?? u.razorpay_id}</td>
                <td className="px-5 py-3 text-right font-medium tabular text-zinc-200">₹{Number(u.amount ?? 0).toFixed(2)}</td>
                <td className="px-5 py-3 font-mono text-xs text-zinc-400">{u.date}</td>
                <td className="px-5 py-3 text-xs text-amber-200/90">{u.reason}</td>
                <td className="px-5 py-3 text-xs text-zinc-500">{u.suggestion ?? '—'}</td>
              </tr>
            ))}
            {exceptions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-zinc-500">
                  No exceptions — everything reconciled ✓
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Mini legend */}
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
