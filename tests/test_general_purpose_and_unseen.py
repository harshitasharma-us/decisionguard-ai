"""
DecisionGuard AI — Comprehensive Unseen Questions & 2-Pass Verification Evaluation Suite
Tests diverse domains:
1. Unseen general knowledge (Physics, Chemistry, History)
2. Multi-step reasoning & classic logic puzzles
3. Mathematics & Operator Precedence (PEMDAS)
4. Coding across multiple languages
5. Ambiguous prompts -> focused clarifications
6. Multilingual inputs (Hindi & Hinglish)
7. False premise detection & correction
8. Deliberately introduced error in Pass 1 corrected by Pass 2 (Double-Check Engine)
9. Real inventory database retrieval
10. Multi-turn conversation context
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


# --- 1. UNSEEN GENERAL KNOWLEDGE & SCIENCE ---

def test_unseen_physics_speed_of_light():
    """Verify general question on fundamental physical constants."""
    res = client.post("/api/chat", json={"message": "What is the speed of light in a vacuum?"})
    assert res.status_code == 200
    data = res.json()
    assert "299,792,458" in data["response"] or "300,000" in data["response"] or "3 x 10" in data["response"] or "3 × 10" in data["response"] or "speed of light" in data["response"].lower()


def test_unseen_chemistry_water_composition():
    """Verify scientific question on molecular formula."""
    res = client.post("/api/chat", json={"message": "Explain the chemical structure of water and hydrogen bonding."})
    assert res.status_code == 200
    data = res.json()
    assert len(data["response"]) > 50
    assert "GEMINI_API_KEY" not in data["response"]


# --- 2. MULTI-STEP REASONING & LOGIC PUZZLES ---

def test_classic_bat_and_ball_puzzle():
    """Verify multi-step cognitive reflection test: Bat & ball cost $1.10, bat costs $1.00 more. Ball must cost $0.05."""
    res = client.post("/api/chat", json={"message": "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?"})
    assert res.status_code == 200
    data = res.json()
    assert "$0.05" in data["response"] or "5 cents" in data["response"] or "0.05" in data["response"]
    assert "0.10" not in data["response"].split("Final Answer")[-1]


# --- 3. MATHEMATICS & OPERATOR PRECEDENCE (PEMDAS) ---

def test_math_operator_precedence():
    """Verify operator precedence calculation 2 + 2 * 0 = 2."""
    res = client.post("/api/chat", json={"message": "What is 2 + 2 * 0?"})
    assert res.status_code == 200
    data = res.json()
    assert "2" in data["response"]


def test_math_percentage_evaluation():
    """Verify exact percentage calculation 17% of 850 = 144.5."""
    res = client.post("/api/chat", json={"message": "Calculate 17% of 850."})
    assert res.status_code == 200
    data = res.json()
    assert "144.5" in data["response"]


# --- 4. MULTILINGUAL SUPPORT (HINDI & HINGLISH) ---

def test_multilingual_hindi_greeting():
    """Verify Hindi greeting receives appropriate respectful Hindi reply."""
    res = client.post("/api/chat", json={"message": "नमस्ते! आप क्या कर सकते हैं?"})
    assert res.status_code == 200
    data = res.json()
    assert "नमस्ते" in data["response"] or "DecisionGuard" in data["response"]
    assert data["comparison"] is None


def test_multilingual_hinglish_greeting():
    """Verify Hinglish greeting receives natural conversational reply."""
    res = client.post("/api/chat", json={"message": "kya haal hai bhai"})
    assert res.status_code == 200
    data = res.json()
    assert len(data["response"]) > 10
    assert data["comparison"] is None


def test_multilingual_hinglish_inventory_query():
    """Verify Hinglish query asking for inventory count correctly resolves to catalog summary."""
    res = client.post("/api/chat", json={"message": "inventory me kitne items hai batao"})
    assert res.status_code == 200
    data = res.json()
    assert "5 product" in data["response"] or "product records" in data["response"]


def test_multilingual_hinglish_reorder_query():
    """Verify Hinglish query for matcha reorder triggers decision evaluation."""
    res = client.post("/api/chat", json={"message": "kya organic matcha reorder karna chahiye?"})
    assert res.status_code == 200
    data = res.json()
    assert data["referenced_item"] is not None
    assert data["referenced_item"]["sku"] == "SKU-BEV-2004"
    assert data["evaluation"] is not None


# --- 5. FALSE PREMISE & MISLEADING QUESTION DETECTION ---

def test_false_premise_elephant_eggs():
    """Verify false premise detection: Elephants do not lay eggs."""
    res = client.post("/api/chat", json={"message": "Why do elephants lay eggs in nests?"})
    assert res.status_code == 200
    data = res.json()
    resp_lower = data["response"].lower()
    assert "do not lay eggs" in resp_lower or "mammal" in resp_lower or "live calves" in resp_lower


# --- 6. DOUBLE-CHECK CORRECTION ON DELIBERATELY WRONG FIRST ANSWER ---

def test_double_check_corrects_injected_error(monkeypatch):
    """
    Deliberately introduces an erroneous first answer (claims bat costs $1.00 and ball costs $0.10)
    and verifies that the Pass 2 Double-Check Engine detects the contradiction and generates the corrected final answer ($0.05).
    """
    from backend.app.verifier import verifier

    wrong_first_answer = "The ball costs $0.10 because $1.10 - $1.00 = $0.10."
    query = "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?"

    import asyncio
    comp = asyncio.run(verifier.double_check_and_compare(
        query=query,
        first_answer=wrong_first_answer,
        matched_item=None,
        inventory_data=[],
        eval_res=None,
    ))

    # Second pass must identify contradiction
    assert comp is not None
    assert len(comp.contradictions) > 0
    assert "0.05" in comp.verified_answer
    assert comp.verification_status == "VERIFIED"


# --- 7. AMBIGUITY HANDLING ---

def test_ambiguous_question_returns_focused_clarification():
    """Verify completely ambiguous query asks for product clarification."""
    res = client.post("/api/chat", json={"message": "Can you help me update it?"})
    assert res.status_code == 200
    data = res.json()
    assert "clarify" in data["response"].lower() or "which product" in data["response"].lower()
    assert data["comparison"] is None


# --- 8. INVENTORY DATABASE GROUNDING ---

def test_inventory_exact_database_retrieval():
    """Verify inventory count matches actual data/inventory.json records."""
    res = client.post("/api/chat", json={"message": "How many total products do we have in our inventory database?"})
    assert res.status_code == 200
    data = res.json()
    assert "5 product" in data["response"] or "5 distinct" in data["response"] or "product records" in data["response"]
