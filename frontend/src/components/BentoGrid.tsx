import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { Shield, Zap, AlertTriangle, GitCompare, Search, Brain, FileText, CheckCircle2, TrendingUp, ArrowRight } from 'lucide-react'

const features = [
  {
    title: 'Exact Match',
    description: 'Reference, amount, and date identical. Instant, deterministic, zero ambiguity.',
    icon: Shield,
    tone: 'violet',
    span: 'md:col-span-2 md:row-span-1',
    visual: <ExactMatchVisual />,
  },
  {
    title: 'Fuzzy Match',
    description: 'Amount within ₹1, date ±1 day, ref similarity ≥ 0.80. Catches T+1 lag and typos.',
    icon: GitCompare,
    tone: 'sky',
    span: 'md:col-span-1 md:row-span-1',
    visual: <FuzzyMatchVisual />,
  },
  {
    title: 'AI Agent',
    description: 'LLM arbitrates genuinely ambiguous cases. Structured JSON output with reasoning.',
    icon: Brain,
    tone: 'emerald',
    span: 'md:col-span-1 md:row-span-2',
    visual: <AIAgentVisual />,
  },
  {
    title: 'Fault Detection',
    description: 'Surfaces 5 fault types — fee mismatches, T+1 delays, ref diffs, orphans.',
    icon: AlertTriangle,
    tone: 'amber',
    span: 'md:col-span-1 md:row-span-1',
    visual: <FaultDetectionVisual />,
  },
  {
    title: 'Multi-Source',
    description: 'Reconciles Razorpay settlements, bank statements, and order logs simultaneously.',
    icon: FileText,
    tone: 'rose',
    span: 'md:col-span-1 md:row-span-1',
    visual: <MultiSourceVisual />,
  },
  {
    title: 'Search & Query',
    description: 'Natural language questions about your settlement data. Ask anything.',
    icon: Search,
    tone: 'sky',
    span: 'md:col-span-1 md:row-span-1',
    visual: <SearchVisual />,
  },
  {
    title: 'Audit Trail',
    description: 'Every match is explainable. Full provenance from raw data to final verdict.',
    icon: CheckCircle2,
    tone: 'violet',
    span: 'md:col-span-1 md:row-span-1',
    visual: <AuditTrailVisual />,
  },
  {
    title: '100% Accuracy',
    description: '60 transactions, 5 fault types, zero false positives on synthetic ground truth.',
    icon: TrendingUp,
    tone: 'emerald',
    span: 'md:col-span-2 md:row-span-1',
    visual: <AccuracyVisual />,
  },
]

const toneMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', glow: 'shadow-violet-500/5' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', glow: 'shadow-sky-500/5' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/5' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'shadow-amber-500/5' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', glow: 'shadow-rose-500/5' },
}

function ExactMatchVisual() {
  const bars = [65, 80, 45, 90, 55, 70, 85, 60]
  return (
    <div className="flex items-end gap-1 h-16 mt-3">
      {bars.map((h, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm bg-gradient-to-t from-violet-500/40 to-violet-400/80 bento-bar"
            style={{ height: `${h}%` }}
          />
        </div>
      ))}
    </div>
  )
}

function FuzzyMatchVisual() {
  return (
    <div className="mt-3 flex items-center gap-3">
      <div className="flex-1 rounded-lg border border-white/5 bg-white/[0.03] p-2">
        <div className="text-[10px] text-zinc-500 mb-1">Source A</div>
        <div className="font-mono text-xs text-sky-400">₹12,450.00</div>
      </div>
      <ArrowRight className="size-4 text-zinc-600 shrink-0" />
      <div className="flex-1 rounded-lg border border-white/5 bg-white/[0.03] p-2">
        <div className="text-[10px] text-zinc-500 mb-1">Source B</div>
        <div className="font-mono text-xs text-sky-400">₹12,449.50</div>
      </div>
    </div>
  )
}

function AIAgentVisual() {
  return (
    <div className="mt-3 space-y-2">
      {['Analyzing fee gap...', 'Checking T+1 window...', 'Verdict: MATCH (fee_diff)'].map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`size-1.5 rounded-full ${i === 2 ? 'bg-emerald-400' : 'bg-emerald-400/40'}`} />
          <span className={`text-xs font-mono ${i === 2 ? 'text-emerald-400' : 'text-zinc-500'}`}>{step}</span>
        </div>
      ))}
      <div className="mt-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2">
        <span className="text-[10px] text-emerald-400/70">JSON Output</span>
        <pre className="text-[10px] font-mono text-emerald-300 mt-1">{`{ "verdict": "match",
  "tier": "ai",
  "confidence": 0.94 }`}</pre>
      </div>
    </div>
  )
}

