export interface FieldDiff {
  field: string
  source_value: string
  bank_value: string
}

export interface Match {
  razorpay_id: string
  bank_id: string
  order_id: string
  confidence: number
  tier: number
  explanation: string
  field_diffs?: FieldDiff[]
  reason_code?: string
}

export interface Unmatched {
  kind?: string
  id?: string
  razorpay_id?: string
  amount?: number
  date?: string
  reason: string
  suggestion?: string
  field_diffs?: FieldDiff[]
  reason_code?: string
}

export interface OneToManyMatch {
  razorpay_id: string
  bank_ids: string[]
  total_bank_amount: number
  confidence: number
  tier: number
  explanation: string
  reason_code: string
}

export interface Anomaly {
  id: string
  kind: string
  description: string
  severity: string
  related_records: string[]
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
  one_to_many?: OneToManyMatch[]
  anomalies?: Anomaly[]
  total_one_to_many?: number
  total_anomalies?: number
  elapsed_seconds?: number
  dataset_size?: number
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

export interface FeeOverchargeDetail {
  razorpay_id: string
  merchant: string
  payment_mode: string
  order_amount: number
  overcharge_amount: number
  overcharge_pct: number
}

export interface DuplicateDetail {
  settlement_ids: string[]
  count: number
  amount_each: number
  total_amount: number
  merchant: string
  payment_mode: string
  date: string
}

export interface OrphanDetail {
  settlement_id: string
  amount: number
  merchant: string
  payment_mode: string
  date: string
  reason: string
}

export interface RevenueLeakage {
  currency: string
  total_leakage: number
  fee_overcharge: { count: number; total_amount: number; details: FeeOverchargeDetail[] }
  duplicate_settlements: { count: number; total_amount: number; details: DuplicateDetail[] }
  orphan_float: { count: number; total_amount: number; details: OrphanDetail[] }
}

export interface PaymentModeItem {
  payment_mode: string
  gross_volume: number
  net_settled: number
  total_fees: number
  total_gst: number
  effective_take_rate_pct: number
  volume_share_pct: number
  revenue_share_pct: number
  transaction_count: number
}

export interface PaymentModeProfitability {
  modes: PaymentModeItem[]
  summary: {
    highest_take_rate_mode: string
    highest_volume_mode: string
    most_profitable_mode: string
  }
}

export interface VelocityHistogram {
  bucket: string
  count: number
  pct: number
}

export interface DelayedSettlement {
  settlement_id: string
  order_id: string
  delay_days: number
  amount: number
  merchant: string
  payment_mode: string
  order_date: string
  settlement_date: string
}

export interface SettlementVelocity {
  avg_days: number
  median_days: number
  max_days: number
  delayed_count: number
  delayed_rate_pct: number
  total_with_order_date: number
  histogram: VelocityHistogram[]
  delayed_settlements: DelayedSettlement[]
}

export interface MerchantRiskItem {
  merchant: string
  composite_score: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  breakdown: {
    orphan_rate_pct: number
    fee_discrepancy_rate_pct: number
    outlier_count: number
    avg_settlement_delay_days: number
  }
  total_records: number
  total_unmatched: number
}

export interface MerchantRiskScores {
  merchants: MerchantRiskItem[]
  score_weights: Record<string, number>
}

export interface AnalyticsData {
  status: string
  dataset_summary: {
    total_razorpay_records: number
    total_matches: number
    total_unmatched: number
    total_anomalies: number
    match_rate: number
  }
  revenue_leakage: RevenueLeakage
  payment_mode_profitability: PaymentModeProfitability
  settlement_velocity: SettlementVelocity
  merchant_risk_scores: MerchantRiskScores
}
