import React from 'react';
import { EvaluationResponse } from '../types/inventory';
import { Bot, ShieldCheck, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';

interface BeforeAfterComparisonProps {
  evaluation: EvaluationResponse;
}

export const BeforeAfterComparison: React.FC<BeforeAfterComparisonProps> = ({ evaluation }) => {
  const { single_pass, final_recommendation, confidence_before, confidence_after, confidence_delta } = evaluation;

  return (
    <div className="dg-panel rounded-panel p-6 border border-dg-violet/25 shadow-panel space-y-5">
      <div className="flex items-center justify-between border-b border-dg-violet/15 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-dg-lavender" />
          <h3 className="font-space font-bold text-xs uppercase tracking-widest text-dg-text">
            Side-by-Side Adversarial Benchmark
          </h3>
        </div>
        <span className="text-[11px] font-mono text-dg-cyan font-bold uppercase">
          Single-Pass AI vs DecisionGuard
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
        {/* Left: Conventional Single-Pass AI */}
        <div className="md:col-span-5 bg-dg-bg/90 rounded-panel p-5 border border-dg-warning/30 relative flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-dg-warning" />
              <span className="font-space text-xs font-bold uppercase tracking-wider text-dg-text">
                SINGLE-PASS AI
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-dg-warning/10 text-dg-warning border border-dg-warning/20">
              OVERCONFIDENT
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono text-dg-dim uppercase font-bold">
              PROPOSED REORDER
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl sm:text-4xl font-black text-dg-warning">
                {single_pass.reorder_quantity}
              </span>
              <span className="font-space text-xs font-bold text-dg-muted uppercase">
                UNITS
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dg-violet/15 text-xs font-mono">
            <div>
              <span className="text-dg-dim block text-[10px]">CONFIDENCE</span>
              <span className="text-lg font-bold text-dg-text">{confidence_before}%</span>
            </div>
            <div>
              <span className="text-dg-dim block text-[10px]">URGENCY</span>
              <span className="text-sm font-semibold text-dg-warning">{single_pass.urgency}</span>
            </div>
          </div>

          <p className="text-[11px] font-space text-dg-muted leading-relaxed line-clamp-2">
            {single_pass.reasoning}
          </p>
        </div>

        {/* Center: Shift Badge */}
        <div className="md:col-span-1 flex flex-col items-center justify-center text-center py-2 md:py-0">
          <div className="w-10 h-10 rounded-full bg-dg-secondary border border-dg-violet/30 flex items-center justify-center text-dg-cyan shadow-glow-cyan">
            <ArrowRight className="w-4 h-4" />
          </div>
          <div className="mt-2 space-y-0.5 hidden md:block">
            <span className="text-[9px] font-mono uppercase font-bold text-dg-lavender block tracking-tighter">
              EFFECT
            </span>
            <span className={`text-[10px] font-mono font-bold flex items-center justify-center ${confidence_delta >= 0 ? 'text-dg-success' : 'text-dg-danger'}`}>
              {confidence_delta >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {Math.abs(confidence_delta)}%
            </span>
          </div>
        </div>

        {/* Right: DecisionGuard Calibrated AI */}
        <div className="md:col-span-5 bg-dg-bg/90 rounded-panel p-5 border border-dg-cyan/40 shadow-glow-cyan relative flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-dg-cyan" />
              <span className="font-space text-xs font-bold uppercase tracking-wider text-dg-text">
                DECISIONGUARD AI
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-dg-cyan/10 text-dg-cyan border border-dg-cyan/30">
              CHALLENGED
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono text-dg-cyan uppercase font-bold">
              CALIBRATED REORDER
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl sm:text-4xl font-black text-dg-cyan">
                {final_recommendation.reorder_quantity}
              </span>
              <span className="font-space text-xs font-bold text-dg-muted uppercase">
                UNITS
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dg-violet/15 text-xs font-mono">
            <div>
              <span className="text-dg-dim block text-[10px]">CONFIDENCE</span>
              <span className="text-lg font-bold text-dg-success">{confidence_after}%</span>
            </div>
            <div>
              <span className="text-dg-dim block text-[10px]">URGENCY</span>
              <span className="text-sm font-semibold text-dg-cyan">{final_recommendation.urgency}</span>
            </div>
          </div>

          <p className="text-[11px] font-space text-dg-muted leading-relaxed line-clamp-2">
            {final_recommendation.reasoning}
          </p>
        </div>
      </div>
    </div>
  );
};
