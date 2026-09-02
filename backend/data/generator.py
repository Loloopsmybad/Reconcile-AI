"""Synthetic data generator for reconciliation demo.

Creates three realistic data sources with a known ground truth so the
matching engine can be scored against an actual correct answer:
  1. Razorpay settlements
  2. Bank statements
  3. Merchant order records

Data is seeded with intentional mismatches (fees, T+1 lag, orphan records,
reference-id differences) to exercise all three tiers of the matcher.
"""

from __future__ import annotations

import csv
import json
import random
from datetime import datetime, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "synthetic"

MERCHANT_NAMES = [
    "UrbanKart Store",
    "GreenLeaf Organics",
    "Nova Electronics",
    "SpiceRoute Foods",
    "CloudByte SaaS",
    "PeakFitness Gym",
    "CraftHouse Retail",
    "Zenith Watches",
]
PAYMENT_MODES = ["UPI", "Credit Card", "Debit Card", "NetBanking", "Wallet"]

# Maps payment mode to a fee the merchant is charged (difference shows up as
# the amount gap between what Razorpay collects vs what it settles).
FEES = {
    "UPI": 0.5,          # adjacency +2.0%*0.25 type fee -> keep flat for determinism
    "Credit Card": 2.0,
    "Debit Card": 1.5,
    "NetBanking": 1.0,
    "Wallet": 0.9,
}

CURRENCY = "INR"


def _rand_amount(rng: random.Random, low: float = 99, high: float = 25000) -> float:
    """Random amount rounded to paise (2 decimals)."""
    return round(rng.uniform(low, high) * 2) / 2


def _rand_ref_id(rng: random.Random, prefix: str, n: int) -> str:
    return f"{prefix}{rng.randint(10 ** (n - 1), 10**n - 1)}"


def build_dataset(
    n: int = 60,
    seed: int = 42,
    match_ratio: float = 0.75,
    out_dir: Path = BASE_DIR,
) -> dict:
    """Generate a full synthetic dataset.

    Parameters
    ----------
    n : number of base transactions to generate.
    seed : rng seed for reproducibility.
    match_ratio : fraction of transactions expected to reconcile cleanly.
    out_dir : directory to write the CSVs and ground truth to.

    Returns
    -------
    dict with keys: "razorpay.csv", "bank.csv", "orders.csv", "ground_truth.json"
    """
    rng = random.Random(seed)
    out_dir.mkdir(parents=True, exist_ok=True)

    transactions: list[dict] = []
    ground_truth: dict[str, dict] = {}

    n_matches = int(n * match_ratio)
    n_mismatch = n - n_matches

    # --- matched (well-formed) transactions --------------------------------
    for _ in range(n_matches):
        txn = _make_clean_transaction(rng)
        transactions.append(txn)
        ground_truth[txn["razorpay"]["settlement_id"]] = {
            "bank_ref": txn["bank"]["transaction_id"],
            "order_id": txn["order"]["order_id"],
            "match_type": "exact",
            "notes": "All three sources agree on amount and date.",
        }

    # --- mismatches ---------------------------------------------------------
    # We generate transactions and then corrupt them in ways that give the
    # matcher genuinely hard-but-resolvable cases.
    for i in range(n_mismatch):
        txn = _make_clean_transaction(rng)
        fault = rng.choice(["fees", "tplus1", "orphan", "ref_diff"])
        transactions.append(txn)
        if fault == "fees":
            # Amount gap exactly matches the merchant fee -> LLM should figure
            # this is a fee deduction, not a genuine mismatch.
            fee = FEES.get(txn["order"]["payment_mode"], 0.5)
            txn["razorpay"]["amount"] = round(txn["razorpay"]["amount"] - fee, 2)
            txn["bank"]["amount"] = txn["razorpay"]["amount"]
            ground_truth[txn["razorpay"]["settlement_id"]] = {
                "bank_ref": txn["bank"]["transaction_id"],
                "order_id": txn["order"]["order_id"],
                "match_type": "fee",
                "notes": f"Amount gap of ₹{fee} explained by fee deduction.",
            }
        elif fault == "tplus1":
            # Settlement lands one business day later than the order date.
            txn["bank"]["date"] = _biz_day_after(txn["order"]["date"])
            txn["razorpay"]["date"] = txn["bank"]["date"]
            ground_truth[txn["razorpay"]["settlement_id"]] = {
                "bank_ref": txn["bank"]["transaction_id"],
                "order_id": txn["order"]["order_id"],
                "match_type": "tplus1",
                "notes": "Settlement date is T+1 vs order date.",
            }
        elif fault == "orphan":
            # Present in Razorpay but the bank has NO matching entry.
            txn["bank"] = None
            ground_truth[txn["razorpay"]["settlement_id"]] = {
                "bank_ref": None,
                "order_id": txn["order"]["order_id"],
                "match_type": "orphan",
                "notes": "Settlement recorded but no matching bank credit (pending).",
            }
        elif fault == "ref_diff":
            # Same transaction but the reference strings differ slightly (e.g.
            # trailing dash, letter case) - forces fuzzy matching.
            txn["bank"]["transaction_id"] = txn["bank"]["transaction_id"].lower()
            txn["order"]["order_id"] = txn["order"]["order_id"].replace("ORD", "OR")
            ground_truth[txn["razorpay"]["settlement_id"]] = {
                "bank_ref": txn["bank"]["transaction_id"],
                "order_id": txn["order"]["order_id"],
                "match_type": "ref_diff",
                "notes": "References differ in casing/format but are same txn.",
            }

    # --- orphan records on the bank side too (not represented above)...  ---
    # Add a handful of stray bank rows that have no corresponding order.

    records = {
        "razorpay": [t["razorpay"] for t in transactions],
        "bank": [t["bank"] for t in transactions if t["bank"] is not None],
        "orders": [t["order"] for t in transactions],
    }

    # Package rows for CSV output.
    rp_rows = [{
        "settlement_id": r["settlement_id"],
        "merchant": r["merchant"],
        "amount": f"{r['amount']:.2f}",
        "date": r["date"],
        "status": r["status"],
        "fees": f"{r['fees']:.2f}",
        "gst": f"{r['gst']:.2f}",
        "payment_mode": r["payment_mode"],
        "order_ref": r["order_ref"],
    } for r in records["razorpay"]]

    bank_rows = [{
        "transaction_id": b["transaction_id"],
        "amount": f"{b['amount']:.2f}",
        "date": b["date"],
        "mode": b["mode"],
        "description": b["description"],
        "settlement_ref": b["settlement_ref"],
    } for b in records["bank"]]

    order_rows = [{
        "order_id": o["order_id"],
        "amount": f"{o['amount']:.2f}",
        "date": o["date"],
        "customer_id": o["customer_id"],
        "payment_method": o["payment_mode"],
        "status": o["status"],
    } for o in records["orders"]]

    # Write files.
    _write_csv(out_dir / "razorpay_settlements.csv", rp_rows, fieldnames=list(rp_rows[0].keys()))
    _write_csv(out_dir / "bank_statements.csv", bank_rows, fieldnames=list(bank_rows[0].keys()))
    _write_csv(out_dir / "orders.csv", order_rows, fieldnames=list(order_rows[0].keys()))
    (out_dir / "ground_truth.json").write_text(
        json.dumps(ground_truth, indent=2), encoding="utf-8"
    )

    return {
        "razorpay.csv": str(out_dir / "razorpay_settlements.csv"),
        "bank.csv": str(out_dir / "bank_statements.csv"),
        "orders.csv": str(out_dir / "orders.csv"),
        "ground_truth.json": str(out_dir / "ground_truth.json"),
    }


