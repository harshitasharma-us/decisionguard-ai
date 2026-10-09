import {
  InventoryItem,
  EvaluationResponse,
  DecisionActionRequest,
  DecisionActionResponse,
} from '../types/inventory';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
    ? 'http://127.0.0.1:8000'
    : 'http://127.0.0.1:8000');

export interface HealthResponse {
  status: string;
  version?: string;
  llm_provider?: string;
  llm_model?: string;
  llm_configured?: boolean;
  mode?: string;
  catalog_items_count?: number;
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

  async loadSeedData(): Promise<InventoryItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/inventory/seed`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`Failed to load seed inventory: HTTP ${res.status}`);
    }
    return res.json();
  },

  async clearSeedData(): Promise<InventoryItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/inventory/seed`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Failed to reset seed inventory: HTTP ${res.status}`);
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

  async evaluateCustomItem(item: InventoryItem): Promise<EvaluationResponse> {
    const res = await fetch(`${API_BASE_URL}/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      throw new Error(`Custom evaluation failed: HTTP ${res.status}`);
    }
    return res.json();
  },

  async createCustomScenario(item: InventoryItem): Promise<InventoryItem> {
    const res = await fetch(`${API_BASE_URL}/api/inventory/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      throw new Error(`Failed to save custom scenario: HTTP ${res.status}`);
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

  async recordDecisionAction(
    sku: string,
    action: 'APPROVE' | 'ADJUST' | 'REJECT' | 'DEFER',
    final_approved_quantity: number,
    notes?: string
  ): Promise<DecisionActionResponse> {
    return this.recordAction({
      sku,
      action,
      final_approved_quantity,
      notes,
    });
  },

  async getAuditLogs(): Promise<DecisionActionResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/decision/audit-log`);
    if (!res.ok) {
      throw new Error(`Failed to load audit logs: HTTP ${res.status}`);
    }
    return res.json();
  },

  async sendChatMessage(
    messageOrPayload: string | {
      conversation_id?: string;
      message: string;
      history?: any[];
      current_sku?: string;
    },
    history?: any[],
    conversation_id?: string
  ): Promise<import('../types/inventory').ChatResponse> {
    const payload =
      typeof messageOrPayload === 'string'
        ? {
            message: messageOrPayload,
            history: history || [],
            conversation_id,
          }
        : messageOrPayload;

    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Chat request failed: HTTP ${res.status}`);
    }
    return res.json();
  },

  async getConversations(search?: string): Promise<import('../types/inventory').ConversationSummary[]> {
    const url = search ? `${API_BASE_URL}/api/conversations?search=${encodeURIComponent(search)}` : `${API_BASE_URL}/api/conversations`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load conversations: HTTP ${res.status}`);
    }
    return res.json();
  },

  async createConversation(title?: string, referenced_sku?: string): Promise<import('../types/inventory').ConversationSummary> {
    const res = await fetch(`${API_BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, referenced_sku }),
    });
    if (!res.ok) {
      throw new Error(`Failed to create conversation: HTTP ${res.status}`);
    }
    return res.json();
  },

  async getConversationTranscript(id: string): Promise<import('../types/inventory').ConversationDetail> {
    const res = await fetch(`${API_BASE_URL}/api/conversations/${encodeURIComponent(id)}`);
    if (!res.ok) {
      throw new Error(`Failed to load transcript: HTTP ${res.status}`);
    }
    return res.json();
  },

  async renameConversation(id: string, title: string): Promise<{ success: boolean; title: string }> {
    const res = await fetch(`${API_BASE_URL}/api/conversations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      throw new Error(`Failed to rename conversation: HTTP ${res.status}`);
    }
    return res.json();
  },

  async deleteConversation(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE_URL}/api/conversations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Failed to delete conversation: HTTP ${res.status}`);
    }
    return res.json();
  },

  async getBenchmarkCases(): Promise<import('../types/inventory').SyntheticCase[]> {
    const res = await fetch(`${API_BASE_URL}/api/evaluation/cases`);
    if (!res.ok) {
      throw new Error(`Failed to load benchmark cases: HTTP ${res.status}`);
    }
    return res.json();
  },

  async getBenchmarkCase(caseId: string): Promise<import('../types/inventory').SyntheticCase> {
    const res = await fetch(`${API_BASE_URL}/api/evaluation/cases/${encodeURIComponent(caseId)}`);
    if (!res.ok) {
      throw new Error(`Failed to load benchmark case: HTTP ${res.status}`);
    }
    return res.json();
  },

  async getBenchmarkResults(): Promise<import('../types/inventory').BenchmarkReport> {
    const res = await fetch(`${API_BASE_URL}/api/evaluation/benchmark-results`);
    if (!res.ok) {
      throw new Error(`Failed to load benchmark results: HTTP ${res.status}`);
    }
    return res.json();
  },

  async runBenchmark(): Promise<import('../types/inventory').BenchmarkReport> {
    const res = await fetch(`${API_BASE_URL}/api/evaluation/run-benchmark`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`Failed to run benchmark evaluation: HTTP ${res.status}`);
    }
    return res.json();
  },

  async compareSingleCase(caseId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/evaluation/compare-case/${encodeURIComponent(caseId)}`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`Failed to compare case: HTTP ${res.status}`);
    }
    return res.json();
  },
};


