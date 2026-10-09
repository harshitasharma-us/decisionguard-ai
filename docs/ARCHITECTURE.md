# DecisionGuard AI — Architecture

## Overview
**DecisionGuard AI** is a self-challenging stock reorder assistant designed to prevent overconfident AI mistakes in supply chain and inventory decision-making.

Instead of accepting a single-pass recommendation, the system triggers an autonomous self-challenge loop that surfaces counter-arguments, checks missing inventory constraints, and benchmarks alternative reorder quantities before presenting a final decision recommendation to human managers.

```
┌────────────────────────────────────────────────────────┐
│                   Frontend (React + Vite)              │
│  - Inventory Dashboard & Recharts Stock History        │
│  - Single-Pass vs Self-Challenged Comparison Panel     │
│  - Confidence Delta & Agreement Status Badges          │
│  - Human-in-the-Loop Override / Approval Actions       │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / REST
┌──────────────────────────▼─────────────────────────────┐
│                 Backend (FastAPI Engine)               │
│  - /health (System status)                             │
│  - /api/inventory (Synthetic SKU datasets)             │
│  - /api/reorder/evaluate (Self-challenging pipeline)   │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                   AI Provider Layer                    │
│  - Configurable LLM Driver (OpenAI / Gemini / Mock)    │
│  - Pass 1: Initial Reorder Proposal                    │
│  - Pass 2: Self-Challenge (Debate & Blindspots)        │
│  - Pass 3: Re-evaluation & Confidence Delta Calculation│
└────────────────────────────────────────────────────────┘
```

## Core Components
1. **Frontend**: React 18 / Vite with TypeScript, Tailwind CSS, and Recharts.
2. **Backend**: FastAPI with asynchronous endpoints, CORS middleware, and Pydantic schema validation.
3. **Data Layer**: Synthetic realistic inventory profiles covering high velocity, perishable goods, long lead times, and seasonal spikes.
4. **AI Layer**: Multi-stage prompt pipeline configurable via `.env` (`LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`).
