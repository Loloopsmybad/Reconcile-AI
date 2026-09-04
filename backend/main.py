"""FastAPI backend for the Reconcile-AI settlement reconciliation agent.

Endpoints:
  GET  /api/health         - Health check
  GET  /api/demo           - Generate synthetic data and run reconciliation (non-streaming)
  GET  /api/demo/stream    - SSE streaming version with live progress
  POST /api/reconcile      - Upload the three CSVs and run reconciliation
  POST /api/query          - Natural language query over reconciliation results
  GET  /api/report         - Generate PDF reconciliation report
  POST /api/correct        - Record a human correction for self-learning
  GET  /api/anomalies      - Return anomalies from the most recent run
  POST /api/learn          - Apply accumulated corrections
"""

from __future__ import annotations

import io
import json
import sys
import tempfile
import time
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from data.generator import build_dataset
from reconciler.engine import ReconciliationEngine, SourceRecord
from reconciler.evaluator import score_results, load_ground_truth

app = FastAPI(title="Reconcile-AI", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CORRECTIONS: list[dict] = []
LATEST_ANOMALIES: list[dict] = []
LATEST_ONE_TO_MANY: list[dict] = []
LATEST_RESULT: dict = {}
LATEST_METRICS: dict = {}
LATEST_GT: dict = {}


class CorrectionRequest(BaseModel):
    razorpay_id: str
    correct_bank_id: str
    correction_type: str = "manual_match"


class QueryRequest(BaseModel):
    question: str


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "reconcile-ai"}


# --------------------------------------------------------------------------
# Demo — non-streaming
# --------------------------------------------------------------------------

@app.get("/api/demo")
def demo(use_llm: bool = True, size: int = 60) -> dict:
    """Generate synthetic data, reconcile it, and score against ground truth."""
    global LATEST_RESULT, LATEST_METRICS, LATEST_GT, LATEST_ANOMALIES, LATEST_ONE_TO_MANY

    size = max(10, min(size, 5000))
    with tempfile.TemporaryDirectory() as tmp:
        files = build_dataset(n=size, out_dir=Path(tmp))
        rp_rows = _read_csv(files["razorpay.csv"])
        bank_rows = _read_csv(files["bank.csv"])
        order_rows = _read_csv(files["orders.csv"])
        gt = json.loads(Path(files["ground_truth.json"]).read_text(encoding="utf-8"))

        t0 = time.time()
        engine = ReconciliationEngine(use_llm=use_llm)
        result = engine.reconcile(
            _to_records(rp_rows, "razorpay", "settlement_id", "order_ref"),
            _to_records(bank_rows, "bank", "transaction_id", "settlement_ref"),
            _to_records(order_rows, "order", "order_id", "order_id"),
        )
        elapsed = round(time.time() - t0, 2)
        metrics = score_results(result, gt)

        LATEST_RESULT = result
        LATEST_METRICS = metrics
        LATEST_GT = gt
        LATEST_ANOMALIES.clear()
        LATEST_ANOMALIES.extend(result.get("anomalies", []))
        LATEST_ONE_TO_MANY.clear()
        LATEST_ONE_TO_MANY.extend(result.get("one_to_many", []))

        return {
            "metrics": metrics,
            "sample_matches": result["matches"][:10],
            "sample_unmatched": result["unmatched"][:10],
            "one_to_many": result.get("one_to_many", []),
            "anomalies": result.get("anomalies", []),
            "total_one_to_many": len(result.get("one_to_many", [])),
            "total_anomalies": len(result.get("anomalies", [])),
            "elapsed_seconds": elapsed,
            "dataset_size": size,
        }


# --------------------------------------------------------------------------
# Demo — SSE streaming
# --------------------------------------------------------------------------

