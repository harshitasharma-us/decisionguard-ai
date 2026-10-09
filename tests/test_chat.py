from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


# --- GENERAL AI & KNOWLEDGE TESTS ---

def test_chat_ai_explanation():
    """Verify general question explaining AI receives an articulate, informative response."""
    res = client.post("/api/chat", json={"message": "Explain artificial intelligence to a beginner."})
    assert res.status_code == 200
    data = res.json()
    assert "Artificial Intelligence" in data["response"] or "AI" in data["response"]
    assert "Machine Learning" in data["response"]


def test_chat_java_vs_javascript():
    """Verify coding question on Java vs JavaScript produces accurate comparison table."""
    res = client.post("/api/chat", json={"message": "What is the difference between Java and JavaScript?"})
    assert res.status_code == 200
    data = res.json()
    assert "Java" in data["response"]
    assert "JavaScript" in data["response"]
    assert "JVM" in data["response"] or "Dynamic" in data["response"] or "Static" in data["response"]


def test_chat_python_average_function():
    """Verify coding request generates runnable Python function with type hints."""
    res = client.post("/api/chat", json={"message": "Write a Python function to find the average of a list."})
    assert res.status_code == 200
    data = res.json()
    assert "def " in data["response"]
    assert "sum(" in data["response"] or "len(" in data["response"]
    assert "python" in data["response"].lower()


def test_chat_math_percentage_calculation():
    """Verify step-by-step mathematical computation for 'What is 17% of 850?'."""
    res = client.post("/api/chat", json={"message": "What is 17% of 850? Show the calculation."})
    assert res.status_code == 200
    data = res.json()
    assert "144.5" in data["response"]
    assert "17" in data["response"]
    assert "850" in data["response"]


def test_chat_what_is_an_api():
    """Verify explanation of APIs produces analogy and types."""
    res = client.post("/api/chat", json={"message": "Explain what an API is."})
    assert res.status_code == 200
    data = res.json()
    assert "Application Programming Interface" in data["response"] or "API" in data["response"]
    assert "REST" in data["response"] or "HTTP" in data["response"] or "Contract" in data["response"]


def test_chat_website_performance():
    """Verify 3 ways to improve website performance."""
    res = client.post("/api/chat", json={"message": "Give me three ways to improve website performance."})
    assert res.status_code == 200
    data = res.json()
    assert "Performance" in data["response"] or "Optimize" in data["response"] or "Cache" in data["response"]


# --- MULTI-TURN CONTEXT & FOLLOW-UP TESTS ---

def test_chat_multi_turn_followups():
    """Verify conversational follow-ups maintain context across turns."""
    # Turn 1: Explain Machine Learning
    res1 = client.post("/api/chat", json={"message": "Explain machine learning."})
    assert res1.status_code == 200
    conv_id = res1.json()["conversation_id"]

    # Turn 2: Give me a real-world example
    res2 = client.post("/api/chat", json={
        "conversation_id": conv_id,
        "message": "Give me a real-world example.",
    })
    assert res2.status_code == 200
    assert "Example" in res2.json()["response"] or "Real-World" in res2.json()["response"]

    # Turn 3: Explain that in simpler language
    res3 = client.post("/api/chat", json={
        "conversation_id": conv_id,
        "message": "Explain that in simpler language.",
    })
    assert res3.status_code == 200
    assert len(res3.json()["response"]) > 50


# --- DECISIONGUARD INVENTORY & REORDER TESTS ---

def test_chat_reorder_matcha_decision():
    """Verify reorder query for matcha returns 7-part self-challenge audit."""
    res = client.post("/api/chat", json={"message": "Should I reorder organic matcha today?"})
    assert res.status_code == 200
    data = res.json()

    assert data["referenced_item"] is not None
    assert data["referenced_item"]["sku"] == "SKU-BEV-2004"
    assert data["evaluation"] is not None
    assert data["evaluation"]["decision_outcome"] == "CHANGED"
    assert "Initial Recommendation" in data["response"]
    assert "Counter-Arguments" in data["response"]
    assert "Revised Recommendation" in data["response"]


def test_chat_highest_stockout_risk():
    """Verify stockout risk ranking query computes live runway leaderboard."""
    res = client.post("/api/chat", json={"message": "Which product has the highest stockout risk right now?"})
    assert res.status_code == 200
    data = res.json()

    assert "Stockout Risk Leaderboard" in data["response"]
    assert "SKU-BEV-2004" in data["response"] or "runway" in data["response"].lower()


