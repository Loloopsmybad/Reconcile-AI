"""Three-tier matching engine for reconciling financial records.

Key linking concepts:
  * A Razorpay settlement has a `settlement_id` (STL...) and references the
    originating `order_ref` (ORD...).
  * A bank statement has a `settlement_ref` that is the *same* STL id used by
    Razorpay -> this is the reliable cross-reference Razorpay -> bank.
  * An order has an `order_id` (ORD...) that matches the settlement's order_ref.

Therefore:
  Tier 1 (exact): razorpay.settlement_id == bank.settlement_ref, amounts and
    dates agree.
  Tier 2 (fuzzy): amounts within tolerance + dates within window + reference
    similarity on the settlement ids.
  Tier 3 (LLM): reason about fee gaps, T+1 lag, and ambiguity the rules can't
    resolve.
"""

from __future__ import annotations

import difflib
from datetime import datetime

from .llm_agent import get_llm_judge
from .models import MatchCandidate, SourceRecord, UnmatchedRecord

AMOUNT_TOLERANCE = 1.00   # rupees; absorbs rounding/fee edge cases
DATE_WINDOW_DAYS = 1      # settles T+1, so allow ±1 day
REF_SIM_THRESHOLD = 0.80


class ReconciliationEngine:
    def __init__(self, use_llm: bool = True, llm_api_key: str | None = None):
        self.use_llm = use_llm
        self._llm = None
        if use_llm:
            self._llm = get_llm_judge(api_key=llm_api_key)

    # -- public API ---------------------------------------------------------
    def reconcile(
        self,
        razorpay_records: list[SourceRecord],
        bank_records: list[SourceRecord],
        order_records: list[SourceRecord],
    ) -> dict:
        """Run all three tiers and return a full reconciliation result."""
        matched: list[MatchCandidate] = []
        unmatched: list[UnmatchedRecord] = []

        used_bank: set[str] = set()
        used_order: set[str] = set()

        bank_by_id = {r.id: r for r in bank_records}
        bank_by_ref = {r.ref: r for r in bank_records if r.ref}
        order_by_id = {r.id: r for r in order_records}

        # ---- Tiers 1 & 2: deterministic rule matching ---------------------
        for rp in razorpay_records:
            bank_hit = self._find_bank_match(rp, bank_records, bank_by_ref, used_bank)
            if bank_hit is None:
                continue

            used_bank.add(bank_hit["record"].id)
            order = self._find_order(rp, order_by_id, used_order)

            matched.append(MatchCandidate(
                razorpay_id=rp.id,
                bank_id=bank_hit["record"].id,
                order_id=order.id if order else "N/A",
                confidence=bank_hit["confidence"],
                tier=bank_hit["tier"],
                explanation=bank_hit["explanation"],
            ))

        # ---- Tier 3: LLM resolves the remaining unmatched settlements -----
        matched_rp = {m.razorpay_id for m in matched}
        remaining_rp = [r for r in razorpay_records if r.id not in matched_rp]
        remaining_bank = [r for r in bank_records if r.id not in used_bank]

        if self.use_llm and self._llm:
            resolution = self._llm.resolve(remaining_rp, remaining_bank, order_records)
            matched.extend(resolution.matches)
            unmatched.extend(resolution.unmatched)
        else:
            for r in remaining_rp:
                unmatched.append(UnmatchedRecord(
                    kind="razorpay",
                    id=r.id,
                    amount=r.amount,
                    date=r.date,
                    reason="No matching bank credit found in exact/fuzzy tiers.",
                    suggestion="Possible pending settlement or orphan record.",
                ))

        total = len(razorpay_records)
        match_rate = len(matched) / total if total else 0.0
        return {
            "total_razorpay": total,
            "matched_count": len(matched),
            "unmatched_count": len(unmatched),
            "match_rate": round(match_rate, 4),
            "matches": [m.__dict__ for m in matched],
            "unmatched": [u.__dict__ for u in unmatched],
        }

    # -- match helpers --------------------------------------------------------
    def _find_bank_match(self, rp, bank_pool, bank_by_ref, used):
        """Find the best bank record for a razorpay settlement."""
        candidates = []

        # Quick wins: a bank record whose settlement_ref matches this
        # settlement's id exactly, and isn't already used.
        if rp.id in bank_by_ref and bank_by_ref[rp.id].id not in used:
            rec = bank_by_ref[rp.id]
            if self._amount_and_date_ok(rp, rec, strict=True):
                candidates.append({
                    "record": rec,
                    "tier": 1,
                    "confidence": 1.0,
                    "explanation": "Exact settlement_ref match; amounts and dates agree.",
                })
                return candidates[0]

        # Tier 2: iterate the pool for fuzzy matches.
        for b in bank_pool:
            if b.id in used:
                continue
            if self._fuzzy_match(rp, b):
                sim = self._ref_similarity(rp.id, b.ref or "")
                candidates.append({
                    "record": b,
                    "tier": 2,
                    "confidence": round(0.85 + 0.1 * sim, 4),
                    "explanation": (
                        f"Fuzzy match (amount within ₹{AMOUNT_TOLERANCE}, "
                        f"date within {DATE_WINDOW_DAYS}d, ref similarity {sim:.2f})."
                    ),
                })

        if candidates:
            return sorted(candidates, key=lambda x: -x["confidence"])[0]
        return None

    def _find_order(self, rp, order_by_id, used_order):
        # The settlement's order_ref (ORD...) links to the order's id.
        if rp.ref and rp.ref in order_by_id and order_by_id[rp.ref].id not in used_order:
            used_order.add(order_by_id[rp.ref].id)
            return order_by_id[rp.ref]
        # Fallback: match on amount + date.
        for oid, o in order_by_id.items():
            if oid in used_order:
                continue
            if self._amount_and_date_ok(rp, o):
                used_order.add(oid)
                return o
        return None

    # -- predicates -----------------------------------------------------------
    def _amount_and_date_ok(self, a: SourceRecord, b: SourceRecord, strict: bool = False):
        tol = 0.005 if strict else AMOUNT_TOLERANCE
        return (
            abs(a.amount - b.amount) <= tol
            and self._date_diff(a.date, b.date) <= (0 if strict else DATE_WINDOW_DAYS)
        )

    def _fuzzy_match(self, a: SourceRecord, b: SourceRecord) -> bool:
        amount_ok = abs(a.amount - b.amount) <= AMOUNT_TOLERANCE
        date_ok = self._date_diff(a.date, b.date) <= DATE_WINDOW_DAYS
        ref_ok = self._ref_similarity(a.id, b.ref or "") >= REF_SIM_THRESHOLD
        return amount_ok and date_ok and ref_ok

    @staticmethod
    def _date_diff(d1: str, d2: str) -> int:
        try:
            a = datetime.strptime(d1, "%Y-%m-%d")
            b = datetime.strptime(d2, "%Y-%m-%d")
            return abs((a - b).days)
        except (ValueError, TypeError):
            return 9999

    @staticmethod
    def _ref_similarity(s1: str, s2: str) -> float:
        return difflib.SequenceMatcher(None, s1, s2).ratio()
