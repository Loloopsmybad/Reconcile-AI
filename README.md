<p align="center">
  <img src="https://img.shields.io/badge/Buildathon-Razorpay%20AI-000000?style=for-the-badge" alt="Razorpay AI Buildathon" />
  <img src="https://img.shields.io/badge/Track-4%20Finance%20Controller-blue?style=for-the-badge" alt="Track 4 Finance Controller" />
  <img src="https://img.shields.io/badge/Stack-React%20%7C%20FastAPI%20%7C%20anime.js-brightgreen?style=for-the-badge" alt="Stack" />
</p>

<div align="center">

# 🏛️ Reconcile-AI

### The AI Settlement Reconciliation Agent

*Reconcile hundreds of financial records across systems in seconds — with a measured accuracy and an honest exception report.*

</div>

---

## 🧠 The Problem

> *"Reconciliation, settlement and forecasting are **still done by hand**."*
>
> — Razorpay AI Buildathon, Track 4: AI Finance Controller

When a customer pays on a Razorpay-powered store, **three independent systems** record the same event:

| System | Records | Example |
|---|---|---|
| **Razorpay** | Settlement with fee deduction | `₹490 settled, fee ₹10` |
| **Bank** | Credit received (T+1) | `₹490 on next day` |
| **Orders** | Gross amount collected | `₹500 collected` |

A finance analyst reconciles these **manually in Excel** for hours — matching records, chasing fee gaps, explaining mismatches. For a growing business with hundreds of transactions a day, that's a **full-time job** built on copy-paste and guesswork.

**Reconcile-AI turns that job into a two-minute, measurable, explainable automated workflow.**

---

## 🎯 The Solution

Reconcile-AI ingests the three raw CSVs and runs a **three-tier reconciliation agent** that:

1. ✅ **Auto-matches** records across Razorpay, bank, and order systems
2. 📐 **Measures accuracy** against a known ground truth
3. 🚩 **Flags honest exceptions** with a clear reason and suggested action for every unresolved record

### The three matching tiers

| Tier | Name | What it does | Speed |
|---|---|---|---|
| 1 | **Exact** | Matches on precise settlement reference + amount + date | Instant |
| 2 | **Fuzzy** | Matches on amount tolerance, T+1 date window, reference similarity | Instant |
| 3 | **AI** | An LLM reasons through fee gaps and ambiguous edge cases | ~seconds |

The rules engine is **deterministic** — every result is reproducible. The AI tier is invoked **only** on the records the rules can't resolve, so it never guesses when a deterministic answer exists.

---

## 📊 Measured Results

Run against a synthetic dataset of **60 transactions** with a known ground truth:

| Metric | Result |
|---|---|
| **True accuracy** | **100%** (60/60 correct) |
| **Match coverage** | 56 matched · 4 exceptions |
| **Exception precision** | 100% |
| **Exception recall** | 100% |

Breakdown by fault type:

| Fault type | Total | Correct | Accuracy |
|---|---|---|---|
| Exact | 45 | 45 | 100% |
| Fee deduction | 2 | 2 | 100% |
| T+1 settlement lag | 5 | 5 | 100% |
| Reference difference | 4 | 4 | 100% |
| Orphan / pending | 4 | 4 | 100% |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────┐
│               Frontend (React + Vite)           │
│    Watermelon UI–style fintech dark dashboard   │
│    anime.js animations · Recharts visualizations│
└──────────────────────┬─────────────────────────┘
                       │  REST API (proxied /api)
┌──────────────────────▼─────────────────────────┐
│             Backend (FastAPI)                   │
│                                                 │
│  ┌─────────────┐   ┌────────────────────────┐   │
│  │ Data Loader │   │   ReconciliationEngine │   │
│  │ (CSV/JSON)  │──▶│  Tier 1 · Exact        │   │
│  └─────────────┘   │  Tier 2 · Fuzzy        │   │
│                    │  Tier 3 · AI (LLM)     │   │
│                    └───────────┬────────────┘   │
│                    ┌───────────▼────────────┐   │
│                    │  Evaluator (metrics)   │   │
│                    └────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │        Synthetic Data Generator         │    │
│  │  (60 txn · 3 sources · ground truth)    │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---
## 🚀 Quick Start

> **You'll need two terminals open** — one for the backend, one for the frontend.

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.10+

### One-liner setup (from the repo root)

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

> Optional: set `GEMINI_API_KEY` (or `OPENAI_API_KEY`) to enable the AI tier.
> Without a key, a built-in rule-based judge handles exceptions so the demo
> runs **fully offline**.

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
- Or upload your own `razorpay_settlements.csv`, `bank_statements.csv`, and `orders.csv`,
  then click **"Run Reconciliation"**.

> **Tip:** sample CSVs are generated into `data/synthetic/` the first time you
> hit the demo endpoint — you can re-upload those as a custom run.

### Quick sanity check (no browser needed)

```bash
# Backend running?
curl http://localhost:8000/api/health        # → {"status":"ok",...}
curl "http://localhost:8000/api/demo"        # → reconciliation metrics
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/demo?use_llm=true` | Regenerate synthetic data, reconcile, and return metrics |
| `POST` | `/api/reconcile` | Upload 3 CSVs (`razorpay`, `bank`, `orders` multipart files) and reconcile |

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
      "exact": { "total": 45, "correct": 45, "accuracy": 1.0 }
    }
  },
  "sample_matches": [ { "razorpay_id": "STL3341057", "tier": 1, "confidence": 1.0 } ],
  "sample_unmatched": [ { "id": "STL1045678", "reason": "pending settlement" } ]
}
```

---

## 🗂️ Project Structure

```
reconcile-ai/
├── backend/
│   ├── main.py                 # FastAPI app (health, demo, reconcile)
│   ├── data/
│   │   └── generator.py        # Synthetic data generator + ground truth
│   ├── reconciler/
│   │   ├── engine.py           # Three-tier matching engine
│   │   ├── llm_agent.py        # LLM judge (+ rule-based fallback)
│   │   ├── evaluator.py        # Accuracy & exception metrics
│   │   └── models.py           # Shared data models
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.tsx             # Main layout & state
│       ├── components/         # StatCard, Charts, Upload, Tables
│       └── lib/                # API client, types, anime.js utils
└── data/
    └── synthetic/              # Generated CSVs + ground_truth.json
```

---

## 🧰 Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/anime.js-4-blue" alt="anime.js" />
  <img src="https://img.shields.io/badge/Recharts-Charts-orange" alt="Recharts" />
</p>

---

## ✨ Why this wins Track 4

- **Fully self-contained** — works end-to-end offline with generated data; no external merchant APIs required.
- **Measurable & honest** — accuracy, precision, and recall reported transparently against a known ground truth. The exception list isn't hidden; it's the feature.
- **Solves a real Razorpay pain point** — reconciliation is *still done by hand*.
- **Transparent scoring** — you know exactly what's being graded: throughput + measured accuracy + honest exceptions.

---

<div align="center">

**Built for the Razorpay AI Buildathon · Track 4 — AI Finance Controller**

*Hand-crafted with ❤️ by the Reconcile-AI team*

</div>
