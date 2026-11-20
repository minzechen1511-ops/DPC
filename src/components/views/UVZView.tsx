import { generationError } from '../../utils/gateAJourney.ts';
import { gateAJourneyText } from '../../utils/i18n.ts';
import { gateAApproved } from '../../utils/gateAJourney.ts';
import React, { useMemo, useState } from 'react';
import { Target, CheckCircle2, Plus, Edit3, Save, X, Sparkles, Compass, TrendingUp, Layers } from 'lucide-react';
import { DigitalProductProject, UVZAnalysis } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import {
  ActiveStudioProvider,
  DEFAULT_OPENROUTER_MODEL,
  generateTextWithAi,
  normalizeStudioProvider,
} from '../../services/aiService.ts';
import { SynthesisProgressVisualizer } from '../SynthesisProgressVisualizer.tsx';
import { AiEngineQuickControl, useOpenRouterConnected } from '../AiEngineQuickControl.tsx';
import { AiRateLimitNotice } from '../AiRateLimitNotice.tsx';
import {
  buildUvzSynthesisPrompt,
  parseUvzSynthesisResponse,
  StrategyFocusLens,
  summarizeStrategyContext,
} from '../../utils/strategySynthesis.ts';

interface UVZViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onSelectOption: (optionId: string) => void;
  onUpdateUvz: (uvz: UVZAnalysis, finish?: boolean) => void;
  onUpdateAiSettings?: (settings: any) => void;
  onRecordAiUsage?: (usage?: { total_tokens?: number; estimatedCostUsd?: number }, model?: string, provider?: ActiveStudioProvider) => void;
  lang?: Language;
}

const LENS_OPTIONS: Array<{ id: StrategyFocusLens; labelEn: string; labelZh: string; descEn: string; descZh: string }> = [
  {
    id: 'balanced',
    labelEn: 'Balanced 3-Angle Mix',
    labelZh: '均衡三角定位',
    descEn: 'Quick-start + Toolkit + Deep Mastery',
    descZh: '涵蓋入門、工具包與進階系統',
  },
  {
    id: 'beginner_playbook',
    labelEn: 'Beginner-Friendly Guide',
    labelZh: '新手零門檻手冊',
    descEn: 'Low jargon, step-by-step reassurance',
    descZh: '白話拆解、快速上手少焦慮',
  },
  {
    id: 'action_toolkit',
    labelEn: 'Templates & SOP Toolkit',
    labelZh: '範本與實作套件',
    descEn: 'Worksheets, checklists & plug-and-play assets',
    descZh: '主打工作表、SOP 與即開即用工具',
  },
  {
    id: 'specialist_deep_dive',
    labelEn: 'Specialist Framework',
    labelZh: '專家級方法論',
    descEn: 'Diagnostic rigor & measurable KPIs',
    descZh: '強調系統診斷、排雷與量化成效',
  },
];

