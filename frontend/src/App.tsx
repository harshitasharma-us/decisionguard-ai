import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { KpiMetricsStrip } from './components/KpiMetricsStrip';
import { InventoryTable } from './components/InventoryTable';
import { SelfChallengeConsole } from './components/SelfChallengeConsole';
import { NewScenarioModal } from './components/NewScenarioModal';
import { ChatInterface } from './components/ChatInterface';
import { BaselineEvaluationView } from './components/BaselineEvaluationView';

import { apiService, HealthResponse } from './services/api';
import {
  InventoryItem,
  EvaluationResponse,
  DecisionActionResponse,
} from './types/inventory';
import { Terminal, ShieldCheck, PlusCircle, Database, AlertCircle } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<string>('chat'); // Default landing is AI Chat

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState<boolean>(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [recentActions, setRecentActions] = useState<DecisionActionResponse[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Conversation Management State
  const [conversations, setConversations] = useState<import('./types/inventory').ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    await checkBackendHealth();
    await loadInventory();
    await loadInitialAuditLogs();
    await loadConversations();
  };

  const loadConversations = async () => {
    try {
      const list = await apiService.getConversations();
      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const checkBackendHealth = async () => {
    setHealthLoading(true);
    try {
      const data = await apiService.checkHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  const loadInventory = async () => {
    setInventoryLoading(true);
    setErrorMessage(null);
    try {
      const items = await apiService.getInventory();
      setInventory(items);
      if (items.length > 0) {
        setSelectedItem((prev) => {
          if (prev && items.some((i) => i.sku === prev.sku)) return prev;
          return items[0];
        });
        // Initial evaluation for the first SKU
        runEvaluationForSku(items[0].sku);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setErrorMessage('Failed to connect to backend inventory API. Please ensure the server is running on port 8000.');
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleLoadSeeds = async () => {
    try {
      setInventoryLoading(true);
      const items = await apiService.loadSeedData();
      setInventory(items);
      if (items.length > 0 && (!selectedItem || !items.some((i) => i.sku === selectedItem.sku))) {
        setSelectedItem(items[0]);
        runEvaluationForSku(items[0].sku);
      }
    } catch (err) {
      console.error('Failed to load synthetic seed catalog:', err);
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleClearSeeds = async () => {
    try {
      setInventoryLoading(true);
      const items = await apiService.clearSeedData();
      setInventory(items);
      if (items.length > 0) {
        setSelectedItem(items[0]);
        runEvaluationForSku(items[0].sku);
      }
    } catch (err) {
      console.error('Failed to clear synthetic seed catalog:', err);
    } finally {
      setInventoryLoading(false);
    }
  };

  const loadInitialAuditLogs = async () => {
    try {
      const logs = await apiService.getAuditLogs();
      setRecentActions(logs);
    } catch {
      // Ignored
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setActiveView('chat');
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setActiveView('chat');
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await apiService.renameConversation(id, newTitle);
      await loadConversations();
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await apiService.deleteConversation(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
      await loadConversations();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleConversationCreatedOrUpdated = async (convId: string) => {
    setActiveConversationId(convId);
    await loadConversations();
  };

  const runEvaluationForSku = async (sku: string) => {
    setIsEvaluating(true);
    setErrorMessage(null);
    setEvaluation(null);

    setCurrentStage(2);
    setTimeout(() => setCurrentStage(3), 200);
    setTimeout(() => setCurrentStage(4), 450);

    try {
      const result = await apiService.evaluateSku(sku);
      setTimeout(() => {
        setEvaluation(result);
        setCurrentStage(4);
        setIsEvaluating(false);
      }, 650);
    } catch (err: any) {
      console.error('Evaluation failed:', err);
      setIsEvaluating(false);
      setCurrentStage(1);
      setErrorMessage(`Evaluation failed for SKU ${sku}: ${err?.message || 'Server error'}`);
    }
  };

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    runEvaluationForSku(item.sku);
  };

  const handleTriggerEvaluation = () => {
    if (selectedItem) {
      setActiveView('decision');
      runEvaluationForSku(selectedItem.sku);
    }
  };

  const handleCreateCustomScenario = async (newItem: InventoryItem) => {
    try {
      setIsEvaluating(true);
      const createdItem = await apiService.createCustomScenario(newItem);
      setInventory((prev) => {
        const filtered = prev.filter((i) => i.sku !== createdItem.sku);
        return [createdItem, ...filtered];
      });
      setSelectedItem(createdItem);

      setCurrentStage(2);
      setTimeout(() => setCurrentStage(3), 200);
      setTimeout(() => setCurrentStage(4), 450);

      const result = await apiService.evaluateCustomItem(createdItem);
      setTimeout(() => {
        setEvaluation(result);
        setCurrentStage(4);
        setIsEvaluating(false);
        setActiveView('decision');
      }, 650);
    } catch (err) {
      console.error('Failed to create/evaluate scenario:', err);
      setIsEvaluating(false);
    }
  };

  const handleActionComplete = (res: DecisionActionResponse) => {
    setRecentActions((prev) => [res, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#FFF9F0] text-[#342E35] flex flex-row font-sans selection:bg-[#DCC8F4] selection:text-[#342E35]">
      {/* Left Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        health={health}
        healthLoading={healthLoading}
        onRefreshHealth={checkBackendHealth}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FFF9F0] h-screen overflow-y-auto">
        {/* Dynamic Views */}
        {activeView === 'chat' && (
          <main className="flex-1 p-2 sm:p-4 md:p-6 flex flex-col justify-center h-full">
            <ChatInterface
              selectedItem={selectedItem}
              onSelectItem={handleSelectItem}
              onActionComplete={handleActionComplete}
              activeConversationId={activeConversationId}
              onConversationCreatedOrUpdated={handleConversationCreatedOrUpdated}
            />
          </main>
        )}

        {activeView !== 'chat' && (
          <>
            <TopNavbar
              items={inventory}
              selectedItem={selectedItem}
              onSelectItem={handleSelectItem}
              onRunEvaluation={handleTriggerEvaluation}
              onOpenNewScenario={() => setIsModalOpen(true)}
              isEvaluating={isEvaluating}
            />

            <main className="flex-1 p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">
              {errorMessage && (
                <div className="p-4 bg-[#F1C5D0]/60 border border-[#e8bac7] rounded-2xl flex items-center justify-between text-xs text-[#8C2E43]">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="font-bold underline hover:opacity-80 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-heading font-extrabold text-[#342E35] tracking-tight">
                    {activeView === 'decision'
                      ? 'Adversarial Reorder Decision Console'
                      : activeView === 'inventory'
                      ? 'Inventory Stock & Parameter Explorer'
                      : activeView === 'analytics'
                      ? 'Supply Chain Risk & Capital Analytics'
                      : activeView === 'settings'
                      ? 'AI Engine & Persistence Settings'
                      : 'Executive Decision Audit Log'}
                  </h1>
                  <p className="text-xs text-[#827783] mt-0.5">
                    Multi-pass autonomous reasoning engine that rigorously challenges its own stock recommendations.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F5D6B8] border border-[#e8c8a8] hover:bg-[#ecc7a2] text-xs font-bold text-[#342E35] shadow-sm transition cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-[#342E35]" />
                    <span>New Scenario</span>
                  </button>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#DCC8F4]/50 text-[#342E35] border border-[#cfb6ec]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#342E35]" />
                    Overconfidence Defense Active
                  </span>
                </div>
              </div>

              {/* Dynamic KPI Strip with live SKU data binding */}
              <KpiMetricsStrip
                items={inventory}
                selectedItem={selectedItem}
                evaluation={evaluation}
                isEvaluating={isEvaluating}
              />

              {activeView === 'decision' && (
                <div className="space-y-6">
                  <InventoryTable
                    items={inventory}
                    selectedItem={selectedItem}
                    onSelectItem={handleSelectItem}
                    onRunEvaluation={runEvaluationForSku}
                    isEvaluating={isEvaluating}
                    onLoadSeeds={handleLoadSeeds}
                    onClearSeeds={handleClearSeeds}
                  />

                  {evaluation && selectedItem ? (
                    <SelfChallengeConsole
                      evaluation={evaluation}
                      selectedItem={selectedItem}
                      currentStage={currentStage}
                      isEvaluating={isEvaluating}
                      onActionComplete={handleActionComplete}
                      recentActions={recentActions}
                    />
                  ) : inventoryLoading ? (
                    <div className="enterprise-card p-12 text-center text-xs font-mono text-[#827783]">
                      Loading inventory profiles...
                    </div>
                  ) : (
                    <div className="enterprise-card p-12 text-center text-xs text-[#827783]">
                      Select an SKU from above or click "Challenge AI Decision" to execute an evaluation.
                    </div>
                  )}
                </div>
              )}

              {activeView === 'benchmark' && (
                <BaselineEvaluationView />
              )}

              {activeView === 'inventory' && (
                <div className="space-y-6">
                  <InventoryTable
                    items={inventory}
                    selectedItem={selectedItem}
                    onSelectItem={handleSelectItem}
                    onRunEvaluation={(sku) => {
                      setActiveView('decision');
                      runEvaluationForSku(sku);
                    }}
                    isEvaluating={isEvaluating}
                    onLoadSeeds={handleLoadSeeds}
                    onClearSeeds={handleClearSeeds}
                  />
                </div>
              )}

              {activeView === 'audit' && (
                <div className="enterprise-card p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EADFD4] pb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-[#827783]" />
                      <h3 className="font-heading font-bold text-sm text-[#342E35]">
                        Executive Audit & Decision Log
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-[#827783]">
                      Total Recorded Actions: {recentActions.length}
                    </span>
                  </div>

                  {recentActions.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#827783]">
                      No decision actions recorded in this session yet. Approve an order in the Chat or Decision Console to record an ERP entry.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentActions.map((act, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-[#FFF9F0] rounded-xl border border-[#EADFD4] flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 font-mono font-bold text-[#342E35]">
                              <span className="text-[#342E35] bg-[#DCC8F4]/50 px-2 py-0.5 rounded-lg border border-[#cfb6ec]">{act.sku}</span>
                              <span>•</span>
                              <span className={act.action === 'APPROVE' ? 'text-emerald-700 bg-[#D1F2D9] px-2 py-0.5 rounded-lg' : 'text-amber-800 bg-[#F5D6B8] px-2 py-0.5 rounded-lg'}>
                                {act.action}
                              </span>
                              <span className="text-[#827783]">({act.final_approved_quantity} units)</span>
                            </div>
                            <p className="text-[#827783] text-[11px] mt-1">{act.message}</p>
                          </div>
                          <span className="text-[11px] font-mono text-[#827783]">
                            {new Date(act.recorded_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeView === 'analytics' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card-peach p-5 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#342E35]/70">Total Catalog Value</span>
                      <p className="text-2xl font-bold font-mono text-[#342E35]">
                        ${inventory.reduce((acc, i) => acc + i.current_stock * (i.unit_cost_usd || 0), 0).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-[#827783]">Across {inventory.length} managed SKUs</p>
                    </div>

                    <div className="card-pink p-5 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Critical Stockout Alert</span>
                      <p className="text-2xl font-bold font-mono text-rose-900">
                        {inventory.filter((i) => i.current_stock / (i.daily_velocity || 1) < i.supplier_lead_time_days).length} SKUs
                      </p>
                      <p className="text-[11px] text-[#827783]">Current stock below lead time replenishment</p>
                    </div>

                    <div className="card-lavender p-5 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-900">Perishable SKUs</span>
                      <p className="text-2xl font-bold font-mono text-purple-950">
                        {inventory.filter((i) => i.shelf_life_days && i.shelf_life_days > 0).length} SKUs
                      </p>
                      <p className="text-[11px] text-[#827783]">Subject to self-challenge spoilage calibration</p>
                    </div>
                  </div>

                  <div className="enterprise-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading font-bold text-sm text-[#342E35]">Stock Runway & Lead Time Analysis</h3>
                      <span className="text-xs font-mono text-[#827783]">{inventory.length} SKUs Monitored</span>
                    </div>
                    <div className="space-y-3">
                      {inventory.map((item) => {
                        const runway = (item.current_stock / (item.daily_velocity || 1)).toFixed(1);
                        const isCritical = Number(runway) < item.supplier_lead_time_days;
                        const isSelected = selectedItem?.sku === item.sku;
                        return (
                          <div
                            key={item.sku}
                            onClick={() => handleSelectItem(item)}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                              isSelected ? 'bg-[#F5F0FC] border-[#cfb6ec]' : 'bg-[#FFF9F0] border-[#EADFD4] hover:bg-[#FDF6ED]'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-[#342E35] font-mono flex items-center gap-2">
                                <span>{item.sku} - {item.product_name}</span>
                                {isSelected && (
                                  <span className="text-[10px] bg-[#DCC8F4] px-1.5 py-0.2 rounded font-sans font-bold">Selected</span>
                                )}
                              </div>
                              <div className="text-[#827783] text-[11px] mt-0.5">
                                Velocity: {item.daily_velocity}/day | Lead Time: {item.supplier_lead_time_days} days | MOQ: {item.supplier_moq}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`px-2.5 py-1 rounded-full font-mono text-xs font-bold ${isCritical ? 'bg-[#F1C5D0] text-rose-900 border border-[#e8bac7]' : 'bg-[#D1F2D9] text-emerald-800 border border-[#bce8c6]'}`}>
                                {runway} days runway
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'settings' && (
                <div className="enterprise-card p-6 space-y-6">
                  <div className="border-b border-[#EADFD4] pb-4">
                    <h3 className="font-heading font-bold text-base text-[#342E35]">DecisionGuard AI Engine Configuration</h3>
                    <p className="text-xs text-[#827783] mt-1">Configured AI providers, persistence database, and self-challenge heuristics.</p>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="p-4 bg-[#FFF9F0] rounded-xl border border-[#EADFD4] space-y-2">
                      <div className="font-mono font-bold text-[#342E35] text-sm flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#DCC8F4]"></span>
                        Active AI Model Provider
                      </div>
                      <p className="text-[#342E35]">
                        Configured via environment variable <code className="bg-[#FFFFFF] border border-[#EADFD4] px-1.5 py-0.5 rounded text-[#342E35] font-mono">LLM_PROVIDER</code> (Default: <code className="text-emerald-700 font-bold">gemini</code> with <code className="text-[#342E35] font-mono">gemini-1.5-flash</code>).
                      </p>
                      <p className="text-[#827783] text-[11px]">
                        Supports Google Gemini (`gemini-1.5-flash`, `gemini-1.5-pro`) and OpenAI/Groq (`gpt-4o`, `gpt-4o-mini`). When no API key is provided, the engine automatically operates in full deterministic self-challenge mode.
                      </p>
                    </div>

                    <div className="p-4 bg-[#FFF9F0] rounded-xl border border-[#EADFD4] space-y-2">
                      <div className="font-mono font-bold text-[#342E35] text-sm flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F5D6B8]"></span>
                        Catalog Telemetry & Seed Control
                      </div>
                      <p className="text-[#342E35]">
                        The database supports dynamic multi-industry catalogs. Core dataset contains 5 gold-standard calibration benchmarks. An optional synthetic dataset generator adds 7 realistic multi-industry profiles for a total of 12 SKUs.
                      </p>
                      <div className="pt-1">
                        <button
                          onClick={inventory.length > 5 ? handleClearSeeds : handleLoadSeeds}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#EADFD4] text-xs font-mono font-bold text-[#342E35] hover:bg-[#FFF9F0] cursor-pointer shadow-soft-sm"
                        >
                          <Database className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{inventory.length > 5 ? 'Reset Catalog to 5 Baseline Benchmarks' : 'Load 7 Synthetic Multi-Industry SKUs'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-[#FFF9F0] rounded-xl border border-[#EADFD4] space-y-2">
                      <div className="font-mono font-bold text-[#342E35] text-sm flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#C9DCF5]"></span>
                        Overconfidence Defense Heuristics
                      </div>
                      <p className="text-[#342E35]">
                        Multi-pass deterministic challenger rules execute alongside LLM critique:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-[#827783] text-[11px]">
                        <li>Perishability vs. Shelf-Life Spoilage Calibration</li>
                        <li>Supplier Reliability & Lead-Time Variance Buffer</li>
                        <li>Minimum Order Quantity (MOQ) Step Validation</li>
                        <li>Working Capital & Capital Risk Constraints</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </>
        )}
      </div>

      {/* New Scenario Dynamic Creator Modal */}
      <NewScenarioModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateCustomScenario}
      />
    </div>
  );
}
