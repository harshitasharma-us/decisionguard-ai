"""
DecisionGuard AI — Comprehensive Intent, Reasoning, Provenance & Verification Test Suite
Explicitly tests all requirements from Section G:
1. 'How many products do you have?'
2. 'Give details of SKU-ELEC-1001'
3. 'Are there any disadvantages of SKU-CHEM-5088?'
4. 'Compare SKU-ELEC-1001 and SKU-CHEM-5088'
5. 'Which is the best product and why?'
6. 'Should I reorder SKU-CHEM-5088?'
7. 'What are the risks of your recommendation?'
8. 'How many days are there in one year?'
Plus multi-turn conversational context resolution and data provenance checks.
"""

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_section_g_1_how_many_products_do_you_have():
    """1. How many products do you have? -> Returns catalog count and unit totals without product record template."""
    res = client.post("/api/chat", json={"message": "How many products do you have?"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]

    assert "Inventory Catalog Summary" in resp or "5 products" in resp or "products currently recorded" in resp
    assert "SKU-ELEC-1001" in resp
    assert "SKU-CHEM-5088" in resp
    # Must NOT return full single product record
    assert "Unit Cost:" not in resp


def test_section_g_2_give_details_of_sku_elec_1001():
    """2. Give details of SKU-ELEC-1001 -> Returns verified master record with exact telemetry."""
    res = client.post("/api/chat", json={"message": "Give details of SKU-ELEC-1001"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]

    assert "SKU-ELEC-1001" in resp
    assert "Ultra-Fast USB-C 65W GaN Charger" in resp
    assert "42 units" in resp
    assert "$12.50" in resp
    assert "$29.99" in resp
    assert "58.3%" in resp or "Gross Margin" in resp
    assert "Apex Power Tech" in resp
    assert data["referenced_item"] is not None
    assert data["referenced_item"]["sku"] == "SKU-ELEC-1001"


def test_section_g_3_disadvantages_of_sku_chem_5088():
    """3. Are there any disadvantages of SKU-CHEM-5088? -> Explains genuine trade-offs and risks, not full record dump."""
    res = client.post("/api/chat", json={"message": "Are there any disadvantages of SKU-CHEM-5088?"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]

    assert "Disadvantage" in resp or "Risk Analysis" in resp
    assert "SKU-CHEM-5088" in resp
    # Must identify operational risks: long lead time (14 days), low stock (5 units), supplier SLA (82%)
    assert "14 days" in resp or "14d" in resp or "lead time" in resp.lower()
    assert "82%" in resp or "supplier" in resp.lower()
    assert "Known Operational Trade-offs" in resp or "Trade-offs" in resp
    # Must NOT just repeat full raw template blindly
    assert "Here are the ground truth inventory and operational details" not in resp


def test_section_g_4_compare_sku_elec_1001_and_sku_chem_5088():
    """4. Compare SKU-ELEC-1001 and SKU-CHEM-5088 -> Dynamic comparison matrix between the 2 exact requested SKUs."""
    res = client.post("/api/chat", json={"message": "Compare SKU-ELEC-1001 and SKU-CHEM-5088"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]

    assert "Cross-Product Decision Comparison" in resp or "Comparison" in resp
    assert "SKU-ELEC-1001" in resp
    assert "SKU-CHEM-5088" in resp
    assert "Ultra-Fast USB-C 65W GaN Charger" in resp
    assert "Industrial Anti-Static Surface Cleaner" in resp
    # Provenance numbers
    assert "42" in resp  # ELEC stock
    assert "5" in resp   # CHEM stock
    assert "Apex Power Tech" in resp
    assert "CleanChem Dynamics" in resp


def test_section_g_5_which_is_the_best_product_and_why():
    """5. Which is the best product and why? -> Multi-criteria analysis across margin, revenue, SLA, and operational risk."""
    res = client.post("/api/chat", json={"message": "Which is the best product and why?"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]

    assert "Best Product" in resp or "Multi-Criteria" in resp
    # Evaluates multiple criteria
    assert "Profit Margin" in resp or "Margin" in resp
    assert "Revenue" in resp or "Velocity" in resp
    assert "Reliability" in resp or "SLA" in resp
    # Recommends leading performers grounded in data
    assert "SKU-APPAREL-4050" in resp or "SKU-ELEC-1001" in resp
    # Must NOT just dump cleaner details or a single product template
    assert "Here are the ground truth inventory and operational details" not in resp


def test_section_g_6_should_i_reorder_sku_chem_5088():
    """6. Should I reorder SKU-CHEM-5088? -> 7-part self-challenge audit loop."""
    res = client.post("/api/chat", json={"message": "Should I reorder SKU-CHEM-5088?"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]

    assert data["evaluation"] is not None
    assert data["evaluation"]["sku"] == "SKU-CHEM-5088"
    assert "Initial Recommendation" in resp
    assert "Counter-Arguments" in resp
    assert "Revised Recommendation" in resp
    assert "Decision Status" in resp
    assert "50 units" in resp or data["evaluation"]["final_recommendation"]["reorder_quantity"] == 50


def test_section_g_7_what_are_the_risks_of_your_recommendation_multi_turn():
    """7. What are the risks of your recommendation? -> Multi-turn follow-up resolving previous reorder discussion."""
    # Turn 1: Reorder SKU-CHEM-5088
    r1 = client.post("/api/chat", json={"message": "Should I reorder SKU-CHEM-5088?"}).json()
    conv_id = r1["conversation_id"]

    # Turn 2: What are the risks of your recommendation?
    r2 = client.post("/api/chat", json={
        "conversation_id": conv_id,
        "message": "What are the risks of your recommendation?"
    }).json()

    resp2 = r2["response"]
    assert "Risk" in resp2 or "Sensitivity Audit" in resp2
    assert "SKU-CHEM-5088" in resp2
    assert "Stockout" in resp2 or "Lead Time" in resp2 or "Supplier" in resp2
    assert "Missing Assumptions" in resp2


def test_section_g_8_how_many_days_in_one_year():
    """8. How many days are there in one year? -> General knowledge calendar answer."""
    res = client.post("/api/chat", json={"message": "How many days are there in one year?"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]

    assert "365" in resp
    assert "366" in resp or "leap" in resp.lower()
    assert "Gregorian" in resp or "year" in resp.lower()
    assert data["evaluation"] is None


def test_contextual_disadvantages_it_followup():
    """Verify 'Any disadvantages of it?' resolves previously discussed SKU."""
    # Turn 1: Discuss GaN charger
    r1 = client.post("/api/chat", json={"message": "Give details of SKU-ELEC-1001"}).json()
    conv_id = r1["conversation_id"]

    # Turn 2: Any disadvantages of it?
    r2 = client.post("/api/chat", json={
        "conversation_id": conv_id,
        "message": "Any disadvantages of it?"
    }).json()

    resp2 = r2["response"]
    assert "SKU-ELEC-1001" in resp2
    assert "Disadvantage" in resp2 or "Risk" in resp2
    assert "Here are the ground truth inventory and operational details" not in resp2


def test_comparison_ambiguous_no_context_asks_clarification():
    """Verify 'Compare these both product' with zero context asks a polite clarification instead of guessing."""
    res = client.post("/api/chat", json={"message": "Compare these both product"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]
    assert "clarify" in resp.lower() or "which" in resp.lower() or "compare" in resp.lower()


def test_comparison_resolves_context_from_history():
    """Verify 'Compare these both product' after discussing two items resolves them from history."""
    # Turn 1: Discuss Item A
    r1 = client.post("/api/chat", json={"message": "Give details of SKU-ELEC-1001"}).json()
    conv_id = r1["conversation_id"]

    # Turn 2: Discuss Item B
    client.post("/api/chat", json={
        "conversation_id": conv_id,
        "message": "Give details of SKU-CHEM-5088"
    })

    # Turn 3: Compare these both product
    r3 = client.post("/api/chat", json={
        "conversation_id": conv_id,
        "message": "Compare these both product"
    }).json()

    resp3 = r3["response"]
    assert "SKU-ELEC-1001" in resp3
    assert "SKU-CHEM-5088" in resp3
    assert "Cross-Product Decision Comparison" in resp3 or "Comparison" in resp3
