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
    open_purchase_orders: Optional[int] = 0
    upcoming_event: Optional[str] = None
    shelf_life_days: Optional[int] = None
    warehouse_volume_cuft: Optional[float] = None
    recent_demand_history_7d: Optional[List[int]] = None
    notes: Optional[str] = None

    # Support optional aliases
    lead_time_days: Optional[int] = None
    supplier_reliability: Optional[float] = None
    weekly_demand: Optional[float] = None


class TransparentCalculations(BaseModel):
    lead_time_demand: float
    stockout_runway_days: float
    target_deficit: float
    working_capital_exposure_usd: float
    shelf_life_consumption_days: Optional[float] = None
    storage_volume_cuft: Optional[float] = None
    formula_breakdown: str


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
    friction_penalty_points: int = 0


class FinalRecommendation(BaseModel):
    reorder_quantity: int
    urgency: UrgencyLevel
    reasoning: str
    confidence: int = Field(ge=0, le=100, description="Confidence percentage 0-100")
    key_adjustments_made: List[str]


PSComplianceStatus = Literal["MET", "PARTIALLY_MET", "NOT_MET", "INSUFFICIENT_EVIDENCE"]
VerificationStatus = Literal["VERIFIED", "FAILED", "UNVERIFIED"]


class PSRequirementCheck(BaseModel):
    requirement_id: str
    name: str
    status: PSComplianceStatus
    details: str


class DoubleCheckComparison(BaseModel):
    first_answer: str
    verified_answer: str
    agreements: List[str] = []
    contradictions: List[str] = []
    unverified_claims: List[str] = []
    ps_compliance: PSComplianceStatus = "MET"
    ps_checks: List[PSRequirementCheck] = []
    verification_status: VerificationStatus = "VERIFIED"
    verification_summary: str = ""
    final_synthesis: str = ""


class EvaluationResponse(BaseModel):
    sku: str
    product_name: str
    timestamp: str
    transparent_metrics: TransparentCalculations
    single_pass: SinglePassRecommendation
    self_challenge: SelfChallengeAnalysis
    final_recommendation: FinalRecommendation
    confidence_before: int
    confidence_after: int
    confidence_delta: int
    decision_outcome: DecisionOutcome
    summary_verdict: str
    engine_type: str = "Deterministic Adversarial Rule Engine (Rule-based Challenge)"
    is_live_llm: bool = False
    comparison: Optional[DoubleCheckComparison] = None


class LLMStructuredOutput(BaseModel):
    single_pass: SinglePassRecommendation
    self_challenge: SelfChallengeAnalysis
    final_recommendation: FinalRecommendation
    confidence_before: int = Field(ge=0, le=100)
    confidence_after: int = Field(ge=0, le=100)
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


class ChatMessage(BaseModel):
    id: Optional[str] = None
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: Optional[str] = None
    evaluation: Optional[EvaluationResponse] = None
    referenced_sku: Optional[str] = None
    suggested_followups: Optional[List[str]] = None
    is_live_llm: Optional[bool] = False
    engine_type: Optional[str] = None
    comparison: Optional[DoubleCheckComparison] = None


class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    referenced_sku: Optional[str] = None
    message_count: int = 0
    last_message: Optional[str] = None


class ConversationDetail(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    referenced_sku: Optional[str] = None
    messages: List[ChatMessage] = []


class ConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"
    referenced_sku: Optional[str] = None


class ConversationUpdate(BaseModel):
    title: str


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    history: Optional[List[ChatMessage]] = []
    current_sku: Optional[str] = None


class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    response: str
    evaluation: Optional[EvaluationResponse] = None
    referenced_item: Optional[InventoryItem] = None
    is_live_llm: bool = False
    engine_type: str
    suggested_followups: List[str] = []
    timestamp: str
    comparison: Optional[DoubleCheckComparison] = None



