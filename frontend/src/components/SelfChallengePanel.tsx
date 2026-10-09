import React from 'react';
import { EvaluationResponse } from '../types/inventory';
import { AlertCircle, FileSearch, Layers, Sparkles, AlertTriangle } from 'lucide-react';

interface SelfChallengePanelProps {
  evaluation: EvaluationResponse;
}

export const SelfChallengePanel: React.FC<SelfChallengePanelProps> = ({ evaluation }) => {
  const { self_challenge } = evaluation;

  return (
    <div className="dg-panel rounded-hero p-6 sm:p-8 border border-dg-violet/25 shadow-panel space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-dg-violet/15 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-dg-cyan" />
            <span className="text-xs font-mono font-bold tracking-widest text-dg-lavender uppercase">
              Adversarial Self-Audit
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-space text-white uppercase tracking-tight">
            THE AI ARGUED <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-dg-cyan via-dg-lavender to-dg-violet bg-clip-text text-transparent">
              AGAINST ITSELF
            </span>
          </h2>
        </div>

        <div className="bg-dg-bg/90 px-4 py-2.5 rounded-panel border border-dg-violet/20 space-y-0.5">
          <span className="text-[10px] font-mono text-dg-dim uppercase font-bold block">
            PRIMARY IDENTIFIED FRICTION
          </span>
          <span className="text-xs font-mono font-extrabold text-dg-warning flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {self_challenge.primary_risk_factor}
          </span>
        </div>
      </div>

      {/* 3 Investigation Lanes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Lane 01: Counterarguments */}
        <div className="bg-dg-bg/80 rounded-panel p-5 border border-dg-violet/20 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-dg-violet/15 pb-2.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-dg-danger" />
                <span className="font-space text-xs font-bold uppercase tracking-wider text-dg-text">
                  01 — COUNTERARGUMENTS
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-dg-dim">
                {self_challenge.arguments_against.length} RISKS
              </span>
            </div>
            <p className="text-[11px] font-space text-dg-dim">
              Why might the single-pass reorder proposal be wrong or excessive?
            </p>

            <div className="space-y-2.5 pt-1">
              {self_challenge.arguments_against.map((arg, idx) => (
                <div
                  key={idx}
                  className="bg-dg-secondary/90 p-3 rounded-panel border border-dg-violet/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-dg-lavender">
                      FINDING #{idx + 1}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-dg-danger/15 text-dg-danger border border-dg-danger/30">
                      {idx === 0 ? 'HIGH IMPACT' : 'MEDIUM'}
                    </span>
                  </div>
                  <p className="text-xs font-space text-dg-text leading-relaxed">
                    {arg}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lane 02: Missing Facts */}
        <div className="bg-dg-bg/80 rounded-panel p-5 border border-dg-violet/20 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-dg-violet/15 pb-2.5">
              <div className="flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-dg-warning" />
                <span className="font-space text-xs font-bold uppercase tracking-wider text-dg-text">
                  02 — MISSING FACTS
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-dg-dim">
                {self_challenge.missing_facts_identified.length} UNKNOWNS
              </span>
            </div>
            <p className="text-[11px] font-space text-dg-dim">
              What latent information could structurally overturn the reorder decision?
            </p>

            <div className="space-y-2.5 pt-1">
              {self_challenge.missing_facts_identified.map((fact, idx) => (
                <div
                  key={idx}
                  className="bg-dg-secondary/90 p-3 rounded-panel border border-dg-violet/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-dg-cyan">
                      LATENT QUERY #{idx + 1}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-dg-warning/15 text-dg-warning border border-dg-warning/30">
                      AUDIT GAP
                    </span>
                  </div>
                  <p className="text-xs font-space text-dg-text leading-relaxed">
                    {fact}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lane 03: Alternatives */}
        <div className="bg-dg-bg/80 rounded-panel p-5 border border-dg-violet/20 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-dg-violet/15 pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-dg-cyan" />
                <span className="font-space text-xs font-bold uppercase tracking-wider text-dg-text">
                  03 — BENCHMARKED OPTIONS
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-dg-dim">
                {self_challenge.alternative_options.length} PATHS
              </span>
            </div>
            <p className="text-[11px] font-space text-dg-dim">
              What other quantity batches could the business execute?
            </p>

            <div className="space-y-2.5 pt-1">
              {self_challenge.alternative_options.map((alt, idx) => (
                <div
                  key={idx}
                  className="bg-dg-secondary/90 p-3 rounded-panel border border-dg-violet/10 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-space font-bold text-white truncate max-w-[150px]">
                      {alt.option_name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-dg-cyan/15 text-dg-cyan border border-dg-cyan/30">
                      {alt.quantity} units
                    </span>
                  </div>
                  <p className="text-xs font-space text-dg-muted leading-relaxed">
                    {alt.rationale}
                  </p>
                  <div className="text-[10px] font-mono text-dg-warning pt-1 border-t border-dg-violet/10">
                    <span className="text-dg-dim uppercase font-bold">Tradeoff: </span>
                    {alt.tradeoff}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
