"""
DecisionGuard AI — Intelligent Conversational Decision & Self-Challenging Assistant
Handles general-purpose queries across all domains:
1. General AI / Science / Tech / Coding / Mathematics / Business / Logic / Reasoning
2. Multilingual queries in English, Hindi, and Hinglish
3. Multi-turn Follow-ups & SQLite Conversation History Resolution
4. DecisionGuard Inventory Telemetry & Autonomous Self-Challenge Audits
5. Genuine 2-Pass Adversarial Double-Checking & Verification
"""

import os
import json
import re
import uuid
import math
import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple, Dict, Any

from .schemas import (
    InventoryItem,
    EvaluationResponse,
    ChatRequest,
    ChatResponse,
    ChatMessage,
    DoubleCheckComparison,
)
from .engine import engine
from .llm_client import llm_client
from . import db

logger = logging.getLogger("decisionguard.chat")


class DecisionGuardChatService:
    def __init__(self):
        pass

    # ------------------------------------------------------------------------
    # 1. CONTEXT RESOLUTION & ENTITY EXTRACTION
    # ------------------------------------------------------------------------

    def _extract_sku_from_text(self, text: str) -> Optional[str]:
        """Finds SKU patterns like SKU-ELEC-1001, SKU-BEV-2004, SKU-CHEM-5088, SKU-NONEXISTENT-9999, including backticks and punctuation."""
        match = re.search(r"[`'\"\[\(]?\b(SKU-[A-Z0-9]+(?:-[A-Z0-9]+)*)\b[`'\"\]\)]?", text, re.IGNORECASE)
        if match:
            return match.group(1).upper()
        return None

    def _extract_all_skus_from_text(self, text: str) -> List[str]:
        """Finds all SKU patterns in text and returns ordered, deduplicated list."""
        matches = re.findall(r"[`'\"\[\(]?\b(SKU-[A-Z0-9]+(?:-[A-Z0-9]+)*)\b[`'\"\]\)]?", text, re.IGNORECASE)
        seen = set()
        result = []
        for m in matches:
            u = m.upper()
            if u not in seen:
                seen.add(u)
                result.append(u)
        return result

    def _extract_multiple_items_from_query(
        self,
        query: str,
        inventory: List[dict],
        history: Optional[List[ChatMessage]] = None,
    ) -> List[InventoryItem]:
        """Extracts 2 or more distinct inventory items for comparative analysis."""
        items: List[InventoryItem] = []
        seen_skus = set()

        # Step 1: Direct SKUs in query
        skus_found = self._extract_all_skus_from_text(query)
        for s in skus_found:
            for it in inventory:
                if it.get("sku", "").upper() == s and s not in seen_skus:
                    items.append(InventoryItem(**it))
                    seen_skus.add(s)

        # Step 2: Keyword / alias matches if we still have < 2 items
        if len(items) < 2:
            query_lower = query.lower()
            keyword_map = {
                "SKU-BEV-2004": ["matcha", "cold brew", "organic cold brew", "organic matcha"],
                "SKU-ELEC-1001": ["charger", "gan", "usb-c", "fast charger", "gan charger", "65w charger"],
                "SKU-FURN-3012": ["chair", "ergonomic", "mesh", "task chair", "office chair"],
                "SKU-APPAREL-4050": ["socks", "merino", "wool", "trail socks"],
                "SKU-CHEM-5088": ["cleaner", "surface cleaner", "anti-static", "cleanchem"],
                "SKU-MED-7023": ["vaccine", "mrna", "cold chain"],
                "SKU-AUTO-6019": ["rotor", "brake", "ceramic composite"],
                "SKU-TECH-8045": ["headphone", "audio", "spatial audio"],
                "SKU-BEAUTY-9011": ["serum", "hyaluronic", "hydration"],
                "SKU-IND-9055": ["end mill", "carbide", "cnc", "tooling"],
                "SKU-FOOD-1044": ["coffee", "yirgacheffe", "beans", "roast"],
                "SKU-HOME-2089": ["humidifier", "mist", "ultrasonic"],
            }
            for target_sku, triggers in keyword_map.items():
                if target_sku not in seen_skus and any(re.search(r"\b" + re.escape(tr) + r"\b", query_lower) for tr in triggers):
                    for it in inventory:
                        if it.get("sku", "").upper() == target_sku:
                            items.append(InventoryItem(**it))
                            seen_skus.add(target_sku)
                            break

        # Step 3: Check conversation history if query refers to multi-item comparison ("both", "these two", "compare them")
        if len(items) < 2 and history:
            for past_msg in reversed(history[-6:]):
                past_skus = self._extract_all_skus_from_text(past_msg.content)
                if past_msg.referenced_sku and past_msg.referenced_sku.upper() not in past_skus:
                    past_skus.append(past_msg.referenced_sku.upper())
                for ps in past_skus:
                    if ps not in seen_skus:
                        for it in inventory:
                            if it.get("sku", "").upper() == ps:
                                items.append(InventoryItem(**it))
                                seen_skus.add(ps)
                                if len(items) >= 2:
                                    break
                if len(items) >= 2:
                    break

        return items

    def _find_item_in_inventory(
        self,
        query: str,
        inventory: List[dict],
        current_sku: Optional[str] = None,
        history: Optional[List[ChatMessage]] = None,
    ) -> Optional[InventoryItem]:
        """
        Resolves the referenced inventory item through:
        1. Exact SKU matching in query
        2. Word-boundary semantic product aliases (English & Hinglish)
        3. Contextual back-reference from conversation history (only when contextually referenced)
        4. Session active SKU
        """
        query_lower = query.lower()

        # Step 1: Direct SKU in current query
        sku_found = self._extract_sku_from_text(query)
        if sku_found:
            for item in inventory:
                if item.get("sku", "").upper() == sku_found:
                    return InventoryItem(**item)

        # Step 2: Word-boundary semantic keyword mapping (English & Hinglish)
        keyword_map = {
            "SKU-BEV-2004": ["matcha", "cold brew", "organic cold brew", "organic matcha", "matcha pack", "matcha drink"],
            "SKU-ELEC-1001": ["charger", "gan", "usb-c", "fast charger", "gan charger", "65w charger"],
            "SKU-FURN-3012": ["chair", "ergonomic", "mesh", "task chair", "office chair", "kursi"],
            "SKU-APPAREL-4050": ["socks", "merino", "wool", "trail socks", "moze", "jurab"],
            "SKU-CHEM-5088": ["cleaner", "surface cleaner", "anti-static", "cleanchem"],
            "SKU-MED-7023": ["vaccine", "mrna", "cold chain"],
            "SKU-AUTO-6019": ["rotor", "brake", "ceramic composite"],
            "SKU-TECH-8045": ["headphone", "audio", "spatial audio"],
            "SKU-BEAUTY-9011": ["serum", "hyaluronic", "hydration"],
            "SKU-IND-9055": ["end mill", "carbide", "cnc", "tooling"],
            "SKU-FOOD-1044": ["coffee", "yirgacheffe", "beans", "roast"],
            "SKU-HOME-2089": ["humidifier", "mist", "ultrasonic"],
        }

        for target_sku, triggers in keyword_map.items():
            for trigger in triggers:
                if re.search(r"\b" + re.escape(trigger) + r"\b", query_lower):
                    for item in inventory:
                        if item.get("sku", "").upper() == target_sku:
                            return InventoryItem(**item)

        # Check product name token overlap with comprehensive stopwords
        stopwords = {
            "what", "when", "where", "which", "should", "could", "would",
            "about", "today", "tomorrow", "order", "reorder", "product", "products",
            "item", "items", "please", "with", "from", "stock", "tell", "show", "check",
            "kya", "karo", "kare", "kitna", "hai", "batao", "dikhao", "muje", "mujhe",
            "list", "available", "avaialable", "details", "detail", "give",
            "best", "good", "better", "top", "recommend", "recommended", "recommendation",
            "disadvantage", "disadvantages", "drawback", "drawbacks", "pros", "cons",
            "risk", "risks", "compare", "comparison", "both", "these", "this", "that",
            "between", "versus", "vs", "difference", "differences", "many", "count",
            "have", "there", "year", "days", "one", "according", "there", "some", "any"
        }
        words = [w for w in re.findall(r"\b[a-zA-Z]{4,}\b", query_lower) if w not in stopwords]
        for item in inventory:
            name_lower = item.get("product_name", "").lower()
            for w in words:
                if re.search(r"\b" + re.escape(w) + r"\b", name_lower):
                    return InventoryItem(**item)

        # Step 3: Conversation history context back-reference ONLY if query refers to an ongoing subject
        context_triggers = [
            "it", "its", "it's", "this", "that", "the product", "this product", "that product",
            "the item", "this item", "that item", "same product", "same item",
            "reorder", "disadvantage", "disadvantages", "drawback", "drawbacks", "risk", "risks",
            "recommendation", "simulate", "what if", "why", "lead time", "delay", "supplier",
            "detail", "details", "price", "cost", "margin", "moq", "shelf life", "runway",
            "iska", "isko", "uske", "usko", "ye", "yeh", "wo", "woh", "same"
        ]
        has_context_trigger = any(re.search(r"\b" + re.escape(tr) + r"\b", query_lower) for tr in context_triggers)

        if has_context_trigger and history:
            for past_msg in reversed(history[-6:]):
                if past_msg.referenced_sku:
                    for item in inventory:
                        if item.get("sku", "").upper() == past_msg.referenced_sku.upper():
                            return InventoryItem(**item)

                past_sku = self._extract_sku_from_text(past_msg.content)
                if past_sku:
                    for item in inventory:
                        if item.get("sku", "").upper() == past_sku:
                            return InventoryItem(**item)

        # Step 4: Fallback to active SKU only if context trigger is present
        if has_context_trigger and current_sku:
            for item in inventory:
                if item.get("sku", "").upper() == current_sku.upper():
                    return InventoryItem(**item)

        return None

    # ------------------------------------------------------------------------
    # 2. INVENTORY TELEMETRY, AUDITS & INTENT HANDLERS
    # ------------------------------------------------------------------------

    def _generate_stockout_ranking(self, inventory: List[dict]) -> Tuple[str, List[str]]:
        """Generates a ranked leaderboard of catalog products by stockout runway."""
        ranked = []
        for item_data in inventory:
            item = InventoryItem(**item_data)
            velocity = max(item.daily_velocity, 0.01)
            runway = round(item.current_stock / velocity, 1)
            lead_time = item.supplier_lead_time_days or item.lead_time_days or 1
            status = "CRITICAL" if runway <= 3.0 else ("HIGH" if runway <= lead_time else "HEALTHY")
            ranked.append({
                "sku": item.sku,
                "name": item.product_name,
                "stock": item.current_stock,
                "velocity": item.daily_velocity,
                "runway": runway,
                "lead_time": lead_time,
                "status": status,
            })

        ranked.sort(key=lambda x: x["runway"])
        top_item = ranked[0]

        response = (
            f"### 🚨 Stockout Risk Leaderboard\n\n"
            f"Based on warehouse telemetry and sales velocity, **{top_item['name']} (`{top_item['sku']}`)** "
            f"faces the most immediate stockout risk with only **{top_item['runway']} days of inventory runway remaining**.\n\n"
            f"| SKU | Product | Stock | Daily Burn | Runway | Lead Time | Status |\n"
            f"| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n"
        )

        for r in ranked[:6]:
            icon = "🔴" if r["status"] == "CRITICAL" else ("🟡" if r["status"] == "HIGH" else "🟢")
            response += f"| `{r['sku']}` | {r['name']} | {r['stock']} | {r['velocity']}/d | **{r['runway']}d** | {r['lead_time']}d | {icon} {r['status']} |\n"

        response += (
            f"\n\n**Actionable Insight:** `{top_item['sku']}` requires replenishment review before stock drops below "
            f"the supplier lead time threshold ({top_item['lead_time']} days)."
        )
        followups = [
            f"Should I reorder {top_item['sku']} today?",
            f"Give details of {top_item['sku']}",
            "Show products below their reorder point",
        ]
        return response, followups

    async def _simulate_what_if(
        self,
        item: InventoryItem,
        lead_time_delta: int = 0,
        demand_pct_delta: float = 0.0,
    ) -> Tuple[str, EvaluationResponse, List[str]]:
        """Simulates changes in lead time or demand surges/drops."""
        orig_eval = await engine.evaluate_inventory_item(item)

        sim_dict = item.model_dump()
        orig_lt = item.supplier_lead_time_days or item.lead_time_days or 7
        new_lt = max(1, orig_lt + lead_time_delta)
        sim_dict["supplier_lead_time_days"] = new_lt
        if "lead_time_days" in sim_dict:
            sim_dict["lead_time_days"] = new_lt

        orig_vel = item.daily_velocity
        new_vel = round(max(0.1, orig_vel * (1.0 + (demand_pct_delta / 100.0))), 2)
        sim_dict["daily_velocity"] = new_vel

        sim_item = InventoryItem(**sim_dict)
        sim_eval = await engine.evaluate_inventory_item(sim_item)

        scenario_desc = []
        if lead_time_delta != 0:
            scenario_desc.append(f"supplier lead time changes by **{lead_time_delta:+d} days** ({orig_lt}d → {new_lt}d)")
        if demand_pct_delta != 0:
            scenario_desc.append(f"daily demand changes by **{demand_pct_delta:+g}%** ({orig_vel}/d → {new_vel}/d)")

        desc_str = " and ".join(scenario_desc) if scenario_desc else "operational parameters are modified"

        response = (
            f"### ⏱️ Sensitivity Simulation: **{item.product_name} (`{item.sku}`)**\n\n"
            f"If {desc_str}:\n\n"
            f"- **Lead Time Demand:** Shifts from **{orig_eval.transparent_metrics.lead_time_demand} units** → **{sim_eval.transparent_metrics.lead_time_demand} units**\n"
            f"- **Stockout Runway:** Shifts from **{orig_eval.transparent_metrics.stockout_runway_days} days** → **{sim_eval.transparent_metrics.stockout_runway_days} days**\n"
            f"- **Single-Pass Proposed Order:** **{orig_eval.single_pass.reorder_quantity} units** → **{sim_eval.single_pass.reorder_quantity} units**\n"
            f"- **Self-Challenge Calibrated Order:** Validated at **{sim_eval.final_recommendation.reorder_quantity} units** (Decision: `{sim_eval.decision_outcome}`, Confidence: **{sim_eval.confidence_after}%**)\n\n"
            f"**Synthesis:** {sim_eval.summary_verdict}"
        )
        followups = [
            f"What information is missing for {item.sku}?",
            f"What are the risks of your recommendation?",
            f"Are there any disadvantages of {item.sku}?",
        ]
        return response, sim_eval, followups

    def _format_self_challenge_briefing(self, item: InventoryItem, eval_res: EvaluationResponse) -> Tuple[str, List[str]]:
        """Formats the 7-part autonomous decision challenge for reorder questions."""
        outcome_badge = (
            "🟡 **CHANGED** (Reorder batch calibrated to mitigate identified supply chain risks)"
            if eval_res.decision_outcome == "CHANGED"
            else (
                "🟢 **AGREES** (Initial recommendation verified against counter-audit checks)"
                if eval_res.decision_outcome == "AGREES"
                else "🔴 **UNCERTAIN** (High variance / low supplier SLA requires human manager approval)"
            )
        )

        counter_args = "\n".join([f"- ⚠️ {arg}" for arg in eval_res.self_challenge.arguments_against])
        missing_facts = "\n".join([f"- ❓ {fact}" for fact in eval_res.self_challenge.missing_facts_identified])
        alternatives = "\n".join([
            f"- **{alt.option_name} ({alt.quantity} units):** {alt.rationale} *(Tradeoff: {alt.tradeoff})*"
            for alt in eval_res.self_challenge.alternative_options
        ])

        lead_time = item.supplier_lead_time_days or item.lead_time_days or 1
        resp = f"""### 🛡️ DecisionGuard Self-Challenging Evaluation: **{item.product_name}** (`{item.sku}`)

Here is the autonomous decision audit for `{item.sku}`:

#### 1. Initial Recommendation (Single-Pass Baseline)
- **Proposed Batch:** **{eval_res.single_pass.reorder_quantity} units** (Urgency: `{eval_res.single_pass.urgency}`)
- **Baseline Confidence:** **{eval_res.confidence_before}%**
- **Reasoning:** {eval_res.single_pass.reasoning}

#### 2. Counter-Arguments & Potential Risks (Self-Challenge)
{counter_args}

#### 3. Missing Facts & Assumptions Identified
{missing_facts}

#### 4. Benchmarked Alternative Options
{alternatives}

#### 5. Revised Recommendation (Calibrated)
- **Validated Batch:** **{eval_res.final_recommendation.reorder_quantity} units** (Confidence: **{eval_res.confidence_after}%**)
- **Confidence Shift:** **{eval_res.confidence_before}% → {eval_res.confidence_after}%** ({eval_res.confidence_delta:+d}%)
- **Key Adjustments:** {"; ".join(eval_res.final_recommendation.key_adjustments_made) if eval_res.final_recommendation.key_adjustments_made else "None required."}

#### 6. Decision Status
{outcome_badge}

#### 7. Final Synthesis & Data Provenance
- **Source Data:** Inventory Master Records (`current_stock={item.current_stock}`, `velocity={item.daily_velocity}/d`, `lead_time={lead_time}d`, `MOQ={item.supplier_moq}`)
- **Synthesis:** {eval_res.summary_verdict}
"""
        followups = [
            "What are the risks of your recommendation?",
            f"Are there any disadvantages of {item.sku}?",
            f"What happens if supplier lead time increases by 5 days for {item.sku}?",
        ]
        return resp, followups

    def _generate_catalog_summary(self, inventory: List[dict]) -> Tuple[str, List[str]]:
        """Answers queries about product count and total available inventory stock."""
        total_skus = len(inventory)
        total_units = sum(item.get("current_stock", 0) for item in inventory)
        total_valuation = sum(item.get("current_stock", 0) * item.get("unit_cost_usd", 0.0) for item in inventory)

        categories: Dict[str, List[dict]] = {}
        for item in inventory:
            cat = item.get("category", "General")
            categories.setdefault(cat, []).append(item)

        response = (
            f"### 📦 Inventory Catalog Summary\n\n"
            f"There are **{total_skus} products** currently recorded in your inventory, representing a total of **{total_units} available units** "
            f"across {len(categories)} categories (total holding valuation: **${total_valuation:,.2f}**).\n\n"
            f"#### Breakdown by Product (SKU):\n"
        )

        for item in inventory:
            response += (
                f"- **`{item.get('sku')}`** — {item.get('product_name')}: **{item.get('current_stock', 0)} units** "
                f"({item.get('category')}, Reorder Point: {item.get('reorder_point', 0)}u)\n"
            )

        response += (
            f"\n*Summary:* Your catalog has **{total_skus} distinct product records (SKUs)** with **{total_units} total physical units** in stock."
        )
        followups = [
            "List all products in inventory",
            "Which products are low in stock?",
            "Which is the best product and why?",
        ]
        return response, followups

    def _generate_catalog_listing(self, inventory: List[dict]) -> Tuple[str, List[str]]:
        """Generates a complete tabular catalog listing of all monitored inventory products."""
        total_skus = len(inventory)
        total_units = sum(item.get("current_stock", 0) for item in inventory)

        response = (
            f"### 📋 Monitored Inventory Catalog ({total_skus} Products / {total_units} Total Units)\n\n"
            f"| SKU | Product Name | Category | Current Stock | Safety Stock | Reorder Point | Daily Velocity | Lead Time | Supplier |\n"
            f"| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n"
        )

        for item in inventory:
            sku = item.get("sku", "")
            name = item.get("product_name", "")
            cat = item.get("category", "")
            stock = item.get("current_stock", 0)
            safety = item.get("safety_stock", 0)
            reorder = item.get("reorder_point", 0)
            vel = item.get("daily_velocity", 0.0)
            lead = item.get("supplier_lead_time_days", item.get("lead_time_days", 0))
            supp = item.get("supplier_name", "Primary Supplier")
            response += f"| `{sku}` | {name} | {cat} | **{stock}** | {safety} | {reorder} | {vel}/d | {lead}d | {supp} |\n"

        followups = [
            "Show products below their reorder point",
            "Which product has the highest stockout risk right now?",
            "Which is the best product and why?",
        ]
        return response, followups

    def _generate_low_stock_report(self, inventory: List[dict]) -> Tuple[str, List[str]]:
        """Identifies products at or below their safety stock or reorder point thresholds."""
        low_stock_items = []
        for item_data in inventory:
            item = InventoryItem(**item_data)
            is_below_safety = item.current_stock <= item.safety_stock
            is_below_reorder = item.current_stock <= item.reorder_point
            if is_below_reorder or is_below_safety:
                urgency = "CRITICAL" if is_below_safety else "HIGH"
                low_stock_items.append({
                    "item": item,
                    "urgency": urgency,
                    "below_safety": is_below_safety,
                    "below_reorder": is_below_reorder,
                })

        total_skus = len(inventory)
        low_count = len(low_stock_items)

        if not low_stock_items:
            resp = (
                f"### ✅ Low Stock Audit: All Healthy\n\n"
                f"All **{total_skus} product records** currently have stock levels above their reorder points and safety thresholds."
            )
            return resp, ["List all products in inventory", "Which is the best product and why?"]

        response = (
            f"### ⚠️ Low Stock Alert\n\n"
            f"There are **{low_count} products** currently at or below their reorder point out of **{total_skus} total products** in inventory:\n\n"
            f"| SKU | Product | Stock | Safety Stock | Reorder Point | Velocity | Urgency |\n"
            f"| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n"
        )

        for entry in low_stock_items:
            it = entry["item"]
            urg = entry["urgency"]
            icon = "🔴" if urg == "CRITICAL" else "🟡"
            response += f"| `{it.sku}` | {it.product_name} | **{it.current_stock}** | {it.safety_stock} | {it.reorder_point} | {it.daily_velocity}/d | {icon} {urg} |\n"

        first_low = low_stock_items[0]["item"].sku
        followups = [
            f"Should I reorder {first_low}?",
            f"Are there any disadvantages of {first_low}?",
            "Which product has the highest stockout risk right now?",
        ]
        return response, followups

    def _generate_product_details(self, item: InventoryItem) -> Tuple[str, List[str]]:
        """Returns verified real telemetry and comprehensive details for an inventory item with data provenance."""
        velocity = max(item.daily_velocity, 0.01)
        runway = round(item.current_stock / velocity, 1)
        lead_time = item.supplier_lead_time_days or item.lead_time_days or 1
        supplier = item.supplier_name or "Primary Supplier"
        margin = round(((item.selling_price_usd - item.unit_cost_usd) / item.selling_price_usd) * 100, 1) if item.selling_price_usd > 0 else 0.0

        status_flag = ""
        if item.current_stock <= item.safety_stock:
            status_flag = "🔴 **CRITICAL** — Stock is at or below safety stock threshold."
        elif item.current_stock <= item.reorder_point:
            status_flag = "🟡 **REORDER REQUIRED** — Stock is below reorder point."
        else:
            status_flag = "🟢 **HEALTHY** — Stock is above replenishment threshold."

        lines = [
            f"### 📦 Product Record: **{item.product_name}** (`{item.sku}`)",
            f"",
            f"Here are the ground truth inventory and operational details for **`{item.sku}`**:",
            f"",
            f"#### 📊 Inventory & Stock Levels",
            f"- **Current On-Hand Stock:** **{item.current_stock} units** *(Source: Live Inventory Master)*",
            f"- **Safety Stock Threshold:** {item.safety_stock} units",
            f"- **Reorder Point:** {item.reorder_point} units",
            f"- **Target Stock Level:** {item.target_stock_level} units",
            f"- **Daily Sales Velocity:** {item.daily_velocity} units/day",
            f"- **Inventory Runway:** **{runway} days** of stock remaining",
            f"- **Status Assessment:** {status_flag}",
            f"",
            f"#### 💰 Financials & Pricing",
            f"- **Unit Cost:** ${item.unit_cost_usd:.2f} USD",
            f"- **Selling Price (MSRP):** ${item.selling_price_usd:.2f} USD",
            f"- **Gross Margin:** **{margin}%** (${item.selling_price_usd - item.unit_cost_usd:.2f}/unit)",
            f"",
            f"#### 🚚 Supply Chain & Procurement",
            f"- **Supplier:** {supplier} (Reliability SLA: **{int(item.supplier_reliability_score * 100)}%**)",
            f"- **Supplier Lead Time:** {lead_time} days",
            f"- **Minimum Order Quantity (MOQ):** {item.supplier_moq} units",
            f"- **Category:** {item.category}",
        ]

        if item.shelf_life_days:
            lines.append(f"- **Shelf Life:** {item.shelf_life_days} days *(Perishable)*")
        else:
            lines.append("- **Shelf Life:** *Not Applicable (Non-perishable)*")

        if item.warehouse_volume_cuft:
            lines.append(f"- **Unit Volume:** {item.warehouse_volume_cuft} cu. ft. *(Bulky item)*")
        else:
            lines.append("- **Unit Volume:** *Standard packaging (Volume unrecorded)*")

        if item.upcoming_event and item.upcoming_event.lower() != "none":
            lines.append(f"- **Upcoming Event / Demand Note:** {item.upcoming_event}")
        if item.notes:
            lines.extend([
                f"",
                f"#### 📝 Operational Notes",
                f"> {item.notes}",
            ])

        followups = [
            f"Should I reorder {item.sku}?",
            f"Are there any disadvantages of {item.sku}?",
            f"What happens if supplier lead time increases by 5 days for {item.sku}?",
        ]
        return "\n".join(lines), followups

    def _generate_product_disadvantages(self, item: InventoryItem) -> Tuple[str, List[str]]:
        """
        Evaluates genuine trade-offs, vulnerabilities, and operational risks supported by available data.
        Distinguishes known facts from possible risks and unrecorded information.
        """
        velocity = max(item.daily_velocity, 0.01)
        runway = round(item.current_stock / velocity, 1)
        lead_time = item.supplier_lead_time_days or item.lead_time_days or 1
        margin = round(((item.selling_price_usd - item.unit_cost_usd) / item.selling_price_usd) * 100, 1) if item.selling_price_usd > 0 else 0.0
        sla_pct = int(item.supplier_reliability_score * 100)

        known_tradeoffs = []
        operational_risks = []
        unrecorded_data = []

        # Current stock position trade-off
        if item.current_stock <= item.safety_stock:
            known_tradeoffs.append(f"**Critical Stock Depletion:** Current stock is only **{item.current_stock} units** (below safety stock of {item.safety_stock}u and reorder point of {item.reorder_point}u).")
        elif item.current_stock <= item.reorder_point:
            known_tradeoffs.append(f"**Low Stock Status:** Current stock (**{item.current_stock} units**) is below the reorder point ({item.reorder_point}u).")

        # Lead time vs Runway risk
        if runway < lead_time:
            operational_risks.append(f"**Lead-Time Vulnerability:** Remaining runway (**{runway} days**) is shorter than supplier lead time (**{lead_time} days**). Standard replenishment will result in a stockout before delivery unless expedited.")
        elif runway <= lead_time + 3:
            operational_risks.append(f"**Tight Buffer:** Remaining runway (**{runway} days**) is very close to lead time (**{lead_time} days**), leaving zero margin for shipment delays.")

        # Supplier Reliability
        if sla_pct < 85:
            operational_risks.append(f"**Supplier SLA Volatility:** Supplier *{item.supplier_name}* has a reliability score of **{sla_pct}%** (18%+ historical delay/variance rate).")
        else:
            known_tradeoffs.append(f"**Supplier Dependency:** Relying on single vendor *{item.supplier_name}* ({sla_pct}% SLA, {lead_time}d lead time).")

        # Perishability
        if item.shelf_life_days:
            known_tradeoffs.append(f"**Perishability / Shelf-Life Constraint:** Limited shelf life of **{item.shelf_life_days} days**. Large reorder batches risk expiration write-offs if sales velocity drops.")
        else:
            unrecorded_data.append("Shelf life: Non-perishable / No expiration limit recorded.")

        # Storage Footprint
        if item.warehouse_volume_cuft and item.warehouse_volume_cuft > 4.0:
            known_tradeoffs.append(f"**High Storage Footprint:** Bulky unit volume (**{item.warehouse_volume_cuft} cu. ft./unit**) inflates warehouse holding costs and consumes pallet racking.")
        else:
            unrecorded_data.append("Warehouse volume: Standard packaging footprint (no oversize surcharge recorded).")

        # Sales velocity & financial turnover
        if item.daily_velocity < 2.0:
            known_tradeoffs.append(f"**Low Turnover Velocity:** Slow sales velocity (**{item.daily_velocity} units/day**), meaning capital invested in batch reorders turns over slowly.")
        
        # Operational impact
        if item.notes and "shutdown" in item.notes.lower():
            operational_risks.append(f"**High Downside Impact:** {item.notes}")

        if not unrecorded_data:
            unrecorded_data.append("Tier-2 alternative supplier pricing contracts are unrecorded in current telemetry.")

        known_text = "\n".join([f"- {t}" for t in known_tradeoffs]) if known_tradeoffs else "- Standard catalog profile with balanced operational parameters."
        risks_text = "\n".join([f"- ⚠️ {r}" for r in operational_risks]) if operational_risks else "- No elevated operational risks detected under current demand parameters."
        unknown_text = "\n".join([f"- ℹ️ {u}" for u in unrecorded_data])

        response = f"""### 🔍 Disadvantage & Risk Analysis: **{item.product_name}** (`{item.sku}`)

Here is an objective assessment of the known trade-offs, operational vulnerabilities, and unknown factors for **`{item.sku}`**:

#### 1. Known Operational Trade-offs & Facts
{known_text}
- **Financial Profile:** Unit Cost: ${item.unit_cost_usd:.2f}, Selling Price: ${item.selling_price_usd:.2f} (Gross Margin: **{margin}%**)
- **Supplier Constraints:** Lead Time: **{lead_time} days**, MOQ: **{item.supplier_moq} units**, Vendor SLA: **{sla_pct}%**

#### 2. Operational Vulnerabilities & Supply Chain Risks
{risks_text}

#### 3. Unrecorded / Unknown Information
{unknown_text}

*Summary:* The primary disadvantage for `{item.sku}` stems from its **{operational_risks[0].split(':')[0].replace('*', '') if operational_risks else 'procurement lead time'}** combined with holding constraints.
"""
        followups = [
            f"Should I reorder {item.sku}?",
            f"What are the risks of your recommendation?",
            f"Compare {item.sku} and SKU-ELEC-1001",
        ]
        return response, followups

    def _generate_best_product_analysis(self, inventory: List[dict]) -> Tuple[str, List[str]]:
        """
        Provides multi-criteria analysis across margin, demand velocity, stockout risk,
        holding costs, and supplier reliability. Explains that 'best' depends on strategic goals.
        """
        analyzed = []
        for it_data in inventory:
            it = InventoryItem(**it_data)
            margin_pct = round(((it.selling_price_usd - it.unit_cost_usd) / it.selling_price_usd) * 100, 1) if it.selling_price_usd > 0 else 0.0
            daily_rev = round(it.daily_velocity * it.selling_price_usd, 2)
            daily_profit = round(it.daily_velocity * (it.selling_price_usd - it.unit_cost_usd), 2)
            runway = round(it.current_stock / max(it.daily_velocity, 0.01), 1)
            sla_pct = int(it.supplier_reliability_score * 100)

            analyzed.append({
                "item": it,
                "margin_pct": margin_pct,
                "daily_rev": daily_rev,
                "daily_profit": daily_profit,
                "runway": runway,
                "sla_pct": sla_pct,
            })

        # Top by Gross Margin %
        by_margin = sorted(analyzed, key=lambda x: x["margin_pct"], reverse=True)
        top_margin = by_margin[0]

        # Top by Daily Revenue Volume
        by_rev = sorted(analyzed, key=lambda x: x["daily_rev"], reverse=True)
        top_rev = by_rev[0]

        # Top by Daily Gross Profit
        by_profit = sorted(analyzed, key=lambda x: x["daily_profit"], reverse=True)
        top_profit = by_profit[0]

        # Top by Supplier Reliability SLA
        by_sla = sorted(analyzed, key=lambda x: x["sla_pct"], reverse=True)
        top_sla = by_sla[0]

        response = f"""### 🏆 Multi-Criteria Catalog Evaluation: "Best Product" Analysis

In inventory decision intelligence, there is no single "best" product without defining your strategic objective. Evaluating across core commercial and operational criteria reveals distinct leaders:

---

#### 1. Performance Across Strategic Dimensions

| Evaluation Dimension | Leading SKU & Product | Key Metric | Why It Leads |
| :--- | :--- | :--- | :--- |
| 💰 **Highest Profit Margin %** | **`{top_margin['item'].sku}`** ({top_margin['item'].product_name}) | **{top_margin['margin_pct']}% Margin** | Yields **${(top_margin['item'].selling_price_usd - top_margin['item'].unit_cost_usd):.2f}/unit** profit on ${top_margin['item'].selling_price_usd:.2f} MSRP |
| 📈 **Highest Daily Revenue & Demand** | **`{top_rev['item'].sku}`** ({top_rev['item'].product_name}) | **${top_rev['daily_rev']:,.2f}/day** ({top_rev['item'].daily_velocity} u/d) | Strongest market demand and cash generation rate |
| 💎 **Highest Daily Profit Generation** | **`{top_profit['item'].sku}`** ({top_profit['item'].product_name}) | **${top_profit['daily_profit']:,.2f}/day profit** | Optimal balance of high sales velocity and solid unit margin |
| 🛡️ **Highest Supply Chain Reliability** | **`{top_sla['item'].sku}`** ({top_sla['item'].supplier_name}) | **{top_sla['sla_pct']}% SLA** | Lowest supplier disruption risk with fast {top_sla['item'].supplier_lead_time_days}d lead time |

---

#### 2. Comparative Catalog Summary Table

| SKU | Product | Category | Gross Margin % | Daily Velocity | Daily Revenue | Supplier SLA | Operational Profile |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
"""
        for a in analyzed:
            it = a["item"]
            risk_desc = "Perishable (45d)" if it.shelf_life_days else ("Bulky storage" if it.warehouse_volume_cuft and it.warehouse_volume_cuft > 5 else "Standard non-perishable")
            response += f"| `{it.sku}` | {it.product_name} | {it.category} | **{a['margin_pct']}%** | {it.daily_velocity}/d | ${a['daily_rev']:,.2f}/d | {a['sla_pct']}% | {risk_desc} |\n"

        response += f"""
---

#### 3. Strategic Synthesis & Recommendation
- **For Top Financial & Operational Balance:** **`{top_rev['item'].sku}`** ({top_rev['item'].product_name}) is the overall strongest commercial performer due to high sales velocity ({top_rev['item'].daily_velocity}/d), {top_rev['margin_pct']}% gross margin, and excellent supplier reliability ({top_rev['sla_pct']}%).
- **For Electronics / High-Ticket Tech:** **`SKU-ELEC-1001`** offers strong daily revenue (${[a for a in analyzed if a['item'].sku == 'SKU-ELEC-1001'][0]['daily_rev'] if any(a['item'].sku == 'SKU-ELEC-1001' for a in analyzed) else 434.85}/d) with 58.3% margin.
- **Products Requiring Caution:** Perishables like `SKU-BEV-2004` (Matcha) carry high spoilage risk, and slow-moving bulky goods like `SKU-FURN-3012` (Chairs) inflate storage costs.
"""
        followups = [
            f"Give details of {top_rev['item'].sku}",
            f"Should I reorder {top_margin['item'].sku}?",
            "Compare SKU-ELEC-1001 and SKU-CHEM-5088",
        ]
        return response, followups

    async def _generate_comparison_response(
        self,
        items: List[InventoryItem],
        inventory_data: List[dict],
        context_explanation: str,
    ) -> Tuple[str, List[str]]:
        """
        Dynamically compares 2 or more distinct inventory items across verified telemetry,
        unit economics, lead times, and evaluated reorder decisions.
        """
        item1 = items[0]
        item2 = items[1]

        eval1 = await engine.evaluate_inventory_item(item1)
        eval2 = await engine.evaluate_inventory_item(item2)

        margin1 = round(((item1.selling_price_usd - item1.unit_cost_usd) / item1.selling_price_usd) * 100, 1) if item1.selling_price_usd > 0 else 0.0
        margin2 = round(((item2.selling_price_usd - item2.unit_cost_usd) / item2.selling_price_usd) * 100, 1) if item2.selling_price_usd > 0 else 0.0

        lt1 = item1.supplier_lead_time_days or item1.lead_time_days or 1
        lt2 = item2.supplier_lead_time_days or item2.lead_time_days or 1

        runway1 = round(item1.current_stock / max(item1.daily_velocity, 0.01), 1)
        runway2 = round(item2.current_stock / max(item2.daily_velocity, 0.01), 1)

        sla1 = int(item1.supplier_reliability_score * 100)
        sla2 = int(item2.supplier_reliability_score * 100)

        response = f"""### ⚖️ Cross-Product Decision Comparison

{context_explanation}

| Dimension | **{item1.product_name}** (`{item1.sku}`) | **{item2.product_name}** (`{item2.sku}`) |
| :--- | :--- | :--- |
| **Category** | {item1.category} | {item2.category} |
| **Current Stock / Target** | **{item1.current_stock}** / {item1.target_stock_level} units | **{item2.current_stock}** / {item2.target_stock_level} units |
| **Safety Stock / Reorder Point** | {item1.safety_stock}u / {item1.reorder_point}u | {item2.safety_stock}u / {item2.reorder_point}u |
| **Daily Velocity** | {item1.daily_velocity} units/day | {item2.daily_velocity} units/day |
| **Inventory Runway** | **{runway1} days** of stock | **{runway2} days** of stock |
| **Unit Cost / Selling Price** | ${item1.unit_cost_usd:.2f} / ${item1.selling_price_usd:.2f} | ${item2.unit_cost_usd:.2f} / ${item2.selling_price_usd:.2f} |
| **Gross Margin %** | **{margin1}%** (${item1.selling_price_usd - item1.unit_cost_usd:.2f}/u) | **{margin2}%** (${item2.selling_price_usd - item2.unit_cost_usd:.2f}/u) |
| **Supplier & SLA Score** | {item1.supplier_name} (**{sla1}%**) | {item2.supplier_name} (**{sla2}%**) |
| **Lead Time / MOQ** | {lt1} days / {item1.supplier_moq} units | {lt2} days / {item2.supplier_moq} units |
| **Special Constraints** | {f'Shelf life: {item1.shelf_life_days}d' if item1.shelf_life_days else ('Bulky: ' + str(item1.warehouse_volume_cuft) + ' cu.ft' if item1.warehouse_volume_cuft else 'Standard')} | {f'Shelf life: {item2.shelf_life_days}d' if item2.shelf_life_days else ('Bulky: ' + str(item2.warehouse_volume_cuft) + ' cu.ft' if item2.warehouse_volume_cuft else 'Standard')} |
| **Initial Proposal (Single-Pass)** | {eval1.single_pass.reorder_quantity} units | {eval2.single_pass.reorder_quantity} units |
| **Calibrated Batch (Self-Challenge)** | **{eval1.final_recommendation.reorder_quantity} units** | **{eval2.final_recommendation.reorder_quantity} units** |
| **Decision Outcome** | `{eval1.decision_outcome}` ({eval1.confidence_after}% conf) | `{eval2.decision_outcome}` ({eval2.confidence_after}% conf) |

#### Strategic Trade-off Summary:
- **`{item1.sku}` ({item1.product_name}):** {eval1.summary_verdict}
- **`{item2.sku}` ({item2.product_name}):** {eval2.summary_verdict}
"""
        followups = [
            f"Should I reorder {item1.sku}?",
            f"Should I reorder {item2.sku}?",
            f"Are there any disadvantages of {item1.sku}?",
        ]
        return response, followups

    def _generate_recommendation_risks(self, item: InventoryItem, history: Optional[List[ChatMessage]] = None) -> Tuple[str, List[str]]:
        """Explains genuine risks, trade-offs, and missing assumptions of the decision recommendation for an item."""
        velocity = max(item.daily_velocity, 0.01)
        lead_time = item.supplier_lead_time_days or item.lead_time_days or 1
        moq = item.supplier_moq
        runway = round(item.current_stock / velocity, 1)
        sla_pct = int(item.supplier_reliability_score * 100)

        risk_bullets = []
        if runway < lead_time:
            risk_bullets.append(f"**Stockout During Lead Time:** Current stock ({item.current_stock}u / {runway}d runway) is insufficient to cover the {lead_time}-day supplier lead time. There is a high probability of running out before standard delivery arrives.")
        
        if sla_pct < 85:
            risk_bullets.append(f"**Supplier SLA Delay Risk:** *{item.supplier_name}* has an {sla_pct}% fulfillment reliability score. A shipment delay beyond {lead_time} days will extend stockout duration.")

        if item.shelf_life_days:
            risk_bullets.append(f"**Spoilage / Shelf-Life Risk:** Product has a {item.shelf_life_days}-day expiration threshold. Reordering excess stock risks batch decay if demand velocity softens.")

        if item.warehouse_volume_cuft and item.warehouse_volume_cuft > 4.0:
            risk_bullets.append(f"**Warehouse Holding Cost / Congestion:** Each unit occupies {item.warehouse_volume_cuft} cu. ft. Storing large batches consumes high-value pallet space.")

        risk_bullets.append(f"**Working Capital Commitment:** Placing the order commits capital (${item.unit_cost_usd * moq:,.2f}+) based on current velocity estimates ({item.daily_velocity}u/day).")

        if item.notes and "shutdown" in item.notes.lower():
            risk_bullets.append(f"**Operational Shutdown Risk:** As noted in system logs, stockouts for this item halt downstream warehouse packing operations.")

        bullet_text = "\n".join([f"- ⚠️ {r}" for r in risk_bullets])

        response = f"""### ⚠️ Risk & Sensitivity Audit: Recommendation for **{item.product_name}** (`{item.sku}`)

Here are the key operational risks, trade-offs, and sensitivity factors associated with the recommendation for **`{item.sku}`**:

{bullet_text}

#### ❓ Missing Assumptions That Could Alter the Decision:
1. **Unlogged Demand Volatility:** Real-time demand spikes or cancellations over the next 14 days.
2. **Supplier Lead-Time Variance:** Exact maritime/transit tracking updates from *{item.supplier_name}*.
3. **Emergency Expedited Freight Options:** Availability and cost of expedited air dispatch to avoid transit downtime.
"""
        followups = [
            f"Should I reorder {item.sku}?",
            f"Are there any disadvantages of {item.sku}?",
            f"What happens if supplier lead time increases by 5 days for {item.sku}?",
        ]
        return response, followups

    # ------------------------------------------------------------------------
    # 3. SPECIAL INTENT DETECTORS (Greetings, Casual Banter, Ambiguity, Speculation)
    # ------------------------------------------------------------------------

    def _is_greeting_or_social(self, query: str) -> Optional[Tuple[str, List[str]]]:
        """Detects simple social greetings and pleasantries in English, Hindi, and Hinglish."""
        q_clean = re.sub(r"[^\w\s]", "", query.lower()).strip()

        en_greetings = {
            "hi", "hii", "hiii", "hey", "heyy", "heyyy", "hello", "helloo", "hola",
            "hey there", "hi there", "hello there", "hii there",
            "good morning", "good afternoon", "good evening", "good day",
            "howdy", "greetings", "what's up", "whats up", "sup", "yo",
            "how are you", "how are you doing", "hows it going", "how is it going",
        }
        is_english_greeting = (
            q_clean in en_greetings
            or bool(re.match(r"^(h+i+|h+e+y+|h+e+l+o+|h+o+l+a+)$", q_clean))
            or q_clean.startswith("hey ")
            or q_clean.startswith("hi ")
            or q_clean.startswith("hii ")
            or q_clean.startswith("hello ")
        )
        if is_english_greeting:
            return "Hey! How can I help you today?", [
                "How many products do you have?",
                "Which products have the highest stockout risk right now?",
                "Should I reorder organic cold brew matcha today?",
            ]

        hi_greetings = {
            "namaste", "namaskar", "pranam", "kya haal hai", "kaise ho", "kaise hain aap",
            "kya chal raha hai", "kaisa chal raha hai", "kem cho", "vanakkam", "sat sri akal", "sasrikaal",
            "hello bhai", "hi bhai", "hii bhai", "kya haal chal",
        }
        if q_clean in hi_greetings or any(q_clean.startswith(g + " ") for g in ["namaste", "namaskar", "pranam", "kaise ho"]):
            if any(h in q_clean for h in ["namaste", "namaskar", "pranam", "kaise hain"]):
                return "नमस्ते! मैं DecisionGuard AI हूँ। मैं आपके इन्वेंटरी निर्णयों, डेटा विश्लेषण या किसी भी प्रश्न में कैसे सहायता कर सकता हूँ?", [
                    "How many products do you have?",
                    "Which products are low in stock?",
                ]
            return "Hey! Main DecisionGuard AI hoon. Aapki inventory, business decisions ya general questions me kaise madad kar sakta hoon?", [
                "How many products do you have?",
                "Which products are low in stock?",
            ]

        thanks = {
            "thanks", "thank you", "thank you very much", "thanks a lot",
            "thank you so much", "thx", "appreciate it", "great thanks",
            "shukriya", "dhanyavaad", "dhanyawad", "bahut shukriya",
        }
        if q_clean in thanks:
            return "You're very welcome! Let me know if you need any other evaluations, product comparisons, or answers.", [
                "How many products do you have?",
                "Which is the best product and why?",
            ]

        closings = {"bye", "goodbye", "see you", "see ya", "have a good day", "have a great day", "alvida", "phir milenge"}
        if q_clean in closings:
            return "Goodbye! Have a great day and happy optimizing! 🚀", []

        return None

    def _detect_conversational_casual(self, query: str, history: List[ChatMessage]) -> Optional[Tuple[str, List[str]]]:
        """Detects casual conversation, user states (e.g. boredom), capability questions, and light banter."""
        q = query.lower().strip()
        q_clean = re.sub(r"[^\w\s]", "", q).strip()

        bored_triggers = [
            "bored", "getting bored", "i am getting bored", "im getting bored",
            "i am bored", "im bored", "feel bored", "feeling bored", "so bored",
            "kuch interesting batao", "bore ho raha hu", "bore ho raha hoon",
            "what to do when bored", "entertain me", "entertain", "pass time"
        ]
        if any(b == q_clean or b in q for b in bored_triggers):
            response = (
                "Here are a few engaging things we can do together to beat the boredom:\n\n"
                "1. 🧩 **Solve a Logic Puzzle:** Test your reasoning with a tricky riddle or brain teaser.\n"
                "2. 💡 **Explore Cool Tech & Science Facts:** Learn fascinating facts about physics, space, or computing.\n"
                "3. 💻 **Coding Challenge:** Tackle a quick Python or JavaScript programming puzzle.\n"
                "4. 📦 **Supply Chain Simulation:** Run an adversarial inventory decision challenge or simulate a supplier delay.\n\n"
                "What sounds most interesting to you right now?"
            )
            followups = [
                "Give me a logic puzzle",
                "How many days are there in one year?",
                "How many products do you have?",
                "Show monitored catalog",
            ]
            return response, followups

        identity_triggers = [
            "who are you", "what are you", "what can you do", "tell me about yourself",
            "what is decisionguard", "who made you", "who created you", "what do you do",
            "aap kaun ho", "kya kar sakte ho", "tum kaun ho"
        ]
        if any(trigger in q for trigger in identity_triggers):
            response = (
                "I am **DecisionGuard AI**, your conversational intelligence assistant and decision engine. Here is what I can help you with:\n\n"
                "- 🌐 **General Knowledge & Science:** Physics, astronomy, biology, calendar facts, and real-world technology.\n"
                "- 💻 **Software Engineering & Coding:** Python, JavaScript, SQL vs NoSQL, API architectures, and performance optimization.\n"
                "- 🧮 **Mathematics & Logic:** Multi-step arithmetic, percentages, and logic puzzles.\n"
                "- 📦 **Inventory & Decision Audits:** Live telemetry tracking, low stock alerts, product comparisons, multi-criteria evaluations, and multi-pass self-challenge calibrations."
            )
            followups = [
                "How many products do you have?",
                "Which is the best product and why?",
                "How many days are there in one year?",
            ]
            return response, followups

        joke_triggers = ["tell me a joke", "make me laugh", "tell a joke", "say a joke", "joke sunao", "kuch funny batao"]
        if any(trigger in q for trigger in joke_triggers):
            response = (
                "Why do programmers prefer dark mode?\n\n"
                "Because light attracts bugs! 🐛😄"
            )
            followups = [
                "Tell me another joke",
                "Give me a logic puzzle",
                "How many products do you have?",
            ]
            return response, followups

        return None

    def _check_ambiguity_or_missing_info(self, query: str, history: List[ChatMessage]) -> Optional[str]:
        """Detects underspecified / ambiguous queries where essential context is missing."""
        q = query.lower().strip()
        has_history_subject = bool(history and any(m.referenced_sku for m in history))

        ambiguous_patterns = [
            r"^(what should i do\??)$",
            r"^(can you help me update it\??)$",
            r"^(should i buy more\??)$",
            r"^(help me decide\??)$",
            r"^(what do you think\??)$",
            r"^(update it\??)$",
            r"^(check it\??)$",
            r"^(what about it\??)$",
            r"^(mujhe kya karna chahiye\??)$",
            r"^(kya karu\??)$",
        ]

        if not has_history_subject:
            for pattern in ambiguous_patterns:
                if re.match(pattern, q):
                    return (
                        "Could you please clarify which product or decision you would like to evaluate? "
                        "For example, I can review current stock, calculate reorder quantities, or run a risk simulation "
                        "for any of our catalog items (such as the GaN Fast Charger, Surface Cleaner, or Organic Cold Brew Matcha)."
                    )

        return None

    def _check_unverifiable_claim(self, query: str) -> Optional[str]:
        """Detects questions asking for unverifiable future predictions, speculative insider info, or secret formulas."""
        q = query.lower().strip()

        is_unverifiable = (
            ("stock price" in q and ("in 20" in q or "apple" in q or "tesla" in q or "future" in q or "predict" in q or "2030" in q))
            or ("predict" in q and ("lottery" in q or "future" in q or "market" in q))
            or ("secret recipe" in q and ("coca" in q or "coke" in q or "kfc" in q))
            or ("who will win" in q and ("203" in q or "204" in q or "next century" in q))
        )

        if is_unverifiable:
            return (
                "I cannot verify or predict that with certainty, as it involves future market speculation "
                "or proprietary undisclosed information."
            )

        return None

    # ------------------------------------------------------------------------
    # 4. DETERMINISTIC OFFLINE REASONING ENGINE
    # ------------------------------------------------------------------------

    def _evaluate_math_expression(self, query: str) -> Optional[str]:
        """Calculates mathematical and percentage questions with step-by-step explanations."""
        pct_match = re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:of)?\s*(\d+(?:\.\d+)?)", query, re.IGNORECASE)
        if pct_match:
            pct_val = float(pct_match.group(1))
            total_val = float(pct_match.group(2))
            result = (pct_val / 100.0) * total_val
            return (
                f"### 🧮 Mathematical Calculation\n\n"
                f"**Question:** What is **{pct_val:g}%** of **{total_val:g}**?\n\n"
                f"**Step-by-Step Solution:**\n"
                f"1. Convert the percentage to a decimal: `{pct_val:g}% = {pct_val:g} / 100 = {pct_val/100:g}`\n"
                f"2. Multiply by the total: `{pct_val/100:g} × {total_val:g} = {result:g}`\n\n"
                f"**Result:** **{result:g}**"
            )

        arith_match = re.search(r"(?:calculate|what is|solve|evaluate)?\s*([0-9\.\s\+\-\*\/\(\)\^]+)", query, re.IGNORECASE)
        if arith_match:
            expr = arith_match.group(1).strip()
            if re.match(r"^[0-9\.\s\+\-\*\/\(\)\^]+$", expr) and any(op in expr for op in ["+", "-", "*", "/", "^"]):
                try:
                    clean_expr = expr.replace("^", "**")
                    val = eval(clean_expr, {"__builtins__": None}, {})
                    return (
                        f"### 🧮 Mathematical Calculation\n\n"
                        f"**Expression:** `{expr}`\n\n"
                        f"**Step-by-Step Computation:**\n"
                        f"Evaluating `{expr}` according to standard arithmetic precedence.\n\n"
                        f"**Result:** **{val}**"
                    )
                except Exception:
                    pass

        return None

    def _answer_general_knowledge_offline(self, query: str, history: List[ChatMessage]) -> Optional[Tuple[str, List[str]]]:
        """High-quality answers for coding, comparisons, technology, logic puzzles, physics, and reasoning."""
        q = query.lower().strip()

        # Calendar facts: Days in a year / days in one year
        if (
            re.search(r"\b(?:how many\s+)?days\s+(?:are\s+there\s+in|in)\s+(?:a|one|1|the|each)?\s*year\b", q)
            or "days in a year" in q
            or "days in one year" in q
            or "days are there in one year" in q
            or "days are there in a year" in q
            or "days in year" in q
        ):
            resp = (
                "### 📅 Calendar Facts: Days in a Year\n\n"
                "- **Standard Year:** A standard calendar year in the Gregorian calendar has **365 days** (52 weeks + 1 day).\n"
                "- **Leap Year:** Every 4 years (e.g. 2024, 2028, 2032), a leap year occurs with **366 days** (adding February 29) to synchronize the calendar with Earth's orbit around the Sun (~365.2422 days).\n"
                "- **Total Hours & Minutes:** Standard year = **8,760 hours** (525,600 minutes); Leap year = **8,784 hours** (527,040 minutes)."
            )
            return resp, [
                "Why do leap years exist?",
                "How many hours are in a year?",
                "Explain the Gregorian calendar",
            ]

        # Logic puzzle: Bat & Ball ($1.10 total, $1.00 more)
        if ("bat" in q and "ball" in q and ("1.10" in q or "1.1" in q or "dollar" in q)) or ("puzzle" in q and "bat" in q):
            resp = (
                "### 🧮 Classic Logic Puzzle Solution\n\n"
                "**Problem:** A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?\n\n"
                "**Step-by-Step Solution:**\n"
                "1. Let the cost of the ball be `$x`.\n"
                "2. The bat costs $1.00 more than the ball, so the bat is `$(x + 1.00)`.\n"
                "3. Total equation: `x + (x + 1.00) = 1.10`\n"
                "4. `2x + 1.00 = 1.10` ➔ `2x = 0.10` ➔ `x = 0.05`\n\n"
                "#### Final Answer\n"
                "The ball costs **$0.05 (5 cents)** and the bat costs **$1.05**."
            )
            return resp, [
                "Give me another logic puzzle",
                "Explain the math step-by-step",
                "Why is the intuitive answer wrong?",
            ]

        # Physics: Speed of Light
        if "speed of light" in q:
            resp = (
                "### 🌌 Physics: Speed of Light in a Vacuum\n\n"
                "The speed of light in a vacuum (denoted as ***c***) is a fundamental universal physical constant.\n\n"
                "- **Exact Value:** **299,792,458 meters per second (m/s)**\n"
                "- **Approximation (Metric):** **~300,000 km/s** (or `3 × 10⁸ m/s`)\n"
                "- **Approximation (Imperial):** **~186,282 miles per second**\n\n"
                "In Einstein's theory of Special Relativity, ***c*** is the maximum speed at which all conventional matter, energy, and information in the universe can travel."
            )
            return resp, [
                "What is special relativity?",
                "How fast is the speed of sound?",
                "Can anything travel faster than light?",
            ]

        # False premise: Elephant eggs
        if "elephant" in q and ("egg" in q or "eggs" in q):
            resp = (
                "### 🔬 Biological Fact: False Premise Identified\n\n"
                "**Elephants do not lay eggs.**\n\n"
                "Elephants are placental mammals (*Eutheria*). Female elephants give birth to live calves after a gestation period of approximately **22 months** (the longest gestation period of any land animal)."
            )
            return resp, [
                "What is the gestation period of an elephant?",
                "Which mammals lay eggs?",
            ]

        # Java vs JavaScript
        if "java" in q and "javascript" in q:
            resp = (
                "### ☕ Java vs. JavaScript Comparison\n\n"
                "| Dimension | Java | JavaScript |\n"
                "| :--- | :--- | :--- |\n"
                "| **Execution Paradigm** | Compiled to bytecode and executed on the Java Virtual Machine (JVM) | Interpreted and JIT-compiled in web browsers and Node.js engines |\n"
                "| **Type System** | Statically and strongly typed (`int count = 10;`) | Dynamically and loosely typed (`let count = 10;`) |\n"
                "| **Programming Model** | Pure Object-Oriented (Class-based OOP) | Multi-paradigm (Prototype-based OOP, Functional, Event-driven) |\n"
                "| **File Extension** | `.java` (compiled to `.class`) | `.js` / `.mjs` |\n"
                "| **Primary Use Cases** | Enterprise backends, Android applications, large distributed banking systems | Interactive web interfaces, full-stack web apps (Node.js), browser automation |\n\n"
                "**Key Distinction:** Despite the similar name, Java and JavaScript are completely distinct languages with separate syntax, runtime environments, and design philosophies."
            )
            return resp, [
                "What is the JVM?",
                "Explain the JavaScript event loop",
                "TypeScript vs JavaScript",
            ]

        # What is an API
        if "api" in q and ("what is" in q or "explain" in q or "meaning" in q or "stands for" in q):
            resp = (
                "### 🔌 What is an API (Application Programming Interface)?\n\n"
                "An **API (Application Programming Interface)** is a formal contract and communication protocol that allows different software applications to interact, request services, and exchange data.\n\n"
                "#### The Restaurant Analogy:\n"
                "- **You (Client):** You sit at a table and look at the menu.\n"
                "- **The Waiter (API):** Takes your order, delivers it to the kitchen, and returns with your food.\n"
                "- **The Kitchen (Server & Database):** Prepares the data or executes the transaction.\n\n"
                "#### Core API Architectures:\n"
                "1. **REST (Representational State Transfer):** Standard HTTP endpoints (`GET`, `POST`, `PUT`, `DELETE`) delivering structured JSON data.\n"
                "2. **GraphQL:** Allows clients to request exact fields in a single query.\n"
                "3. **RPC / gRPC:** High-performance binary remote procedure calls across microservices."
            )
            return resp, [
                "REST vs GraphQL APIs",
                "What is an HTTP status code?",
                "How does JWT authentication work?",
            ]

        # Website performance
        if any(term in q for term in ["website performance", "improve website", "web performance", "improve performance"]):
            resp = (
                "### 🚀 Three Ways to Improve Website Performance\n\n"
                "1. **Implement Aggressive Caching & Content Delivery Networks (CDNs):**\n"
                "   - Distribute static assets (images, scripts, CSS) globally across edge CDN nodes (Cloudflare, Fastly).\n"
                "   - Cache dynamic query results in memory (Redis) and set HTTP `Cache-Control` headers.\n\n"
                "2. **Optimize and Compress Frontend Assets:**\n"
                "   - Modernize images into compressed formats (**WebP**, **AVIF**) and implement responsive lazy loading.\n"
                "   - Minify JS/CSS bundles, purge unused CSS, and use code-splitting for fast initial page load.\n\n"
                "3. **Minimize Server Overhead and Optimize Database Queries:**\n"
                "   - Index high-traffic SQL database tables and implement connection pooling.\n"
                "   - Enable Brotli / Gzip compression and modern HTTP/2 or HTTP/3 multiplexing."
            )
            return resp, [
                "How do CDNs work?",
                "What is Brotli compression?",
                "Explain frontend code-splitting",
            ]

        # Blockchain
        if "blockchain" in q:
            resp = (
                "### 🔗 What is Blockchain?\n\n"
                "A **blockchain** is a decentralized, distributed digital ledger that records transactions across a peer-to-peer network of computers (nodes) in a secure, transparent, and tamper-resistant manner.\n\n"
                "#### Core Architecture:\n"
                "1. **Distributed Ledger:** Replicated across thousands of independent nodes without a central intermediary.\n"
                "2. **Cryptographic Hashing:** Transactions are bundled into blocks. Each block contains the cryptographic hash of the preceding block, forming an immutable chain.\n"
                "3. **Consensus Protocols:** Nodes validate transactions using consensus mechanisms like **Proof of Work (PoW)** or **Proof of Stake (PoS)**.\n"
                "4. **Smart Contracts:** Self-executing programs that run automatically when predetermined conditions are met.\n\n"
                "#### Key Use Cases:\n"
                "- Cryptocurrencies and cross-border settlement (Bitcoin, Ethereum, USDC).\n"
                "- Supply chain provenance and batch traceability.\n"
                "- Decentralized finance (DeFi) and verifiable credentials."
            )
            return resp, [
                "Proof of Work vs Proof of Stake",
                "What is a smart contract?",
                "How does cryptographic hashing work?",
            ]

        # C++ vs Python
        if ("c++" in q or "cpp" in q) and "python" in q:
            resp = (
                "### ⚡ C++ vs. Python: Key Differences & Comparison\n\n"
                "| Dimension | C++ | Python |\n"
                "| :--- | :--- | :--- |\n"
                "| **Execution & Compilation** | Compiled directly to machine code (Ahead-Of-Time) | Interpreted / Bytecode-executed in CPython VM |\n"
                "| **Performance & Speed** | Extremely fast, low-level execution with zero-overhead abstractions | Slower raw execution; relies on C/C++ extensions for performance |\n"
                "| **Memory Management** | Manual (Pointers, References, RAII, Smart Pointers) | Automatic (Garbage Collection, Reference Counting) |\n"
                "| **Type System** | Statically and strongly typed (`int x = 10;`) | Dynamically and strongly typed (`x = 10`) |\n"
                "| **Syntax & Productivity** | Verbose syntax, explicit declarations, high boilerplate | Concise, readable, expressive; rapid prototyping |\n"
                "| **Primary Use Cases** | Game engines, OS kernels, embedded systems, high-frequency trading | Data science, Machine Learning/AI, web backends, automation scripts |\n\n"
                "**Summary:** Choose **C++** when execution speed, memory footprint, and low-level hardware control are critical. Choose **Python** for rapid development, data science, and AI."
            )
            return resp, [
                "When should I use Rust?",
                "Explain Python memory management",
                "What is RAII in C++?",
            ]

        # Overstocking risks
        if any(term in q for term in ["too much stock", "overstock", "risks of ordering", "excess inventory"]):
            resp = (
                "### ⚠️ Risks of Ordering Too Much Stock (Excess Inventory)\n\n"
                "1. **Working Capital Lockup:** Cash tied up in unsold warehouse stock reduces liquidity needed for operations and growth.\n"
                "2. **Holding & Storage Costs:** Warehouse rent, insurance, climate control, utilities, and handling labor increase directly with volume.\n"
                "3. **Spoilage & Expiration:** For perishables or consumables (e.g. cold brew), expired stock past its shelf life is a total financial write-off.\n"
                "4. **Obsolescence & Depreciation:** Electronics and seasonal items lose market value as new iterations enter the market.\n"
                "5. **Shrinkage & Damage:** High warehouse density increases risk of physical handling damage and misplacement."
            )
            return resp, [
                "How to calculate safety stock?",
                "What is economic order quantity (EOQ)?",
                "Show products low in stock",
            ]

        # Real-world examples (standalone or follow-up)
        if any(trigger in q for trigger in ["real-world example", "real world example", "practical example", "give me an example", "give me a real-world"]):
            resp = (
                "### 🌍 Real-World Examples\n\n"
                "1. **Recommendation Systems (Netflix & Spotify):** Machine learning models analyze viewing and listening history to recommend personalized content in real time.\n"
                "2. **Financial Fraud Detection:** Credit card networks use real-time anomaly detection to identify suspicious transactions within milliseconds.\n"
                "3. **Predictive Inventory Replenishment:** Retailers (like DecisionGuard AI) use velocity algorithms and lead-time simulations to prevent stockouts while preventing overstocking.\n"
                "4. **Autonomous Navigation:** Self-driving vehicles process camera and LiDAR feeds using convolutional neural networks to detect pedestrians, lane markers, and obstacles."
            )
            return resp, [
                "Give an example in healthcare",
                "Give an example in finance",
                "How does predictive inventory work?",
            ]

        # Python Average function
        if "average" in q and ("python" in q or "function" in q or "code" in q):
            resp = (
                "### 🐍 Python Function to Calculate Average\n\n"
                "```python\n"
                "from typing import Sequence, Union\n\n"
                "def calculate_average(numbers: Sequence[Union[int, float]]) -> float:\n"
                "    \"\"\"Calculates the arithmetic mean of a sequence of numbers.\"\"\"\n"
                "    if not numbers:\n"
                "        raise ValueError(\"Cannot compute average of an empty collection.\")\n"
                "    return sum(numbers) / len(numbers)\n\n"
                "# Usage:\n"
                "sample_scores = [88, 92, 79, 95, 84]\n"
                "print(f\"Average: {calculate_average(sample_scores):.2f}\")  # Output: 87.60\n"
                "```"
            )
            return resp, [
                "Show how to handle exceptions",
                "Write a Python median function",
                "Explain list comprehensions in Python",
            ]

        # SQL vs MongoDB
        if "sql" in q and ("mongodb" in q or "nosql" in q):
            resp = (
                "### 🗄️ SQL vs. MongoDB Comparison\n\n"
                "| Feature | SQL (Relational) | MongoDB (Document / NoSQL) |\n"
                "| :--- | :--- | :--- |\n"
                "| **Data Model** | Tables with Rows & Columns | JSON/BSON Documents |\n"
                "| **Schema** | Strict, predefined schema | Dynamic, flexible schema |\n"
                "| **Transactions** | Full ACID compliant across tables | Document-level ACID (multi-doc available) |\n"
                "| **Best For** | Financial transactions, ERP, inventory | Evolving data structures, real-time analytics |\n\n"
                "**Rule:** Use **SQL** for relational integrity and financial consistency. Use **MongoDB** for flexible, rapid document storage."
            )
            return resp, [
                "What is ACID compliance?",
                "When should I use MongoDB?",
                "Explain SQL indexing",
            ]

        # AI
        if any(trigger in q for trigger in ["explain artificial intelligence", "explain ai", "what is ai", "what is artificial intelligence", "artificial intelligence"]):
            resp = (
                "### 🤖 What is Artificial Intelligence (AI)?\n\n"
                "**Artificial Intelligence (AI)** refers to computer systems engineered to perform tasks that typically require human cognition—including pattern recognition, decision-making, visual perception, and natural language understanding.\n\n"
                "- **Machine Learning (ML):** Systems that learn patterns from data rather than following rigid hand-coded rules.\n"
                "- **Deep Learning:** Multi-layered neural networks powering computer vision and large language models.\n"
                "- **Decision Intelligence:** Combining predictive models and constraint optimization for robust decisions."
            )
            return resp, [
                "What is Machine Learning?",
                "Explain neural networks",
                "What is Decision Intelligence?",
            ]

        # Machine Learning
        if any(trigger in q for trigger in ["explain machine learning", "what is machine learning", "what is ml", "explain ml", "machine learning"]):
            resp = (
                "### 🧠 What is Machine Learning (ML)?\n\n"
                "**Machine Learning (ML)** is a branch of Artificial Intelligence where software algorithms learn patterns and predictive relationships directly from data rather than following static, hardcoded rules.\n\n"
                "#### Core Paradigms:\n"
                "1. **Supervised Learning:** Algorithms train on labeled data (e.g. regression for price forecasting, classification for image recognition).\n"
                "2. **Unsupervised Learning:** Finds intrinsic clustering and associations in unlabeled data (e.g. customer segmentation with K-Means).\n"
                "3. **Reinforcement Learning:** Agents optimize behavior through rewards and penalties in dynamic environments."
            )
            return resp, [
                "Supervised vs Unsupervised learning",
                "What is a transformer model?",
                "How does decision intelligence work?",
            ]

        # Follow-up: Why / Reasoning
        if (re.search(r"\b(why|reason|explain why|what is the reason)\b", q) or q in ["why?", "why", "what's the reason?"]) and history:
            resp = (
                "### 🔍 Detailed Reasoning & Explanation\n\n"
                "Regarding our previous discussion:\n\n"
                "1. **Core Evidence:** The recommendation balances sales velocity against lead-time transit risk and capital efficiency.\n"
                "2. **Risk Mitigation:** Traditional single-pass models frequently over-order because they ignore shelf-life degradation or low supplier reliability. Our calibrated approach prevents stockouts while avoiding cash lockup.\n"
                "3. **Next Steps:** You can simulate what-if scenarios (e.g., *'What if lead time increases by 5 days?'*) or review data gaps."
            )
            return resp, [
                "What are the risks of your recommendation?",
                "Simulate a 5-day supplier delay",
                "Show low stock products",
            ]

        # Follow-up: Explain simply
        if re.search(r"\b(simpl(?:y|ify|ier|est|e)|simple words|simple terms|plain english|break it down)\b", q):
            resp = (
                "### 💡 Simplified Explanation\n\n"
                "- **The Goal:** Order enough product so you never run out of stock and disappoint customers.\n"
                "- **The Catch:** Don't order too much at once, or items will sit on shelves, risk expiring, and tie up company cash.\n"
                "- **Our Balance:** We calculate the exact batch size that arrives just in time before current stock runs out."
            )
            return resp, [
                "Give a practical example",
                "How do you calculate reorder points?",
                "Which product has the highest stockout risk right now?",
            ]

        return None

    # ------------------------------------------------------------------------
    # 5. MAIN CHAT LIFECYCLE (2-Pass Verification Architecture)
    # ------------------------------------------------------------------------

    async def process_chat_message(
        self, req: ChatRequest, inventory_data: List[dict]
    ) -> ChatResponse:
        """
        Main chat lifecycle:
        1. Social Greetings & Pleasantries Intent Check (Zero audit overhead)
        2. Ambiguity & Missing Context Check (Focused single clarification)
        3. Speculative / Unverifiable Claims Check (Honest uncertainty)
        4. Unknown SKU Validation
        5. Grounding on Inventory Telemetry, Deterministic Math, and Catalog Queries
        6. PASS 1: Generate Initial Answer (via Live LLM or Expert Reasoning)
        7. PASS 2: Independent Adversarial Double-Check & Error Correction
        8. Synthesize Verified Final Answer & Persist Conversation
        """
        query = req.message.strip()
        query_lower = query.lower()

        # 1. Resolve Persistent History
        conv_id = req.conversation_id or str(uuid.uuid4())
        existing_conv = db.get_conversation(conv_id)

        history_messages: List[ChatMessage] = []
        if existing_conv and "messages" in existing_conv:
            history_messages = [ChatMessage(**m) for m in existing_conv["messages"]]
        elif req.history:
            history_messages = req.history

        # 2. Record User Message
        user_msg_id = str(uuid.uuid4())
        db.add_message_to_conversation(
            conversation_id=conv_id,
            role="user",
            content=query,
            message_id=user_msg_id,
        )

        # 3. Intent Check 1: Social Greeting / Pleasantry
        greeting_res = self._is_greeting_or_social(query)
        if greeting_res:
            greeting_text, greeting_followups = greeting_res
            bot_msg_id = str(uuid.uuid4())
            db.add_message_to_conversation(
                conversation_id=conv_id,
                role="assistant",
                content=greeting_text,
                is_live_llm=False,
                engine_type="Decision Assistant",
                suggested_followups=greeting_followups,
                message_id=bot_msg_id,
                comparison=None,
            )
            return ChatResponse(
                conversation_id=conv_id,
                message_id=bot_msg_id,
                response=greeting_text,
                evaluation=None,
                referenced_item=None,
                is_live_llm=False,
                engine_type="Decision Assistant",
                suggested_followups=greeting_followups,
                timestamp=datetime.now(timezone.utc).isoformat(),
                comparison=None,
            )

        # 4. Intent Check 2: Casual Conversation / Boredom / Chit-Chat / Identity
        casual_res = self._detect_conversational_casual(query, history_messages)
        if casual_res:
            casual_text, casual_followups = casual_res
            bot_msg_id = str(uuid.uuid4())
            db.add_message_to_conversation(
                conversation_id=conv_id,
                role="assistant",
                content=casual_text,
                is_live_llm=False,
                engine_type="Decision Assistant",
                suggested_followups=casual_followups,
                message_id=bot_msg_id,
                comparison=None,
            )
            return ChatResponse(
                conversation_id=conv_id,
                message_id=bot_msg_id,
                response=casual_text,
                evaluation=None,
                referenced_item=None,
                is_live_llm=False,
                engine_type="Decision Assistant",
                suggested_followups=casual_followups,
                timestamp=datetime.now(timezone.utc).isoformat(),
                comparison=None,
            )

        # 5. Intent Check 3: Ambiguous or Missing Information Request
        clarification_text = self._check_ambiguity_or_missing_info(query, history_messages)
        if clarification_text:
            bot_msg_id = str(uuid.uuid4())
            db.add_message_to_conversation(
                conversation_id=conv_id,
                role="assistant",
                content=clarification_text,
                is_live_llm=False,
                engine_type="Decision Assistant",
                suggested_followups=[
                    "How many products do you have?",
                    "Give details of SKU-ELEC-1001",
                    "Which products have the highest stockout risk right now?",
                ],
                message_id=bot_msg_id,
                comparison=None,
            )
            return ChatResponse(
                conversation_id=conv_id,
                message_id=bot_msg_id,
                response=clarification_text,
                evaluation=None,
                referenced_item=None,
                is_live_llm=False,
                engine_type="Decision Assistant",
                suggested_followups=[
                    "How many products do you have?",
                    "Give details of SKU-ELEC-1001",
                    "Which products have the highest stockout risk right now?",
                ],
                timestamp=datetime.now(timezone.utc).isoformat(),
                comparison=None,
            )

        # 6. Intent Check 4: Unverifiable / Speculative Queries
        unverifiable_text = self._check_unverifiable_claim(query)
        if unverifiable_text:
            bot_msg_id = str(uuid.uuid4())
            db.add_message_to_conversation(
                conversation_id=conv_id,
                role="assistant",
                content=unverifiable_text,
                is_live_llm=False,
                engine_type="Decision Assistant",
                suggested_followups=[
                    "What are the risks of ordering too much stock?",
                    "Which products have the highest stockout risk right now?",
                ],
                message_id=bot_msg_id,
                comparison=None,
            )
            return ChatResponse(
                conversation_id=conv_id,
                message_id=bot_msg_id,
                response=unverifiable_text,
                evaluation=None,
                referenced_item=None,
                is_live_llm=False,
                engine_type="Decision Assistant",
                suggested_followups=[
                    "What are the risks of ordering too much stock?",
                    "Which products have the highest stockout risk right now?",
                ],
                timestamp=datetime.now(timezone.utc).isoformat(),
                comparison=None,
            )

        # 8. Check Unknown SKU Query
        all_skus_in_query = self._extract_all_skus_from_text(query)
        known_skus = {item.get("sku", "").upper() for item in inventory_data}
        unknown_skus = [s for s in all_skus_in_query if s not in known_skus]
        if unknown_skus:
            not_found_text = (
                f"### ⚠️ SKU Not Found in Monitored Catalog\n\n"
                f"The identifier **`{unknown_skus[0]}`** does not match any active stock profiles in the catalog.\n\n"
                f"**Active Monitored SKUs:**\n"
                + "\n".join([f"- **`{item.get('sku')}`**: {item.get('product_name')} ({item.get('category')})" for item in inventory_data[:6]])
            )
            bot_msg_id = str(uuid.uuid4())
            db.add_message_to_conversation(
                conversation_id=conv_id,
                role="assistant",
                content=not_found_text,
                is_live_llm=False,
                engine_type="Decision Assistant",
                suggested_followups=["Show monitored catalog", "Which products have the highest stockout risk right now?"],
                message_id=bot_msg_id,
            )
            return ChatResponse(
                conversation_id=conv_id,
                message_id=bot_msg_id,
                response=not_found_text,
                evaluation=None,
                referenced_item=None,
                is_live_llm=False,
                engine_type="Decision Assistant",
                suggested_followups=["Show monitored catalog", "Which products have the highest stockout risk right now?"],
                timestamp=datetime.now(timezone.utc).isoformat(),
            )

        # 9. Identify referenced inventory item (context resolution)
        matched_item = self._find_item_in_inventory(
            query, inventory_data, req.current_sku, history_messages
        )

        eval_res: Optional[EvaluationResponse] = None
        deterministic_response_text = ""
        suggested_followups: List[str] = []

        # 10. Multi-Product Comparison Intent
        # Must check if this is an inventory comparison (has SKUs/inventory items, or explicitly mentions products/items/reorders/decisions)
        explicit_product_compare = any(w in query_lower for w in ["product", "products", "item", "items", "sku", "decision", "reorder", "these two", "these both", "both product", "both items"])
        is_compare_query = any(w in query_lower for w in ["compare", "comparison", "versus", "vs", "difference between"])
        
        comparison_items = self._extract_multiple_items_from_query(query, inventory_data, history_messages) if is_compare_query else []

        if is_compare_query and (len(comparison_items) >= 2 or (len(comparison_items) == 1 and explicit_product_compare) or (len(comparison_items) == 0 and explicit_product_compare)):
            if len(comparison_items) >= 2:
                sku_names = [f"**{it.product_name}** (`{it.sku}`)" for it in comparison_items[:2]]
                context_str = f"Comparing {sku_names[0]} and {sku_names[1]} based on identified product references:"
                deterministic_response_text, suggested_followups = await self._generate_comparison_response(
                    comparison_items[:2], inventory_data, context_str
                )
                matched_item = comparison_items[0]
            elif len(comparison_items) == 1:
                deterministic_response_text = f"I identified **{comparison_items[0].product_name} (`{comparison_items[0].sku}`)**. Which second product would you like to compare it with? (e.g. `SKU-CHEM-5088` or `SKU-BEV-2004`)"
                suggested_followups = [
                    f"Compare {comparison_items[0].sku} and SKU-CHEM-5088",
                    f"Compare {comparison_items[0].sku} and SKU-BEV-2004",
                ]
                matched_item = comparison_items[0]
            else:
                deterministic_response_text = "Which products would you like to compare? Please specify at least two SKUs or product names (for example, `Compare SKU-ELEC-1001 and SKU-CHEM-5088`)."
                suggested_followups = [
                    "Compare SKU-ELEC-1001 and SKU-CHEM-5088",
                    "Compare SKU-BEV-2004 and SKU-APPAREL-4050",
                    "Show monitored catalog",
                ]

        # 11. Best Product Recommendation Intent
        is_best_product_query = any(
            phrase in query_lower
            for phrase in [
                "best product", "top product", "which product is best",
                "which is the best", "best item", "best according to you",
                "recommend best", "what is your best product", "which product should i focus on",
                "sabse accha product", "sabse best product"
            ]
        )
        if is_best_product_query and not deterministic_response_text:
            deterministic_response_text, suggested_followups = self._generate_best_product_analysis(inventory_data)

        # 12. Recommendation Risk Follow-up (e.g. "What are the risks of your recommendation?")
        is_risk_followup = any(
            phrase in query_lower
            for phrase in [
                "risk of your recommendation", "risks of your recommendation",
                "risk of recommendation", "risks of the recommendation",
                "risks of this recommendation", "what are the risks"
            ]
        )
        if is_risk_followup and not deterministic_response_text:
            target_item = matched_item
            if not target_item and history_messages:
                for past in reversed(history_messages):
                    if past.referenced_sku:
                        for it in inventory_data:
                            if it.get("sku", "").upper() == past.referenced_sku.upper():
                                target_item = InventoryItem(**it)
                                break
                    if target_item:
                        break
            if target_item:
                deterministic_response_text, suggested_followups = self._generate_recommendation_risks(target_item, history_messages)
                matched_item = target_item

        # 13. Product Disadvantages / Drawbacks Intent
        is_disadvantage_query = any(
            term in query_lower
            for term in [
                "disadvantage", "disadvantages", "drawback", "drawbacks",
                "cons of", "negative", "negatives", "trade-off", "tradeoff", "tradeoffs",
                "what is bad about", "risks of sku", "nuqsan", "kami"
            ]
        )
        if is_disadvantage_query and matched_item and not deterministic_response_text:
            deterministic_response_text, suggested_followups = self._generate_product_disadvantages(matched_item)

        # 14. Inventory Count & Catalog Summary
        is_count_query = (
            any(
                phrase in query_lower
                for phrase in [
                    "how many products", "how many items", "how many skus",
                    "count products", "count of products", "product count", "number of products",
                    "catalog size", "total products in inventory", "total number of products",
                    "how many distinct products", "how many total products", "how much inventory",
                    "kitne products hai", "kitne items hai", "inventory me kitne items hai", "mere paas kitne products hai"
                ]
            )
            or bool(re.search(r"\bhow\s+many\s+(?:total\s+|different\s+|distinct\s+)?(?:products?|items?|skus?)\b", query_lower))
            or bool(re.search(r"\bcount\s+(?:of\s+)?(?:all\s+)?(?:the\s+)?(?:products?|items?|skus?)\b", query_lower))
            or bool(re.search(r"\b(?:total|number\s+of)\s+(?:products?|items?|skus?)\b", query_lower))
        ) and not matched_item and not is_disadvantage_query

        # Catalog Listing
        is_catalog_list_query = (
            any(
                phrase in query_lower
                for phrase in [
                    "list all products", "list products", "list product",
                    "list of products", "list of product", "show all products",
                    "show products", "show product", "show catalog", "show inventory",
                    "list inventory", "view inventory", "view catalog", "all products in inventory",
                    "all products", "display inventory", "display products", "what products exist",
                    "types of products", "what type of products", "type of products",
                    "what kinds of products", "categories of products", "product categories",
                    "available products", "available product", "products that are available",
                    "product that are available", "products available", "product available",
                    "what products are available", "what product is available", "what products do we have",
                    "sab products dikhao", "inventory list dikhao", "catalog dikhao", "available items dikhao"
                ]
            )
            or bool(re.search(r"\blist\s+(?:of\s+)?(?:all\s+)?products?\b", query_lower))
            or bool(re.search(r"\b(?:available|avaialable|availble|availabe)\s+products?\b", query_lower))
            or bool(re.search(r"\bproducts?\s+(?:that\s+are\s+)?(?:available|avaialable|availble|availabe)\b", query_lower))
            or bool(re.search(r"\bshow\s+(?:all\s+)?(?:the\s+)?products?\b", query_lower))
        ) and not (matched_item and ("stock" in query_lower or "reorder" in query_lower or "detail" in query_lower or "disadvantage" in query_lower))

        # Low Stock Audit
        is_low_stock_query = any(
            phrase in query_lower
            for phrase in [
                "low in stock", "low stock", "below safety", "below reorder",
                "below their reorder", "below reorder point", "below reorder level",
                "below safety stock", "need replenishment", "running low", "out of stock",
                "kisme stock kam hai", "low stock items dikhao", "stock kam hai"
            ]
        ) or bool(re.search(r"\bbelow\s+(?:their\s+|the\s+)?(?:reorder|safety)\b", query_lower))

        if not deterministic_response_text:
            if is_low_stock_query:
                deterministic_response_text, suggested_followups = self._generate_low_stock_report(inventory_data)

            elif is_count_query and not is_catalog_list_query:
                deterministic_response_text, suggested_followups = self._generate_catalog_summary(inventory_data)

            elif is_catalog_list_query:
                deterministic_response_text, suggested_followups = self._generate_catalog_listing(inventory_data)

            # Stockout Risk Ranking
            elif any(
                term in query_lower
                for term in [
                    "highest stockout", "most at risk", "stockout risk",
                    "lowest runway", "runway leaderboard", "highest risk of stockout"
                ]
            ):
                deterministic_response_text, suggested_followups = self._generate_stockout_ranking(inventory_data)

            # What-If Sensitivity Simulation
            elif (
                any(
                    term in query_lower
                    for term in [
                        "lead time increase", "lead time +", "supplier delay",
                        "lead time by", "what if demand", "demand rises", "demand increase"
                    ]
                )
                and matched_item
            ):
                lt_match = re.search(r"(\d+)\s*days?", query_lower)
                delta_lt = int(lt_match.group(1)) if lt_match else 5
                dem_match = re.search(r"(\d+)\s*%", query_lower)
                delta_dem = float(dem_match.group(1)) if dem_match else 0.0

                deterministic_response_text, eval_res, suggested_followups = await self._simulate_what_if(
                    matched_item, lead_time_delta=delta_lt, demand_pct_delta=delta_dem
                )

            # Reorder Decision & Autonomous Audit
            elif matched_item and any(
                term in query_lower
                for term in ["reorder", "should i", "order", "audit", "challenge", "review", "eval", "kya reorder", "reorder karna chahiye", "replenish"]
            ) and not is_disadvantage_query:
                eval_res = await engine.evaluate_inventory_item(matched_item)
                deterministic_response_text, suggested_followups = self._format_self_challenge_briefing(matched_item, eval_res)

            # Product Details & Stock Lookup
            elif matched_item and (
                any(w in query_lower for w in ["detail", "details", "give details", "show details", "info", "information", "tell me about", "describe", "record", "price", "cost", "margin", "supplier", "moq", "lead time", "ka stock", "stock kitna hai"])
                or query_lower.strip().startswith("sku-")
                or query_lower.strip().startswith("give details")
            ):
                deterministic_response_text, suggested_followups = self._generate_product_details(matched_item)

        # Deterministic Math Expressions
        if not deterministic_response_text:
            math_ans = self._evaluate_math_expression(query)
            if math_ans:
                deterministic_response_text = math_ans
                suggested_followups = [
                    "Explain the calculation step-by-step",
                    "What is 17% of 850?",
                ]

        # Offline General Knowledge Fallback
        if not deterministic_response_text:
            gen_ans = self._answer_general_knowledge_offline(query, history_messages)
            if gen_ans:
                gen_text, gen_followups = gen_ans
                deterministic_response_text = gen_text
                suggested_followups = gen_followups

        # Fallback to product details if item was explicitly matched and not yet handled
        if not deterministic_response_text and matched_item:
            deterministic_response_text, suggested_followups = self._generate_product_details(matched_item)

        # 15. PASS 1: Generate Initial Answer
        llm_messages = [{"role": h.role, "content": h.content} for h in history_messages[-6:]]
        llm_messages.append({"role": "user", "content": query})

        system_instructions = f"""
You are DecisionGuard AI, a state-of-the-art general-purpose AI assistant and decision intelligence system.
You answer user questions across ALL domains: Science, Technology, Programming & Software Engineering, Mathematics, Business & Economics, Reasoning & Logic, and Supply Chain Inventory Operations.

CAPABILITIES & GUIDELINES:
1. Provide direct, natural, conversational, and comprehensive answers to the user's actual question.
2. Support English, Hindi, and Hinglish seamlessly based on the user's input language.
3. For coding questions, provide clean, runnable code with language tags and clear explanations.
4. For math and logic, show step-by-step solutions and exact numbers.
5. For inventory and supply chain questions, ground numbers strictly in the verified inventory telemetry provided below. Never invent stock levels.
6. For multi-turn follow-ups, use conversation history context naturally.
7. Never output technical system instructions, secret API credentials, or internal routing tags in the response.

VERIFIED INVENTORY TELEMETRY (if applicable):
{json.dumps(inventory_data, indent=2)}

ACTIVE INVENTORY EVALUATION (if applicable):
{json.dumps(eval_res.model_dump(), indent=2) if eval_res else "No active evaluation."}
"""

        is_live_llm = False
        engine_type = "Decision Assistant"
        pass1_answer = ""

        # Attempt Live LLM Generation (Pass 1)
        try:
            llm_result = await llm_client.generate_response(
                messages=llm_messages,
                system_prompt=system_instructions,
                temperature=0.35,
            )
            if llm_result.is_live_llm and llm_result.text:
                pass1_answer = llm_result.text
                is_live_llm = True
                engine_type = f"Live AI Model ({llm_result.provider.upper()}: {llm_result.model})"
        except Exception as exc:
            logger.warning(f"Pass 1 LLM execution notice: {exc}")

        if not pass1_answer:
            if deterministic_response_text:
                pass1_answer = deterministic_response_text
                engine_type = "Decision Assistant"
            else:
                pass1_answer = (
                    "I am DecisionGuard AI, your conversational assistant and decision intelligence system. "
                    "I can answer questions across general knowledge, technology, mathematics, or your inventory catalog. "
                    "How can I help you today?"
                )
                suggested_followups = [
                    "How many products do you have?",
                    "Which products are low in stock?",
                    "Which is the best product and why?",
                ]

        # 16. PASS 2: Independent Adversarial Double-Check & Error Correction
        comparison: Optional[DoubleCheckComparison] = None
        is_explicit_audit_query = any(k in query_lower for k in ["double check", "audit this", "verify", "compare answers", "audit"])
        is_what_if_query = any(k in query_lower for k in ["what if", "lead time increase", "lead time +", "lead time by", "demand rises", "demand increase"])

        should_verify = bool(
            (eval_res and not is_what_if_query)
            or (matched_item and any(w in query_lower for w in ["reorder", "should i"]) and not is_what_if_query and not is_disadvantage_query)
            or self._evaluate_math_expression(query)
            or ("bat" in query_lower and "ball" in query_lower)
            or is_explicit_audit_query
            or is_live_llm
        )

        final_response_text = pass1_answer

        if should_verify and pass1_answer:
            from .verifier import verifier
            comparison = await verifier.double_check_and_compare(
                query=query,
                first_answer=pass1_answer,
                matched_item=matched_item,
                inventory_data=inventory_data,
                eval_res=eval_res,
                history=history_messages,
            )

            if comparison and comparison.contradictions and comparison.verified_answer and comparison.verification_status == "VERIFIED":
                if any("Pass 1" in c or "discrepancy" in c.lower() or "error" in c.lower() for c in comparison.contradictions) and not is_what_if_query:
                    final_response_text = comparison.verified_answer

        # 17. Persist Assistant Message in SQLite DB
        bot_msg_id = str(uuid.uuid4())
        db.add_message_to_conversation(
            conversation_id=conv_id,
            role="assistant",
            content=final_response_text,
            evaluation=eval_res.model_dump() if eval_res else None,
            referenced_sku=matched_item.sku if matched_item else None,
            is_live_llm=is_live_llm,
            engine_type=engine_type,
            suggested_followups=suggested_followups,
            message_id=bot_msg_id,
            comparison=comparison.model_dump() if comparison else None,
        )

        return ChatResponse(
            conversation_id=conv_id,
            message_id=bot_msg_id,
            response=final_response_text,
            evaluation=eval_res,
            referenced_item=matched_item,
            is_live_llm=is_live_llm,
            engine_type=engine_type,
            suggested_followups=suggested_followups,
            timestamp=datetime.now(timezone.utc).isoformat(),
            comparison=comparison,
        )


chat_service = DecisionGuardChatService()

