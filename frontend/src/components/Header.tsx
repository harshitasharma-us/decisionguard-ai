import React from 'react';
import { ShieldCheck, Cpu, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { HealthResponse } from '../services/api';

interface HeaderProps {
  health: HealthResponse | null;
  healthLoading: boolean;
  onRefreshHealth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ health, healthLoading, onRefreshHealth }) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md px-6 py-3.5 sticky top-0 z-50 flex items-center justify-between">
      <div className="flex items-center space-x-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-white/10">
          <ShieldCheck className="w-6 h-6 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white">
              DecisionGuard AI
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full tracking-wide">
              MVP HACKATHON
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Self-Challenging Stock Reorder Assistant</p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Model Engine Tag */}
        <div className="hidden sm:flex items-center space-x-1.5 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-500 font-medium">Engine:</span>
          <span className="font-semibold text-slate-200">Self-Challenge Core</span>
        </div>

        {/* Backend Health Status */}
        <div className="flex items-center space-x-2 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
          <span className="text-slate-400">Backend:</span>
          {healthLoading ? (
            <span className="flex items-center text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping mr-1.5" />
              Checking...
            </span>
          ) : health?.status === 'ok' ? (
            <span className="flex items-center text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Online (Port 8000)
            </span>
          ) : (
            <span className="flex items-center text-rose-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" />
              Offline
            </span>
          )}
        </div>

        <button
          onClick={onRefreshHealth}
          title="Refresh connection"
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 ${healthLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
};
