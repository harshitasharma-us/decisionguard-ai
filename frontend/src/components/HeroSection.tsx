import React from 'react';
import { Sparkles, Brain, Cpu, ShieldAlert, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  isEvaluating: boolean;
  onTriggerEvaluation: () => void;
  selectedSku: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  isEvaluating,
  onTriggerEvaluation,
  selectedSku,
}) => {
  return (
    <section className="relative overflow-hidden rounded-hero dg-panel p-6 sm:p-8 border border-dg-violet/25 shadow-panel">
      {/* Background ambient accents */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-dg-violet/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-dg-cyan/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        {/* Left Editorial Headline */}
        <div className="max-w-2xl space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dg-violet/15 border border-dg-violet/30 text-dg-lavender text-xs font-mono font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-dg-cyan animate-ai-pulse" />
            AUTONOMOUS ADVERSARIAL REASONING
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-space text-dg-text leading-[1.15]">
            Decision Intelligence <br />
            <span className="bg-gradient-to-r from-dg-text via-dg-lavender to-dg-cyan bg-clip-text text-transparent">
              for Inventory.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-dg-muted leading-relaxed font-space max-w-xl">
            Every recommendation is challenged before it reaches the human decision-maker. We eliminate overconfident AI reorder mistakes by forcing the AI to argue against itself.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onTriggerEvaluation}
              disabled={isEvaluating}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-panel font-space font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-dg-violet via-dg-violet to-dg-cyan text-white shadow-glow-violet hover:shadow-glow-cyan transition-all duration-300 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Sparkles className={`w-4 h-4 text-dg-cyan ${isEvaluating ? 'animate-spin' : ''}`} />
              {isEvaluating ? 'Investigating Decision...' : `Challenge Reorder for ${selectedSku}`}
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <span className="text-[11px] font-mono text-dg-dim flex items-center gap-1.5 px-3 py-2 rounded-panel bg-dg-bg/60 border border-dg-violet/10">
              <ShieldAlert className="w-3.5 h-3.5 text-dg-warning" />
              Overconfidence Defense Enabled
            </span>
          </div>
        </div>

        {/* Right Animated AI Status Terminal Box */}
        <div className="w-full lg:w-80 bg-dg-bg/90 border border-dg-violet/30 rounded-panel p-5 shadow-glow-violet relative flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-dg-violet/20 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-dg-cyan" />
              <span className="text-xs font-mono font-bold tracking-wider text-dg-lavender uppercase">
                Self-Challenge Engine
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-dg-success">
              <span className="w-2 h-2 rounded-full bg-dg-success animate-ping" />
              ACTIVE
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between text-dg-muted text-[11px]">
              <span>PIPELINE MODE</span>
              <span className="text-dg-text font-bold">ADVERSARIAL LOOP</span>
            </div>
            <div className="flex items-center justify-between text-dg-muted text-[11px]">
              <span>AUDIT STATUS</span>
              <span className="text-dg-cyan font-semibold">
                {isEvaluating ? 'ANALYZING DECISION...' : 'STANDBY / READY'}
              </span>
            </div>
            <div className="flex items-center justify-between text-dg-muted text-[11px]">
              <span>TARGET SKU</span>
              <span className="text-dg-lavender font-bold">{selectedSku}</span>
            </div>
          </div>

          <div className="bg-dg-secondary/80 rounded-lg p-2.5 border border-dg-violet/15 flex items-center gap-2.5">
            <Brain className={`w-5 h-5 text-dg-cyan shrink-0 ${isEvaluating ? 'animate-pulse' : ''}`} />
            <div className="text-[10px] font-mono text-dg-dim leading-tight">
              Single-Pass AI is subjected to 3-point counter-factual friction audit.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
