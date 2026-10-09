import pytest
from backend.app.evaluator import BenchmarkEvaluator, ensure_benchmark_dataset_exists
from backend.app.schemas import InventoryItem
from backend.app.engine import engine


def test_synthetic_dataset_structure_and_count():
    cases = ensure_benchmark_dataset_exists()
    assert len(cases) == 100
    
    # Verify all required keys in each case
    for case in cases:
        assert "case_id" in case
        assert "sku" in case
        assert "ground_truth_outcome" in case
        assert case["ground_truth_outcome"] in ["AGREES", "CHANGED", "UNCERTAIN"]
        assert "ground_truth_decision" in case
        assert "required_evidence" in case
        assert "relevant_counterargument" in case
        assert case["synthetic_label"] == "SYNTHETIC-DEMO-DATASET-V1"


def test_baseline_vs_decision_guard_evaluation():
    evaluator = BenchmarkEvaluator()
    report = evaluator.evaluate_all()

    assert report.sample_size == 100
    assert report.baseline.total_cases == 100
    assert report.decision_guard.total_cases == 100

    # DecisionGuard must achieve higher accuracy than single-pass baseline
    assert report.decision_guard.accuracy_percentage > report.baseline.accuracy_percentage
    assert report.accuracy_lift_percentage > 0
    assert report.error_reduction_percentage > 0

    # DecisionGuard must have lower mean confidence error (calibration)
    assert report.decision_guard.mean_confidence_error < report.baseline.mean_confidence_error

    # Baseline should have 0 appropriate uncertain counts (it never abstains)
    assert report.baseline.appropriate_uncertain_count == 0
    # DecisionGuard should accurately identify UNCERTAIN scenarios
    assert report.decision_guard.appropriate_uncertain_count == 25


def test_perishability_correction_case():
    evaluator = BenchmarkEvaluator()
    # Case 41 is a perishable culture with 25-day shelf life
    case = evaluator.get_case("CASE-SYNTH-041")
    assert case is not None
    assert case["shelf_life_days"] == 25

    baseline = evaluator.run_single_pass_baseline(case)
    dg = evaluator.run_decision_guard_mode(case)

    # Baseline blindly recommends large order
    assert baseline["proposed_quantity"] > case["supplier_moq"]
    assert baseline["outcome"] == "AGREES"

    # DecisionGuard detects spoilage and trims to MOQ
    assert dg["outcome"] == "CHANGED"
    assert dg["final_quantity"] == case["supplier_moq"]
    assert dg["is_correct"] is True
    assert "Spoilage" in dg["primary_risk"]


def test_open_po_duplicate_prevention_case():
    evaluator = BenchmarkEvaluator()
    # Case 59 has 200 open purchase orders in transit
    case = evaluator.get_case("CASE-SYNTH-059")
    assert case is not None
    assert case["open_purchase_orders"] == 200

    baseline = evaluator.run_single_pass_baseline(case)
    dg = evaluator.run_decision_guard_mode(case)

    # Baseline ignores open POs and proposes full 400
    assert baseline["proposed_quantity"] == 400

    # DecisionGuard trims order to 200 units
    assert dg["outcome"] == "CHANGED"
    assert dg["final_quantity"] == 200
    assert dg["is_correct"] is True
    assert "Open purchase orders" in dg["primary_risk"]


def test_supplier_sla_uncertainty_case():
    evaluator = BenchmarkEvaluator()
    # Case 76 has an unreliable supplier with low SLA
    case = evaluator.get_case("CASE-SYNTH-076")
    assert case is not None
    assert case["supplier_reliability_score"] < 0.80

    baseline = evaluator.run_single_pass_baseline(case)
    dg = evaluator.run_decision_guard_mode(case)

    # Baseline is blindly confident
    assert baseline["confidence"] >= 90
    assert baseline["outcome"] == "AGREES"

    # DecisionGuard flags as UNCERTAIN
    assert dg["outcome"] == "UNCERTAIN"
    assert dg["confidence_after"] <= 65
    assert dg["is_correct"] is True
