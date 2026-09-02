import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { Match, Metrics } from '../lib/types'

const DONUT_COLORS = ['#10b981', '#f59e0b']
const TIER_COLORS = ['#3b82f6', '#8b5cf6', '#10b981']

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-semibold text-slate-200">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} className="tabular text-slate-300">
          <span style={{ color: p.color }}>{p.name}:</span> {p.value}
        </p>
      ))}
    </div>
  )
}

export function Charts({ matches, metrics }: { matches: Match[]; metrics: Metrics | null }) {
  const donutData = [
    { name: 'Matched', value: metrics?.correct ?? matches.length },
    { name: 'Exceptions', value: metrics?.reported_unmatched ?? 0 },
  ]

  const tiers = [1, 2, 3]
  const tierData = tiers.map((t) => ({
    name: `Tier ${t} · ${t === 1 ? 'Exact' : t === 2 ? 'Fuzzy' : 'AI'}`,
    value: matches.filter((m) => m.tier === t).length,
  }))

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <h3 className="mb-4 text-sm font-semibold">Match vs Exceptions</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={donutData} dataKey="value" innerRadius={60} outerRadius={85} paddingAngle={3}>
                {donutData.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 md:col-span-2">
        <h3 className="mb-4 text-sm font-semibold">Agent Match Rate by Tier</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tierData} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,.06)' }} />
              {tierData.map((_, i) => (
                <Bar key={i} dataKey="value" fill={TIER_COLORS[i]} radius={[6, 6, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
