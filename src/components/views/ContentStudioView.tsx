import { gateIssues } from '../../utils/gatePolicy.ts';
import { CitationReviewPanel } from '../CitationReviewPanel.tsx';
import { isRetrievedSource } from '../../utils/sourceEvidence.ts';
import { countManuscriptWords } from '../../utils/textMetrics.ts';
import {chapterDraftReady} from '../../utils/stageJourney.ts';
import React, { useState, useRef, useEffect } from 'react';
import {
  Feather,
  CheckCircle2,
  BookOpen,
  Sparkles,
  Save,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  DigitalProductProject,
  ChapterIllustration,
  ChapterOutlineItem,
  CitationReview,
  ProductBible,
} from '../../types/project.ts';
import {
  ActiveStudioProvider,
  DEFAULT_OPENROUTER_MODEL,
  generateTextWithAi,
  normalizeStudioProvider,
} from '../../services/aiService.ts';
import { extractChapterContinuity } from '../../utils/stageSynthesis.ts';
import { generationError } from '../../utils/gateAJourney.ts';
import { AiEngineQuickControl, useOpenRouterConnected } from '../AiEngineQuickControl.tsx';
import { AiRateLimitNotice } from '../AiRateLimitNotice.tsx';
import { Language, translations } from '../../utils/i18n.ts';

interface ContentStudioViewProps {
  onUpdateIllustrations: (chapterId: string, illustrations: ChapterIllustration[]) => void;
  onReviewCitations: (chapterId: string, reviews: CitationReview[]) => void;
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onUpdateChapter: (chapterId: string, content: string, wordCount: number) => void;
  onUpdateProductBible?: (bible: ProductBible) => void;
  onUpdateAiSettings?: (settings: any) => void;
  onRecordAiUsage?: (usage?: { total_tokens?: number; estimatedCostUsd?: number }, model?: string, provider?: ActiveStudioProvider) => void;
  lang?: Language;
}

