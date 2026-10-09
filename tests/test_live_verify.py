import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_live_sku_chem_5088_details():
    r = client.post("/api/chat", json={"message": "SKU-CHEM-5088 give more details about this product"})
    assert r.status_code == 200
    data = r.json()
    assert "SKU-CHEM-5088" in data["response"]
    assert "Industrial Anti-Static Surface Cleaner" in data["response"] or "CleanChem" in data["response"]
    assert "5 units" in data["response"] or "5" in data["response"]
    assert data["referenced_item"] is not None
    assert data["referenced_item"]["sku"] == "SKU-CHEM-5088"

def test_live_give_details_about_sku_chem():
    r = client.post("/api/chat", json={"message": "Give me details about SKU-CHEM-5088"})
    assert r.status_code == 200
    data = r.json()
    assert "SKU-CHEM-5088" in data["response"]
    assert data["referenced_item"]["sku"] == "SKU-CHEM-5088"

def test_live_current_stock_elec():
    r = client.post("/api/chat", json={"message": "What is the current stock of SKU-ELEC-1001?"})
    assert r.status_code == 200
    data = r.json()
    assert "42 units" in data["response"] or "42" in data["response"]
    assert data["referenced_item"]["sku"] == "SKU-ELEC-1001"

def test_live_product_types():
    r = client.post("/api/chat", json={"message": "What type of products are in my inventory?"})
    assert r.status_code == 200
    data = r.json()
    assert "Electronics" in data["response"] or "Beverages" in data["response"] or "Office Furniture" in data["response"]

def test_live_days_in_year():
    r = client.post("/api/chat", json={"message": "How many days are there in a year?"})
    assert r.status_code == 200
    data = r.json()
    assert "365" in data["response"]

def test_live_hey():
    r = client.post("/api/chat", json={"message": "Hey"})
    assert r.status_code == 200
    data = r.json()
    assert "Hey!" in data["response"] or "help you" in data["response"].lower()
    assert data["evaluation"] is None
    assert data["comparison"] is None

def test_live_unknown_sku_not_found():
    r = client.post("/api/chat", json={"message": "SKU-NONEXISTENT-9999 give details"})
    assert r.status_code == 200
    data = r.json()
    assert "not found" in data["response"].lower() or "SKU-NONEXISTENT-9999" in data["response"]
    assert "I am DecisionGuard AI, your conversational assistant" not in data["response"]

def test_live_hindi_greeting():
    r = client.post("/api/chat", json={"message": "Namaste! Kaise ho aap?"})
    assert r.status_code == 200
    data = r.json()
    assert "DecisionGuard" in data["response"] or "madad" in data["response"].lower() or "sahayata" in data["response"].lower()
    assert data["comparison"] is None

def test_live_clean_no_svg():
    r = client.post("/api/chat", json={"message": "What is the difference between Java and JavaScript?"})
    assert r.status_code == 200
    data = r.json()
    assert "Java" in data["response"] and "JavaScript" in data["response"]
    assert "svg" not in data["response"].lower()
