import json
from pathlib import Path
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.schemas import InventoryItem

client = TestClient(app)
ROOT_DIR = Path(__file__).resolve().parent.parent


def test_inventory_dataset_all_records():
    """Verify all 5 records in data/inventory.json evaluate cleanly."""
    inv_path = ROOT_DIR / "data" / "inventory.json"
    with open(inv_path, "r", encoding="utf-8") as f:
        items = json.load(f)

    assert len(items) == 5
    for item_data in items:
        # Pydantic schema validation
        item = InventoryItem(**item_data)
        assert item.sku is not None

        # POST /api/evaluate endpoint validation
        res = client.post("/api/evaluate", json=item_data)
        assert res.status_code == 200
        data = res.json()
        assert data["decision_outcome"] in ["AGREES", "CHANGED", "UNCERTAIN"]
        assert data["confidence_before"] > 0
        assert data["confidence_after"] > 0


def test_verified_matcha_spoilage_reduction():
    """
    Verify Flagship Live UI Scenario:
    Organic Cold Brew Matcha (SKU-BEV-2004)
    Single-pass proposals: 180 units @ 92% confidence (HIGH urgency)
    Self-challenge identified: Spoilage and shelf-life expiration (45-day shelf life)
    Final recommendation: 30 units @ 86% confidence (HIGH urgency)
    Outcome: CHANGED
    """
    res = client.post("/api/evaluate/by-sku/SKU-BEV-2004")
    assert res.status_code == 200
    data = res.json()

    assert data["sku"] == "SKU-BEV-2004"
    assert data["single_pass"]["reorder_quantity"] == 180
    assert data["single_pass"]["confidence"] == 92
    assert data["final_recommendation"]["reorder_quantity"] == 30
    assert data["final_recommendation"]["confidence"] == 86
    assert data["decision_outcome"] == "CHANGED"
    assert "spoilage" in data["self_challenge"]["primary_risk_factor"].lower()


def test_verified_gan_charger_agreement():
    """
    Verify Validated Reorder Scenario:
    Ultra-Fast USB-C 65W GaN Charger (SKU-ELEC-1001)
    Single-pass proposals: 350 units @ 92% confidence (HIGH urgency)
    Self-challenge: Validated against upcoming Tech Week Sale event
    Final recommendation: 350 units @ 96% confidence (HIGH urgency)
    Outcome: AGREES
    """
    res = client.post("/api/evaluate/by-sku/SKU-ELEC-1001")
    assert res.status_code == 200
    data = res.json()

    assert data["sku"] == "SKU-ELEC-1001"
    assert data["single_pass"]["reorder_quantity"] == 350
    assert data["single_pass"]["confidence"] == 92
    assert data["final_recommendation"]["reorder_quantity"] == 350
    assert data["final_recommendation"]["confidence"] == 96
    assert data["decision_outcome"] == "AGREES"


def test_demo_scenarios_dataset_parsing_and_evaluation():
    """
    Verify data/demo_scenarios.json records evaluate via POST /api/evaluate.
    Confirms support for alias fields and verifies UNCERTAIN outcome for supplier risk.
    """
    demo_path = ROOT_DIR / "data" / "demo_scenarios.json"
    assert demo_path.exists()

    with open(demo_path, "r", encoding="utf-8") as f:
        demo_items = json.load(f)

    assert len(demo_items) == 5

    outcomes = {}
    for item_data in demo_items:
        res = client.post("/api/evaluate", json=item_data)
        assert res.status_code == 200
        data = res.json()
        outcomes[data["sku"]] = data["decision_outcome"]

    # Verify distinct decision outcomes across demo suite
    assert outcomes["SKU-DEMO-CHG01"] == "CHANGED"
    assert outcomes["SKU-DEMO-AGR02"] == "AGREES"
    assert outcomes["SKU-DEMO-UNC04"] == "UNCERTAIN"
    assert outcomes["SKU-DEMO-PER05"] == "CHANGED"


