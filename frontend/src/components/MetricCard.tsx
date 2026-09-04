import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui'
import { cn } from '../lib/utils'
import { countUp } from '../lib/anim'

type Tone = 'emerald' | 'amber' | 'violet' | 'default'

const toneIconStyles: Record<Tone, string> = {
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  violet: 'text-violet-400',
  default: 'text-zinc-300',
}

interface MetricCardProps {
  label: string
  value: number
  icon: React.ReactNode
  tone?: Tone
  trendText?: string
}

export function MetricCard({ label, value, icon, tone = 'default', trendText }: MetricCardProps) {
  const valueRef = useRef<HTMLSpanElement>(null)
  const [displayed, setDisplayed] = useState(value)

  useEffect(() => {
    if (valueRef.current && value > 0) {
      countUp(valueRef.current, value, 0)
    } else {
      setDisplayed(value)
    }
  }, [value])

  return (
    <Card className="result-metric overflow-hidden">
      <CardHeader className="pb-2">
        <div className={cn('flex items-center gap-2', toneIconStyles[tone])}>{icon}</div>
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span ref={valueRef} className="text-3xl font-semibold tracking-tight tabular text-zinc-100">
            {displayed}
          </span>
          {trendText && (
            <span className="text-xs font-medium text-emerald-400">↑ {trendText}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
