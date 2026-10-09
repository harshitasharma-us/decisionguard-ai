import React, { useState, useEffect } from 'react';
import {
  EvaluationResponse,
  InventoryItem,
  DecisionActionResponse,
  DecisionOutcome,
} from '../types/inventory';
import { apiService } from '../services/api';
import { DoubleCheckComparisonCard } from './DoubleCheckComparisonCard';
import {
  Sparkles,
  Bot,
  ShieldAlert,
  GitCompare,
  Award,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Sliders,
  Check,
  Edit3,
  Clock,
  X,
  FileSearch,
  Layers,
  Activity,
  Calculator,
  Cpu,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface SelfChallengeConsoleProps {
  evaluation: EvaluationResponse;
  selectedItem: InventoryItem;
  currentStage: number;
  isEvaluating: boolean;
  onActionComplete: (res: DecisionActionResponse) => void;
  recentActions: DecisionActionResponse[];
}

export const SelfChallengeConsole: React.FC<SelfChallengeConsoleProps> = ({
  evaluation,
  selectedItem,
  currentStage,
  isEvaluating,
  onActionComplete,
  recentActions,
}) => {
  const single_pass = evaluation.single_pass || evaluation.single_pass_recommendation!;
  const self_challenge = evaluation.self_challenge;
  const final_recommendation = evaluation.final_recommendation || evaluation.final_decision!;
  const transparent_metrics = evaluation.transparent_metrics || evaluation.calculations!;
  const {
    confidence_before,
    confidence_after,
    confidence_delta,
    decision_outcome,
    summary_verdict,
  } = evaluation;

  const defaultQty = final_recommendation.reorder_quantity ?? final_recommendation.final_reorder_quantity ?? 0;

  // Human sign-off form state
  const [approvedQty, setApprovedQty] = useState<number>(defaultQty);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedAction, setConfirmedAction] = useState<DecisionActionResponse | null>(null);

  useEffect(() => {
    const qty = final_recommendation.reorder_quantity ?? final_recommendation.final_reorder_quantity ?? 0;
    setApprovedQty(qty);
    setNotes('');
    setConfirmedAction(null);
  }, [evaluation]);

  const handleExecuteAction = async (action: 'APPROVE' | 'ADJUST' | 'REJECT' | 'DEFER') => {
    setIsSubmitting(true);
    try {
      const finalQty = action === 'REJECT' ? 0 : approvedQty;
      const res = await apiService.recordDecisionAction(
        evaluation.sku,
        action,
        finalQty,
        notes.trim() || undefined
      );
      setConfirmedAction(res);
      onActionComplete(res);
    } catch (err) {
      console.error('Failed to submit human action:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status-dependent styling for Hero Verdict
  const getOutcomeTheme = (outcome: DecisionOutcome) => {
    switch (outcome) {
      case 'CHANGED':
        return {
          title: 'DECISION CHANGED',
          subtitle: 'Reorder batch trimmed to prevent identified blindspots & spoilage',
          cardBg: 'bg-[#F5D6B8]',
          badgeBg: 'bg-[#FFFFFF] text-[#7A4B1A]',
          icon: AlertTriangle,
        };
      case 'AGREES':
        return {
          title: 'DECISION CONFIRMED',
          subtitle: 'Initial proposal successfully verified against adversarial counter-audit',
          cardBg: 'bg-[#D1F2D9]',
          badgeBg: 'bg-[#FFFFFF] text-[#2A7545]',
          icon: CheckCircle2,
        };
      case 'UNCERTAIN':
        return {
          title: 'HUMAN REVIEW REQUIRED',
          subtitle: 'High supplier volatility or conflicting parameters flagged for manager review',
          cardBg: 'bg-[#F1C5D0]',
          badgeBg: 'bg-[#FFFFFF] text-[#8C2E43]',
          icon: HelpCircle,
        };
    }
  };

  const outcomeTheme = getOutcomeTheme(decision_outcome);
  const StatusIcon = outcomeTheme.icon;

  // Chart data
  const chartHistory = selectedItem.recent_demand_history_7d || [10, 12, 14, 15, 13, 16, 15];
  const chartData = chartHistory.map((val, idx) => ({
    day: `Day 0${idx + 1}`,
    demand: val,
    safety: selectedItem.safety_stock,
  }));

  const steps = [
    {
      step: '01',
      title: 'Initial Proposal',
      sub: `${single_pass.reorder_quantity} units @ ${confidence_before}%`,
      icon: Bot,
    },
    {
      step: '02',
      title: 'Counter-Arguments',
      sub: `${self_challenge.arguments_against.length} risks audited`,
      icon: ShieldAlert,
    },
    {
      step: '03',
      title: 'Missing Facts',
      sub: `${self_challenge.missing_facts_identified.length} latent queries`,
      icon: GitCompare,
    },
    {
      step: '04',
      title: 'Final Verdict',
      sub: `${final_recommendation.reorder_quantity ?? final_recommendation.final_reorder_quantity} units (${decision_outcome})`,
      icon: Award,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 4-Stage Connected Workflow */}
      <div className="enterprise-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#EADFD4] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#342E35]" />
            <h3 className="font-heading font-extrabold text-xs uppercase tracking-wider text-[#342E35]">
              Autonomous Self-Challenge Pipeline
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#827783] font-bold">
            {isEvaluating ? 'AUDITING REASONING...' : 'INVESTIGATION COMPLETE'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((st, idx) => {
            const stepNum = idx + 1;
            const isCompleted = !isEvaluating || currentStage >= stepNum;
            const isCurrent = isEvaluating && currentStage === stepNum;
            const Icon = st.icon;

            return (
              <div
                key={st.step}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'border-[#DCC8F4] bg-[#DCC8F4] shadow-soft-sm'
                    : isCompleted
                    ? 'border-[#EADFD4] bg-[#FFF9F0]'
                    : 'border-[#EADFD4] bg-[#FFFCF7] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-[#342E35]">
                    {st.step}
                  </span>
                  <div className="p-1.5 rounded-xl bg-white/70 text-[#342E35]">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h4 className="text-xs font-bold text-[#342E35] font-heading">
                  {st.title}
                </h4>
                <p className="text-[11px] font-mono text-[#827783] mt-0.5">
                  {st.sub}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prominent Hero Verdict Card (Pastel Banner) */}
      <div className={`p-6 rounded-2xl border border-[#EADFD4] ${outcomeTheme.cardBg} shadow-soft-sm space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-soft-sm ${outcomeTheme.badgeBg}`}>
                <StatusIcon className="w-4 h-4" />
                {outcomeTheme.title}
              </span>
              <span className="text-xs font-mono font-bold text-[#342E35] bg-white/70 px-2.5 py-0.5 rounded-full border border-[#EADFD4]">
                {evaluation.sku}
              </span>
            </div>
            <h2 className="text-lg font-heading font-black text-[#342E35] mt-1">
              {evaluation.product_name}
            </h2>
            <p className="text-xs text-[#342E35]/80 max-w-2xl leading-relaxed font-medium">
              {summary_verdict}
            </p>
          </div>

          {/* Large Quantity Metric Block */}
          <div className="bg-white/80 p-4 rounded-2xl border border-[#EADFD4] flex items-baseline gap-3 shrink-0 shadow-soft-sm">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#827783] block font-mono">
                Validated Volume
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-4xl sm:text-5xl font-heading font-black text-[#342E35]">
                  {final_recommendation.reorder_quantity ?? final_recommendation.final_reorder_quantity}
                </span>
                <span className="text-xs font-bold uppercase text-[#827783]">UNITS</span>
              </div>
            </div>
            <div className="pl-4 border-l border-[#EADFD4] text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#827783] block font-mono">
                Confidence
              </span>
              <span className={`text-2xl font-mono font-bold ${confidence_delta >= 0 ? 'text-[#2A7545]' : 'text-[#7A4B1A]'}`}>
                {confidence_after}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison: Single-Pass AI vs DecisionGuard AI */}
      <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
        {/* Left: Single-Pass Baseline */}
        <div className="md:col-span-5 enterprise-card p-5 space-y-3 bg-[#FFF9F0]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#827783]" />
              <span className="font-heading text-xs font-bold uppercase tracking-wider text-[#342E35]">
                Initial Proposal (Single-Pass)
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F1C5D0] text-[#8C2E43] border border-[#EADFD4]">
              Uncalibrated Baseline
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-[#827783] font-mono">Proposed Reorder</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-heading font-black text-[#827783] line-through">
                {single_pass.reorder_quantity}
              </span>
              <span className="text-xs text-[#827783] uppercase font-medium">units</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EADFD4] text-xs font-mono">
            <div>
              <span className="text-[10px] text-[#827783]">Baseline Confidence:</span>
              <span className="text-sm font-bold text-[#7A4B1A] block">{confidence_before}%</span>
            </div>
            <div>
              <span className="text-[10px] text-[#827783]">Stockout Runway:</span>
              <span className="text-sm font-bold text-[#342E35] block">
                {transparent_metrics?.stockout_runway_days ? `${transparent_metrics.stockout_runway_days.toFixed(1)} days` : 'N/A'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[#827783] leading-relaxed bg-[#FFFFFF] p-3 rounded-xl border border-[#EADFD4] line-clamp-2">
            {single_pass.reasoning}
          </p>
        </div>

        {/* Center: Shift Badge */}
        <div className="md:col-span-1 flex flex-col items-center justify-center text-center py-2 md:py-0">
          <div className="w-9 h-9 rounded-full bg-[#F5D6B8] border border-[#EADFD4] text-[#342E35] flex items-center justify-center shadow-soft-sm">
            <ArrowRight className="w-4 h-4" />
          </div>
          <div className="mt-1.5 space-y-0.5 hidden md:block">
            <span className="text-[9px] font-mono font-bold text-[#827783] uppercase block">Shift</span>
            <span className={`text-[11px] font-mono font-bold flex items-center justify-center ${confidence_delta >= 0 ? 'text-[#2A7545]' : 'text-[#8C2E43]'}`}>
              {confidence_delta >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {Math.abs(confidence_delta)}%
            </span>
          </div>
        </div>

        {/* Right: DecisionGuard Calibrated AI */}
        <div className="md:col-span-5 enterprise-card p-5 border-[#DCC8F4] bg-[#F5F0FC] space-y-3 shadow-soft-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#342E35]" />
              <span className="font-heading text-xs font-bold uppercase tracking-wider text-[#342E35]">
                DecisionGuard (Calibrated)
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCC8F4] text-[#342E35] border border-[#EADFD4]">
              Calibrated Output
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-[#342E35] font-mono">Validated Reorder</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-heading font-black text-[#342E35]">
                {final_recommendation.reorder_quantity ?? final_recommendation.final_reorder_quantity}
              </span>
              <span className="text-xs text-[#827783] uppercase font-medium">units</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EADFD4] text-xs font-mono">
            <div>
              <span className="text-[10px] text-[#827783]">Calibrated Confidence:</span>
              <span className="text-sm font-bold text-[#342E35] block">{confidence_after}%</span>
            </div>
            <div>
              <span className="text-[10px] text-[#827783]">Urgency Level:</span>
              <span className="text-sm font-bold text-[#342E35] block">{final_recommendation.urgency}</span>
            </div>
          </div>

          <p className="text-[11px] text-[#342E35] leading-relaxed bg-[#FFFFFF] p-3 rounded-xl border border-[#EADFD4] line-clamp-2">
            {final_recommendation.reasoning}
          </p>
        </div>
      </div>

      {/* Double-Check & Answer Comparison Card */}
      {evaluation.comparison && (
        <DoubleCheckComparisonCard comparison={evaluation.comparison} />
      )}

      {/* 3 Investigation Lanes (Pastel Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lane 1: Counter-Arguments (Dusty Pink) */}
        <div className="p-4 rounded-2xl bg-[#FDF2F5] border border-[#EADFD4] space-y-3">
          <div className="flex items-center justify-between border-b border-[#EADFD4] pb-2">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#8C2E43]" />
              <h4 className="font-heading text-xs font-bold text-[#342E35] uppercase">
                01 Counter-Arguments
              </h4>
            </div>
            <span className="text-[10px] font-mono text-[#827783] font-bold">
              {self_challenge.arguments_against.length} Risks
            </span>
          </div>
          <div className="space-y-2">
            {self_challenge.arguments_against.map((arg, i) => (
              <div key={i} className="p-3 bg-white rounded-xl border border-[#EADFD4] text-xs space-y-1 shadow-soft-sm">
                <span className="text-[10px] font-bold text-[#8C2E43] uppercase tracking-wider block font-mono">
                  Risk Factor #{i + 1}
                </span>
                <p className="text-[#342E35] text-[11px] leading-relaxed font-medium">{arg}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lane 2: Missing Facts (Peach) */}
        <div className="p-4 rounded-2xl bg-[#FDF4EC] border border-[#EADFD4] space-y-3">
          <div className="flex items-center justify-between border-b border-[#EADFD4] pb-2">
            <div className="flex items-center gap-1.5">
              <FileSearch className="w-4 h-4 text-[#7A4B1A]" />
              <h4 className="font-heading text-xs font-bold text-[#342E35] uppercase">
                02 Missing Facts
              </h4>
            </div>
            <span className="text-[10px] font-mono text-[#827783] font-bold">
              {self_challenge.missing_facts_identified.length} Gaps
            </span>
          </div>
          <div className="space-y-2">
            {self_challenge.missing_facts_identified.map((fact, i) => (
              <div key={i} className="p-3 bg-white rounded-xl border border-[#EADFD4] text-xs space-y-1 shadow-soft-sm">
                <span className="text-[10px] font-bold text-[#7A4B1A] uppercase tracking-wider block font-mono">
                  Data Gap #{i + 1}
                </span>
                <p className="text-[#342E35] text-[11px] leading-relaxed font-medium">{fact}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lane 3: Benchmarked Alternatives (Pastel Blue) */}
        <div className="p-4 rounded-2xl bg-[#F0F6FD] border border-[#EADFD4] space-y-3">
          <div className="flex items-center justify-between border-b border-[#EADFD4] pb-2">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#2A5288]" />
              <h4 className="font-heading text-xs font-bold text-[#342E35] uppercase">
                03 Alternatives
              </h4>
            </div>
            <span className="text-[10px] font-mono text-[#827783] font-bold">
              {self_challenge.alternative_options.length} Options
            </span>
          </div>
          <div className="space-y-2">
            {self_challenge.alternative_options.map((alt, i) => (
              <div key={i} className="p-3 bg-white rounded-xl border border-[#EADFD4] text-xs space-y-1 shadow-soft-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#342E35] text-[11px] truncate max-w-[150px]">
                    {alt.option_name}
                  </span>
                  <span className="font-mono font-bold text-[#342E35] text-[10px] bg-[#C9DCF5] px-2 py-0.5 rounded-full border border-[#EADFD4]">
                    {alt.quantity} units
                  </span>
                </div>
                <p className="text-[#827783] text-[11px] leading-tight">{alt.rationale}</p>
                <div className="text-[10px] text-[#7A4B1A] font-medium pt-1 border-t border-[#EADFD4]">
                  Tradeoff: {alt.tradeoff}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Calculation Verification Strip */}
      {transparent_metrics && (
        <div className="enterprise-card p-5 bg-[#FFFCF7] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EADFD4] pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#342E35]" />
              <h4 className="font-heading text-xs font-extrabold text-[#342E35] uppercase tracking-wider">
                Transparent Formula & Risk Calculation Audit
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#EADFD4] text-[11px] font-mono font-bold bg-[#DCC8F4] text-[#342E35] shadow-soft-sm">
                <Cpu className="w-3.5 h-3.5 text-[#342E35]" />
                <span>{evaluation.engine_type || 'Self-Challenge Engine'}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-xl border border-[#EADFD4] space-y-0.5 shadow-soft-sm">
              <span className="text-[10px] font-mono uppercase text-[#827783] block font-bold">Lead Time Demand</span>
              <span className="text-base font-bold font-mono text-[#342E35]">
                {transparent_metrics.lead_time_demand.toFixed(1)} units
              </span>
              <span className="text-[10px] text-[#827783] block font-mono">
                {selectedItem.daily_velocity} /day × {selectedItem.supplier_lead_time_days}d
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#EADFD4] space-y-0.5 shadow-soft-sm">
              <span className="text-[10px] font-mono uppercase text-[#827783] block font-bold">Stockout Runway</span>
              <span className="text-base font-bold font-mono text-[#342E35]">
                {transparent_metrics.stockout_runway_days.toFixed(1)} days
              </span>
              <span className="text-[10px] text-[#827783] block font-mono">
                {selectedItem.current_stock} stock / {selectedItem.daily_velocity} vel
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#EADFD4] space-y-0.5 shadow-soft-sm">
              <span className="text-[10px] font-mono uppercase text-[#827783] block font-bold">Target Deficit</span>
              <span className="text-base font-bold font-mono text-[#342E35]">
                {transparent_metrics.target_deficit} units
              </span>
              <span className="text-[10px] text-[#827783] block font-mono">
                Target {selectedItem.target_stock_level} − Stock {selectedItem.current_stock}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#EADFD4] space-y-0.5 shadow-soft-sm">
              <span className="text-[10px] font-mono uppercase text-[#827783] block font-bold">Capital Exposure</span>
              <span className="text-base font-bold font-mono text-[#342E35]">
                ${transparent_metrics.working_capital_exposure_usd.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#827783] block font-mono">
                {final_recommendation.reorder_quantity ?? final_recommendation.final_reorder_quantity} units × ${selectedItem.unit_cost_usd}
              </span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-[#EADFD4] text-xs font-mono space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#827783] block">Formula Trace:</span>
            <p className="text-[11px] text-[#342E35] leading-relaxed break-words font-medium">
              {transparent_metrics.formula_breakdown}
            </p>
          </div>
        </div>
      )}

      {/* Demand Curve & Human Decision Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Demand Volatility Chart */}
        <div className="lg:col-span-6 enterprise-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#EADFD4] pb-2">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#342E35]" />
              <h4 className="font-heading text-xs font-bold text-[#342E35] uppercase">
                Demand History & Safety Buffer
              </h4>
            </div>
            <span className="text-[11px] font-mono text-[#827783] font-bold">
              Safety: {selectedItem.safety_stock} units
            </span>
          </div>

          <div className="h-44 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="pastelDemandGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DCC8F4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#DCC8F4" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#827783" fontSize={10} tickLine={false} />
                <YAxis stroke="#827783" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#EADFD4',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#342E35',
                    boxShadow: '0 4px 12px rgba(52, 46, 53, 0.08)',
                  }}
                />
                <ReferenceLine
                  y={selectedItem.safety_stock}
                  stroke="#EAB5C2"
                  strokeDasharray="3 3"
                  label={{ value: 'Safety Stock', fill: '#8C2E43', fontSize: 9, position: 'insideBottomRight' }}
                />
                <Area
                  type="monotone"
                  dataKey="demand"
                  stroke="#B89EE0"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#pastelDemandGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Human Decision Area */}
        <div className="lg:col-span-6 enterprise-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#EADFD4] pb-2">
            <div>
              <h4 className="font-heading text-xs font-extrabold text-[#342E35] uppercase">
                Human Decision Sign-off
              </h4>
              <p className="text-[11px] text-[#827783]">AI recommends. Human decides.</p>
            </div>
            <span className="font-mono text-xs font-bold text-[#342E35] bg-[#F5D6B8] border border-[#EADFD4] px-2.5 py-0.5 rounded-full">
              Rec: {final_recommendation.reorder_quantity ?? final_recommendation.final_reorder_quantity} Units
            </span>
          </div>

          {confirmedAction ? (
            <div className="p-4 rounded-2xl bg-[#D1F2D9] border border-[#BDE5C8] text-xs space-y-1 shadow-soft-sm">
              <div className="flex items-center gap-2 font-bold text-[#2A7545]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Action Executed: {confirmedAction.action}</span>
              </div>
              <p className="text-[#2A7545] font-medium">{confirmedAction.message}</p>
              <p className="text-[10px] text-[#827783] pt-1">
                Recorded at {new Date(confirmedAction.recorded_at).toLocaleTimeString()}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Calibration Slider */}
              <div className="bg-[#FFF9F0] p-3.5 rounded-2xl border border-[#EADFD4] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-[#342E35] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#342E35]" /> Order Quantity Calibration
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={approvedQty}
                      onChange={(e) => setApprovedQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-20 bg-white border border-[#EADFD4] rounded-xl px-2 py-1 text-right font-mono font-bold text-xs text-[#342E35] focus:outline-none focus:border-[#DCC8F4]"
                    />
                    <span className="text-[10px] text-[#827783] font-mono font-bold">UNITS</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(300, (final_recommendation.reorder_quantity ?? final_recommendation.final_reorder_quantity ?? 100) * 2)}
                  step="5"
                  value={approvedQty}
                  onChange={(e) => setApprovedQty(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#EADFD4] rounded-lg appearance-none cursor-pointer accent-[#DCC8F4]"
                />
              </div>

              {/* Operator Notes */}
              <input
                type="text"
                placeholder="Optional sign-off note (e.g. Confirmed with supplier rep)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#FFF9F0] border border-[#EADFD4] rounded-xl px-3 py-2 text-xs text-[#342E35] placeholder:text-[#827783] focus:outline-none focus:border-[#DCC8F4]"
              />

              {/* Action Buttons (Pastel) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  onClick={() => handleExecuteAction('APPROVE')}
                  disabled={isSubmitting || approvedQty <= 0}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#D1F2D9] hover:bg-[#C2E8CC] text-[#2A7545] border border-[#BDE5C8] font-bold text-xs transition cursor-pointer disabled:opacity-50 shadow-soft-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  onClick={() => handleExecuteAction('ADJUST')}
                  disabled={isSubmitting || approvedQty <= 0}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#F5D6B8] hover:bg-[#F0C7A1] text-[#7A4B1A] border border-[#EADFD4] font-bold text-xs transition cursor-pointer disabled:opacity-50 shadow-soft-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Modify
                </button>
                <button
                  onClick={() => handleExecuteAction('DEFER')}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#FFF9F0] hover:bg-[#F3ECE4] text-[#827783] border border-[#EADFD4] font-bold text-xs transition cursor-pointer disabled:opacity-50 shadow-soft-sm"
                >
                  <Clock className="w-3.5 h-3.5 text-[#827783]" />
                  Defer
                </button>
                <button
                  onClick={() => handleExecuteAction('REJECT')}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#F1C5D0] hover:bg-[#EAB5C2] text-[#8C2E43] border border-[#EADFD4] font-bold text-xs transition cursor-pointer disabled:opacity-50 shadow-soft-sm"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Session Action Log */}
          {recentActions.length > 0 && (
            <div className="pt-2 border-t border-[#EADFD4] space-y-1">
              <span className="text-[10px] font-mono text-[#827783] uppercase tracking-wider block font-bold">
                Session Audit Trail
              </span>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {recentActions.map((act, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] font-mono p-1.5 bg-[#FFF9F0] rounded-xl border border-[#EADFD4]">
                    <span className="font-bold text-[#342E35]">{act.sku} • {act.action}</span>
                    <span className="text-[#827783]">{act.final_approved_quantity} units</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
