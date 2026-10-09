# DecisionGuard AI — Baseline Comparison

This document provides a technical comparison between conventional **Single-Pass AI reorder systems** and **DecisionGuard AI's Adversarial Self-Challenge Engine**.

---

## 1. Architectural Differences

| Attribute | Conventional Single-Pass AI | DecisionGuard AI (Self-Challenging) |
| :--- | :--- | :--- |
| **Reasoning Flow** | Single prompt / formula pass $\rightarrow$ Direct output | 4-Stage Adversarial Loop (Proposal $\rightarrow$ Counter-Audit $\rightarrow$ Re-evaluation $\rightarrow$ Human Gate) |
| **Confidence Output** | Static overconfidence ($88\%\text{--}95\%$) | Calibrated Trajectory (${\Delta}$ Shift based on friction identified) |
| **Risk Detection** | Naive consumption burn only | Actively checks perishability, warehouse space overflow, and supplier SLA unreliability |
| **Alternative Exploration** | Single static batch suggestion | Generates benchmarked alternatives (e.g., Lean Batch vs. Buffer Surge Batch with explicit trade-offs) |
| **Decision Authority** | Autonomous unvalidated execution | Structured Human-in-the-Loop approval with calibration slider & audit trail |

---

## 2. Live UI Verified Scenarios (`data/inventory.json`)

The following outputs are produced by the heuristic engine in `backend/app/engine.py` and reflected directly in the React UI:

### A. Spoilage Mitigation — Organic Cold Brew Matcha (`SKU-BEV-2004`)
- **Single-Pass AI**: Reorder **180 units** | Confidence: **92%** | Urgency: **HIGH**
  - *Single-Pass Logic*: Stock is at 18 units (below reorder point of 45). Restores target level of 120 + lead time burn.
- **DecisionGuard AI**: Reorder **30 units** | Confidence: **86%** | Urgency: **HIGH**
  - *Self-Challenge Finding*: 45-day shelf life cannot absorb 180 units at daily velocity of 5.2 units/day (~35 days consumption).
  - *Outcome*: **`CHANGED`** (Order slashed by 83% to MOQ of 30 units to prevent batch expiration).

### B. Confirmed High-Turnover Demand — GaN Fast Charger (`SKU-ELEC-1001`)
- **Single-Pass AI**: Reorder **350 units** | Confidence: **92%** | Urgency: **HIGH**
- **DecisionGuard AI**: Reorder **350 units** | Confidence: **96%** | Urgency: **HIGH**
  - *Self-Challenge Finding*: Upcoming "Tech Week Sale" justifies full replenishment buffer; supplier reliability is high (94%).
  - *Outcome*: **`AGREES`** (Full replenishment confirmed with increased confidence).

### C. Warehouse Floor Space Mitigation — Ergonomic Mesh Task Chair (`SKU-FURN-3012`)
- **Single-Pass AI**: Reorder **90 units** | Confidence: **92%** | Urgency: **HIGH**
- **DecisionGuard AI**: Reorder **60 units** | Confidence: **79%** | Urgency: **HIGH**
  - *Self-Challenge Finding*: Bulky footprint (8.5 cu.ft/unit) creates high warehouse holding cost & congestion.
  - *Outcome*: **`CHANGED`** (Batch trimmed to 60 units).

---

## 3. Demo Scenarios API Suite (`data/demo_scenarios.json`)

Additional benchmark scenarios evaluated via `POST /api/evaluate`:

| SKU | Product Name | Single-Pass Proposal | Self-Challenge Risk | Final Recommendation | Confidence Delta | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SKU-DEMO-CHG01** | Apex Gaming Mouse | 500 units @ 92% | Bulky storage overflow (6.2 cu.ft) | 350 units @ 79% | -13% | **`CHANGED`** |
| **SKU-DEMO-AGR02** | Silicone Phone Case | 300 units @ 88% | Normal variance | 300 units @ 90% | +2% | **`AGREES`** |
| **SKU-DEMO-STK03** | Barcode Label Rolls | 250 units @ 92% | Warehouse consumable | 250 units @ 90% | -2% | **`AGREES`** |
| **SKU-DEMO-UNC04** | Peptide Facial Serum | 260 units @ 92% | Supplier SLA risk (72%) | 260 units @ 64% | -28% | **`UNCERTAIN`** |
| **SKU-DEMO-PER05** | Cold-Pressed Almond Milk | 210 units @ 92% | 30-day shelf-life expiration | 30 units @ 86% | -6% | **`CHANGED`** |