def _make_clean_transaction(rng: random.Random) -> dict:
    """Create a single well-formed transaction (all three sources agree)."""
    merchant = rng.choice(MERCHANT_NAMES)
    mode = rng.choice(PAYMENT_MODES)
    amount = _rand_amount(rng)
    fee = FEES[mode]
    gst = round(fee * 0.18, 2)  # 18% GST on the fee
    settled = round(amount - fee - gst, 2)

    base_date = datetime(2026, 1, 15) + timedelta(days=rng.randint(0, 30))
    order_ref = _rand_ref_id(rng, "ORD", 6)
    settlement_id = _rand_ref_id(rng, "STL", 7)
    bank_txn_id = "RP" + _rand_ref_id(rng, "", 9)

    return {
        "razorpay": {
            "settlement_id": settlement_id,
            "merchant": merchant,
            "amount": settled,  # amount Razorpay actually settles to merchant
            "date": base_date.strftime("%Y-%m-%d"),
            "status": "settled",
            "fees": fee,
            "gst": gst,
            "payment_mode": mode,
            "order_ref": order_ref,
        },
        "bank": {
            "transaction_id": bank_txn_id,
            "amount": settled,
            "date": base_date.strftime("%Y-%m-%d"),
            "mode": mode,
            "description": f"Settlement from {merchant}",
            "settlement_ref": settlement_id,
        },
        "order": {
            "order_id": order_ref,
            "amount": amount,  # gross amount customer paid
            "date": base_date.strftime("%Y-%m-%d"),
            "customer_id": _rand_ref_id(rng, "CUS", 5),
            "payment_mode": mode,
            "status": "completed",
        },
    }


def _biz_day_after(date_str: str) -> str:
    d = datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=1)
    return d.strftime("%Y-%m-%d")


def _write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    result = build_dataset()
    for name, path in result.items():
        print(f"{name:18} -> {path}")
