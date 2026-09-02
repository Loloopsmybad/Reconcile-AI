"""FastAPI backend for the Reconcile-AI settlement Q&A agent.

Endpoints:
  POST /api/reconcile   - Upload the three CSVs and run reconciliation
  GET  /api/health      - Health check
  GET  /api/demo        - Generate synthetic data and run reconciliation
"""

from __future__ import annotations

import io
import json
import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Ensure the package is importable regardless of CWD.
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from data.generator import build_dataset  # noqa: E402
from reconciler.engine import ReconciliationEngine, SourceRecord  # noqa: E402
from reconciler.evaluator import score_results, load_ground_truth  # noqa: E402

app = FastAPI(title="Reconcile-AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UploadedDataset(BaseModel):
    razorpay_rows: list[dict]
    bank_rows: list[dict]
    order_rows: list[dict]


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "reconcile-ai"}


@app.get("/api/demo")
def demo(use_llm: bool = True) -> dict:
    """Generate synthetic data, reconcile it, and score against ground truth."""
    with tempfile.TemporaryDirectory() as tmp:
        files = build_dataset(out_dir=Path(tmp))
        rp_rows = _read_csv(files["razorpay.csv"])
        bank_rows = _read_csv(files["bank.csv"])
        order_rows = _read_csv(files["orders.csv"])
        gt = json.loads(Path(files["ground_truth.json"]).read_text(encoding="utf-8"))

        engine = ReconciliationEngine(use_llm=use_llm)
        result = engine.reconcile(
            _to_records(rp_rows, "razorpay", "settlement_id", "order_ref"),
            _to_records(bank_rows, "bank", "transaction_id", "settlement_ref"),
            _to_records(order_rows, "order", "order_id", "order_id"),
        )
        metrics = score_results(result, gt)

        sample_matches = result["matches"][:10]
        sample_unmatched = result["unmatched"][:10]
        return {
            "metrics": metrics,
            "sample_matches": sample_matches,
            "sample_unmatched": sample_unmatched,
        }


@app.post("/api/reconcile")
async def reconcile(
    razorpay: UploadFile = File(...),
    bank: UploadFile = File(...),
    orders: UploadFile = File(...),
) -> JSONResponse:
    """Reconcile user-uploaded CSVs.

    Expects three files: razorpay_settlements.csv, bank_statements.csv,
    orders.csv (parsed into SourceRecords and matched).
    """
    rp_rows = _decode_csv(await razorpay.read())
    bank_rows = _decode_csv(await bank.read())
    order_rows = _decode_csv(await orders.read())

    engine = ReconciliationEngine(use_llm=True)
    result = engine.reconcile(
        _to_records(rp_rows, "razorpay", "settlement_id", "order_ref"),
        _to_records(bank_rows, "bank", "transaction_id", "settlement_ref"),
        _to_records(order_rows, "order", "order_id", "order_id"),
    )
    return JSONResponse(content=result)


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def _to_records(
    rows: list[dict], kind: str, id_field: str, ref_field: str
) -> list[SourceRecord]:
    out = []
    for row in rows:
        try:
            amt = float(row.get("amount", 0))
            date = str(row.get("date", "")).strip()
        except (ValueError, TypeError):
            continue
        rid = str(row.get(id_field, "")).strip()
        ref = str(row.get(ref_field, "")).strip() if ref_field else None
        out.append(SourceRecord(
            kind=kind, id=rid, amount=amt, date=date, ref=ref, raw=row,
        ))
    return out


def _read_csv(path: str) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as f:
        import csv
        return list(csv.DictReader(f))


def _decode_csv(data: bytes) -> list[dict]:
    import csv
    text = data.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)
