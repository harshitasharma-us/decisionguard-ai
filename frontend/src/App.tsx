import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { FlowBreadcrumbs } from './components/FlowBreadcrumbs';
import { InventorySelector } from './components/InventorySelector';
import { EvaluationView } from './components/EvaluationView';
import { HumanActionPanel } from './components/HumanActionPanel';
import { apiService, HealthResponse } from './services/api';
import {
  InventoryItem,
  EvaluationResponse,
  DecisionActionResponse,
} from './types/inventory';
import { Info, Sparkles, RefreshCw } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState<boolean>(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [recentActions, setRecentActions] = useState<DecisionActionResponse[]>([]);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    await checkBackendHealth();
    await loadInventory();
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
    try {
      const items = await apiService.getInventory();
      setInventory(items);
      if (items.length > 0 && !selectedItem) {
        setSelectedItem(items[0]);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleRunEvaluation = async () => {
    if (!selectedItem) return;
    setIsEvaluating(true);
    setEvaluation(null);

    // Progressive stage animation for interactive hackathon demo
    setCurrentStage(2); // Single-Pass
    setTimeout(() => setCurrentStage(3), 400); // Self-Challenge
    setTimeout(() => setCurrentStage(4), 800); // Re-evaluation

    try {
      const result = await apiService.evaluateSku(selectedItem.sku);
      setTimeout(() => {
        setEvaluation(result);
        setCurrentStage(5); // Final synthesis
        setIsEvaluating(false);
      }, 1100);
    } catch (err) {
      console.error('Evaluation failed:', err);
      setIsEvaluating(false);
      setCurrentStage(1);
    }
  };

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setEvaluation(null);
    setCurrentStage(1);
  };

  const handleActionComplete = (actionRes: DecisionActionResponse) => {
    setRecentActions((prev) => [actionRes, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <Header
        health={health}
        healthLoading={healthLoading}
        onRefreshHealth={checkBackendHealth}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-7">
        {/* Core Value Banner */}
        <div className="bg-gradient-to-r from-cyan-950/30 via-slate-900/60 to-emerald-950/30 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 mt-0.5">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-white">
                How DecisionGuard AI Works
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                Conventional AI reorder systems output overconfident single-pass quantities. DecisionGuard AI forces the AI to challenge its own recommendation by identifying counter-arguments, missing constraints, and alternative order batches before presenting the synthesized decision.
              </p>
            </div>
          </div>

          <button
            onClick={loadInventory}
            disabled={inventoryLoading}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${inventoryLoading ? 'animate-spin' : ''}`} />
            Reload SKUs
          </button>
        </div>

        {/* 5-Stage Visual Workflow Pipeline */}
        <FlowBreadcrumbs
          currentStage={currentStage}
          isEvaluating={isEvaluating}
          outcome={evaluation?.decision_outcome}
        />

        {/* Inventory SKU Grid / Selection */}
        {inventoryLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Loading synthetic inventory records...
          </div>
        ) : (
          <InventorySelector
            items={inventory}
            selectedItem={selectedItem}
            onSelectItem={handleSelectItem}
            onRunEvaluation={handleRunEvaluation}
            isEvaluating={isEvaluating}
          />
        )}

        {/* Evaluation Output or Prompt to Run */}
        {evaluation ? (
          <div className="space-y-6 pt-2">
            <EvaluationView evaluation={evaluation} />
            <HumanActionPanel
              evaluation={evaluation}
              onActionComplete={handleActionComplete}
            />
          </div>
        ) : selectedItem ? (
          <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">
              Ready to challenge reorder for {selectedItem.sku}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Click &quot;Run DecisionGuard AI&quot; above to initiate the multi-pass self-challenge decision cycle.
            </p>
            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Launch Analysis
            </button>
          </div>
        ) : null}

        {/* Recent Human Actions Audit Trail */}
        {recentActions.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Session Action Audit Trail
            </h3>
            <div className="space-y-2">
              {recentActions.map((act, i) => (
                <div
                  key={i}
                  className="bg-slate-950/60 border border-slate-800/80 px-3.5 py-2 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-400">{act.sku}</span>
                    <span className="text-slate-500">•</span>
                    <span className="font-semibold text-white">{act.action}</span>
                    <span className="text-slate-400">({act.final_approved_quantity} units)</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {new Date(act.recorded_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/80 px-6 py-4 text-center text-xs text-slate-500">
        DecisionGuard AI — Self-Challenging Stock Reorder Assistant
      </footer>
    </div>
  );
}
