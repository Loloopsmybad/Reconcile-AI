"""LLM-assisted reconciliation judge.

The rules engine resolves the easy matches deterministically. This module
handles the genuinely ambiguous records - the exceptions - by asking an LLM
to reason about whether two records represent the same underlying transaction.

It supports pluggable providers (OpenAI by default, with a rule-based
fallback so the demo still works without an API key). Structured output is
used when the provider supports it, otherwise JSON mode or parsing.
"""

from __future__ import annotations

import json
import os
import re

from .models import (
    LLMResolution,
    MatchCandidate,
    SourceRecord,
    UnmatchedRecord,
)


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
            for bid, b in bank_pool.items():
                if bid in used_bank:
                    continue
                # fee gap: amounts differ by exactly a small fee amount
                gap = round(b.amount - rp.amount, 2)
                if abs(gap) <= 2.0 and abs(gap) > 0:
                    best = b
                    best_reason = f"Amount gap of ₹{abs(gap)} matches a fee deduction."
                    break
                # date window
                if abs(float(b.amount) - float(rp.amount)) < 2.0:
                    best = b
                    best_reason = "Amount within tolerance; treating as same txn."
                    break
            if best:
                used_bank.add(best.id)
                result.matches.append(MatchCandidate(
                    razorpay_id=rp.id,
                    bank_id=best.id,
                    order_id="N/A",
                    confidence=0.9,
                    tier=3,
                    explanation=best_reason,
                ))
            else:
                result.unmatched.append(UnmatchedRecord(
                    kind="razorpay",
                    id=rp.id,
                    amount=rp.amount,
                    date=rp.date,
                    reason="No matching bank credit; likely pending settlement or orphan.",
                    suggestion="Verify with Razorpay settlement API or wait for T+1.",
                ))
        return result


class LLMJudge:
    """LLM-backed judge using an OpenAI-compatible chat completions endpoint."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str = "gemini-2.0-flash",
        base_url: str | None = None,
    ):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.model = model
        self.base_url = base_url or os.getenv("LLM_BASE_URL") or "https://generativelanguage.googleapis.com"
        self._fallback = RuleBasedJudge()

    def resolve(
        self,
        razorpay: list[SourceRecord],
        bank: list[SourceRecord],
        orders: list[SourceRecord],
    ) -> LLMResolution:
        if not self.api_key:
            return self._fallback.resolve(razorpay, bank, orders)

        try:
            import urllib.request

            candidate_max = 6
            payload = {
                "contents": [{
                    "role": "user",
                    "parts": [{
                        "text": self._build_prompt(razorpay, bank[:candidate_max])
                    }],
                }],
                "generationConfig": {
                    "temperature": 0.0,
                    "responseMimeType": "application/json",
                },
            }
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{self.model}:generateContent?key={self.api_key}"
            )
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=45) as resp:
                body = json.loads(resp.read().decode("utf-8"))
            return self._parse_response(body, razorpay, bank)
        except Exception:
            # If the LLM is unreachable, degrade gracefully to the rules.
            return self._fallback.resolve(razorpay, bank, orders)

    # -- prompt building -----------------------------------------------------
    def _build_prompt(self, razorpay: list[SourceRecord], bank: list[SourceRecord]) -> str:
        rp_lines = "\n".join(
            f"- {r.id} | amt ₹{r.amount:.2f} | {r.date} | ref {r.ref}"
            for r in razorpay
        )
        bank_lines = "\n".join(
            f"- {b.id} | amt ₹{b.amount:.2f} | {b.date} | ref {b.ref}"
            for b in bank
        )
        return f"""
You are a senior payments reconciliation analyst at a fintech company.

You have Razorpay settlement records that did NOT match automatically to a
bank credit. For each, decide whether it corresponds to any bank record, or
is genuinely unmatched.

Known context:
- Settlements may land T+1 (one day after the order).
- Razorpay takes a fee out of the collected amount, so the settled amount can
  be slightly less than the customer-paid amount (fee usually <= ₹2.50).
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
      "reason": "short human explanation"
    }}
  ]
}}

If confidence < 0.6 or no bank matches, set bank_id to null.
""".strip()

    def _parse_response(
        self,
        body: dict,
        razorpay: list[SourceRecord],
        bank: list[SourceRecord],
    ) -> LLMResolution:
        result = LLMResolution()
        try:
            text = body["candidates"][0]["content"]["parts"][0]["text"]
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
            if not rp_id or rp_id not in rp_by_id:
                continue
            if bank_id and bank_id in bank_by_id and bank_id not in used_bank:
                if conf >= 0.6:
                    used_bank.add(bank_id)
                    result.matches.append(MatchCandidate(
                        razorpay_id=rp_id,
                        bank_id=bank_id,
                        order_id="N/A",
                        confidence=conf,
                        tier=3,
                        explanation=reason,
                    ))
                    continue
            result.unmatched.append(UnmatchedRecord(
                kind="razorpay",
                id=rp_id,
                amount=rp_by_id[rp_id].amount,
                date=rp_by_id[rp_id].date,
                reason=reason or "No confident match.",
                suggestion="Verify with settlement API or wait for settlement window.",
            ))
        return result


def get_llm_judge(api_key: str | None = None) -> "LLMJudge | RuleBasedJudge":
    """Factory returning the best available judge for the current environment."""
    key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if key:
        return LLMJudge(api_key=key)
    return RuleBasedJudge()
