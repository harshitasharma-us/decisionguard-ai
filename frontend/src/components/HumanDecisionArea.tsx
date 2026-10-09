import React, { useState, useEffect } from 'react';
import { EvaluationResponse, DecisionActionResponse } from '../types/inventory';
import { apiService } from '../services/api';
import { UserCheck, Check, Edit3, X, Clock, Sliders, CheckCircle2 } from 'lucide-react';

interface HumanDecisionAreaProps {
  evaluation: EvaluationResponse;
  onActionComplete: (res: DecisionActionResponse) => void;
  recentActions: DecisionActionResponse[];
}

export const HumanDecisionArea: React.FC<HumanDecisionAreaProps> = ({
  evaluation,
  onActionComplete,
  recentActions,
}) => {
  const [approvedQty, setApprovedQty] = useState<number>(
    evaluation.final_recommendation.reorder_quantity
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedAction, setConfirmedAction] = useState<DecisionActionResponse | null>(null);

  useEffect(() => {
    setApprovedQty(evaluation.final_recommendation.reorder_quantity);
    setNotes('');
    setConfirmedAction(null);
  }, [evaluation]);

  const handleExecuteAction = async (action: 'APPROVE' | 'ADJUST' | 'REJECT' | 'DEFER') => {
    setIsSubmitting(true);
    try {
      const finalQty = action === 'REJECT' ? 0 : approvedQty;
      const res = await apiService.recordAction({
        sku: evaluation.sku,
        action,
        final_approved_quantity: finalQty,
        notes: notes.trim() || undefined,
      });
      setConfirmedAction(res);
      onActionComplete(res);
    } catch (err) {
      console.error('Failed to submit human action:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dg-panel rounded-hero p-6 sm:p-8 border border-dg-violet/25 shadow-panel space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dg-violet/15 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-dg-cyan" />
            <h2 className="text-lg sm:text-xl font-extrabold font-space text-white uppercase tracking-tight">
              HUMAN DECISION REQUIRED
            </h2>
          </div>
          <p className="text-xs font-space text-dg-muted italic">
            &quot;AI recommends. Human decides.&quot;
          </p>
        </div>

        <div className="flex items-center gap-3 bg-dg-bg/90 px-4 py-2 rounded-panel border border-dg-violet/20">
          <span className="text-[11px] font-mono text-dg-dim uppercase font-bold">
            RECOMMENDED:
          </span>
          <span className="font-mono text-sm font-black text-dg-cyan">
            {evaluation.final_recommendation.reorder_quantity} UNITS
          </span>
        </div>
      </div>

      {confirmedAction ? (
        /* Successful Action Confirmation Card */
        <div className="bg-dg-bg/95 rounded-panel p-6 border border-dg-success/50 shadow-glow-success flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-dg-success/15 border border-dg-success/30 flex items-center justify-center text-dg-success shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black uppercase text-dg-success bg-dg-success/10 px-2 py-0.5 rounded border border-dg-success/20">
                ACTION RECORDED: {confirmedAction.action}
              </span>
              <span className="text-xs font-mono text-dg-dim">
                SKU: {confirmedAction.sku}
              </span>
            </div>
            <p className="text-sm font-space font-semibold text-white">
              {confirmedAction.message}
            </p>
            <p className="text-[11px] font-mono text-dg-dim">
              Timestamp: {new Date(confirmedAction.recorded_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
      ) : (
        /* Action Execution Form */
        <div className="space-y-5">
          {/* Quantity Calibration Slider */}
          <div className="bg-dg-bg/80 rounded-panel p-5 border border-dg-violet/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-space font-bold uppercase tracking-wider text-dg-text flex items-center gap-2">
                <Sliders className="w-4 h-4 text-dg-cyan" />
                Final Order Volume Calibration
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={approvedQty}
                  onChange={(e) => setApprovedQty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 bg-dg-secondary border border-dg-violet/40 rounded-lg px-2.5 py-1 text-right font-mono font-bold text-sm text-dg-cyan focus:outline-none focus:border-dg-cyan shadow-inner"
                />
                <span className="text-xs font-mono text-dg-dim">UNITS</span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max={Math.max(300, evaluation.final_recommendation.reorder_quantity * 2)}
              step="5"
              value={approvedQty}
              onChange={(e) => setApprovedQty(parseInt(e.target.value))}
              className="w-full h-2 bg-dg-secondary rounded-lg appearance-none cursor-pointer accent-dg-cyan"
            />
          </div>

          {/* Decision Sign-off Notes */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-dg-dim">
              Operator Sign-off Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Confirmed with logistics manager; buffer reduced for end-of-month shelf rotation."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-dg-bg/90 border border-dg-violet/25 rounded-panel px-4 py-2.5 text-xs text-dg-text placeholder:text-dg-dim focus:outline-none focus:border-dg-cyan transition"
            />
          </div>

          {/* Action Buttons: APPROVE, MODIFY, REJECT, DEFER */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {/* APPROVE */}
            <button
              onClick={() => handleExecuteAction('APPROVE')}
              disabled={isSubmitting || approvedQty <= 0}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-panel font-space font-bold text-xs uppercase tracking-wider bg-dg-success/20 hover:bg-dg-success/30 text-dg-success border border-dg-success/40 shadow-glow-success transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Approve Reorder
            </button>

            {/* MODIFY */}
            <button
              onClick={() => handleExecuteAction('ADJUST')}
              disabled={isSubmitting || approvedQty <= 0}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-panel font-space font-bold text-xs uppercase tracking-wider bg-dg-violet/20 hover:bg-dg-violet/30 text-dg-lavender border border-dg-violet/40 shadow-glow-violet transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Edit3 className="w-4 h-4" />
              Modify & Order
            </button>

            {/* DEFER */}
            <button
              onClick={() => handleExecuteAction('DEFER')}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-panel font-space font-bold text-xs uppercase tracking-wider bg-dg-panel hover:bg-dg-panel-light text-dg-muted border border-dg-violet/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Clock className="w-4 h-4 text-dg-warning" />
              Defer Review
            </button>

            {/* REJECT */}
            <button
              onClick={() => handleExecuteAction('REJECT')}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-panel font-space font-bold text-xs uppercase tracking-wider bg-dg-danger/15 hover:bg-dg-danger/25 text-dg-danger border border-dg-danger/30 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Reject Proposal
            </button>
          </div>
        </div>
      )}

      {/* Audit Log Strip */}
      {recentActions.length > 0 && (
        <div className="pt-4 border-t border-dg-violet/15 space-y-2">
          <span className="text-[10px] font-mono uppercase font-bold text-dg-dim tracking-wider block">
            Session Action Telemetry Log
          </span>
          <div className="space-y-1.5 max-h-28 overflow-y-auto">
            {recentActions.map((log, idx) => (
              <div
                key={idx}
                className="bg-dg-bg/70 px-3 py-1.5 rounded-lg border border-dg-violet/10 flex items-center justify-between text-[11px] font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="text-dg-cyan font-bold">{log.sku}</span>
                  <span className="text-dg-dim">•</span>
                  <span className="text-white font-semibold">{log.action}</span>
                  <span className="text-dg-muted">({log.final_approved_quantity} units)</span>
                </div>
                <span className="text-dg-dim">
                  {new Date(log.recorded_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
