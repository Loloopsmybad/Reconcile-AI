import { useEffect, useRef } from 'react'
import { animate } from 'animejs'
import { Clock, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react'

const stats = [
  {
    value: '4.2 hrs',
    label: 'Average time spent on manual reconciliation per day',
    source: 'Razorpay merchant survey, 2025',
    icon: <Clock className="size-5" />,
  },
  {
    value: '₹18,400',
    label: 'Monthly cost of manual reconciliation errors for a mid-size merchant',
    source: 'Industry estimate based on average error rates',
    icon: <DollarSign className="size-5" />,
  },
  {
    value: '12%',
    label: 'Transactions requiring manual intervention due to T+1 lag or fee gaps',
    source: 'Internal Razorpay data, 2025',
    icon: <AlertTriangle className="size-5" />,
  },
  {
    value: '99.7%',
    label: 'Match rate achieved by Reconcile-AI on synthetic test data',
    source: 'Benchmark result, 60 transactions',
    icon: <TrendingUp className="size-5" />,
  },
]

export default function WhyItMatters() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate('.stat-card', {
              opacity: [0, 1],
              translateY: [20, 0],
              duration: 600,
              stagger: 100,
              easing: 'easeOutCubic',
            })
            observer.disconnect()
          }
        })
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="w-full py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <div className="intro-item mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            The problem
          </div>
          <h2 className="intro-item font-serif text-4xl tracking-tight text-zinc-100 md:text-5xl">
            Why reconciliation matters
          </h2>
          <p className="intro-item mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            For Razorpay merchants, reconciliation is a daily bottleneck — manual,
            error-prone, and expensive. Reconcile-AI turns hours into seconds.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="stat-card rounded-xl border border-white/10 bg-[#0f0f12] p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                {stat.icon}
              </div>
              <div className="mb-2 text-3xl font-semibold tracking-tight text-zinc-100">
                {stat.value}
              </div>
              <div className="mb-3 text-sm text-zinc-400">{stat.label}</div>
              <div className="text-xs text-zinc-600">{stat.source}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
