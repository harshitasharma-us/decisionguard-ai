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
