import { CitationReviewPanel } from '../CitationReviewPanel.tsx';
import { resourceEvidenceDocument } from '../../utils/citationEvidence.ts';
import React, { useState } from 'react';
import { Layers, Copy, Sparkles } from 'lucide-react';
import { DigitalProductProject, ResourceAsset } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { generateTextWithAi } from '../../services/aiService.ts';
import { buildWorkbookSuitePrompt, parseWorkbookSuiteResponse } from '../../utils/stageSynthesis.ts';

interface WorkbookStudioViewProps {
  onSaveResource: (resource: ResourceAsset) => void;
  onSaveResources?: (resources: ResourceAsset[]) => void;
  onRecordAiUsage?: (usage?: { total_tokens?: number }, model?: string) => void;
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  lang?: Language;
}

export const WorkbookStudioView: React.FC<WorkbookStudioViewProps> = ({
  onSaveResource,
  onSaveResources,
  onRecordAiUsage,
  project,
  setActiveView,
  lang = 'en',
}) => {
  const t = translations[lang];
  const [draft, setDraft] = useState({ id: '', title: '', purpose: '', instructions: '', contentMarkdown: '', completionCriteria: '', associatedChapterId: '' });
  const [saveMessage, setSaveMessage] = useState('');
  const { resources } = project;
  const items = resources || [];
  const [selectedResourceId, setSelectedResourceId] = useState<string>(items[0]?.id || 'RES-01');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiFocusNote, setAiFocusNote] = useState('');
  const [aiChapterId, setAiChapterId] = useState('');

  const currentResource = items.find((r) => r.id === selectedResourceId) || items[0];

  const handleCopyMarkdown = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateToolkit = async (mode: 'suite' | 'single') => {
    setAiBusy(true);
    setAiError('');
    setSaveMessage('');
    try {
      const { systemPrompt, userPrompt } = buildWorkbookSuitePrompt(project, lang, {
        mode,
        chapterId: mode === 'single' ? aiChapterId || undefined : undefined,
        focusNote: aiFocusNote,
      });
      const res = await generateTextWithAi({
        provider: 'gemini',
        model: project.aiSettings?.defaultModel || 'gemini-4-hydrogen',
        systemPrompt,
        userPrompt,
        maxTokens: mode === 'suite' ? 3200 : 1800,
        projectId: project.projectId,
      });
      onRecordAiUsage?.(res?.usage, res?.model);
      const generated = parseWorkbookSuiteResponse(
        res?.content || '',
        mode === 'single' ? aiChapterId || undefined : undefined
      );
      if (generated.length === 0) {
        throw new Error('Generated companion resources were below the minimum 150-character detail threshold.');
      }
      if (onSaveResources) {
        onSaveResources(generated);
      } else {
        generated.forEach((asset) => onSaveResource(asset));
      }
      setSelectedResourceId(generated[0].id);
      setSaveMessage(
        lang === 'en'
          ? `Added ${generated.length} commercial companion asset(s) to your bundle. Review citations below before Gate C.`
          : `已自動生成並加入 ${generated.length} 項商業級伴隨實作資源。請於下方審查引用後進入 Gate C。`
      );
    } catch (err: any) {
      setAiError(
        err?.message ||
          (lang === 'en'
            ? 'Could not reach server Gemini engine to build companion resources.'
            : '無法連接伺服器端 Gemini 引擎以生成伴隨實作資源。')
      );
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="w-full space-y-5 pb-3">
      {/* Top Banner */}
      <div className="lab-panel p-6 lg:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-teal-700 mb-1.5">
            <Layers className="w-4 h-4" />
            <span>{t.navWorkbookStudio}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t.workbookTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">
            {lang === 'en'
              ? `${items.length} companion resources included to maximize customer implementation and perceived bundle value.`
              : `共收錄 ${items.length} 套高價值伴隨套件，隨書附贈以提升數位產品客單價與買家實際執行力`}
          </p>
        </div>

        <button
          onClick={() => setActiveView('quality_assurance')}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
        >
          <span>{lang === 'en' ? 'Proceed to Quality Assurance (Gate C) →' : '進入品質審查 (Gate C) →'}</span>
        </button>
      </div>

      {/* Synthesise.ai Companion Toolkit Generator */}
      <div className="lab-panel p-5 sm:p-6 bg-gradient-to-r from-teal-50/70 via-white to-sky-50/60 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider font-bold text-teal-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Synthesise.ai Bestseller Toolkit Builder' : 'Synthesise.ai 高價值實作工具套件引擎'}</span>
            </div>
            <p className="text-sm text-slate-700">
              {lang === 'en'
                ? 'Automatically synthesize a complete 3-piece companion pack (Action Workbook, 30-Day Execution Checklist, Quick-Reference Decision Matrix) or draft a chapter-specific worksheet.'
                : '一鍵生成完整「三件組」伴隨套件（實戰工作表、30 天執行檢核清單、快速決策參考表），大幅提升買家成果與套件定價價值感。'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={aiBusy}
              onClick={() => handleGenerateToolkit('suite')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
            >
              <Sparkles className={`w-4 h-4 ${aiBusy ? 'animate-spin' : ''}`} />
              <span>
                {aiBusy
                  ? lang === 'en' ? 'Synthesizing Suite...' : '正在生成套件...'
                  : lang === 'en' ? 'AI Generate 3-Piece Companion Suite' : 'AI 生成三件組伴隨套件'}
              </span>
            </button>

            <button
              type="button"
              disabled={aiBusy}
              onClick={() => handleGenerateToolkit('single')}
              className="px-4 py-2.5 text-sm font-semibold text-teal-900 bg-white hover:bg-slate-50 border border-teal-300 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-teal-700" />
              <span>{lang === 'en' ? 'Draft Single Worksheet' : '生成單張章節工作表'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={aiChapterId}
            onChange={(e) => setAiChapterId(e.target.value)}
            aria-label={lang === 'en' ? 'Target chapter for single worksheet' : '單張工作表對應章節'}
            className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800"
          >
            <option value="">{lang === 'en' ? 'Whole Book Scope (Recommended for Suite)' : '全書架構（三件組建議預設）'}</option>
            {project.outline.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.id}: {ch.title}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={aiFocusNote}
            onChange={(e) => setAiFocusNote(e.target.value)}
            placeholder={
              lang === 'en'
                ? 'Optional toolkit focus (e.g., Weekly budget calculator columns, troubleshooting SOP table...)'
                : '選填工作表重點需求（例如：加入每週追蹤欄位、常見錯誤排解表...）'
            }
            className="md:col-span-2 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800"
          />
        </div>
      </div>

      {aiError && (
        <p role="alert" className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm font-medium">
          {aiError}
        </p>
      )}

      {saveMessage && (
        <p role="status" className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium">
          {saveMessage}
        </p>
      )}

      <details className="p-6 lab-panel">
        <summary className="text-base font-bold cursor-pointer text-slate-900">
          {lang === 'en' ? 'Create or edit a practical learning resource manually' : '手動新增或編輯實作學習資源'}
        </summary>
        <form
          className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            onSaveResource({
              ...draft,
              id: draft.id || `RESOURCE-${Date.now()}`,
              category: 'WORKSHEET',
              fieldsOrColumns: [],
              sampleEntries: [],
            });
            setSaveMessage('Learning resource saved; Gate C requires a new review.');
          }}
        >
          <label className="block font-semibold text-slate-800">
            Existing resource
            <select
              className="block w-full border border-slate-300 rounded-xl px-3.5 py-2.5 mt-1.5 bg-slate-50 font-normal"
              value={draft.id}
              onChange={(e) => {
                const resource = items.find((r) => r.id === e.target.value);
                setDraft(
                  resource
                    ? { ...resource, associatedChapterId: resource.associatedChapterId || '' }
                    : { id: '', title: '', purpose: '', instructions: '', contentMarkdown: '', completionCriteria: '', associatedChapterId: '' }
                );
              }}
            >
              <option value="">New resource</option>
              {items.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block font-semibold text-slate-800">
            Related chapter
            <select
              className="block w-full border border-slate-300 rounded-xl px-3.5 py-2.5 mt-1.5 bg-slate-50 font-normal"
              value={draft.associatedChapterId}
              onChange={(e) => setDraft({ ...draft, associatedChapterId: e.target.value })}
            >
              <option value="">Whole book</option>
              {project.outline.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.title}
                </option>
              ))}
            </select>
          </label>
          {(['title', 'purpose', 'instructions', 'completionCriteria'] as const).map((key) => (
            <label key={key} className="block font-semibold text-slate-800 capitalize">
              {key}
              <input
                required
                className="w-full block border border-slate-300 rounded-xl px-3.5 py-2.5 mt-1.5 bg-slate-50 font-normal"
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="block md:col-span-2 font-semibold text-slate-800">
            Resource content (Markdown)
            <textarea
              required
              minLength={150}
              rows={11}
              className="block border border-slate-300 rounded-xl p-4 w-full font-mono text-sm mt-1.5 bg-slate-50 font-normal"
              value={draft.contentMarkdown}
              onChange={(e) => setDraft({ ...draft, contentMarkdown: e.target.value })}
            />
          </label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-4">
            <button className="px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-semibold">
              Save learning resource
            </button>
            <p role="status" className="text-sm font-medium text-teal-800">
              {saveMessage}
            </p>
          </div>
        </form>
      </details>

      {/* Resource Selector & Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: List of Resources */}
        <div className="lg:col-span-4 space-y-2.5">
          {items.map((res) => {
            const isSelected = currentResource?.id === res.id;
            return (
              <div
                key={res.id}
                onClick={() => setSelectedResourceId(res.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs text-teal-800 font-bold bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-md">
                    {res.id}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
                    {res.category}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{res.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2 mt-1">{res.purpose}</p>
              </div>
            );
          })}
        </div>

        {/* Right Column: Detailed Template Preview */}
        {currentResource && (
          <div className="lg:col-span-8 lab-panel p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs text-teal-800 font-bold bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md">
                  {currentResource.id}
                </span>
                <span className="text-base font-bold text-slate-900">{currentResource.title}</span>
              </div>

              <button
                onClick={() => handleCopyMarkdown(currentResource.contentMarkdown, currentResource.id)}
                className="px-4 py-2 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedId === currentResource.id ? (lang === 'en' ? 'Copied!' : '已複製') : (lang === 'en' ? 'Copy Template' : '複製範本')}</span>
              </button>
            </div>

            <CitationReviewPanel
              document={resourceEvidenceDocument(currentResource)}
              cards={project.referenceLibrary.cards}
              onChange={(citationReviews) => onSaveResource({ ...currentResource, citationReviews })}
            />
            <div className="space-y-4 text-sm text-slate-700">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <strong>Purpose:</strong>
                <p className="text-slate-600">{currentResource.purpose}</p>
                <strong className="block pt-1">Instructions:</strong>
                <p className="text-slate-600">{currentResource.instructions}</p>
              </div>

              <div>
                <strong className="block mb-2 text-slate-900">Template Markdown:</strong>
                <pre className="p-5 bg-slate-900 text-slate-100 rounded-xl text-sm font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[520px]">
                  {currentResource.contentMarkdown}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
