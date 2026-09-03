import { useEffect, useRef } from 'react'
import { animate } from 'animejs'
import { X, Check, ArrowRight } from 'lucide-react'

const beforeItems = [
  { text: 'Open 3 separate CSV exports in Excel', detail: 'Razorpay, bank, and order systems' },
  { text: 'Copy-paste rows side by side', detail: 'Manually aligning columns' },
  { text: 'Check amounts match', detail: 'Ignoring ₹1-2 fee differences' },
  { text: 'Flag mismatches in a separate sheet', detail: 'No standardized format' },
  { text: 'Email finance team for clarification', detail: 'Wait for reply, repeat' },
  { text: 'Update master sheet', detail: 'Error-prone manual entry' },
]

const afterItems = [
  { text: 'Upload 3 CSVs to Reconcile-AI', detail: 'Drag and drop, one click' },
  { text: 'Tier 1: Auto-match exact records', detail: 'Settlement ref + amount + date' },
  { text: 'Tier 2: Fuzzy match remaining', detail: '₹1 tolerance, T+1 window' },
  { text: 'Tier 3: AI reasons about edge cases', detail: 'Fee gaps, ambiguous matches' },
  { text: 'Review honest exceptions', detail: 'Every record explained' },
  { text: 'Export reconciliation report', detail: 'Audit-ready, timestamped' },
]

export default function BeforeAfter() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate('.ba-item', {
              opacity: [0, 1],
              translateX: [20, 0],
              duration: 500,
              stagger: 60,
              easing: 'easeOutCubic',
            })
            observer.disconnect()
          }
        })
      },
      { threshold: 0.15 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="w-full py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <div className="intro-item mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-400">
            <ArrowRight className="size-3.5 text-violet-400" />
            The transformation
          </div>
          <h2 className="intro-item font-serif text-4xl tracking-tight text-zinc-100 md:text-5xl">
            Before vs After
          </h2>
          <p className="intro-item mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Manual reconciliation vs automated matching — same data, different outcome.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Before */}
          <div className="rounded-xl border border-rose-500/20 bg-[#0f0f12] p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10">
                <X className="size-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Manual Process</h3>
                <p className="text-sm text-zinc-500">Average: 4.2 hours/day</p>
              </div>
            </div>
            <div className="space-y-4">
              {beforeItems.map((item, i) => (
                <div key={i} className="ba-item flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-xs font-medium text-rose-400">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-sm text-zinc-200">{item.text}</div>
                    <div className="text-xs text-zinc-500">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* After */}
          <div className="rounded-xl border border-emerald-500/20 bg-[#0f0f12] p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Check className="size-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">With Reconcile-AI</h3>
                <p className="text-sm text-zinc-500">Average: 12 seconds</p>
              </div>
            </div>
            <div className="space-y-4">
              {afterItems.map((item, i) => (
                <div key={i} className="ba-item flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-medium text-emerald-400">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-sm text-zinc-200">{item.text}</div>
                    <div className="text-xs text-zinc-500">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
