import React, { useState } from 'react';
import {
  EvaluationResponse,
  DecisionOutcome,
} from '../types/inventory';
import {
  ShieldAlert,
  HelpCircle,
  Layers,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileQuestion,
  Lightbulb,
} from 'lucide-react';

interface EvaluationViewProps {
  evaluation: EvaluationResponse;
}

export const EvaluationView: React.FC<EvaluationViewProps> = ({ evaluation }) => {
  const [activeTab, setActiveTab] = useState<'arguments' | 'missing_facts' | 'alternatives'>('arguments');

  const {
    single_pass,
    self_challenge,
    final_recommendation,
    confidence_before,
    confidence_after,
    confidence_delta,
    decision_outcome,
    summary_verdict,
  } = evaluation;

  const getOutcomeBadge = (outcome: DecisionOutcome) => {
    switch (outcome) {
      case 'AGREES':
        return (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl">
            <CheckCircle className="w-5 h-5" />
            <div>
              <span className="text-xs uppercase font-bold tracking-wider block">Decision Outcome</span>
              <span className="text-sm font-extrabold">AGREES — Validated After Challenge</span>
            </div>
          </div>
        );
      case 'CHANGED':
        return (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <span className="text-xs uppercase font-bold tracking-wider block">Decision Outcome</span>
              <span className="text-sm font-extrabold">CHANGED — Parameters Adjusted for Safety</span>
            </div>
          </div>
        );
      case 'UNCERTAIN':
        return (
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-2 rounded-xl">
            <HelpCircle className="w-5 h-5" />
            <div>
              <span className="text-xs uppercase font-bold tracking-wider block">Decision Outcome</span>
              <span className="text-sm font-extrabold">UNCERTAIN — High Conflict Flagged for Human</span>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner with Summary Verdict & Outcome */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
              {evaluation.sku}
            </span>
            <h3 className="text-base font-bold text-white">{evaluation.product_name}</h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {summary_verdict}
          </p>
        </div>

        <div>{getOutcomeBadge(decision_outcome)}</div>
      </div>

      {/* Side-by-Side: Single-Pass AI vs Final Self-Challenged AI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pass 1: Single Pass Naive AI */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500/60" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Stage 1: Conventional AI
                </span>
                <h4 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                  Single-Pass Recommendation
                </h4>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {single_pass.urgency} URGENCY
              </span>
            </div>

            {/* Metric Highlights */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
              <div>
                <p className="text-xs text-slate-400">Proposed Reorder</p>
                <p className="text-2xl font-black text-white mt-0.5">
                  {single_pass.reorder_quantity}{' '}
                  <span className="text-xs font-normal text-slate-400">units</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Initial Confidence</p>
                <p className="text-2xl font-black text-amber-400 mt-0.5">
                  {confidence_before}%
                </p>
              </div>
            </div>

            {/* Reasoning text */}
            <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-800/40 text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-slate-400 mb-1">Single-Pass Logic:</p>
              {single_pass.reasoning}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Projected stockout: {single_pass.projected_stockout_days} days</span>
            <span className="text-amber-400/80 font-medium">Overconfidence Risk: Unaudited</span>
          </div>
        </div>

        {/* Pass 2 & 3: Re-evaluated Final Recommendation */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between ring-1 ring-cyan-500/30">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-cyan-500 to-emerald-500" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Stage 3 & 4: Self-Challenged & Synthesized
                </span>
                <h4 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                  Final Recommendation
                </h4>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {final_recommendation.urgency} URGENCY
              </span>
            </div>

            {/* Metric Highlights */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
              <div>
                <p className="text-xs text-slate-400">Validated Reorder</p>
                <p className="text-2xl font-black text-emerald-400 mt-0.5">
                  {final_recommendation.reorder_quantity}{' '}
                  <span className="text-xs font-normal text-slate-400">units</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Re-evaluated Confidence</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-emerald-400">
                    {confidence_after}%
                  </span>
                  <span
                    className={`text-xs font-bold flex items-center ${
                      confidence_delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {confidence_delta >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                    )}
                    {confidence_delta > 0 ? `+${confidence_delta}%` : `${confidence_delta}%`}
                  </span>
                </div>
              </div>
            </div>

            {/* Reasoning text */}
            <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-800/40 text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-emerald-400 mb-1">Self-Challenge Verdict:</p>
              {final_recommendation.reasoning}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60">
            <p className="text-[11px] text-slate-400 font-semibold mb-1">Key Adjustments:</p>
            <ul className="text-[11px] text-slate-300 space-y-0.5">
              {final_recommendation.key_adjustments_made.map((adj, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{adj}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Stage 2 Deep-Dive: Self-Challenge Audit Breakdown */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4 mb-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              Stage 2: Self-Challenge Investigation
            </h4>
            <p className="text-xs text-slate-400">
              Primary Identified Friction: <strong className="text-slate-200">{self_challenge.primary_risk_factor}</strong>
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('arguments')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'arguments'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Arguments Against ({self_challenge.arguments_against.length})
            </button>
            <button
              onClick={() => setActiveTab('missing_facts')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'missing_facts'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileQuestion className="w-3.5 h-3.5" />
              Missing Facts ({self_challenge.missing_facts_identified.length})
            </button>
            <button
              onClick={() => setActiveTab('alternatives')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'alternatives'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Alternatives ({self_challenge.alternative_options.length})
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        {activeTab === 'arguments' && (
          <div className="space-y-3">
            {self_challenge.arguments_against.map((arg, idx) => (
              <div
                key={idx}
                className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 border border-rose-500/20">
                  <span className="text-xs font-bold">!</span>
                </div>
                <div className="space-y-1 text-xs text-slate-300">
                  <p className="font-semibold text-slate-200">Devil's Advocate Counter-Point #{idx + 1}</p>
                  <p className="leading-relaxed text-slate-400">{arg}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'missing_facts' && (
          <div className="space-y-3">
            {self_challenge.missing_facts_identified.map((fact, idx) => (
              <div
                key={idx}
                className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20">
                  <HelpCircle className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1 text-xs text-slate-300">
                  <p className="font-semibold text-slate-200">Latent Constraint / Question #{idx + 1}</p>
                  <p className="leading-relaxed text-slate-400">{fact}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'alternatives' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {self_challenge.alternative_options.map((alt, idx) => (
              <div
                key={idx}
                className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between space-y-2.5"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
                      {alt.option_name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700">
                      {alt.quantity} units
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{alt.rationale}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/60 text-[11px] text-amber-400/90 flex items-start gap-1.5">
                  <span className="font-semibold text-slate-500 shrink-0">Tradeoff:</span>
                  <span>{alt.tradeoff}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
