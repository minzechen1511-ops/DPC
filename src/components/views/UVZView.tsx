import React, { useMemo, useState } from 'react';
import { Target, CheckCircle2, Plus, Edit3, Save, X, Sparkles, Compass, TrendingUp, Layers } from 'lucide-react';
import { DigitalProductProject, UVZAnalysis } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { generateTextWithAi } from '../../services/aiService.ts';
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
  onUpdateUvz: (uvz: UVZAnalysis) => void;
  onRecordAiUsage?: (usage?: { total_tokens?: number; estimatedCostUsd?: number }, model?: string) => void;
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
  onRecordAiUsage,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { uvz } = project;
  const options = uvz?.positioningOptions || [];

  const contextSummary = useMemo(() => summarizeStrategyContext(project, lang), [project, lang]);

  const [lens, setLens] = useState<StrategyFocusLens>('balanced');
  const [focusNote, setFocusNote] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState('');

  const [showAddOption, setShowAddOption] = useState(false);
  const [newOpt, setNewOpt] = useState({ name: '', angle: '', targetPersona: '', promise: '', pros: '', risks: '' });
  const [editingProblems, setEditingProblems] = useState(false);
  const [problemsText, setProblemsText] = useState((uvz?.buyerProblems || []).join('\n'));
  const [solutionsText, setSolutionsText] = useState((uvz?.potentialSolutions || []).join('\n'));
  const [differentiationText, setDifferentiationText] = useState((uvz?.differentiationOpportunities || []).join('\n'));
  const [expertiseFitText, setExpertiseFitText] = useState(uvz?.creatorExpertiseFit || '');
  const [feasibilityText, setFeasibilityText] = useState(uvz?.commercialFeasibility || '');

  const handleSynthesizeUvzWithAi = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    setAiError('');
    setAiSuccess('');
    try {
      const { systemPrompt, userPrompt } = buildUvzSynthesisPrompt(project, lang, {
        lens,
        focusNote,
      });
      const res = await generateTextWithAi({
        provider: 'gemini',
        model: project.aiSettings?.defaultModel || 'gemini-4-hydrogen',
        systemPrompt,
        userPrompt,
        maxTokens: 2000,
        projectId: project.projectId,
      });
      onRecordAiUsage?.(res?.usage, res?.model);
      const nextUvz = parseUvzSynthesisResponse(res?.content || '', uvz);
      onUpdateUvz(nextUvz);
      setEditingProblems(false);
      setAiSuccess(
        lang === 'en'
          ? `Synthesized ${nextUvz.positioningOptions.length} UVZ positioning angles, pain matrix, and feasibility analysis.`
          : `已自動分析題材並生成 ${nextUvz.positioningOptions.length} 個 UVZ 定位方案、痛點矩陣與商業可行性評估。`
      );
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
    onUpdateUvz(updated);
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
    });
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
            disabled={aiBusy}
            onClick={handleSynthesizeUvzWithAi}
            className="px-4 py-2.5 text-sm font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <Sparkles className={`w-4 h-4 text-teal-700 ${aiBusy ? 'animate-spin' : ''}`} />
            <span>
              {aiBusy
                ? lang === 'en' ? 'Synthesizing UVZ...' : 'AI 分析定位中...'
                : lang === 'en' ? 'AI Synthesize UVZ' : 'AI 一鍵生成 UVZ 定位'}
            </span>
          </button>

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
            onClick={() => setActiveView('transformation_map')}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <span>{t.approveUvzCta}</span>
          </button>
        </div>
      </div>

      {/* Guided Automated Synthesis Bar (Synthesise.ai Style) */}
      <div className="lab-panel p-6 lg:p-7 space-y-5 bg-gradient-to-br from-white via-teal-50/20 to-sky-50/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-700" />
              <span>
                {lang === 'en'
                  ? 'Automated Topic-to-UVZ Positioning Synthesizer'
                  : 'AI 智慧選題定位分析器（免盲猜自動生成建議）'}
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {lang === 'en'
                ? 'Unfamiliar with this niche? Select a strategic focus below and let Gemini analyze your Gate A niche + 13-Field Brief into 3 commercial positioning options, pain points, and differentiation angles.'
                : '對所選主題還不夠熟悉？選擇下方策略切角並點擊生成，系統將根據 Gate A 市場題材與 13 項專案設定，自動推演 3 種商業定位、買家痛點與競爭差異化機會。'}
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
                ? '2. Optional Focus Hint (leave blank for fully automated market analysis)'
                : '2. 補充指引或偏好關鍵字（可留白，由 AI 全自動分析）'}
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
            onClick={handleSynthesizeUvzWithAi}
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
        {aiError && (
          <p role="alert" className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-sm font-medium">
            {aiError}
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
            {lang === 'en' ? 'Save Positioning Option' : '儲存定位方案'}
          </button>
        </form>
      )}

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
                ? 'No positioning options defined yet. Click "Generate UVZ Options & Pain Matrix" above to automatically create 3 buyer-validated angles tailored to your topic.'
                : '目前尚未建立定位方案。請點擊上方「自動生成 3 種定位與痛點矩陣」，讓系統根據您的主題自動設計 3 種商業切角供您挑選。'}
            </p>
            <button
              type="button"
              disabled={aiBusy}
              onClick={handleSynthesizeUvzWithAi}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl inline-flex items-center gap-2 disabled:opacity-60"
            >
              <Sparkles className={`w-4 h-4 ${aiBusy ? 'animate-spin' : ''}`} />
              <span>{lang === 'en' ? 'Auto-Generate 3 Positioning Options' : '立即 AI 自動生成 3 種定位'}</span>
            </button>
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
                          {lang === 'en' ? 'Recommended' : '推薦方案'}
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
                        <strong>{lang === 'en' ? 'Pros:' : '優勢：'}</strong> {opt.pros}
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
                <span>{lang === 'en' ? 'Save Analysis' : '儲存分析'}</span>
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
                  {uvz?.creatorExpertiseFit || (lang === 'en' ? 'Run AI Synthesis to evaluate creator-to-topic credibility.' : '執行 AI 分析後將顯示創作者與此題材的可信度切入評估。')}
                </p>
              </div>

              <div className="p-5 bg-teal-50/40 rounded-xl border border-teal-200/80 space-y-2">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Commercial Feasibility' : '商業變現可行性'}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {uvz?.commercialFeasibility || (lang === 'en' ? 'Run AI Synthesis to evaluate pricing ladder & demand fit.' : '執行 AI 分析後將顯示需求迫切度與套件定價變現評估。')}
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
