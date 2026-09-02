"""Evaluate reconciliation results against a known ground truth.

The synthetic dataset ships with a ground_truth.json describing the correct
match for every Razorpay settlement. This module scores the engine's output
(match rate, precision, per-fault-type accuracy) so judges get numbers they
can trust - and so you can iterate on the engine.
"""

from __future__ import annotations

import json
from pathlib import Path

DEFAULT_TRUTH = Path(__file__).resolve().parent.parent.parent / "data" / "synthetic" / "ground_truth.json"


def load_ground_truth(path: str | Path = DEFAULT_TRUTH) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def score_results(result: dict, ground_truth: dict | None = None) -> dict:
    """Compute accuracy metrics for a reconciliation run.

    Parameters
    ----------
    result : output of ReconciliationEngine.reconcile()
    ground_truth : mapping of razorpay_id -> {"bank_ref", "order_id", ...}

    Returns
    -------
    dict of metrics.
    """
    if ground_truth is None:
        ground_truth = load_ground_truth()

    matches = {m["razorpay_id"]: m for m in result["matches"]}

    correct = 0
    wrong = 0
    total = len(ground_truth)
    by_type = {"correct": {}, "wrong": {}, "total": {}}

    for rp_id, truth in ground_truth.items():
        truth_bank = truth.get("bank_ref")
        match = matches.get(rp_id)
        got = None
        if match and truth_bank is None:
            got = None if match["bank_id"] in ("N/A", None) else match["bank_id"]
        elif match:
            got = match["bank_id"]

        mtype = truth.get("match_type", "exact")
        # Count fault-type tallies.
        by_type["total"][mtype] = by_type["total"].get(mtype, 0) + 1

        # A match is "correct" if both agree on whether a bank credit exists
        # and, if so, on which one.
        is_correct = (got is None) == (truth_bank is None)
        if is_correct and got is not None:
            is_correct = got == truth_bank

        if is_correct:
            correct += 1
            by_type["correct"][mtype] = by_type["correct"].get(mtype, 0) + 1
        else:
            wrong += 1
            by_type["wrong"][mtype] = by_type["wrong"].get(mtype, 0) + 1

    accuracy = correct / total if total else 0.0

    # Per-fault-type accuracy.
    per_type = {}
    for mt, tot in by_type["total"].items():
        per_type[mt] = {
            "total": tot,
            "correct": by_type["correct"].get(mt, 0),
            "wrong": by_type["wrong"].get(mt, 0),
            "accuracy": round(by_type["correct"].get(mt, 0) / tot, 4) if tot else 0.0,
        }

    # Exception honesty: are the reported exceptions actually exceptions?
    reported_unmatched = {u["id"] for u in result["unmatched"]}
    true_exceptions = {rp_id for rp_id, t in ground_truth.items() if t.get("bank_ref") is None}
    reported_exception_hits = reported_unmatched & true_exceptions
    exception_precision = (
        len(reported_exception_hits) / len(reported_unmatched)
        if reported_unmatched else 0.0
    )
    exception_recall = (
        len(reported_exception_hits) / len(true_exceptions)
        if true_exceptions else 0.0
    )

    return {
        "total_transactions": total,
        "total_matched": result["matched_count"],
        "reported_unmatched": result["unmatched_count"],
        "claim_match_rate": result["match_rate"],
        "true_accuracy": round(accuracy, 4),
        "correct": correct,
        "wrong": wrong,
        "per_fault_type": per_type,
        "exception_precision": round(exception_precision, 4),
        "exception_recall": round(exception_recall, 4),
    }
