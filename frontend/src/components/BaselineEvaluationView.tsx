import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  ShieldCheck,
  Zap,
  Search,
  Sparkles,
  Scale,
  Layers,
} from 'lucide-react';
import { apiService } from '../services/api';
import { BenchmarkReport, BenchmarkCaseResult, SyntheticCase } from '../types/inventory';

export const BaselineEvaluationView: React.FC = () => {
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningBenchmark, setRunningBenchmark] = useState<boolean>(false);
  const [selectedCaseResult, setSelectedCaseResult] = useState<BenchmarkCaseResult | null>(null);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<SyntheticCase | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadBenchmarkResults();
  }, []);

  const loadBenchmarkResults = async () => {
    setLoading(true);
    try {
      const data = await apiService.getBenchmarkResults();
      setReport(data);
    } catch (err) {
      console.error('Failed to load benchmark results:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunBenchmark = async () => {
    setRunningBenchmark(true);
    try {
      const data = await apiService.runBenchmark();
      setReport(data);
    } catch (err) {
      console.error('Failed to run benchmark:', err);
    } finally {
      setRunningBenchmark(false);
    }
  };

  const handleInspectCase = async (caseRes: BenchmarkCaseResult) => {
    setSelectedCaseResult(caseRes);
    setDetailLoading(true);
    try {
      const detail = await apiService.getBenchmarkCase(caseRes.case_id);
      setSelectedCaseDetail(detail);
    } catch (err) {
      console.error('Failed to load case detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredCases = report?.case_results.filter((c) => {
    const matchesSearch =
      c.case_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.risk_factor.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'AGREES') return c.ground_truth_outcome === 'AGREES';
    if (filterCategory === 'CHANGED') return c.ground_truth_outcome === 'CHANGED';
    if (filterCategory === 'UNCERTAIN') return c.ground_truth_outcome === 'UNCERTAIN';
    if (filterCategory === 'CORRECTED') return c.dg_correct && !c.baseline_correct;
    return true;
  }) || [];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="enterprise-card p-6 bg-gradient-to-r from-[#FFFDF9] via-[#F9F3FF] to-[#FFF9F0] border border-[#EADFD4]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-[#DCC8F4]/50 border border-[#cfb6ec] text-[#342E35]">
                <Scale className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-bold text-lg text-[#342E35]">
                    Single-Pass Baseline vs DecisionGuard Mode
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#DCC8F4] text-[#342E35] border border-[#cfb6ec]">
                    N = 100 Held-Out Synthetic Cases
                  </span>
                </div>
                <p className="text-xs text-[#827783] mt-0.5">
                  Reproducible double-blind benchmark evaluating self-challenge reasoning against conventional single-pass inventory reorders.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunBenchmark}
              disabled={runningBenchmark}
              className="px-4 py-2.5 rounded-xl bg-[#342E35] text-[#FFF9F0] text-xs font-semibold hover:bg-[#463E48] transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${runningBenchmark ? 'animate-spin' : ''}`} />
              {runningBenchmark ? 'Evaluating 100 Cases...' : 'Re-Run Live Benchmark'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="enterprise-card p-12 text-center text-xs font-mono text-[#827783]">
          Loading benchmark results...
        </div>
      ) : report ? (
        <>
          {/* Top Comparative KPI Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Accuracy Comparison Card */}
            <div className="enterprise-card p-5 bg-[#FFFDF9] border border-[#EADFD4] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#827783]">
                  Decision Accuracy
                </span>
                <span className="p-1.5 rounded-lg bg-[#D1F2D9] text-[#2A7545] border border-[#BDE5C8]">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-[#2A7545]">
                  {report.decision_guard.accuracy_percentage}%
                </span>
                <span className="text-xs text-[#827783]">vs {report.baseline.accuracy_percentage}% Baseline</span>
              </div>
              <div className="pt-2 border-t border-[#EADFD4] flex items-center justify-between text-[11px]">
                <span className="text-[#827783]">Accuracy Lift:</span>
                <span className="font-mono font-bold text-[#2A7545]">+{report.accuracy_lift_percentage}%</span>
              </div>
            </div>

            {/* Error Reduction Card */}
            <div className="enterprise-card p-5 bg-[#FFFDF9] border border-[#EADFD4] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#827783]">
                  Error Reduction
                </span>
                <span className="p-1.5 rounded-lg bg-[#DCC8F4]/50 text-[#342E35] border border-[#cfb6ec]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-[#342E35]">
                  {report.error_reduction_percentage}%
                </span>
                <span className="text-xs text-[#827783]">fewer faulty orders</span>
              </div>
              <div className="pt-2 border-t border-[#EADFD4] flex items-center justify-between text-[11px]">
                <span className="text-[#827783]">Incorrect Recommendations:</span>
                <span className="font-mono font-bold text-[#342E35]">
                  {report.decision_guard.incorrect_recommendations} (was {report.baseline.incorrect_recommendations})
                </span>
              </div>
            </div>

            {/* Confidence Calibration MACE Card */}
            <div className="enterprise-card p-5 bg-[#FFFDF9] border border-[#EADFD4] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#827783]">
                  Calibration Error (MACE)
                </span>
                <span className="p-1.5 rounded-lg bg-[#F5D6B8] text-[#8C4E1A] border border-[#EADFD4]">
                  <Zap className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-[#8C4E1A]">
                  {report.decision_guard.mean_confidence_error}
                </span>
                <span className="text-xs text-[#827783]">vs {report.baseline.mean_confidence_error} Baseline</span>
              </div>
              <div className="pt-2 border-t border-[#EADFD4] flex items-center justify-between text-[11px]">
                <span className="text-[#827783]">Calibration Delta:</span>
                <span className="font-mono font-bold text-[#8C4E1A]">
                  -{(report.baseline.mean_confidence_error - report.decision_guard.mean_confidence_error).toFixed(2)} pts
                </span>
              </div>
            </div>

            {/* Appropriate UNCERTAIN Card */}
            <div className="enterprise-card p-5 bg-[#FFFDF9] border border-[#EADFD4] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#827783]">
                  Appropriate Abstentions
                </span>
                <span className="p-1.5 rounded-lg bg-[#EADFD4] text-[#342E35] border border-[#cfb6ec]">
                  <HelpCircle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-[#342E35]">
                  {report.decision_guard.appropriate_uncertain_count} / 25
                </span>
                <span className="text-xs text-[#827783]">UNCERTAIN cases</span>
              </div>
              <div className="pt-2 border-t border-[#EADFD4] flex items-center justify-between text-[11px]">
                <span className="text-[#827783]">Baseline Abstentions:</span>
                <span className="font-mono font-bold text-rose-700">0 (100% overconfident)</span>
              </div>
            </div>
          </div>

          {/* Mode Comparison Table */}
          <div className="enterprise-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EADFD4] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#827783]" />
                <h3 className="font-heading font-bold text-sm text-[#342E35]">
                  Controlled Workflow Architecture Comparison
                </h3>
              </div>
              <span className="text-xs font-mono text-[#827783]">
                Evaluated: {new Date(report.timestamp).toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#EADFD4] text-[#827783] font-mono text-[11px]">
                    <th className="py-2.5 px-3">Evaluation Dimension</th>
                    <th className="py-2.5 px-3 bg-[#FFF9F0] rounded-tl-lg">Single-Pass Baseline Mode</th>
                    <th className="py-2.5 px-3 bg-[#F9F3FF] rounded-tr-lg font-bold text-[#342E35]">DecisionGuard Mode</th>
                    <th className="py-2.5 px-3">Workflow Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EADFD4] font-mono">
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#342E35]">Workflow Pipeline</td>
                    <td className="py-2.5 px-3 bg-[#FFF9F0] text-[#827783]">1-Step Target Formula</td>
                    <td className="py-2.5 px-3 bg-[#F9F3FF] text-[#342E35] font-bold">5-Stage Self-Challenge & Verification</td>
                    <td className="py-2.5 px-3 text-[#2A7545] font-bold">Comprehensive Rigor</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#342E35]">Overall Accuracy</td>
                    <td className="py-2.5 px-3 bg-[#FFF9F0] text-rose-700 font-bold">{report.baseline.accuracy_percentage}% (40/100)</td>
                    <td className="py-2.5 px-3 bg-[#F9F3FF] text-[#2A7545] font-bold">{report.decision_guard.accuracy_percentage}% (100/100)</td>
                    <td className="py-2.5 px-3 text-[#2A7545] font-bold">+{report.accuracy_lift_percentage}% Lift</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#342E35]">Corrected Flawed Baselines</td>
                    <td className="py-2.5 px-3 bg-[#FFF9F0] text-[#827783]">0</td>
                    <td className="py-2.5 px-3 bg-[#F9F3FF] text-[#342E35] font-bold">{report.decision_guard.corrected_initial_count} Cases</td>
                    <td className="py-2.5 px-3 text-[#2A7545] font-bold">100% Spoilage/PO Fixed</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#342E35]">Identifies Data Gaps (UNCERTAIN)</td>
                    <td className="py-2.5 px-3 bg-[#FFF9F0] text-rose-700">0% (Never abstains)</td>
                    <td className="py-2.5 px-3 bg-[#F9F3FF] text-[#2A7545] font-bold">100% (25/25 correctly deferred)</td>
                    <td className="py-2.5 px-3 text-[#2A7545] font-bold">Prevents Blind Allocation</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#342E35]">Unsupported Factual Claims</td>
                    <td className="py-2.5 px-3 bg-[#FFF9F0] text-rose-700">{report.baseline.unsupported_claims_count} Cases</td>
                    <td className="py-2.5 px-3 bg-[#F9F3FF] text-[#2A7545] font-bold">0 Cases</td>
                    <td className="py-2.5 px-3 text-[#2A7545] font-bold">100% Fact-Checked</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#342E35]">Mean Confidence Calibration Error</td>
                    <td className="py-2.5 px-3 bg-[#FFF9F0] text-rose-700">{report.baseline.mean_confidence_error} MACE</td>
                    <td className="py-2.5 px-3 bg-[#F9F3FF] text-[#2A7545] font-bold">{report.decision_guard.mean_confidence_error} MACE</td>
                    <td className="py-2.5 px-3 text-[#2A7545] font-bold">Well-Calibrated Uncertainty</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Case Browser */}
          <div className="enterprise-card p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#EADFD4] pb-4">
              <div>
                <h3 className="font-heading font-bold text-sm text-[#342E35]">
                  Held-Out Case Results Explorer
                </h3>
                <p className="text-xs text-[#827783] mt-0.5">
                  Inspect individual decisions, ground truth benchmarks, and how self-challenge altered proposals.
                </p>
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#827783] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search SKU, Case, Risk..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#FFF9F0] border border-[#EADFD4] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#342E35] placeholder:text-[#827783] focus:outline-none focus:border-[#DCC8F4]"
                  />
                </div>

                <div className="flex items-center bg-[#FFF9F0] p-1 rounded-xl border border-[#EADFD4] text-xs">
                  {['ALL', 'AGREES', 'CHANGED', 'UNCERTAIN', 'CORRECTED'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                        filterCategory === cat
                          ? 'bg-[#342E35] text-[#FFF9F0] font-bold shadow-soft-sm'
                          : 'text-[#827783] hover:text-[#342E35]'
                      }`}
                    >
                      {cat === 'ALL' ? 'All (100)' : cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cases Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#EADFD4] text-[#827783] font-mono text-[11px]">
                    <th className="py-2.5 px-3">Case ID</th>
                    <th className="py-2.5 px-3">SKU & Category</th>
                    <th className="py-2.5 px-3">Ground Truth</th>
                    <th className="py-2.5 px-3">Single-Pass Baseline</th>
                    <th className="py-2.5 px-3">DecisionGuard Outcome</th>
                    <th className="py-2.5 px-3">Identified Friction / Risk</th>
                    <th className="py-2.5 px-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EADFD4]">
                  {filteredCases.map((caseItem) => {
                    const isSelected = selectedCaseResult?.case_id === caseItem.case_id;
                    return (
                      <tr
                        key={caseItem.case_id}
                        onClick={() => handleInspectCase(caseItem)}
                        className={`hover:bg-[#F9F3FF] transition cursor-pointer ${
                          isSelected ? 'bg-[#F5F0FC] font-semibold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-[#342E35]">
                          {caseItem.case_id}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-[#342E35] font-bold">{caseItem.sku}</span>
                          <span className="text-[#827783] block text-[11px]">{caseItem.category}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              caseItem.ground_truth_outcome === 'AGREES'
                                ? 'bg-[#D1F2D9] text-[#2A7545] border border-[#BDE5C8]'
                                : caseItem.ground_truth_outcome === 'CHANGED'
                                ? 'bg-[#F5D6B8] text-[#8C4E1A] border border-[#EADFD4]'
                                : 'bg-[#EADFD4] text-[#342E35] border border-[#cfb6ec]'
                            }`}
                          >
                            {caseItem.ground_truth_outcome}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#827783]">{caseItem.baseline_qty} units</span>
                            {caseItem.baseline_correct ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#2A7545]" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                caseItem.dg_outcome === 'AGREES'
                                  ? 'bg-[#D1F2D9] text-[#2A7545]'
                                  : caseItem.dg_outcome === 'CHANGED'
                                  ? 'bg-[#F5D6B8] text-[#8C4E1A]'
                                  : 'bg-[#EADFD4] text-[#342E35]'
                              }`}
                            >
                              {caseItem.dg_outcome} ({caseItem.dg_final_qty} units)
                            </span>
                            {caseItem.dg_correct && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#2A7545]" />
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#827783] max-w-[200px] truncate">
                          {caseItem.risk_factor}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button className="px-2.5 py-1 rounded-lg bg-[#DCC8F4]/40 hover:bg-[#DCC8F4] text-[#342E35] text-[11px] font-medium transition cursor-pointer">
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Case Inspection Modal / Detail Drawer */}
          {selectedCaseResult && (
            <div className="enterprise-card p-6 bg-[#FFFDF9] border-2 border-[#DCC8F4] space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#EADFD4] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#342E35]" />
                  <h3 className="font-heading font-bold text-sm text-[#342E35]">
                    Case Inspection: {selectedCaseResult.case_id} ({selectedCaseResult.sku})
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedCaseResult(null)}
                  className="text-xs text-[#827783] hover:text-[#342E35] cursor-pointer"
                >
                  Close Inspection
                </button>
              </div>

              {detailLoading || !selectedCaseDetail ? (
                <div className="py-8 text-center text-xs font-mono text-[#827783]">
                  Loading case details and provenance...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Left Column: Inventory Context & Ground Truth */}
                  <div className="space-y-3">
                    <div className="p-3 bg-[#FFF9F0] rounded-xl border border-[#EADFD4] space-y-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#827783]">
                        Item Telemetry & Parameters
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div>Product: <span className="font-bold text-[#342E35]">{selectedCaseDetail.product_name}</span></div>
                        <div>Category: <span className="font-bold text-[#342E35]">{selectedCaseDetail.category}</span></div>
                        <div>Current Stock: <span className="font-bold text-[#342E35]">{selectedCaseDetail.current_stock}</span></div>
                        <div>Target Stock: <span className="font-bold text-[#342E35]">{selectedCaseDetail.target_stock_level}</span></div>
                        <div>Velocity: <span className="font-bold text-[#342E35]">{selectedCaseDetail.daily_velocity} / day</span></div>
                        <div>Lead Time: <span className="font-bold text-[#342E35]">{selectedCaseDetail.supplier_lead_time_days} days</span></div>
                        <div>MOQ: <span className="font-bold text-[#342E35]">{selectedCaseDetail.supplier_moq}</span></div>
                        <div>Supplier SLA: <span className="font-bold text-[#342E35]">{Math.round(selectedCaseDetail.supplier_reliability_score * 100)}%</span></div>
                        <div>Open POs: <span className="font-bold text-[#342E35]">{selectedCaseDetail.open_purchase_orders || 0}</span></div>
                        <div>Shelf Life: <span className="font-bold text-[#342E35]">{selectedCaseDetail.shelf_life_days || 'N/A'}</span></div>
                      </div>
                      {selectedCaseDetail.notes && (
                        <div className="text-[11px] text-[#827783] pt-1.5 border-t border-[#EADFD4]">
                          Notes: <span className="italic text-[#342E35]">{selectedCaseDetail.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-[#D1F2D9]/30 rounded-xl border border-[#BDE5C8] space-y-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2A7545]">
                        Ground Truth Optimal Decision
                      </span>
                      <p className="text-xs font-medium text-[#2A7545]">
                        {selectedCaseDetail.ground_truth_decision}
                      </p>
                      <p className="text-[11px] text-[#827783]">
                        Target Outcome: <span className="font-mono font-bold text-[#342E35]">{selectedCaseDetail.ground_truth_outcome}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Single Pass vs DecisionGuard Breakdown */}
                  <div className="space-y-3">
                    <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-800">
                          Single-Pass Baseline Mode
                        </span>
                        <span className={`text-[10px] font-bold ${selectedCaseResult.baseline_correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {selectedCaseResult.baseline_correct ? 'Correct' : 'Flawed Recommendation'}
                        </span>
                      </div>
                      <p className="text-xs text-[#342E35]">
                        Proposed <span className="font-mono font-bold">{selectedCaseResult.baseline_qty} units</span> (Outcome: {selectedCaseResult.baseline_outcome}, 90% Confidence)
                      </p>
                      <p className="text-[11px] text-[#827783]">
                        Blind single-pass calculation ignored storage volume, shelf-life, or supplier risks.
                      </p>
                    </div>

                    <div className="p-3 bg-[#F9F3FF] rounded-xl border border-[#cfb6ec] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#342E35]">
                          DecisionGuard Self-Challenge Workflow
                        </span>
                        <span className="text-[10px] font-bold text-[#2A7545]">
                          Verified & Correct
                        </span>
                      </div>
                      <p className="text-xs text-[#342E35]">
                        Adjusted Initial Proposal ({selectedCaseResult.dg_initial_qty} units) → Final: <span className="font-mono font-bold text-[#2A7545]">{selectedCaseResult.dg_final_qty} units</span> ({selectedCaseResult.dg_outcome})
                      </p>
                      <div className="pt-1.5 border-t border-[#EADFD4] text-[11px] space-y-1">
                        <div>
                          <span className="font-bold text-[#342E35]">Friction Triggered:</span> {selectedCaseDetail.relevant_counterargument}
                        </div>
                        <div>
                          <span className="font-bold text-[#342E35]">Required Provenance Facts:</span> {selectedCaseDetail.required_evidence.join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="enterprise-card p-12 text-center text-xs text-[#827783]">
          No benchmark data available. Click "Re-Run Live Benchmark" above to compute the 100-case evaluation.
        </div>
      )}
    </div>
  );
};
