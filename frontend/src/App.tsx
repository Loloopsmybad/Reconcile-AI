import { useEffect, useState } from 'react'
import { animate } from 'animejs'
import { Zap, ShieldCheck, Flame, Scale, GitBranch, AlertTriangle, Download, Clock, Database } from 'lucide-react'
import Hero from './components/Hero'
import FeatureSection from './components/FeatureSection'
import BentoGrid from './components/BentoGrid'
import WhyItMatters from './components/WhyItMatters'
import BeforeAfter from './components/BeforeAfter'
import CursorGlow from './components/CursorGlow'
import { MetricCard } from './components/MetricCard'
import { UploadCard } from './components/UploadCard'
import { MatchTable } from './components/MatchTable'
import { ExceptionTable } from './components/ExceptionTable'
import { Charts } from './components/Charts'
import { QueryChat } from './components/QueryChat'
import { AnalyticsDashboard } from './components/AnalyticsDashboard'
import Footer from './components/Footer'
import { introReveal, resultTimeline } from './lib/anim'
import { runDemoStream, reconcile, downloadReport, fetchAnalytics } from './lib/api'
import type { Match, Unmatched, Metrics, OneToManyMatch, Anomaly, AnalyticsData } from './lib/types'

interface ResultState {
  matches: Match[]
  exceptions: Unmatched[]
  metrics: Metrics | null
  rate: number
  oneToMany: OneToManyMatch[]
  anomalies: Anomaly[]
  elapsed?: number
  datasetSize?: number
}

interface StreamProgress {
  phase: string
  progress: number
  message: string
}

