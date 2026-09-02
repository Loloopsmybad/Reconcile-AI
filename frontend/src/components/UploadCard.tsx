import { useCallback, useRef, useState } from 'react'
import { cn } from '../lib/utils'

interface UploadCardProps {
  onFiles: (files: { razorpay: File | null; bank: File | null; orders: File | null }) => void
  onRun: () => void
  loading: boolean
}

const SLOTS = [
  { key: 'razorpay', label: 'Razorpay Settlements', hint: 'razorpay_settlements.csv', emoji: '🏦' },
  { key: 'bank', label: 'Bank Statement', hint: 'bank_statements.csv', emoji: '🏛️' },
  { key: 'orders', label: 'Order Records', hint: 'orders.csv', emoji: '🧾' },
] as const

export function UploadCard({ onFiles, onRun, loading }: UploadCardProps) {
  const [files, setFiles] = useState<{ razorpay: File | null; bank: File | null; orders: File | null }>({
    razorpay: null,
    bank: null,
    orders: null,
  })
  const dragCounter = useRef(0)
  const [dragging, setDragging] = useState(false)

  const setSlot = useCallback(
    (key: keyof typeof files) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0] ?? null
      const next = { ...files, [key]: f }
      setFiles(next)
      onFiles(next)
    },
    [files, onFiles],
  )

  const allReady = Boolean(files.razorpay && files.bank && files.orders)

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-8"
      onDragEnter={() => {
        dragCounter.current++
        setDragging(true)
      }}
      onDragLeave={() => {
        dragCounter.current--
        if (dragCounter.current === 0) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        dragCounter.current = 0
        setDragging(false)
        Array.from(e.dataTransfer.files).forEach((f) => {
          const name = f.name.toLowerCase()
          const slot = name.includes('razorpay')
            ? 'razorpay'
            : name.includes('bank')
              ? 'bank'
              : name.includes('order')
                ? 'orders'
                : null
          if (slot) {
            const next = { ...files, [slot]: f }
            setFiles(next)
            onFiles(next)
          }
        })
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-blue-500 bg-blue-500/10">
          <p className="font-semibold text-blue-300">Drop CSVs to upload</p>
        </div>
      )}
      <h2 className="text-lg font-semibold">Reconcile your settlements</h2>
      <p className="mb-6 mt-1 text-sm text-slate-400">
        Upload three source exports. The agent matches records across systems, measures accuracy,
        and flags honest exceptions.
      </p>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {SLOTS.map((slot) => {
          const key = slot.key as keyof typeof files
          const file = files[key]
          return (
            <label
              key={key}
              className={cn(
                'block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all',
                file
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-slate-700 hover:border-blue-500',
              )}
            >
              <input type="file" accept=".csv" className="hidden" onChange={setSlot(key)} />
              <div className="mb-2 text-3xl">{slot.emoji}</div>
              <div className="mb-1 text-sm font-medium">{slot.label}</div>
              <div className={cn('truncate text-xs', file ? 'text-blue-300' : 'text-slate-500')}>
                {file?.name ?? slot.hint}
              </div>
            </label>
          )
        })}
      </div>

      <button
        onClick={onRun}
        disabled={!allReady || loading}
        className={cn(
          'w-full rounded-xl py-3 font-semibold transition-all',
          allReady && !loading
            ? 'bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-900/40'
            : 'cursor-not-allowed bg-slate-800 text-slate-500',
        )}
      >
        {loading ? 'Reconciling…' : 'Run Reconciliation'}
      </button>
    </div>
  )
}
