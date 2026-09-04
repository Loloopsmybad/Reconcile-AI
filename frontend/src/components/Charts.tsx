import { Area, AreaChart, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { ArrowUpRight, TrendingUp, Scale, BarChart3 } from 'lucide-react'
import type { Match, Metrics } from '../lib/types'
import { Card, CardContent, CardHeader, CardTitle, Badge } from './ui'

const DONUT_COLORS = ['#34d399', '#fbbf24']

const FAULT_COLORS: Record<string, string> = {
  exact: '#8b5cf6',
  fee: '#f59e0b',
  tplus1: '#06b6d4',
  ref_diff: '#a78bfa',
  orphan: '#ef4444',
}

const FAULT_LABELS: Record<string, string> = {
  exact: 'Exact',
  fee: 'Fee diff',
  tplus1: 'T+1 lag',
  ref_diff: 'Ref diff',
  orphan: 'Orphan',
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-semibold text-zinc-200">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} className="tabular-nums text-zinc-300">
          <span style={{ color: p.fill || p.color || p.stroke }}>{p.name}:</span> {p.value}
        </p>
      ))}
    </div>
  )
}

export function Charts({ matches, metrics, rate }: { matches: Match[]; metrics: Metrics | null; rate: number }) {
  const donutData = [
    { name: 'Matched', value: metrics?.correct ?? matches.length },
    { name: 'Exceptions', value: metrics?.reported_unmatched ?? 0 },
  ]

  // Throughput area data
  const throughput = [
    { step: 'Start', matched: 0 },
    { step: 'Tier 1', matched: Math.round(matches.filter((m) => m.tier === 1).length / 2) },
    { step: 'Tier 2', matched: matches.filter((m) => m.tier <= 2).length },
    { step: 'Tier 3', matched: matches.filter((m) => m.tier <= 3).length },
    { step: 'Done', matched: matches.length },
  ]

  // Per-fault-type bar chart
  const faultData = metrics?.per_fault_type
    ? Object.entries(metrics.per_fault_type).map(([key, val]) => ({
        name: FAULT_LABELS[key] || key,
        correct: val.correct,
        wrong: val.wrong,
        total: val.total,
        fill: FAULT_COLORS[key] || '#71717a',
      }))
    : []

  // Confidence distribution histogram
  const confBuckets = [
    { range: '100%', count: 0, fill: '#34d399' },
    { range: '90-99%', count: 0, fill: '#06b6d4' },
    { range: '80-89%', count: 0, fill: '#f59e0b' },
    { range: '<80%', count: 0, fill: '#ef4444' },
  ]
  for (const m of matches) {
    const c = m.confidence * 100
    if (c >= 100) confBuckets[0].count++
    else if (c >= 90) confBuckets[1].count++
    else if (c >= 80) confBuckets[2].count++
    else confBuckets[3].count++
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Throughput / accuracy card */}
      <Card className="result-chart lg:col-span-2 overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-violet-400" />
            <CardTitle>Reconciliation coverage</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-semibold tabular-nums text-zinc-100">{rate}%</span>
            <Badge tone="emerald"><ArrowUpRight className="size-3.5" /> auto</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughput} margin={{ left: -20, right: 10, top: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillAcc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6d5cff" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6d5cff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <XAxis dataKey="step" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 'dataMax + 2']} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="matched" stroke="#6d5cff" strokeWidth={2} fill="url(#fillAcc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Donut */}
      <Card className="result-chart overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Scale className="size-4 text-emerald-400" />
            <CardTitle>Match vs Exceptions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" innerRadius={58} outerRadius={80} paddingAngle={3} stroke="none">
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-400" /> Matched</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber-400" /> Exceptions</span>
          </div>
        </CardContent>
      </Card>

      {/* Per-fault-type bar chart */}
      {faultData.length > 0 && (
        <Card className="result-chart overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-sky-400" />
              <CardTitle>By fault type</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={faultData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="correct" name="Correct" radius={[0, 4, 4, 0]}>
                    {faultData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confidence distribution */}
      <Card className="result-chart overflow-hidden lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-400" />
            <CardTitle>Confidence distribution</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confBuckets} margin={{ left: 0, right: 10, top: 6, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="range" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Matches" radius={[6, 6, 0, 0]}>
                  {confBuckets.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
