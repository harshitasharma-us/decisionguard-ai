import os
import json
import math
from datetime import datetime, timezone
import httpx
from typing import Optional

from .schemas import (
    InventoryItem,
    SinglePassRecommendation,
    AlternativeOption,
    SelfChallengeAnalysis,
    FinalRecommendation,
    EvaluationResponse,
    DecisionOutcome,
    UrgencyLevel,
    TransparentCalculations,
    LLMStructuredOutput,
)


class DecisionGuardEngine:
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "openai").lower()
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.model = os.getenv("LLM_MODEL", "gpt-4o-mini")

    def _calculate_transparent_metrics(self, item: InventoryItem, initial_qty: int) -> TransparentCalculations:
        velocity = max(item.daily_velocity, 0.01)
        lead_time = max(item.supplier_lead_time_days or item.lead_time_days or 1, 1)
        moq = max(item.supplier_moq, 1)

        lead_time_demand = round(velocity * lead_time, 2)
        stockout_runway = round(item.current_stock / velocity, 1)
        target_deficit = round(max(0, item.target_stock_level - item.current_stock + lead_time_demand), 2)
        working_capital = round(initial_qty * item.unit_cost_usd, 2)

        consumption_days = None
        if item.shelf_life_days:
            consumption_days = round((item.current_stock + initial_qty) / velocity, 1)

        storage_vol = None
        if item.warehouse_volume_cuft:
            storage_vol = round(initial_qty * item.warehouse_volume_cuft, 2)

        formula_text = (
            f"Lead Time Demand = {velocity} units/day × {lead_time} days = {lead_time_demand} units. "
            f"Target Deficit = Max(0, {item.target_stock_level} - {item.current_stock} + {lead_time_demand}) = {target_deficit} units. "
            f"Batched to MOQ ({moq}) = {initial_qty} units."
        )

        return TransparentCalculations(
            lead_time_demand=lead_time_demand,
            stockout_runway_days=stockout_runway,
            target_deficit=target_deficit,
            working_capital_exposure_usd=working_capital,
            shelf_life_consumption_days=consumption_days,
            storage_volume_cuft=storage_vol,
            formula_breakdown=formula_text,
        )

    def _dynamic_single_pass(self, item: InventoryItem) -> SinglePassRecommendation:
        """
        Stage 1: Conventional Single-Pass Recommendation.
        Uses deterministic inventory reorder formula based on lead time burn and MOQ.
        """
        velocity = max(item.daily_velocity, 0.01)
        lead_time = max(item.supplier_lead_time_days or item.lead_time_days or 1, 1)
        moq = max(item.supplier_moq, 1)

        lead_time_burn = velocity * lead_time
        stockout_days = round(item.current_stock / velocity, 1)

        # Deficit calculation
        deficit = max(0.0, item.target_stock_level - item.current_stock + lead_time_burn)
        
        # Batch to nearest MOQ multiple
        if deficit <= 0:
            raw_qty = 0
        else:
            raw_qty = max(moq, math.ceil(deficit / moq) * moq)

        # Urgency level
        if item.current_stock <= item.safety_stock:
            urgency: UrgencyLevel = "CRITICAL" if stockout_days <= 3.0 else "HIGH"
        elif item.current_stock <= item.reorder_point:
            urgency = "MEDIUM"
        else:
            urgency = "LOW"

        # Baseline single-pass confidence (conventionally overconfident: 88-92%)
        confidence = 92 if urgency in ["HIGH", "CRITICAL"] else 88

        reasoning = (
            f"Current stock of {item.current_stock} units is at or below the reorder point of {item.reorder_point}. "
            f"With daily velocity of {velocity} units/day and {lead_time} days lead time (demand burn = {round(lead_time_burn, 1)} units), "
            f"an order of {raw_qty} units is proposed to restore target stock of {item.target_stock_level}."
        )

        return SinglePassRecommendation(
            reorder_quantity=raw_qty,
            urgency=urgency,
            reasoning=reasoning,
            confidence=confidence,
            projected_stockout_days=stockout_days,
        )

    def _dynamic_self_challenge(
        self, item: InventoryItem, initial: SinglePassRecommendation
    ) -> SelfChallengeAnalysis:
        """
        Stage 2: Self-Challenge Audit.
        Evaluates comprehensive friction checks to uncover potential overconfidence.
        """
        arguments: list[str] = []
        missing_facts: list[str] = []
        alternatives: list[AlternativeOption] = []
        primary_risk = "Normal inventory variance"
        total_penalty = 0

        velocity = max(item.daily_velocity, 0.01)
        moq = max(item.supplier_moq, 1)
        lead_time = max(item.supplier_lead_time_days or item.lead_time_days or 1, 1)
        reliability = item.supplier_reliability_score if item.supplier_reliability_score is not None else (item.supplier_reliability or 0.90)
        open_pos = item.open_purchase_orders or 0
        notes_lower = (item.notes or "").lower()
        event_lower = (item.upcoming_event or "").lower()

        # 1. Missing or Corrupt Telemetry Friction
        if item.daily_velocity <= 0.01 or (item.supplier_lead_time_days or 0) <= 0 or "missing" in notes_lower:
            arguments.append(
                "Missing Essential Telemetry: Critical sales velocity or supplier lead-time parameters are undefined or near-zero. Mathematical runway projection cannot be validated."
            )
            missing_facts.append("Validated historical daily sales velocity and vendor contracted lead-time SLA.")
            primary_risk = "Missing or unverified telemetry"
            total_penalty += 45

        # 2. Conflicting Records / Physical Count Discrepancy
        elif "discrepancy" in notes_lower or "conflict" in notes_lower or "discrepancy" in event_lower:
            arguments.append(
                "Inventory Discrepancy: Physical warehouse count conflicts with ERP/WMS system records. Placing a reorder before physical cycle count reconciliation risks severe inventory misallocation."
            )
            missing_facts.append("Reconciled physical cycle count report and warehouse audit sign-off.")
            primary_risk = "Conflicting inventory records"
            total_penalty += 40

        # 3. In-Flight Open Purchase Orders Friction
        elif open_pos > 0:
            arguments.append(
                f"In-Flight Pipeline Alert: {open_pos} units are already scheduled on existing open purchase orders. Placing a naive full deficit reorder ({initial.reorder_quantity} units) creates redundant stock and unnecessary capital lockup."
            )
            missing_facts.append("Estimated delivery date and tracking confirmation for open purchase orders in transit.")
            primary_risk = "Open purchase orders in transit"
            total_penalty += 20

        # 4. Perishability & Spoilage Friction
        elif item.shelf_life_days and item.shelf_life_days > 0 and initial.reorder_quantity > 0 and (((item.current_stock + initial.reorder_quantity) / velocity) / item.shelf_life_days) > 0.60:
            days_to_consume = round((item.current_stock + initial.reorder_quantity) / velocity, 1)
            consumption_ratio = days_to_consume / item.shelf_life_days
            arguments.append(
                f"Perishability Alert: Ordering {initial.reorder_quantity} units will take ~{days_to_consume} days "
                f"to sell, consuming {int(consumption_ratio * 100)}% of the {item.shelf_life_days}-day shelf life. High spoilage write-off risk!"
            )
            missing_facts.append(
                f"Recent batch expiration curve and customer return rate for category '{item.category}'."
            )
            primary_risk = "Spoilage and shelf-life expiration"
            total_penalty += int(consumption_ratio * 12)

        # 5. Bulky Warehouse Space & Holding Cost Friction
        elif item.warehouse_volume_cuft and item.warehouse_volume_cuft > 5.0 and initial.reorder_quantity > 0:
            total_cubic_ft = round(item.warehouse_volume_cuft * initial.reorder_quantity, 1)
            arguments.append(
                f"Warehouse Congestion: At {item.warehouse_volume_cuft} cu.ft/unit, an influx of {initial.reorder_quantity} units requires "
                f"{total_cubic_ft} cu.ft of prime warehouse storage, inflating holding overhead."
            )
            missing_facts.append("Warehouse pallet rack occupancy rate and scheduled incoming sea container receipts.")
            primary_risk = "Storage holding cost & space overflow"
            total_penalty += 13

        # 6. Transient Demand Spike / Flash Promo Return Anomaly
        elif "return spike" in notes_lower or "flash promo" in notes_lower or "one-time" in notes_lower or "baseline run rate" in notes_lower:
            arguments.append(
                "Demand Outlier Alert: Current calculated velocity includes temporary promotional surge or return artifacts. Ordering against peak rate risks severe post-campaign overstock."
            )
            missing_facts.append("Normalized steady-state run rate excluding promotional campaign outliers.")
            primary_risk = "Transient demand spike"
            total_penalty += 15

        # 7. Supplier Fulfillment Reliability Friction
        elif reliability < 0.85:
            reliability_pct = int(reliability * 100)
            arguments.append(
                f"Supplier Risk: {item.supplier_name} has a historical SLA fulfillment score of only {reliability_pct}%. "
                f"Actual dispatch times frequently deviate beyond {lead_time} days."
            )
            missing_facts.append(f"Supplier SLA dispute logs and backup tier-2 vendor pricing for SKU {item.sku}.")
            primary_risk = "Supplier fulfillment delay"
            total_penalty += int((1.0 - reliability) * 60)

        # 8. Market Context & Event Lift Check
        elif item.upcoming_event and item.upcoming_event.lower() != "none":
            arguments.append(
                f"Market Context: Upcoming event noted: '{item.upcoming_event}'. Initial single-pass formula did not "
                f"explicitly verify promotional lift elasticity against stock buffer."
            )
            missing_facts.append("Historical promotional lift multipliers for similar marketing campaigns.")

        # Default argument if clean
        if not arguments:
            capital_exposure = round(initial.reorder_quantity * item.unit_cost_usd, 2)
            arguments.append(
                f"Working Capital Check: Committing ${capital_exposure:,.2f} in working capital for a single batch "
                f"may restrict procurement agility for other rapid-turnover SKUs."
            )
            missing_facts.append("Department working capital allocation cap across category.")

        # Benchmark Alternative Options
        # Option A: Lean Batch
        if initial.reorder_quantity > moq:
            lean_qty = max(moq, int(initial.reorder_quantity * 0.6 / moq) * moq)
            if lean_qty == initial.reorder_quantity:
                lean_qty = moq
        else:
            lean_qty = moq

        alternatives.append(
            AlternativeOption(
                option_name="Lean Batch (Minimize Capital/Spoilage)",
                quantity=lean_qty,
                rationale=f"Reorder lean batch of {lean_qty} units (MOQ) to protect against demand contraction or expiry.",
                tradeoff="Requires more frequent purchase orders and forfeits top-tier bulk supplier discounts.",
            )
        )

        # Option B: Buffer Surge Batch
        surge_qty = initial.reorder_quantity + moq
        alternatives.append(
            AlternativeOption(
                option_name="Buffer Surge Batch",
                quantity=surge_qty,
                rationale=f"Reorder {surge_qty} units to secure buffer runway against supplier delays and promotional spikes.",
                tradeoff=f"Locks up additional ${(moq * item.unit_cost_usd):,.2f} in working capital.",
            )
        )

        return SelfChallengeAnalysis(
            arguments_against=arguments,
            missing_facts_identified=missing_facts,
            alternative_options=alternatives,
            primary_risk_factor=primary_risk,
            friction_penalty_points=total_penalty,
        )

    def _dynamic_re_evaluate(
        self,
        item: InventoryItem,
        initial: SinglePassRecommendation,
        challenge: SelfChallengeAnalysis,
    ) -> tuple[FinalRecommendation, DecisionOutcome, int]:
        """
        Stage 3: Synthesis & Re-evaluation.
        Dynamically adjusts order quantity, urgency, and confidence based on identified friction.
        """
        adjustments: list[str] = []
        final_qty = initial.reorder_quantity
        final_urgency = initial.urgency
        outcome: DecisionOutcome = "AGREES"

        velocity = max(item.daily_velocity, 0.01)
        moq = max(item.supplier_moq, 1)
        lead_time = max(item.supplier_lead_time_days or item.lead_time_days or 1, 1)
        reliability = item.supplier_reliability_score if item.supplier_reliability_score is not None else (item.supplier_reliability or 0.90)
        open_pos = item.open_purchase_orders or 0

        # 1. Missing Telemetry or Data Gaps -> UNCERTAIN
        if "Missing or unverified telemetry" in challenge.primary_risk_factor:
            outcome = "UNCERTAIN"
            final_confidence = 45
            final_qty = 0
            adjustments.append("Telemetry inputs incomplete; flagged as UNCERTAIN until sales velocity is confirmed.")
            reasoning = (
                "Critical demand velocity or lead-time parameters are unverified or missing. "
                "Abstaining from autonomous reorder recommendation to prevent inventory misallocation."
            )

        # 2. Conflicting Records / Physical Count Discrepancy -> UNCERTAIN
        elif "Conflicting inventory records" in challenge.primary_risk_factor:
            outcome = "UNCERTAIN"
            final_confidence = 48
            final_qty = 0
            adjustments.append("Physical stock count conflicts with WMS/ERP records; manual audit required.")
            reasoning = (
                "Unresolved discrepancy between physical inventory count and ERP records. "
                "Autonomous reorder halted until warehouse cycle count reconciliation completes."
            )

        # 3. Open Purchase Orders in Transit -> CHANGED
        elif "Open purchase orders" in challenge.primary_risk_factor and open_pos > 0:
            remaining_deficit = max(0, initial.reorder_quantity - open_pos)
            if remaining_deficit <= 0:
                final_qty = moq
            else:
                final_qty = max(moq, math.ceil(remaining_deficit / moq) * moq)
            outcome = "CHANGED"
            final_confidence = 88
            adjustments.append(
                f"Factored in {open_pos} units already in-transit via open POs; reduced new purchase proposal to {final_qty} units."
            )
            reasoning = (
                f"Self-challenge identified {open_pos} units currently in-transit. "
                f"Adjusted proposed reorder to {final_qty} units to avoid double-ordering while maintaining safe buffer."
            )

        # 4. Spoilage risk calibration: If shelf life is exceeded by >60%, trim to MOQ
        elif item.shelf_life_days and item.shelf_life_days > 0 and "Spoilage" in challenge.primary_risk_factor:
            final_qty = moq
            outcome = "CHANGED"
            adjustments.append(
                f"Reduced reorder quantity from {initial.reorder_quantity} to {final_qty} units to prevent batch expiration within {item.shelf_life_days}-day limit."
            )
            final_confidence = 86
            reasoning = (
                f"Self-challenge detected critical shelf-life expiration risk under sales velocity of {velocity}/day. "
                f"Downgraded reorder to MOQ of {final_qty} units to ensure fresh inventory turnover."
            )

        # 5. Bulky warehouse overflow calibration
        elif item.warehouse_volume_cuft and item.warehouse_volume_cuft > 5.0 and "Storage" in challenge.primary_risk_factor:
            final_qty = max(moq, int(initial.reorder_quantity * 0.75 / moq) * moq)
            if final_qty != initial.reorder_quantity:
                outcome = "CHANGED"
                adjustments.append(
                    f"Trimmed batch size to {final_qty} units to prevent warehouse pallet overflow."
                )
            final_confidence = 79
            reasoning = (
                f"Balancing {lead_time}-day lead time against bulky storage footprint ({item.warehouse_volume_cuft} cu.ft/unit). "
                f"Recommended batch of {final_qty} units mitigates congestion while sustaining stock runway."
            )

        # 6. Transient Demand Spike / Flash Promo Return Anomaly
        elif "Transient demand spike" in challenge.primary_risk_factor:
            final_qty = max(moq, int(initial.reorder_quantity * 0.4 / moq) * moq)
            outcome = "CHANGED"
            final_confidence = 84
            adjustments.append(
                f"Adjusted reorder quantity from {initial.reorder_quantity} down to {final_qty} units to reflect normalized non-promotional velocity."
            )
            reasoning = (
                f"Self-challenge identified that recent sales velocity was skewed by a temporary promo/return spike. "
                f"Recalibrated batch to {final_qty} units based on sustainable baseline demand."
            )

        # 7. Unreliable Supplier SLA: Sub-threshold (< 0.80) -> UNCERTAIN
        elif reliability < 0.80:
            outcome = "UNCERTAIN"
            final_confidence = 64
            final_qty = 0
            adjustments.append(
                f"Supplier reliability ({int(reliability * 100)}%) is sub-threshold; dual-sourcing check recommended."
            )
            reasoning = (
                f"High volatility in supplier fulfillment SLA ({int(reliability * 100)}%). "
                f"Autonomous reorder halted; requires human procurement confirmation and secondary vendor check."
            )

        # 8. Verified event or strong demand -> AGREES with confidence boost
        elif item.upcoming_event and item.upcoming_event.lower() != "none" and ("Sale" in item.upcoming_event or "Surging" in (item.notes or "")):
            final_confidence = 96
            outcome = "AGREES"
            adjustments.append(
                f"Verified upcoming '{item.upcoming_event}' confirms necessity of full {final_qty} unit replenishment."
            )
            reasoning = (
                f"Initial reorder quantity of {final_qty} units withstood counter-analysis. "
                f"Upcoming event and strong demand velocity justify full replenishment."
            )

        # 9. Default Validated Agreement
        else:
            final_confidence = max(75, 90 - challenge.friction_penalty_points)
            outcome = "AGREES"
            adjustments.append("Initial assumptions validated; holding cost is within acceptable margin.")
            reasoning = (
                f"Self-challenge audit validated reorder parameters. "
                f"Proceeding with {final_qty} units to satisfy lead time runway."
            )

        final_rec = FinalRecommendation(
            reorder_quantity=final_qty,
            urgency=final_urgency,
            reasoning=reasoning,
            confidence=final_confidence,
            key_adjustments_made=adjustments,
        )

        return final_rec, outcome, final_confidence

    async def _call_gemini_api(self, prompt: str) -> Optional[dict]:
        """Calls Google Gemini REST API."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
            },
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    if parts and "text" in parts[0]:
                        return json.loads(parts[0]["text"])
        return None

    async def _call_openai_api(self, prompt: str) -> Optional[dict]:
        """Calls OpenAI-compatible Chat Completions endpoint."""
        base_url = os.getenv("LLM_BASE_URL", "").rstrip("/")
        url = f"{base_url}/chat/completions" if base_url else "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are DecisionGuard AI, an expert autonomous supply chain reorder auditor. "
                        "You critically audit and challenge baseline reorder proposals to avoid over-ordering, "
                        "spoilage, warehouse congestion, and unverified supplier risks. Output strictly valid JSON."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                return json.loads(content)
        return None

    async def _evaluate_with_llm(self, item: InventoryItem, baseline_metrics: TransparentCalculations) -> Optional[EvaluationResponse]:
        """
        Executes live LLM self-challenge evaluation using Gemini or OpenAI.
        Validates the output against schema and enforces strict Python business constraints (MOQ, bounds).
        """
        provider = os.getenv("LLM_PROVIDER", self.provider).lower()
        api_key = os.getenv("LLM_API_KEY", self.api_key)
        model = os.getenv("LLM_MODEL", self.model)

        if not api_key or api_key.startswith("your_"):
            return None

        # Prepare rich factual context for the LLM
        prompt = f"""
