"""LLM-assisted reconciliation judge.

The rules engine resolves the easy matches deterministically. This module
handles the genuinely ambiguous records - the exceptions - by asking an LLM
to reason about whether two records represent the same underlying transaction.

Uses OpenRouter (free tier) with pluggable models. Falls back to a
rule-based judge when no API key is configured.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

from .models import (
    FieldDiff,
    LLMResolution,
    MatchCandidate,
    SourceRecord,
    UnmatchedRecord,
)

API_KEY_FILE = Path.home() / "api_key.txt"


class RuleBasedJudge:
    """Deterministic fallback used when no LLM is configured.

    Mirrors what an LLM would conclude for the synthetic dataset's exception
    cases (fee gaps, T+1 lag, ref differences) so the demo runs fully offline.
    """

    def resolve(
        self,
        razorpay: list[SourceRecord],
        bank: list[SourceRecord],
        orders: list[SourceRecord],
    ) -> LLMResolution:
        result = LLMResolution()
        bank_pool = {b.id: b for b in bank}
        used_bank: set[str] = set()

        for rp in razorpay:
            best = None
            best_reason = ""
            best_reason_code = ""
            for bid, b in bank_pool.items():
                if bid in used_bank:
                    continue
                gap = round(b.amount - rp.amount, 2)
                if abs(gap) <= 2.0 and abs(gap) > 0:
                    best = b
                    best_reason = f"Amount gap of {chr(8377)}{abs(gap)} matches a fee deduction."
                    best_reason_code = "FEE_DIFF"
                    break
                if abs(float(b.amount) - float(rp.amount)) < 2.0:
                    best = b
                    best_reason = "Amount within tolerance; treating as same txn."
                    best_reason_code = "TPLUS1"
                    break
            if best:
                used_bank.add(best.id)
                field_diffs = _compute_field_diffs(rp, best)
                result.matches.append(MatchCandidate(
                    razorpay_id=rp.id,
                    bank_id=best.id,
                    order_id="N/A",
                    confidence=0.9,
                    tier=3,
                    explanation=best_reason,
                    field_diffs=field_diffs,
                    reason_code=best_reason_code,
                    raw=rp.raw,
                ))
            else:
                result.unmatched.append(UnmatchedRecord(
                    kind="razorpay",
                    id=rp.id,
                    amount=rp.amount,
                    date=rp.date,
                    reason="No matching bank credit; likely pending settlement or orphan.",
                    suggestion="Verify with Razorpay settlement API or wait for T+1.",
                    reason_code="ORPHAN",
                    raw=rp.raw,
                ))
        return result


class LLMJudge:
    """LLM-backed judge using OpenRouter's OpenAI-compatible API."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
    ):
        self.api_key = api_key or self._load_api_key()
        self.model = model or "nvidia/nemotron-3.5-lightning:free"
        self.base_url = (base_url or os.getenv("LLM_BASE_URL") or "https://openrouter.ai/api/v1").rstrip("/")
        self._fallback = RuleBasedJudge()

    @staticmethod
    def _load_api_key() -> str | None:
        """Load API key from file or environment."""
        # 1. Environment variable
        key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
        if key:
            return key
        # 2. File
        if API_KEY_FILE.exists():
            text = API_KEY_FILE.read_text(encoding="utf-8").strip()
            for line in text.splitlines():
                line = line.strip()
                if line.startswith("sk-"):
                    return line
        return None

    def resolve(
        self,
        razorpay: list[SourceRecord],
        bank: list[SourceRecord],
        orders: list[SourceRecord],
    ) -> LLMResolution:
        if not self.api_key:
            print("[LLMJudge] No API key — falling back to RuleBasedJudge")
            return self._fallback.resolve(razorpay, bank, orders)

        try:
            import urllib.request
            import time

            candidate_max = 6
            prompt = self._build_prompt(razorpay, bank[:candidate_max])

            print(f"[LLMJudge] Calling OpenRouter — model={self.model}, unresolved={len(razorpay)}, bank_candidates={min(len(bank), candidate_max)}")
            t0 = time.time()

            payload = {
                "model": self.model,
                "messages": [
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.0,
            }

            url = f"{self.base_url}/chat/completions"
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                    "HTTP-Referer": "https://reconcile-ai.buildathon.dev",
                    "X-Title": "Reconcile-AI",
                },
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = json.loads(resp.read().decode("utf-8"))
            elapsed = round(time.time() - t0, 2)
            print(f"[LLMJudge] OpenRouter responded in {elapsed}s")
            return self._parse_response(body, razorpay, bank)
        except Exception as e:
            print(f"[LLMJudge] OpenRouter call failed: {e}")
            return self._fallback.resolve(razorpay, bank, orders)

    # -- prompt building -----------------------------------------------------
    def _build_prompt(self, razorpay: list[SourceRecord], bank: list[SourceRecord]) -> str:
        rp_lines = "\n".join(
            f"- {r.id} | amt {chr(8377)}{r.amount:.2f} | {r.date} | ref {r.ref}"
            for r in razorpay
        )
        bank_lines = "\n".join(
            f"- {b.id} | amt {chr(8377)}{b.amount:.2f} | {b.date} | ref {b.ref}"
            for b in bank
        )
        return f"""You are a senior payments reconciliation analyst at a fintech company.

You have Razorpay settlement records that did NOT match automatically to a
bank credit. For each, decide whether it corresponds to any bank record, or
is genuinely unmatched.

Known context:
- Settlements may land T+1 (one day after the order).
- Razorpay takes a fee out of the collected amount, so the settled amount can
  be slightly less than the customer-paid amount (fee usually <= {chr(8377)}2.50).
- Reference IDs may differ in case/format across systems (e.g. ORD vs OR,
  letter casing), but the underlying transaction is the same.
- A settlement with no bank credit is usually a pending/orphan settlement.

Unmatched Razorpay settlements:
{rp_lines}

Available bank credits (unmatched):
{bank_lines}

Return STRICT JSON only, shaped as:
{{
  "decisions": [
    {{
      "razorpay_id": "...",
      "bank_id": "..." | null,
      "confidence": 0.0 to 1.0,
      "reason": "short human explanation",
      "reason_code": "EXACT_MATCH" | "FEE_DIFF" | "TPLUS1" | "REF_DIFF" | "ORPHAN" | "FUZZY_MATCH"
    }}
  ]
}}

If confidence < 0.6 or no bank matches, set bank_id to null and use reason_code "ORPHAN".
Use "FEE_DIFF" when a small fee gap explains the amount difference.
Use "TPLUS1" when the date is off by one day but amounts match.
Use "REF_DIFF" when amounts and dates match but references differ.
Use "FUZZY_MATCH" for other partial matches.""".strip()

    def _parse_response(
        self,
        body: dict,
        razorpay: list[SourceRecord],
        bank: list[SourceRecord],
    ) -> LLMResolution:
        result = LLMResolution()
        try:
            # OpenAI / OpenRouter response format
            text = body["choices"][0]["message"]["content"]
            text = re.sub(r"```(?:json)?", "", text).strip("` \n")
            data = json.loads(text)
            decisions = data.get("decisions", [])
        except Exception:
            return self._fallback.resolve(razorpay, bank)

        bank_by_id = {b.id: b for b in bank}
        rp_by_id = {r.id: r for r in razorpay}
        used_bank: set[str] = set()

        for d in decisions:
            rp_id = d.get("razorpay_id")
            bank_id = d.get("bank_id")
            conf = float(d.get("confidence", 0.0))
            reason = d.get("reason", "")
            reason_code = d.get("reason_code", "")
            if not rp_id or rp_id not in rp_by_id:
                continue
            if bank_id and bank_id in bank_by_id and bank_id not in used_bank:
                if conf >= 0.6:
                    used_bank.add(bank_id)
                    rp_rec = rp_by_id[rp_id]
                    bank_rec = bank_by_id[bank_id]
                    field_diffs = _compute_field_diffs(rp_rec, bank_rec)
                    result.matches.append(MatchCandidate(
                        razorpay_id=rp_id,
                        bank_id=bank_id,
                        order_id="N/A",
                        confidence=conf,
                        tier=3,
                        explanation=reason,
                        field_diffs=field_diffs,
                        reason_code=reason_code or "FUZZY_MATCH",
                        raw=rp_rec.raw,
                    ))
                    continue
            result.unmatched.append(UnmatchedRecord(
                kind="razorpay",
                id=rp_id,
                amount=rp_by_id[rp_id].amount,
                date=rp_by_id[rp_id].date,
                reason=reason or "No confident match.",
                suggestion="Verify with settlement API or wait for settlement window.",
                reason_code=reason_code or "ORPHAN",
                raw=rp_by_id[rp_id].raw,
            ))
        return result


def _compute_field_diffs(rp: SourceRecord, bank: SourceRecord) -> list[FieldDiff]:
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


def get_llm_judge(api_key: str | None = None) -> "LLMJudge | RuleBasedJudge":
    """Factory returning the best available judge for the current environment."""
    judge = LLMJudge(api_key=api_key, model="nvidia/nemotron-3.5-lightning:free")
    if judge.api_key:
        return judge
    return RuleBasedJudge()
