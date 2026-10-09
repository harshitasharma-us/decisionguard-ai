import React from 'react';
import { EvaluationResponse, DecisionOutcome } from '../types/inventory';
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

interface HeroResultCardProps {
  evaluation: EvaluationResponse;
}

export const HeroResultCard: React.FC<HeroResultCardProps> = ({ evaluation }) => {
  const {
    final_recommendation,
    confidence_before,
    confidence_after,
    confidence_delta,
    decision_outcome,
    summary_verdict,
  } = evaluation;

  const getOutcomeStyle = (outcome: DecisionOutcome) => {
    switch (outcome) {
      case 'CHANGED':
        return {
          title: 'DECISION CHANGED',
          subtitle: 'Parameters calibrated to neutralize identified blindspots',
          badgeBg: 'bg-dg-warning/15 text-dg-warning border-dg-warning/40 shadow-glow-warning',
          accentBorder: 'border-dg-warning/40',
          icon: AlertTriangle,
          themeColor: 'text-dg-warning',
        };
      case 'AGREES':
        return {
          title: 'DECISION CONFIRMED',
          subtitle: 'Initial proposal successfully withstood adversarial audit',
          badgeBg: 'bg-dg-success/15 text-dg-success border-dg-success/40 shadow-glow-success',
          accentBorder: 'border-dg-success/40',
          icon: CheckCircle,
          themeColor: 'text-dg-success',
        };
      case 'UNCERTAIN':
        return {
          title: 'HUMAN REVIEW REQUIRED',
          subtitle: 'High volatility or conflicting constraints flagged for operator',
          badgeBg: 'bg-dg-danger/15 text-dg-danger border-dg-danger/40 shadow-glow-danger',
          accentBorder: 'border-dg-danger/40',
          icon: HelpCircle,
          themeColor: 'text-dg-danger',
        };
    }
  };

  const style = getOutcomeStyle(decision_outcome);
  const StatusIcon = style.icon;

  return (
    <div className={`relative overflow-hidden rounded-hero dg-panel p-6 sm:p-8 border ${style.accentBorder} shadow-panel`}>
      {/* Background soft glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-dg-violet/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Col: Prominent Final Reorder Metric */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-panel font-mono text-xs font-bold uppercase tracking-wider border ${style.badgeBg}`}>
              <StatusIcon className="w-4 h-4" />
              {style.title}
            </div>
            <span className="font-mono text-xs text-dg-dim uppercase font-semibold">
              FINAL VERDICT
            </span>
          </div>

          <div>
            <span className="text-xs font-space uppercase font-bold tracking-widest text-dg-muted block">
              RECOMMENDED REORDER VOLUME
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="font-mono text-6xl sm:text-7xl font-black tracking-tight text-white">
                {final_recommendation.reorder_quantity}
              </span>
              <span className="font-space text-xl sm:text-2xl font-bold text-dg-lavender uppercase">
                UNITS
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-dg-muted font-space leading-relaxed max-w-lg">
            {summary_verdict}
          </p>

          <div className="flex items-center gap-3 pt-1">
            <span className="px-3 py-1 rounded-panel bg-dg-bg text-[11px] font-mono font-bold text-dg-cyan border border-dg-violet/20">
              URGENCY: {final_recommendation.urgency}
            </span>
            <span className="text-[11px] font-mono text-dg-dim">
              Timestamp: {new Date(evaluation.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Right Col: Confidence Trajectory & Breakdown */}
        <div className="lg:col-span-6 bg-dg-bg/90 rounded-panel p-5 sm:p-6 border border-dg-violet/25 shadow-glow-violet space-y-5">
          <div className="flex items-center justify-between border-b border-dg-violet/15 pb-3">
            <span className="text-xs font-space font-bold uppercase tracking-wider text-dg-text">
              Confidence Transformation Trajectory
            </span>
            <span className="text-[10px] font-mono text-dg-cyan font-bold">
              DELTA: {confidence_delta > 0 ? `+${confidence_delta}%` : `${confidence_delta}%`}
            </span>
          </div>

          {/* 3-Step Trajectory Bar */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {/* Initial */}
            <div className="bg-dg-secondary/80 rounded-panel p-3 border border-dg-violet/15">
              <span className="text-[10px] font-mono uppercase text-dg-dim font-bold block">
                INITIAL AI
              </span>
              <span className="font-mono text-2xl font-black text-dg-warning block mt-1">
                {confidence_before}%
              </span>
              <span className="text-[10px] font-mono text-dg-dim block mt-0.5">
                Overconfident
              </span>
            </div>

            {/* Challenge Shift */}
            <div className="bg-dg-secondary/80 rounded-panel p-3 border border-dg-violet/15 flex flex-col justify-center">
              <span className="text-[10px] font-mono uppercase text-dg-dim font-bold block">
                CHALLENGE
              </span>
              <div className="flex items-center justify-center gap-1 font-mono text-xl font-black text-dg-cyan mt-1">
                {confidence_delta >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-dg-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-dg-danger" />
                )}
                <span>{confidence_delta > 0 ? `+${confidence_delta}` : confidence_delta}</span>
              </div>
              <span className="text-[10px] font-mono text-dg-dim block mt-0.5">
                Points Calibrated
              </span>
            </div>

            {/* Final */}
            <div className="bg-dg-secondary/80 rounded-panel p-3 border border-dg-cyan/30 shadow-glow-cyan">
              <span className="text-[10px] font-mono uppercase text-dg-cyan font-bold block">
                FINAL CALIBRATED
              </span>
              <span className="font-mono text-2xl font-black text-dg-success block mt-1">
                {confidence_after}%
              </span>
              <span className="text-[10px] font-mono text-dg-dim block mt-0.5">
                Challenged
              </span>
            </div>
          </div>

          {/* Progress Bar Visualization */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono text-dg-dim">
              <span>INITIAL: {confidence_before}%</span>
              <span className="text-dg-cyan font-bold">FINAL: {confidence_after}%</span>
            </div>
            <div className="w-full h-2.5 bg-dg-secondary rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-dg-violet to-dg-cyan transition-all duration-700"
                style={{ width: `${confidence_after}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] font-space text-dg-muted leading-relaxed italic bg-dg-panel/40 p-2.5 rounded-lg border border-dg-violet/10">
            &quot;Confidence {confidence_delta < 0 ? 'decreased after the self-challenge engine identified structural evidence against the naive reorder proposal.' : 'strengthened after counter-arguments resolved positively against demand spikes.'}&quot;
          </p>
        </div>
      </div>
    </div>
  );
};
