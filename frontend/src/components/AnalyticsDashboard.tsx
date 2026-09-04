import { PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { TrendingDown, CreditCard, Clock, ShieldAlert, IndianRupee, AlertTriangle, ArrowDownRight, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from './ui'
import type { AnalyticsData } from '../lib/types'

const MODE_COLORS = ['#8b5cf6', '#06b6d4', '#34d399', '#f59e0b', '#ef4444', '#ec4899']
const RISK_COLORS: Record<string, string> = {
  LOW: 'emerald',
  MEDIUM: 'amber',
  HIGH: 'rose',
  CRITICAL: 'rose',
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-semibold text-zinc-200">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} className="tabular-nums text-zinc-300">
          <span style={{ color: p.fill || p.color || p.stroke }}>{p.name}:</span> {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

function fmtINR(v: number) {
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const { revenue_leakage: rl, payment_mode_profitability: pm, settlement_velocity: sv, merchant_risk_scores: mr } = data

  const riskiestMerchant = mr.merchants[0]
  const mostProfitable = pm.summary.most_profitable_mode

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15">
          <BarChart3 className="size-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Business Intelligence</h3>
          <p className="text-xs text-zinc-500">Fee optimization, settlement velocity, merchant risk</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-rose-500/15">
              <TrendingDown className="size-4 text-rose-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Revenue Leakage</p>
              <p className="text-lg font-semibold tabular-nums text-rose-400">{fmtINR(rl.total_leakage)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-sky-500/15">
              <Clock className="size-4 text-sky-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Avg Settlement</p>
              <p className="text-lg font-semibold tabular-nums text-sky-400">{sv.avg_days}d</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/15">
              <ShieldAlert className="size-4 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Riskiest Merchant</p>
              <p className="text-sm font-semibold text-amber-400 truncate max-w-[120px]">{riskiestMerchant?.merchant ?? 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/15">
              <IndianRupee className="size-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Most Profitable</p>
              <p className="text-lg font-semibold text-emerald-400">{mostProfitable}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Leakage */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingDown className="size-4 text-rose-400" />
            <CardTitle>Revenue Leakage</CardTitle>
          </div>
          <Badge tone="rose">{fmtINR(rl.total_leakage)} total</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <div className="rounded-lg border border-rose-500/10 bg-rose-500/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Fee Overcharges</p>
              <p className="text-lg font-semibold tabular-nums text-rose-400">{rl.fee_overcharge.count}</p>
              <p className="text-xs text-zinc-500">{fmtINR(rl.fee_overcharge.total_amount)}</p>
            </div>
            <div className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Duplicate Settlements</p>
              <p className="text-lg font-semibold tabular-nums text-amber-400">{rl.duplicate_settlements.count}</p>
              <p className="text-xs text-zinc-500">{fmtINR(rl.duplicate_settlements.total_amount)}</p>
            </div>
            <div className="rounded-lg border border-orange-500/10 bg-orange-500/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Orphan Float</p>
              <p className="text-lg font-semibold tabular-nums text-orange-400">{rl.orphan_float.count}</p>
              <p className="text-xs text-zinc-500">{fmtINR(rl.orphan_float.total_amount)}</p>
            </div>
          </div>

          {/* Fee overcharge details */}
          {rl.fee_overcharge.details.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-left text-zinc-500">
                    <th className="pb-2 pr-4 font-medium">Merchant</th>
                    <th className="pb-2 pr-4 font-medium">Mode</th>
                    <th className="pb-2 pr-4 font-medium text-right">Amount</th>
                    <th className="pb-2 font-medium text-right">Overcharge</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-400">
                  {rl.fee_overcharge.details.map((d) => (
                    <tr key={d.razorpay_id} className="border-b border-white/[0.03]">
                      <td className="py-1.5 pr-4 truncate max-w-[140px]">{d.merchant}</td>
                      <td className="py-1.5 pr-4">{d.payment_mode}</td>
                      <td className="py-1.5 pr-4 text-right tabular-nums">{fmtINR(d.order_amount)}</td>
                      <td className="py-1.5 text-right tabular-nums text-rose-400">{fmtINR(d.overcharge_amount)} ({d.overcharge_pct}%)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Mode Profitability + Settlement Velocity side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Payment Mode */}
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-violet-400" />
              <CardTitle>Payment Mode Profitability</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pm.modes} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                  <YAxis dataKey="payment_mode" type="category" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="effective_take_rate_pct" name="Take Rate %" radius={[0, 4, 4, 0]}>
                    {pm.modes.map((_, i) => (
                      <Cell key={i} fill={MODE_COLORS[i % MODE_COLORS.length]} opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1.5">
              {pm.modes.map((m, i) => (
                <div key={m.payment_mode} className="flex items-center gap-2 text-xs">
                  <span className="size-2 rounded-full" style={{ backgroundColor: MODE_COLORS[i % MODE_COLORS.length] }} />
                  <span className="text-zinc-400">{m.payment_mode}</span>
                  <span className="ml-auto tabular-nums text-zinc-500">{m.volume_share_pct}% vol</span>
                  <span className="tabular-nums text-zinc-500">{m.revenue_share_pct}% rev</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Settlement Velocity */}
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-sky-400" />
              <CardTitle>Settlement Velocity</CardTitle>
            </div>
            <Badge tone="sky">{sv.delayed_count} delayed</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sv.histogram} margin={{ left: -10, right: 10, top: 6, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="bucket" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Settlements" radius={[4, 4, 0, 0]}>
                    {sv.histogram.map((entry, i) => (
                      <Cell key={i} fill={i <= 3 ? '#06b6d4' : '#f59e0b'} opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-zinc-500">
              <span>Avg: <span className="tabular-nums text-zinc-300">{sv.avg_days}d</span></span>
              <span>Median: <span className="tabular-nums text-zinc-300">{sv.median_days}d</span></span>
              <span>Max: <span className="tabular-nums text-zinc-300">{sv.max_days}d</span></span>
              <span>Delayed: <span className="tabular-nums text-amber-400">{sv.delayed_rate_pct}%</span></span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Merchant Risk Scoring */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-400" />
            <CardTitle>Merchant Risk Scoring</CardTitle>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span>Orphan <span className="text-zinc-300">30%</span></span>
            <span>Fee disc <span className="text-zinc-300">25%</span></span>
            <span>Outlier <span className="text-zinc-300">20%</span></span>
            <span>Delay <span className="text-zinc-300">25%</span></span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-left text-zinc-500">
                  <th className="pb-2 pr-4 font-medium">Merchant</th>
                  <th className="pb-2 pr-4 font-medium text-right">Score</th>
                  <th className="pb-2 pr-4 font-medium">Risk</th>
                  <th className="pb-2 pr-4 font-medium text-right">Orphan %</th>
                  <th className="pb-2 pr-4 font-medium text-right">Fee Disc %</th>
                  <th className="pb-2 pr-4 font-medium text-right">Outliers</th>
                  <th className="pb-2 font-medium text-right">Avg Delay</th>
                </tr>
              </thead>
              <tbody className="text-zinc-400">
                {mr.merchants.map((m) => (
                  <tr key={m.merchant} className="border-b border-white/[0.03]">
                    <td className="py-1.5 pr-4 truncate max-w-[160px]">{m.merchant}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums font-medium text-zinc-200">{m.composite_score}</td>
                    <td className="py-1.5 pr-4">
                      <Badge tone={RISK_COLORS[m.risk_level] as any}>{m.risk_level}</Badge>
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{m.breakdown.orphan_rate_pct}%</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{m.breakdown.fee_discrepancy_rate_pct}%</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{m.breakdown.outlier_count}</td>
                    <td className="py-1.5 text-right tabular-nums">{m.breakdown.avg_settlement_delay_days}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
