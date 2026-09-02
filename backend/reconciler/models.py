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
class MatchCandidate:
    razorpay_id: str
    bank_id: str
    order_id: str
    confidence: float
    tier: int                    # 1, 2, or 3
    explanation: str = ""


@dataclass
class UnmatchedRecord:
    kind: str
    id: str
    amount: float
    date: str
    reason: str
    suggestion: str | None = None


@dataclass
class LLMResolution:
    matches: list[MatchCandidate] = field(default_factory=list)
    unmatched: list[UnmatchedRecord] = field(default_factory=list)
