import type { DemoResult, ReconcileResult } from './types'

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

export async function runDemo(useLlm = true): Promise<DemoResult> {
  const res = await fetch(`${BASE}/api/demo?use_llm=${useLlm}`)
  return handle<DemoResult>(res)
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
