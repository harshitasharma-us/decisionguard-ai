import React from 'react';
import { Database, Bot, ShieldAlert, GitCompare, Award, UserCheck, ChevronRight } from 'lucide-react';
import { DecisionOutcome } from '../types/inventory';

interface FlowBreadcrumbsProps {
  currentStage: number; // 1 to 5
  isEvaluating: boolean;
  outcome?: DecisionOutcome;
}

export const FlowBreadcrumbs: React.FC<FlowBreadcrumbsProps> = ({
  currentStage,
  isEvaluating,
  outcome,
}) => {
  const steps = [
    {
      id: 1,
      title: 'Synthetic Data',
      subtitle: 'Inventory state & constraints',
      icon: Database,
    },
    {
      id: 2,
      title: 'Single-Pass AI',
      subtitle: 'Initial reorder proposal',
      icon: Bot,
    },
    {
      id: 3,
      title: 'Self-Challenge',
      subtitle: 'Risks, blindspots & options',
      icon: ShieldAlert,
    },
    {
      id: 4,
      title: 'Re-evaluation',
      subtitle: 'Confidence delta & synthesis',
      icon: GitCompare,
    },
    {
      id: 5,
      title: 'Human Decision',
      subtitle: outcome ? `Outcome: ${outcome}` : 'Approval & execution',
      icon: outcome ? Award : UserCheck,
    },
  ];

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur shadow-lg">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Autonomous Self-Challenge Pipeline
        </h3>
        {isEvaluating && (
          <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Executing self-challenge reasoning...
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStage === step.id;
          const isCompleted = currentStage > step.id;

          let badgeColor = 'bg-slate-950 border-slate-800 text-slate-400';
          let iconColor = 'text-slate-500';

          if (isActive) {
            badgeColor = 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200 ring-1 ring-cyan-500/30';
            iconColor = 'text-cyan-400';
          } else if (isCompleted) {
            badgeColor = 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200';
            iconColor = 'text-emerald-400';
          }

          if (step.id === 5 && outcome) {
            if (outcome === 'AGREES') {
              badgeColor = 'bg-emerald-950/50 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/40';
              iconColor = 'text-emerald-400';
            } else if (outcome === 'CHANGED') {
              badgeColor = 'bg-amber-950/50 border-amber-500 text-amber-200 ring-1 ring-amber-500/40';
              iconColor = 'text-amber-400';
            } else {
              badgeColor = 'bg-rose-950/50 border-rose-500 text-rose-200 ring-1 ring-rose-500/40';
              iconColor = 'text-rose-400';
            }
          }

          return (
            <div
              key={step.id}
              className={`relative flex flex-col p-3 rounded-xl border transition-all duration-300 ${badgeColor}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                  <span className="text-[11px] font-mono font-semibold tracking-wider text-slate-400">
                    0{step.id}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden md:block" />
                )}
              </div>
              <p className="text-xs font-semibold text-white truncate">{step.title}</p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{step.subtitle}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
