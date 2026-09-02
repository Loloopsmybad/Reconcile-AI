import type { Unmatched } from '../lib/types'

export function ExceptionTable({ exceptions }: { exceptions: Unmatched[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-800/50 bg-slate-900/50">
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <h3 className="font-semibold text-amber-300">Honest Exceptions</h3>
        <span className="text-xs text-slate-400">{exceptions.length} unresolved</span>
      </div>
      <div className="max-h-[360px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-900/95">
            <tr className="border-b border-slate-800 text-left text-xs text-slate-400">
              <th className="px-6 py-3">Record ID</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Reason</th>
              <th className="px-6 py-3">Suggestion</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map((u) => (
              <tr key={u.id ?? u.razorpay_id} className="border-b border-slate-800/60 transition-colors hover:bg-slate-800/30">
                <td className="px-6 py-3 font-mono text-xs">{u.id ?? u.razorpay_id}</td>
                <td className="px-6 py-3 text-right tabular">₹{Number(u.amount ?? 0).toFixed(2)}</td>
                <td className="px-6 py-3 font-mono text-xs">{u.date}</td>
                <td className="px-6 py-3 text-xs text-amber-200/90">{u.reason}</td>
                <td className="px-6 py-3 text-xs text-slate-400">{u.suggestion ?? '—'}</td>
              </tr>
            ))}
            {exceptions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-slate-500">
                  No exceptions — everything reconciled
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
