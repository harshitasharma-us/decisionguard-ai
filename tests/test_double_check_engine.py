"""
DecisionGuard AI — Tests for Double-Check and Answer Comparison Engine
Verifies:
1. Agreements between first and second answers.
2. Contradictions and discrepancies detected and corrected.
3. Unsupported / unverified claims flagged.
4. PS (Project Specification) compliance evaluation (MET, PARTIALLY_MET, NOT_MET, INSUFFICIENT_EVIDENCE).
5. Provider / API failure handling (reporting failed verification without false claims).
6. Deterministic formula and DB grounding.
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch

from backend.app.schemas import (
    InventoryItem,
    EvaluationResponse,
    DoubleCheckComparison,
    PSRequirementCheck,
    ChatRequest,
)
from backend.app.verifier import verifier, DoubleCheckVerifier
from backend.app.engine import engine
from backend.app.chat import chat_service
from backend.app.main import load_inventory_data
from backend.app.llm_client import LLMExecutionResult


@pytest.fixture
def sample_inventory():
    return load_inventory_data()


@pytest.fixture
def elec_item(sample_inventory):
    data = next(i for i in sample_inventory if i["sku"] == "SKU-ELEC-1001")
    return InventoryItem(**data)


@pytest.fixture
def bev_item(sample_inventory):
    data = next(i for i in sample_inventory if i["sku"] == "SKU-BEV-2004")
    return InventoryItem(**data)


@pytest.fixture
def furn_item(sample_inventory):
    data = next(i for i in sample_inventory if i["sku"] == "SKU-FURN-3012")
    return InventoryItem(**data)


# ----------------------------------------------------------------------------
# 1. TEST AGREEMENTS
# ----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_double_check_agreements_elec(elec_item, sample_inventory):
    """Verifies that when initial proposal matches demand and facts, agreements are recorded."""
    eval_res = await engine.evaluate_inventory_item(elec_item)
    comp = verifier._verify_inventory_decision(
        query="Should I reorder SKU-ELEC-1001?",
        first_answer=eval_res.single_pass.reasoning,
        item=elec_item,
        eval_res=eval_res,
    )

    assert comp.verification_status == "VERIFIED"
    assert len(comp.agreements) >= 3
    assert any("SKU-ELEC-1001" in a for a in comp.agreements)
    assert any("ground truth" in a.lower() for a in comp.agreements)
    assert any("350 units" in a for a in comp.agreements)
    assert comp.ps_compliance == "MET"
    assert "350 units" in comp.final_synthesis


# ----------------------------------------------------------------------------
# 2. TEST CONTRADICTIONS & DISCREPANCY CORRECTION
# ----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_double_check_contradictions_and_correction_matcha(bev_item, sample_inventory):
    """
    Verifies that for SKU-BEV-2004, the engine detects the discrepancy between
    naive 180-unit proposal and 45-day shelf-life limit, correcting it to 30 units.
    """
    eval_res = await engine.evaluate_inventory_item(bev_item)
    comp = verifier._verify_inventory_decision(
        query="Should I reorder matcha today?",
        first_answer=eval_res.single_pass.reasoning,
        item=bev_item,
        eval_res=eval_res,
    )

    assert comp.verification_status == "VERIFIED"
    assert eval_res.decision_outcome == "CHANGED"
    assert eval_res.final_recommendation.reorder_quantity == 30
    assert "30 units" in comp.verified_answer
    assert "spoilage" in comp.final_synthesis.lower() or "shelf-life" in comp.final_synthesis.lower()


@pytest.mark.asyncio
async def test_double_check_catches_intentional_discrepancy(elec_item):
    """Verifies that if an incorrect first answer is audited, a contradiction is reported."""
    eval_res = await engine.evaluate_inventory_item(elec_item)
    
    # Mutate eval_res to create an intentional quantity mismatch
    fake_eval = eval_res.model_copy(deep=True)
    fake_eval.final_recommendation.reorder_quantity = 9999  # Invalid number

    comp = verifier._verify_inventory_decision(
        query="Evaluate SKU-ELEC-1001",
        first_answer="Order 9999 units immediately without calculation.",
        item=elec_item,
        eval_res=fake_eval,
    )

    assert len(comp.contradictions) > 0
    assert any("discrepancy" in c.lower() or "mismatch" in c.lower() for c in comp.contradictions)


# ----------------------------------------------------------------------------
# 3. TEST UNSUPPORTED / UNVERIFIED CLAIMS
# ----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_double_check_unsupported_claims_flagged(elec_item, bev_item):
    """Verifies that missing campaign lift curves or unrecorded supplier variance are flagged."""
    eval_elec = await engine.evaluate_inventory_item(elec_item)
    comp_elec = verifier._verify_inventory_decision(
        query="Evaluate SKU-ELEC-1001",
        first_answer=eval_elec.single_pass.reasoning,
        item=elec_item,
        eval_res=eval_elec,
    )
    assert len(comp_elec.unverified_claims) >= 1
    assert any("promotional lift" in u.lower() or "variance" in u.lower() for u in comp_elec.unverified_claims)


# ----------------------------------------------------------------------------
# 4. TEST PS COMPLIANCE AUDITING (PS-1 to PS-6)
# ----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ps_compliance_checklist_coverage(elec_item, bev_item, furn_item):
    """Verifies that all 6 PS requirements are evaluated with appropriate status."""
    for item in [elec_item, bev_item, furn_item]:
        eval_res = await engine.evaluate_inventory_item(item)
        comp = verifier._verify_inventory_decision(
            query=f"Evaluate {item.sku}",
            first_answer=eval_res.single_pass.reasoning,
            item=item,
            eval_res=eval_res,
        )

        req_ids = [c.requirement_id for c in comp.ps_checks]
        assert "PS-1" in req_ids  # Factual Grounding
        assert "PS-2" in req_ids  # Deterministic Calculation
        assert "PS-3" in req_ids  # MOQ Constraints
        assert "PS-4" in req_ids  # Adversarial Risk Audit
        assert "PS-5" in req_ids  # Alternative Options
        assert "PS-6" in req_ids  # Calibrated Trajectory

        assert comp.ps_compliance in ["MET", "PARTIALLY_MET"]


# ----------------------------------------------------------------------------
# 5. TEST PROVIDER / API FAILURE HANDLING
# ----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_provider_api_failure_reports_failed_verification():
    """
    Requirement 8: If the verification pass fails, report that verification failed.
    Never label an answer as verified just because two answers agree.
    """
    mock_failed_result = LLMExecutionResult(
        text=None,
        is_live_llm=False,
        provider="gemini",
        model="gemini-1.5-flash",
        status="AUTH_ERROR",
        error_message="Invalid API Key HTTP 401",
    )

    with patch("backend.app.llm_client.llm_client.is_configured", return_value=True):
        with patch("backend.app.llm_client.llm_client.generate_response", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = mock_failed_result

            comp = await verifier._verify_general_query_with_llm(
                query="What is quantum entanglement?",
                first_answer="Quantum entanglement is a physical phenomenon...",
            )

            assert comp.verification_status == "FAILED"
            assert comp.ps_compliance == "INSUFFICIENT_EVIDENCE"
            assert any("failed" in c.lower() or "error" in c.lower() for c in comp.contradictions)
            assert "failed" in comp.verification_summary.lower()


@pytest.mark.asyncio
async def test_offline_unconfigured_reports_unverified_honestly():
    """Verifies that with no API key, general queries report UNVERIFIED honestly."""
    with patch("backend.app.llm_client.llm_client.is_configured", return_value=False):
        comp = await verifier._verify_general_query_with_llm(
            query="Explain recursion in computer science",
            first_answer="Recursion is a method of solving problems...",
        )

        assert comp.verification_status == "UNVERIFIED"
        assert comp.ps_compliance == "INSUFFICIENT_EVIDENCE"
        assert "skipped" in comp.verification_summary.lower() or "unavailable" in comp.verified_answer.lower()


# ----------------------------------------------------------------------------
# 6. TEST CHAT ENDPOINT ATTACHES COMPARISON
# ----------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_chat_service_attaches_comparison(sample_inventory):
    """Verifies that ChatResponse contains a valid DoubleCheckComparison object."""
    req = ChatRequest(message="Evaluate SKU-ELEC-1001")
    resp = await chat_service.process_chat_message(req, sample_inventory)

    assert resp.comparison is not None
    assert isinstance(resp.comparison, DoubleCheckComparison)
    assert resp.comparison.verification_status == "VERIFIED"
    assert resp.comparison.ps_compliance == "MET"
    assert len(resp.comparison.agreements) > 0
