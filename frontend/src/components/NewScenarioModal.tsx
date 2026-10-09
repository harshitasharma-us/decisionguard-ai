import React, { useState } from 'react';
import { InventoryItem } from '../types/inventory';
import { X, Sparkles, CheckCircle2, AlertTriangle, HelpCircle, Sliders } from 'lucide-react';

interface NewScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: InventoryItem) => void;
}

export const NewScenarioModal: React.FC<NewScenarioModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<InventoryItem>({
    sku: 'SKU-CUSTOM-9001',
    product_name: 'Custom High-Stakes SKU',
    category: 'Specialty Goods',
    current_stock: 25,
    safety_stock: 30,
    reorder_point: 50,
    target_stock_level: 150,
    daily_velocity: 6.0,
    supplier_lead_time_days: 12,
    unit_cost_usd: 20.0,
    selling_price_usd: 45.0,
    supplier_moq: 25,
    supplier_name: 'Custom Supplier Corp',
    supplier_reliability_score: 0.92,
    upcoming_event: '',
    shelf_life_days: undefined,
    warehouse_volume_cuft: undefined,
    notes: 'Custom input scenario for evaluation.',
  });

  const loadPreset = (preset: 'AGREES' | 'CHANGED' | 'UNCERTAIN') => {
    if (preset === 'AGREES') {
      setFormData({
        sku: 'SKU-LIVE-AGR99',
        product_name: 'Fast-Charging Power Bank 20000mAh',
        category: 'Electronics',
        current_stock: 45,
        safety_stock: 50,
        reorder_point: 80,
        target_stock_level: 250,
        daily_velocity: 15.0,
        supplier_lead_time_days: 7,
        unit_cost_usd: 14.0,
        selling_price_usd: 35.0,
        supplier_moq: 50,
        supplier_name: 'Apex Tier-1 Manufacturing',
        supplier_reliability_score: 0.96,
        upcoming_event: 'Tech Week Sale in 10 days',
        shelf_life_days: undefined,
        warehouse_volume_cuft: 1.2,
        notes: 'High demand surge verified. Reliable supplier.',
      });
    } else if (preset === 'CHANGED') {
      setFormData({
        sku: 'SKU-LIVE-CHG88',
        product_name: 'Probiotic Cold Yogurt Smoothie 6-Pack',
        category: 'Perishable Dairy',
        current_stock: 15,
        safety_stock: 25,
        reorder_point: 40,
        target_stock_level: 120,
        daily_velocity: 4.5,
        supplier_lead_time_days: 10,
        unit_cost_usd: 12.0,
        selling_price_usd: 24.0,
        supplier_moq: 25,
        supplier_name: 'Alpine Dairy Fresh',
        supplier_reliability_score: 0.88,
        upcoming_event: 'Winter slowdown',
        shelf_life_days: 35,
        warehouse_volume_cuft: 2.0,
        notes: '35-day expiry window. High risk of spoilage if over-ordered.',
      });
    } else if (preset === 'UNCERTAIN') {
      setFormData({
        sku: 'SKU-LIVE-UNC77',
        product_name: 'Bio-Peptide Regenerative Eye Serum',
        category: 'Cosmetics',
        current_stock: 20,
        safety_stock: 35,
        reorder_point: 55,
        target_stock_level: 160,
        daily_velocity: 5.5,
        supplier_lead_time_days: 18,
        unit_cost_usd: 35.0,
        selling_price_usd: 90.0,
        supplier_moq: 20,
        supplier_name: 'Unverified Overseas Vendor',
        supplier_reliability_score: 0.68,
        upcoming_event: 'None',
        shelf_life_days: undefined,
        warehouse_volume_cuft: 0.8,
        notes: 'Supplier has 68% fulfillment reliability; severe port delay risks.',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-warm-charcoal/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#EADFD4] shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto text-[#342E35]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#EADFD4] flex items-center justify-between sticky top-0 bg-[#FFFFFF] z-10">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#827783]" />
              <h2 className="text-base font-heading font-bold text-[#342E35]">
                Create Custom Decision Scenario
              </h2>
            </div>
            <p className="text-xs text-[#827783] mt-0.5">
              Input inventory parameters to test the adversarial self-challenge engine.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#827783] hover:text-[#342E35] hover:bg-[#FFF9F0] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Selector Buttons */}
        <div className="p-5 bg-[#FFFCF7] border-b border-[#EADFD4] space-y-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#827783] block">
            Load Verified Benchmark Presets:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => loadPreset('AGREES')}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[#D1F2D9]/40 hover:bg-[#D1F2D9]/70 border border-[#bce8c6] text-left transition cursor-pointer group"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="text-xs font-bold text-[#342E35] block">
                  AGREES Preset
                </span>
                <span className="text-[10px] text-[#827783] block">
                  High turnover & 96% SLA
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => loadPreset('CHANGED')}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F5D6B8]/50 hover:bg-[#F5D6B8]/80 border border-[#edd1b3] text-left transition cursor-pointer group"
            >
              <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0" />
              <div>
                <span className="text-xs font-bold text-[#342E35] block">
                  CHANGED Preset
                </span>
                <span className="text-[10px] text-[#827783] block">
                  35-day shelf-life expiry
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => loadPreset('UNCERTAIN')}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F1C5D0]/50 hover:bg-[#F1C5D0]/80 border border-[#e8bac7] text-left transition cursor-pointer group"
            >
              <HelpCircle className="w-4 h-4 text-rose-700 shrink-0" />
              <div>
                <span className="text-xs font-bold text-[#342E35] block">
                  UNCERTAIN Preset
                </span>
                <span className="text-[10px] text-[#827783] block">
                  Low 68% supplier SLA
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Row 1: SKU & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#342E35] mb-1">SKU Code</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full bg-[#FFF9F0] border border-[#EADFD4] rounded-lg px-3 py-2 font-mono text-[#342E35] focus:outline-none focus:border-[#F5D6B8]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#342E35] mb-1">Product Name</label>
              <input
                type="text"
                required
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className="w-full bg-[#FFF9F0] border border-[#EADFD4] rounded-lg px-3 py-2 text-[#342E35] focus:outline-none focus:border-[#F5D6B8]"
              />
            </div>
          </div>

          {/* Row 2: Stock Runway Levels */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-[#342E35] mb-1">Current Stock</label>
              <input
                type="number"
                min="0"
                required
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#FFF9F0] border border-[#EADFD4] rounded-lg px-3 py-2 font-mono text-[#342E35] focus:outline-none focus:border-[#F5D6B8]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#342E35] mb-1">Target Stock</label>
              <input
                type="number"
                min="1"
                required
                value={formData.target_stock_level}
                onChange={(e) => setFormData({ ...formData, target_stock_level: parseInt(e.target.value) || 1 })}
                className="w-full bg-[#FFF9F0] border border-[#EADFD4] rounded-lg px-3 py-2 font-mono text-[#342E35] focus:outline-none focus:border-[#F5D6B8]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#342E35] mb-1">Reorder Point</label>
              <input
                type="number"
                min="0"
                required
                value={formData.reorder_point}
                onChange={(e) => setFormData({ ...formData, reorder_point: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#FFF9F0] border border-[#EADFD4] rounded-lg px-3 py-2 font-mono text-[#342E35] focus:outline-none focus:border-[#F5D6B8]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#342E35] mb-1">Safety Stock</label>
              <input
                type="number"
                min="0"
                required
                value={formData.safety_stock}
                onChange={(e) => setFormData({ ...formData, safety_stock: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#FFF9F0] border border-[#EADFD4] rounded-lg px-3 py-2 font-mono text-[#342E35] focus:outline-none focus:border-[#F5D6B8]"
              />
            </div>
          </div>

          {/* Row 3: Velocity, Lead Time, MOQ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#342E35] mb-1">Daily Demand (units/day)</label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                required
                value={formData.daily_velocity}
                onChange={(e) => setFormData({ ...formData, daily_velocity: parseFloat(e.target.value) || 0.1 })}
                className="w-full bg-[#FFF9F0] border border-[#EADFD4] rounded-lg px-3 py-2 font-mono text-[#342E35] focus:outline-none focus:border-[#F5D6B8]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#342E35] mb-1">Supplier Lead Time (Days)</label>
              <input
                type="number"
                min="1"
                required
                value={formData.supplier_lead_time_days}
                onChange={(e) => setFormData({ ...formData, supplier_lead_time_days: parseInt(e.target.value) || 1 })}
                className="w-full bg-[#FFF9F0] border border-[#EADFD4] rounded-lg px-3 py-2 font-mono text-[#342E35] focus:outline-none focus:border-[#F5D6B8]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#342E35] mb-1">Supplier MOQ</label>
              <input
                type="number"
                min="1"
                required
                value={formData.supplier_moq}
                onChange={(e) => setFormData({ ...formData, supplier_moq: parseInt(e.target.value) || 1 })}
                className="w-full bg-[#FFF9F0] border border-[#EADFD4] rounded-lg px-3 py-2 font-mono text-[#342E35] focus:outline-none focus:border-[#F5D6B8]"
              />
            </div>
          </div>

          {/* Row 4: Risk Parameters: Shelf Life, Storage Volume, Supplier SLA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#342E35] mb-1">Shelf Life (Days, optional)</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 35 (Perishables)"
                value={formData.shelf_life_days || ''}
                onChange={(e) => setFormData({ ...formData, shelf_life_days: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full bg-[#FFF9F0] border border-[#EADFD4] rounded-lg px-3 py-2 font-mono text-[#342E35] focus:outline-none focus:border-[#F5D6B8]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#342E35] mb-1">Volume (cu.ft/unit, optional)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g. 6.5 (Bulky)"
                value={formData.warehouse_volume_cuft || ''}
                onChange={(e) => setFormData({ ...formData, warehouse_volume_cuft: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full bg-[#FFF9F0] border border-[#EADFD4] rounded-lg px-3 py-2 font-mono text-[#342E35] focus:outline-none focus:border-[#F5D6B8]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#342E35] mb-1">Supplier SLA (0.0 to 1.0)</label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="1.0"
                required
                value={formData.supplier_reliability_score}
                onChange={(e) => setFormData({ ...formData, supplier_reliability_score: parseFloat(e.target.value) || 0.9 })}
                className="w-full bg-[#FFF9F0] border border-[#EADFD4] rounded-lg px-3 py-2 font-mono text-[#342E35] focus:outline-none focus:border-[#F5D6B8]"
              />
            </div>
          </div>

          {/* Row 5: Notes / Event */}
          <div>
            <label className="block font-semibold text-[#342E35] mb-1">Upcoming Market Event / Context</label>
            <input
              type="text"
              placeholder="e.g. Tech Week Sale in 10 days or Winter demand slowdown"
              value={formData.upcoming_event || ''}
              onChange={(e) => setFormData({ ...formData, upcoming_event: e.target.value })}
              className="w-full bg-[#FFF9F0] border border-[#EADFD4] rounded-lg px-3 py-2 text-[#342E35] focus:outline-none focus:border-[#F5D6B8]"
            />
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-[#EADFD4] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#FFF9F0] border border-[#EADFD4] text-[#827783] hover:text-[#342E35] font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#F5D6B8] hover:bg-[#ecc9a5] border border-[#e5c6a5] text-[#342E35] font-bold shadow-sm transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#342E35]" />
              <span>Launch Self-Challenge Audit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
