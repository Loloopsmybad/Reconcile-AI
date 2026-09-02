export interface Match {
  razorpay_id: string
  bank_id: string
  order_id: string
  confidence: number
  tier: number
  explanation: string
}

export interface Unmatched {
  kind?: string
  id?: string
  razorpay_id?: string
  amount?: number
  date?: string
  reason: string
  suggestion?: string
}

export interface Metrics {
  total_transactions: number
  total_matched: number
  reported_unmatched: number
  claim_match_rate: number
  true_accuracy: number
  correct: number
  wrong: number
  per_fault_type: Record<string, { total: number; correct: number; wrong: number; accuracy: number }>
  exception_precision: number
  exception_recall: number
}

export interface DemoResult {
  metrics: Metrics
  sample_matches: Match[]
  sample_unmatched: Unmatched[]
}

export interface ReconcileResult {
  total_razorpay: number
  matched_count: number
  unmatched_count: number
  match_rate: number
  matches: Match[]
  unmatched: Unmatched[]
}

export type FaultType = 'exact' | 'fee' | 'tplus1' | 'orphan' | 'ref_diff'
