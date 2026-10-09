import React from 'react';
import { EvaluationResponse } from '../types/inventory';
import { Bot, ShieldAlert, GitCompare, Award } from 'lucide-react';

interface DecisionJourneyProps {
  evaluation: EvaluationResponse | null;
  currentStage: number;
  isEvaluating: boolean;
}

export const DecisionJourney: React.FC<DecisionJourneyProps> = ({
  evaluation,
  currentStage,
  isEvaluating,
}) => {
  const steps = [
    {
      step: '01',
      title: 'INITIAL DECISION',
      icon: Bot,
      detail: evaluation
        ? `Reorder ${evaluation.single_pass.reorder_quantity} units`
        : 'Single-pass proposal',
      sub: evaluation
        ? `${evaluation.confidence_before}% confidence`
        : 'Unchallenged formula',
      activeColor: 'border-dg-warning text-dg-warning shadow-glow-warning',
    },
    {
      step: '02',
      title: 'SELF-CHALLENGE',
      icon: ShieldAlert,
      detail: evaluation
        ? `${evaluation.self_challenge.arguments_against.length} counterarguments`
        : 'Adversarial audit',
      sub: evaluation
        ? `${evaluation.self_challenge.missing_facts_identified.length} missing facts`
        : 'Blindspot detection',
      activeColor: 'border-dg-cyan text-dg-cyan shadow-glow-cyan',
    },
    {
      step: '03',
      title: 'RE-EVALUATION',
      icon: GitCompare,
      detail: evaluation
        ? `${evaluation.confidence_delta >= 0 ? `+${evaluation.confidence_delta}` : evaluation.confidence_delta} confidence shift`
        : 'Friction calculation',
      sub: evaluation
        ? `Trajectory: ${evaluation.confidence_before}% → ${evaluation.confidence_after}%`
        : 'Risk calibration',
      activeColor: 'border-dg-lavender text-dg-lavender shadow-glow-violet',
    },
    {
      step: '04',
      title: 'FINAL DECISION',
      icon: Award,
      detail: evaluation
        ? `Reorder ${evaluation.final_recommendation.reorder_quantity} units`
        : 'Synthesized proposal',
      sub: evaluation
        ? `Outcome: ${evaluation.decision_outcome}`
        : 'Human sign-off ready',
      activeColor:
        evaluation?.decision_outcome === 'AGREES'
          ? 'border-dg-success text-dg-success shadow-glow-success'
          : evaluation?.decision_outcome === 'CHANGED'
          ? 'border-dg-warning text-dg-warning shadow-glow-warning'
          : 'border-dg-danger text-dg-danger shadow-glow-danger',
    },
  ];

  return (
    <div className="dg-panel rounded-panel p-5 border border-dg-violet/25 shadow-panel space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dg-violet/15 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-dg-cyan animate-pulse" />
          <h3 className="font-space font-bold text-xs uppercase tracking-widest text-dg-text">
            Autonomous Decision Journey
          </h3>
        </div>
        <div className="text-[11px] font-mono text-dg-dim flex items-center gap-2">
          <span>PROGRESS:</span>
          <span className="font-bold text-dg-cyan">
            {isEvaluating ? `STAGE 0${currentStage} IN PROGRESS...` : evaluation ? 'COMPLETED' : 'AWAITING RUN'}
          </span>
        </div>
      </div>

      {/* Connected Nodes Layout */}
      <div className="relative">
        {/* Continuous Connecting Line Background */}
        <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-[2px] bg-dg-violet/20 -translate-y-1/2 z-0" />
        
        {/* Active Flow Line Progress */}
        <div
          className="hidden lg:block absolute top-1/2 left-8 h-[2px] bg-gradient-to-r from-dg-violet via-dg-cyan to-dg-success -translate-y-1/2 z-0 transition-all duration-500"
          style={{
            width: isEvaluating
              ? `${(currentStage / 4) * 85}%`
              : evaluation
              ? '90%'
              : '0%',
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          {steps.map((item, idx) => {
            const stepNum = idx + 1;
            const isCompleted = evaluation || currentStage > stepNum;
            const isCurrent = isEvaluating && currentStage === stepNum;
            const Icon = item.icon;

            return (
              <div
                key={item.step}
                className={`bg-dg-bg/90 rounded-panel p-4 border transition-all duration-300 flex flex-col justify-between space-y-3 ${
                  isCurrent
                    ? 'border-dg-cyan bg-dg-panel shadow-glow-cyan ring-1 ring-dg-cyan/40'
                    : isCompleted
                    ? 'border-dg-violet/40 bg-dg-bg/90'
                    : 'border-dg-violet/15 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-dg-cyan">
                    {item.step}
                  </span>
                  <div className={`p-2 rounded-lg bg-dg-secondary border border-dg-violet/20 ${isCurrent ? 'text-dg-cyan' : isCompleted ? 'text-dg-lavender' : 'text-dg-dim'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <h4 className="font-space text-xs font-bold uppercase tracking-wider text-dg-text">
                    {item.title}
                  </h4>
                  <p className="font-mono text-sm font-extrabold text-dg-text mt-1 truncate">
                    {item.detail}
                  </p>
                  <p className="text-[11px] font-mono text-dg-dim truncate mt-0.5">
                    {item.sub}
                  </p>
                </div>

                {/* Status Footnote */}
                <div className="pt-2 border-t border-dg-violet/10 text-[10px] font-mono flex items-center justify-between">
                  <span className="text-dg-dim">NODE STATE</span>
                  <span
                    className={`font-bold ${
                      isCurrent
                        ? 'text-dg-cyan animate-pulse'
                        : isCompleted
                        ? 'text-dg-success'
                        : 'text-dg-dim'
                    }`}
                  >
                    {isCurrent ? 'PROCESSING' : isCompleted ? 'VERIFIED' : 'PENDING'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
