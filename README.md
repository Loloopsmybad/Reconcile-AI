<p align="center">
  <img src="https://img.shields.io/badge/Reconcile--AI-v1.0-6D5CFF?style=for-the-badge&labelColor=0F0F12" alt="Reconcile-AI" />
  <img src="https://img.shields.io/badge/Razorpay%20Buildathon-Track%204-000000?style=for-the-badge&labelColor=0F0F12" alt="Track 4" />
  <img src="https://img.shields.io/badge/Status-100%25%20Accuracy-10B981?style=for-the-badge&labelColor=0F0F12" alt="100% Accuracy" />
</p>

<br/>

<div align="center">

# Reconcile-AI

### The AI Settlement Reconciliation Agent

*Reconcile hundreds of financial records across systems in seconds — with measured accuracy and an honest exception report.*

<br/>

![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-06B6D4?logo=tailwindcss)
![anime.js](https://img.shields.io/badge/anime.js-4-blue)

</div>

---

## The Problem

> *"Reconciliation, settlement and forecasting are **still done by hand**."*
> — Razorpay AI Buildathon, Track 4: AI Finance Controller

When a customer pays on a Razorpay-powered store, **three independent systems** record the same event:

| System | Records | Example |
|--------|---------|---------|
| **Razorpay** | Settlement with fee deduction | `₹490 settled, fee ₹10` |
| **Bank** | Credit received (T+1) | `₹490 on next day` |
| **Orders** | Gross amount collected | `₹500 collected` |

A finance analyst reconciles these **manually in Excel** for hours — matching records, chasing fee gaps, explaining mismatches. For a growing business with hundreds of transactions a day, that's a **full-time job** built on copy-paste and guesswork.

**Reconcile-AI turns that job into a two-minute, measurable, explainable automated workflow.**

---

## The Solution

Reconcile-AI ingests three raw CSVs and runs a **three-tier reconciliation agent**:

1. **Auto-matches** records across Razorpay, bank, and order systems
2. **Measures accuracy** against a known ground truth
3. **Flags honest exceptions** with a clear reason and suggested action

### Three Matching Tiers

| Tier | Name | What it does | Speed |
|------|------|-------------|-------|
| 1 | **Exact** | Matches on precise settlement reference + amount + date | Instant |
| 2 | **Fuzzy** | Matches on amount tolerance, T+1 date window, reference similarity | Instant |
| 3 | **AI** | An LLM reasons through fee gaps and ambiguous edge cases | ~seconds |

The rules engine is **deterministic** — every result is reproducible. The AI tier is invoked **only** on records the rules can't resolve, so it never guesses when a deterministic answer exists.

---

## Measured Results

Run against a synthetic dataset of **60 transactions** with a known ground truth:

| Metric | Result |
|--------|--------|
| **True accuracy** | **100%** (60/60 correct) |
| **Match coverage** | 56 matched · 4 exceptions |
| **Exception precision** | 100% |
| **Exception recall** | 100% |

Breakdown by fault type:

| Fault type | Total | Correct | Accuracy |
|------------|-------|---------|----------|
| Exact | 45 | 45 | 100% |
| Fee deduction | 2 | 2 | 100% |
| T+1 settlement lag | 5 | 5 | 100% |
| Reference difference | 4 | 4 | 100% |
| Orphan / pending | 4 | 4 | 100% |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                Frontend (React + Vite)                   │
│     Watermelon UI–style fintech dark dashboard          │
│     anime.js animations · Recharts visualizations       │
│     SSE streaming · real-time progress                  │
└────────────────────────┬────────────────────────────────┘
                         │  REST API (proxied /api)
┌────────────────────────▼────────────────────────────────┐
│               Backend (FastAPI)                          │
│                                                          │
│  ┌──────────────┐   ┌──────────────────────────────┐    │
│  │  Data Loader │   │     Reconciliation Engine     │    │
│  │  (CSV/JSON)  │──▶│   Tier 1 · Exact (instant)   │    │
│  └──────────────┘   │   Tier 2 · Fuzzy (instant)   │    │
│                     │   Tier 3 · AI (LLM, on-demand)│    │
│                     └──────────────┬─────────────────┘    │
│                     ┌──────────────▼─────────────────┐    │
│                     │  Evaluator (accuracy scoring)  │    │
│                     └────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │          Synthetic Data Generator                 │    │
│  │    60 transactions · 3 sources · ground truth     │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

---

## How It Works

### End-to-End Flow

```
User clicks "Run Demo Data"
        │
        ▼
GET /api/demo ──────────────────▶  FastAPI backend
        │                               │
        │                   ┌───────────▼───────────┐
        │                   │ 1. Data Generator     │  ← 60 synthetic records
        │                   │    + ground_truth.json│     (every answer known)
        │                   └───────────┬───────────┘
        │                               ▼
        │                   ┌───────────────────────┐
        │                   │ 2. Reconciliation     │
        │                   │    Engine             │
        │                   │   Tier 1 · Exact      │
        │                   │   Tier 2 · Fuzzy      │
        │                   │   Tier 3 · AI (LLM)   │
        │                   └───────────┬───────────┘
        │                               ▼
        │                   ┌───────────────────────┐
        │                   │ 3. Evaluator          │  ← score against truth
        │                   │    accuracy · precision│
        │                   │    · recall · metrics  │
        │                   └───────────┬───────────┘
        │                               ▼
        │                 { matches, exceptions, metrics }
        ▼
React dashboard animates results (anime.js)
```

### 1. Synthetic Data Generator

`backend/data/generator.py` creates 60 base transactions and writes **three CSVs** (Razorpay settlements, bank statements, orders) plus a `ground_truth.json` that records the *correct* result for every settlement. This gives us a **known answer key** to score against.

It deliberately injects **5 fault types** so the engine is genuinely tested:

| Fault type | What's injected | Why it's hard |
|------------|----------------|---------------|
| `exact` | All fields agree | Trivial — Tier 1 handles it |
| `fee` | Settled amount = gross − fee (₹<2.50 gap) | Amounts differ, but the gap is explainable |
| `tplus1` | Bank/razorpay date = order date + 1 day | Date mismatch, needs window logic |
| `ref_diff` | Reference IDs differ in case/format (`ORD` vs `OR`) | IDs not identical, needs fuzzy similarity |
| `orphan` | Settlement exists but no bank credit | Genuine exception — must be surfaced, not force-matched |

### 2. Three-Tier Matching Engine

Each Razorpay settlement is matched to a bank credit. The engine escalates only when it has to:

**Tier 1 — Exact match (instant, deterministic)**
- Settlement reference equals bank credit's `settlement_ref`
- Amount identical (≤ ₹0.005)
- Date identical
- Confidence = **1.0**

**Tier 2 — Fuzzy match (instant, deterministic)**
Applies tolerance when IDs aren't byte-identical:
- Amount difference **≤ ₹1.00** (absorbs rounding)
- Date difference **≤ 1 day** (covers T+1 settlement lag)
- Reference similarity **≥ 0.80** (Levenshtein-style via `difflib`)
- Confidence = 0.85–0.95 (scaled by reference similarity)

**Tier 3 — AI match (LLM, only on leftovers)**
Records that pass neither tier are handed to the LLM. The prompt frames it from the mindset of a payments analyst:

> *"You are a senior payments reconciliation analyst… settlements may land T+1… Razorpay takes a fee… references may differ in case/format… Return JSON decisions."*

The LLM reasons about **fee gaps**, **ambiguous near-matches**, and **true orphans**, returning `{ bank_id | null, confidence, reason_code, field_diffs }` for each. It's only called when rules can't resolve, so it never overrides a deterministic answer.

> **No API key?** The `RuleBasedJudge` fallback reproduces the expected conclusions so the demo runs **fully offline** with identical output.
>
> **With API key?** Uses OpenRouter's free `nvidia/nemotron-3.5-lightning:free` model — no billing required.

### 3. Evaluator

Scores the engine's output against `ground_truth.json` and reports:
- **True accuracy** — % of settlements correctly classified
- **Per-fault-type accuracy** — performance on each fault type
- **Exception precision** — of exceptions reported, how many were real
- **Exception recall** — of true exceptions, how many it caught

---

## Quick Start

> **You'll need two terminals open** — one for the backend, one for the frontend.

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.10+

### One-liner setup

```bash
# Terminal 1 — Backend
cd backend && python -m venv .venv && source .venv/bin/activate \
  && pip install -r requirements.txt && uvicorn main:app --port 8000

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```

### Step-by-step

**1. Start the backend (Terminal 1)**

```bash
cd backend
python -m venv .venv                # create virtual environment
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements.txt     # install dependencies
uvicorn main:app --port 8000        # start API → http://localhost:8000
```

You should see `Uvicorn running on http://127.0.0.1:8000`.

> Optional: set `OPENROUTER_API_KEY` or place your key in `~/api_key.txt` to enable the AI tier via OpenRouter (free).
> Without a key, a built-in rule-based judge handles exceptions so the demo runs **fully offline**.

**2. Start the frontend (Terminal 2)**

```bash
cd frontend
npm install              # only the first time
npm run dev              # start dashboard → http://localhost:5173
```

**3. Open http://localhost:5173 in your browser**

The dev server proxies `/api` to the backend automatically, so no extra config.

### Try it

- Click **"Run Demo Data"** → generates 60 synthetic transactions and reconciles them instantly with metrics.
- Or upload your own `razorpay_settlements.csv`, `bank_statements.csv`, and `orders.csv`, then click **"Run Reconciliation"**.

> **Tip:** sample CSVs are generated into `data/synthetic/` the first time you hit the demo endpoint — you can re-upload those as a custom run.

### Quick sanity check (no browser needed)

```bash
# Backend running?
curl http://localhost:8000/api/health        # → {"status":"ok",...}
curl "http://localhost:8000/api/demo"        # → reconciliation metrics
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/demo?use_llm=true` | Regenerate synthetic data, reconcile, and return metrics |
| `POST` | `/api/reconcile` | Upload 3 CSVs (`razorpay`, `bank`, `orders` multipart files) and reconcile |
| `GET` | `/api/report` | Download PDF reconciliation report |
| `POST` | `/api/query` | Natural language query about reconciliation data |
| `GET` | `/api/analytics` | Business intelligence analytics |

### Sample `/api/demo` response

```json
{
  "metrics": {
    "total_transactions": 60,
    "true_accuracy": 1.0,
    "correct": 60,
    "wrong": 0,
    "reported_unmatched": 4,
    "exception_precision": 1.0,
    "exception_recall": 1.0,
    "per_fault_type": {
      "exact": { "total": 45, "correct": 45, "accuracy": 1.0 },
      "fee": { "total": 2, "correct": 2, "accuracy": 1.0 },
      "tplus1": { "total": 5, "correct": 5, "accuracy": 1.0 },
      "ref_diff": { "total": 4, "correct": 4, "accuracy": 1.0 },
      "orphan": { "total": 4, "correct": 4, "accuracy": 1.0 }
    }
  },
  "sample_matches": [
    {
      "razorpay_id": "STL3341057",
      "bank_id": "TXN9928103",
      "tier": 1,
      "confidence": 1.0,
      "reason_code": "exact_match"
    }
  ],
  "sample_unmatched": [
    {
      "id": "STL1045678",
      "amount": 2450.00,
      "reason_code": "orphan_settlement",
      "suggestion": "Settled but no bank credit found — check for delayed settlement or reversal"
    }
  ]
}
```

---

## Project Structure

```
reconcile-ai/
├── backend/
│   ├── main.py                     # FastAPI app (health, demo, reconcile, report, query, analytics)
│   ├── data/
│   │   └── generator.py            # Synthetic data generator + ground truth
│   ├── reconciler/
│   │   ├── engine.py               # Three-tier matching engine with SSE streaming
│   │   ├── llm_agent.py            # LLM judge (+ rule-based fallback)
│   │   ├── evaluator.py            # Accuracy & exception metrics
│   │   ├── models.py               # Shared data models (SourceRecord, MatchCandidate, etc.)
│   │   └── pdf_report.py           # PDF report generator (ReportLab)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.tsx                 # Main layout & state management
│       ├── components/
│       │   ├── Hero.tsx            # Landing hero with CTA buttons
│       │   ├── Charts.tsx          # Recharts area, donut, bar, histogram
│       │   ├── MatchTable.tsx      # Expandable matched transactions
│       │   ├── ExceptionTable.tsx  # Expandable honest exceptions
│       │   ├── UploadCard.tsx      # CSV upload with progress bar
│       │   ├── MetricCard.tsx      # Animated metric display
│       │   ├── QueryChat.tsx       # AI natural language chat
│       │   └── ui.tsx              # Watermelon UI design system
│       └── lib/
│           ├── api.ts              # API client with SSE + cache-busting
│           ├── types.ts            # TypeScript interfaces
│           └── anim.ts             # anime.js v4 animations
├── test-data/                      # Sample CSVs + ground truth
└── data/synthetic/                 # Generated CSVs + ground_truth.json
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Backend** | FastAPI | Async Python, auto-docs, SSE support |
| **Matching** | Python stdlib + difflib | Zero-dependency deterministic rules |
| **LLM** | OpenRouter (nvidia/nemotron-3.5-lightning:free) | Free, no billing, JSON output |
| **PDF** | ReportLab | Pure Python, no system dependencies |
| **Frontend** | React 19 + Vite | Fast dev, HMR, proxy config |
| **Styling** | Tailwind CSS v4 | Utility-first, Watermelon UI tokens |
| **Animations** | anime.js v4 | GPU-accelerated, timeline control |
| **Charts** | Recharts | React-native chart components |
| **Data** | Synthetic generator | Scalable, reproducible, known ground truth |

---

## Key Design Decisions

### Why rules first, AI second?

The LLM is a **surgical tool** for the 4 hard records, not a hammer for all 60. Rules handle 56/60 transactions deterministically — costing nothing, taking zero latency, and producing reproducible results. The AI tier is invoked only when the rules can't resolve, ensuring:

- **Cost**: ~$0 per demo run (free tier LLM)
- **Speed**: 56/60 resolved in <100ms; 4 AI calls take ~2s total
- **Reproducibility**: deterministic rules + known ground truth = measurable accuracy
- **Scale**: adding new fault types means adding new rules, not retraining

### Why measure accuracy?

The buildathon grades on "throughput + measured accuracy + honest exception list." By scoring against a known ground truth, we prove the engine works — not just that it runs. The exception list isn't a bug; it's the feature. Every unresolved record has a reason code and suggested action.

---

## Why This Wins Track 4

- **Fully self-contained** — works end-to-end offline with generated data; no external merchant APIs required
- **Measurable & honest** — accuracy, precision, and recall reported transparently against a known ground truth
- **Solves a real pain point** — reconciliation is *still done by hand* at most companies
- **Transparent scoring** — you know exactly what's being graded: throughput + measured accuracy + honest exceptions
- **Production-ready architecture** — SSE streaming, upload flow, PDF reports, natural language queries, business analytics

---

<div align="center">

**Built for the Razorpay AI Buildathon · Track 4 — AI Finance Controller**

[![GitHub](https://img.shields.io/badge/View_on_GitHub-181717?logo=github)](https://github.com/Loloopsmybad/Reconcile-AI)

</div>
