import React from 'react';
import { InventoryItem } from '../types/inventory';
import { Sparkles, AlertCircle, CheckCircle2, Clock, Building2, Database, RefreshCw } from 'lucide-react';

interface InventoryTableProps {
  items: InventoryItem[];
  selectedItem: InventoryItem | null;
  onSelectItem: (item: InventoryItem) => void;
  onRunEvaluation: (sku: string) => void;
  isEvaluating: boolean;
  onLoadSeeds?: () => void;
  onClearSeeds?: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  selectedItem,
  onSelectItem,
  onRunEvaluation,
  isEvaluating,
  onLoadSeeds,
  onClearSeeds,
}) => {
  const isExpandedSeedActive = items.length > 5;

  return (
    <div className="enterprise-card overflow-hidden">
      <div className="p-5 border-b border-[#EADFD4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFCF7]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-extrabold text-sm text-[#342E35]">
              Enterprise Inventory Telemetry
            </h3>
            {isExpandedSeedActive && (
              <span className="text-[10px] font-mono font-bold text-[#342E35] bg-[#DCC8F4]/60 px-2 py-0.5 rounded-md border border-[#cfb6ec]">
                Expanded Catalog Active
              </span>
            )}
          </div>
          <p className="text-xs text-[#827783] mt-0.5">
            Click any SKU row to bind dashboard telemetry and trigger real-time self-challenge audit.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onLoadSeeds && onClearSeeds && (
            <button
              type="button"
              onClick={isExpandedSeedActive ? onClearSeeds : onLoadSeeds}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF9F0] hover:bg-[#F3ECE4] text-xs font-mono font-bold text-[#342E35] border border-[#EADFD4] shadow-soft-sm transition cursor-pointer"
            >
              {isExpandedSeedActive ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-[#827783]" />
                  <span>Reset to 5 Core Benchmarks</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Load +7 Synthetic Seeds (12 SKUs)</span>
                </>
              )}
            </button>
          )}

          <span className="text-xs font-mono font-bold text-[#342E35] bg-[#F5D6B8] px-3 py-1 rounded-full border border-[#EADFD4]">
            {items.length} Active Records
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FFF9F0] border-b border-[#EADFD4] text-[11px] font-bold text-[#827783] uppercase tracking-wider font-mono">
              <th className="py-3.5 px-4">SKU & Product</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Stock Runway</th>
              <th className="py-3.5 px-4">Velocity</th>
              <th className="py-3.5 px-4">Lead Time / MOQ</th>
              <th className="py-3.5 px-4">Supplier SLA</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EADFD4] text-xs">
            {items.map((item) => {
              const isSelected = selectedItem?.sku === item.sku;
              const isLowStock = item.current_stock <= item.reorder_point;
              const stockPct = Math.min(100, Math.round((item.current_stock / item.target_stock_level) * 100));
              const isSynthetic = item.notes?.includes('[Synthetic Benchmark]');

              return (
                <tr
                  key={item.sku}
                  onClick={() => onSelectItem(item)}
                  className={`transition-colors cursor-pointer ${
                    isSelected ? 'bg-[#F5F0FC] font-medium' : 'hover:bg-[#FFF9F0]'
                  }`}
                >
                  {/* SKU & Product */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[#342E35]">
                          {item.sku}
                        </span>
                        {isSynthetic && (
                          <span className="text-[9px] font-mono font-bold text-[#827783] bg-[#EADFD4]/50 px-1.5 py-0.2 rounded border border-[#EADFD4]">
                            Synthetic
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-[#827783] truncate max-w-[200px]">
                        {item.product_name}
                      </span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-4 text-[#827783] font-medium">
                    {item.category}
                  </td>

                  {/* Stock Runway */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1 w-28">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className={`font-bold ${isLowStock ? 'text-[#8C2E43]' : 'text-[#342E35]'}`}>
                          {item.current_stock}
                        </span>
                        <span className="text-[#827783]">/ {item.target_stock_level}</span>
                      </div>
                      <div className="w-full h-2 bg-[#FFF9F0] rounded-full overflow-hidden border border-[#EADFD4]">
                        <div
                          className={`h-full rounded-full ${
                            isLowStock ? 'bg-[#F1C5D0]' : 'bg-[#D1F2D9]'
                          }`}
                          style={{ width: `${stockPct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Velocity */}
                  <td className="py-3.5 px-4 font-mono font-bold text-[#342E35]">
                    {item.daily_velocity} <span className="text-[10px] text-[#827783] font-normal">/day</span>
                  </td>

                  {/* Lead Time & MOQ */}
                  <td className="py-3.5 px-4 text-[#827783]">
                    <div className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-[#827783] shrink-0" />
                      <span>{item.supplier_lead_time_days}d</span>
                      <span className="text-[#EADFD4]">•</span>
                      <span>MOQ {item.supplier_moq}</span>
                    </div>
                  </td>

                  {/* Supplier & SLA */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 font-medium text-[#342E35] truncate max-w-[140px]">
                        <Building2 className="w-3 h-3 text-[#827783] shrink-0" />
                        <span className="truncate">{item.supplier_name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#827783]">
                        Reliability: {Math.round(item.supplier_reliability_score * 100)}%
                      </span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    {isLowStock ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8C2E43] bg-[#F1C5D0] px-2.5 py-0.5 rounded-full border border-[#EADFD4]">
                        <AlertCircle className="w-3 h-3 text-[#8C2E43]" />
                        Reorder Due
                      </span>
                    ) : item.shelf_life_days ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7A4B1A] bg-[#F5D6B8] px-2.5 py-0.5 rounded-full border border-[#EADFD4]">
                        Perishable ({item.shelf_life_days}d)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2A7545] bg-[#D1F2D9] px-2.5 py-0.5 rounded-full border border-[#BDE5C8]">
                        <CheckCircle2 className="w-3 h-3 text-[#2A7545]" />
                        Optimal
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectItem(item);
                        onRunEvaluation(item.sku);
                      }}
                      disabled={isEvaluating}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border border-[#EADFD4] shadow-soft-sm ${
                        isSelected
                          ? 'bg-[#DCC8F4] text-[#342E35]'
                          : 'bg-[#FFF9F0] hover:bg-[#F5D6B8] text-[#342E35]'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isSelected ? 'Audited' : 'Audit'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
