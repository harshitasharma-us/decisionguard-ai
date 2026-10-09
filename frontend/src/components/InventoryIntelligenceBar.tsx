import React from 'react';
import { InventoryItem } from '../types/inventory';
import { Layers, AlertTriangle } from 'lucide-react';

interface InventoryIntelligenceBarProps {
  items: InventoryItem[];
  selectedItem: InventoryItem | null;
  onSelectItem: (item: InventoryItem) => void;
  isEvaluating: boolean;
}

export const InventoryIntelligenceBar: React.FC<InventoryIntelligenceBarProps> = ({
  items,
  selectedItem,
  onSelectItem,
  isEvaluating,
}) => {
  if (!selectedItem) return null;

  const weeklyDemand = Math.round(selectedItem.daily_velocity * 7);
  const isLowStock = selectedItem.current_stock <= selectedItem.reorder_point;
  const supplierPct = Math.round(selectedItem.supplier_reliability_score * 100);

  const getRiskLevel = () => {
    if (selectedItem.current_stock <= selectedItem.safety_stock) return { label: 'CRITICAL', color: 'text-dg-danger bg-dg-danger/10 border-dg-danger/30' };
    if (selectedItem.current_stock <= selectedItem.reorder_point) return { label: 'HIGH', color: 'text-dg-warning bg-dg-warning/10 border-dg-warning/30' };
    if (selectedItem.shelf_life_days && selectedItem.shelf_life_days <= 60) return { label: 'PERISHABLE', color: 'text-dg-cyan bg-dg-cyan/10 border-dg-cyan/30' };
    return { label: 'STABLE', color: 'text-dg-success bg-dg-success/10 border-dg-success/30' };
  };

  const risk = getRiskLevel();

  return (
    <div className="space-y-3">
      {/* Top SKU Quick Selector Pills */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono text-dg-dim uppercase font-semibold">
          <Layers className="w-3.5 h-3.5 text-dg-violet" />
          <span>Active SKU Profiles:</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {items.map((item) => {
            const isSelected = selectedItem.sku === item.sku;
            return (
              <button
                key={item.sku}
                onClick={() => onSelectItem(item)}
                disabled={isEvaluating}
                className={`px-3 py-1.5 rounded-panel text-xs font-mono transition-all duration-200 cursor-pointer flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-dg-panel-active border-dg-cyan text-dg-cyan shadow-glow-cyan font-bold'
                    : 'bg-dg-panel/60 border-dg-violet/20 text-dg-muted hover:text-dg-text hover:bg-dg-panel'
                }`}
              >
                <span>{item.sku}</span>
                {item.current_stock <= item.reorder_point && (
                  <span className="w-1.5 h-1.5 rounded-full bg-dg-warning animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizontal Intelligence Strip */}
      <div className="dg-panel rounded-panel p-4 border border-dg-violet/25 shadow-panel">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-center divide-y sm:divide-y-0 sm:divide-x divide-dg-violet/15">
          {/* SKU */}
          <div className="px-2 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-dg-dim font-bold block">
              TARGET SKU
            </span>
            <span className="font-mono text-base font-extrabold text-dg-text block truncate">
              {selectedItem.sku}
            </span>
            <span className="text-[11px] text-dg-muted font-space truncate block">
              {selectedItem.product_name}
            </span>
          </div>

          {/* CURRENT STOCK */}
          <div className="pt-3 sm:pt-0 sm:px-3 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-dg-dim font-bold block">
              CURRENT STOCK
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`font-mono text-xl font-black ${isLowStock ? 'text-dg-danger' : 'text-dg-success'}`}>
                {selectedItem.current_stock}
              </span>
              <span className="text-[11px] font-mono text-dg-dim">/ {selectedItem.target_stock_level}</span>
            </div>
            <span className="text-[10px] font-mono text-dg-muted block">
              Reorder Pt: {selectedItem.reorder_point}
            </span>
          </div>

          {/* DEMAND / WEEK */}
          <div className="pt-3 sm:pt-0 sm:px-3 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-dg-dim font-bold block">
              DEMAND / WEEK
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-black text-dg-cyan">
                ~{weeklyDemand}
              </span>
              <span className="text-[10px] font-mono text-dg-dim">units</span>
            </div>
            <span className="text-[10px] font-mono text-dg-muted block">
              Velocity: {selectedItem.daily_velocity}/day
            </span>
          </div>

          {/* LEAD TIME */}
          <div className="pt-3 lg:pt-0 lg:px-3 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-dg-dim font-bold block">
              LEAD TIME
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-black text-dg-lavender">
                {selectedItem.supplier_lead_time_days}
              </span>
              <span className="text-[10px] font-mono text-dg-dim">DAYS</span>
            </div>
            <span className="text-[10px] font-mono text-dg-muted block">
              MOQ: {selectedItem.supplier_moq} units
            </span>
          </div>

          {/* SUPPLIER RELIABILITY */}
          <div className="pt-3 lg:pt-0 lg:px-3 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-dg-dim font-bold block">
              SUPPLIER
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`font-mono text-xl font-black ${supplierPct < 85 ? 'text-dg-warning' : 'text-dg-text'}`}>
                {supplierPct}%
              </span>
              <span className="text-[10px] font-mono text-dg-dim">SLA</span>
            </div>
            <span className="text-[10px] font-space text-dg-muted block truncate">
              {selectedItem.supplier_name}
            </span>
          </div>

          {/* RISK LEVEL */}
          <div className="pt-3 lg:pt-0 lg:px-3 space-y-1.5 flex flex-col justify-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-dg-dim font-bold block">
              STOCKOUT RISK
            </span>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-xs font-bold border w-fit ${risk.color}`}>
              {risk.label === 'CRITICAL' || risk.label === 'HIGH' ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : null}
              {risk.label}
            </div>
            {selectedItem.upcoming_event && (
              <span className="text-[10px] font-space text-dg-lavender truncate block" title={selectedItem.upcoming_event}>
                * {selectedItem.upcoming_event}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
