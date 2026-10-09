# DecisionGuard AI — Demo Scenarios & Data Catalog

This catalog outlines all verified test scenarios across the DecisionGuard AI system, including UI availability and engine evaluation parameters.

---

## 1. Dataset Overview

The project provides two datasets in `data/`:

1. **`data/inventory.json` (Primary UI Dataset)**:
   - Loaded by the backend endpoint `GET /api/inventory` on application startup.
   - Powers the interactive SKU switcher and Recharts telemetry in the React frontend console.
   - Contains 5 representative inventory profiles.
2. **`data/demo_scenarios.json` (Extended Demo Scenarios)**:
   - Comprehensive test cases covering edge cases (such as low supplier SLA triggering `UNCERTAIN`).
   - Accessible via direct API evaluation (`POST /api/evaluate`).

---

## 2. Active UI Scenarios (`data/inventory.json`)

### Scenario 1: Spoilage & Shelf-Life Mitigation (Flagship CHANGED Demo)
- **SKU**: `SKU-BEV-2004`
- **Product**: Organic Cold Brew Matcha 12-Pack
- **Category**: Perishable Beverages
- **Key Parameters**: Current Stock: 18 | Target: 120 | Velocity: 5.2/day | Lead Time: 12 days | MOQ: 30 | Shelf Life: 45 days
- **Single-Pass Proposal**: **180 units** @ 92% confidence (HIGH urgency)
- **Self-Challenge Reasoning**: Flagged that ordering 180 units takes ~35 days to sell, consuming 78% of the remaining 45-day shelf life.
- **Final Recommendation**: **30 units** (MOQ) @ 86% confidence (HIGH urgency)
- **Outcome**: **`CHANGED`**

---

### Scenario 2: Promotion-Backed Replenishment (Validated AGREES Demo)
- **SKU**: `SKU-ELEC-1001`
- **Product**: Ultra-Fast USB-C 65W GaN Charger
- **Category**: Electronics
- **Key Parameters**: Current Stock: 42 | Target: 250 | Velocity: 14.5/day | Lead Time: 7 days | MOQ: 50 | Event: "Tech Week Sale in 10 days"
- **Single-Pass Proposal**: **350 units** @ 92% confidence (HIGH urgency)
- **Self-Challenge Reasoning**: Counter-audit verified upcoming promotional lift; supplier SLA is robust (94%). Full stock replenishment is justified.
- **Final Recommendation**: **350 units** @ 96% confidence (HIGH urgency)
- **Outcome**: **`AGREES`**

---

### Scenario 3: Warehouse Pallet Congestion Mitigation
- **SKU**: `SKU-FURN-3012`
- **Product**: Ergonomic Mesh Task Chair (Obsidian)
- **Category**: Office Furniture
- **Key Parameters**: Current Stock: 8 | Target: 60 | Velocity: 1.8/day | Lead Time: 21 days | MOQ: 15 | Volume: 8.5 cu.ft/unit
- **Single-Pass Proposal**: **90 units** @ 92% confidence (HIGH urgency)
- **Self-Challenge Reasoning**: High cubic volume (8.5 cu.ft/unit) creates severe floor congestion and storage holding overhead.
- **Final Recommendation**: **60 units** @ 79% confidence (HIGH urgency)
- **Outcome**: **`CHANGED`**

---

### Scenario 4: Seasonal Cold-Weather Surge Validation
- **SKU**: `SKU-APPAREL-4050`
- **Product**: Thermal Merino Wool Trail Socks (3-Pack)
- **Category**: Apparel
- **Key Parameters**: Current Stock: 110 | Target: 300 | Velocity: 22.0/day | Lead Time: 5 days | MOQ: 100 | Event: "Peak cold weather season"
- **Single-Pass Proposal**: **300 units** @ 88% confidence (LOW urgency)
- **Final Recommendation**: **300 units** @ 96% confidence (LOW urgency)
- **Outcome**: **`AGREES`**

---

### Scenario 5: Critical Warehouse Consumable Maintenance
- **SKU**: `SKU-CHEM-5088`
- **Product**: Industrial Anti-Static Surface Cleaner (5L)
- **Category**: Facility Supplies
- **Key Parameters**: Current Stock: 5 | Target: 40 | Velocity: 0.8/day | Lead Time: 14 days | MOQ: 10 | Reliability: 82%
- **Single-Pass Proposal**: **50 units** @ 92% confidence (HIGH urgency)
- **Final Recommendation**: **50 units** @ 90% confidence (HIGH urgency)
- **Outcome**: **`AGREES`**

---

## 3. Extended API Demo Scenarios (`data/demo_scenarios.json`)

| SKU | Product Name | Key Constraint | Single-Pass | Final Recommendation | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SKU-DEMO-CHG01** | Apex Pro Wireless Mouse | Bulky packaging (6.2 cu.ft) | 500 units @ 92% | 350 units @ 79% | **`CHANGED`** |
| **SKU-DEMO-AGR02** | Silicone Phone Case | Stable turnover, 95% SLA | 300 units @ 88% | 300 units @ 90% | **`AGREES`** |
| **SKU-DEMO-STK03** | Barcode Label Rolls | Packaging consumable | 250 units @ 92% | 250 units @ 90% | **`AGREES`** |
| **SKU-DEMO-UNC04** | Peptide Facial Serum | Unreliable supplier (72% SLA) | 260 units @ 92% | 260 units @ 64% | **`UNCERTAIN`** |
| **SKU-DEMO-PER05** | Cold-Pressed Almond Milk | 30-day shelf life | 210 units @ 92% | 30 units @ 86% | **`CHANGED`** |
