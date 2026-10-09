import React, { useState } from 'react';
import {
  Shield,
  MessageSquare,
  LayoutDashboard,
  Boxes,
  ShieldAlert,
  BarChart3,
  Settings,
  Plus,
  Search,
  Trash2,
  Edit3,
  Check,
  X,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
} from 'lucide-react';
import { HealthResponse } from '../services/api';
import { ConversationSummary } from '../types/inventory';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  health: HealthResponse | null;
  healthLoading: boolean;
  onRefreshHealth: () => void;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  health,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group conversations by relative date
  const groupConversations = () => {
    const today: ConversationSummary[] = [];
    const yesterday: ConversationSummary[] = [];
    const previous7Days: ConversationSummary[] = [];
    const older: ConversationSummary[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOf7Days = startOfToday - 7 * 24 * 60 * 60 * 1000;

    filteredConversations.forEach((conv) => {
      const convTime = new Date(conv.updated_at).getTime();
      if (convTime >= startOfToday) {
        today.push(conv);
      } else if (convTime >= startOfYesterday) {
        yesterday.push(conv);
      } else if (convTime >= startOf7Days) {
        previous7Days.push(conv);
      } else {
        older.push(conv);
      }
    });

    return { today, yesterday, previous7Days, older };
  };

  const groups = groupConversations();

  const handleStartRename = (e: React.MouseEvent, conv: ConversationSummary) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleStartDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const handleConfirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteConversation(id);
    setDeletingId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  const navItems = [
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare, badge: 'Live' },
    { id: 'decision', label: 'Decision Console', icon: LayoutDashboard },
    { id: 'benchmark', label: 'Baseline Evaluation', icon: BarChart3, badge: 'N=100' },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'audit', label: 'Decision Audits', icon: ShieldAlert },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-72'
      } bg-[#FFFCF7] border-r border-[#EADFD4] flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 text-[#342E35] transition-all duration-200 select-none shadow-sm`}
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#EADFD4]">
          {!isCollapsed ? (
            <div
              onClick={() => {
                setActiveView('chat');
                onNewChat();
              }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-2xl bg-[#F5D6B8] flex items-center justify-center text-[#342E35] border border-[#EADFD4] shadow-soft-sm group-hover:scale-105 transition">
                <Shield className="w-5 h-5 text-[#342E35] stroke-[2.2]" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-extrabold text-sm text-[#342E35] tracking-tight">
                    DecisionGuard
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[#DCC8F4] text-[#342E35]">
                    AI
                  </span>
                </div>
                <p className="text-[11px] text-[#827783] font-medium">Reorder Assistant</p>
              </div>
            </div>
          ) : (
            <div
              onClick={() => {
                setActiveView('chat');
                onNewChat();
              }}
              className="w-9 h-9 mx-auto rounded-2xl bg-[#F5D6B8] flex items-center justify-center text-[#342E35] border border-[#EADFD4] shadow-soft-sm cursor-pointer"
            >
              <Shield className="w-5 h-5 text-[#342E35]" />
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl text-[#827783] hover:text-[#342E35] hover:bg-[#F5F0FC] transition ml-auto cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* New Chat Primary Action Button (Pastel Peach) */}
        <div className="p-3">
          <button
            onClick={() => {
              setActiveView('chat');
              onNewChat();
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#F5D6B8] hover:bg-[#F0C7A1] text-[#342E35] text-xs font-bold border border-[#EADFD4] shadow-soft-sm transition-all cursor-pointer active:scale-[0.98]"
            title="Start New Decision Conversation"
          >
            <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
            {!isCollapsed && <span>New Chat</span>}
          </button>
        </div>

        {/* Search Conversations Box */}
        {!isCollapsed && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#827783] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FFF9F0] border border-[#EADFD4] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#342E35] placeholder:text-[#827783] focus:outline-none focus:border-[#DCC8F4] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-[#827783] hover:text-[#342E35]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Persistent Chat History Section */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto px-3 space-y-4 py-2 border-t border-[#EADFD4] text-xs">
            {filteredConversations.length === 0 ? (
              <div className="py-8 text-center text-[#827783] text-[11px] px-2">
                {searchQuery ? 'No matching conversations' : 'No chat history yet. Ask a reorder question!'}
              </div>
            ) : (
              <>
                {groups.today.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#827783] px-2">
                      Today
                    </span>
                    {groups.today.map((conv) => renderConversationItem(conv))}
                  </div>
                )}

                {groups.yesterday.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#827783] px-2">
                      Yesterday
                    </span>
                    {groups.yesterday.map((conv) => renderConversationItem(conv))}
                  </div>
                )}

                {groups.previous7Days.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#827783] px-2">
                      Previous 7 Days
                    </span>
                    {groups.previous7Days.map((conv) => renderConversationItem(conv))}
                  </div>
                )}

                {groups.older.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#827783] px-2">
                      Older
                    </span>
                    {groups.older.map((conv) => renderConversationItem(conv))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Workspace Navigation Links */}
        <div className="p-3 border-t border-[#EADFD4] space-y-1 bg-[#FFF9F0]">
          {!isCollapsed && (
            <div className="px-2 pb-1 text-[9px] font-mono font-bold uppercase tracking-wider text-[#827783]">
              Workspaces
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#DCC8F4] text-[#342E35] font-bold border border-[#EADFD4] shadow-soft-sm'
                    : 'text-[#827783] hover:text-[#342E35] hover:bg-[#F5F0FC]'
                }`}
                title={item.label}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#342E35]' : 'text-[#827783]'} shrink-0`} />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                {!isCollapsed && item.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#F5D6B8] text-[#342E35] font-bold border border-[#EADFD4]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom System Health Footer */}
        <div className="p-3 border-t border-[#EADFD4] bg-[#FFFCF7]">
          {!isCollapsed ? (
            <div className="p-2.5 rounded-xl bg-[#FFF9F0] border border-[#EADFD4] text-xs space-y-1.5 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#827783]">Backend API:</span>
                {health?.status === 'ok' ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#2A7545] bg-[#D1F2D9] px-2 py-0.5 rounded-full border border-[#BDE5C8]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2A7545]" />
                    Online
                  </span>
                ) : (
                  <span className="text-[10px] text-[#A6384C] bg-[#F1C5D0] px-2 py-0.5 rounded-full">Connecting...</span>
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#827783] pt-1.5 border-t border-[#EADFD4]">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#342E35]" />
                  Reasoning:
                </span>
                <span className="text-[#342E35] font-bold">Self-Challenge</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2A7545]" title="System Online" />
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  function renderConversationItem(conv: ConversationSummary) {
    const isSelected = activeConversationId === conv.id && activeView === 'chat';
    const isEditing = editingId === conv.id;
    const isDeleting = deletingId === conv.id;

    if (isDeleting) {
      return (
        <div
          key={conv.id}
          className="p-2 rounded-xl bg-[#F1C5D0]/30 border border-[#F1C5D0] text-xs space-y-1.5 animate-fadeIn"
        >
          <span className="text-[11px] text-[#342E35] block font-bold">
            Delete conversation?
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => handleConfirmDelete(e, conv.id)}
              className="px-2 py-0.5 rounded-lg bg-[#EAB5C2] hover:bg-[#E59FAF] text-[#342E35] text-[10px] font-bold transition cursor-pointer"
            >
              Delete
            </button>
            <button
              onClick={handleCancelDelete}
              className="px-2 py-0.5 rounded-lg bg-[#FFF9F0] border border-[#EADFD4] hover:bg-[#F3ECE4] text-[#827783] text-[10px] transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (isEditing) {
      return (
        <div
          key={conv.id}
          className="p-1.5 rounded-xl bg-[#FFF9F0] border border-[#DCC8F4] flex items-center gap-1 animate-fadeIn"
        >
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 bg-transparent text-xs text-[#342E35] px-1.5 py-0.5 focus:outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveRename(e as any, conv.id);
              if (e.key === 'Escape') setEditingId(null);
            }}
          />
          <button
            onClick={(e) => handleSaveRename(e, conv.id)}
            className="p-1 text-[#2A7545] hover:opacity-80"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCancelRename}
            className="p-1 text-[#827783] hover:text-[#342E35]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    return (
      <div
        key={conv.id}
        onClick={() => {
          setActiveView('chat');
          onSelectConversation(conv.id);
        }}
        className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-all ${
          isSelected
            ? 'bg-[#DCC8F4] text-[#342E35] font-bold border border-[#EADFD4] shadow-soft-sm'
            : 'text-[#827783] hover:text-[#342E35] hover:bg-[#F5F0FC]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MessageSquare className={`w-3.5 h-3.5 ${isSelected ? 'text-[#342E35]' : 'text-[#827783]'} shrink-0`} />
          <span className="truncate text-[12px]">{conv.title}</span>
        </div>

        {/* Action icons on hover */}
        <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-1">
          <button
            onClick={(e) => handleStartRename(e, conv)}
            className="p-1 text-[#827783] hover:text-[#342E35] rounded-lg hover:bg-[#FFF9F0] transition"
            title="Rename"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => handleStartDelete(e, conv.id)}
            className="p-1 text-[#827783] hover:text-[#A6384C] rounded-lg hover:bg-[#FFF9F0] transition"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }
};
