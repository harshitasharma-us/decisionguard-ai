import React, { useState } from 'react';
import { DoubleCheckComparison } from '../types/inventory';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Scale,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  XCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface DoubleCheckComparisonCardProps {
  comparison: DoubleCheckComparison;
}

export const DoubleCheckComparisonCard: React.FC<DoubleCheckComparisonCardProps> = ({
  comparison,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showPsDetails, setShowPsDetails] = useState<boolean>(false);

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case 'MET':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D1F2D9] text-[#2A7545] border border-[#BDE5C8]">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" focusable="false" /> PS Compliant (MET)
          </span>
        );
      case 'PARTIALLY_MET':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F5D6B8] text-[#7A4B1A] border border-[#EADFD4]">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" focusable="false" /> PARTIALLY MET
          </span>
        );
      case 'NOT_MET':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F1C5D0] text-[#8C2E43] border border-[#EADFD4]">
            <XCircle className="w-3 h-3" aria-hidden="true" focusable="false" /> NOT MET
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F0F6FD] text-[#1E4E8C] border border-[#EADFD4]">
            <HelpCircle className="w-3 h-3" aria-hidden="true" focusable="false" /> INSUFFICIENT EVIDENCE
          </span>
        );
    }
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D1F2D9] text-[#2A7545] border border-[#BDE5C8]">
            <ShieldCheck className="w-3 h-3" aria-hidden="true" focusable="false" /> Double-Checked & Verified
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F1C5D0] text-[#8C2E43] border border-[#EADFD4]">
            <XCircle className="w-3 h-3" aria-hidden="true" focusable="false" /> Verification Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF9F0] text-[#7A4B1A] border border-[#EADFD4]">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" focusable="false" /> Unverified (Offline / No Key)
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-[#EADFD4] bg-[#FFFFFF] overflow-hidden shadow-soft-sm text-xs font-sans mt-3">
      {/* Top Banner & Accordion Toggle */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-3.5 bg-[#FFF9F0] hover:bg-[#FDF4EC] cursor-pointer border-b border-[#EADFD4] transition"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-6 h-6 rounded-lg bg-[#DCC8F4] flex items-center justify-center text-[#342E35]">
            <Scale className="w-3.5 h-3.5 text-[#342E35]" aria-hidden="true" focusable="false" />
          </div>
          <span className="font-heading font-extrabold text-[#342E35] text-xs sm:text-sm">
            Double-Check & Answer Comparison Engine
          </span>
          {getVerificationBadge(comparison.verification_status)}
          {getComplianceBadge(comparison.ps_compliance)}
        </div>

        <button
          type="button"
          className="text-[#827783] hover:text-[#342E35] p-1 rounded transition"
          aria-label="Toggle details"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#827783]" aria-hidden="true" focusable="false" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#827783]" aria-hidden="true" focusable="false" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Side-by-Side Comparison Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* First Answer */}
            <div className="p-3.5 rounded-xl bg-[#FFF9F0] border border-[#EADFD4] space-y-2">
              <div className="flex items-center justify-between border-b border-[#EADFD4] pb-2">
                <span className="font-mono font-bold text-[#827783] uppercase tracking-wider text-[10px]">
                  Pass 1: Initial Answer / Proposal
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#EADFD4]/60 text-[#342E35] font-mono">
                  Baseline
                </span>
              </div>
              <p className="text-[11px] text-[#342E35] leading-relaxed line-clamp-6 whitespace-pre-line">
                {comparison.first_answer}
              </p>
            </div>

            {/* Verified Answer */}
            <div className="p-3.5 rounded-xl bg-[#F5F0FC] border border-[#cfb6ec] space-y-2">
              <div className="flex items-center justify-between border-b border-[#cfb6ec] pb-2">
                <span className="font-mono font-bold text-[#7A4B1A] uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-700" aria-hidden="true" focusable="false" /> Pass 2: Independently Verified
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#DCC8F4] text-[#342E35] font-mono font-bold">
                  Ground Truth
                </span>
              </div>
              <p className="text-[11px] text-[#342E35] leading-relaxed line-clamp-6 whitespace-pre-line">
                {comparison.verified_answer}
              </p>
            </div>
          </div>

          {/* Agreements Strip */}
          {comparison.agreements && comparison.agreements.length > 0 && (
            <div className="p-3 rounded-xl bg-[#D1F2D9]/40 border border-[#BDE5C8] space-y-1.5">
              <span className="font-mono font-bold uppercase text-[10px] text-[#2A7545] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2A7545]" aria-hidden="true" focusable="false" /> Verified Agreements ({comparison.agreements.length})
              </span>
              <ul className="space-y-1 pl-4 list-disc text-[11px] text-[#2A7545]">
                {comparison.agreements.map((item, idx) => (
                  <li key={idx} className="leading-snug">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contradictions & Corrections Strip */}
          {comparison.contradictions && comparison.contradictions.length > 0 && (
            <div className="p-3 rounded-xl bg-[#F5D6B8]/50 border border-[#EADFD4] space-y-1.5">
              <span className="font-mono font-bold uppercase text-[10px] text-[#7A4B1A] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[#7A4B1A]" aria-hidden="true" focusable="false" /> Contradictions & Corrections Identified ({comparison.contradictions.length})
              </span>
              <ul className="space-y-1 pl-4 list-disc text-[11px] text-[#7A4B1A]">
                {comparison.contradictions.map((item, idx) => (
                  <li key={idx} className="leading-snug font-medium">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Unverified Claims & Missing Evidence */}
          {comparison.unverified_claims && comparison.unverified_claims.length > 0 && (
            <div className="p-3 rounded-xl bg-[#F0F6FD] border border-[#EADFD4] space-y-1.5">
              <span className="font-mono font-bold uppercase text-[10px] text-[#1E4E8C] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#1E4E8C]" aria-hidden="true" focusable="false" /> Claims Lacking Verification / Evidence ({comparison.unverified_claims.length})
              </span>
              <ul className="space-y-1 pl-4 list-disc text-[11px] text-[#1E4E8C]">
                {comparison.unverified_claims.map((item, idx) => (
                  <li key={idx} className="leading-snug">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* PS Compliance Accordion */}
          {comparison.ps_checks && comparison.ps_checks.length > 0 && (
            <div className="rounded-xl border border-[#EADFD4] bg-[#FFF9F0] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPsDetails(!showPsDetails)}
                className="w-full flex items-center justify-between p-2.5 text-xs text-[#342E35] hover:bg-[#F3ECE4] transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-3.5 h-3.5 text-[#342E35]" aria-hidden="true" focusable="false" />
                  <span className="font-mono font-bold text-[11px]">
                    Project Specification (PS) Compliance Audit ({comparison.ps_checks.length} Criteria)
                  </span>
                </div>
                {showPsDetails ? (
                  <ChevronUp className="w-3.5 h-3.5 text-[#827783]" aria-hidden="true" focusable="false" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-[#827783]" aria-hidden="true" focusable="false" />
                )}
              </button>

              {showPsDetails && (
                <div className="p-3 border-t border-[#EADFD4] space-y-2 bg-[#FFFFFF]">
                  {comparison.ps_checks.map((chk, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[#FFF9F0] border border-[#EADFD4] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#342E35] px-1.5 py-0.2 bg-white rounded border border-[#EADFD4]">
                            {chk.requirement_id}
                          </span>
                          <span className="font-bold text-[#342E35]">{chk.name}</span>
                        </div>
                        <p className="text-[#827783] text-[10px] pl-0.5">{chk.details}</p>
                      </div>
                      <div className="shrink-0">{getComplianceBadge(chk.status)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Final Synthesis & What Changed */}
          {comparison.final_synthesis && (
            <div className="p-3.5 rounded-xl bg-[#FFF9F0] border border-[#EADFD4] space-y-1">
              <div className="flex items-center gap-1.5 font-mono font-bold text-[10px] text-[#342E35] uppercase tracking-wider">
                <ArrowRight className="w-3 h-3 text-[#342E35]" aria-hidden="true" focusable="false" /> Final Synthesis & What Changed
              </div>
              <p className="text-[11px] text-[#342E35] leading-relaxed font-medium">
                {comparison.final_synthesis}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
