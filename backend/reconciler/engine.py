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
import re
import statistics
from datetime import datetime
from itertools import combinations

from .llm_agent import get_llm_judge
from .models import (
    Anomaly,
    FieldDiff,
    MatchCandidate,
    OneToManyMatch,
    SourceRecord,
    UnmatchedRecord,
)

AMOUNT_TOLERANCE = 1.00   # rupees; absorbs rounding/fee edge cases
DATE_WINDOW_DAYS = 1      # settles T+1, so allow ±1 day
REF_SIM_THRESHOLD = 0.80
ONE_TO_MANY_TOLERANCE = 1.50   # slightly wider tolerance for sum matching
ENTITY_SUFFIXES = [
    "pty ltd", "pvt ltd", "private limited", "limited",
    "inc", "llc", "corp", "corporation", "co", "ltd", "company",
]


class ReconciliationEngine:
    def __init__(self, use_llm: bool = True, llm_api_key: str | None = None):
        self.use_llm = use_llm
        self._llm = None
        if use_llm:
            self._llm = get_llm_judge(api_key=llm_api_key)
        self._corrections: list[dict] = []

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
        one_to_many: list[OneToManyMatch] = []

        used_bank: set[str] = set()
        used_order: set[str] = set()

        bank_by_id = {r.id: r for r in bank_records}
        bank_by_ref = {r.ref: r for r in bank_records if r.ref}
        order_by_id = {r.id: r for r in order_records}

        # ---- Self-learning: apply previously recorded corrections ----
        corrections_applied = 0
        for rp in list(razorpay_records):
            correction = self._find_correction(rp.id)
            if correction and correction["correct_bank_id"] in bank_by_id:
                bank_hit_id = correction["correct_bank_id"]
                if bank_hit_id not in used_bank:
                    bank_rec = bank_by_id[bank_hit_id]
                    order = self._find_order(rp, order_by_id, used_order)
                    field_diffs = self._compute_field_diffs(rp, bank_rec)
                    matched.append(MatchCandidate(
                        razorpay_id=rp.id,
                        bank_id=bank_rec.id,
                        order_id=order.id if order else "N/A",
                        confidence=1.0,
                        tier=0,
                        explanation=f"Self-learning correction applied ({correction['correction_type']}).",
                        field_diffs=field_diffs,
                        reason_code="SELF_LEARNING",
                    ))
                    used_bank.add(bank_hit_id)
                    corrections_applied += 1

        # ---- Tiers 1 & 2: deterministic rule matching ---------------------
        for rp in razorpay_records:
            if any(m.razorpay_id == rp.id for m in matched):
                continue
            bank_hit = self._find_bank_match(rp, bank_records, bank_by_ref, used_bank)
            if bank_hit is None:
                continue

            used_bank.add(bank_hit["record"].id)
            order = self._find_order(rp, order_by_id, used_order)
            field_diffs = self._compute_field_diffs(rp, bank_hit["record"])
            reason_code = self._determine_reason_code(rp, bank_hit["record"], bank_hit["tier"])

            matched.append(MatchCandidate(
                razorpay_id=rp.id,
                bank_id=bank_hit["record"].id,
                order_id=order.id if order else "N/A",
                confidence=bank_hit["confidence"],
                tier=bank_hit["tier"],
                explanation=bank_hit["explanation"],
                field_diffs=field_diffs,
                reason_code=reason_code,
            ))

        # ---- One-to-Many matching (batch payouts) --------------------------
        matched_rp = {m.razorpay_id for m in matched}
        remaining_rp = [r for r in razorpay_records if r.id not in matched_rp]
        remaining_bank = [r for r in bank_records if r.id not in used_bank]

        otm_matches = self._one_to_many_match(remaining_rp, remaining_bank)
        for otm in otm_matches:
            one_to_many.append(otm)
            matched_rp.add(otm.razorpay_id)
            for bid in otm.bank_ids:
                used_bank.add(bank_by_id[bid].id if bid in bank_by_id else bid)

        remaining_rp = [r for r in razorpay_records if r.id not in matched_rp]
        remaining_bank = [r for r in bank_records if r.id not in used_bank]

        # ---- Tier 3: LLM resolves the remaining unmatched settlements -----
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
                    reason_code="ORPHAN",
                ))

        # ---- Anomaly detection ---------------------------------------------
        all_records = {"razorpay": razorpay_records, "bank": bank_records, "order": order_records}
        anomalies = self._detect_anomalies(matched, unmatched, all_records)

        total = len(razorpay_records)
        match_rate = len(matched) / total if total else 0.0
        return {
            "total_razorpay": total,
            "matched_count": len(matched),
            "unmatched_count": len(unmatched),
            "match_rate": round(match_rate, 4),
            "matches": [m.__dict__ for m in matched],
            "unmatched": [u.__dict__ for u in unmatched],
            "one_to_many": [_otm_to_dict(o) for o in one_to_many],
            "anomalies": [a.__dict__ for a in anomalies],
            "corrections_applied": corrections_applied,
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
                        f"Fuzzy match (amount within {chr(8377)}{AMOUNT_TOLERANCE}, "
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

    # -- field-level diffs ---------------------------------------------------
    def _compute_field_diffs(self, rp: SourceRecord, bank: SourceRecord) -> list[FieldDiff]:
        diffs = []
        amount_diff = round(rp.amount - bank.amount, 2)
        if amount_diff != 0:
            diffs.append(FieldDiff(
                field="amount",
                source_value=str(rp.amount),
                bank_value=str(bank.amount),
            ))
        if rp.date != bank.date:
            diffs.append(FieldDiff(
                field="date",
                source_value=rp.date,
                bank_value=bank.date,
            ))
        rp_ref = rp.ref or ""
        bank_ref = bank.ref or ""
        if rp_ref and bank_ref and rp_ref != bank_ref:
            diffs.append(FieldDiff(
                field="reference",
                source_value=rp_ref,
                bank_value=bank_ref,
            ))
        return diffs

    def _determine_reason_code(self, rp: SourceRecord, bank: SourceRecord, tier: int) -> str:
        amount_diff = round(rp.amount - bank.amount, 2)
        date_diff = self._date_diff(rp.date, bank.date)

        if tier == 1:
            return "EXACT_MATCH"
        if abs(amount_diff) > 0 and abs(amount_diff) <= 2.50 and date_diff <= 1:
            return "FEE_DIFF"
        if date_diff >= 1 and abs(amount_diff) < AMOUNT_TOLERANCE:
            return "TPLUS1"
        if abs(amount_diff) < AMOUNT_TOLERANCE and date_diff == 0:
            return "REF_DIFF"
        return "FUZZY_MATCH"

    # -- one-to-many matching -----------------------------------------------
    def _one_to_many_match(
        self,
        rp_records: list[SourceRecord],
        bank_records: list[SourceRecord],
    ) -> list[OneToManyMatch]:
        if not rp_records or not bank_records:
            return []

        # Group bank records by date proximity
        bank_by_date: dict[str, list[SourceRecord]] = {}
        for b in bank_records:
            bank_by_date.setdefault(b.date, []).append(b)

        results: list[OneToManyMatch] = []
        used_bank_in_otm: set[str] = set()

        for rp in rp_records:
            best: OneToManyMatch | None = None

            # Collect candidate bank records within DATE_WINDOW_DAYS
            candidates: list[SourceRecord] = []
            for b in bank_records:
                if b.id in used_bank_in_otm:
                    continue
                if self._date_diff(rp.date, b.date) <= DATE_WINDOW_DAYS:
                    candidates.append(b)

            # Try combinations of 2-3 bank records
            for combo_size in (2, 3):
                if len(candidates) < combo_size:
                    continue
                for combo in combinations(candidates, combo_size):
                    combo_ids = [c.id for c in combo]
                    if any(cid in used_bank_in_otm for cid in combo_ids):
                        continue
                    total = round(sum(c.amount for c in combo), 2)
                    if abs(rp.amount - total) <= ONE_TO_MANY_TOLERANCE:
                        confidence = 1.0 - (abs(rp.amount - total) / rp.amount) if rp.amount else 0.8
                        confidence = round(min(max(confidence, 0.7), 0.99), 4)
                        candidate_otm = OneToManyMatch(
                            razorpay_id=rp.id,
                            bank_ids=combo_ids,
                            total_bank_amount=total,
                            confidence=confidence,
                            tier=2,
                            explanation=(
                                f"One-to-many match: {len(combo)} bank records "
                                f"(total {chr(8377)}{total}) match settlement {chr(8377)}{rp.amount}."
                            ),
                            reason_code="BATCH_SPLIT",
                        )
                        if best is None or candidate_otm.confidence > best.confidence:
                            best = candidate_otm

            if best:
                results.append(best)
                for bid in best.bank_ids:
                    used_bank_in_otm.add(bid)

        return results

    # -- NLP entity normalization -------------------------------------------
    def _normalize_entity(self, name: str) -> str:
        n = name.lower().strip()
        for suffix in ENTITY_SUFFIXES:
            n = re.sub(rf"\b{re.escape(suffix)}\b", "", n)
        n = re.sub(r"[^a-z0-9\s]", " ", n)
        n = re.sub(r"\s+", " ", n).strip()
        return n

    # -- anomaly detection ---------------------------------------------------
    def _detect_anomalies(
        self,
        matches: list[MatchCandidate],
        unmatched: list[UnmatchedRecord],
        all_records: dict,
    ) -> list[Anomaly]:
        anomalies: list[Anomaly] = []
        rp_records = all_records.get("razorpay", [])
        bank_records = all_records.get("bank", [])

        # 1) DUPLICATE detection: same amount + same date across records
        amount_date_map: dict[str, list[SourceRecord]] = {}
        for r in rp_records:
            key = f"{r.amount}_{r.date}"
            amount_date_map.setdefault(key, []).append(r)
        for key, recs in amount_date_map.items():
            if len(recs) > 1:
                anomalies.append(Anomaly(
                    id=f"DUP_{recs[0].id}",
                    kind="DUPLICATE",
                    description=f"Duplicate razorpay records: {len(recs)} records with amount {recs[0].amount} on {recs[0].date}.",
                    severity="HIGH",
                    related_records=[r.id for r in recs],
                ))

        # 2) FEE_OVERCHARGE: bank amount significantly less than razorpay (>5%)
        for m in matches:
            rp_rec = next((r for r in rp_records if r.id == m.razorpay_id), None)
            bank_rec = next((r for r in bank_records if r.id == m.bank_id), None)
            if rp_rec and bank_rec and rp_rec.amount > 0:
                pct_diff = (rp_rec.amount - bank_rec.amount) / rp_rec.amount
                if pct_diff > 0.05:
                    anomalies.append(Anomaly(
                        id=f"FEE_{m.razorpay_id}",
                        kind="FEE_OVERCHARGE",
                        description=(
                            f"Fee overcharge: Razorpay {chr(8377)}{rp_rec.amount} vs "
                            f"Bank {chr(8377)}{bank_rec.amount} ({pct_diff:.1%} difference)."
                        ),
                        severity="HIGH",
                        related_records=[m.razorpay_id, m.bank_id],
                    ))

        # 3) AMOUNT_OUTLIER: amount > 3 standard deviations from mean
        amounts = [r.amount for r in rp_records if r.amount > 0]
        if len(amounts) >= 3:
            mean_amt = statistics.mean(amounts)
            stdev_amt = statistics.stdev(amounts)
            if stdev_amt > 0:
                for r in rp_records:
                    if abs(r.amount - mean_amt) > 3 * stdev_amt:
                        anomalies.append(Anomaly(
                            id=f"OUT_{r.id}",
                            kind="AMOUNT_OUTLIER",
                            description=(
                                f"Amount outlier: {chr(8377)}{r.amount} is >3σ from mean "
                                f"({chr(8377)}{mean_amt:.2f} ± {chr(8377)}{stdev_amt:.2f})."
                            ),
                            severity="MEDIUM",
                            related_records=[r.id],
                        ))

        # 4) TIMING_ANOMALY: settlement date > 3 days after order date
        order_records = all_records.get("order", [])
        order_by_id = {r.id: r for r in order_records}
        for r in rp_records:
            if r.ref and r.ref in order_by_id:
                order_rec = order_by_id[r.ref]
                dd = self._date_diff(order_rec.date, r.date)
                if dd > 3:
                    anomalies.append(Anomaly(
                        id=f"TIME_{r.id}",
                        kind="TIMING_ANOMALY",
                        description=(
                            f"Timing anomaly: settlement date {r.date} is {dd} days after "
                            f"order date {order_rec.date}."
                        ),
                        severity="LOW",
                        related_records=[r.id, order_rec.id],
                    ))

        return anomalies

    # -- self-learning corrections ------------------------------------------
    def record_correction(self, razorpay_id: str, correct_bank_id: str, correction_type: str):
        """Store a correction for future reconciliation runs."""
        self._corrections.append({
            "razorpay_id": razorpay_id,
            "correct_bank_id": correct_bank_id,
            "correction_type": correction_type,
        })

    def _find_correction(self, razorpay_id: str) -> dict | None:
        for c in self._corrections:
            if c["razorpay_id"] == razorpay_id:
                return c
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


def _otm_to_dict(o: OneToManyMatch) -> dict:
    return o.__dict__
