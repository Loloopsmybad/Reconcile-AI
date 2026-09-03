import { Scale, ArrowUpRight, ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative w-full border-t border-white/5 bg-[#070709] text-zinc-500 overflow-hidden">
      {/* Dashed border wrapper */}
      <div className="relative z-10 mx-auto max-w-[1400px] border-x border-dashed border-white/[0.06]">
        <div className="px-6 md:px-12 lg:px-16 pt-20 pb-0">
          {/* Top grid */}
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-8 mb-16 lg:mb-24">
            {/* Brand */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
              <div className="flex items-center gap-2 text-zinc-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
                  <Scale className="h-4 w-4 text-white" />
                </div>
                <span className="font-serif text-lg tracking-tight">Reconcile-AI</span>
              </div>
              <p className="max-w-[320px] text-[15px] leading-relaxed text-zinc-500">
                Settlement reconciliation for Razorpay merchants — automated
                matching, measured accuracy, and honest exception reporting.
                Built for the AI Finance Controller track.
              </p>
              <a
                href="https://razorpay.com/buildathon/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 text-[15px] text-zinc-300 hover:text-white transition-colors"
              >
                razorpay.com/buildathon
                <ExternalLink className="size-3.5 text-zinc-500 group-hover:text-white transition-colors" />
              </a>
            </div>

            {/* Link columns */}
            <div className="lg:col-span-7 xl:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-12 lg:gap-8">
              <div className="flex flex-col gap-6">
                <h4 className="font-medium text-zinc-100">Product</h4>
                <ul className="flex flex-col gap-3 text-[15px]">
                  <li><a href="#features" className="hover:text-zinc-100 transition-colors">Features</a></li>
                  <li><a href="#how-it-works" className="hover:text-zinc-100 transition-colors">How It Works</a></li>
                  <li><a href="#demo" className="hover:text-zinc-100 transition-colors">Live Demo</a></li>
                  <li><a href="#architecture" className="hover:text-zinc-100 transition-colors">Architecture</a></li>
                </ul>
              </div>
              <div className="flex flex-col gap-6">
                <h4 className="font-medium text-zinc-100">Resources</h4>
                <ul className="flex flex-col gap-3 text-[15px]">
                  <li>
                    <a href="https://razorpay.com/buildathon/" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-100 transition-colors inline-flex items-center gap-1.5">
                      Buildathon <ExternalLink className="size-3" />
                    </a>
                  </li>
                  <li>
                    <a href="https://github.com/Loloopsmybad/Reconcile-AI" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-100 transition-colors inline-flex items-center gap-1.5">
                      GitHub <ExternalLink className="size-3.5" />
                    </a>
                  </li>
                  <li><a href="#" className="hover:text-zinc-100 transition-colors">API Docs</a></li>
                  <li><a href="#" className="hover:text-zinc-100 transition-colors">Data Schema</a></li>
                </ul>
              </div>
              <div className="flex flex-col gap-6">
                <h4 className="font-medium text-zinc-100">Track</h4>
                <ul className="flex flex-col gap-3 text-[15px]">
                  <li><span className="text-zinc-100 font-medium">Track 4</span></li>
                  <li><span className="text-zinc-400">AI Finance Controller</span></li>
                  <li><span className="text-zinc-400">Settlement Q&A Agent</span></li>
                  <li>
                    <a href="https://razorpay.com/buildathon/" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-100 transition-colors inline-flex items-center gap-1.5">
                      Apply <ArrowUpRight className="size-3" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Giant watermark text */}
          <div className="w-full overflow-hidden text-center select-none">
            <svg
              className="w-full h-auto"
              viewBox="0 30 800 80"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="footerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#333" />
                  <stop offset="50%" stopColor="#1a1a1a" />
                  <stop offset="100%" stopColor="#0a0a0a" />
                </linearGradient>
              </defs>
              <text
                x="400"
                y="80"
                dominantBaseline="alphabetic"
                textAnchor="middle"
                fill="url(#footerGrad)"
                className="font-serif"
                fontSize="100"
                letterSpacing="-4"
              >
                Reconcile-AI
              </text>
            </svg>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] py-6 text-xs text-zinc-600 sm:flex-row">
            <span>© 2026 Reconcile-AI. Built for Razorpay AI Buildathon.</span>
            <div className="flex items-center gap-4">
              <span>Track 4 · AI Finance Controller</span>
              <span className="text-zinc-700">•</span>
              <span>60 transactions · 100% accuracy</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