function App() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResultState | null>(null)
  const [streamProgress, setStreamProgress] = useState<StreamProgress | null>(null)
  const [datasetSize, setDatasetSize] = useState(60)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [files, setFiles] = useState<{ razorpay: File | null; bank: File | null; orders: File | null }>({
    razorpay: null,
    bank: null,
    orders: null,
  })

  useEffect(() => {
    introReveal('.intro-item')
    animate('.bg-blob', {
      scale: [1, 1.15, 1],
      opacity: [0.9, 1, 0.9],
      duration: 8000,
      stagger: 1200,
      loop: true,
      ease: 'easeInOutSine',
    })
  }, [])

  useEffect(() => {
    if (result) resultTimeline()
  }, [result])

  const handleRunDemo = async () => {
    document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setLoading(true)
    setStreamProgress({ phase: 'starting', progress: 0, message: 'Initializing…' })
    try {
      await runDemoStream(
        true,
        datasetSize,
        (phase, progress, message) => {
          setStreamProgress({ phase, progress, message })
        },
        (data) => {
          setResult({
            matches: data.sample_matches,
            exceptions: data.sample_unmatched,
            metrics: data.metrics,
            rate: Math.round((data.metrics.true_accuracy ?? 1) * 100),
            oneToMany: data.one_to_many ?? [],
            anomalies: data.anomalies ?? [],
            elapsed: data.elapsed_seconds,
            datasetSize: data.dataset_size,
          })
          setStreamProgress(null)
          const tryFetchAnalytics = (attempt: number) => {
            fetchAnalytics().then((d) => {
              if (d) setAnalytics(d)
              else if (attempt < 3) {
                setTimeout(() => tryFetchAnalytics(attempt + 1), 2000 * (attempt + 1))
              }
            }).catch(() => {
              if (attempt < 3) setTimeout(() => tryFetchAnalytics(attempt + 1), 2000 * (attempt + 1))
            })
          }
          setTimeout(() => tryFetchAnalytics(0), 1500)
        },
        (err) => {
          console.error(err)
          setStreamProgress(null)
        },
      )
    } catch (e) {
      console.error(e)
      setStreamProgress(null)
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
        oneToMany: [],
        anomalies: [],
      })
      fetchAnalytics().then((d) => { if (d) setAnalytics(d) }).catch(console.error)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <CursorGlow />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-grid">
        <div className="bg-blob absolute -left-32 top-0 h-[480px] w-[480px] rounded-full bg-violet-600/15 blur-3xl" />
        <div className="bg-blob absolute -right-32 top-40 h-[440px] w-[440px] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="bg-blob absolute bottom-0 left-1/3 h-[380px] w-[500px] rounded-full bg-fuchsia-600/5 blur-3xl" />
      </div>

      <Hero onRunDemo={handleRunDemo} loading={loading} datasetSize={datasetSize} onSizeChange={setDatasetSize} />

      <div id="features">
        <FeatureSection />
      </div>

      <BentoGrid />
      <WhyItMatters />
      <BeforeAfter />

      {/* 6. How It Works */}
      <section id="how-it-works" className="w-full py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <div className="intro-item mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              Three-tier engine
            </div>
            <h2 className="intro-item font-serif text-4xl tracking-tight text-zinc-100 md:text-5xl">
              Deterministic first, AI last
            </h2>
            <p className="intro-item mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
              Every match is explainable. Rules decide the easy cases. An LLM only
              arbitrates the genuinely ambiguous — and only when explicitly enabled.
            </p>
          </div>
          <div className="intro-item grid gap-6 md:grid-cols-3">
            {[
              { tier: 'Tier 1', name: 'Exact Match', desc: 'Settlement reference, amount, and date are all identical. Instant, deterministic, 100% confidence.', color: 'violet' },
              { tier: 'Tier 2', name: 'Fuzzy Match', desc: 'Amount within ₹1, date within 1 day, reference similarity ≥ 0.80. Catches T+1 lag and typos.', color: 'sky' },
              { tier: 'Tier 3', name: 'AI Agent', desc: 'LLM reasons about fee gaps, ambiguous near-matches, and true orphans. Structured JSON output.', color: 'emerald' },
            ].map((t) => (
              <div key={t.tier} className="rounded-xl border border-white/10 bg-[#0f0f12] p-6">
                <div className={`mb-3 inline-flex items-center gap-2 rounded-md bg-${t.color}-500/15 px-2 py-0.5 text-xs font-medium text-${t.color === 'violet' ? 'violet-300' : t.color === 'sky' ? 'sky-400' : 'emerald-400'}`}>
                  {t.tier}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">{t.name}</h3>
                <p className="text-sm text-zinc-500">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Dashboard */}
      <section id="demo-section" className="w-full py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 text-center">
            <div className="intro-item mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-400">
              <Zap className="size-3.5 text-amber-400" />
              Live dashboard
            </div>
            <h2 className="intro-item font-serif text-4xl tracking-tight text-zinc-100">
              See it in action
            </h2>
          </div>

          <div className="intro-item mb-8">
            <UploadCard onFiles={setFiles} onRun={handleRunUpload} loading={loading} />
          </div>

          {/* Streaming progress */}
          {loading && streamProgress && (
            <div className="mb-8 rounded-xl border border-violet-500/20 bg-violet-500/5 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                <span className="text-sm font-medium text-violet-300">Reconciling {datasetSize} records…</span>
              </div>
              <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500 ease-out"
                  style={{ width: `${streamProgress.progress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400">{streamProgress.message}</p>
            </div>
          )}

          {/* Legacy loading spinner */}
          {loading && !streamProgress && (
            <div className="flex flex-col items-center py-16 text-zinc-300">
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
              <p className="text-sm">Reconciling records across three sources…</p>
            </div>
          )}

          {result && !loading && (
            <div id="results" className="space-y-5">
              {/* Core metrics */}
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

              {/* Timing + download */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  {result.elapsed != null && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-zinc-400" />
                      {result.elapsed}s
                    </span>
                  )}
                  {result.datasetSize != null && (
                    <span className="flex items-center gap-1.5">
                      <Database className="size-3.5 text-zinc-400" />
                      {result.datasetSize} records
                    </span>
                  )}
                </div>
                <button
                  onClick={downloadReport}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/10"
                >
                  <Download className="size-3.5" />
                  Download PDF Report
                </button>
              </div>

              {/* Advanced metrics — 1:N + Anomalies */}
              {(result.oneToMany.length > 0 || result.anomalies.length > 0) && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {result.oneToMany.length > 0 && (
                    <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <GitBranch className="size-4 text-sky-400" />
                        <h3 className="text-sm font-semibold text-sky-300">One-to-Many Matches</h3>
                        <span className="ml-auto rounded-md bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-400">
                          {result.oneToMany.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {result.oneToMany.slice(0, 3).map((m) => (
                          <div key={m.razorpay_id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                            <span className="text-xs text-zinc-500">{m.razorpay_id}</span>
                            <span className="text-[10px] text-sky-400">→</span>
                            <span className="text-xs text-zinc-400">{m.bank_ids.join(', ')}</span>
                            <span className="ml-auto text-[10px] font-mono text-zinc-500">₹{m.total_bank_amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.anomalies.length > 0 && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <AlertTriangle className="size-4 text-rose-400" />
                        <h3 className="text-sm font-semibold text-rose-300">Anomalies Detected</h3>
                        <span className="ml-auto rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-400">
                          {result.anomalies.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {result.anomalies.slice(0, 3).map((a) => (
                          <div key={a.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                            <span className={`text-[10px] font-medium ${a.severity === 'HIGH' ? 'text-rose-400' : a.severity === 'MEDIUM' ? 'text-amber-400' : 'text-zinc-400'}`}>
                              {a.severity}
                            </span>
                            <span className="text-xs text-zinc-400 truncate">{a.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Charts matches={result.matches} metrics={result.metrics} rate={result.rate} />

              {analytics && <AnalyticsDashboard data={analytics} />}

              <MatchTable matches={result.matches} />
              <ExceptionTable exceptions={result.exceptions} />

              {/* AI Query */}
              <QueryChat />
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default App