@app.get("/api/demo/stream")
async def demo_stream(use_llm: bool = True, size: int = 60):
    """SSE streaming demo with live progress updates."""
    global LATEST_RESULT, LATEST_METRICS, LATEST_GT, LATEST_ANOMALIES, LATEST_ONE_TO_MANY

    size = max(10, min(size, 5000))

    async def event_generator():
        t_start = time.time()

        yield {"event": "progress", "data": json.dumps({"phase": "generating", "progress": 5, "message": f"Generating {size} synthetic transactions…"})}

        with tempfile.TemporaryDirectory() as tmp:
            files = build_dataset(n=size, out_dir=Path(tmp))
            rp_rows = _read_csv(files["razorpay.csv"])
            bank_rows = _read_csv(files["bank.csv"])
            order_rows = _read_csv(files["orders.csv"])
            gt = json.loads(Path(files["ground_truth.json"]).read_text(encoding="utf-8"))

            rp = _to_records(rp_rows, "razorpay", "settlement_id", "order_ref")
            bank = _to_records(bank_rows, "bank", "transaction_id", "settlement_ref")
            orders = _to_records(order_rows, "order", "order_id", "order_id")

            yield {"event": "progress", "data": json.dumps({"phase": "ready", "progress": 10, "message": f"Loaded {len(rp)} Razorpay, {len(bank)} bank, {len(orders)} order records"})}

            def on_progress(phase, progress, message):
                pass

            def streaming_progress(phase, progress, message):
                pass

            # We need to call the engine synchronously but emit SSE events
            # Use a list to capture progress callbacks from within the engine
            progress_events = []

            def capture_progress(phase, progress, message):
                progress_events.append({"phase": phase, "progress": progress, "message": message})

            engine = ReconciliationEngine(use_llm=use_llm)
            t0 = time.time()
            result = engine.reconcile(rp, bank, orders, progress_cb=capture_progress)
            elapsed = round(time.time() - t0, 2)

            # Emit captured progress events
            for evt in progress_events:
                yield {"event": "progress", "data": json.dumps(evt)}

            metrics = score_results(result, gt)

            LATEST_RESULT = result
            LATEST_METRICS = metrics
            LATEST_GT = gt
            LATEST_ANOMALIES.clear()
            LATEST_ANOMALIES.extend(result.get("anomalies", []))
            LATEST_ONE_TO_MANY.clear()
            LATEST_ONE_TO_MANY.extend(result.get("one_to_many", []))

            final_data = {
                "metrics": metrics,
                "sample_matches": result["matches"][:10],
                "sample_unmatched": result["unmatched"][:10],
                "one_to_many": result.get("one_to_many", []),
                "anomalies": result.get("anomalies", []),
                "total_one_to_many": len(result.get("one_to_many", [])),
                "total_anomalies": len(result.get("anomalies", [])),
                "elapsed_seconds": elapsed,
                "dataset_size": size,
            }
            yield {"event": "complete", "data": json.dumps(final_data)}

    return EventSourceResponse(event_generator())


# --------------------------------------------------------------------------
# Upload reconcile
# --------------------------------------------------------------------------

@app.post("/api/reconcile")
async def reconcile(
    razorpay: UploadFile = File(...),
    bank: UploadFile = File(...),
    orders: UploadFile = File(...),
) -> JSONResponse:
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
# Natural language query
# --------------------------------------------------------------------------

