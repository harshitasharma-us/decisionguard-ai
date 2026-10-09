import React from 'react';
import { Boxes, AlertTriangle, ShieldCheck, TrendingDown, Clock, DollarSign, CheckCircle2, HelpCircle } from 'lucide-react';
import { InventoryItem, EvaluationResponse } from '../types/inventory';

interface KpiMetricsStripProps {
  items: InventoryItem[];
  selectedItem?: InventoryItem | null;
  evaluation?: EvaluationResponse | null;
  isEvaluating?: boolean;
}

export const KpiMetricsStrip: React.FC<KpiMetricsStripProps> = ({
  items,
  selectedItem,
  evaluation,
  isEvaluating = false,
}) => {
  const lowStockCount = items.filter((i) => i.current_stock <= i.reorder_point).length;
  const perishableCount = items.filter((i) => i.shelf_life_days && i.shelf_life_days > 0).length;

  // Selected item specific calculations
  const velocity = selectedItem ? Math.max(0.1, selectedItem.daily_velocity || 1) : 1;
  const runwayDays = selectedItem ? (selectedItem.current_stock / velocity).toFixed(1) : '0.0';
  const isReorderDue = selectedItem ? selectedItem.current_stock <= selectedItem.reorder_point : false;
  const capitalExposure = selectedItem ? Math.round(selectedItem.current_stock * (selectedItem.unit_cost_usd || 0)) : 0;
  const isSelectedEvalMatching = evaluation && selectedItem && evaluation.sku.toUpperCase() === selectedItem.sku.toUpperCase();

  const kpis = [
    {
      title: selectedItem ? `Stock Runway (${selectedItem.sku})` : 'Monitored Catalog',
      value: selectedItem ? `${runwayDays} Days` : `${items.length} SKUs`,
      sub: selectedItem
        ? `${selectedItem.current_stock} units on hand • Velocity: ${selectedItem.daily_velocity}/day (Lead: ${selectedItem.supplier_lead_time_days}d)`
        : `${items.length} active inventory records monitored`,
      globalBadge: `Catalog: ${items.length} SKUs`,
      icon: selectedItem ? Clock : Boxes,
      cardBg: 'bg-[#F5D6B8]',
      iconBg: 'bg-white/70 text-[#342E35]',
    },
    {
      title: selectedItem ? `Reorder Trigger (${selectedItem.sku})` : 'Stockout Risk',
      value: selectedItem ? (isReorderDue ? 'Reorder Due' : 'Runway Optimal') : `${lowStockCount} Triggers`,
      sub: selectedItem
        ? `Stock (${selectedItem.current_stock}) ${isReorderDue ? '≤' : '>'} ROP (${selectedItem.reorder_point}) • Safety: ${selectedItem.safety_stock}`
        : `${lowStockCount} of ${items.length} products at or below ROP`,
      globalBadge: `Global: ${lowStockCount} Critical`,
      icon: isReorderDue ? AlertTriangle : CheckCircle2,
      cardBg: 'bg-[#F1C5D0]',
      iconBg: 'bg-white/70 text-[#342E35]',
    },
    {
      title: selectedItem ? `Holding Value (${selectedItem.sku})` : 'Perishable Defense',
      value: selectedItem ? `$${capitalExposure.toLocaleString()}` : `${perishableCount} Items`,
      sub: selectedItem
        ? `Unit Cost: $${(selectedItem.unit_cost_usd || 0).toFixed(2)} • ${
            selectedItem.shelf_life_days
              ? `Perishable (${selectedItem.shelf_life_days}d expiry)`
              : selectedItem.warehouse_volume_cuft
              ? `Bulky (${selectedItem.warehouse_volume_cuft} cu.ft)`
              : 'Standard Dry Storage'
          }`
        : `${perishableCount} items with active shelf-life constraints`,
      globalBadge: `Global: ${perishableCount} Perishables`,
      icon: selectedItem ? DollarSign : ShieldCheck,
      cardBg: 'bg-[#DCC8F4]',
      iconBg: 'bg-white/70 text-[#342E35]',
    },
    {
      title: selectedItem ? `AI Decision (${selectedItem.sku})` : 'AI Verification',
      value: isEvaluating
        ? 'Auditing...'
        : isSelectedEvalMatching
        ? `${evaluation.decision_outcome} (${evaluation.confidence_after}%)`
        : selectedItem
        ? `SLA ${Math.round((selectedItem.supplier_reliability_score || 0.9) * 100)}%`
        : 'Active Loop',
      sub: isEvaluating
        ? 'Executing multi-pass self-challenge & risk calibration...'
        : isSelectedEvalMatching
        ? `Initial: ${evaluation.single_pass.reorder_quantity}u → Final: ${evaluation.final_recommendation.reorder_quantity}u (${evaluation.confidence_delta >= 0 ? '+' : ''}${evaluation.confidence_delta}% Δ)`
        : selectedItem
        ? `Supplier: ${selectedItem.supplier_name} • Lead: ${selectedItem.supplier_lead_time_days}d • MOQ: ${selectedItem.supplier_moq}`
        : 'Multi-pass reasoning engine ready',
      globalBadge: isSelectedEvalMatching
        ? (evaluation.is_live_llm ? 'Live AI Mode' : 'Rule Calibrated')
        : 'Overconfidence Defense Active',
      icon: isSelectedEvalMatching && evaluation.decision_outcome === 'AGREES'
        ? CheckCircle2
        : isSelectedEvalMatching && evaluation.decision_outcome === 'CHANGED'
        ? AlertTriangle
        : isSelectedEvalMatching && evaluation.decision_outcome === 'UNCERTAIN'
        ? HelpCircle
        : TrendingDown,
      cardBg: 'bg-[#C9DCF5]',
      iconBg: 'bg-white/70 text-[#342E35]',
    },
  ];

  return (
    <div className="space-y-2">
      {selectedItem && (
        <div className="flex items-center justify-between px-1 text-xs text-[#827783]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#342E35]">Product Telemetry:</span>
            <span className="font-mono font-bold text-[#342E35] bg-[#FFFFFF] px-2 py-0.5 rounded-lg border border-[#EADFD4]">
              {selectedItem.sku}
            </span>
            <span className="text-[#342E35] font-medium hidden sm:inline">
              — {selectedItem.product_name}
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#827783]">
            {items.length} SKUs in Catalog
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`${kpi.cardBg} border border-[#EADFD4] rounded-2xl p-5 flex flex-col justify-between shadow-soft-sm transition hover:shadow-soft-md`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold text-[#342E35] uppercase tracking-wider truncate pr-2">
                  {kpi.title}
                </span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${kpi.iconBg} shadow-soft-sm`}>
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-heading font-black text-[#342E35] truncate">
                  {kpi.value}
                </div>
                <p className="text-[11px] text-[#342E35]/85 font-medium line-clamp-2 leading-tight min-h-[28px]">
                  {kpi.sub}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#342E35]/10 flex items-center justify-between text-[10px] font-mono text-[#342E35]/70">
                <span>{kpi.globalBadge}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