def test_chat_lead_time_simulation():
    """Verify what-if sensitivity query simulates +5 days lead time."""
    res = client.post("/api/chat", json={"message": "What happens if supplier lead time increases by 5 days for GaN charger?"})
    assert res.status_code == 200
    data = res.json()

    assert data["referenced_item"] is not None
    assert data["referenced_item"]["sku"] == "SKU-ELEC-1001"
    assert "+5 days" in data["response"] or "Sensitivity Simulation" in data["response"]


def test_chat_cross_product_comparison():
    """Verify cross-product comparison between Matcha and GaN Charger."""
    res = client.post("/api/chat", json={"message": "Compare the matcha decision with the USB-C charger."})
    assert res.status_code == 200
    data = res.json()
    assert "SKU-BEV-2004" in data["response"]
    assert "SKU-ELEC-1001" in data["response"]
    assert "Comparison" in data["response"]


def test_chat_nonexistent_sku_validation():
    """Verify asking about a nonexistent SKU returns clear not-found response instead of hallucinating."""
    res = client.post("/api/chat", json={"message": "Should I reorder SKU-NONEXISTENT-9999 today?"})
    assert res.status_code == 200
    data = res.json()
    assert "not found" in data["response"].lower() or "SKU-NONEXISTENT-9999" in data["response"]
    assert data["evaluation"] is None


# --- LIVE LLM CLIENT INTEGRATION TEST (MOCKED FOR DETERMINISM) ---

def test_chat_mocked_llm_generation(monkeypatch):
    """Verify LLM client generates responses when configured."""
    from backend.app.llm_client import llm_client, LLMExecutionResult

    async def mock_generate_response(messages, system_prompt, temperature=0.35, max_tokens=1500):
        return LLMExecutionResult(
            text="✨ Live Gemini Response: Machine Learning empowers systems to learn iteratively from supply chain telemetry.",
            is_live_llm=True,
            provider="gemini",
            model="gemini-1.5-flash",
            status="SUCCESS",
            latency_ms=120,
        )

    monkeypatch.setattr(llm_client, "generate_response", mock_generate_response)

    res = client.post("/api/chat", json={"message": "What is machine learning?"})
    assert res.status_code == 200
    data = res.json()
    assert data["is_live_llm"] is True
    assert "GEMINI" in data["engine_type"]
    assert "Live Gemini Response" in data["response"]


def test_eight_core_benchmark_questions():
    """
    Explicitly tests all 8 questions required in Section 8 of the specification:
    1. 'Explain artificial intelligence to a beginner.'
    2. 'What is the difference between SQL and MongoDB?'
    3. 'Write a Python function to find the average of a list.'
    4. 'What is 17% of 850?'
    5. 'How many products are available?'
    6. 'Should I reorder organic matcha today?'
    7. Follow up with 'Why?'
    8. Follow up with 'Explain that more simply.'
    """
    # 1. Explain AI
    r1 = client.post("/api/chat", json={"message": "Explain artificial intelligence to a beginner."}).json()
    assert "Artificial Intelligence" in r1["response"] or "AI" in r1["response"]
    assert "Machine Learning" in r1["response"]

    # 2. SQL vs MongoDB
    r2 = client.post("/api/chat", json={"message": "What is the difference between SQL and MongoDB?"}).json()
    assert "SQL" in r2["response"] and "MongoDB" in r2["response"]

    # 3. Python average
    r3 = client.post("/api/chat", json={"message": "Write a Python function to find the average of a list."}).json()
    assert "def " in r3["response"] and ("sum(" in r3["response"] or "len(" in r3["response"])

    # 4. Math percentage
    r4 = client.post("/api/chat", json={"message": "What is 17% of 850?"}).json()
    assert "144.5" in r4["response"]

    # 5. Product availability count
    r5 = client.post("/api/chat", json={"message": "How many products are available?"}).json()
    assert "5 product records" in r5["response"] or "available" in r5["response"].lower()

    # 6. Reorder organic matcha
    r6 = client.post("/api/chat", json={"message": "Should I reorder organic matcha today?"}).json()
    assert r6["referenced_item"]["sku"] == "SKU-BEV-2004"
    assert r6["evaluation"]["decision_outcome"] == "CHANGED"
    conv_id = r6["conversation_id"]

    # 7. Follow up: Why?
    r7 = client.post("/api/chat", json={"conversation_id": conv_id, "message": "Why?"}).json()
    assert "Reasoning" in r7["response"] or "Evidence" in r7["response"]

    # 8. Follow up: Explain that more simply.
    r8 = client.post("/api/chat", json={"conversation_id": conv_id, "message": "Explain that more simply."}).json()
    assert len(r8["response"]) > 40
    assert "Offline Mode (No API Key)" not in r8["engine_type"]


# --- GREETINGS & SOCIAL INTENT TESTS ---

