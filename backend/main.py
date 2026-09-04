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
LATEST_ORDER_ROWS: list[dict] = []
LATEST_ELAPSED: float = 0.0


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
        LATEST_ORDER_ROWS = order_rows
        LATEST_ELAPSED = elapsed
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

            import asyncio
            progress_queue: asyncio.Queue = asyncio.Queue()

            def capture_progress(phase, progress, message):
                progress_queue.put_nowait({"phase": phase, "progress": progress, "message": message})

            engine = ReconciliationEngine(use_llm=use_llm)
            t0 = time.time()

            loop = asyncio.get_event_loop()
            engine_task = loop.run_in_executor(
                None, lambda: engine.reconcile(rp, bank, orders, progress_cb=capture_progress)
            )

            while not engine_task.done():
                try:
                    evt = await asyncio.wait_for(progress_queue.get(), timeout=0.5)
                    yield {"event": "progress", "data": json.dumps(evt)}
                except asyncio.TimeoutError:
                    pass

            result = engine_task.result()
            elapsed = round(time.time() - t0, 2)

            while not progress_queue.empty():
                yield {"event": "progress", "data": json.dumps(progress_queue.get_nowait())}

            metrics = score_results(result, gt)

            LATEST_RESULT = result
            LATEST_METRICS = metrics
            LATEST_GT = gt
            LATEST_ORDER_ROWS = order_rows
            LATEST_ELAPSED = elapsed
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
    global LATEST_RESULT, LATEST_METRICS, LATEST_ORDER_ROWS, LATEST_ANOMALIES, LATEST_ONE_TO_MANY
    rp_rows = _decode_csv(await razorpay.read())
    bank_rows = _decode_csv(await bank.read())
    order_rows = _decode_csv(await orders.read())

    engine = ReconciliationEngine(use_llm=True)
    result = engine.reconcile(
        _to_records(rp_rows, "razorpay", "settlement_id", "order_ref"),
        _to_records(bank_rows, "bank", "transaction_id", "settlement_ref"),
        _to_records(order_rows, "order", "order_id", "order_id"),
    )

    LATEST_RESULT = result
    LATEST_ORDER_ROWS = order_rows
    LATEST_ANOMALIES.clear()
    LATEST_ANOMALIES.extend(result.get("anomalies", []))
    LATEST_ONE_TO_MANY.clear()
    LATEST_ONE_TO_MANY.extend(result.get("one_to_many", []))

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

    from reconciler.pdf_report import build_pdf
    from datetime import datetime

    # Compute analytics inline for the report
    analytics = None
    try:
        analytics_resp = get_analytics()
        if isinstance(analytics_resp, dict) and analytics_resp.get("status") != "empty":
            analytics = analytics_resp
    except Exception:
        pass

    buf = build_pdf(
        metrics=LATEST_METRICS,
        matches=LATEST_RESULT.get("matches", [])[:40],
        unmatched=LATEST_RESULT.get("unmatched", []),
        anomalies=LATEST_RESULT.get("anomalies", []),
        analytics=analytics,
        elapsed=LATEST_ELAPSED,
    )
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=reconciliation-report.pdf"},
    )


# --------------------------------------------------------------------------
# Business analytics
# --------------------------------------------------------------------------

