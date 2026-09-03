import { Shield, Cpu, BarChart3, CheckCircle } from 'lucide-react'

const features = [
  {
    icon: <Cpu className="h-5 w-5" />,
    title: 'Three-tier matching engine',
    description: 'Deterministic exact and fuzzy matching resolves most records instantly. An AI agent arbitrates only the genuinely ambiguous edge cases.',
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: 'Measured accuracy',
    description: 'Every reconciliation run is scored against a known ground truth — match rate, exception precision, and recall are transparent and auditable.',
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: 'Honest exception reporting',
    description: 'Every unresolved record gets a reason and a suggested action. Nothing is hidden, nothing is force-matched.',
  },
  {
    icon: <CheckCircle className="h-5 w-5" />,
    title: 'Audit trail included',
    description: 'Each match carries a confidence score, a tier attribution, and a human-readable explanation — ready for your finance team.',
  },
]

export default function FeatureSection() {
  return (
    <section className="w-full py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Left — Copy */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              Agent architecture
            </div>
            <h2 className="font-serif text-5xl leading-tight tracking-tight text-zinc-100">
              Reconcile in seconds,<br />audit in minutes
            </h2>
            <p className="max-w-lg text-lg text-zinc-400">
              Three-layer matching, transparent scoring, and honest exception
              reporting — built for finance teams who need trustworthy
              automation, not black-box confidence.
            </p>

            <div className="space-y-4">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-100">{f.title}</div>
                    <div className="mt-0.5 text-sm text-zinc-500">{f.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Animated card stack */}
          <div className="relative flex justify-center">
            <div className="relative h-[420px] w-full max-w-md">
              {/* Card 1 — Tier 1 Exact Match */}
              <div className="absolute left-0 top-0 w-[280px] rounded-xl border border-white/10 bg-[#0f0f12]/80 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur-md">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Tier 1 — Exact
                </div>
                <div className="mb-1 text-lg font-semibold text-zinc-100">
                  STL3341057 → RP890779946
                </div>
                <div className="mb-2 flex gap-2 text-[10px]">
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-400">
                    Matched
                  </span>
                  <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-violet-300">
                    Confidence 100%
                  </span>
                </div>
                <div className="space-y-1 text-xs text-zinc-500">
                  <div>Amount: ₹18,563.91 ✓</div>
                  <div>Date: 2026-01-22 ✓</div>
                  <div>Ref: settlement_ref exact match ✓</div>
                </div>
              </div>

              {/* Card 2 — Tier 2 Fuzzy */}
              <div className="absolute right-0 top-28 z-10 w-[260px] rounded-xl border border-white/10 bg-[#0f0f12]/90 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-md">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Tier 2 — Fuzzy
                </div>
                <div className="mb-1 text-lg font-semibold text-zinc-100">
                  STL1045678 → RP223489102
                </div>
                <div className="mb-2 flex gap-2 text-[10px]">
                  <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-400">
                    Fuzzy Match
                  </span>
                  <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-sky-400">
                    Confidence 92%
                  </span>
                </div>
                <div className="flex h-2 w-full gap-1 overflow-hidden rounded-full">
                  <div className="w-[50%] bg-violet-500" />
                  <div className="w-[30%] bg-sky-400" />
                  <div className="w-[20%] bg-amber-400" />
                </div>
                <div className="mt-2 flex gap-3 text-[10px] text-zinc-500">
                  <span>Amount ✓</span>
                  <span>Date ±1d</span>
                  <span>Ref sim 0.84</span>
                </div>
              </div>

              {/* Card 3 — Tier 3 AI */}
              <div className="absolute bottom-0 left-4 z-20 w-[270px] rounded-xl border border-white/10 bg-[#0f0f12]/90 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.16)] backdrop-blur-md">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Tier 3 — AI Agent
                </div>
                <div className="mb-1 text-sm font-semibold text-zinc-100">
                  Fee-gap analysis
                </div>
                <div className="mb-2 text-xs text-zinc-400">
                  Amount gap of ₹0.90 matches the 0.5% UPI fee structure for this merchant.
                  Same underlying transaction.
                </div>
                <div className="flex gap-2 text-[10px]">
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-400">
                    Resolved
                  </span>
                  <span className="rounded-md bg-violet-500/15 px-2 py-0.5 text-violet-300">
                    Confidence 87%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
