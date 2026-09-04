import type { DemoResult, ReconcileResult, AnalyticsData } from './types'

const BASE = import.meta.env.VITE_API_URL ?? ''

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`)
    return res.ok
  } catch {
    return false
  }
}

export async function runDemo(useLlm = true, size = 60): Promise<DemoResult> {
  const res = await fetch(`${BASE}/api/demo?use_llm=${useLlm}&size=${size}`)
  return handle<DemoResult>(res)
}

export async function runDemoStream(
  useLlm: boolean,
  size: number,
  onProgress: (phase: string, progress: number, message: string) => void,
  onComplete: (data: DemoResult) => void,
  onError: (err: string) => void,
): Promise<void> {
  const res = await fetch(`${BASE}/api/demo/stream?use_llm=${useLlm}&size=${size}`)
  if (!res.ok) {
    onError(`Stream failed: ${res.status}`)
    return
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        var eventType = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        const dataStr = line.slice(6)
        try {
          const data = JSON.parse(dataStr)
          if (eventType === 'progress') {
            onProgress(data.phase, data.progress, data.message)
          } else if (eventType === 'complete') {
            onComplete(data)
          }
        } catch {}
      }
    }
  }
}

export async function reconcile(
  razorpay: File,
  bank: File,
  orders: File,
): Promise<ReconcileResult> {
  const fd = new FormData()
  fd.append('razorpay', razorpay)
  fd.append('bank', bank)
  fd.append('orders', orders)
  const res = await fetch(`${BASE}/api/reconcile`, { method: 'POST', body: fd })
  return handle<ReconcileResult>(res)
}

export async function nlQuery(question: string): Promise<{ answer: string; results: any[] }> {
  const res = await fetch(`${BASE}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
  return handle(res)
}

export function downloadReport() {
  window.open(`${BASE}/api/report`, '_blank')
}

export async function fetchAnalytics(): Promise<AnalyticsData | null> {
  try {
    const res = await fetch(`${BASE}/api/analytics`)
    if (!res.ok) return null
    const data = await res.json()
    if (data?.status !== 'ok') return null
    return data as AnalyticsData
  } catch {
    return null
  }
}
