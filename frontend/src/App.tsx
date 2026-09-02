import { useEffect, useState } from 'react'
import { animate, stagger } from 'animejs'
import { Loader2, Zap, ShieldCheck, Flame, Scale } from 'lucide-react'
import { MetricCard } from './components/MetricCard'
import { UploadCard } from './components/UploadCard'
import { MatchTable } from './components/MatchTable'
import { ExceptionTable } from './components/ExceptionTable'
import { Charts } from './components/Charts'
import { Button, LiveBadge } from './components/ui'
import { introReveal, resultTimeline } from './lib/anim'
import { runDemo, reconcile, checkHealth } from './lib/api'
import type { Match, Unmatched, Metrics } from './lib/types'
import { cn } from './lib/utils'

interface ResultState {
  matches: Match[]
  exceptions: Unmatched[]
  metrics: Metrics | null
  rate: number
}

function App() {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResultState | null>(null)
  const [files, setFiles] = useState<{ razorpay: File | null; bank: File | null; orders: File | null }>({
    razorpay: null,
    bank: null,
    orders: null,
  })

  useEffect(() => {
    checkHealth().then(setApiOnline)
    introReveal('.intro-item')
  }, [])

  useEffect(() => {
    // Ambient breathing background blobs with anime
    animate('.bg-blob', {
      scale: [1, 1.15, 1],
      opacity: [0.9, 1, 0.9],
      duration: 8000,
      delay: stagger(1200),
      loop: true,
      ease: 'easeInOutSine',
    })
  }, [])

  useEffect(() => {
    if (result) resultTimeline()
  }, [result])

  const handleRunDemo = async () => {
    setLoading(true)
    setApiOnline(true)
    try {
      const data = await runDemo(true)
      setResult({
        matches: data.sample_matches,
        exceptions: data.sample_unmatched,
        metrics: data.metrics,
        rate: Math.round((data.metrics.true_accuracy ?? 1) * 100),
      })
    } catch (e) {
      console.error(e)
      setApiOnline(false)
    } finally {
      setLoading(false)
    }
  }

  const handleRunUpload = async () => {
    if (!files.razorpay || !files.bank || !files.orders) return
    setLoading(true)
    try {
      const data = await reconcile(files.razorpay, files.bank, files.orders)
      setResult({
        matches: data.matches,
        exceptions: data.unmatched,
        metrics: null,
        rate: Math.round(data.match_rate * 100),
      })
    } catch (e) {
      console.error(e)
      setApiOnline(false)
    } finally {
      setLoading(false)
    }
  }

  const statusClass =
    apiOnline === null
      ? 'bg-zinc-800 text-zinc-400'
      : apiOnline
        ? 'bg-emerald-500/10 text-emerald-400'
        : 'bg-rose-500/10 text-rose-400'

  const statusLabel = apiOnline === null ? 'checking…' : apiOnline ? 'online' : 'offline'

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid">
        <div className="bg-blob absolute -left-32 top-0 h-[480px] w-[480px] rounded-full bg-violet-600/15 blur-3xl" />
        <div className="bg-blob absolute -right-32 top-40 h-[440px] w-[440px] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="bg-blob absolute bottom-0 left-1/3 h-[380px] w-[500px] rounded-full bg-fuchsia-600/5 blur-3xl" />
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <header className="intro-item mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-950/50">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-2xl leading-none tracking-tight text-zinc-100">
                Reconcile-AI
              </h1>
              <p className="text-xs text-zinc-500">Settlement &amp; Reconciliation Agent</p>
            </div>
          </div>
          <div className="ml-4 flex items-center gap-3">
            <LiveBadge live={apiOnline !== false} />
            <span className={cn('rounded-lg border border-transparent px-3 py-1.5 text-xs', statusClass)}>
              API: {statusLabel}
            </span>
            <Button onClick={handleRunDemo} disabled={loading} variant="outline" className="gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              {loading ? 'Working…' : 'Run Demo Data'}
            </Button>
          </div>
        </header>

        {/* Upload */}
        <div className="intro-item mb-8">
          <UploadCard onFiles={setFiles} onRun={handleRunUpload} loading={loading} />
        </div>

        {/* Processing */}
        {loading && (
          <div className="flex flex-col items-center py-16 text-zinc-300">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            <p className="text-sm">Reconciling records across three sources…</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <MetricCard
                label="Transactions"
                value={result.matches.length + result.exceptions.length}
                icon={<Scale className="size-4" />}
              />
              <MetricCard
                label="Matched"
                value={result.matches.length}
                icon={<ShieldCheck className="size-4" />}
                tone="emerald"
              />
              <MetricCard
                label="Exceptions"
                value={result.exceptions.length}
                icon={<Flame className="size-4" />}
                tone="amber"
              />
              <MetricCard
                label="Match Rate"
                value={result.rate}
                icon={<Zap className="size-4" />}
                tone="violet"
                trendText="auto"
              />
            </div>

            <Charts matches={result.matches} metrics={result.metrics} rate={result.rate} />

            <MatchTable matches={result.matches} />
            <ExceptionTable exceptions={result.exceptions} />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
