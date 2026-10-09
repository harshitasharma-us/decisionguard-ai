import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { InventoryIntelligenceBar } from './components/InventoryIntelligenceBar';
import { DecisionJourney } from './components/DecisionJourney';
import { HeroResultCard } from './components/HeroResultCard';
import { BeforeAfterComparison } from './components/BeforeAfterComparison';
import { SelfChallengePanel } from './components/SelfChallengePanel';
import { DemandStockChart } from './components/DemandStockChart';
import { HumanDecisionArea } from './components/HumanDecisionArea';

import { apiService, HealthResponse } from './services/api';
import {
  InventoryItem,
  EvaluationResponse,
  DecisionActionResponse,
} from './types/inventory';
import { Sparkles, Terminal, ShieldAlert } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('decision');

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
      if (items.length > 0) {
        setSelectedItem(items[0]);
        // Auto-run evaluation on the default item for immediate 5-second hackathon presentation impact!
        runEvaluationForSku(items[0].sku);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setInventoryLoading(false);
    }
  };

  const runEvaluationForSku = async (sku: string) => {
    setIsEvaluating(true);
    setEvaluation(null);

    // Multi-stage progressive pipeline animation (150-400ms paced)
    setCurrentStage(2); // Single-Pass
    setTimeout(() => setCurrentStage(3), 350); // Self-Challenge
    setTimeout(() => setCurrentStage(4), 700); // Re-evaluation

    try {
      const result = await apiService.evaluateSku(sku);
      setTimeout(() => {
        setEvaluation(result);
        setCurrentStage(4);
        setIsEvaluating(false);
      }, 950);
    } catch (err) {
      console.error('Evaluation failed:', err);
      setIsEvaluating(false);
      setCurrentStage(1);
    }
  };

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    runEvaluationForSku(item.sku);
  };

  const handleTriggerEvaluation = () => {
    if (selectedItem) {
      runEvaluationForSku(selectedItem.sku);
    }
  };

  const handleActionComplete = (res: DecisionActionResponse) => {
    setRecentActions((prev) => [res, ...prev]);
  };

  return (
    <div className="min-h-screen bg-dg-bg text-dg-text font-space selection:bg-dg-violet/40 selection:text-dg-cyan flex flex-col tech-grid-pattern">
      {/* Top Navigation */}
      <Navbar
        health={health}
        healthLoading={healthLoading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefreshHealth={checkBackendHealth}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        {/* Hero Section */}
        <HeroSection
          isEvaluating={isEvaluating}
          onTriggerEvaluation={handleTriggerEvaluation}
          selectedSku={selectedItem?.sku || 'SKU-ELEC-1001'}
        />

        {/* Inventory Intelligence Strip */}
        {inventoryLoading ? (
          <div className="dg-panel rounded-panel p-8 text-center text-xs font-mono text-dg-dim">
            LOADING INVENTORY TELEMETRY...
          </div>
        ) : (
          <InventoryIntelligenceBar
            items={inventory}
            selectedItem={selectedItem}
            onSelectItem={handleSelectItem}
            isEvaluating={isEvaluating}
          />
        )}

        {/* Main Connected Decision Journey */}
        <DecisionJourney
          evaluation={evaluation}
          currentStage={currentStage}
          isEvaluating={isEvaluating}
        />

        {/* Dynamic Tab Views */}
        {activeTab === 'decision' && (
          <div className="space-y-7 animate-fadeIn">
            {evaluation ? (
              <>
                {/* Prominent Hero Result */}
                <HeroResultCard evaluation={evaluation} />

                {/* Side-by-Side Comparison */}
                <BeforeAfterComparison evaluation={evaluation} />

                {/* Self-Challenge 3 Investigation Lanes */}
                <SelfChallengePanel evaluation={evaluation} />

                {/* Demand Volatility Chart & Human Decision Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
                  {selectedItem && (
                    <div className="lg:col-span-6">
                      <DemandStockChart item={selectedItem} />
                    </div>
                  )}
                  <div className={selectedItem ? 'lg:col-span-6' : 'lg:col-span-12'}>
                    <HumanDecisionArea
                      evaluation={evaluation}
                      onActionComplete={handleActionComplete}
                      recentActions={recentActions}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="dg-panel rounded-hero p-12 text-center space-y-3">
                <Sparkles className="w-8 h-8 text-dg-cyan mx-auto animate-ai-pulse" />
                <h3 className="text-base font-bold font-space text-white">
                  Awaiting Decision Trigger
                </h3>
                <p className="text-xs text-dg-muted font-space max-w-md mx-auto">
                  Click &quot;Challenge Reorder&quot; above to initiate the autonomous self-challenge audit loop.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && evaluation && (
          <div className="space-y-7 animate-fadeIn">
            <SelfChallengePanel evaluation={evaluation} />
            <BeforeAfterComparison evaluation={evaluation} />
            {selectedItem && <DemandStockChart item={selectedItem} />}
          </div>
        )}

        {activeTab === 'inventory' && selectedItem && (
          <div className="space-y-7 animate-fadeIn">
            <DemandStockChart item={selectedItem} />
            {evaluation && <HeroResultCard evaluation={evaluation} />}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="dg-panel rounded-hero p-6 sm:p-8 space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-dg-violet/15 pb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-dg-cyan" />
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">
                  Adversarial Audit & Human Decision Log
                </h2>
              </div>
              <span className="text-xs font-mono text-dg-dim">
                TOTAL ACTIONS: {recentActions.length}
              </span>
            </div>

            {recentActions.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-dg-dim space-y-2">
                <ShieldAlert className="w-6 h-6 text-dg-lavender mx-auto opacity-40" />
                <p>No actions logged yet in this session.</p>
                <p className="text-dg-dim">Execute an Approve or Modify decision to create an audit record.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActions.map((act, i) => (
                  <div
                    key={i}
                    className="bg-dg-bg/80 p-4 rounded-panel border border-dg-violet/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-dg-cyan">{act.sku}</span>
                        <span className="text-dg-dim">•</span>
                        <span className="font-semibold text-dg-text">{act.action}</span>
                        <span className="text-dg-lavender">({act.final_approved_quantity} units)</span>
                      </div>
                      <p className="text-[11px] text-dg-muted font-space">{act.message}</p>
                    </div>
                    <span className="text-[11px] text-dg-dim shrink-0">
                      {new Date(act.recorded_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-dg-violet/15 bg-dg-bg/90 px-6 py-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-space text-dg-dim">
          <div className="flex items-center gap-2">
            <span className="font-bold text-dg-muted">DECISIONGUARD AI</span>
            <span>—</span>
            <span>Self-Challenging Stock Reorder Assistant</span>
          </div>
          <div className="font-mono text-[11px] text-dg-dim">
            &quot;AI that challenges its own decisions.&quot;
          </div>
        </div>
      </footer>
    </div>
  );
}