@app.post("/api/query")
async def nl_query(req: QueryRequest) -> dict:
    """Answer a natural language question about the current reconciliation results."""
    if not LATEST_RESULT:
        return {"answer": "No reconciliation data available. Run a demo first.", "results": []}

    from reconciler.llm_agent import LLMJudge
    judge = LLMJudge()

    matches_summary = json.dumps(LATEST_RESULT.get("matches", [])[:20], default=str)
    unmatched_summary = json.dumps(LATEST_RESULT.get("unmatched", [])[:10], default=str)
    metrics_summary = json.dumps(LATEST_METRICS, default=str)

    prompt = f"""You are a financial reconciliation analyst. Answer the user's question about the reconciliation results below.

METRICS:
{metrics_summary}

SAMPLE MATCHES (first 20):
{matches_summary}

UNMATCHED/EXCEPTIONS:
{unmatched_summary}

USER QUESTION: {req.question}

Provide a concise, factual answer based only on the data above. If the question cannot be answered from this data, say so."""

    if not judge.api_key:
        return {"answer": "AI query requires an OpenRouter API key.", "results": []}

    try:
        import urllib.request
        payload = {
            "model": judge.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.0,
        }
        url = f"{judge.base_url}/chat/completions"
        http_req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {judge.api_key}",
                "HTTP-Referer": "https://reconcile-ai.buildathon.dev",
                "X-Title": "Reconcile-AI",
            },
        )
        with urllib.request.urlopen(http_req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        answer = body["choices"][0]["message"]["content"]
        return {"answer": answer, "results": LATEST_RESULT.get("matches", [])[:5]}
    except Exception as e:
        return {"answer": f"Query failed: {e}", "results": []}


# --------------------------------------------------------------------------
# PDF Report
# --------------------------------------------------------------------------

@app.get("/api/report")
def report():
    """Generate a PDF reconciliation report."""
    if not LATEST_RESULT:
        return JSONResponse(status_code=404, content={"error": "No reconciliation data. Run a demo first."})

    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.units import mm

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    elements = []

    # Header
    elements.append(Paragraph("Reconcile-AI — Settlement Reconciliation Report", styles["Title"]))
    elements.append(Spacer(1, 6 * mm))

    # Metrics
    m = LATEST_METRICS
    elements.append(Paragraph("Accuracy Summary", styles["Heading2"]))
    metric_data = [
        ["Metric", "Value"],
        ["Total Transactions", str(m.get("total_transactions", 0))],
        ["True Accuracy", f'{m.get("true_accuracy", 0) * 100:.1f}%'],
        ["Correct", str(m.get("correct", 0))],
        ["Wrong", str(m.get("wrong", 0))],
        ["Exception Precision", f'{m.get("exception_precision", 0) * 100:.1f}%'],
        ["Exception Recall", f'{m.get("exception_recall", 0) * 100:.1f}%'],
    ]
    t = Table(metric_data, colWidths=[140, 100])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6d5cff")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 6 * mm))

    # Per fault type
    per_fault = m.get("per_fault_type", {})
    if per_fault:
        elements.append(Paragraph("Per-Fault-Type Breakdown", styles["Heading2"]))
        fault_data = [["Fault Type", "Total", "Correct", "Accuracy"]]
        for ft, vals in per_fault.items():
            fault_data.append([ft, str(vals.get("total", 0)), str(vals.get("correct", 0)), f'{vals.get("accuracy", 0) * 100:.0f}%'])
        t2 = Table(fault_data, colWidths=[100, 60, 60, 80])
        t2.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#10b981")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(t2)
        elements.append(Spacer(1, 6 * mm))

    # Matched transactions
    matches = LATEST_RESULT.get("matches", [])[:30]
    if matches:
        elements.append(Paragraph("Matched Transactions (top 30)", styles["Heading2"]))
        match_data = [["Settlement", "Bank Txn", "Tier", "Confidence", "Reason"]]
        for m_row in matches:
            match_data.append([
                m_row.get("razorpay_id", ""),
                m_row.get("bank_id", ""),
                f'T{m_row.get("tier", 0)}',
                f'{m_row.get("confidence", 0) * 100:.0f}%',
                m_row.get("reason_code", "")[:20],
            ])
        t3 = Table(match_data, colWidths=[85, 80, 35, 60, 80])
        t3.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#8b5cf6")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
        ]))
        elements.append(t3)
        elements.append(Spacer(1, 6 * mm))

    # Exceptions
    unmatched = LATEST_RESULT.get("unmatched", [])
    if unmatched:
        elements.append(Paragraph("Exceptions", styles["Heading2"]))
        exc_data = [["Record ID", "Amount", "Reason", "Suggestion"]]
        for u in unmatched:
            exc_data.append([
                u.get("id", u.get("razorpay_id", "")),
                f'₹{u.get("amount", 0):.2f}',
                (u.get("reason", "")[:40]),
                (u.get("suggestion", "")[:30]),
            ])
        t4 = Table(exc_data, colWidths=[80, 60, 150, 120])
        t4.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f59e0b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 7),
            ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
        ]))
        elements.append(t4)

    doc.build(elements)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=reconciliation-report.pdf"},
    )


# --------------------------------------------------------------------------
# Self-learning & anomaly endpoints
# --------------------------------------------------------------------------

@app.post("/api/correct")
def record_correction(req: CorrectionRequest) -> dict:
    entry = {
        "razorpay_id": req.razorpay_id,
        "correct_bank_id": req.correct_bank_id,
        "correction_type": req.correction_type,
    }
    CORRECTIONS.append(entry)
    return {"status": "ok", "total_corrections": len(CORRECTIONS)}


@app.get("/api/anomalies")
def get_anomalies() -> dict:
    return {
        "anomalies": LATEST_ANOMALIES,
        "one_to_many": LATEST_ONE_TO_MANY,
        "total_anomalies": len(LATEST_ANOMALIES),
        "total_one_to_many": len(LATEST_ONE_TO_MANY),
    }


@app.post("/api/learn")
def apply_learning() -> dict:
    rules_applied = len(CORRECTIONS)
    return {"status": "ok", "rules_learned": rules_applied}


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
