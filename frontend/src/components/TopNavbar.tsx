import React from 'react';
import { Sparkles, ArrowRight, PlusCircle } from 'lucide-react';
import { InventoryItem } from '../types/inventory';

interface TopNavbarProps {
  items: InventoryItem[];
  selectedItem: InventoryItem | null;
  onSelectItem: (item: InventoryItem) => void;
  onRunEvaluation: () => void;
  onOpenNewScenario?: () => void;
  isEvaluating: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  items,
  selectedItem,
  onSelectItem,
  onRunEvaluation,
  onOpenNewScenario,
  isEvaluating,
}) => {
  return (
    <header className="bg-[#FFFCF7] border-b border-[#EADFD4] px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
      {/* Left: Breadcrumbs & SKU context */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-xs text-[#827783]">
          <span className="font-bold text-[#342E35]">Decision Workspace</span>
          <span>/</span>
          <span className="text-[#342E35] font-medium">Self-Challenging Intelligence</span>
        </div>

        {selectedItem && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F5F0FC] border border-[#EADFD4] text-xs font-mono text-[#342E35]">
            <span className="text-[#827783]">Selected:</span>
            <span className="font-bold text-[#342E35]">{selectedItem.sku}</span>
          </div>
        )}
      </div>

      {/* Right: SKU Quick Selector & Primary Actions */}
      <div className="flex items-center gap-3">
        {/* New Scenario Button */}
        {onOpenNewScenario && (
          <button
            type="button"
            onClick={onOpenNewScenario}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFF9F0] hover:bg-[#F3ECE4] text-[#342E35] border border-[#EADFD4] text-xs font-bold transition cursor-pointer shadow-soft-sm"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#342E35]" />
            <span>New Scenario</span>
          </button>
        )}

        {/* SKU Selector Dropdown */}
        <div className="relative">
          <select
            value={selectedItem?.sku || ''}
            onChange={(e) => {
              const item = items.find((i) => i.sku === e.target.value);
              if (item) onSelectItem(item);
            }}
            disabled={isEvaluating}
            className="bg-[#FFF9F0] border border-[#EADFD4] text-[#342E35] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#DCC8F4] transition cursor-pointer shadow-soft-sm"
          >
            {items.map((item) => (
              <option key={item.sku} value={item.sku} className="bg-[#FFF9F0] text-[#342E35]">
                {item.sku} — {item.product_name}
              </option>
            ))}
          </select>
        </div>

        {/* Primary CTA */}
        <button
          onClick={onRunEvaluation}
          disabled={isEvaluating}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F5D6B8] hover:bg-[#F0C7A1] text-[#342E35] text-xs font-bold border border-[#EADFD4] shadow-soft-sm transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-95"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
          <span>{isEvaluating ? 'Auditing Decision...' : 'Challenge AI Decision'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
