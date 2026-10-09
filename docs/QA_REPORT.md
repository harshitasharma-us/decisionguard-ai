# DecisionGuard AI — QA & Verification Report

---

## 1. Executive Summary

| Verification Category | Status | Details |
| :--- | :--- | :--- |
| **Backend Automated Tests** | **PASS (9/9)** | `tests/test_evaluation.py`, `tests/test_health.py`, `tests/test_qa_suite.py` pass in 0.66s. |
| **Frontend Production Build** | **PASS (0 errors)** | `npm run build` compiles Vite bundle cleanly with zero TypeScript errors. |
| **Pydantic Schema Parsing** | **COMPATIBLE** | All records across `data/inventory.json` and `data/demo_scenarios.json` parse cleanly. |
| **Flagship Live UI Demo** | **VERIFIED (100%)** | `SKU-BEV-2004` (Matcha) slashes order from 180 $\rightarrow$ 30 units (confidence 92% $\rightarrow$ 86%, `CHANGED`). |
| **Agreement Live UI Demo** | **VERIFIED (100%)** | `SKU-ELEC-1001` (Charger) confirms order of 350 $\rightarrow$ 350 units (confidence 92% $\rightarrow$ 96%, `AGREES`). |
| **Uncertainty Scenario** | **VERIFIED (API)** | `SKU-DEMO-UNC04` (Facial Serum) flags supplier SLA (72%) and evaluates to `UNCERTAIN` (92% $\rightarrow$ 64%). |

---

## 2. Dataset & UI Availability Breakdown

| SKU | Dataset | Category | Available in UI? | Single-Pass Proposal | Self-Challenge Risk | Final Recommendation | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SKU-ELEC-1001** | `inventory.json` | Electronics | **YES** | 350 units @ 92% | Normal variance | 350 units @ 96% | **`AGREES`** |
| **SKU-BEV-2004** | `inventory.json` | Perishables | **YES** | 180 units @ 92% | Spoilage / Shelf-life (45d) | 30 units @ 86% | **`CHANGED`** |
| **SKU-FURN-3012** | `inventory.json` | Furniture | **YES** | 90 units @ 92% | Pallet space overflow (8.5 cu.ft) | 60 units @ 79% | **`CHANGED`** |
| **SKU-APPAREL-4050** | `inventory.json` | Apparel | **YES** | 300 units @ 88% | Normal variance | 300 units @ 96% | **`AGREES`** |
| **SKU-CHEM-5088** | `inventory.json` | Supplies | **YES** | 50 units @ 92% | Supplier delay | 50 units @ 90% | **`AGREES`** |
| **SKU-DEMO-CHG01** | `demo_scenarios.json` | Gaming | API Only | 500 units @ 92% | Bulky storage (6.2 cu.ft) | 350 units @ 79% | **`CHANGED`** |
| **SKU-DEMO-AGR02** | `demo_scenarios.json` | Accessories | API Only | 300 units @ 88% | Normal variance | 300 units @ 90% | **`AGREES`** |
| **SKU-DEMO-STK03** | `demo_scenarios.json` | Supplies | API Only | 250 units @ 92% | Warehouse consumable | 250 units @ 90% | **`AGREES`** |
| **SKU-DEMO-UNC04** | `demo_scenarios.json` | Cosmetics | API Only | 260 units @ 92% | Low supplier reliability (72%) | 260 units @ 64% | **`UNCERTAIN`** |
| **SKU-DEMO-PER05** | `demo_scenarios.json` | Perishables | API Only | 210 units @ 92% | 30-day expiration | 30 units @ 86% | **`CHANGED`** |

---

## 3. Test Execution Summary

```bash
$ python -m pytest
============================= test session starts =============================
platform win32 -- Python 3.14.2, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\VICTUS\decisionguard-ai
collected 9 items

tests\test_evaluation.py ....                                            [ 44%]
tests\test_health.py .                                                   [ 55%]
tests\test_qa_suite.py ....                                              [100%]
======================== 9 passed, 1 warning in 0.66s =========================
```

```bash
$ cd frontend && npm run build
> decisionguard-frontend@0.1.0 build
> tsc && vite build

vite v5.4.21 building for production...
✓ 2291 modules transformed.
dist/index.html                   1.22 kB │ gzip:   0.66 kB
dist/assets/index-CHErBA9b.css   40.37 kB │ gzip:   7.43 kB
dist/assets/index-7MQ6HxS5.js   581.28 kB │ gzip: 164.01 kB
✓ built in 56.03s
```

---

## 4. Presenter Guidelines

1. For live demo presentations, always select **`SKU-BEV-2004` (Matcha 12-Pack)** on the UI top navigation strip to showcase the **`CHANGED`** verdict in real-time ($180 \rightarrow 30\text{ units}$, $92\% \rightarrow 86\%$ confidence).
2. Use **`SKU-ELEC-1001` (GaN Fast Charger)** to demonstrate verification and confidence increase (**`AGREES`**, $350 \rightarrow 350\text{ units}$, $92\% \rightarrow 96\%$).
3. Highlight the **Human-in-the-Loop volume calibration slider** to show how operators modify and dispatch purchase orders directly to ERP with a real-time audit trail.
