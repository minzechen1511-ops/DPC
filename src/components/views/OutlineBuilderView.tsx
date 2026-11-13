import React, { useState } from 'react';
import { ListTree, CheckCircle2, Plus, Trash2, Sparkles } from 'lucide-react';
import { DigitalProductProject, ChapterOutlineItem } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { generateTextWithAi } from '../../services/aiService.ts';

interface OutlineBuilderViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onUpdateOutline: (outline: ChapterOutlineItem[]) => void;
  onRecordAiUsage?: (usage?: { total_tokens?: number }, model?: string) => void;
  lang?: Language;
}

export const OutlineBuilderView: React.FC<OutlineBuilderViewProps> = ({
  project,
  setActiveView,
  onUpdateOutline,
  onRecordAiUsage,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { outline } = project;
  const chapters = outline || [];
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');

  const totalWords = chapters.reduce((sum, ch) => sum + (ch.actualWordCount || ch.targetWordCount || 0), 0);

  const handleAddChapter = () => {
    const nextNum = chapters.length + 1;
    const padded = String(nextNum).padStart(2, '0');
    const newChapter: ChapterOutlineItem = {
      id: `CH-${padded}`,
      order: nextNum,
      title: lang === 'en' ? `Chapter ${nextNum}: Practical Implementation` : `第 ${nextNum} 章：實作與應用架構`,
      objective:
        lang === 'en'
          ? 'Guide the reader through a structured workflow step with clear verification checkpoints.'
          : '帶領讀者完成結構化操作步驟，並建立可驗證的交付檢查點。',
      subtopics: [
        lang === 'en' ? 'Core Principle & Context' : '核心原則與背景脈絡',
        lang === 'en' ? 'Step-by-Step Execution Protocol' : '分步實作標準流程',
        lang === 'en' ? 'Validation Checklist' : '驗收檢核清單',
      ],
      targetWordCount: 1800,
      practicalDeliverable: lang === 'en' ? 'Completed chapter worksheet' : '已完成之章節工作表',
      mappedReferenceIds: project.referenceLibrary.cards.slice(0, 2).map((c) => c.id),
      exampleScenarios: [],
      completionMilestone: lang === 'en' ? 'Deliverable reviewed against sources' : '依來源完成交付檢核',
      isCompleted: false,
      isLocked: false,
    };
    onUpdateOutline([...chapters, newChapter]);
  };

  const handleDeleteChapter = (id: string) => {
    const filtered = chapters
      .filter((c) => c.id !== id)
      .map((c, idx) => ({ ...c, order: idx + 1 }));
    onUpdateOutline(filtered);
  };

  const handleDraftOutlineWithAi = async () => {
    setAiBusy(true);
    setAiError('');
    try {
      const outputLang = lang === 'en' ? 'English' : 'Traditional Chinese';
      const refIds = project.referenceLibrary.cards.map((c) => c.id).join(', ') || 'none';
      const res = await generateTextWithAi({
        provider: project.aiSettings.provider,
        model: project.aiSettings.defaultModel || 'openrouter/free',
        systemPrompt:
          'You are an editorial curriculum architect. Output valid JSON ONLY containing an array of 5 to 7 structured chapters.',
        userPrompt: `Design a commercial digital product chapter outline in ${outputLang}. Return JSON array ONLY:
Product Title: ${project.charter?.productTitle || project.name}
Central Promise: ${project.charter?.centralPromise}
Signature Framework: ${project.charter?.signatureFramework}
Available Reference IDs: ${refIds}

JSON schema:
[
  {
    "title": "string",
    "objective": "string",
    "subtopics": ["string", "string", "string"],
    "targetWordCount": 1800,
    "practicalDeliverable": "string"
  }
]`,
        maxTokens: 2000,
      });

      onRecordAiUsage?.(res?.usage, res?.model);
      const raw = String(res?.content || '').trim();
      const arrMatch = raw.match(/\[[\s\S]*\]/);
      if (!arrMatch) throw new Error('AI response did not return a valid chapter JSON array.');
      const parsed = JSON.parse(arrMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty outline returned.');

      const availableRefs = project.referenceLibrary.cards.map((c) => c.id);
      const built: ChapterOutlineItem[] = parsed.map((item: any, idx: number) => {
        const order = idx + 1;
        return {
          id: `CH-${String(order).padStart(2, '0')}`,
          order,
          title: String(item.title || `Chapter ${order}`),
          objective: String(item.objective || ''),
          subtopics: Array.isArray(item.subtopics) ? item.subtopics.map(String) : [],
          targetWordCount: Number(item.targetWordCount) || 1800,
          practicalDeliverable: String(item.practicalDeliverable || 'Actionable chapter checklist'),
          mappedReferenceIds: availableRefs.length ? [availableRefs[idx % availableRefs.length]] : [],
          exampleScenarios: [],
          completionMilestone: 'Chapter deliverable verified',
          isCompleted: false,
          isLocked: false,
        };
      });
      onUpdateOutline(built);
    } catch (err: any) {
      setAiError(
        err?.message ||
          (lang === 'en'
            ? 'Configure a valid AI API key in AI Settings to draft an outline with AI.'
            : '請先於「AI 模型與 API 設定」配置有效的 API 金鑰後再使用 AI 規劃大綱。')
      );
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <ListTree className="w-3.5 h-3.5" />
            <span>{t.navOutlineBuilder}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.outlineTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'en'
              ? `${chapters.length} chapters structured, ~${totalWords.toLocaleString()} total target words, with ${project.referenceLibrary.cards.length} source records available for chapter mapping.`
              : `共 ${chapters.length} 個章節，預計總字數約 ${totalWords.toLocaleString()} 字，目前有 ${project.referenceLibrary.cards.length} 篇來源紀錄可配置章節與實作交付檢核`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={aiBusy}
            onClick={handleDraftOutlineWithAi}
            className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Sparkles className={`w-3.5 h-3.5 ${aiBusy ? 'animate-spin' : ''}`} />
            <span>
              {aiBusy
                ? lang === 'en' ? 'Drafting Outline...' : '正在規劃大綱...'
                : lang === 'en' ? 'Draft Outline with AI' : 'AI 自動規劃章節大綱'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleAddChapter}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Add Chapter' : '新增章節'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('content_studio')}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <span>{t.generateAllChaptersCta}</span>
          </button>
        </div>
      </div>

      {aiError && (
        <p role="alert" className="px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-xs font-medium">
          {aiError}
        </p>
      )}

      {/* Chapters Accordion / List */}
      <div className="space-y-3">
        {chapters.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3">
            <p className="text-sm text-slate-600">
              {lang === 'en'
                ? 'No chapters in this outline yet. Add a chapter manually or draft an outline with AI.'
                : '目前尚無章節大綱。請點擊上方「新增章節」或使用 AI 自動規劃大綱。'}
            </p>
            <button
              type="button"
              onClick={handleAddChapter}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Create Chapter 1' : '建立第一章'}</span>
            </button>
          </div>
        ) : (
          chapters.map((ch) => (
            <div key={ch.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all space-y-3 shadow-2xs">
              <details className="text-sm border-b border-slate-200 pb-3">
                <summary className="font-medium cursor-pointer">
                  {lang === 'en' ? 'Edit this chapter research plan' : '編輯本章研究與大綱計畫'}
                </summary>
                <form
                  className="mt-3 space-y-3 text-xs"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const values = new FormData(event.currentTarget);
                    onUpdateOutline(
                      chapters.map((item) =>
                        item.id === ch.id
                          ? {
                              ...item,
                              title: String(values.get('title')).trim(),
                              objective: String(values.get('objective')).trim(),
                              subtopics: String(values.get('subtopics'))
                                .split('\n')
                                .map((text) => text.trim())
                                .filter(Boolean),
                              targetWordCount: Number(values.get('targetWordCount')),
                              practicalDeliverable: String(values.get('practicalDeliverable') || item.practicalDeliverable).trim(),
                            }
                          : item
                      )
                    );
                  }}
                >
                  <label className="block">
                    {lang === 'en' ? 'Chapter title' : '章節標題'}
                    <input required name="title" defaultValue={ch.title} className="block w-full border border-slate-300 rounded p-2 mt-1" />
                  </label>
                  <label className="block">
                    {lang === 'en' ? 'Learning objective' : '學習目標'}
                    <textarea required name="objective" defaultValue={ch.objective} className="block w-full border border-slate-300 rounded p-2 mt-1" />
                  </label>
                  <label className="block">
                    {lang === 'en' ? 'Subtopics (one per line)' : '子章節規劃（每行一項）'}
                    <textarea required name="subtopics" defaultValue={ch.subtopics.join('\n')} className="block w-full border border-slate-300 rounded p-2 mt-1" />
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      {lang === 'en' ? 'Practical deliverable' : '實作交付物'}
                      <input name="practicalDeliverable" defaultValue={ch.practicalDeliverable} className="block w-full border border-slate-300 rounded p-2 mt-1" />
                    </label>
                    <label className="block">
                      {lang === 'en' ? 'Target length (words)' : '目標字數'}
                      <input required type="number" min={100} max={20000} name="targetWordCount" defaultValue={ch.targetWordCount} className="block w-full border border-slate-300 rounded p-2 mt-1 font-mono" />
                    </label>
                  </div>
                  <p className="text-xs text-slate-600">
                    {lang === 'en'
                      ? 'Changing the title, objective or subtopics requires a new Gate B relevance review. Changing target length requires Gate C review.'
                      : '修改標題、學習目標或子章節後需重新進行 Gate B 審查；修改目標字數需進行 Gate C 審查。'}
                  </p>
                  <button type="submit" className="px-3.5 py-2 rounded-lg bg-indigo-700 text-white font-semibold">
                    {lang === 'en' ? 'Save chapter plan' : '儲存章節規劃'}
                  </button>
                </form>
              </details>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                    {ch.id}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{ch.title}</h3>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                  <span className="tabular-nums">{ch.targetWordCount} {lang === 'en' ? 'words' : '字'}</span>
                  {ch.isCompleted ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {lang === 'en' ? 'Completed' : '已完稿'}
                    </span>
                  ) : (
                    <span className="text-slate-400">{lang === 'en' ? 'Pending' : '待生成'}</span>
                  )}
                  <button
                    type="button"
                    aria-label={lang === 'en' ? `Remove ${ch.id}` : `刪除 ${ch.id}`}
                    onClick={() => handleDeleteChapter(ch.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{ch.objective}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-700 block">{lang === 'en' ? 'Key Subtopics:' : '子章節規劃：'}</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    {(ch.subtopics || []).map((sub, sIdx) => (
                      <li key={sIdx}>{sub}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-700 block">{lang === 'en' ? 'Practical Deliverable:' : '實作交付物：'}</span>
                  <p className="text-slate-800 font-medium">{ch.practicalDeliverable}</p>
                  <div className="text-[11px] text-slate-400 mt-2">
                    <span>Mapped Refs: {(ch.mappedReferenceIds || []).join(', ') || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
