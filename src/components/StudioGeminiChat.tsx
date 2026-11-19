import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import type { DigitalProductProject } from '../types/project.ts';
import type { Language } from '../utils/i18n.ts';
import {
  type AiUsageMeta,
  type CopilotTurnMessage,
  GEMINI_TASK_MODELS,
  type GeminiModelId,
  sendCopilotChat,
  STUDIO_COPILOT_ROLE_OPTIONS,
  type StudioCopilotRoleId,
  summarizeProjectForAiContext,
} from '../services/aiService.ts';

interface StudioGeminiChatProps {
  open: boolean;
  onClose: () => void;
  project: DigitalProductProject;
  activeView: string;
  onRecordAiUsage?: (usage?: AiUsageMeta, model?: string) => void;
  lang?: Language;
}

const STORAGE_PREFIX = 'dpc_gemini_copilot_v1_';

function loadStoredThread(projectId: string): CopilotTurnMessage[] {
  if (typeof window === 'undefined' || !projectId) return [];
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string'
    );
  } catch {
    return [];
  }
}

function saveStoredThread(projectId: string, messages: CopilotTurnMessage[]): void {
  if (typeof window === 'undefined' || !projectId) return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${projectId}`, JSON.stringify(messages.slice(-40)));
  } catch {
    // Ignore storage quota issues cleanly
  }
}

export const StudioGeminiChat: React.FC<StudioGeminiChatProps> = ({
  open,
  onClose,
  project,
  activeView,
  onRecordAiUsage,
  lang = 'en',
}) => {
  const [messages, setMessages] = useState<CopilotTurnMessage[]>(() => loadStoredThread(project.projectId));
  const [roleId, setRoleId] = useState<StudioCopilotRoleId>('strategist');
  const [modelId, setModelId] = useState<GeminiModelId>(() => {
    const configured = project.aiSettings?.defaultModel as GeminiModelId | undefined;
    return GEMINI_TASK_MODELS.some((m) => m.id === configured) ? configured! : 'gemini-4-hydrogen';
  });
  const [useSearch, setUseSearch] = useState<boolean>(false);
  const [includeProjectContext, setIncludeProjectContext] = useState<boolean>(true);
  const [customInstruction, setCustomInstruction] = useState<string>('');
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setMessages(loadStoredThread(project.projectId));
    setError('');
  }, [project.projectId]);

  useEffect(() => {
    saveStoredThread(project.projectId, messages);
  }, [project.projectId, messages]);

  useEffect(() => {
    if (!open) return;
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [open, messages.length, sending]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const activeRole = useMemo(
    () => STUDIO_COPILOT_ROLE_OPTIONS.find((r) => r.id === roleId) || STUDIO_COPILOT_ROLE_OPTIONS[0],
    [roleId]
  );

  const effectiveModel: GeminiModelId = useSearch ? 'gemini-4-hydrogen' : modelId;

  const starterPrompts = useMemo(() => {
    const topicTitle =
      project.charter?.productTitle || project.name || (lang === 'en' ? 'this digital product' : '本數位產品專案');
    if (lang === 'zh') {
      return [
        {
          label: '市場趨勢搜尋',
          text: `請使用 Google 搜尋分析「${topicTitle}」目前的買家痛點、熱門副產品形式與合理定價區間，並附上參考來源。`,
          role: 'market_analyst' as StudioCopilotRoleId,
          search: true,
        },
        {
          label: '強化 UVZ 差異化主張',
          text: `根據目前專案進度（${activeView}），請幫我檢視並強化「${topicTitle}」的核心差異化切角（UVZ），避免落入一般化模板。`,
          role: 'strategist' as StudioCopilotRoleId,
          search: false,
        },
        {
          label: '設計高價值附屬工具',
          text: `針對「${topicTitle}」，建議 3 款最能提升購買轉換率與實作成果的配套工作簿、檢核表或計算工具。`,
          role: 'editor' as StudioCopilotRoleId,
          search: false,
        },
      ];
    }
    return [
      {
        label: 'Search live market gaps',
        text: `Use Google Search to examine current buyer pain points, competing formats, and price expectations for "${topicTitle}" and cite sources.`,
        role: 'market_analyst' as StudioCopilotRoleId,
        search: true,
      },
      {
        label: 'Sharpen UVZ & promise',
        text: `Review "${topicTitle}" at stage "${activeView}" and propose 3 sharper Unique Value Zone angles that avoid generic advice.`,
        role: 'strategist' as StudioCopilotRoleId,
        search: false,
      },
      {
        label: 'Upgrade bundle companions',
        text: `Recommend 3 practical worksheets, templates, or diagnostic checklists that would make "${topicTitle}" feel indispensable to buyers.`,
        role: 'editor' as StudioCopilotRoleId,
        search: false,
      },
    ];
  }, [project.charter?.productTitle, project.name, activeView, lang]);

  const handleRoleChange = (nextRoleId: StudioCopilotRoleId) => {
    setRoleId(nextRoleId);
    const preset = STUDIO_COPILOT_ROLE_OPTIONS.find((r) => r.id === nextRoleId);
    if (preset) {
      setUseSearch(preset.defaultUseSearch);
      setModelId(preset.recommendedModel);
    }
  };

  const handleSend = async (overrideText?: string, overrideRole?: StudioCopilotRoleId, overrideSearch?: boolean) => {
    const text = (overrideText ?? draft).trim();
    if (!text || sending) return;

    const targetRole = overrideRole ?? roleId;
    const targetSearch = overrideSearch ?? useSearch;
    const targetModel: GeminiModelId = targetSearch ? 'gemini-4-hydrogen' : modelId;

    if (overrideRole) setRoleId(overrideRole);
    if (typeof overrideSearch === 'boolean') setUseSearch(overrideSearch);

    const userTurn: CopilotTurnMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
      roleId: targetRole,
    };

    const nextMessages = [...messages, userTurn];
    setMessages(nextMessages);
    if (!overrideText) setDraft('');
    setError('');
    setSending(true);

    try {
      const response = await sendCopilotChat({
        model: targetModel,
        roleId: targetRole,
        systemInstruction: customInstruction.trim() || undefined,
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        useSearch: targetSearch,
        projectContext: includeProjectContext ? summarizeProjectForAiContext(project) : null,
        projectId: project.projectId,
        lang,
      });

      const assistantTurn: CopilotTurnMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: response.content || (lang === 'en' ? 'No response text returned.' : '模型未回傳文字內容。'),
        createdAt: new Date().toISOString(),
        model: response.model,
        roleId: targetRole,
        grounding: response.grounding,
      };

      setMessages((prev) => [...prev, assistantTurn]);
      onRecordAiUsage?.(response.usage, response.model);
    } catch (err: any) {
      setError(err?.message || (lang === 'en' ? 'Failed to reach Gemini assistant.' : '無法連線至 Gemini 助理。'));
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // Ignore clipboard failure cleanly
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'en' ? 'Gemini Studio Copilot' : 'Gemini 工作室助理'}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <aside className="relative z-10 w-full max-w-xl h-dvh bg-white border-l border-slate-200 shadow-2xl flex flex-col">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">
                {lang === 'en' ? 'Gemini Studio Copilot' : 'Gemini 工作室多輪助理'}
              </h2>
              <p className="text-xs text-slate-600 truncate">
                {lang === 'en'
                  ? `Stage: ${activeView.replace(/_/g, ' ')} · Model: ${effectiveModel}`
                  : `目前階段：${activeView} · 模型：${effectiveModel}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowConfigPanel((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 ${
                showConfigPanel
                  ? 'bg-teal-50 text-teal-800 border-teal-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              title={lang === 'en' ? 'Role & instruction settings' : '角色與系統指令設定'}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Setup' : '設定'}</span>
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setError('');
                }}
                className="p-2 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                title={lang === 'en' ? 'Clear conversation history' : '清除對話紀錄'}
                aria-label={lang === 'en' ? 'Clear conversation history' : '清除對話紀錄'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
              aria-label={lang === 'en' ? 'Close Gemini Copilot' : '關閉 Gemini 助理'}
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Model, Role & Google Search Controls Bar */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white space-y-2.5 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="text-xs font-semibold text-slate-700 block">
              {lang === 'en' ? 'Assistant Role' : '專業角色指令'}
              <select
                value={roleId}
                onChange={(e) => handleRoleChange(e.target.value as StudioCopilotRoleId)}
                className="mt-1 w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              >
                {STUDIO_COPILOT_ROLE_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {lang === 'en' ? r.labelEn : r.labelZh}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-700 block">
              {lang === 'en' ? 'Gemini Task Model' : '任務模型選擇'}
              <select
                value={effectiveModel}
                disabled={useSearch}
                onChange={(e) => setModelId(e.target.value as GeminiModelId)}
                className="mt-1 w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 disabled:opacity-75"
              >
                {GEMINI_TASK_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.labelEn} — {lang === 'en' ? m.taskHintEn : m.taskHintZh}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={useSearch}
                onChange={(e) => setUseSearch(e.target.checked)}
                className="rounded border-slate-300"
              />
              <Globe className={`w-3.5 h-3.5 ${useSearch ? 'text-sky-600' : 'text-slate-400'}`} />
              <span>
                {lang === 'en'
                  ? 'Google Search Grounding (gemini-4-hydrogen)'
                  : '啟用 Google 搜尋即時引述 (gemini-4-hydrogen)'}
              </span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={includeProjectContext}
                onChange={(e) => setIncludeProjectContext(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>{lang === 'en' ? 'Attach project context' : '帶入專案脈絡'}</span>
            </label>
          </div>

          {showConfigPanel && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <p className="text-[11px] text-slate-600">
                {lang === 'en' ? activeRole.descriptionEn : activeRole.descriptionZh}
              </p>
              <label className="block text-xs font-semibold text-slate-700">
                {lang === 'en'
                  ? 'Custom System Instruction (optional override)'
                  : '自訂系統指令（選填，將覆寫預設角色設定）'}
                <textarea
                  rows={2}
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder={
                    lang === 'en'
                      ? 'Leave blank to use the selected role system instruction...'
                      : '留白則沿用上方專業角色之系統指令...'
                  }
                  className="mt-1 w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50"
                />
              </label>
            </div>
          )}
        </div>

        {/* Scrollable Conversation Thread */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-[#f4f8f9]">
          {messages.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
                  <Bot className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-1 text-xs text-slate-700 leading-relaxed">
                  <h3 className="text-sm font-bold text-slate-900">
                    {lang === 'en'
                      ? 'Ask Gemini across any of the 14 Studio stages'
                      : '可在全部 14 個製作階段中進行多輪策略對話'}
                  </h3>
                  <p>
                    {lang === 'en'
                      ? 'Switch between deep reasoning (gemini-4-carbon), interactive structuring (gemini-4-argon), fast iteration (gemini-3.1-flash-lite), or live web citations via Google Search Grounding (gemini-4-hydrogen).'
                      : '可依任務切換深度推理（gemini-4-carbon）、複雜編排（gemini-4-argon）、快速草擬（gemini-3.1-flash-lite），或搭配 Google 搜尋取得即時網頁引述（gemini-4-hydrogen）。'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {lang === 'en' ? 'Suggested Prompts' : '快速提問範本'}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {starterPrompts.map((starter) => (
                    <button
                      key={starter.label}
                      type="button"
                      onClick={() => void handleSend(starter.text, starter.role, starter.search)}
                      className="text-left p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-teal-50/50 hover:border-teal-300 transition-colors space-y-0.5"
                    >
                      <div className="text-xs font-bold text-teal-900 flex items-center justify-between gap-2">
                        <span>{starter.label}</span>
                        {starter.search && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                            Google Search
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{starter.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <article
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-2.5 ${
                      isUser
                        ? 'bg-indigo-700 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-800 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[11px] opacity-80">
                      <span className="font-semibold">
                        {isUser ? (lang === 'en' ? 'You' : '您') : msg.model || 'gemini'}
                      </span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => void handleCopy(msg.id, msg.content)}
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 font-medium"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">{lang === 'en' ? 'Copied' : '已複製'}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{lang === 'en' ? 'Copy' : '複製'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="whitespace-pre-wrap break-words text-[13.5px]">{msg.content}</div>

                    {msg.grounding && (msg.grounding.sources.length > 0 || msg.grounding.webSearchQueries.length > 0) && (
                      <div className="pt-2.5 border-t border-slate-100 space-y-2 text-xs">
                        {msg.grounding.webSearchQueries.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-500">
                              {lang === 'en' ? 'Search queries:' : '搜尋關鍵字：'}
                            </span>
                            {msg.grounding.webSearchQueries.map((q) => (
                              <span
                                key={q}
                                className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {q}
                              </span>
                            ))}
                          </div>
                        )}

                        {msg.grounding.sources.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-[11px] font-bold text-sky-900 flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-sky-700" />
                              <span>
                                {lang === 'en'
                                  ? `Google Search Sources (${msg.grounding.sources.length})`
                                  : `Google 搜尋引述來源 (${msg.grounding.sources.length})`}
                              </span>
                            </div>
                            <ul className="space-y-1">
                              {msg.grounding.sources.map((src) => (
                                <li key={src.url}>
                                  <a
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sky-700 hover:text-sky-900 underline break-all"
                                  >
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                    <span>{src.title}</span>
                                    {src.domain && (
                                      <span className="font-mono text-[10px] text-slate-500">({src.domain})</span>
                                    )}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </article>
              );
            })
          )}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-slate-600 px-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
              <span>
                {useSearch
                  ? lang === 'en'
                    ? 'Searching web & synthesizing with gemini-4-hydrogen...'
                    : '正在透過 Google Search Grounding 與 gemini-4-hydrogen 整合回應...'
                  : lang === 'en'
                  ? `Thinking with ${effectiveModel}...`
                  : `正在使用 ${effectiveModel} 思考回覆...`}
              </span>
            </div>
          )}

          {error && (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium">
              {error}
            </div>
          )}

          <div ref={threadEndRef} />
        </div>

        {/* Message Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="p-4 border-t border-slate-200 bg-white space-y-2 shrink-0"
        >
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={
                lang === 'en'
                  ? 'Ask about niche demand, UVZ differentiation, outlines, pricing... (Enter to send)'
                  : '詢問選題需求、UVZ 差異化、章節大綱或定價策略...（按 Enter 送出）'
              }
              className="flex-1 min-w-0 px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white resize-none"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm inline-flex items-center gap-1.5 shrink-0"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{lang === 'en' ? 'Send' : '送出'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            {lang === 'en'
              ? 'Server-side Gemini integration keeps your multi-turn context in this studio session. Gate A/B/C approvals still require human verification.'
              : '由伺服器端安全呼叫 Gemini API。Gate A/B/C 與文獻查證仍維持人工覆核把關。'}
          </p>
        </form>
      </aside>
    </div>
  );
};
