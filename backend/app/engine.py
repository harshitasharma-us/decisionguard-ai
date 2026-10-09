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
)


class DecisionGuardEngine:
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "openai").lower()
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.model = os.getenv("LLM_MODEL", "gpt-4o-mini")

    def _heuristic_single_pass(self, item: InventoryItem) -> SinglePassRecommendation:
        """
        Stage 1: Single-Pass Recommendation.
        A conventional naive AI formula based strictly on target stock level and lead time burn.
        """
        lead_time_burn = item.daily_velocity * item.supplier_lead_time_days
        stockout_days = round(item.current_stock / max(item.daily_velocity, 0.1), 1)

        # Naive target formula
        deficit = item.target_stock_level - item.current_stock + lead_time_burn
        raw_qty = max(item.supplier_moq, math.ceil(deficit / max(item.supplier_moq, 1)) * item.supplier_moq)

        # Standard urgency
        if item.current_stock <= item.safety_stock:
            urgency: UrgencyLevel = "CRITICAL" if stockout_days <= 2 else "HIGH"
        elif item.current_stock <= item.reorder_point:
            urgency = "MEDIUM"
        else:
            urgency = "LOW"

        # Standard single pass tends to be overconfident (85-95%)
        confidence = 92 if urgency in ["HIGH", "CRITICAL"] else 88

        reasoning = (
            f"Current stock of {item.current_stock} units is at/below the reorder point of {item.reorder_point}. "
            f"With daily velocity of {item.daily_velocity} units/day and {item.supplier_lead_time_days} days lead time, "
            f"an order of {raw_qty} units is proposed to restore target stock of {item.target_stock_level}."
        )

        return SinglePassRecommendation(
            reorder_quantity=raw_qty,
            urgency=urgency,
            reasoning=reasoning,
            confidence=confidence,
            projected_stockout_days=stockout_days,
        )

    def _heuristic_self_challenge(
        self, item: InventoryItem, initial: SinglePassRecommendation
    ) -> SelfChallengeAnalysis:
        """
        Stage 2: Self-Challenge.
        Actively plays Devil's Advocate against the initial proposal.
        """
        arguments: list[str] = []
        missing_facts: list[str] = []
        alternatives: list[AlternativeOption] = []
        primary_risk = "Normal inventory variance"

        # Check Perishability / Shelf-life Risk
        if item.shelf_life_days:
            days_to_consume = round(initial.reorder_quantity / max(item.daily_velocity, 0.1))
            if days_to_consume > item.shelf_life_days * 0.6:
                arguments.append(
                    f"Perishability Alert: Ordering {initial.reorder_quantity} units will take ~{days_to_consume} days "
                    f"to sell, exceeding 60% of remaining {item.shelf_life_days}-day shelf life. High spoilage risk!"
                )
                missing_facts.append(
                    f"Recent batch expiration curve and seasonal decline rate for category '{item.category}'."
                )
                primary_risk = "Spoilage and shelf-life expiration"

        # Check bulky items & holding costs
        if item.warehouse_volume_cuft and item.warehouse_volume_cuft > 5.0:
            arguments.append(
                f"Warehouse Congestion: This item occupies {item.warehouse_volume_cuft} cu.ft/unit. "
                f"An influx of {initial.reorder_quantity} units requires {round(item.warehouse_volume_cuft * initial.reorder_quantity)} cu.ft "
                f"of high-cost floor space."
            )
            missing_facts.append("Warehouse cubic capacity utilization and pending incoming container receipts.")
            if primary_risk == "Normal inventory variance":
                primary_risk = "Storage holding cost & space overflow"

        # Check Supplier Reliability & Lead Time Volatility
        if item.supplier_reliability_score < 0.85:
            arguments.append(
                f"Supplier Risk: {item.supplier_name} has a reliability score of only {int(item.supplier_reliability_score * 100)}%. "
                f"Actual lead times frequently deviate beyond {item.supplier_lead_time_days} days."
            )
            missing_facts.append(f"Supplier SLA dispute logs and backup vendor tier-2 pricing for SKU {item.sku}.")
            if primary_risk == "Normal inventory variance":
                primary_risk = "Supplier fulfillment delay"

        # Check upcoming events / demand shifts
        if item.upcoming_event:
            arguments.append(
                f"Market Context: Upcoming event noted: '{item.upcoming_event}'. Initial formula did not explicitly model "
                f"event-driven elasticities or pull-forward demand spikes."
            )
            missing_facts.append(f"Historical promotional lift multipliers for similar marketing campaigns.")

        # Default argument if none triggered
        if not arguments:
            arguments.append(
                f"Capital Lockup: Committing ${(initial.reorder_quantity * item.unit_cost_usd):,.2f} in working capital "
                f"for a single batch might restrict reorder agility for other critical SKUs."
            )
            missing_facts.append("Working capital allocation cap across category.")

        # Benchmark Alternatives
        # Option A: Conservative split batch
        conservative_qty = max(item.supplier_moq, int(initial.reorder_quantity * 0.6 / item.supplier_moq) * item.supplier_moq)
        if conservative_qty == initial.reorder_quantity:
            conservative_qty = item.supplier_moq
        alternatives.append(
            AlternativeOption(
                option_name="Lean Batch (Minimize Capital/Spoilage)",
                quantity=conservative_qty,
                rationale=f"Reorder MOQ of {conservative_qty} units to protect against demand contraction or holding costs.",
                tradeoff="Higher frequency of purchase orders and lower supplier bulk discounts.",
            )
        )

        # Option B: Buffer Batch (Stockout immunity)
        aggressive_qty = initial.reorder_quantity + item.supplier_moq
        alternatives.append(
            AlternativeOption(
                option_name="Buffer Surge Batch",
                quantity=aggressive_qty,
                rationale=f"Reorder {aggressive_qty} units to build buffer against supplier delays and promotional surges.",
                tradeoff=f"Locks up additional ${(item.supplier_moq * item.unit_cost_usd):,.2f} in working capital.",
            )
        )

        return SelfChallengeAnalysis(
            arguments_against=arguments,
            missing_facts_identified=missing_facts,
            alternative_options=alternatives,
            primary_risk_factor=primary_risk,
        )

    def _heuristic_re_evaluate(
        self,
        item: InventoryItem,
        initial: SinglePassRecommendation,
        challenge: SelfChallengeAnalysis,
    ) -> tuple[FinalRecommendation, DecisionOutcome, int]:
        """
        Stage 3: Re-evaluation.
        Synthesizes the single-pass proposal with self-challenge friction to arrive at the final recommendation.
        """
        adjustments: list[str] = []
        final_qty = initial.reorder_quantity
        final_urgency = initial.urgency
        outcome: DecisionOutcome = "AGREES"

        # Case 1: Perishable goods with shelf-life risk -> Reduce quantity to prevent spoilage
        if item.shelf_life_days and "Spoilage" in challenge.primary_risk_factor:
            final_qty = item.supplier_moq
            outcome = "CHANGED"
            adjustments.append(
                f"Reduced reorder quantity from {initial.reorder_quantity} to {final_qty} units to align with {item.shelf_life_days}-day expiry limits."
            )
            final_confidence = 86
            reasoning = (
                f"Self-challenge flagged severe expiration risk under current sales velocity. "
                f"Downgraded reorder to MOQ of {final_qty} units to maintain fresh stock rotation."
            )

        # Case 2: Bulky furniture / Storage bottleneck -> Split reorder
        elif item.warehouse_volume_cuft and item.warehouse_volume_cuft > 5.0 and "Storage" in challenge.primary_risk_factor:
            final_qty = max(item.supplier_moq, int(initial.reorder_quantity * 0.75 / item.supplier_moq) * item.supplier_moq)
            if final_qty != initial.reorder_quantity:
                outcome = "CHANGED"
                adjustments.append(
                    f"Trimmed batch size to {final_qty} units to avoid warehouse pallet overflow."
                )
            final_confidence = 79
            reasoning = (
                f"Balancing {item.supplier_lead_time_days}-day lead time against bulky storage footprint. "
                f"Recommended batch of {final_qty} units mitigates overflow while sustaining runway."
            )

        # Case 3: Low supplier reliability (<0.80) or critical uncertainty -> Mark UNCERTAIN or adjust
        elif item.supplier_reliability_score < 0.80:
            outcome = "UNCERTAIN"
            final_confidence = 64
            adjustments.append(
                f"Supplier reliability ({int(item.supplier_reliability_score * 100)}%) is sub-threshold; dual-sourcing check recommended."
            )
            reasoning = (
                f"High volatility in supplier fulfillment. Recommended {final_qty} units with immediate human procurement verification."
            )

        # Case 4: High turnover / seasonal surge confirmed -> Increase confidence or validate
        elif item.upcoming_event and ("Surging" in (item.notes or "") or "Sale" in item.upcoming_event):
            final_confidence = 96
            outcome = "AGREES"
            adjustments.append(
                f"Verified upcoming '{item.upcoming_event}' confirms necessity of full {final_qty} unit replenishment."
            )
            reasoning = (
                f"Initial reorder quantity of {final_qty} units withstood counter-analysis. "
                f"Upcoming event and strong demand velocity justify full replenishment."
            )

        # Default agreement
        else:
            final_confidence = 90
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

    async def _evaluate_with_llm(self, item: InventoryItem) -> Optional[EvaluationResponse]:
        """
        Optional live LLM driver (OpenAI/Gemini/Anthropic compatible) when configured via .env
        """
        if not self.api_key or self.api_key.startswith("your_"):
            return None

        prompt = f"""
You are DecisionGuard AI, an expert supply chain assistant that challenges its own stock reorder recommendations.
Inventory item data:
{json.dumps(item.model_dump(), indent=2)}

You must execute a 3-stage self-challenging reorder evaluation:
Stage 1: Single-pass recommendation (reorder_quantity, urgency, reasoning, confidence: 0-100, projected_stockout_days).
Stage 2: Self-challenge (arguments_against, missing_facts_identified, alternative_options: [option_name, quantity, rationale, tradeoff], primary_risk_factor).
Stage 3: Final re-evaluated recommendation (reorder_quantity, urgency, reasoning, confidence: 0-100, key_adjustments_made).
Outcome: One of 'AGREES', 'CHANGED', 'UNCERTAIN'.

Return ONLY valid JSON matching this exact structure:
{{
  "single_pass": {{
    "reorder_quantity": int,
    "urgency": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL",
    "reasoning": "...",
    "confidence": int,
    "projected_stockout_days": float
  }},
  "self_challenge": {{
    "arguments_against": ["..."],
    "missing_facts_identified": ["..."],
    "alternative_options": [
      {{"option_name": "...", "quantity": int, "rationale": "...", "tradeoff": "..."}}
    ],
    "primary_risk_factor": "..."
  }},
  "final_recommendation": {{
    "reorder_quantity": int,
    "urgency": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL",
    "reasoning": "...",
    "confidence": int,
    "key_adjustments_made": ["..."]
  }},
  "confidence_before": int,
  "confidence_after": int,
  "decision_outcome": "AGREES"|"CHANGED"|"UNCERTAIN",
  "summary_verdict": "..."
}}
"""
        try:
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "You are a specialized AI self-challenge inventory decision engine. Output valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    return EvaluationResponse(
                        sku=item.sku,
                        product_name=item.product_name,
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        single_pass=SinglePassRecommendation(**parsed["single_pass"]),
                        self_challenge=SelfChallengeAnalysis(**parsed["self_challenge"]),
                        final_recommendation=FinalRecommendation(**parsed["final_recommendation"]),
                        confidence_before=parsed["confidence_before"],
                        confidence_after=parsed["confidence_after"],
                        confidence_delta=parsed["confidence_after"] - parsed["confidence_before"],
                        decision_outcome=parsed["decision_outcome"],
                        summary_verdict=parsed.get("summary_verdict", f"Self-challenge completed with status {parsed['decision_outcome']}.")
                    )
        except Exception:
            # Fallback to deterministic heuristic if API unreachable
            return None

        return None

    async def evaluate_inventory_item(self, item: InventoryItem) -> EvaluationResponse:
        """
        Executes the end-to-end DecisionGuard AI evaluation loop.
        """
        # Attempt LLM call if configured
        llm_result = await self._evaluate_with_llm(item)
        if llm_result:
            return llm_result

        # Autonomous Heuristic Engine (instant, hackathon demo ready)
        single_pass = self._heuristic_single_pass(item)
        self_challenge = self._heuristic_self_challenge(item, single_pass)
        final_rec, outcome, conf_after = self._heuristic_re_evaluate(item, single_pass, self_challenge)

        conf_before = single_pass.confidence
        conf_delta = conf_after - conf_before

        if outcome == "AGREES":
            verdict = f"Recommendation validated ({conf_before}% → {conf_after}% confidence). Counter-arguments resolved."
        elif outcome == "CHANGED":
            verdict = f"Self-challenge altered reorder quantity from {single_pass.reorder_quantity} to {final_rec.reorder_quantity} units due to {self_challenge.primary_risk_factor.lower()}."
        else:
            verdict = f"High variance identified. Re-evaluation flags uncertainty ({conf_before}% → {conf_after}%); requires human confirmation."

        return EvaluationResponse(
            sku=item.sku,
            product_name=item.product_name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            single_pass=single_pass,
            self_challenge=self_challenge,
            final_recommendation=final_rec,
            confidence_before=conf_before,
            confidence_after=conf_after,
            confidence_delta=conf_delta,
            decision_outcome=outcome,
            summary_verdict=verdict,
        )


engine = DecisionGuardEngine()