def test_chat_simple_greetings():
    """Verify greetings like 'hey', 'hi', 'hello' return short, natural greetings without reports or notices."""
    for greet in ["hey", "hi", "hello", "good morning", "Hey there!"]:
        res = client.post("/api/chat", json={"message": greet})
        assert res.status_code == 200
        data = res.json()
        assert "Hey!" in data["response"] or "help you" in data["response"].lower()
        # Must not contain API configuration notices or I received your question
        assert "I received your question" not in data["response"]
        assert "Live Model Configuration Notice" not in data["response"]
        # Must not contain evaluation or comparison reports for simple greetings
        assert data["evaluation"] is None
        assert data["comparison"] is None


def test_chat_social_thanks_and_closing():
    """Verify pleasantries like 'thank you' or 'goodbye' receive polite responses without verifications."""
    res_thanks = client.post("/api/chat", json={"message": "thank you!"})
    assert res_thanks.status_code == 200
    data_t = res_thanks.json()
    assert "welcome" in data_t["response"].lower()
    assert data_t["comparison"] is None

    res_bye = client.post("/api/chat", json={"message": "goodbye"})
    assert res_bye.status_code == 200
    data_b = res_bye.json()
    assert "goodbye" in data_b["response"].lower() or "day" in data_b["response"].lower()
    assert data_b["comparison"] is None


def test_chat_unhandled_query_no_api_key_clean_fallback():
    """Verify unhandled general questions with no API key return clean response without secret or technical config leaks."""
    res = client.post("/api/chat", json={"message": "Tell me a random story about mars."})
    assert res.status_code == 200
    data = res.json()
    assert "I received your question" not in data["response"]
    assert "GEMINI_API_KEY" not in data["response"]
    assert "OPENAI_API_KEY" not in data["response"]
    assert "backend/.env" not in data["response"]
    assert data["comparison"] is None


# --- 10 INTELLIGENCE & QUALITY VERIFICATION SCENARIOS ---

def test_scenario_1_hey_short_greeting():
    """Scenario 1: 'Hey' -> short natural greeting without API notices or verification."""
    res = client.post("/api/chat", json={"message": "Hey"})
    assert res.status_code == 200
    data = res.json()
    assert "Hey!" in data["response"] or "help you" in data["response"].lower()
    assert "GEMINI_API_KEY" not in data["response"]
    assert "OPENAI_API_KEY" not in data["response"]
    assert data["evaluation"] is None
    assert data["comparison"] is None