def test_dynamic_custom_scenario_creation_and_evaluation():
    """Verify POST /api/inventory/custom and dynamic transparent metrics."""
    custom_payload = {
        "sku": "SKU-DYNAMIC-01",
        "product_name": "Dynamic Custom Item",
        "category": "Test Category",
        "current_stock": 20,
        "safety_stock": 25,
        "reorder_point": 40,
        "target_stock_level": 120,
        "daily_velocity": 5.0,
        "supplier_lead_time_days": 8,
        "unit_cost_usd": 15.0,
        "selling_price_usd": 30.0,
        "supplier_moq": 20,
        "supplier_name": "Test Supplier",
        "supplier_reliability_score": 0.95,
        "upcoming_event": "Summer Surge in 5 days",
        "notes": "Testing transparent dynamic calculation."
    }

    create_res = client.post("/api/inventory/custom", json=custom_payload)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["sku"] == "SKU-DYNAMIC-01"

    eval_res = client.post("/api/evaluate", json=custom_payload)
    assert eval_res.status_code == 200
    eval_data = eval_res.json()

    # Transparent metrics validation
    assert "transparent_metrics" in eval_data
    metrics = eval_data["transparent_metrics"]
    assert metrics["lead_time_demand"] == 40.0  # 5.0 * 8
    assert metrics["stockout_runway_days"] == 4.0  # 20 / 5.0
    assert metrics["target_deficit"] == 140.0  # 120 - 20 + 40
    assert metrics["working_capital_exposure_usd"] > 0
    assert "formula_breakdown" in metrics
    assert eval_data["decision_outcome"] == "AGREES"


def test_dynamic_boundary_zero_moq_and_zero_stock():
    """Verify boundary conditions: 0 stock, 0 MOQ, extreme velocity."""
    zero_moq_payload = {
        "sku": "SKU-BOUNDARY-ZERO",
        "product_name": "Zero Stock Zero MOQ Test",
        "category": "Hardware",
        "current_stock": 0,
        "safety_stock": 10,
        "reorder_point": 20,
        "target_stock_level": 80,
        "daily_velocity": 4.0,
        "supplier_lead_time_days": 5,
        "unit_cost_usd": 50.0,
        "selling_price_usd": 100.0,
        "supplier_moq": 0,
        "supplier_name": "Just-In-Time Precision Vendor",
        "supplier_reliability_score": 0.98
    }

    eval_res = client.post("/api/evaluate", json=zero_moq_payload)
    assert eval_res.status_code == 200
    data = eval_res.json()
    assert data["transparent_metrics"]["stockout_runway_days"] == 0.0
    assert data["final_recommendation"]["reorder_quantity"] > 0
    assert data["decision_outcome"] in ["AGREES", "CHANGED"]


def test_dynamic_uncertain_trigger_on_low_reliability():
    """Verify low supplier reliability (<0.80) dynamically yields UNCERTAIN."""
    low_sla_payload = {
        "sku": "SKU-UNRELIABLE-01",
        "product_name": "High Lead Time Volatile SKU",
        "category": "Raw Materials",
        "current_stock": 15,
        "safety_stock": 30,
        "reorder_point": 50,
        "target_stock_level": 200,
        "daily_velocity": 8.0,
        "supplier_lead_time_days": 21,
        "unit_cost_usd": 40.0,
        "selling_price_usd": 80.0,
        "supplier_moq": 50,
        "supplier_name": "Unverified High-Risk Vendor",
        "supplier_reliability_score": 0.65
    }

    eval_res = client.post("/api/evaluate", json=low_sla_payload)
    assert eval_res.status_code == 200
    data = eval_res.json()
    assert data["decision_outcome"] == "UNCERTAIN"
    assert any("reliability" in arg.lower() or "supplier" in arg.lower() for arg in data["self_challenge"]["arguments_against"])


