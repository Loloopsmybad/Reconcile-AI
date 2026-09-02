import { useEffect, useRef } from 'react'
import { cn } from '../lib/utils'
import { countUp } from '../lib/anim'

interface StatCardProps {
  label: string
  value: string
  tone?: 'default' | 'emerald' | 'amber' | 'blue'
  delay?: number
  suffix?: string
}

export function StatCard({ label, value, tone = 'default', delay = 0, suffix }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const numRef = useRef<HTMLSpanElement>(null)
  const isNumeric = !suffix

  useEffect(() => {
    if (numRef.current && value && /^[\d.]+$/.test(value.replace('%', '').trim())) {
      const target = parseFloat(value.replace('%', ''))
      countUp(numRef.current, target)
    }
    // trigger parent scale-in handled by App's fadeUp
  }, [value])

  const tones: Record<string, string> = {
    default: 'text-slate-100',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
  }

  return (
    <div
      ref={ref}
      style={{ animationDelay: `${delay}ms` }}
      className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur transition-colors hover:border-slate-700"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl transition-opacity opacity-0 group-hover:opacity-100" />
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={cn('text-3xl font-bold tabular', tones[tone])} style={{ fontVariationSettings: '"opsz" auto' }}>
        {isNumeric ? <span ref={numRef} /> : value}
        {suffix && <span className="text-lg">{suffix}</span>}
      </p>
    </div>
  )
}
