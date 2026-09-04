"""Shared data models used across the reconciliation engine and LLM agent."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class SourceRecord:
    kind: str                 # "razorpay" | "bank" | "order"
    id: str
    amount: float
    date: str
    ref: str | None = None    # cross-reference identifier (settlement_id/order_id)
    raw: dict = field(default_factory=dict)


@dataclass
class FieldDiff:
    field: str
    source_value: str
    bank_value: str


@dataclass
class MatchCandidate:
    razorpay_id: str
    bank_id: str
    order_id: str
    confidence: float
    tier: int                    # 1, 2, or 3
    explanation: str = ""
    field_diffs: list[FieldDiff] = field(default_factory=list)
    reason_code: str = ""        # e.g. "EXACT_MATCH", "FEE_DIFF", "TPLUS1", "REF_DIFF", "ORPHAN"
    raw: dict = field(default_factory=dict)


@dataclass
class UnmatchedRecord:
    kind: str
    id: str
    amount: float
    date: str
    reason: str
    suggestion: str | None = None
    field_diffs: list[FieldDiff] = field(default_factory=list)
    reason_code: str = ""
    raw: dict = field(default_factory=dict)


@dataclass
class OneToManyMatch:
    """A single razorpay settlement matched to multiple bank records (e.g. batch payout split)."""
    razorpay_id: str
    bank_ids: list[str]
    total_bank_amount: float
    confidence: float
    tier: int
    explanation: str = ""
    reason_code: str = "BATCH_SPLIT"


@dataclass
class Anomaly:
    id: str
    kind: str          # "DUPLICATE", "FEE_OVERCHARGE", "AMOUNT_OUTLIER", "TIMING_ANOMALY"
    description: str
    severity: str      # "HIGH", "MEDIUM", "LOW"
    related_records: list[str] = field(default_factory=list)


@dataclass
class LLMResolution:
    matches: list[MatchCandidate] = field(default_factory=list)
    unmatched: list[UnmatchedRecord] = field(default_factory=list)
