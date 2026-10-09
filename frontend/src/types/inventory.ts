export type DecisionOutcome = 'AGREES' | 'CHANGED' | 'UNCERTAIN';
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface InventoryItem {
  sku: string;
  product_name: string;
  category: string;
  current_stock: number;
  safety_stock: number;
  reorder_point: number;
  target_stock_level: number;
  daily_velocity: number;
  supplier_lead_time_days: number;
  unit_cost_usd: number;
  selling_price_usd: number;
  supplier_moq: number;
  supplier_name: string;
  supplier_reliability_score: number;
  upcoming_event?: string;
  shelf_life_days?: number;
  warehouse_volume_cuft?: number;
  recent_demand_history_7d?: number[];
  notes?: string;
}

export interface TransparentCalculations {
  lead_time_demand: number;
  stockout_runway_days: number;
  target_deficit: number;
  working_capital_exposure_usd: number;
  shelf_life_consumption_days?: number;
  storage_volume_cuft?: number;
  formula_breakdown: string;
}

export interface SinglePassRecommendation {
  reorder_quantity: number;
  urgency: UrgencyLevel;
  reasoning: string;
  confidence: number;
  projected_stockout_days: number;
}

export interface AlternativeOption {
  option_name: string;
  quantity: number;
  rationale: string;
  tradeoff: string;
}

export interface SelfChallengeAnalysis {
  arguments_against: string[];
  missing_facts_identified: string[];
  alternative_options: AlternativeOption[];
  primary_risk_factor: string;
  friction_penalty_points?: number;
}

export interface FinalRecommendation {
  reorder_quantity: number;
  final_reorder_quantity?: number;
  urgency: UrgencyLevel;
  reasoning: string;
  confidence: number;
  key_adjustments_made: string[];
}

export type PSComplianceStatus = 'MET' | 'PARTIALLY_MET' | 'NOT_MET' | 'INSUFFICIENT_EVIDENCE';
export type VerificationStatus = 'VERIFIED' | 'FAILED' | 'UNVERIFIED';

export interface PSRequirementCheck {
  requirement_id: string;
  name: string;
  status: PSComplianceStatus;
  details: string;
}

export interface DoubleCheckComparison {
  first_answer: string;
  verified_answer: string;
  agreements: string[];
  contradictions: string[];
  unverified_claims: string[];
  ps_compliance: PSComplianceStatus;
  ps_checks: PSRequirementCheck[];
  verification_status: VerificationStatus;
  verification_summary: string;
  final_synthesis: string;
}

export interface EvaluationResponse {
  sku: string;
  product_name: string;
  timestamp: string;
  transparent_metrics: TransparentCalculations;
  calculations?: TransparentCalculations;
  single_pass: SinglePassRecommendation;
  single_pass_recommendation?: SinglePassRecommendation;
  self_challenge: SelfChallengeAnalysis;
  final_recommendation: FinalRecommendation;
  final_decision?: FinalRecommendation;
  confidence_before: number;
  confidence_after: number;
  confidence_delta: number;
  decision_outcome: DecisionOutcome;
  summary_verdict: string;
  engine_type?: string;
  is_live_llm?: boolean;
  comparison?: DoubleCheckComparison;
}

export interface DecisionActionRequest {
  sku: string;
  action: 'APPROVE' | 'ADJUST' | 'REJECT' | 'DEFER';
  final_approved_quantity: number;
  notes?: string;
}

export interface DecisionActionResponse {
  success: boolean;
  sku: string;
  action: string;
  final_approved_quantity: number;
  message: string;
  recorded_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  created_at?: string;
  evaluation?: EvaluationResponse;
  referenced_item?: InventoryItem;
  referenced_sku?: string;
  suggested_followups?: string[];
  is_live_llm?: boolean;
  engine_type?: string;
  comparison?: DoubleCheckComparison;
}

export interface ChatRequest {
  conversation_id?: string;
  message: string;
  history?: any[];
  current_sku?: string;
}

export interface ChatResponse {
  conversation_id: string;
  message_id: string;
  response: string;
  evaluation?: EvaluationResponse;
  referenced_item?: InventoryItem;
  is_live_llm: boolean;
  engine_type: string;
  suggested_followups: string[];
  timestamp?: string;
  created_at?: string;
  comparison?: DoubleCheckComparison;
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  referenced_sku?: string;
  message_count: number;
  last_message?: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  referenced_sku?: string;
  messages: ChatMessage[];
}

export interface SyntheticCase {
  case_id: string;
  synthetic_label: string;
  sku: string;
  product_name: string;
  category: string;
  current_stock: number;
  safety_stock: number;
  reorder_point: number;
  target_stock_level: number;
  daily_velocity: number;
  supplier_lead_time_days: number;
  unit_cost_usd: number;
  selling_price_usd: number;
  supplier_moq: number;
  supplier_name: string;
  supplier_reliability_score: number;
  shelf_life_days?: number;
  warehouse_volume_cuft?: number;
  open_purchase_orders?: number;
  upcoming_event?: string;
  notes?: string;
  ground_truth_decision: string;
  ground_truth_outcome: DecisionOutcome;
  ground_truth_optimal_quantity: number;
  required_evidence: string[];
  relevant_counterargument: string;
  evaluation_notes: string;
}

export interface ModeEvaluationResult {
  mode_name: string;
  total_cases: number;
  correct_decisions: number;
  accuracy_percentage: number;
  incorrect_recommendations: number;
  appropriate_uncertain_count: number;
  unsupported_claims_count: number;
  material_changes_count: number;
  corrected_initial_count: number;
  incorrect_overrides_count: number;
  mean_confidence_error: number;
  avg_confidence: number;
}

export interface BenchmarkCaseResult {
  case_id: string;
  sku: string;
  category: string;
  ground_truth_outcome: DecisionOutcome;
  baseline_outcome: DecisionOutcome;
  baseline_correct: boolean;
  baseline_qty: number;
  dg_outcome: DecisionOutcome;
  dg_correct: boolean;
  dg_initial_qty: number;
  dg_final_qty: number;
  dg_confidence_delta: number;
  risk_factor: string;
}

export interface BenchmarkReport {
  timestamp: string;
  dataset_version: string;
  sample_size: number;
  baseline: ModeEvaluationResult;
  decision_guard: ModeEvaluationResult;
  accuracy_lift_percentage: number;
  error_reduction_percentage: number;
  methodology: string;
  case_results: BenchmarkCaseResult[];
}

