from pydantic import BaseModel, Field
from typing import List, Optional, Literal

DecisionOutcome = Literal["AGREES", "CHANGED", "UNCERTAIN"]
UrgencyLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class InventoryItem(BaseModel):
    sku: str
    product_name: str
    category: str
    current_stock: int
    safety_stock: int
    reorder_point: int
    target_stock_level: int
    daily_velocity: float
    supplier_lead_time_days: int
    unit_cost_usd: float
    selling_price_usd: float
    supplier_moq: int
    supplier_name: str
    supplier_reliability_score: float
    upcoming_event: Optional[str] = None
    shelf_life_days: Optional[int] = None
    warehouse_volume_cuft: Optional[float] = None
    recent_demand_history_7d: Optional[List[int]] = None
    notes: Optional[str] = None


class SinglePassRecommendation(BaseModel):
    reorder_quantity: int
    urgency: UrgencyLevel
    reasoning: str
    confidence: int = Field(ge=0, le=100, description="Confidence percentage 0-100")
    projected_stockout_days: float


class AlternativeOption(BaseModel):
    option_name: str
    quantity: int
    rationale: str
    tradeoff: str


class SelfChallengeAnalysis(BaseModel):
    arguments_against: List[str]
    missing_facts_identified: List[str]
    alternative_options: List[AlternativeOption]
    primary_risk_factor: str


class FinalRecommendation(BaseModel):
    reorder_quantity: int
    urgency: UrgencyLevel
    reasoning: str
    confidence: int = Field(ge=0, le=100, description="Confidence percentage 0-100")
    key_adjustments_made: List[str]


class EvaluationResponse(BaseModel):
    sku: str
    product_name: str
    timestamp: str
    single_pass: SinglePassRecommendation
    self_challenge: SelfChallengeAnalysis
    final_recommendation: FinalRecommendation
    confidence_before: int
    confidence_after: int
    confidence_delta: int
    decision_outcome: DecisionOutcome
    summary_verdict: str


class DecisionActionRequest(BaseModel):
    sku: str
    action: Literal["APPROVE", "ADJUST", "REJECT", "DEFER"]
    final_approved_quantity: int
    notes: Optional[str] = None


class DecisionActionResponse(BaseModel):
    success: bool
    sku: str
    action: str
    final_approved_quantity: int
    message: str
    recorded_at: str