function FaultDetectionVisual() {
  const faults = [
    { label: 'Fee', color: 'bg-amber-400', count: 12 },
    { label: 'T+1', color: 'bg-sky-400', count: 8 },
    { label: 'Ref', color: 'bg-rose-400', count: 5 },
    { label: 'Orphan', color: 'bg-zinc-400', count: 3 },
  ]
  return (
    <div className="mt-3 space-y-2">
      {faults.map((f) => (
        <div key={f.label} className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 w-12">{f.label}</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className={`h-full rounded-full ${f.color} opacity-60`} style={{ width: `${(f.count / 15) * 100}%` }} />
          </div>
          <span className="text-[10px] font-mono text-zinc-400 w-4 text-right">{f.count}</span>
        </div>
      ))}
    </div>
  )
}

function MultiSourceVisual() {
  const sources = ['Razorpay', 'Bank', 'Orders']
  return (
    <div className="mt-3 space-y-2">
      {sources.map((s, i) => (
        <div key={s} className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.03] px-2 py-1.5">
          <div className={`size-1.5 rounded-full ${i === 0 ? 'bg-rose-400' : i === 1 ? 'bg-sky-400' : 'bg-amber-400'}`} />
          <span className="text-xs text-zinc-400">{s}</span>
          <span className="ml-auto text-[10px] font-mono text-zinc-600">{i === 0 ? '24 rows' : i === 1 ? '20 rows' : '16 rows'}</span>
        </div>
      ))}
    </div>
  )
}

function SearchVisual() {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
        <Search className="size-3 text-zinc-500" />
        <span className="text-xs text-zinc-500">Show unmatched settlements</span>
      </div>
      <div className="rounded-md border border-sky-500/20 bg-sky-500/5 p-2">
        <span className="text-[10px] text-sky-400/70">3 results found</span>
      </div>
    </div>
  )
}

function AuditTrailVisual() {
  const steps = ['CSV Upload', 'Tier 1 Scan', 'Tier 2 Fuzzy', 'Verdict']
  return (
    <div className="mt-3 flex items-center justify-between">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`size-2 rounded-full ${i === steps.length - 1 ? 'bg-violet-400' : 'bg-violet-400/30'}`} />
            <span className="text-[9px] text-zinc-600 mt-1 whitespace-nowrap">{step}</span>
          </div>
          {i < steps.length - 1 && <div className="w-6 h-px bg-violet-500/20 mx-1" />}
        </div>
      ))}
    </div>
  )
}

function AccuracyVisual() {
  const segments = [
    { pct: 92, color: 'from-emerald-500 to-emerald-400', label: '92% exact' },
    { pct: 5, color: 'from-sky-500 to-sky-400', label: '5% fuzzy' },
    { pct: 3, color: 'from-violet-500 to-violet-400', label: '3% AI' },
  ]
  let offset = 0
  return (
    <div className="mt-3">
      <div className="h-3 rounded-full bg-white/5 overflow-hidden flex">
        {segments.map((s, i) => {
          offset += s.pct
          return (
            <div
              key={i}
              className={`h-full bg-gradient-to-r ${s.color} opacity-80 transition-all duration-700`}
              style={{ width: `${s.pct}%` }}
            />
          )
        })}
      </div>
      <div className="flex gap-4 mt-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className={`size-1.5 rounded-full bg-gradient-to-r ${s.color}`} />
            <span className="text-[10px] text-zinc-500">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BentoGrid() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const cards = ref.current.querySelectorAll('.bento-card')
    animate(cards, {
      opacity: [0, 1],
      translateY: [24, 0],
      scale: [0.97, 1],
      duration: 600,
      ease: 'outQuad',
      delay: stagger(80),
    })
    const bars = ref.current.querySelectorAll('.bento-bar')
    animate(bars, {
      scaleY: [0, 1],
      duration: 500,
      ease: 'outBack(1.4)',
      delay: stagger(60, { start: 400 }),
    })
  }, [])

  return (
    <section className="w-full py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <div className="intro-item mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-400">
            <Zap className="size-3.5 text-amber-400" />
            Everything you need
          </div>
          <h2 className="intro-item font-serif text-4xl tracking-tight text-zinc-100 md:text-5xl">
            Built for real reconciliation
          </h2>
          <p className="intro-item mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Not a demo. A production-grade engine that handles messy, real-world settlement data.
          </p>
        </div>

        <div ref={ref} className="grid grid-cols-1 gap-4 md:grid-cols-4 md:auto-rows-[minmax(180px,auto)]">
          {features.map((f) => {
            const t = toneMap[f.tone]
            return (
              <div
                key={f.title}
                className={`bento-card group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-5 transition-all duration-300 hover:border-white/[0.12] hover:shadow-lg ${t.glow} ${f.span}`}
              >
                {/* subtle gradient hover */}
                <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/[0.02] to-transparent" />

                <div className="relative z-10">
                  <div className={`mb-3 inline-flex items-center justify-center size-8 rounded-lg ${t.bg}`}>
                    <f.icon className={`size-4 ${t.text}`} />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100">{f.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{f.description}</p>
                  {f.visual}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