You are DecisionGuard AI, an adversarial decision intelligence system for supply chain inventory reordering.

INVENTORY ITEM CONTEXT:
- SKU: {item.sku}
- Product Name: {item.product_name}
- Category: {item.category}
- Current Stock: {item.current_stock} units
- Safety Stock: {item.safety_stock} units
- Reorder Point: {item.reorder_point} units
- Target Stock Level: {item.target_stock_level} units
- Daily Sales Velocity: {item.daily_velocity} units/day
- Supplier Lead Time: {item.supplier_lead_time_days or item.lead_time_days} days
- Supplier MOQ (Minimum Order Qty): {item.supplier_moq} units
- Supplier Name: {item.supplier_name}
- Supplier Reliability SLA Score: {item.supplier_reliability_score if item.supplier_reliability_score is not None else item.supplier_reliability} (0.0 to 1.0)
- Shelf Life / Expiry: {item.shelf_life_days or 'N/A (Non-perishable)'} days
- Unit Volume: {item.warehouse_volume_cuft or 'N/A'} cu.ft/unit
- Unit Cost: ${item.unit_cost_usd:.2f} USD
- Upcoming Events / Market Context: {item.upcoming_event or 'None'}
- Notes: {item.notes or 'None'}

PRE-COMPUTED TRANSPARENT BENCHMARKS:
- Lead Time Demand Burn: {baseline_metrics.lead_time_demand} units
- Stockout Runway: {baseline_metrics.stockout_runway_days} days
- Target Deficit to replenish: {baseline_metrics.target_deficit} units

