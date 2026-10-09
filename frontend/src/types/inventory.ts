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
}

export interface FinalRecommendation {
  reorder_quantity: number;
  urgency: UrgencyLevel;
  reasoning: string;
  confidence: number;
  key_adjustments_made: string[];
}

export interface EvaluationResponse {
  sku: string;
  product_name: string;
  timestamp: string;
  single_pass: SinglePassRecommendation;
  self_challenge: SelfChallengeAnalysis;
  final_recommendation: FinalRecommendation;
  confidence_before: number;
  confidence_after: number;
  confidence_delta: number;
  decision_outcome: DecisionOutcome;
  summary_verdict: string;
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
