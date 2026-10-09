import {
  InventoryItem,
  EvaluationResponse,
  DecisionActionRequest,
  DecisionActionResponse,
} from '../types/inventory';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface HealthResponse {
  status: string;
}

export const apiService = {
  async checkHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) {
      throw new Error(`Health check failed with status ${res.status}`);
    }
    return res.json();
  },

  async getInventory(): Promise<InventoryItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/inventory`);
    if (!res.ok) {
      throw new Error(`Failed to load inventory: HTTP ${res.status}`);
    }
    return res.json();
  },

  async evaluateSku(sku: string): Promise<EvaluationResponse> {
    const res = await fetch(`${API_BASE_URL}/api/evaluate/by-sku/${encodeURIComponent(sku)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Evaluation failed for SKU ${sku}: HTTP ${res.status}`);
    }
    return res.json();
  },

  async recordAction(payload: DecisionActionRequest): Promise<DecisionActionResponse> {
    const res = await fetch(`${API_BASE_URL}/api/decision/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Action recording failed: HTTP ${res.status}`);
    }
    return res.json();
  },
};