def test_mocked_gemini_llm_success_and_moq_enforcement(monkeypatch):
    """Verify genuine Gemini LLM JSON response is parsed and MOQ constraints are enforced in Python."""
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("LLM_API_KEY", "mock_gemini_valid_key_12345")
    monkeypatch.setenv("LLM_MODEL", "gemini-1.5-flash")

    mock_gemini_json = {
        "single_pass": {
            "reorder_quantity": 95,  # Note: 95 is not a multiple of MOQ 50
            "urgency": "HIGH",
            "reasoning": "Baseline single pass suggests 95 units based on lead time burn.",
            "confidence": 91,
            "projected_stockout_days": 4.5
        },
        "self_challenge": {
            "arguments_against": [
                "Market volatility could cause overstocking if sales velocity drops post-surge."
            ],
            "missing_facts_identified": [
                "Upcoming flash sale competitor campaign dates."
            ],
            "alternative_options": [
                {
                    "option_name": "Conservative MOQ Buffer",
                    "quantity": 50,
                    "rationale": "Lean replenishment to minimize capital lockup.",
                    "tradeoff": "Higher risk of early stockout if demand surges."
                }
            ],
            "primary_risk_factor": "Post-surge demand normalization"
        },
        "final_recommendation": {
            "reorder_quantity": 90,  # Note: 90 is not a multiple of MOQ 50
            "urgency": "HIGH",
            "reasoning": "Live Gemini reasoning validated order batch with MOQ alignment.",
            "confidence": 88,
            "key_adjustments_made": [
                "Adjusted order batch to maintain healthy stockout safety."
            ]
        },
        "confidence_before": 91,
        "confidence_after": 88,
        "decision_outcome": "CHANGED",
        "summary_verdict": "Self-challenge adjusted batch to maintain optimal working capital."
    }

    from backend.app.engine import engine

    # Mock the internal HTTP call
    async def mock_call_gemini(prompt: str):
        return mock_gemini_json

    monkeypatch.setattr(engine, "_call_gemini_api", mock_call_gemini)

    test_item = {
        "sku": "SKU-GEMINI-TEST",
        "product_name": "Gemini Integrated Test SKU",
        "category": "Electronics",
        "current_stock": 25,
        "safety_stock": 30,
        "reorder_point": 50,
        "target_stock_level": 150,
        "daily_velocity": 8.0,
        "supplier_lead_time_days": 10,
        "unit_cost_usd": 20.0,
        "selling_price_usd": 40.0,
        "supplier_moq": 50,
        "supplier_name": "Apex Vendor",
        "supplier_reliability_score": 0.95
    }

    res = client.post("/api/evaluate", json=test_item)
    assert res.status_code == 200
    data = res.json()

    assert data["is_live_llm"] is True
    assert "GEMINI" in data["engine_type"]
    assert data["decision_outcome"] == "CHANGED"
    # Python constraint check must align 90 -> 100 (nearest MOQ multiple of 50)
    assert data["final_recommendation"]["reorder_quantity"] == 100
    assert any("MOQ" in adj for adj in data["final_recommendation"]["key_adjustments_made"])


def test_mocked_llm_api_failure_fallback(monkeypatch):
    """Verify that when LLM API returns invalid data or throws, engine safely falls back to rules."""
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("LLM_API_KEY", "mock_gemini_valid_key_12345")

    from backend.app.engine import engine

    async def mock_call_gemini_failing(prompt: str):
        raise RuntimeError("API Timeout / HTTP 500 Connection Refused")

    monkeypatch.setattr(engine, "_call_gemini_api", mock_call_gemini_failing)

    test_item = {
        "sku": "SKU-FALLBACK-TEST",
        "product_name": "Fallback Resilience SKU",
        "category": "General",
        "current_stock": 10,
        "safety_stock": 20,
        "reorder_point": 35,
        "target_stock_level": 100,
        "daily_velocity": 4.0,
        "supplier_lead_time_days": 7,
        "unit_cost_usd": 10.0,
        "selling_price_usd": 25.0,
        "supplier_moq": 20,
        "supplier_name": "General Vendor",
        "supplier_reliability_score": 0.92
    }

    res = client.post("/api/evaluate", json=test_item)
    assert res.status_code == 200
    data = res.json()

    # Must cleanly fall back without throwing an unhandled 500
    assert data["is_live_llm"] is False
    assert "Deterministic Rule Engine" in data["engine_type"]
    assert data["final_recommendation"]["reorder_quantity"] > 0


