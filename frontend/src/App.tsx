import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { StatCard } from './components/StatCard'
import { UploadCard } from './components/UploadCard'
import { MatchTable } from './components/MatchTable'
import { ExceptionTable } from './components/ExceptionTable'
import { Charts } from './components/Charts'
import { runDemo, reconcile, checkHealth } from './lib/api'
import type { Match, Unmatched, Metrics } from './lib/types'
import { cn } from './lib/utils'

interface ResultState {
  matches: Match[]
  exceptions: Unmatched[]
  metrics: Metrics | null
  total: number
  matched: number
  exceptionCount: number
  rate: string
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
  const shotsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkHealth().then(setApiOnline)
  }, [])

  useEffect(() => {
    // Ambient title animation
    animate('.app-title', { opacity: [0, 1], translateY: [14, 0], duration: 700, ease: 'easeOutCubic' })
    animate('.app-sub', { opacity: [0, 1], translateY: [10, 0], duration: 700, delay: 150, ease: 'easeOutCubic' })
  }, [])

  useEffect(() => {
    if (!result) return
    // Animate sections into view
    const targets = document.querySelectorAll('.result-section')
    animate(targets, { opacity: [0, 1], translateY: [18, 0], duration: 500, delay: stagger(80), ease: 'easeOutCubic' })
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
        total: data.metrics.total_transactions,
        matched: data.metrics.total_matched,
        exceptionCount: data.metrics.reported_unmatched,
        rate: ((data.metrics.true_accuracy ?? 0) * 100).toFixed(1),
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
        total: data.total_razorpay,
        matched: data.matched_count,
        exceptionCount: data.unmatched_count,
        rate: (data.match_rate * 100).toFixed(1),
      })
    } catch (e) {
      console.error(e)
      setApiOnline(false)
    } finally {
      setLoading(false)
    }
  }

  const statusBadge = apiOnline === null ? 'checking…' : apiOnline ? 'online' : 'offline'
  const statusClass =
    apiOnline === null
      ? 'bg-slate-800 text-slate-400'
      : apiOnline
        ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50'
        : 'bg-red-900/50 text-red-300 border-red-700/50'

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          ref={shotsRef}
          className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-3xl"
        />
        <div className="absolute -right-40 top-40 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[500px] rounded-full bg-violet-600/5 blur-3xl" />
      </div>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <header className="mb-10 flex items-center justify-between">
          <div className="app-title flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-indigo-950/50">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Reconcile-AI</h1>
              <p className="text-xs text-slate-400">Settlement &amp; Reconciliation Agent</p>
            </div>
          </div>
          <div className="app-sub flex items-center gap-2 text-xs">
            <span className={cn('rounded-full border px-3 py-1.5', statusClass)}>API: {statusBadge}</span>
            <button
              onClick={handleRunDemo}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold transition hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? 'Working…' : 'Run Demo Data'}
            </button>
          </div>
        </header>

        {/* Upload */}
        <div className="mb-8">
          <UploadCard onFiles={setFiles} onRun={handleRunUpload} loading={loading} />
        </div>

        {/* Processing */}
        {loading && (
          <div className="flex flex-col items-center py-16 text-slate-300">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <p>Reconciling records across sources…</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-8">
            <div className="result-section grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Transactions" value={String(result.total)} />
              <StatCard label="Matched" value={String(result.matched)} tone="emerald" />
              <StatCard label="Exceptions" value={String(result.exceptionCount)} tone="amber" />
              <StatCard label="Match Rate" value={result.rate} tone="blue" suffix="%" />
            </div>

            <div className="result-section">
              <Charts matches={result.matches} metrics={result.metrics} />
            </div>

            <div className="result-section">
              <MatchTable matches={result.matches} />
            </div>

            <div className="result-section">
              <ExceptionTable exceptions={result.exceptions} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
