import { useCallback, useRef, useState } from 'react'
import { UploadCloud, Landmark, ScrollText, FileSpreadsheet, Play, Loader2 } from 'lucide-react'
import { Card, CardContent, Button } from './ui'
import { cn } from '../lib/utils'

interface UploadCardProps {
  onFiles: (files: { razorpay: File | null; bank: File | null; orders: File | null }) => void
  onRun: () => void
  loading: boolean
}

const SLOTS = [
  { key: 'razorpay', label: 'Razorpay Settlements', hint: 'razorpay_settlements.csv', Icon: Landmark },
  { key: 'bank', label: 'Bank Statement', hint: 'bank_statements.csv', Icon: FileSpreadsheet },
  { key: 'orders', label: 'Order Records', hint: 'orders.csv', Icon: ScrollText },
] as const

export function UploadCard({ onFiles, onRun, loading }: UploadCardProps) {
  const [files, setFiles] = useState<{ razorpay: File | null; bank: File | null; orders: File | null }>({
    razorpay: null,
    bank: null,
    orders: null,
  })
  const [dragging, setDragging] = useState(false)
  const dragCounter = useRef(0)

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
    <Card className="relative overflow-hidden">
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-violet-500 bg-violet-500/10">
          <p className="flex items-center gap-2 font-semibold text-violet-300">
            <UploadCloud className="size-5" /> Drop CSVs to upload
          </p>
        </div>
      )}
      <CardContent className="border-t border-white/5 p-6">
        <div
          onDragEnter={() => { dragCounter.current++; setDragging(true) }}
          onDragLeave={() => { dragCounter.current--; if (dragCounter.current === 0) setDragging(false) }}
          onDragOver={(e) => e.preventDefault()}
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
        >
          <h2 className="font-serif text-2xl tracking-tight text-zinc-100">Reconcile your settlements</h2>
          <p className="mb-6 mt-1 text-sm text-zinc-400">
            Upload three source exports. The agent matches records across systems, measures accuracy,
            and flags honest exceptions.
          </p>

          <div className="mb-6 grid gap-3 md:grid-cols-3">
            {SLOTS.map((slot) => {
              const key = slot.key as keyof typeof files
              const file = files[key]
              const Icon = slot.Icon
              return (
                <label
                  key={key}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 text-left transition-all',
                    file
                      ? 'border-violet-500/70 bg-violet-500/10'
                      : 'border-white/10 hover:border-violet-500/50 hover:bg-white/[0.02]',
                  )}
                >
                  <input type="file" accept=".csv" className="hidden" onChange={setSlot(key)} />
                  <div className={cn('shrink-0 rounded-lg p-2', file ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-zinc-400')}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-200">{slot.label}</div>
                    <div className={cn('truncate text-xs', file ? 'text-violet-300' : 'text-zinc-500')}>
                      {file?.name ?? slot.hint}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>

          <Button
            onClick={onRun}
            disabled={!allReady || loading}
            variant="primary"
            className="w-full py-3"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Reconciling…
              </>
            ) : (
              <>
                <Play className="size-4" /> Run Reconciliation
              </>
            )}
          </Button>
          {!allReady && (
            <p className="mt-3 text-center text-xs text-zinc-500">
              Select all three CSV files to continue
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