export const UVZView: React.FC<UVZViewProps> = ({
  project,
  setActiveView,
  onSelectOption,
  onUpdateUvz,
  onUpdateAiSettings,
  onRecordAiUsage,
  lang = 'en',
}) => {
  const t = translations[lang];
  const journey = gateAJourneyText[lang];
  const { uvz } = project;
  const options = uvz?.positioningOptions || [];

  const contextSummary = useMemo(() => summarizeStrategyContext(project, lang), [project, lang]);

  const [lens, setLens] = useState<StrategyFocusLens>('balanced');
  const [focusNote, setFocusNote] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState('');
  const [fallbackNotice, setFallbackNotice] = useState('');
  const openrouterConnected = useOpenRouterConnected();

  const [showAddOption, setShowAddOption] = useState(false);
  const [newOpt, setNewOpt] = useState({ name: '', angle: '', targetPersona: '', promise: '', pros: '', risks: '' });
  const [editingProblems, setEditingProblems] = useState(false);
  const [problemsText, setProblemsText] = useState((uvz?.buyerProblems || []).join('\n'));
  const [solutionsText, setSolutionsText] = useState((uvz?.potentialSolutions || []).join('\n'));
  const [differentiationText, setDifferentiationText] = useState((uvz?.differentiationOpportunities || []).join('\n'));
  const [expertiseFitText, setExpertiseFitText] = useState(uvz?.creatorExpertiseFit || '');
  const [feasibilityText, setFeasibilityText] = useState(uvz?.commercialFeasibility || '');

  const handleSynthesizeUvzWithAi = async (overrideModel?: string, overrideProvider?: ActiveStudioProvider) => {
    if (aiBusy || !gateAApproved(project)) return;
    setAiBusy(true);
    setAiError('');
    setAiSuccess('');
    setFallbackNotice('');
    const activeProvider =
      overrideProvider ||
      normalizeStudioProvider(project.aiSettings?.provider, project.aiSettings?.defaultModel);
    const activeModel =
      overrideModel ||
      project.aiSettings?.defaultModel ||
      (activeProvider === 'openrouter' ? DEFAULT_OPENROUTER_MODEL : 'gemini-4-hydrogen');
    try {
      const { systemPrompt, userPrompt } = buildUvzSynthesisPrompt(project, lang, {
        lens,
        focusNote,
      });
      const res = await generateTextWithAi({
        provider: activeProvider,
        model: activeModel,
        tokenSaverMode: project.aiSettings?.tokenSaverMode || 'economy',
        allowRateLimitFallback: project.aiSettings?.allowRateLimitFallback ?? true,
        systemPrompt,
        userPrompt,
        maxTokens: 8192,
        responseFormat: 'json',
        responseSchema: 'uvz',
        projectId: project.projectId,
      });
      onRecordAiUsage?.(res?.usage, res?.model, res?.provider);
      const fallbackTag = res?.fallbackUsed
        ? lang === 'en'
          ? `Auto-switched from ${res.primaryModel} to ${res.model} to avoid 429 quota block.`
          : `已自動從 ${res.primaryModel} 切換至 ${res.model} 以避開限流。`
        : '';
      if (fallbackTag) setFallbackNotice(fallbackTag);
      const nextUvz = parseUvzSynthesisResponse(res?.content || '', uvz);
      onUpdateUvz({...nextUvz, selectedOptionId: '', creatorExpertiseFit: !project.intake.expertise.trim() && !project.intake.relevantExperience.trim() ? (lang === 'en' ? 'Creator expertise is unknown. Topic evidence is not proof of creator-market fit; arrange qualified expert review for specialist claims.' : '創作者專業背景未知。題材證據不代表已證實創作者適配；專業主張需安排合格專家覆核。') : nextUvz.creatorExpertiseFit});
      setEditingProblems(false);
      setAiSuccess(
        (lang === 'en'
          ? `Synthesized ${nextUvz.positioningOptions.length} UVZ positioning angles, pain matrix, and feasibility analysis.`
          : `已自動分析題材並生成 ${nextUvz.positioningOptions.length} 個 UVZ 定位方案、痛點矩陣與商業可行性評估。`) +
          (fallbackTag ? ` (${fallbackTag})` : '')
      );
    } catch (err: any) {
      setAiError(generationError(err, lang));
    } finally {
      setAiBusy(false);
    }
  };

  const handleSwitchToFlashLiteAndRetry = () => {
    if (onUpdateAiSettings) {
      onUpdateAiSettings({
        ...project.aiSettings,
        provider: 'gemini',
        apiKey: '',
        baseUrl: '',
        apiKeys: { openrouter: '', gemini: '', openai: '', claude: '' },
        defaultModel: 'gemini-3.1-flash-lite',
        tokenSaverMode: 'economy',
        providerModels: {
          ...project.aiSettings?.providerModels,
          gemini: 'gemini-3.1-flash-lite',
        },
      });
    }
    void handleSynthesizeUvzWithAi('gemini-3.1-flash-lite', 'gemini');
  };

  const handleSwitchToOpenRouterAndRetry = () => {
    const nextModel = project.aiSettings?.providerModels?.openrouter || DEFAULT_OPENROUTER_MODEL;
    if (onUpdateAiSettings) {
      onUpdateAiSettings({
        ...project.aiSettings,
        provider: 'openrouter',
        apiKey: '',
        baseUrl: '',
        apiKeys: { openrouter: '', gemini: '', openai: '', claude: '' },
        defaultModel: nextModel,
        providerModels: {
          ...project.aiSettings?.providerModels,
          openrouter: nextModel,
        },
      });
    }
    void handleSynthesizeUvzWithAi(nextModel, 'openrouter');
  };

  const handleCreateOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpt.name.trim()) return;
    const id = `UVZ-${String(options.length + 1).padStart(2, '0')}`;
    const updated: UVZAnalysis = {
      ...uvz,
      positioningOptions: [
        ...options,
        {
          id,
          name: newOpt.name.trim(),
          angle: newOpt.angle.trim(),
          targetPersona: newOpt.targetPersona.trim(),
          promise: newOpt.promise.trim(),
          pros: newOpt.pros.trim() || (lang === 'en' ? 'Clear buyer focus' : '聚焦明確買家需求'),
          risks: newOpt.risks.trim() || (lang === 'en' ? 'Requires evidence validation' : '需搭配真實案例驗證'),
          isRecommended: options.length === 0,
        },
      ],
      selectedOptionId: id,
    };
    onUpdateUvz(updated, true);
    setNewOpt({ name: '', angle: '', targetPersona: '', promise: '', pros: '', risks: '' });
    setShowAddOption(false);
  };

  const handleSaveProblems = () => {
    onUpdateUvz({
      ...uvz,
      buyerProblems: problemsText.split('\n').map((s) => s.trim()).filter(Boolean),
      potentialSolutions: solutionsText.split('\n').map((s) => s.trim()).filter(Boolean),
      differentiationOpportunities: differentiationText.split('\n').map((s) => s.trim()).filter(Boolean),
      creatorExpertiseFit: expertiseFitText.trim(),
      commercialFeasibility: feasibilityText.trim(),
    }, Boolean(uvz.selectedOptionId) && project.workflow.stageStatuses.uvz !== 'NEEDS_REVIEW');
    setEditingProblems(false);
  };

  return (
    <div className="w-full space-y-5 pb-3">
      {/* Header */}
      <div className="lab-panel p-6 lg:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-teal-700 mb-1.5">
            <Target className="w-4 h-4" />
            <span>{t.navUvz}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t.uvzTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">{t.uvzSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">


          <button
            type="button"
            onClick={() => setShowAddOption((v) => !v)}
            className="px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-2"
          >
            {showAddOption ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showAddOption ? (lang === 'en' ? 'Cancel' : '取消') : (lang === 'en' ? 'Add Custom Positioning' : '新增自訂定位')}</span>
          </button>

          <button
            type="button"
            disabled={aiBusy || !gateAApproved(project)}
            onClick={() => {
              if (!options.length || project.workflow.stageStatuses.uvz === 'NEEDS_REVIEW') { void handleSynthesizeUvzWithAi(); return; }
              const selected = options.find(option => option.id === uvz.selectedOptionId) || options.find(option => option.isRecommended) || options[0];
              onSelectOption(selected.id);

            }}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <span>{!options.length || project.workflow.stageStatuses.uvz === 'NEEDS_REVIEW' ? journey.generateUvz : options.some(option => option.id === uvz.selectedOptionId) ? (lang === 'en' ? 'Continue with selected positioning' : '使用所選定位並繼續') : journey.continueUvz}</span>
          </button>
        </div>
      </div>

      {options.length > 0 && project.workflow.stageStatuses.uvz === 'NEEDS_REVIEW' && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{lang === 'en' ? 'The approved topic or brief changed. These positioning options are older drafts. Generate again or review/edit an option before explicitly choosing to use it.' : '核准題材或簡報已變更，下方定位為舊草稿。請重新生成，或審查／編輯方案後再明確選擇採用。'}</p>}
      <p className="text-sm text-slate-700">{lang === 'en' ? 'Uses your approved niche and available brief. Compare the recommendation, audience, promise, advantages and risks. Choose any option or add your own; no expertise or sales result is assumed.' : '承接已核准題材與現有簡報。請比較推薦理由、受眾、主張、優勢及風險；可任選方案或自訂，不預設專業能力或銷售成果。'}</p>
      <AiEngineQuickControl
        project={project}
        onUpdateAiSettings={onUpdateAiSettings}
        onOpenAiSettings={() => setActiveView('ai_settings')}
        disabled={aiBusy}
        fallbackNotice={fallbackNotice}
        lang={lang}
      />

      <div aria-live="polite">
        {aiBusy && (
          <SynthesisProgressVisualizer
            stage="uvz"
            model={project.aiSettings?.defaultModel || 'gemini-4-hydrogen'}
            contextTitle={contextSummary.topicTitle}
            lang={lang}
          />
        )}
        {aiError && (
          <AiRateLimitNotice
            errorMessage={aiError}
            currentModel={project.aiSettings?.defaultModel || 'gemini-4-hydrogen'}
            draftRetained={true}
            busy={aiBusy}
            openrouterConnected={openrouterConnected}
            onRetry={() => void handleSynthesizeUvzWithAi()}
            onSwitchToFlashLiteAndRetry={handleSwitchToFlashLiteAndRetry}
            onSwitchToOpenRouterAndRetry={handleSwitchToOpenRouterAndRetry}
            onOpenAiSettings={() => setActiveView('ai_settings')}
            lang={lang}
          />
        )}
      </div>
      <details><summary className="cursor-pointer font-semibold text-teal-800 p-3 focus-visible:outline-2">{lang === 'en' ? 'Optional AI settings and regeneration' : '選用 AI 設定與重新生成'}</summary>
      {/* Guided Automated Synthesis Bar (Digital Product Studio Style) */}
      <div className="lab-panel p-6 lg:p-7 space-y-5 bg-gradient-to-br from-white via-teal-50/20 to-sky-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-700" />
              <span>
                {lang === 'en'
                  ? 'Optional positioning draft settings'
                  : 'AI 智慧選題定位分析器（根據核准脈絡生成草稿）'}
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {lang === 'en'
                ? 'Optionally adjust the focus. Gemini uses the approved topic and available brief to draft three positioning options. Missing expertise remains a knowledge gap requiring review.'
                : '可選擇調整策略切角。Gemini 將依核准題材與現有簡報生成三個定位草稿；未知的專業背景仍屬待審查的知識缺口。'}
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-md shrink-0">
            {lang === 'en' ? `Format: ${contextSummary.productFormat}` : `產品格式：${contextSummary.productFormat}`}
          </span>
        </div>

        {/* Detected Upstream Context Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
              {lang === 'en' ? 'Analyzed Topic Concept' : '分析題材概念'}
            </div>
            <div className="font-semibold text-slate-900 leading-snug">{contextSummary.topicTitle}</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
              {lang === 'en' ? 'Target Audience Signal' : '目標客群輪廓'}
            </div>
            <div className="text-slate-700 leading-snug">{contextSummary.targetAudience}</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
              {lang === 'en' ? 'Primary Problem Signal' : '核心解決痛點'}
            </div>
            <div className="text-slate-700 leading-snug">{contextSummary.coreProblem}</div>
          </div>
        </div>

        {/* Lens Selector */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
            {lang === 'en' ? '1. Choose Synthesis Strategic Lens' : '1. 選擇策略切角方向'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {LENS_OPTIONS.map((opt) => {
              const active = lens === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLens(opt.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    active
                      ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-bold text-slate-900">
                    {lang === 'en' ? opt.labelEn : opt.labelZh}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {lang === 'en' ? opt.descEn : opt.descZh}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Guidance + Trigger */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-end">
          <label className="flex-1 block">
            <span className="text-xs font-bold text-slate-800 block mb-1.5">
              {lang === 'en'
                ? '2. Optional Focus Hint (leave blank to use the approved project context)'
                : '2. 補充指引或偏好關鍵字（可留白，使用已核准的專案脈絡）'}
            </span>
            <input
              type="text"
              value={focusNote}
              onChange={(e) => setFocusNote(e.target.value)}
              placeholder={
                lang === 'en'
                  ? 'e.g. Emphasize quick 15-minute daily workflows, beginner clarity, or printable templates...'
                  : '例如：希望強調零基礎 15 分鐘上手、附可直接列印工作表，或主打低時間成本...'
              }
              className="w-full"
            />
          </label>
          <button
            type="button"
            disabled={aiBusy}
            onClick={() => void handleSynthesizeUvzWithAi()}
            className="px-6 py-3 text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm disabled:opacity-60"
          >
            <Sparkles className={`w-4 h-4 ${aiBusy ? 'animate-spin' : ''}`} />
            <span>
              {aiBusy
                ? lang === 'en' ? 'Analyzing Topic & Generating...' : '正在深度分析並生成定位...'
                : lang === 'en' ? 'Generate UVZ Options & Pain Matrix' : '自動生成 3 種定位與痛點矩陣'}
            </span>
          </button>
        </div>

        {aiSuccess && (
          <p role="status" className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium">
            {aiSuccess}
          </p>
        )}
      </div>

      {showAddOption && (
        <form onSubmit={handleCreateOption} className="lab-panel border-teal-300 p-6 lg:p-7 space-y-4 text-sm">
          <h2 className="text-base font-bold text-slate-900">{lang === 'en' ? 'New Custom UVZ Positioning Angle' : '新增專屬價值定位切角'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder={lang === 'en' ? 'Positioning Name (e.g. Zero-Friction SOP Kit)' : '定位名稱'} value={newOpt.name} onChange={(e) => setNewOpt({ ...newOpt, name: e.target.value })} />
            <input required placeholder={lang === 'en' ? 'Target Buyer Persona' : '目標客群輪廓'} value={newOpt.targetPersona} onChange={(e) => setNewOpt({ ...newOpt, targetPersona: e.target.value })} />
            <input required placeholder={lang === 'en' ? 'Competitive Differentiation Angle' : '競爭差異化切入點'} value={newOpt.angle} onChange={(e) => setNewOpt({ ...newOpt, angle: e.target.value })} />
            <input required placeholder={lang === 'en' ? 'Core Transformation Promise' : '核心價值承諾'} value={newOpt.promise} onChange={(e) => setNewOpt({ ...newOpt, promise: e.target.value })} />
            <input placeholder={lang === 'en' ? 'Strengths / Pros (optional)' : '方案優勢（選填）'} value={newOpt.pros} onChange={(e) => setNewOpt({ ...newOpt, pros: e.target.value })} />
            <input placeholder={lang === 'en' ? 'Risks / Validation Scope (optional)' : '風險與驗證重點（選填）'} value={newOpt.risks} onChange={(e) => setNewOpt({ ...newOpt, risks: e.target.value })} />
          </div>
          <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">
            {lang === 'en' ? 'Use this positioning & continue' : '採用此定位並繼續'}
          </button>
        </form>
      )}

      </details>
      {/* Positioning Alternatives */}
      <div className="lab-panel p-6 lg:p-7 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">{t.positioningTitle}</h2>
          <span className="text-xs font-mono text-slate-500">
            {options.length > 0
              ? lang === 'en'
                ? `${options.length} Options · Selected: ${uvz.selectedOptionId || 'None'}`
                : `${options.length} 個備選定位 · 目前選定：${uvz.selectedOptionId || '尚未選擇'}`
              : lang === 'en'
              ? 'No options generated yet'
              : '尚未產生定位選項'}
          </span>
        </div>

        {options.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center space-y-3">
            <p className="text-sm text-slate-700 max-w-2xl mx-auto">
              {lang === 'en'
                ? 'Use “Generate 3 positioning options” to draft suggestions from your approved topic and brief, or add custom positioning. Each option still needs buyer validation.'
                : '請使用「生成 3 個定位方案」，依核准題材與簡報起草建議，或新增自訂定位。每個方案仍需買家驗證。'}
            </p>

          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {options.map((opt) => {
              const isSelected = uvz.selectedOptionId === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`bg-slate-50/70 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/25 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold text-teal-800 font-mono bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-md">{opt.id}</span>
                      {opt.isRecommended && (
                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {lang === 'en' ? 'Suggested · review before use' : '建議 · 採用前請審閱'}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">{opt.name}</h3>
                    <p className="text-sm text-slate-600 mb-4">{opt.angle}</p>

                    <div className="space-y-2.5 text-sm text-slate-700 py-3.5 border-t border-slate-200/80">
                      <div>
                        <span className="text-slate-500 text-xs block">{t.targetAudienceLabel}:</span>
                        <strong className="text-slate-900">{opt.targetPersona}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs block">{t.bigPromiseLabel}:</span>
                        <span className="text-slate-700">{opt.promise}</span>
                      </div>
                      <div className="pt-2 text-xs text-emerald-800">
                        <strong>{lang === 'en' ? (opt.isRecommended ? 'Why recommended:' : 'Advantages:') : (opt.isRecommended ? '推薦理由：' : '優勢：')}</strong> {opt.pros}
                      </div>
                      <div className="text-xs text-slate-600">
                        <strong>{lang === 'en' ? 'Risks:' : '風險考量：'}</strong> {opt.risks}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectOption(opt.id)}
                    className={`w-full mt-4 py-2.5 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSelected ? (lang === 'en' ? 'Selected' : '已選定') : t.selectPositioningBtn}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Buyer Problems, Core Solutions & Commercial Strategic Fit */}
      <div className="lab-panel p-6 lg:p-7 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            {lang === 'en'
              ? 'Buyer Pain Matrix, Core Solutions & Commercial Feasibility'
              : '買家痛點矩陣、核心解方與商業可行性評估'}
          </h2>
          {editingProblems ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingProblems(false)}
                className="px-3 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                {lang === 'en' ? 'Cancel' : '取消'}
              </button>
              <button
                type="button"
                onClick={handleSaveProblems}
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{uvz.selectedOptionId && project.workflow.stageStatuses.uvz !== 'NEEDS_REVIEW' ? (lang === 'en' ? 'Save analysis & continue' : '儲存分析並繼續') : (lang === 'en' ? 'Save analysis' : '儲存分析')}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setProblemsText((uvz?.buyerProblems || []).join('\n'));
                setSolutionsText((uvz?.potentialSolutions || []).join('\n'));
                setDifferentiationText((uvz?.differentiationOpportunities || []).join('\n'));
                setExpertiseFitText(uvz?.creatorExpertiseFit || '');
                setFeasibilityText(uvz?.commercialFeasibility || '');
                setEditingProblems(true);
              }}
              className="text-sm font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1.5"
            >
              <Edit3 className="w-4 h-4" />
              <span>{lang === 'en' ? 'Edit Matrix & Fit' : '編輯分析與清單'}</span>
            </button>
          )}
        </div>

        {editingProblems ? (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="block space-y-1.5">
                <span className="font-bold text-slate-800">{t.buyerProblemsTitle} ({lang === 'en' ? 'one per line' : '每行一項'})</span>
                <textarea rows={6} value={problemsText} onChange={(e) => setProblemsText(e.target.value)} className="w-full" />
              </label>
              <label className="block space-y-1.5">
                <span className="font-bold text-slate-800">{t.solutionsTitle} ({lang === 'en' ? 'one per line' : '每行一項'})</span>
                <textarea rows={6} value={solutionsText} onChange={(e) => setSolutionsText(e.target.value)} className="w-full" />
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <label className="block space-y-1.5">
                <span className="font-bold text-slate-800">{lang === 'en' ? 'Creator Expertise Fit' : '創作者優勢契合度'}</span>
                <textarea rows={4} value={expertiseFitText} onChange={(e) => setExpertiseFitText(e.target.value)} className="w-full" />
              </label>
              <label className="block space-y-1.5">
                <span className="font-bold text-slate-800">{lang === 'en' ? 'Commercial Feasibility' : '商業變現可行性'}</span>
                <textarea rows={4} value={feasibilityText} onChange={(e) => setFeasibilityText(e.target.value)} className="w-full" />
              </label>
              <label className="block space-y-1.5">
                <span className="font-bold text-slate-800">{lang === 'en' ? 'Differentiation Opportunities (one per line)' : '市場差異化切入點（每行一項）'}</span>
                <textarea rows={4} value={differentiationText} onChange={(e) => setDifferentiationText(e.target.value)} className="w-full" />
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-3">{t.buyerProblemsTitle}</h3>
                {(uvz?.buyerProblems || []).length === 0 ? (
                  <p className="text-sm text-slate-500">{lang === 'en' ? 'Run AI Synthesis above to uncover buyer pain points.' : '請點擊上方 AI 一鍵生成以自動剖析買家痛點。'}</p>
                ) : (
                  <ul className="space-y-2.5 text-sm text-slate-700">
                    {(uvz?.buyerProblems || []).map((prob, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-sm bg-rose-500 mt-1.5 shrink-0" />
                        <span>{prob}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-3">{t.solutionsTitle}</h3>
                {(uvz?.potentialSolutions || []).length === 0 ? (
                  <p className="text-sm text-slate-500">{lang === 'en' ? 'Run AI Synthesis above to map solution mechanisms.' : '請點擊上方 AI 一鍵生成以自動對應核心解方。'}</p>
                ) : (
                  <ul className="space-y-2.5 text-sm text-slate-700">
                    {(uvz?.potentialSolutions || []).map((sol, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-sm bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{sol}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="p-5 bg-sky-50/40 rounded-xl border border-sky-200/80 space-y-2">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-sky-800 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Creator Expertise Fit' : '創作者優勢契合度'}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {uvz?.creatorExpertiseFit || (lang === 'en' ? 'Creator expertise is unresolved until you provide actual background.' : '在您提供實際背景前，創作者專業適配仍待確認。')}
                </p>
              </div>

              <div className="p-5 bg-teal-50/40 rounded-xl border border-teal-200/80 space-y-2">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Commercial Feasibility' : '商業變現可行性'}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {uvz?.commercialFeasibility || (lang === 'en' ? 'Generate a draft to identify commercial assumptions and the buyer validation still needed.' : '生成草稿後將列出商業假設與仍需進行的買家驗證。')}
                </p>
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'White-Space Differentiation' : '競爭差異化空白機會'}</span>
                </div>
                {(uvz?.differentiationOpportunities || []).length === 0 ? (
                  <p className="text-sm text-slate-500">—</p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-slate-700 list-disc list-inside">
                    {(uvz?.differentiationOpportunities || []).map((diff, idx) => (
                      <li key={idx}>{diff}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
