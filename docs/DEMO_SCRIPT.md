# DecisionGuard AI — Hackathon Presentation Script (2-Minute Demo)

---

## ⏱️ 0:00 – 0:25 | The Hook: The AI Overconfidence Problem

**Presenter**:
> *"Standard AI models in inventory management suffer from a dangerous flaw: **overconfidence**.*
> *A single-pass AI prompt looks at stock burn and outputs an aggressive reorder number with 90%+ confidence — completely oblivious to product expiration dates, warehouse cubic storage bottlenecks, or supplier delays.*
>
> *We built **DecisionGuard AI** — an adversarial decision intelligence console where **the AI challenges its own recommendation before a human manager approves it**."*

---

## ⏱️ 0:25 – 0:55 | Flagship Live Demo: The Matcha Spoilage Trap (`SKU-BEV-2004`)

**Action**:
1. Click on **`SKU-BEV-2004` (Organic Cold Brew Matcha 12-Pack)** on the top SKU bar.
2. Point to the **Before / After Comparison** and **Decision Journey**.

**Presenter**:
> *"Look at what happened here:*
>
> 1. **Single-Pass AI** (Stage 01): Looked at current stock (18 units) and proposed reordering **180 units** with **92% confidence**.*
> 2. **Self-Challenge Engine** (Stage 02): Acted as Devil's Advocate. It detected that at a daily velocity of 5.2 units, selling 180 units would take over 34 days — consuming almost 80% of its remaining 45-day shelf life. Spoilage write-off risk!*
> 3. **Re-evaluation** (Stage 03): Re-calibrated the batch down to MOQ — **30 units**.*
> 4. **Hero Verdict** (Stage 04): **DECISION CHANGED** (Orange badge). Confidence dropped from **92% → 86%**.*
>
> *DecisionGuard just prevented a massive batch spoilage loss."*

---

## ⏱️ 0:55 – 1:25 | Confirmed Demand: GaN Fast Charger (`SKU-ELEC-1001`)

**Action**:
1. Click on **`SKU-ELEC-1001` (Ultra-Fast USB-C 65W GaN Charger)** on the SKU selector.

**Presenter**:
> *"Now let's look at what happens when the initial proposal is sound.*
>
> *For this high-velocity charger, Single-Pass AI recommended **350 units**.*
> *During the self-challenge audit, the system cross-checked the upcoming **Tech Week Sale** and 94% supplier reliability.*
> *The recommendation was verified:*
> - **Verdict**: **`DECISION CONFIRMED` (AGREES)** (Green badge).
> - **Confidence**: Increased from **92% → 96%**.*
>
> *The AI doesn't just disagree blindly — it calibrates based on concrete evidence."*

---

## ⏱️ 1:25 – 1:55 | Human-in-the-Loop Authority & Action Audit

**Action**:
1. Scroll down to **Human Decision Required**.
2. Drag the volume calibration slider from 350 to **320 units**.
3. Type an optional note: *"Adjusted for pallet packing limit."*
4. Click **`Modify & Order`**.
5. Show the green confirmation card and the **Session Action Telemetry Log**.

**Presenter**:
> *"AI recommends. Human decides.*
> *The human operator retains full authority: we can accept the AI's reorder with one click, or use the calibration slider to adjust the order and dispatch to ERP with a complete audit trail."*

---

## ⏱️ 1:55 – 2:00 | Conclusion

**Presenter**:
> *"DecisionGuard AI turns AI from an overconfident black box into an accountable reasoning partner. Thank you!"*
