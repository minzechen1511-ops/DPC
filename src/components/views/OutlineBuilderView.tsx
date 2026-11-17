import React, { useState } from 'react';
import { ListTree, CheckCircle2, Plus, Trash2, Sparkles, BarChart3 } from 'lucide-react';
import { DigitalProductProject, ChapterOutlineItem } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { generateTextWithAi } from '../../services/aiService.ts';
import { countManuscriptWords } from '../../utils/textMetrics.ts';
import { buildOutlineSynthesisPrompt, parseOutlineSynthesisResponse } from '../../utils/stageSynthesis.ts';

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
  const [focusNote, setFocusNote] = useState('');

  const totalWords = chapters.reduce((sum, ch) => sum + (ch.actualWordCount || ch.targetWordCount || 0), 0);
  const maxTargetWords = Math.max(1, ...chapters.map((ch) => Math.max(ch.targetWordCount || 0, countManuscriptWords(ch.contentMarkdown || ''))));

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
      const { systemPrompt, userPrompt } = buildOutlineSynthesisPrompt(project, lang, focusNote);
      const res = await generateTextWithAi({
        provider: 'gemini',
        model: project.aiSettings.defaultModel || 'gemini-4-hydrogen',
        systemPrompt,
        userPrompt,
        maxTokens: 2400,
        projectId: project.projectId,
      });

      onRecordAiUsage?.(res?.usage, res?.model);
      const availableRefs = project.referenceLibrary.cards.map((c) => c.id);
      const built = parseOutlineSynthesisResponse(res?.content || '', availableRefs);
      onUpdateOutline(built);
    } catch (err: any) {
      setAiError(
        err?.message ||
          (lang === 'en'
            ? 'Could not reach server Gemini engine. Check Gemini AI Settings or sign in again.'
            : '無法連接伺服器端 Gemini 引擎，請檢查「Gemini AI 與用量設定」或重新登入。')
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
            <ListTree className="w-4 h-4" />
            <span>{t.navOutlineBuilder}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t.outlineTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">
            {lang === 'en'
              ? `${chapters.length} chapters structured, ~${totalWords.toLocaleString()} total target words, with ${project.referenceLibrary.cards.length} source records available for chapter mapping.`
              : `共 ${chapters.length} 個章節，預計總字數約 ${totalWords.toLocaleString()} 字，目前有 ${project.referenceLibrary.cards.length} 篇來源紀錄可配置章節與實作交付檢核`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={aiBusy}
            onClick={handleDraftOutlineWithAi}
            className="px-4 py-2.5 text-sm font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors flex items-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${aiBusy ? 'animate-spin' : ''}`} />
            <span>
              {aiBusy
                ? lang === 'en' ? 'Drafting Outline...' : '正在規劃大綱...'
                : lang === 'en' ? 'Draft Outline with AI' : 'AI 自動規劃章節大綱'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleAddChapter}
            className="px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'en' ? 'Add Chapter' : '新增章節'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('content_studio')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <span>{t.generateAllChaptersCta}</span>
          </button>
        </div>
      </div>

      {/* Synthesise.ai Curriculum Guidance Bar */}
      <div className="lab-panel p-4 sm:p-5 bg-gradient-to-r from-teal-50/60 via-white to-sky-50/50 flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="text-xs font-mono uppercase tracking-wider font-bold text-teal-800 whitespace-nowrap">
          {lang === 'en' ? 'Outline Architect Prompt:' : '大綱結構引導提示：'}
        </span>
        <input
          type="text"
          value={focusNote}
          onChange={(e) => setFocusNote(e.target.value)}
          placeholder={
            lang === 'en'
              ? 'Optional structure request (e.g., 6 chapters, include a troubleshooting chapter and a 30-day sprint roadmap...)'
              : '選填大綱結構偏好（例如：規劃 6 章、加入常見盲點排解章節與 30 天執行路線圖...）'
          }
          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800"
        />
      </div>

      {aiError && (
        <p role="alert" className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-sm font-medium">
          {aiError}
        </p>
      )}

      {/* Scientific Word Allocation Spectrum */}
      {chapters.length > 0 && (
        <div className="lab-panel p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-600" />
              <span>{lang === 'en' ? 'Chapter Word Density & Target Allocation' : '各章字數規模與完稿密度分布'}</span>
            </h2>
            <span className="text-xs font-mono text-slate-500">
              {lang === 'en' ? 'Actual vs Target' : '實寫 vs 目標字數'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {chapters.map((ch) => {
              const actual = countManuscriptWords(ch.contentMarkdown || '');
              const targetPct = Math.round(((ch.targetWordCount || 0) / maxTargetWords) * 100);
              const actualPct = Math.round((actual / maxTargetWords) * 100);
              return (
                <div key={ch.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-teal-800">{ch.id}</span>
                    <span className="text-slate-600 tabular-nums">
                      {actual}/{ch.targetWordCount}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-sm overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-sky-200"
                      style={{ width: `${targetPct}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-600"
                      style={{ width: `${actualPct}%` }}
                    />
                  </div>
                  <div className="text-xs font-medium text-slate-700 truncate" title={ch.title}>
                    {ch.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chapters List */}
      <div className="space-y-4">
        {chapters.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-4">
            <p className="text-base text-slate-600">
              {lang === 'en'
                ? 'No chapters in this outline yet. Add a chapter manually or draft an outline with AI.'
                : '目前尚無章節大綱。請點擊上方「新增章節」或使用 AI 自動規劃大綱。'}
            </p>
            <button
              type="button"
              onClick={handleAddChapter}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'en' ? 'Create Chapter 1' : '建立第一章'}</span>
            </button>
          </div>
        ) : (
          chapters.map((ch) => (
            <div key={ch.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-300 transition-all space-y-4">
              <details className="text-sm border-b border-slate-200 pb-4">
                <summary className="font-bold cursor-pointer text-slate-800">
                  {lang === 'en' ? 'Edit this chapter research plan' : '編輯本章研究與大綱計畫'}
                </summary>
                <form
                  className="mt-4 space-y-4 text-sm"
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
                  <label className="block font-semibold text-slate-800">
                    {lang === 'en' ? 'Chapter title' : '章節標題'}
                    <input required name="title" defaultValue={ch.title} className="block w-full border border-slate-300 rounded-xl px-3.5 py-2.5 mt-1.5 bg-slate-50 font-normal" />
                  </label>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <label className="block font-semibold text-slate-800">
                      {lang === 'en' ? 'Learning objective' : '學習目標'}
                      <textarea required name="objective" rows={4} defaultValue={ch.objective} className="block w-full border border-slate-300 rounded-xl p-3 mt-1.5 bg-slate-50 font-normal" />
                    </label>
                    <label className="block font-semibold text-slate-800">
                      {lang === 'en' ? 'Subtopics (one per line)' : '子章節規劃（每行一項）'}
                      <textarea required name="subtopics" rows={4} defaultValue={ch.subtopics.join('\n')} className="block w-full border border-slate-300 rounded-xl p-3 mt-1.5 bg-slate-50 font-normal" />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block font-semibold text-slate-800">
                      {lang === 'en' ? 'Practical deliverable' : '實作交付物'}
                      <input name="practicalDeliverable" defaultValue={ch.practicalDeliverable} className="block w-full border border-slate-300 rounded-xl px-3.5 py-2.5 mt-1.5 bg-slate-50 font-normal" />
                    </label>
                    <label className="block font-semibold text-slate-800">
                      {lang === 'en' ? 'Target length (words)' : '目標字數'}
                      <input required type="number" min={100} max={20000} name="targetWordCount" defaultValue={ch.targetWordCount} className="block w-full border border-slate-300 rounded-xl px-3.5 py-2.5 mt-1.5 font-mono bg-slate-50 font-normal" />
                    </label>
                  </div>
                  <p className="text-xs text-slate-600">
                    {lang === 'en'
                      ? 'Changing the title, objective or subtopics requires a new Gate B relevance review. Changing target length requires Gate C review.'
                      : '修改標題、學習目標或子章節後需重新進行 Gate B 審查；修改目標字數需進行 Gate C 審查。'}
                  </p>
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-semibold">
                    {lang === 'en' ? 'Save chapter plan' : '儲存章節規劃'}
                  </button>
                </form>
              </details>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md">
                    {ch.id}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{ch.title}</h3>
                </div>

                <div className="flex items-center gap-3.5 text-sm text-slate-600 font-mono">
                  <span className="tabular-nums font-semibold">{ch.targetWordCount} {lang === 'en' ? 'words' : '字'}</span>
                  {ch.isCompleted ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> {lang === 'en' ? 'Completed' : '已完稿'}
                    </span>
                  ) : (
                    <span className="text-slate-500">{lang === 'en' ? 'Pending' : '待生成'}</span>
                  )}
                  <button
                    type="button"
                    aria-label={lang === 'en' ? `Remove ${ch.id}` : `刪除 ${ch.id}`}
                    onClick={() => handleDeleteChapter(ch.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">{ch.objective}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-sm">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 block">{lang === 'en' ? 'Key Subtopics:' : '子章節規劃：'}</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    {(ch.subtopics || []).map((sub, sIdx) => (
                      <li key={sIdx}>{sub}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 block">{lang === 'en' ? 'Practical Deliverable:' : '實作交付物：'}</span>
                  <p className="text-slate-900 font-semibold">{ch.practicalDeliverable}</p>
                  <div className="text-xs font-mono text-slate-500 mt-2">
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