def test_scenario_2_what_is_blockchain():
    """Scenario 2: 'What is blockchain?' -> relevant, structured explanation."""
    res = client.post("/api/chat", json={"message": "What is blockchain?"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"].lower()
    assert "blockchain" in resp
    assert "ledger" in resp or "decentralized" in resp
    assert "cryptographic" in resp or "blocks" in resp or "consensus" in resp
    assert "GEMINI_API_KEY" not in data["response"]
    assert data["comparison"] is None


def test_scenario_3_cpp_vs_python():
    """Scenario 3: 'Explain the difference between C++ and Python.' -> meaningful comparison."""
    res = client.post("/api/chat", json={"message": "Explain the difference between C++ and Python."})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]
    assert "C++" in resp and "Python" in resp
    assert "Compiled" in resp or "compiled" in resp or "Memory" in resp or "Performance" in resp
    assert "GEMINI_API_KEY" not in resp
    assert data["comparison"] is None


def test_scenario_4_inventory_count():
    """Scenario 4: 'How many products are in my inventory?' -> actual database count."""
    res = client.post("/api/chat", json={"message": "How many products are in my inventory?"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]
    assert "5 product" in resp or "5 distinct" in resp or "product records" in resp
    assert "units" in resp.lower()


def test_scenario_5_overstocking_risks():
    """Scenario 5: 'What are the risks of ordering too much stock?' -> relevant risk analysis."""
    res = client.post("/api/chat", json={"message": "What are the risks of ordering too much stock?"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"].lower()
    assert "capital" in resp or "cash" in resp
    assert "holding" in resp or "storage" in resp
    assert "spoilage" in resp or "expiration" in resp or "obsolescence" in resp


def test_scenario_6_ambiguous_question_clarification():
    """Scenario 6: An ambiguous question -> focused clarification when needed."""
    res = client.post("/api/chat", json={"message": "What should I do?"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]
    assert "clarify" in resp.lower() or "which product" in resp.lower()
    assert data["evaluation"] is None
    assert data["comparison"] is None


def test_scenario_7_unverifiable_question_uncertainty():
    """Scenario 7: A question the model cannot verify -> honest, concise uncertainty."""
    res = client.post("/api/chat", json={"message": "What will the stock price of Apple be in 2030?"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]
    assert "cannot verify" in resp.lower() or "uncertainty" in resp.lower() or "speculation" in resp.lower()
    assert data["comparison"] is None


def test_scenario_8_no_technical_config_leaked_on_missing_keys():
    """Scenario 8: Missing or invalid provider credentials -> no secrets or technical configuration dumped in chat."""
    for query in ["hey", "what is machine learning", "Tell me about quantum computing", "how to write a loop"]:
        res = client.post("/api/chat", json={"message": query})
        assert res.status_code == 200
        data = res.json()
        assert "GEMINI_API_KEY" not in data["response"]
        assert "OPENAI_API_KEY" not in data["response"]
        assert "GROQ_API_KEY" not in data["response"]
        assert "LLM_API_KEY" not in data["response"]
        assert "backend/.env" not in data["response"]
        assert "I received your question" not in data["response"]


def test_scenario_9_follow_up_uses_conversation_context():
    """Scenario 9: Follow-up questions -> relevant use of conversation context."""
    res1 = client.post("/api/chat", json={"message": "Should I reorder organic matcha today?"})
    assert res1.status_code == 200
    conv_id = res1.json()["conversation_id"]

    # Follow up with "Why?"
    res2 = client.post("/api/chat", json={"conversation_id": conv_id, "message": "Why?"})
    assert res2.status_code == 200
    assert "Reasoning" in res2.json()["response"] or "Evidence" in res2.json()["response"]

    # Follow up with "Explain that in simpler language"
    res3 = client.post("/api/chat", json={"conversation_id": conv_id, "message": "Explain that in simpler language."})
    assert res3.status_code == 200
    assert len(res3.json()["response"]) > 30


def test_scenario_10_double_checking_evidence_grounded():
    """Scenario 10: Double-checking -> corrections based on evidence, not merely matching answers."""
    res = client.post("/api/chat", json={"message": "Should I reorder organic matcha today?"})
    assert res.status_code == 200
    data = res.json()
    assert data["comparison"] is not None
    comp = data["comparison"]
    assert comp["ps_compliance"] in ["MET", "PARTIALLY_MET"]
    assert len(comp["agreements"]) > 0
    assert comp["verification_status"] == "VERIFIED"


# --- REGRESSION TESTS FOR PRODUCT LOOKUP & GENERAL REASONING ---

def test_regression_sku_chem_5088_sentence_initial():
    """Verify 'SKU-CHEM-5088 give more details about this product' returns real record."""
    res = client.post("/api/chat", json={"message": "SKU-CHEM-5088 give more details about this product"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]
    assert "SKU-CHEM-5088" in resp
    assert "Industrial Anti-Static Surface Cleaner" in resp or "CleanChem" in resp
    assert "5 units" in resp or "5" in resp
    assert "I am DecisionGuard AI, your conversational assistant" not in resp
    assert data["referenced_item"] is not None
    assert data["referenced_item"]["sku"] == "SKU-CHEM-5088"


def test_regression_give_details_about_sku():
    """Verify 'Give me details about SKU-CHEM-5088' returns real record."""
    res = client.post("/api/chat", json={"message": "Give me details about SKU-CHEM-5088"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]
    assert "SKU-CHEM-5088" in resp
    assert "CleanChem" in resp or "Industrial Anti-Static Surface Cleaner" in resp
    assert data["referenced_item"]["sku"] == "SKU-CHEM-5088"


def test_regression_current_stock_elec():
    """Verify 'What is the current stock of SKU-ELEC-1001?' returns 42 units."""
    res = client.post("/api/chat", json={"message": "What is the current stock of SKU-ELEC-1001?"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]
    assert "42 units" in resp or "42" in resp
    assert "SKU-ELEC-1001" in resp
    assert data["referenced_item"]["sku"] == "SKU-ELEC-1001"


def test_regression_product_types_in_inventory():
    """Verify 'What type of products are in my inventory?' returns catalog categories."""
    res = client.post("/api/chat", json={"message": "What type of products are in my inventory?"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]
    assert "Electronics" in resp or "Beverages" in resp or "Office Furniture" in resp or "Apparel" in resp
    assert "SKU-" in resp


def test_regression_days_in_a_year():
    """Verify 'How many days are there in a year?' returns 365 / 366 days."""
    res = client.post("/api/chat", json={"message": "How many days are there in a year?"})
    assert res.status_code == 200
    data = res.json()
    resp = data["response"]
    assert "365" in resp
    assert "366" in resp or "leap" in resp.lower()


def test_regression_hey_greeting():
    """Verify 'Hey' returns a natural greeting."""
    res = client.post("/api/chat", json={"message": "Hey"})
    assert res.status_code == 200
    data = res.json()
    assert "Hey!" in data["response"] or "help you" in data["response"].lower()
    assert data["evaluation"] is None
    assert data["comparison"] is None




