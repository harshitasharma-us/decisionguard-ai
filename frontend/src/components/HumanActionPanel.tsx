import React, { useState, useEffect } from 'react';
import {
  EvaluationResponse,
  DecisionActionResponse,
} from '../types/inventory';
import { apiService } from '../services/api';
import { CheckCircle2, Sliders, XCircle, Clock, Send, ShieldCheck } from 'lucide-react';

interface HumanActionPanelProps {
  evaluation: EvaluationResponse;
  onActionComplete: (response: DecisionActionResponse) => void;
}

export const HumanActionPanel: React.FC<HumanActionPanelProps> = ({
  evaluation,
  onActionComplete,
}) => {
  const [approvedQty, setApprovedQty] = useState<number>(
    evaluation.final_recommendation.reorder_quantity
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastAction, setLastAction] = useState<DecisionActionResponse | null>(null);

  useEffect(() => {
    setApprovedQty(evaluation.final_recommendation.reorder_quantity);
    setNotes('');
    setLastAction(null);
  }, [evaluation]);

  const handleAction = async (action: 'APPROVE' | 'ADJUST' | 'REJECT' | 'DEFER') => {
    setIsSubmitting(true);
    try {
      const res = await apiService.recordAction({
        sku: evaluation.sku,
        action,
        final_approved_quantity: action === 'REJECT' ? 0 : approvedQty,
        notes: notes || undefined,
      });
      setLastAction(res);
      onActionComplete(res);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur shadow-2xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Human-in-the-Loop Decision Sign-Off
          </h3>
          <p className="text-xs text-slate-400">
            Review self-challenged findings, calibrate final order volume, and dispatch directly to ERP.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400">Recommended Qty:</span>
          <span className="font-bold text-emerald-400">
            {evaluation.final_recommendation.reorder_quantity} units
          </span>
        </div>
      </div>

      {lastAction ? (
        <div className="bg-emerald-950/40 border border-emerald-500/50 p-4 rounded-xl flex items-center gap-3 text-emerald-200">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-sm text-white">Action Recorded Successfully!</p>
            <p className="text-emerald-300">{lastAction.message}</p>
            <p className="text-[10px] text-slate-400">
              Audit log timestamp: {new Date(lastAction.recorded_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quantity Calibration Slider & Input */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Final Order Quantity Calibration
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={approvedQty}
                  onChange={(e) => setApprovedQty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-right font-bold text-sm text-emerald-400 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-xs text-slate-400 font-medium">units</span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max={Math.max(300, evaluation.final_recommendation.reorder_quantity * 2)}
              step="5"
              value={approvedQty}
              onChange={(e) => setApprovedQty(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          {/* Optional Operator Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Operator Sign-off Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Confirmed with supplier rep; adjusted for weekend warehouse shift."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <button
              onClick={() => handleAction('APPROVE')}
              disabled={isSubmitting || approvedQty <= 0}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve AI Reorder
            </button>

            <button
              onClick={() => handleAction('ADJUST')}
              disabled={isSubmitting || approvedQty <= 0}
              className="flex items-center justify-center gap-2 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Adjust & Dispatch
            </button>

            <button
              onClick={() => handleAction('DEFER')}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-xs border border-slate-700 transition active:scale-95 cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              Defer Review
            </button>

            <button
              onClick={() => handleAction('REJECT')}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-semibold px-4 py-2.5 rounded-xl text-xs transition active:scale-95 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              Reject Reorder
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