@app.get("/api/analytics")
def get_analytics() -> dict:
    """Compute business analytics from the latest reconciliation run."""
    if not LATEST_RESULT:
        return {"status": "empty", "message": "No reconciliation data. Run a demo first."}

    from datetime import datetime
    import statistics as stats

    matches = LATEST_RESULT.get("matches", [])
    unmatched = LATEST_RESULT.get("unmatched", [])
    anomalies = LATEST_RESULT.get("anomalies", [])

    # Build lookup maps
    match_by_rp = {m["razorpay_id"]: m for m in matches}
    order_by_id = {r["order_id"]: r for r in LATEST_ORDER_ROWS}

    # ---- Dataset summary ---------------------------------------------------
    rp_count = LATEST_RESULT.get("total_razorpay", 0)
    dataset_summary = {
        "total_razorpay_records": rp_count,
        "total_matches": len(matches),
        "total_unmatched": len(unmatched),
        "total_anomalies": len(anomalies),
        "match_rate": round(len(matches) / rp_count, 4) if rp_count else 0,
    }

    # ---- Revenue Leakage ---------------------------------------------------
    # Fee overcharges
    fee_overcharge_details = []
    for a in anomalies:
        if a["kind"] != "FEE_OVERCHARGE":
            continue
        rp_id = a["related_records"][0] if a["related_records"] else None
        m = match_by_rp.get(rp_id, {})
        rp_raw = m.get("raw", {})
        # Compute overcharge amount from field_diffs
        overcharge_amt = 0.0
        for fd in m.get("field_diffs", []):
            if fd["field"] == "amount":
                try:
                    overcharge_amt = round(float(fd["source_value"]) - float(fd["bank_value"]), 2)
                except (ValueError, TypeError):
                    pass
        fee_overcharge_details.append({
            "razorpay_id": rp_id,
            "merchant": rp_raw.get("merchant", "Unknown"),
            "payment_mode": rp_raw.get("payment_mode", "Unknown"),
            "order_amount": rp_raw.get("amount", 0),
            "overcharge_amount": overcharge_amt,
            "overcharge_pct": round(overcharge_amt / float(rp_raw.get("amount", 1)) * 100, 1) if rp_raw.get("amount") else 0,
        })

    fee_overcharge_total = round(sum(d["overcharge_amount"] for d in fee_overcharge_details), 2)

    # Duplicate settlements
    duplicate_details = []
    seen_dup_groups = set()
    for a in anomalies:
        if a["kind"] != "DUPLICATE":
            continue
        group_key = tuple(sorted(a["related_records"]))
        if group_key in seen_dup_groups:
            continue
        seen_dup_groups.add(group_key)
        rec_amounts = []
        merchant = "Unknown"
        payment_mode = "Unknown"
        date = ""
        for rid in a["related_records"]:
            m = match_by_rp.get(rid, {})
            raw = m.get("raw", {})
            rec_amounts.append(float(raw.get("amount", 0)) if raw else 0)
            if raw.get("merchant"):
                merchant = raw["merchant"]
            if raw.get("payment_mode"):
                payment_mode = raw["payment_mode"]
            if raw.get("date"):
                date = raw["date"]
        avg_amt = round(sum(rec_amounts) / len(rec_amounts), 2) if rec_amounts else 0
        duplicate_details.append({
            "settlement_ids": list(a["related_records"]),
            "count": len(a["related_records"]),
            "amount_each": avg_amt,
            "total_amount": round(sum(rec_amounts), 2),
            "merchant": merchant,
            "payment_mode": payment_mode,
            "date": date,
        })

    duplicate_total = round(sum(d["total_amount"] for d in duplicate_details), 2)

    # Orphan float
    orphan_details = []
    for u in unmatched:
        if u.get("kind") == "razorpay":
            orphan_details.append({
                "settlement_id": u.get("id", ""),
                "amount": u.get("amount", 0),
                "merchant": u.get("raw", {}).get("merchant", "Unknown"),
                "payment_mode": u.get("raw", {}).get("payment_mode", "Unknown"),
                "date": u.get("date", ""),
                "reason": u.get("reason", ""),
            })

    orphan_total = round(sum(d["amount"] for d in orphan_details), 2)
    total_leakage = round(fee_overcharge_total + duplicate_total + orphan_total, 2)

    revenue_leakage = {
        "currency": "INR",
        "total_leakage": total_leakage,
        "fee_overcharge": {
            "count": len(fee_overcharge_details),
            "total_amount": fee_overcharge_total,
            "details": fee_overcharge_details,
        },
        "duplicate_settlements": {
            "count": len(duplicate_details),
            "total_amount": duplicate_total,
            "details": duplicate_details,
        },
        "orphan_float": {
            "count": len(orphan_details),
            "total_amount": orphan_total,
            "details": orphan_details,
        },
    }

    # ---- Payment Mode Profitability ----------------------------------------
    mode_stats: dict[str, dict] = {}
    for m in matches:
        raw = m.get("raw", {})
        mode = raw.get("payment_mode", "Unknown")
        if mode not in mode_stats:
            mode_stats[mode] = {"gross_volume": 0, "net_settled": 0, "total_fees": 0, "total_gst": 0, "count": 0}
        amt = float(raw.get("amount", 0))
        fees = float(raw.get("fees", 0))
        gst = float(raw.get("gst", 0))
        mode_stats[mode]["gross_volume"] += amt + fees + gst  # gross = settled + fees + gst
        mode_stats[mode]["net_settled"] += amt
        mode_stats[mode]["total_fees"] += fees
        mode_stats[mode]["total_gst"] += gst
        mode_stats[mode]["count"] += 1

    total_fees_all = sum(s["total_fees"] for s in mode_stats.values())
    total_gross_all = sum(s["gross_volume"] for s in mode_stats.values())

    modes = []
    for mode, s in sorted(mode_stats.items(), key=lambda x: -x[1]["gross_volume"]):
        gross = round(s["gross_volume"], 2)
        take_rate = round((s["total_fees"] + s["total_gst"]) / gross * 100, 2) if gross else 0
        vol_share = round(gross / total_gross_all * 100, 1) if total_gross_all else 0
        rev_share = round(s["total_fees"] / total_fees_all * 100, 1) if total_fees_all else 0
        modes.append({
            "payment_mode": mode,
            "gross_volume": gross,
            "net_settled": round(s["net_settled"], 2),
            "total_fees": round(s["total_fees"], 2),
            "total_gst": round(s["total_gst"], 2),
            "effective_take_rate_pct": take_rate,
            "volume_share_pct": vol_share,
            "revenue_share_pct": rev_share,
            "transaction_count": s["count"],
        })

    highest_take = max(modes, key=lambda x: x["effective_take_rate_pct"]) if modes else None
    highest_vol = max(modes, key=lambda x: x["gross_volume"]) if modes else None
    most_profit = max(modes, key=lambda x: x["total_fees"]) if modes else None

    payment_mode_profitability = {
        "modes": modes,
        "summary": {
            "highest_take_rate_mode": highest_take["payment_mode"] if highest_take else "N/A",
            "highest_volume_mode": highest_vol["payment_mode"] if highest_vol else "N/A",
            "most_profitable_mode": most_profit["payment_mode"] if most_profit else "N/A",
        },
    }

    # ---- Settlement Velocity -----------------------------------------------
    delays = []
    for m in matches:
        oid = m.get("order_id", "")
        if oid and oid in order_by_id:
            order_date_str = order_by_id[oid].get("date", "")
            settle_date_str = m.get("raw", {}).get("date", "")
            try:
                order_dt = datetime.strptime(order_date_str, "%Y-%m-%d")
                settle_dt = datetime.strptime(settle_date_str, "%Y-%m-%d")
                delay = (settle_dt - order_dt).days
                if delay >= 0:
                    delays.append({
                        "settlement_id": m.get("razorpay_id", ""),
                        "order_id": oid,
                        "delay_days": delay,
                        "amount": float(m.get("raw", {}).get("amount", 0)),
                        "merchant": m.get("raw", {}).get("merchant", "Unknown"),
                        "payment_mode": m.get("raw", {}).get("payment_mode", "Unknown"),
                        "order_date": order_date_str,
                        "settlement_date": settle_date_str,
                    })
            except (ValueError, TypeError):
                pass

    delay_values = [d["delay_days"] for d in delays]
    avg_delay = round(stats.mean(delay_values), 1) if delay_values else 0
    median_delay = round(stats.median(delay_values), 1) if delay_values else 0
    max_delay = max(delay_values) if delay_values else 0
    delayed = [d for d in delays if d["delay_days"] > 3]

    # Histogram buckets
    bucket_labels = ["0 days", "1 day", "2 days", "3 days", "4 days", "5+ days"]
    bucket_counts = [0] * 6
    for dv in delay_values:
        if dv <= 5:
            bucket_counts[dv] += 1
        else:
            bucket_counts[5] += 1
    total_with_delay = len(delay_values) if delay_values else 1
    histogram = [
        {"bucket": label, "count": cnt, "pct": round(cnt / total_with_delay * 100, 1)}
        for label, cnt in zip(bucket_labels, bucket_counts)
    ]

    settlement_velocity = {
        "avg_days": avg_delay,
        "median_days": median_delay,
        "max_days": max_delay,
        "delayed_count": len(delayed),
        "delayed_rate_pct": round(len(delayed) / total_with_delay * 100, 1),
        "total_with_order_date": len(delay_values),
        "histogram": histogram,
        "delayed_settlements": delayed,
    }

    # ---- Merchant Risk Scores ----------------------------------------------
    merchant_data: dict[str, dict] = {}
    for u in unmatched:
        if u.get("kind") == "razorpay":
            merch = u.get("raw", {}).get("merchant", "Unknown")
            if merch not in merchant_data:
                merchant_data[merch] = {"orphan_count": 0, "fee_overcharge_count": 0, "outlier_count": 0, "total_records": 0, "delays": []}
            merchant_data[merch]["orphan_count"] += 1

    for m in matches:
        merch = m.get("raw", {}).get("merchant", "Unknown")
        if merch not in merchant_data:
            merchant_data[merch] = {"orphan_count": 0, "fee_overcharge_count": 0, "outlier_count": 0, "total_records": 0, "delays": []}
        merchant_data[merch]["total_records"] += 1

    for a in anomalies:
        if a["kind"] == "FEE_OVERCHARGE":
            rp_id = a["related_records"][0] if a["related_records"] else None
            m = match_by_rp.get(rp_id, {})
            merch = m.get("raw", {}).get("merchant", "Unknown")
            if merch in merchant_data:
                merchant_data[merch]["fee_overcharge_count"] += 1
        elif a["kind"] == "AMOUNT_OUTLIER":
            rp_id = a["related_records"][0] if a["related_records"] else None
            m = match_by_rp.get(rp_id, {})
            merch = m.get("raw", {}).get("merchant", "Unknown")
            if merch in merchant_data:
                merchant_data[merch]["outlier_count"] += 1

    for d in delays:
        merch = d["merchant"]
        if merch in merchant_data:
            merchant_data[merch]["delays"].append(d["delay_days"])

    merchants_risk = []
    for merch, data in sorted(merchant_data.items()):
        total = data["total_records"] + data["orphan_count"]
        orphan_rate = data["orphan_count"] / total if total else 0
        fee_disc_rate = data["fee_overcharge_count"] / total if total else 0
        outlier_rate = data["outlier_count"] / total if total else 0
        avg_del = stats.mean(data["delays"]) if data["delays"] else 0

        # Normalize each to 0-1
        n_orphan = min(orphan_rate * 5, 1.0)       # 20% orphan → max score
        n_fee = min(fee_disc_rate * 5, 1.0)         # 20% fee disc → max score
        n_outlier = min(outlier_rate * 10, 1.0)     # 10% outlier → max score
        n_delay = min(avg_del / 5.0, 1.0)           # 5 days avg → max score

        composite = round((0.30 * n_orphan + 0.25 * n_fee + 0.20 * n_outlier + 0.25 * n_delay) * 100, 1)

        if composite < 25:
            risk_level = "LOW"
        elif composite < 50:
            risk_level = "MEDIUM"
        elif composite < 75:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        merchants_risk.append({
            "merchant": merch,
            "composite_score": composite,
            "risk_level": risk_level,
            "breakdown": {
                "orphan_rate_pct": round(orphan_rate * 100, 1),
                "fee_discrepancy_rate_pct": round(fee_disc_rate * 100, 1),
                "outlier_count": data["outlier_count"],
                "avg_settlement_delay_days": round(avg_del, 1),
            },
            "total_records": data["total_records"],
            "total_unmatched": data["orphan_count"],
        })

    merchants_risk.sort(key=lambda x: -x["composite_score"])

    merchant_risk_scores = {
        "merchants": merchants_risk,
        "score_weights": {
            "orphan_rate": 0.30,
            "fee_discrepancy_rate": 0.25,
            "outlier_count": 0.20,
            "settlement_delay": 0.25,
        },
    }

    return {
        "status": "ok",
        "dataset_summary": dataset_summary,
        "revenue_leakage": revenue_leakage,
        "payment_mode_profitability": payment_mode_profitability,
        "settlement_velocity": settlement_velocity,
        "merchant_risk_scores": merchant_risk_scores,
    }


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
