import React, { useState, useRef, useEffect } from 'react';
import {
  ChatMessage,
  InventoryItem,
  EvaluationResponse,
  DecisionActionResponse,
} from '../types/inventory';
import { apiService } from '../services/api';
import { DoubleCheckComparisonCard } from './DoubleCheckComparisonCard';
import {
  Send,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  Calculator,
  ArrowRight,
  FileSearch,
  ChevronDown,
  ChevronUp,
  Shield,
  Clock,
  TrendingDown,
  PackageCheck,
  Copy,
  Terminal,
} from 'lucide-react';

interface ChatInterfaceProps {
  selectedItem: InventoryItem | null;
  onSelectItem: (item: InventoryItem) => void;
  onActionComplete: (res: DecisionActionResponse) => void;
  activeConversationId: string | null;
  onConversationCreatedOrUpdated: (convId: string) => void;
}

// Sleek Markdown & Code Block Formatter
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const handleCopyCode = (codeText: string, blockId: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedBlock(blockId);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  // Split content by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-[#342E35]">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const lang = lines[0].trim() || 'code';
          const codeContent = lines.length > 1 && !lines[0].includes(' ') ? lines.slice(1).join('\n') : lines.join('\n');
          const blockId = `code_${index}`;

          return (
            <div key={index} className="my-3 rounded-xl overflow-hidden border border-[#EADFD4] bg-[#2E2830] text-[#F9F6F0] text-xs font-mono shadow-soft-sm">
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#241F26] border-b border-[#3E3840] text-[11px] text-[#C2B8C4]">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#F5D6B8]" aria-hidden="true" focusable="false" />
                  <span className="uppercase font-bold tracking-wider">{lang}</span>
                </div>
                <button
                  onClick={() => handleCopyCode(codeContent, blockId)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[#3E3840] text-[#EADFD4] transition cursor-pointer"
                  title="Copy code to clipboard"
                >
                  {copiedBlock === blockId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#D1F2D9]" aria-hidden="true" focusable="false" />
                      <span className="text-[10px] text-[#D1F2D9]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
                      <span className="text-[10px]">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto text-[12px] leading-relaxed">
                <code>{codeContent}</code>
              </pre>
            </div>
          );
        }

        // Check if block contains markdown tables
        const tableLines = part.split('\n');
        const isTable = tableLines.some((l) => l.trim().startsWith('|') && l.trim().endsWith('|'));

        if (isTable) {
          const rows = tableLines.filter((l) => l.trim().startsWith('|') && l.trim().endsWith('|'));
          const nonTableBefore = [];
          const nonTableAfter = [];
          let tableStarted = false;

          for (const line of tableLines) {
            if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
              tableStarted = true;
            } else if (!tableStarted) {
              nonTableBefore.push(line);
            } else {
              nonTableAfter.push(line);
            }
          }

          const parsedRows = rows
            .filter((r) => !r.includes(':---') && !r.includes('---:'))
            .map((r) =>
              r
                .split('|')
                .slice(1, -1)
                .map((cell) => cell.trim())
            );

          return (
            <div key={index} className="space-y-2">
              {nonTableBefore.length > 0 && <FormattedText text={nonTableBefore.join('\n')} />}
              {parsedRows.length > 0 && (
                <div className="overflow-x-auto my-3 rounded-xl border border-[#EADFD4] shadow-soft-sm bg-[#FFFFFF]">
                  <table className="min-w-full text-xs text-left font-sans">
                    <thead className="bg-[#FFF9F0] border-b border-[#EADFD4] text-[#342E35] font-bold">
                      <tr>
                        {parsedRows[0].map((header, hIdx) => (
                          <th key={hIdx} className="px-3.5 py-2.5">
                            <FormattedInline text={header} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EADFD4]">
                      {parsedRows.slice(1).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#FFF9F0]/60 transition">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3.5 py-2 text-[#342E35]">
                              <FormattedInline text={cell} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {nonTableAfter.length > 0 && <FormattedText text={nonTableAfter.join('\n')} />}
            </div>
          );
        }

        return <FormattedText key={index} text={part} />;
      })}
    </div>
  );
};

// Formats Markdown headings, bullet points, numbered lists, blockquotes
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1.5" />;

        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-sm sm:text-base font-heading font-extrabold text-[#342E35] pt-2 pb-1 border-b border-[#EADFD4]/70">
              <FormattedInline text={trimmed.slice(4)} />
            </h3>
          );
        }
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={idx} className="text-xs sm:text-sm font-heading font-bold text-[#342E35] pt-1.5 pb-0.5">
              <FormattedInline text={trimmed.slice(5)} />
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-base sm:text-lg font-heading font-black text-[#342E35] pt-2.5 pb-1 border-b border-[#EADFD4]">
              <FormattedInline text={trimmed.slice(3)} />
            </h2>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-lg sm:text-xl font-heading font-black text-[#342E35] pt-3 pb-1.5">
              <FormattedInline text={trimmed.slice(2)} />
            </h1>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-[#F5D6B8] font-bold text-sm leading-none mt-1">•</span>
              <span className="flex-1">
                <FormattedInline text={trimmed.slice(2)} />
              </span>
            </div>
          );
        }
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-[#827783] font-mono font-bold text-xs shrink-0 mt-0.5">{numMatch[1]}.</span>
              <span className="flex-1">
                <FormattedInline text={numMatch[2]} />
              </span>
            </div>
          );
        }

        return (
          <p key={idx} className="leading-relaxed">
            <FormattedInline text={line} />
          </p>
        );
      })}
    </div>
  );
};