export const ContentStudioView: React.FC<ContentStudioViewProps> = ({
  onReviewCitations,
  onUpdateIllustrations,
  project,
  setActiveView,
  onUpdateChapter,
  onUpdateProductBible,
  onUpdateAiSettings,
  onRecordAiUsage,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { outline, productBible, charter, referenceLibrary, aiSettings } = project;
  const chapters = outline || [];
  const [selectedChapterId, setSelectedChapterId] = useState<string>(chapters[0]?.id || 'CH-01');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastAiAction, setLastAiAction] = useState<'draft' | 'polish' | 'batch'>('draft');
  const [batchProgress, setBatchProgress] = useState<string>('');
  const [aiError, setAiError] = useState<string>('');
  const [aiSuccess, setAiSuccess] = useState<string>('');
  const [fallbackNotice, setFallbackNotice] = useState<string>('');
  const openrouterConnected = useOpenRouterConnected();
  const [showBibleModal, setShowBibleModal] = useState<boolean>(false);
  const [bibleKeywordsText, setBibleKeywordsText] = useState<string>((productBible?.brandVoiceKeywords || []).join(', '));
  const [bibleConceptsText, setBibleConceptsText] = useState<string>((productBible?.introducedConcepts || []).join('\n'));
  const [bibleNotesText, setBibleNotesText] = useState<string>((productBible?.continuityHandoffNotes || []).join('\n'));

  const canGenerate = project.workflow.gates.gateB.isApproved && !gateIssues(project, 'gateB').length;
  const currentChapter = chapters.find((c) => c.id === selectedChapterId) || chapters[0];
  const [imageDraft, setImageDraft] = useState({ dataUri: '', alt: '', caption: '', paragraphAnchor: '', credit: '', license: '', referenceId: '' });
  const [imageError, setImageError] = useState('');
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [contentDraft, setContentDraft] = useState<string>(currentChapter?.contentMarkdown || '');

  useEffect(() => {
    if (!chapters.some((c) => c.id === selectedChapterId) && chapters[0]) {
      setSelectedChapterId(chapters[0].id);
    }
  }, [project.projectId, chapters, selectedChapterId]);

  useEffect(() => {
    setContentDraft(currentChapter?.contentMarkdown || '');
  }, [project.projectId, selectedChapterId, currentChapter?.contentMarkdown]);

  useEffect(() => {
    if (showBibleModal) {
      setBibleKeywordsText((productBible?.brandVoiceKeywords || []).join(', '));
      setBibleConceptsText((productBible?.introducedConcepts || []).join('\n'));
      setBibleNotesText((productBible?.continuityHandoffNotes || []).join('\n'));
    }
  }, [showBibleModal, productBible]);

  const handleSelectChapter = (chId: string) => {
    setSelectedChapterId(chId);
    const ch = chapters.find((c) => c.id === chId);
    setContentDraft(ch?.contentMarkdown || '');
    setAiError('');
  };

  const handleSaveDraft = () => {
    const words = countManuscriptWords(contentDraft);
    onUpdateChapter(selectedChapterId, contentDraft, words);
  };

  const buildChapterPrompts = (chapter: ChapterOutlineItem, bibleState: ProductBible, mode: 'draft' | 'polish', existingText?: string) => {
    const outputLanguage = lang === 'en' ? 'English' : 'Traditional Chinese (繁體中文)';
    const systemPrompt = `You are the lead author and principal researcher for Digital Product Studio.
You are drafting one chapter for manual evidence review, not certifying a publication-grade manuscript for "${charter?.productTitle}".
Target Audience: ${charter?.targetAudience}
Brand Tone: ${charter?.brandVoiceSummary}
Core Promise: ${charter?.centralPromise}
Signature Framework: ${charter?.signatureFramework || bibleState?.signatureFramework || ''}
Introduced Concepts So Far: ${(bibleState?.introducedConcepts || []).slice(0, 8).join(', ') || 'None yet'}
Continuity Handoffs: ${(bibleState?.continuityHandoffNotes || []).slice(-3).join(' | ') || 'Start of book'}
Output Language: You MUST write the complete chapter text entirely in ${outputLanguage}.
Requirements:
1. Provide deep, substantive prose (Introduction, Core Framework, Step-by-Step Practical Blueprint, Scenario Walkthrough, Common Mistakes & Fixes, and Actionable Deliverable / Exercise).
2. Never output superficial placeholders, empty bullet lists, or generic fluff. Make headings crisp and buyer-engaging.
3. Write in clean Markdown format with structured headings, tables, and callouts.
4. Cite every factual claim, quantitative statement, and evidence-based recommendation immediately in its paragraph or bullet with [REF-01] syntax, using ONLY the permitted retrieved source IDs. Base factual statements on the supplied exact excerpts, not the broader title or research summary. Never attach a citation unless its supplied supporting claims or research summary substantiate that point. Do not invent sources, measurements, page numbers, or verification.
5. If evidence is missing or only metadata/partial text is supplied, explicitly mark [SOURCE NEEDED] and qualify the claim. Distinguish editorial advice and illustrative scenarios from measured findings.
6. Include relevant process lists for conceptual diagrams. Where the supplied source material contains comparable numeric values, include a Markdown data table, with consistent units in the column heading and a [REF-ID] citation in each data row. Do not invent numerical charts or data. A person must review all citation support decisions; never claim you or the export has validated the evidence.`;

    const permittedSources = referenceLibrary.cards.filter(
      (card) => chapter.mappedReferenceIds.includes(card.id) && isRetrievedSource(card)
    );

    const userPrompt =
      mode === 'polish' && existingText?.trim()
        ? `Refine, deepen, and elevate the editorial polish of Chapter ${chapter.order} ("${chapter.title}") in ${outputLanguage}. Preserve every valid [REF-ID] citation and exact factual accuracy, strengthen clarity, formatting, comparison tables, and practical buyer takeaways.

Existing Chapter Draft:
${existingText}

Permitted retrieved reference IDs: ${permittedSources.map((c) => c.id).join(', ') || 'none'}
Source material:
${JSON.stringify(permittedSources.map((card) => ({ id: card.id, title: card.sourceTitle, url: card.sourceURL, status: card.status, supportedClaims: card.supportedClaims, researchSummary: card.researchSummary, exactRetrievedQuote: card.verificationQuote, exactLocator: card.verificationLocator })), null, 2)}`
        : `Please write the full comprehensive content for Chapter ${chapter.order}:
Title: ${chapter.title}
Objective: ${chapter.objective}
Planned Subtopics: ${chapter.subtopics.join(', ')}
Practical Deliverable: ${chapter.practicalDeliverable}
Target Word Count: ~${chapter.targetWordCount || 1500} words
Permitted retrieved reference IDs: ${permittedSources.map((card) => card.id).join(', ')}
Source material (library records, not new independent verification):
${JSON.stringify(permittedSources.map((card) => ({ id: card.id, title: card.sourceTitle, url: card.sourceURL, status: card.status, supportedClaims: card.supportedClaims, researchSummary: card.researchSummary, exactRetrievedQuote: card.verificationQuote, exactLocator: card.verificationLocator, retrievedDocument: card.retrieval, verificationNotes: card.editorialNotes.verificationNotes })), null, 2)}`;

    return { systemPrompt, userPrompt };
  };

  const handleGenerateCurrentChapter = async (
    mode: 'draft' | 'polish' = 'draft',
    overrideModel?: string,
    overrideProvider?: ActiveStudioProvider
  ) => {
    if (!currentChapter || !canGenerate || isGenerating) return;
    setLastAiAction(mode);
    setIsGenerating(true);
    setAiError('');
    setAiSuccess('');
    setFallbackNotice('');

    const activeProvider =
      overrideProvider ||
      normalizeStudioProvider(aiSettings?.provider, aiSettings?.defaultModel);
    const activeModel =
      overrideModel ||
      aiSettings?.defaultModel ||
      (activeProvider === 'openrouter' ? DEFAULT_OPENROUTER_MODEL : 'gemini-4-hydrogen');

    try {
      const { systemPrompt, userPrompt } = buildChapterPrompts(
        currentChapter,
        productBible,
        mode,
        mode === 'polish' ? contentDraft : undefined
      );

      const res = await generateTextWithAi({
        provider: activeProvider,
        model: activeModel,
        tokenSaverMode: aiSettings?.tokenSaverMode || 'economy',
        allowRateLimitFallback: aiSettings?.allowRateLimitFallback ?? true,
        systemPrompt,
        userPrompt,
        maxTokens: 3200,
        projectId: project.projectId,
      });

      onRecordAiUsage?.(res?.usage, res?.model, res?.provider);
      const fallbackTag = res?.fallbackUsed
        ? lang === 'en'
          ? `Auto-switched from ${res.primaryModel} to ${res.model} to avoid 429 quota block.`
          : `已自動從 ${res.primaryModel} 切換至 ${res.model} 以避開限流。`
        : '';
      if (fallbackTag) setFallbackNotice(fallbackTag);

      if (!res?.content?.trim()) throw new Error(lang === 'en' ? 'The model returned an empty chapter.' : '模型傳回空白章節。');
      if (res.content) {
        setContentDraft(res.content);
        const words = countManuscriptWords(res.content);
        onUpdateChapter(selectedChapterId, res.content, words);
        if (onUpdateProductBible) {
          onUpdateProductBible(extractChapterContinuity(currentChapter, res.content, productBible));
        }
        setAiSuccess(
          (lang === 'en'
            ? `Chapter ${currentChapter.order} ${mode === 'polish' ? 'polished' : 'drafted'} (${words.toLocaleString()} words) and synced to Product Bible.`
            : `第 ${currentChapter.order} 章已${mode === 'polish' ? '完成商業潤飾' : '生成完稿'}（約 ${words.toLocaleString()} 字），並同步更新連續記憶辭典。`) +
            (fallbackTag ? ` (${fallbackTag})` : '')
        );
      }
    } catch (err: any) {
      setAiError(generationError(err, lang));
    } finally {
      setIsGenerating(false);
    }
  };

  const pendingChapters = chapters.filter(chapter => !chapterDraftReady(chapter));

  const handleBatchGeneratePending = async (
    overrideModel?: string,
    overrideProvider?: ActiveStudioProvider
  ) => {
    if (!canGenerate || pendingChapters.length === 0 || isGenerating) return;
    setLastAiAction('batch');
    setIsGenerating(true);
    setAiError('');
    setAiSuccess('');
    setFallbackNotice('');
    let runningBible = productBible;
    let completedCount = 0;

    const activeProvider =
      overrideProvider ||
      normalizeStudioProvider(aiSettings?.provider, aiSettings?.defaultModel);
    const activeModel =
      overrideModel ||
      aiSettings?.defaultModel ||
      (activeProvider === 'openrouter' ? DEFAULT_OPENROUTER_MODEL : 'gemini-4-hydrogen');

    try {
      for (let i = 0; i < pendingChapters.length; i += 1) {
        const chapter = pendingChapters[i];
        setBatchProgress(
          lang === 'en'
            ? `Drafting ${chapter.id} (${i + 1} of ${pendingChapters.length}): ${chapter.title}...`
            : `正在批量撰寫 ${chapter.id}（第 ${i + 1} / ${pendingChapters.length} 章）：${chapter.title}...`
        );
        const { systemPrompt, userPrompt } = buildChapterPrompts(chapter, runningBible, 'draft');
        const res = await generateTextWithAi({
          provider: activeProvider,
          model: activeModel,
          tokenSaverMode: aiSettings?.tokenSaverMode || 'economy',
          allowRateLimitFallback: aiSettings?.allowRateLimitFallback ?? true,
          systemPrompt,
          userPrompt,
          maxTokens: 3200,
          projectId: project.projectId,
        });
        onRecordAiUsage?.(res?.usage, res?.model, res?.provider);
        if (res?.fallbackUsed) {
          setFallbackNotice(
            lang === 'en'
              ? `Auto-switched from ${res.primaryModel} to ${res.model} to avoid 429 quota block.`
              : `已自動從 ${res.primaryModel} 切換至 ${res.model} 以避開限流。`
          );
        }
        if (!res?.content?.trim()) throw new Error(lang === 'en' ? 'The model returned an empty chapter.' : '模型傳回空白章節。');
        const words = countManuscriptWords(res.content);
        onUpdateChapter(chapter.id, res.content, words);
        runningBible = extractChapterContinuity(chapter, res.content, runningBible);
        onUpdateProductBible?.(runningBible);
        if (chapter.id === selectedChapterId) setContentDraft(res.content);
        completedCount += 1;
      }
      setAiSuccess(
        lang === 'en'
          ? `Batch drafted ${completedCount} chapter(s). Review inline citations below before approving Gate C.`
          : `已批量生成 ${completedCount} 個章節並更新連續記憶辭典，請於下方審查引用標註後進入 Gate C。`
      );
    } catch (err: any) {
      const msg = generationError(err, lang);
      setAiError(
        completedCount > 0
          ? lang === 'en'
            ? `Batch stopped after ${completedCount} chapter(s): ${msg}`
            : `批量生成已完成 ${completedCount} 章後中斷：${msg}`
          : msg
      );
    } finally {
      setBatchProgress('');
      setIsGenerating(false);
    }
  };

  const handleRetryLastAction = (overrideModel?: string, overrideProvider?: ActiveStudioProvider) => {
    if (lastAiAction === 'batch') {
      void handleBatchGeneratePending(overrideModel, overrideProvider);
    } else {
      void handleGenerateCurrentChapter(lastAiAction, overrideModel, overrideProvider);
    }
  };

  const handleSwitchToFlashLiteAndRetry = () => {
    if (onUpdateAiSettings) {
      onUpdateAiSettings({
        ...aiSettings,
        provider: 'gemini',
        apiKey: '',
        baseUrl: '',
        apiKeys: { openrouter: '', gemini: '', openai: '', claude: '' },
        defaultModel: 'gemini-3.1-flash-lite',
        tokenSaverMode: 'economy',
        providerModels: {
          ...aiSettings?.providerModels,
          gemini: 'gemini-3.1-flash-lite',
        },
      });
    }
    handleRetryLastAction('gemini-3.1-flash-lite', 'gemini');
  };

  const handleSwitchToOpenRouterAndRetry = () => {
    const nextModel = aiSettings?.providerModels?.openrouter || DEFAULT_OPENROUTER_MODEL;
    if (onUpdateAiSettings) {
      onUpdateAiSettings({
        ...aiSettings,
        provider: 'openrouter',
        apiKey: '',
        baseUrl: '',
        apiKeys: { openrouter: '', gemini: '', openai: '', claude: '' },
        defaultModel: nextModel,
        providerModels: {
          ...aiSettings?.providerModels,
          openrouter: nextModel,
        },
      });
    }
    handleRetryLastAction(nextModel, 'openrouter');
  };

  const wordCount = countManuscriptWords(contentDraft);
  const currentChapterIndex = chapters.findIndex((c) => c.id === selectedChapterId);

  return (
    <div className="w-full space-y-5 pb-3">
      {/* Header Banner */}
      <div className="lab-panel p-6 lg:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-teal-700 mb-1.5">
            <Feather className="w-4 h-4" />
            <span>{t.navContentStudio}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t.contentStudioTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">{t.contentStudioSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {pendingChapters.length > 0 && (
            <button
              type="button"
              disabled={isGenerating || !canGenerate}
              onClick={() => void handleBatchGeneratePending()}
              title={
                canGenerate
                  ? 'Sequentially synthesize all uncompleted chapters while maintaining Product Bible continuity'
                  : 'Approve Gate B first'
              }
              className="px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
            >
              <Sparkles className={`w-4 h-4 ${batchProgress ? 'animate-spin' : ''}`} />
              <span>
                {lang === 'en'
                  ? `Batch Draft Remaining (${pendingChapters.length})`
                  : `AI 批量生成剩餘章節 (${pendingChapters.length})`}
              </span>
            </button>
          )}

          <button
            onClick={() => setShowBibleModal(true)}
            className="px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            <span>{lang === 'en' ? 'Product Bible Context' : '連續記憶辭典 (Product Bible)'}</span>
          </button>

          <button
            onClick={() => setActiveView('workbook_studio')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <span>{lang === 'en' ? 'Proceed to Workbook Studio →' : '進入實作工具套件 →'}</span>
          </button>
        </div>
      </div>

      <AiEngineQuickControl
        project={project}
        onUpdateAiSettings={onUpdateAiSettings}
        onOpenAiSettings={() => setActiveView('ai_settings')}
        disabled={isGenerating}
        fallbackNotice={fallbackNotice}
        lang={lang}
      />

      {batchProgress && (
        <p role="status" className="px-4 py-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-sm font-semibold">
          {batchProgress}
        </p>
      )}

      {aiSuccess && (
        <p role="status" className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium">
          {aiSuccess}
        </p>
      )}

      {aiError && (
        <AiRateLimitNotice
          errorMessage={aiError}
          currentModel={aiSettings?.defaultModel || 'gemini-4-hydrogen'}
          busy={isGenerating}
          openrouterConnected={openrouterConnected}
          onRetry={() => handleRetryLastAction()}
          onSwitchToFlashLiteAndRetry={handleSwitchToFlashLiteAndRetry}
          onSwitchToOpenRouterAndRetry={handleSwitchToOpenRouterAndRetry}
          onOpenAiSettings={() => setActiveView('ai_settings')}
          lang={lang}
        />
      )}

      {showBibleModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-bible-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 id="product-bible-modal-title" className="text-lg font-bold text-slate-900">
                  {lang === 'en' ? 'Product Bible & Continuity Context' : '連續記憶辭典 (Product Bible)'}
                </h2>
                <p className="text-xs text-slate-500">
                  {charter?.productTitle || productBible?.productTitle || t.untitledProject}
                </p>
              </div>
              <button
                type="button"
                aria-label={lang === 'en' ? 'Close Product Bible' : '關閉連續記憶辭典'}
                onClick={() => setShowBibleModal(false)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <strong className="text-slate-800 block">{lang === 'en' ? 'Core Promise & Framework' : '核心承諾與架構'}</strong>
                <p className="text-slate-600">{charter?.centralPromise || productBible?.centralPromise || '—'}</p>
                <p className="text-teal-800 font-semibold">{charter?.signatureFramework || productBible?.signatureFramework || '—'}</p>
              </div>

              <label className="block space-y-1.5">
                <span className="font-bold text-slate-800">{lang === 'en' ? 'Brand Voice Keywords (comma-separated)' : '品牌語調關鍵詞 (逗號分隔)'}</span>
                <input
                  type="text"
                  value={bibleKeywordsText}
                  onChange={(e) => setBibleKeywordsText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="font-bold text-slate-800">{lang === 'en' ? 'Introduced Concepts Across Chapters (one per line)' : '已引入的核心概念 (每行一項)'}</span>
                <textarea
                  rows={4}
                  value={bibleConceptsText}
                  onChange={(e) => setBibleConceptsText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="font-bold text-slate-800">{lang === 'en' ? 'Continuity Handoff Notes (one per line)' : '章節銜接備忘錄 (每行一項)'}</span>
                <textarea
                  rows={4}
                  value={bibleNotesText}
                  onChange={(e) => setBibleNotesText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBibleModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                {lang === 'en' ? 'Close' : '關閉'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateProductBible?.({
                    ...productBible,
                    productTitle: charter?.productTitle || productBible?.productTitle,
                    centralPromise: charter?.centralPromise || productBible?.centralPromise,
                    signatureFramework: charter?.signatureFramework || productBible?.signatureFramework,
                    brandVoiceKeywords: bibleKeywordsText.split(',').map((s) => s.trim()).filter(Boolean),
                    introducedConcepts: bibleConceptsText.split('\n').map((s) => s.trim()).filter(Boolean),
                    continuityHandoffNotes: bibleNotesText.split('\n').map((s) => s.trim()).filter(Boolean),
                  });
                  setShowBibleModal(false);
                }}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
              >
                {lang === 'en' ? 'Save Bible Context' : '儲存連續記憶辭典'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wide 3:9 Split Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Chapter Navigation Strip */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 lg:col-span-3 space-y-2.5 h-fit">
          <span className="text-sm font-bold text-slate-900 block px-1">{t.selectChapterLabel}</span>
          <div className="space-y-1.5">
            {chapters.map((ch, idx) => {
              const isSelected = ch.id === selectedChapterId;
              return (
                <button
                  key={ch.id}
                  onClick={() => handleSelectChapter(ch.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium text-left transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="font-mono text-xs opacity-80 mr-1.5">Ch {idx + 1}</span>
                    <span className="truncate">{ch.title}</span>
                  </div>
                  {ch.isCompleted ? (
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Expansive Manuscript Editor */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-9 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                  {currentChapter?.id || (lang === 'en' ? 'NO CHAPTER' : '尚無章節')}
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  {lang === 'en' ? 'Target' : '目標'}: {currentChapter?.targetWordCount ?? 0} {lang === 'en' ? 'words' : '字'}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-mono text-emerald-700 font-bold">
                  {lang === 'en' ? 'Current' : '當前'}: {wordCount} {lang === 'en' ? 'words' : '字'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {currentChapter?.title || (lang === 'en' ? 'Create chapters in Outline & Structure first' : '請先至「章節大綱規劃」新增章節')}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{t.saveDraft}</span>
              </button>

              {contentDraft.trim().length > 100 && (
                <button
                  type="button"
                  onClick={() => handleGenerateCurrentChapter('polish')}
                  disabled={isGenerating || !canGenerate}
                  className="px-4 py-2 text-sm font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{lang === 'en' ? 'Polish & Deepen' : '商業潤飾'}</span>
                </button>
              )}

              <button
                onClick={() => handleGenerateCurrentChapter('draft')}
                disabled={isGenerating || !canGenerate}
                title={canGenerate ? 'Draft this chapter using retrieved source excerpts' : 'Complete source research and explicitly approve Gate B before generating chapter prose'}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs flex items-center gap-2"
              >
                <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? (lang === 'en' ? 'Generating Content...' : '正在生成中...') : t.generateCurrentChapterBtn}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <details className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
              <summary className="text-sm font-bold cursor-pointer text-slate-800">
                {lang === 'en' ? 'Insert a source citation' : '插入來源引用'}
              </summary>
              <p className="my-3 text-xs text-slate-600 leading-relaxed">
                {lang === 'en'
                  ? 'Review the supporting claims, place the cursor beside the relevant sentence, then insert its source. A library status alone does not establish claim support. After saving the manuscript, review the exact excerpt for each cited passage below.'
                  : '先審查來源支持的論點，將游標置於相關句子旁再插入引用。文獻狀態本身不代表來源支持該論點。'}
              </p>
              <div className="space-y-3">
                {referenceLibrary.cards
                  .filter((card) => currentChapter?.mappedReferenceIds.includes(card.id))
                  .map((card) => (
                    <article key={card.id} className="border border-slate-200 bg-white rounded-xl p-3.5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{card.sourceTitle}</h3>
                        <span className="text-xs font-mono text-slate-600">{card.status}</span>
                      </div>
                      <ul className="text-xs text-slate-600 list-disc pl-4 space-y-1">
                        {card.supportedClaims.map((claim, i) => (
                          <li key={i}>{claim}</li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap items-center gap-4">
                        {/^https?:\/\//i.test(card.sourceURL) && (
                          <a href={card.sourceURL} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-700 font-semibold underline">
                            {lang === 'en' ? 'Open original source' : '開啟原始來源'}
                          </a>
                        )}
                        <button
                          className="text-xs font-semibold px-3.5 py-2 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg"
                          onClick={() => {
                            const position = editorRef.current?.selectionEnd ?? contentDraft.length;
                            const citation = ` [${card.id}]`;
                            setContentDraft(contentDraft.slice(0, position) + citation + contentDraft.slice(position));
                            requestAnimationFrame(() => {
                              editorRef.current?.focus();
                              editorRef.current?.setSelectionRange(position + citation.length, position + citation.length);
                            });
                          }}
                        >
                          {lang === 'en' ? 'Insert' : '插入'} [{card.id}]
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
              {!referenceLibrary.cards.some((card) => currentChapter?.mappedReferenceIds.includes(card.id)) && (
                <p className="text-xs text-slate-600">
                  {lang === 'en' ? 'Map sources to this chapter in Outline & Structure first.' : '請先在章節結構中為本章配置來源。'}
                </p>
              )}
            </details>

            <details className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl">
              <summary className="text-sm font-bold cursor-pointer text-slate-800">
                {lang === 'en' ? 'Add an original or licensed supporting picture' : '新增原創或授權的支持性圖片'}
              </summary>
              <p className="text-xs text-slate-600 my-3">
                Use an original or licensed image that explains this chapter. The export embeds it beside the matching paragraph with credit, rights and a source citation.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-sm">
                <label className="font-semibold text-slate-800">
                  Picture (PNG, JPEG, WebP, up to 4 MB)
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="block w-full mt-1.5 text-xs"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 4 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                        setImageError('Choose a PNG, JPEG or WebP image up to 4 MB.');
                        return;
                      }
                      const dataUri = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result));
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                      });
                      setImageDraft((prev) => ({ ...prev, dataUri }));
                      setImageError('');
                    }}
                  />
                </label>
                {(['alt', 'caption', 'paragraphAnchor', 'credit', 'license'] as const).map((key) => (
                  <label key={key} className="font-semibold text-slate-800">
                    {
                      ({
                        alt: 'Alternative text',
                        caption: 'Figure caption',
                        paragraphAnchor: 'Exact text from the related paragraph',
                        credit: 'Creator / original source credit',
                        license: 'License or ownership and permission',
                      })[key]
                    }
                    <input
                      className="block w-full border border-slate-300 px-3 py-2 rounded-xl mt-1.5 bg-white font-normal"
                      value={imageDraft[key]}
                      onChange={(e) => setImageDraft({ ...imageDraft, [key]: e.target.value })}
                    />
                  </label>
                ))}
                <label className="font-semibold text-slate-800">
                  Supporting reference
                  <select
                    className="block w-full border border-slate-300 px-3 py-2 rounded-xl mt-1.5 bg-white font-normal"
                    value={imageDraft.referenceId}
                    onChange={(e) => setImageDraft({ ...imageDraft, referenceId: e.target.value })}
                  >
                    <option value="">Choose source</option>
                    {referenceLibrary.cards
                      .filter((card) => currentChapter?.mappedReferenceIds.includes(card.id))
                      .map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.id}: {card.sourceTitle}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <button
                    className="px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-semibold"
                    onClick={() => {
                      if (!currentChapter || Object.values(imageDraft).some((value) => !value.trim()) || !contentDraft.includes(imageDraft.paragraphAnchor)) {
                        setImageError('Complete all image fields and use exact paragraph text from this chapter.');
                        return;
                      }
                      onUpdateIllustrations(currentChapter.id, [
                        ...(currentChapter.illustrations || []),
                        { ...imageDraft, id: `FIG-${Date.now()}`, sourceReferenceIds: [imageDraft.referenceId] },
                      ]);
                      setImageError('');
                      setImageDraft({ dataUri: '', alt: '', caption: '', paragraphAnchor: '', credit: '', license: '', referenceId: '' });
                    }}
                  >
                    Add supporting picture
                  </button>
                </div>
              </div>
              {imageError && <p role="alert" className="text-sm text-red-800 mt-3">{imageError}</p>}
              <ul className="mt-3 space-y-2 text-sm">
                {currentChapter?.illustrations?.map((image) => (
                  <li key={image.id} className="flex gap-3 justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                    <span>{image.caption}</span>
                    <button
                      className="text-red-700 font-semibold underline"
                      onClick={() =>
                        onUpdateIllustrations(
                          currentChapter.id,
                          currentChapter.illustrations!.filter((item) => item.id !== image.id)
                        )
                      }
                    >
                      Remove picture
                    </button>
                  </li>
                ))}
              </ul>
            </details>

            {currentChapter && (
              <CitationReviewPanel
                document={currentChapter}
                cards={referenceLibrary.cards}
                disabled={contentDraft !== (currentChapter.contentMarkdown || '')}
                onChange={(reviews) => onReviewCitations(currentChapter.id, reviews)}
              />
            )}

            <textarea
              ref={editorRef}
              aria-label={lang === 'en' ? 'Chapter manuscript' : '章節稿件'}
              rows={22}
              value={contentDraft}
              onChange={(e) => setContentDraft(e.target.value)}
              placeholder={lang === 'en' ? 'Chapter manuscript content in Markdown format...' : '輸入或點擊上方按鈕生成本章 Markdown 實質內容...'}
              className="w-full min-h-[54vh] text-sm font-mono leading-relaxed bg-slate-50 border border-slate-300 rounded-xl p-5 text-slate-900"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-sm">
            <button
              disabled={currentChapterIndex <= 0}
              onClick={() => handleSelectChapter(chapters[currentChapterIndex - 1]?.id)}
              className="px-4 py-2 text-slate-700 hover:text-slate-900 font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{lang === 'en' ? 'Previous Chapter' : '上一章'}</span>
            </button>

            <span className="text-slate-500 font-mono font-semibold">
              {currentChapterIndex + 1} / {chapters.length}
            </span>

            <button
              disabled={currentChapterIndex >= chapters.length - 1}
              onClick={() => handleSelectChapter(chapters[currentChapterIndex + 1]?.id)}
              className="px-4 py-2 text-slate-700 hover:text-slate-900 font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span>{lang === 'en' ? 'Next Chapter' : '下一章'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
