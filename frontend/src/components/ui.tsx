import * as React from 'react'
import { cn } from '../lib/utils'

/* Watermelon-style UI primitives */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-[#0f0f12] shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-between px-5 py-4', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold tracking-tight text-zinc-100', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />
}

type BadgeTone = 'default' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet'
const badgeTones: Record<BadgeTone, string> = {
  default: 'bg-zinc-800 text-zinc-200',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  amber: 'bg-amber-500/15 text-amber-400',
  rose: 'bg-rose-500/15 text-rose-400',
  sky: 'bg-sky-500/15 text-sky-400',
  violet: 'bg-violet-500/15 text-violet-300',
}

export function Badge({
  tone = 'default',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  )
}

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger'
const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-violet-500 text-white hover:bg-violet-400 shadow-sm',
  outline: 'border border-white/10 bg-transparent text-zinc-200 hover:bg-white/5',
  ghost: 'text-zinc-300 hover:bg-white/5',
  danger: 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25',
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  )
}

export function LiveBadge({ live = true }: { live?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10">
      <span className="size-2 rounded-full bg-emerald-400 live-dot-pulse" />
      {live ? 'Live' : 'Paused'}
    </span>
  )
}
