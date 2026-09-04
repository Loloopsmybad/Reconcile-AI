import { useEffect, useRef } from 'react'
import { animate } from 'animejs'
import { Scale, ArrowRight, Zap, Database } from 'lucide-react'

interface HeroProps {
  onRunDemo: () => void
  loading: boolean
  datasetSize: number
  onSizeChange: (size: number) => void
}

const SIZE_OPTIONS = [
  { value: 60, label: '60' },
  { value: 500, label: '500' },
  { value: 1000, label: '1K' },
  { value: 5000, label: '5K' },
]

export default function Hero({ onRunDemo, loading, datasetSize, onSizeChange }: HeroProps) {
  const headlineRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    animate('.hero-reveal', {
      opacity: [0, 1],
      translateY: [20, 0],
      filter: ['blur(8px)', 'blur(0px)'],
      duration: 900,
      stagger: 100,
      easing: 'easeOutCubic',
    })
  }, [])

  return (
    <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-[500px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[120px]" />
      </div>

      <div className="hero-reveal relative z-10 mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-zinc-400">
        <Scale className="size-4 text-violet-400" />
        <span>Razorpay AI Buildathon · Track 4</span>
      </div>

      <h1
        ref={headlineRef}
        className="hero-reveal relative z-10 max-w-4xl font-serif text-6xl leading-[1.08] tracking-tight text-zinc-100 md:text-7xl"
      >
        Automate your{' '}
        <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
          settlement
        </span>{' '}
        reconciliation
      </h1>

      <p className="hero-reveal relative z-10 mt-6 max-w-2xl text-lg text-zinc-400">
        Upload three CSVs — Razorpay settlements, bank statements, and order records.
        Reconcile-AI matches them across systems in seconds, reports measured accuracy,
        and flags every exception with a reason.
      </p>

      <div className="hero-reveal relative z-10 mt-10 flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onRunDemo}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-400 disabled:opacity-50"
          >
            {loading ? 'Reconciling…' : 'Run Demo'}
            {!loading && <ArrowRight className="size-4" />}
          </button>
          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            <Zap className="size-4 text-amber-400" />
            How it works
          </a>
        </div>

        {/* Dataset size selector */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Database className="size-3.5" />
          <span>Dataset:</span>
          <div className="flex gap-1">
            {SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onSizeChange(opt.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  datasetSize === opt.value
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="hero-reveal absolute bottom-12 left-1/2 -translate-x-1/2">
        <div className="flex flex-col items-center gap-2 text-xs text-zinc-600">
          <div className="h-8 w-5 rounded-full border border-white/10 p-1">
            <div className="mx-auto h-2 w-1 animate-bounce rounded-full bg-zinc-500" />
          </div>
          Scroll to explore
        </div>
      </div>
    </section>
  )
}