// Formats inline markdown elements (bold, code, links)
const FormattedInline: React.FC<{ text: string }> = ({ text }) => {
  // Regex to match **bold** and `code`
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return (
            <strong key={i} className="font-extrabold text-[#342E35]">
              {p.slice(2, -2)}
            </strong>
          );
        }
        if (p.startsWith('`') && p.endsWith('`')) {
          return (
            <code key={i} className="px-1.5 py-0.5 rounded bg-[#FFF9F0] text-[#7A4B1A] border border-[#EADFD4] font-mono text-[11px]">
              {p.slice(1, -1)}
            </code>
          );
        }
        return p;
      })}
    </>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onActionComplete,
  activeConversationId,
  onConversationCreatedOrUpdated,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentConvId, setCurrentConvId] = useState<string | null>(activeConversationId);
  const [expandedFormulas, setExpandedFormulas] = useState<{ [msgId: string]: boolean }>({});
  const [expandedAudits, setExpandedAudits] = useState<{ [msgId: string]: boolean }>({});
  const [actionSuccess, setActionSuccess] = useState<{ [msgId: string]: string }>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load transcript when active conversation changes
  useEffect(() => {
    setCurrentConvId(activeConversationId);
    if (activeConversationId) {
      loadTranscript(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const loadTranscript = async (convId: string) => {
    try {
      const detail = await apiService.getConversationTranscript(convId);
      setMessages(detail.messages || []);
    } catch (err) {
      console.error('Failed to load conversation transcript:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const starterPrompts = [
    {
      title: "Review today's reorder decisions",
      prompt: 'Should I reorder organic matcha today?',
      category: 'Reorder Analysis',
      icon: PackageCheck,
      cardBg: 'bg-[#F5D6B8] hover:bg-[#F0C7A1]',
    },
    {
      title: 'Find products at risk of stockout',
      prompt: 'Which products have the highest stockout risk right now?',
      category: 'Stockout Risk',
      icon: TrendingDown,
      cardBg: 'bg-[#F1C5D0] hover:bg-[#EAB5C2]',
    },
    {
      title: 'Simulate a supplier delay',
      prompt: 'What happens if supplier lead time increases by 5 days for GaN charger?',
      category: 'What-If Simulation',
      icon: Clock,
      cardBg: 'bg-[#C9DCF5] hover:bg-[#B4CEF0]',
    },
    {
      title: 'Compare cross-product risk',
      prompt: 'Compare the matcha decision with the USB-C charger.',
      category: 'Comparative Audit',
      icon: Shield,
      cardBg: 'bg-[#DCC8F4] hover:bg-[#CDB2F0]',
    },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setErrorMessage(null);
    const userMsgId = `user_${Date.now()}`;
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await apiService.sendChatMessage(
        text,
        historyPayload,
        currentConvId || undefined
      );

      const assistantMsg: ChatMessage = {
        id: response.message_id || `asst_${Date.now()}`,
        role: 'assistant',
        content: response.response,
        evaluation: response.evaluation,
        referenced_item: response.referenced_item,
        is_live_llm: response.is_live_llm,
        engine_type: response.engine_type,
        suggested_followups: response.suggested_followups,
        timestamp: response.timestamp || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If a new conversation was created on the backend
      if (response.conversation_id && response.conversation_id !== currentConvId) {
        setCurrentConvId(response.conversation_id);
        onConversationCreatedOrUpdated(response.conversation_id);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errDetail = err?.message || 'Unable to communicate with DecisionGuard backend.';
      setErrorMessage(errDetail);

      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Request Error:** ${errDetail}\n\nPlease verify that the backend is running at \`http://localhost:8000\` and that any configured API key is valid.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = (msgId: string, contentText: string) => {
    navigator.clipboard.writeText(contentText);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleApproveOrder = async (msgId: string, evalData: EvaluationResponse) => {
    const finalQty =
      evalData.final_recommendation?.reorder_quantity ??
      evalData.final_decision?.final_reorder_quantity ??
      0;
    try {
      const res = await apiService.recordDecisionAction(
        evalData.sku,
        'APPROVE',
        finalQty,
        `Approved via AI Assistant (Self-challenged verdict: ${evalData.decision_outcome})`
      );
      setActionSuccess((prev) => ({
        ...prev,
        [msgId]: `Order of ${finalQty} units approved & transmitted to ERP.`,
      }));
      onActionComplete(res);
    } catch {
      setActionSuccess((prev) => ({
        ...prev,
        [msgId]: 'Failed to record action with ERP.',
      }));
    }
  };

  const toggleFormula = (msgId: string) => {
    setExpandedFormulas((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const toggleAudit = (msgId: string) => {
    setExpandedAudits((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="flex-1 flex flex-col h-full max-w-4xl w-full mx-auto relative px-2 sm:px-4">
      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto pt-6 pb-36 space-y-6">
        {/* Welcome Empty State */}
        {messages.length === 0 && (
          <div className="py-8 sm:py-14 text-center space-y-8 animate-fadeIn max-w-2xl mx-auto">
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#F5D6B8] flex items-center justify-center text-[#342E35] mx-auto border border-[#EADFD4] shadow-soft-sm">
                <Shield className="w-8 h-8 text-[#342E35] stroke-[2.2]" aria-hidden="true" focusable="false" />
              </div>
              <h2 className="text-2xl sm:text-4xl font-heading font-black text-[#342E35] tracking-tight">
                Let's make better decisions.
              </h2>
              <p className="text-sm text-[#827783] max-w-lg mx-auto leading-relaxed">
                Challenge assumptions. Explore alternatives. Decide with confidence.
              </p>
            </div>

            {/* Starter Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
              {starterPrompts.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className={`p-4 rounded-2xl ${item.cardBg} border border-[#EADFD4] transition-all group cursor-pointer text-left space-y-2 shadow-soft-sm`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-white/60 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-[#342E35]" aria-hidden="true" focusable="false" />
                        </div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#342E35]">
                          {item.category}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#342E35] group-hover:translate-x-1 transition" aria-hidden="true" focusable="false" />
                    </div>
                    <p className="text-xs font-bold text-[#342E35] leading-snug">
                      {item.title}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const evalData = msg.evaluation;
          const formulaOpen = expandedFormulas[msg.id];
          const auditOpen = expandedAudits[msg.id];
          const actionMsg = actionSuccess[msg.id];
          const isCopied = copiedMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex gap-3.5 sm:gap-4 animate-fadeIn ${
                isUser ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Assistant Avatar */}
              {!isUser && (
                <div className="w-8 h-8 rounded-2xl bg-[#DCC8F4] flex items-center justify-center text-[#342E35] shrink-0 mt-0.5 border border-[#EADFD4] shadow-soft-sm">
                  <Bot className="w-4 h-4 text-[#342E35]" aria-hidden="true" focusable="false" />
                </div>
              )}

              {/* Message Content Container */}
              <div
                className={`max-w-[90%] sm:max-w-[82%] rounded-2xl p-4 sm:p-5 space-y-3.5 text-sm ${
                  isUser
                    ? 'bg-[#E8DDF8] text-[#342E35] border border-[#DCC8F4] shadow-soft-sm ml-auto'
                    : 'bg-[#FFFFFF] text-[#342E35] border border-[#EADFD4] shadow-soft-md'
                }`}
              >
                {/* Engine Source Header Badge (Assistant only) */}
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#EADFD4] text-xs font-mono">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-bold text-[#342E35] text-xs">
                        DecisionGuard AI
                      </span>
                      {msg.is_live_llm ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCC8F4] text-[#342E35] border border-[#EADFD4]">
                          <Sparkles className="w-2.5 h-2.5" aria-hidden="true" focusable="false" />
                          <span>{msg.engine_type || 'Live Model'}</span>
                        </span>
                      ) : msg.engine_type && msg.engine_type !== 'Decision Assistant' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF9F0] text-[#7A4B1A] border border-[#EADFD4]">
                          <Shield className="w-2.5 h-2.5" aria-hidden="true" focusable="false" />
                          <span>{msg.engine_type}</span>
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyResponse(msg.id, msg.content)}
                        className="text-[#827783] hover:text-[#342E35] p-1 rounded hover:bg-[#FFF9F0] transition cursor-pointer"
                        title="Copy message text"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-[#2A7545]" aria-hidden="true" focusable="false" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
                        )}
                      </button>
                      {msg.timestamp && (
                        <span className="text-[10px] text-[#827783] font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Body Text / Markdown Formatted */}
                <div className="markdown-content">
                  <MarkdownRenderer content={msg.content} />
                </div>

                {/* Suggested Followup Action Chips */}
                {!isUser && msg.suggested_followups && msg.suggested_followups.length > 0 && (
                  <div className="pt-2 border-t border-[#EADFD4]/70 space-y-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase text-[#827783] block">
                      Suggested Follow-ups
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggested_followups.map((followup, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => handleSendMessage(followup)}
                          className="text-[11px] px-2.5 py-1 rounded-xl bg-[#FFF9F0] hover:bg-[#F5D6B8]/70 text-[#342E35] border border-[#EADFD4] transition cursor-pointer text-left font-medium"
                        >
                          {followup}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Double-Check and Answer Comparison Card (When available) */}
                {(msg.comparison || evalData?.comparison) && (
                  <DoubleCheckComparisonCard
                    comparison={(msg.comparison || evalData?.comparison)!}
                  />
                )}

                {/* Structured Self-Challenge Visual Card (When available) */}
                {evalData && (
                  <div className="mt-4 pt-3 border-t border-[#EADFD4] space-y-3">
                    {/* Decision Verdict Ribbon */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FFF9F0] border border-[#EADFD4]">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono text-[#827783]">Verdict:</span>
                        <span
                          className={`px-2.5 py-1 rounded-xl font-mono font-bold text-xs flex items-center gap-1.5 ${
                            evalData.decision_outcome === 'AGREES'
                              ? 'bg-[#D1F2D9] text-[#2A7545] border border-[#BDE5C8]'
                              : evalData.decision_outcome === 'CHANGED'
                              ? 'bg-[#F5D6B8] text-[#7A4B1A] border border-[#EADFD4]'
                              : 'bg-[#F1C5D0] text-[#8C2E43] border border-[#EADFD4]'
                          }`}
                        >
                          {evalData.decision_outcome === 'AGREES' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
                          )}
                          {evalData.decision_outcome}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 font-mono text-xs">
                        <div className="text-right">
                          <span className="text-[10px] text-[#827783] block">Initial</span>
                          <span className="text-[#827783] line-through">
                            {evalData.single_pass?.reorder_quantity ?? evalData.single_pass_recommendation?.reorder_quantity}u
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#827783]" aria-hidden="true" focusable="false" />
                        <div className="text-right">
                          <span className="text-[10px] text-[#827783] block">Final Approved</span>
                          <span className="text-[#342E35] font-extrabold text-sm">
                            {evalData.final_recommendation?.reorder_quantity ?? evalData.final_decision?.final_reorder_quantity} units
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Formula Calculation Inspector Accordion */}
                    {(evalData.transparent_metrics || evalData.calculations) && (
                      <div className="rounded-2xl border border-[#EADFD4] bg-[#FFF9F0] overflow-hidden">
                        <button
                          onClick={() => toggleFormula(msg.id)}
                          className="w-full flex items-center justify-between p-2.5 text-xs text-[#342E35] hover:bg-[#F3ECE4] transition text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Calculator className="w-3.5 h-3.5 text-[#342E35]" aria-hidden="true" focusable="false" />
                            <span className="font-mono font-bold text-[11px]">
                              Mathematical Calculations & Defense Logic
                            </span>
                          </div>
                          {formulaOpen ? (
                            <ChevronUp className="w-3.5 h-3.5 text-[#827783]" aria-hidden="true" focusable="false" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-[#827783]" aria-hidden="true" focusable="false" />
                          )}
                        </button>
                        {formulaOpen && (
                          <div className="p-3 border-t border-[#EADFD4] space-y-2 text-xs font-mono bg-[#FFFFFF]">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                              <div className="p-2 rounded-xl bg-[#F0F6FD] border border-[#EADFD4]">
                                <span className="text-[#827783] block text-[9px]">Stockout Runway</span>
                                <span className="text-[#342E35] font-bold">
                                  {(evalData.transparent_metrics || evalData.calculations)!.stockout_runway_days.toFixed(1)} days
                                </span>
                              </div>
                              <div className="p-2 rounded-xl bg-[#FDF4EC] border border-[#EADFD4]">
                                <span className="text-[#827783] block text-[9px]">Lead Time Demand</span>
                                <span className="text-[#342E35] font-bold">
                                  {(evalData.transparent_metrics || evalData.calculations)!.lead_time_demand.toFixed(1)} units
                                </span>
                              </div>
                              <div className="p-2 rounded-xl bg-[#F5F0FC] border border-[#EADFD4]">
                                <span className="text-[#827783] block text-[9px]">Capital Exposure</span>
                                <span className="text-[#342E35] font-bold">
                                  ${(evalData.transparent_metrics || evalData.calculations)!.working_capital_exposure_usd.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <p className="text-[11px] text-[#827783] pt-1 leading-relaxed">
                              {(evalData.transparent_metrics || evalData.calculations)!.formula_breakdown}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Missing Information Data Gaps Accordion */}
                    {evalData.self_challenge.missing_facts_identified.length > 0 && (
                      <div className="rounded-2xl border border-[#EADFD4] bg-[#FFF9F0] overflow-hidden">
                        <button
                          onClick={() => toggleAudit(msg.id)}
                          className="w-full flex items-center justify-between p-2.5 text-xs text-[#342E35] hover:bg-[#F3ECE4] transition text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <FileSearch className="w-3.5 h-3.5 text-[#7A4B1A]" aria-hidden="true" focusable="false" />
                            <span className="font-mono font-bold text-[11px]">
                              Identified Data Gaps ({evalData.self_challenge.missing_facts_identified.length})
                            </span>
                          </div>
                          {auditOpen ? (
                            <ChevronUp className="w-3.5 h-3.5 text-[#827783]" aria-hidden="true" focusable="false" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-[#827783]" aria-hidden="true" focusable="false" />
                          )}
                        </button>
                        {auditOpen && (
                          <div className="p-3 border-t border-[#EADFD4] space-y-1.5 text-xs bg-[#FFFFFF]">
                            {evalData.self_challenge.missing_facts_identified.map((fact, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-[#342E35] text-[11px]">
                                <span className="text-[#7A4B1A] mt-0.5">•</span>
                                <span>{fact}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ERP Execution Action Button */}
                    <div className="flex items-center justify-between pt-1">
                      {actionMsg ? (
                        <div className="w-full p-2.5 rounded-xl bg-[#D1F2D9] border border-[#BDE5C8] text-[#2A7545] text-xs font-mono font-bold flex items-center gap-2">
                          <Check className="w-4 h-4 text-[#2A7545]" aria-hidden="true" focusable="false" />
                          <span>{actionMsg}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleApproveOrder(msg.id, evalData)}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#F5D6B8] hover:bg-[#F0C7A1] text-[#342E35] text-xs font-bold border border-[#EADFD4] shadow-soft-sm transition cursor-pointer"
                        >
                          <Check className="w-4 h-4 text-[#342E35]" aria-hidden="true" focusable="false" />
                          <span>
                            Approve {evalData.final_recommendation?.reorder_quantity ?? evalData.final_decision?.final_reorder_quantity} Units & Transmit to ERP
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {isUser && (
                <div className="w-8 h-8 rounded-2xl bg-[#DCC8F4] flex items-center justify-center text-[#342E35] shrink-0 mt-0.5 border border-[#EADFD4] shadow-soft-sm">
                  <User className="w-4 h-4" aria-hidden="true" focusable="false" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex gap-3.5 sm:gap-4 items-start animate-fadeIn">
            <div className="w-8 h-8 rounded-2xl bg-[#F5D6B8] flex items-center justify-center text-[#342E35] shrink-0 border border-[#EADFD4] shadow-soft-sm">
              <Bot className="w-4 h-4 text-[#342E35] animate-spin" />
            </div>
            <div className="bg-[#FFFFFF] border border-[#EADFD4] rounded-2xl p-4 text-xs font-mono text-[#827783] shadow-soft-sm flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#F5D6B8] animate-pulse" />
              <span>Challenging assumptions and calculating reorder recommendations...</span>
            </div>
          </div>
        )}

        {/* Actionable Error Banner if request failed */}
        {errorMessage && !isLoading && (
          <div className="p-3 rounded-2xl bg-[#FDE8EC] border border-[#F1C5D0] text-[#8C2E43] text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#8C2E43]" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => handleSendMessage()}
              className="px-2.5 py-1 rounded-xl bg-white border border-[#F1C5D0] font-bold text-[11px] hover:bg-[#FFF9F0] transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Composer */}
      <div className="absolute bottom-4 left-2 right-2 sm:left-4 sm:right-4 z-20">
        <div className="glass-surface rounded-2xl p-2 sm:p-2.5 shadow-composer transition-all focus-within:border-[#DCC8F4] focus-within:ring-2 focus-within:ring-[#DCC8F4]/20">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything (e.g. 'Should I reorder matcha today?', 'Explain machine learning', '17% of 850')..."
              className="flex-1 bg-transparent text-sm text-[#342E35] placeholder:text-[#827783] px-3 py-2 focus:outline-none resize-none max-h-36 min-h-[38px] leading-relaxed"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className={`p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                inputMessage.trim() && !isLoading
                  ? 'bg-[#F5D6B8] hover:bg-[#F0C7A1] text-[#342E35] border border-[#EADFD4] shadow-soft-sm'
                  : 'bg-[#F3ECE4] text-[#827783] cursor-not-allowed'
              }`}
              title="Send Message"
            >
              {isLoading ? (
                <RotateCcw className="w-4 h-4 animate-spin text-[#827783]" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="px-3 pt-1.5 flex items-center justify-between text-[10px] text-[#827783] font-mono">
            <span>Enter to send, Shift+Enter for new line</span>
            <span className="text-[#342E35] font-semibold">Conversational DecisionGuard AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};
