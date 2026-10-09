import React from 'react';
import { Shield, Terminal, Settings } from 'lucide-react';
import { HealthResponse } from '../services/api';

interface NavbarProps {
  health: HealthResponse | null;
  healthLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefreshHealth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  healthLoading,
  activeTab,
  setActiveTab,
  onRefreshHealth,
}) => {
  const tabs = [
    { id: 'decision', label: 'DECISION' },
    { id: 'analysis', label: 'ANALYSIS' },
    { id: 'inventory', label: 'INVENTORY' },
    { id: 'audit', label: 'AUDIT' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-dg-violet/20 bg-dg-bg/85 backdrop-blur-xl px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-dg-violet to-dg-cyan p-[1px] shadow-glow-violet">
            <div className="w-full h-full bg-dg-bg rounded-[11px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-dg-cyan stroke-[2.2]" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-space font-extrabold tracking-tight text-base sm:text-lg text-dg-text">
                DECISION<span className="text-dg-cyan">GUARD</span>
              </span>
              <span className="text-[10px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded bg-dg-violet/20 text-dg-lavender border border-dg-violet/30">
                AI
              </span>
            </div>
            <span className="text-[10px] font-space tracking-wide text-dg-dim uppercase font-medium">
              Decision Intelligence Console
            </span>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-dg-panel/90 border border-dg-violet/20 p-1 rounded-panel">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-[10px] text-xs font-space font-bold tracking-wider transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-dg-violet to-dg-violet/80 text-white shadow-glow-violet'
                    : 'text-dg-muted hover:text-dg-text hover:bg-dg-panel-light/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Telemetry & Model Status */}
        <div className="flex items-center space-x-3">
          {/* Model Status Pill */}
          <div className="hidden sm:flex items-center space-x-2 bg-dg-panel/80 border border-dg-violet/20 px-3 py-1.5 rounded-panel text-xs">
            <Terminal className="w-3.5 h-3.5 text-dg-cyan" />
            <span className="text-dg-dim font-mono text-[11px]">MODEL:</span>
            <span className="font-mono text-[11px] font-semibold text-dg-lavender tracking-tight">
              SELF-CHALLENGE
            </span>
          </div>

          {/* System Online Indicator */}
          <button
            onClick={onRefreshHealth}
            title="Click to re-verify backend telemetry"
            className="flex items-center space-x-2 bg-dg-panel/80 hover:bg-dg-panel border border-dg-violet/20 px-3 py-1.5 rounded-panel text-xs transition cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              {health?.status === 'ok' ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-dg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-dg-success" />
                </>
              ) : healthLoading ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-dg-warning opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-dg-warning" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-dg-danger" />
              )}
            </span>
            <span className="font-mono text-[11px] font-bold tracking-wide text-dg-text">
              {health?.status === 'ok'
                ? 'SYSTEM ONLINE'
                : healthLoading
                ? 'CONNECTING'
                : 'OFFLINE'}
            </span>
          </button>

          {/* Settings / Console Icon */}
          <div className="p-2 rounded-panel bg-dg-panel/80 border border-dg-violet/20 text-dg-muted hover:text-dg-cyan transition cursor-pointer">
            <Settings className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
};
