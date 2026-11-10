import React, { useState, useRef } from 'react';
import {
  Feather,
  CheckCircle2,
  Lock,
  Unlock,
  Play,
  RotateCcw,
  BookOpen,
  Sparkles,
  Save,
  Clock,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileCheck,
} from 'lucide-react';
import { DigitalProductProject, ChapterOutlineItem } from '../../types/project.ts';
import { generateTextWithAi } from '../../services/aiService.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface ContentStudioViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onUpdateChapter: (chapterId: string, content: string, wordCount: number) => void;
  onRunAutopilot: () => void;
  isAutopilotRunning: boolean;
  lang?: Language;
}

export const ContentStudioView: React.FC<ContentStudioViewProps> = ({
  project,
  setActiveView,
  onUpdateChapter,
  onRunAutopilot,
  isAutopilotRunning,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { outline, productBible, charter, referenceLibrary, aiSettings } = project;
  const chapters = outline || [];
  const [selectedChapterId, setSelectedChapterId] = useState<string>(chapters[0]?.id || 'CH-01');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showBibleModal, setShowBibleModal] = useState<boolean>(false);

  const currentChapter = chapters.find((c) => c.id === selectedChapterId) || chapters[0];
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [contentDraft, setContentDraft] = useState<string>(currentChapter?.contentMarkdown || '');

  // When chapter changes, update local draft
  const handleSelectChapter = (chId: string) => {
    setSelectedChapterId(chId);
    const ch = chapters.find((c) => c.id === chId);
    setContentDraft(ch?.contentMarkdown || '');
  };

  const handleSaveDraft = () => {
    const words = contentDraft.trim().split(/\s+/).filter(Boolean).length;
    onUpdateChapter(selectedChapterId, contentDraft, words);
  };

  const handleGenerateCurrentChapter = async () => {
    if (!currentChapter) return;
    setIsGenerating(true);

    try {
      const outputLanguage = lang === 'en' ? 'English' : 'Traditional Chinese (繁體中文)';
      const systemPrompt = `You are the lead author and principal researcher for Digital Product Creator 2.0.
You are writing a publication-grade, high-depth digital guide chapter for "${charter?.productTitle}".
Target Audience: ${charter?.targetAudience}
Brand Tone: ${charter?.brandVoiceSummary}
Core Promise: ${charter?.centralPromise}
Output Language: You MUST write the complete chapter text entirely in ${outputLanguage}.
Requirements:
1. Provide deep, substantive prose (Introduction, Core Framework, Step-by-Step Practical Blueprint, Scenario Walkthrough, Common Mistakes & Fixes, and Actionable Deliverable / Exercise).
2. Never output superficial placeholders, empty bullet lists, or generic fluff.
3. Write in clean Markdown format with structured headings, tables, and callouts.
4. Cite every factual claim, quantitative statement, and evidence-based recommendation immediately in its paragraph or bullet with [REF-01] syntax, using ONLY the provided source IDs. Never attach a citation unless its supplied supporting claims or research summary substantiate that point. Do not invent sources, measurements, page numbers, or verification.
5. If evidence is missing or only metadata/partial text is supplied, explicitly mark [SOURCE NEEDED] and qualify the claim. Distinguish editorial advice and illustrative scenarios from measured findings.
6. Include relevant process lists for conceptual diagrams. Where the supplied source material contains comparable numeric values, include a Markdown data table, with consistent units in the column heading and a [REF-ID] citation in each data row. Do not invent numerical charts or data. The export illustrates cited tables automatically.`;

      const userPrompt = `Please write the full comprehensive content for Chapter ${currentChapter.order}:
Title: ${currentChapter.title}
Objective: ${currentChapter.objective}
Planned Subtopics: ${currentChapter.subtopics.join(', ')}
Practical Deliverable: ${currentChapter.practicalDeliverable}
Mapped Reference IDs: ${currentChapter.mappedReferenceIds.join(', ')}
Source material (library records, not new independent verification):
${JSON.stringify(referenceLibrary.cards.filter(card => currentChapter.mappedReferenceIds.includes(card.id)).map(card => ({ id: card.id, title: card.sourceTitle, url: card.sourceURL, status: card.status, supportedClaims: card.supportedClaims, researchSummary: card.researchSummary, verificationNotes: card.editorialNotes.verificationNotes })), null, 2)}`;

      const res = await generateTextWithAi({
        provider: aiSettings.provider,
        model: aiSettings.defaultModel || 'openrouter/free',
        systemPrompt,
        userPrompt,
        maxTokens: 3000,
      });

      if (res && res.content) {
        setContentDraft(res.content);
        const words = res.content.trim().split(/\s+/).filter(Boolean).length;
        onUpdateChapter(selectedChapterId, res.content, words);
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      alert(lang === 'en' ? `Generation failed: ${err.message}` : `生成失敗: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const wordCount = contentDraft.trim().split(/\s+/).filter(Boolean).length;
  const currentChapterIndex = chapters.findIndex((c) => c.id === selectedChapterId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
            <Feather className="w-3.5 h-3.5" />
            <span>{t.navContentStudio}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{t.contentStudioTitle}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t.contentStudioSubtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBibleModal(true)}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Product Bible Context' : '連續記憶辭典 (Product Bible)'}</span>
          </button>

          <button
            onClick={() => setActiveView('workbook_studio')}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <span>{lang === 'en' ? 'Proceed to Workbook Studio →' : '進入實作工具套件 →'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Chapter Navigation Strip */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 lg:col-span-1 h-fit">
          <span className="text-xs font-bold text-slate-800 block mb-2">{t.selectChapterLabel}</span>
          <div className="space-y-1">
            {chapters.map((ch, idx) => {
              const isSelected = ch.id === selectedChapterId;
              return (
                <button
                  key={ch.id}
                  onClick={() => handleSelectChapter(ch.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium text-left transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="font-mono text-[11px] opacity-75 mr-1.5">Ch {idx + 1}</span>
                    <span className="truncate">{ch.title}</span>
                  </div>
                  {ch.isCompleted ? (
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Chapter Editor & Controls */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 lg:col-span-3 space-y-4">
          {/* Top Control Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {currentChapter?.id}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {lang === 'en' ? 'Target' : '目標'}: {currentChapter?.targetWordCount} {lang === 'en' ? 'words' : '字'}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-mono text-emerald-600 font-semibold">
                  {lang === 'en' ? 'Current' : '當前'}: {wordCount} {lang === 'en' ? 'words' : '字'}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900">{currentChapter?.title}</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveDraft}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t.saveDraft}</span>
              </button>

              <button
                onClick={handleGenerateCurrentChapter}
                disabled={isGenerating}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? (lang === 'en' ? 'Generating Content...' : '正在生成中...') : t.generateCurrentChapterBtn}</span>
              </button>
            </div>
          </div>

          {/* Markdown Content Area */}
          <div className="space-y-2">
            <details className="rounded-lg border border-slate-200 p-4 bg-white">
              <summary className="text-sm font-semibold cursor-pointer">{lang === 'en' ? 'Insert a source citation' : '插入來源引用'}</summary>
              <p className="my-3 text-xs text-slate-600">{lang === 'en' ? 'Review the supporting claims, place the cursor beside the relevant sentence, then insert its source. A library status alone does not establish claim support.' : '先審查來源支持的論點，將游標置於相關句子旁再插入引用。文獻狀態本身不代表來源支持該論點。'}</p>
              <div className="space-y-3">{referenceLibrary.cards.filter(card => currentChapter?.mappedReferenceIds.includes(card.id)).map(card => <article key={card.id} className="border-t border-slate-200 pt-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">{card.sourceTitle}</h3><span className="text-xs font-mono text-slate-600">{card.status}</span></div>
                <ul className="text-xs text-slate-600 list-disc pl-4 space-y-1">{card.supportedClaims.map((claim,i) => <li key={i}>{claim}</li>)}</ul>
                <div className="flex flex-wrap items-center gap-4">
                  {/^https?:\/\//i.test(card.sourceURL) && <a href={card.sourceURL} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-700 underline">{lang === 'en' ? 'Open original source' : '開啟原始來源'}</a>}
                  <button className="text-xs px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md" onClick={() => {
                    const position = editorRef.current?.selectionEnd ?? contentDraft.length;
                    const citation = ` [${card.id}]`;
                    setContentDraft(contentDraft.slice(0, position) + citation + contentDraft.slice(position));
                    requestAnimationFrame(() => { editorRef.current?.focus(); editorRef.current?.setSelectionRange(position + citation.length, position + citation.length); });
                  }}>{lang === 'en' ? 'Insert' : '插入'} [{card.id}]</button>
                </div>
              </article>)}</div>
              {!referenceLibrary.cards.some(card => currentChapter?.mappedReferenceIds.includes(card.id)) && <p className="text-xs text-slate-600">{lang === 'en' ? 'Map sources to this chapter in Outline & Structure first.' : '請先在章節結構中為本章配置來源。'}</p>}
            </details>
            <textarea
              ref={editorRef}
              aria-label={lang === 'en' ? 'Chapter manuscript' : '章節稿件'}
              rows={18}
              value={contentDraft}
              onChange={(e) => setContentDraft(e.target.value)}
              placeholder={lang === 'en' ? 'Chapter manuscript content in Markdown format...' : '輸入或點擊上方按鈕生成本章 Markdown 實質內容...'}
              className="w-full text-xs font-mono leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-4 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          {/* Bottom Paging Strip */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
            <button
              disabled={currentChapterIndex <= 0}
              onClick={() => handleSelectChapter(chapters[currentChapterIndex - 1]?.id)}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Previous Chapter' : '上一章'}</span>
            </button>

            <span className="text-slate-400 font-mono">
              {currentChapterIndex + 1} / {chapters.length}
            </span>

            <button
              disabled={currentChapterIndex >= chapters.length - 1}
              onClick={() => handleSelectChapter(chapters[currentChapterIndex + 1]?.id)}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span>{lang === 'en' ? 'Next Chapter' : '下一章'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
