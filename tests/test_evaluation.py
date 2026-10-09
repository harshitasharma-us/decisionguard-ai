from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_get_inventory():
    """Verify inventory endpoint returns synthetic SKU list."""
    response = client.get("/api/inventory")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 5
    assert any(item["sku"] == "SKU-BEV-2004" for item in items)


def test_evaluate_by_sku_perishable_changed():
    """
    Verify that perishable SKU-BEV-2004 triggers self-challenge shelf-life risk
    and adjusts outcome to CHANGED.
    """
    response = client.post("/api/evaluate/by-sku/SKU-BEV-2004")
    assert response.status_code == 200
    data = response.json()

    # Verify multi-stage properties
    assert "single_pass" in data
    assert "self_challenge" in data
    assert "final_recommendation" in data
    assert data["confidence_before"] > 0
    assert data["confidence_after"] > 0
    assert data["decision_outcome"] in ["AGREES", "CHANGED", "UNCERTAIN"]
    assert data["decision_outcome"] == "CHANGED"
    assert len(data["self_challenge"]["arguments_against"]) > 0
    assert len(data["self_challenge"]["alternative_options"]) > 0


def test_evaluate_by_sku_high_turnover_agrees():
    """
    Verify that high-turnover charger SKU-ELEC-1001 validates reorder and outcome is AGREES.
    """
    response = client.post("/api/evaluate/by-sku/SKU-ELEC-1001")
    assert response.status_code == 200
    data = response.json()
    assert data["decision_outcome"] == "AGREES"
    assert data["confidence_after"] >= data["confidence_before"]


def test_record_human_action():
    """Verify human decision action recording."""
    payload = {
        "sku": "SKU-BEV-2004",
        "action": "APPROVE",
        "final_approved_quantity": 30,
        "notes": "Approved reduced reorder batch as recommended by self-challenge."
    }
    response = client.post("/api/decision/action", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True
    assert result["final_approved_quantity"] == 30

    audit_res = client.get("/api/decision/audit-log")
    assert audit_res.status_code == 200
    assert any(log["sku"] == "SKU-BEV-2004" for log in audit_res.json())


def test_unknown_sku_404():
    """Verify requesting an unknown SKU returns 404."""
    res = client.get("/api/inventory/SKU-NON-EXISTENT-9999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_synthetic_seed_catalog_endpoints():
    """Verify loading and clearing synthetic seeds dynamically updates catalog count."""
    # 1. Load seeds
    seed_res = client.post("/api/inventory/seed")
    assert seed_res.status_code == 200
    seeded_items = seed_res.json()
    assert len(seeded_items) >= 12
    assert any(item["sku"] == "SKU-MED-7023" for item in seeded_items)

    # 2. Evaluate one of the synthetic items
    eval_res = client.post("/api/evaluate/by-sku/SKU-MED-7023")
    assert eval_res.status_code == 200
    assert eval_res.json()["sku"] == "SKU-MED-7023"

    # 3. Clear seeds
    clear_res = client.delete("/api/inventory/seed")
    assert clear_res.status_code == 200
    cleared_items = clear_res.json()
    assert len(cleared_items) == 5
    assert not any(item["sku"] == "SKU-MED-7023" for item in cleared_items)