TASK:
Perform an autonomous 3-stage self-challenge reorder evaluation:
1. Stage 1 (single_pass): Baseline proposal (reorder_quantity, urgency: LOW/MEDIUM/HIGH/CRITICAL, reasoning, confidence: 0-100, projected_stockout_days).
2. Stage 2 (self_challenge): Rigorous adversarial audit uncovering potential blindspots (arguments_against, missing_facts_identified, alternative_options: [option_name, quantity, rationale, tradeoff], primary_risk_factor).
3. Stage 3 (final_recommendation): Final decision (reorder_quantity: must be >= 0 and MOQ-compliant, urgency, reasoning, confidence: 0-100, key_adjustments_made).
Outcome must be one of:
- 'AGREES': Initial proposal withstands critique.
- 'CHANGED': Genuine risk (spoilage, storage, demand shift) justifies batch revision.
- 'UNCERTAIN': Missing information or unreliable supplier SLA requires human confirmation.

Return ONLY valid JSON matching this exact structure:
{{
  "single_pass": {{
    "reorder_quantity": int,
    "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    "reasoning": "string",
    "confidence": int,
    "projected_stockout_days": float
  }},
  "self_challenge": {{
    "arguments_against": ["string"],
    "missing_facts_identified": ["string"],
    "alternative_options": [
      {{"option_name": "string", "quantity": int, "rationale": "string", "tradeoff": "string"}}
    ],
    "primary_risk_factor": "string"
  }},
  "final_recommendation": {{
    "reorder_quantity": int,
    "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    "reasoning": "string",
    "confidence": int,
    "key_adjustments_made": ["string"]
  }},
  "confidence_before": int,
  "confidence_after": int,
  "decision_outcome": "AGREES" | "CHANGED" | "UNCERTAIN",
  "summary_verdict": "string"
}}
"""
        try:
            raw_data = None
            if provider == "gemini":
                raw_data = await self._call_gemini_api(prompt)
            else:
                raw_data = await self._call_openai_api(prompt)

            if not raw_data:
                return None

            # Validate structured schema with Pydantic
            validated = LLMStructuredOutput(**raw_data)

            # Python Constraint Verification & Enforcement
            moq = max(item.supplier_moq, 1)
            final_qty = max(0, validated.final_recommendation.reorder_quantity)
            
            # Enforce MOQ compliance
            if final_qty > 0 and final_qty % moq != 0:
                final_qty = math.ceil(final_qty / moq) * moq
                validated.final_recommendation.reorder_quantity = final_qty
                validated.final_recommendation.key_adjustments_made.append(
                    f"Python constraint check: Batch aligned to supplier MOQ multiple ({moq} units)."
                )

            single_pass_qty = max(0, validated.single_pass.reorder_quantity)
            if single_pass_qty > 0 and single_pass_qty % moq != 0:
                single_pass_qty = math.ceil(single_pass_qty / moq) * moq
                validated.single_pass.reorder_quantity = single_pass_qty

            conf_before = max(0, min(100, validated.confidence_before))
            conf_after = max(0, min(100, validated.confidence_after))
            conf_delta = conf_after - conf_before

            transparent = self._calculate_transparent_metrics(item, final_qty)

            return EvaluationResponse(
                sku=item.sku,
                product_name=item.product_name,
                timestamp=datetime.now(timezone.utc).isoformat(),
                transparent_metrics=transparent,
                single_pass=validated.single_pass,
                self_challenge=validated.self_challenge,
                final_recommendation=validated.final_recommendation,
                confidence_before=conf_before,
                confidence_after=conf_after,
                confidence_delta=conf_delta,
                decision_outcome=validated.decision_outcome,
                summary_verdict=validated.summary_verdict,
                engine_type=f"Live AI Model Inference ({provider.upper()}: {model})",
                is_live_llm=True,
            )
        except Exception:
            # Fallback cleanly if LLM call or parsing fails
            return None

    async def evaluate_inventory_item(self, item: InventoryItem) -> EvaluationResponse:
        """
        Executes the end-to-end DecisionGuard AI evaluation loop.
        Attempts Live LLM reasoning if configured, with automatic deterministic fallback.
        """
        baseline_single_pass = self._dynamic_single_pass(item)
        baseline_transparent = self._calculate_transparent_metrics(item, baseline_single_pass.reorder_quantity)

        # 1. Attempt Live LLM Reasoning
        llm_result = await self._evaluate_with_llm(item, baseline_transparent)
        if llm_result:
            return llm_result

        # 2. Autonomous Deterministic Adversarial Fallback Engine
        single_pass = baseline_single_pass
        transparent = baseline_transparent
        self_challenge = self._dynamic_self_challenge(item, single_pass)
        final_rec, outcome, conf_after = self._dynamic_re_evaluate(item, single_pass, self_challenge)

        conf_before = single_pass.confidence
        conf_delta = conf_after - conf_before

        if outcome == "AGREES":
            verdict = f"Recommendation validated ({conf_before}% → {conf_after}% confidence). Counter-arguments resolved without batch modification."
        elif outcome == "CHANGED":
            verdict = f"Self-challenge altered reorder quantity from {single_pass.reorder_quantity} to {final_rec.reorder_quantity} units due to {self_challenge.primary_risk_factor.lower()}."
        else:
            verdict = f"High variance or supplier risk identified. Re-evaluation flags uncertainty ({conf_before}% → {conf_after}%); requires human procurement confirmation."

        has_configured_key = bool(self.api_key and not self.api_key.startswith("your_"))
        fallback_desc = (
            "Deterministic Rule Engine (Live LLM API unavailable/failed)"
            if has_configured_key
            else "Deterministic Rule Engine (Rule-based Mode)"
        )

        res = EvaluationResponse(
            sku=item.sku,
            product_name=item.product_name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            transparent_metrics=transparent,
            single_pass=single_pass,
            self_challenge=self_challenge,
            final_recommendation=final_rec,
            confidence_before=conf_before,
            confidence_after=conf_after,
            confidence_delta=conf_delta,
            decision_outcome=outcome,
            summary_verdict=verdict,
            engine_type=fallback_desc,
            is_live_llm=False,
        )

        # Generate Double-Check & Comparison
        from .verifier import verifier
        comparison = verifier._verify_inventory_decision(
            query=f"Reorder evaluation for {item.sku}",
            first_answer=single_pass.reasoning,
            item=item,
            eval_res=res,
        )
        res.comparison = comparison
        return res


engine = DecisionGuardEngine()

