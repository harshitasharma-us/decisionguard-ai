import React from 'react';
import { InventoryItem } from '../types/inventory';
import { Package, Clock, TrendingUp, AlertCircle, Sparkles, Building2 } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

interface InventorySelectorProps {
  items: InventoryItem[];
  selectedItem: InventoryItem | null;
  onSelectItem: (item: InventoryItem) => void;
  onRunEvaluation: () => void;
  isEvaluating: boolean;
}

export const InventorySelector: React.FC<InventorySelectorProps> = ({
  items,
  selectedItem,
  onSelectItem,
  onRunEvaluation,
  isEvaluating,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Active Inventory SKUs
          </h2>
          <p className="text-xs text-slate-400">
            Select a stock scenario to challenge the AI's reorder recommendation.
          </p>
        </div>

        {selectedItem && (
          <button
            onClick={onRunEvaluation}
            disabled={isEvaluating}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition text-sm cursor-pointer"
          >
            <Sparkles className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
            {isEvaluating ? 'Evaluating Self-Challenge...' : 'Run DecisionGuard AI'}
          </button>
        )}
      </div>

      {/* Grid of SKU Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {items.map((item) => {
          const isSelected = selectedItem?.sku === item.sku;
          const isLowStock = item.current_stock <= item.reorder_point;
          const chartData = (item.recent_demand_history_7d || [10, 12, 11, 14, 15, 13, 16]).map(
            (val, idx) => ({ day: `D${idx + 1}`, demand: val })
          );

          return (
            <div
              key={item.sku}
              onClick={() => onSelectItem(item)}
              className={`cursor-pointer rounded-2xl p-4 border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-cyan-500/80 ring-2 ring-cyan-500/20 shadow-xl'
                  : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                      {item.sku}
                    </span>
                    <h3 className="text-sm font-semibold text-white mt-1.5 line-clamp-1">
                      {item.product_name}
                    </h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{item.category}</span>
                      <span>•</span>
                      <span className="flex items-center text-slate-500">
                        <Building2 className="w-3 h-3 mr-0.5" />
                        {item.supplier_name}
                      </span>
                    </p>
                  </div>

                  {isLowStock ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Reorder Due
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                      Normal
                    </span>
                  )}
                </div>

                {/* Metrics 3-column */}
                <div className="grid grid-cols-3 gap-2 py-2.5 my-2 border-y border-slate-800/60 text-center">
                  <div className="bg-slate-950/40 p-1.5 rounded-lg">
                    <p className="text-[10px] text-slate-400">Current</p>
                    <p className={`text-xs font-bold ${item.current_stock <= item.reorder_point ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {item.current_stock}
                    </p>
                  </div>
                  <div className="bg-slate-950/40 p-1.5 rounded-lg">
                    <p className="text-[10px] text-slate-400">Reorder Pt</p>
                    <p className="text-xs font-bold text-slate-200">{item.reorder_point}</p>
                  </div>
                  <div className="bg-slate-950/40 p-1.5 rounded-lg">
                    <p className="text-[10px] text-slate-400">Daily Vel.</p>
                    <p className="text-xs font-bold text-cyan-400">{item.daily_velocity}/d</p>
                  </div>
                </div>

                {/* Additional context badges */}
                <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-400 mb-3">
                  <span className="flex items-center gap-1 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                    <Clock className="w-3 h-3 text-amber-400" />
                    Lead: {item.supplier_lead_time_days}d
                  </span>
                  <span className="bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                    MOQ: {item.supplier_moq}
                  </span>
                  <span className="bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                    Cost: ${item.unit_cost_usd.toFixed(2)}
                  </span>
                  {item.shelf_life_days && (
                    <span className="bg-rose-950/30 text-rose-300 border border-rose-800/40 px-2 py-0.5 rounded">
                      Expiry: {item.shelf_life_days}d
                    </span>
                  )}
                </div>
              </div>

              {/* Mini Demand Sparkline using Recharts */}
              <div className="h-10 w-full mt-1 bg-slate-950/50 rounded-lg p-1 border border-slate-800/40">
                <div className="flex items-center justify-between px-1 text-[9px] text-slate-500">
                  <span className="flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5 text-cyan-400" /> 7d Demand
                  </span>
                  <span>Avg {item.daily_velocity}</span>
                </div>
                <div className="h-5 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                      <Area
                        type="monotone"
                        dataKey="demand"
                        stroke="#06b6d4"
                        fill="#06b6d4"
                        fillOpacity={0.2}
                        strokeWidth={1.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
