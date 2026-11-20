import { gateIssues } from '../../utils/gatePolicy.ts';
import {firstUnfinishedPrerequisite} from '../../utils/stageJourney.ts';
import {charterFromSetup} from '../../utils/researchPlanning.ts';
import React, { useState, useEffect, useMemo } from 'react';
import { Compass, CheckCircle2, AlertTriangle, Edit3, Save, X, Sparkles } from 'lucide-react';
import { DigitalProductProject, ProductCharter, ProductFormat } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import {
  ActiveStudioProvider,
  DEFAULT_OPENROUTER_MODEL,
  generateTextWithAi,
  normalizeStudioProvider,
} from '../../services/aiService.ts';
import { buildCharterSynthesisPrompt, parseCharterSynthesisResponse } from '../../utils/stageSynthesis.ts';
import { generationError } from '../../utils/gateAJourney.ts';
import { AiEngineQuickControl, useOpenRouterConnected } from '../AiEngineQuickControl.tsx';
import { AiRateLimitNotice } from '../AiRateLimitNotice.tsx';

interface ProductCharterViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onApproveGateB: (proposal: ProductCharter) => Promise<boolean>;
  onUpdateCharter: (charter: ProductCharter) => void;
  onUpdateAiSettings?: (settings: any) => void;
  onRecordAiUsage?: (usage?: { total_tokens?: number; estimatedCostUsd?: number }, model?: string, provider?: ActiveStudioProvider) => void;
  checkingReferences?: boolean;
  lang?: Language;
}

export const ProductCharterView: React.FC<ProductCharterViewProps> = ({
  project,
  setActiveView,
  onApproveGateB,
  onUpdateCharter,
  onUpdateAiSettings,
  onRecordAiUsage,
  checkingReferences = false,
  lang = 'en',
}) => {
  const t = translations[lang];
  const charter = useMemo(() => charterFromSetup(project), [project]);
  const blockers = gateIssues({...project, charter}, 'gateB');
  const { workflow } = project;
  const earlier = firstUnfinishedPrerequisite(project,'product_charter');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProductCharter>(charter);
  const [disclaimersText, setDisclaimersText] = useState((charter?.explicitDisclaimers || []).join('\n'));
  const [pillarsText, setPillarsText] = useState((charter?.structuralPillars || []).join('\n'));
  const [objectivesText, setObjectivesText] = useState((charter?.learningObjectives || []).join('\n'));
  const [savedNotice, setSavedNotice] = useState(false);
  const [focusNote, setFocusNote] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState('');
  const [fallbackNotice, setFallbackNotice] = useState('');
  const openrouterConnected = useOpenRouterConnected();

  useEffect(() => {
    if (editing) return;
    setDraft(charter);
    setDisclaimersText((charter?.explicitDisclaimers || []).join('\n'));
    setPillarsText((charter?.structuralPillars || []).join('\n'));
    setObjectivesText((charter?.learningObjectives || []).join('\n'));
  }, [charter, editing]);

  const handleSaveCharter = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ProductCharter = {
      ...draft,
      explicitDisclaimers: disclaimersText.split('\n').map((s) => s.trim()).filter(Boolean),
      structuralPillars: pillarsText.split('\n').map((s) => s.trim()).filter(Boolean),
      learningObjectives: objectivesText.split('\n').map((s) => s.trim()).filter(Boolean),
      isApproved: false,
      approvedAt: undefined,
    };
    onUpdateCharter(updated);
    setEditing(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleSynthesizeCharter = async (overrideModel?: string, overrideProvider?: ActiveStudioProvider) => {
    if (aiBusy) return;
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
      const { systemPrompt, userPrompt } = buildCharterSynthesisPrompt(project, lang, focusNote);
      const res = await generateTextWithAi({
        provider: activeProvider,
        model: activeModel,
        tokenSaverMode: project.aiSettings?.tokenSaverMode || 'economy',
        allowRateLimitFallback: project.aiSettings?.allowRateLimitFallback ?? true,
        systemPrompt,
        userPrompt,
        maxTokens: 2000,
        projectId: project.projectId,
      });
      onRecordAiUsage?.(res?.usage, res?.model, res?.provider);
      const fallbackTag = res?.fallbackUsed
        ? lang === 'en'
          ? `Auto-switched from ${res.primaryModel} to ${res.model} to avoid 429 quota block.`
          : `已自動從 ${res.primaryModel} 切換至 ${res.model} 以避開限流。`
        : '';
      if (fallbackTag) setFallbackNotice(fallbackTag);
      const refined = parseCharterSynthesisResponse(res?.content || '', charter);
      const updated = {...refined, productTitle:charter.productTitle || refined.productTitle, subtitle:charter.subtitle || refined.subtitle};
      setDraft(updated);
      setDisclaimersText((updated.explicitDisclaimers || []).join('\n'));
      setPillarsText((updated.structuralPillars || []).join('\n'));
      setObjectivesText((updated.learningObjectives || []).join('\n'));
      onUpdateCharter(updated);
      setAiSuccess(
        (lang === 'en'
          ? 'Product Charter aligned with your UVZ, Transformation Map & Title Selection. Review Gate B requirements and approve when ready.'
          : '已結合 UVZ 定位與顧客轉變藍圖自動合成產品憲章。請確認 Gate B 項目後核准進入大綱階段。') +
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
    void handleSynthesizeCharter('gemini-3.1-flash-lite', 'gemini');
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
    void handleSynthesizeCharter(nextModel, 'openrouter');
  };

  return (
    <div className="w-full space-y-5 pb-3">
      {blockers.length > 0 && (
        <details className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-950">
          <summary className="font-bold cursor-pointer">
            {lang === 'en' ? 'Review requirements before approval' : '核准前請完成審查要求'}
          </summary>
          <ul className="list-disc pl-5 mt-2.5 space-y-1.5">
            {blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      )}

      {/* Top Banner */}
      <div className="lab-panel p-6 lg:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-teal-700 mb-1.5">
            <Compass className="w-4 h-4" />
            <span>GATE B — {t.charterTitle}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t.charterTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">{t.charterSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-2"
          >
            {editing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            <span>
              {editing
                ? lang === 'en' ? 'Cancel Edit' : '取消編輯'
                : lang === 'en' ? 'Edit Charter' : '編輯產品憲章'}
            </span>
          </button>

          <button
            type="button"
            disabled={Boolean(earlier) || blockers.length > 0 || checkingReferences || editing || aiBusy}
            title={blockers.join(' ')}
            onClick={async () => {
              if (blockers.length) return;
              if (await onApproveGateB(charter)) setActiveView('outline_builder');
            }}
            className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 shadow-sm whitespace-nowrap ${
              workflow?.gates?.gateB?.isApproved
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{checkingReferences ? (lang==='en' ? 'Checking sources…' : '正在查核來源…') : workflow.gates.gateB.isApproved ? (lang==='en' ? 'Continue to Outline' : '繼續至大綱') : (lang==='en' ? 'Approve this charter at Gate B' : '在 Gate B 核准此憲章')}</span>
          </button>
        </div>
      </div>

      <section className="lab-panel space-y-4 p-5">
        <div><p className="text-sm font-semibold text-teal-800">{lang==='en' ? 'Recommended product plan' : '建議產品計畫'}</p><h2 className="text-xl font-bold text-slate-900">{charter.productTitle}</h2><p className="text-sm text-slate-600">{charter.subtitle}</p></div>
        <div className="grid gap-4 md:grid-cols-2"><div><h3 className="font-semibold">{lang==='en' ? 'Who it helps' : '目標讀者'}</h3><p className="text-sm">{charter.targetAudience}</p></div><div><h3 className="font-semibold">{lang==='en' ? 'What they will make or learn' : '讀者將產出或學會什麼'}</h3><ul className="list-disc space-y-1 pl-5 text-sm">{charter.learningObjectives.map((goal,i)=><li key={i}>{goal}</li>)}</ul></div></div>
        {charter.companionResourcePlan.length>0 && <p className="text-sm text-slate-700"><strong>{lang==='en'?'Included tools':'搭配工具'}</strong> · {charter.companionResourcePlan.join(' · ')}</p>}
        {charter.companionResourcePlan[0] && <p className="border-t border-teal-100 pt-3 text-sm text-slate-700"><strong>{lang==='en'?'Buyer validation to try':'建議的買家驗證'}</strong> · {lang==='en'
          ? `Show “${charter.companionResourcePlan[0]}” to a prospective reader. Watch them try it, then ask whether they would pay for the complete product and why.`
          : `將「${charter.companionResourcePlan[0]}」展示給潛在讀者，觀察對方實作，再詢問是否願為完整產品付費及其原因。`}</p>}
      </section>
      <details><summary className="cursor-pointer text-sm font-semibold text-teal-800">{lang==='en'?'Optional AI refinement and model settings':'選填 AI 潤飾與模型設定'}</summary>
      {/* Synthesise.ai Charter Co-Pilot Bar */}
      <div className="lab-panel p-5 sm:p-6 bg-gradient-to-r from-teal-50/70 via-white to-sky-50/60 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider font-bold text-teal-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Charter refinement' : '產品憲章潤飾'}</span>
            </div>
            <p className="text-sm text-slate-700">
              {lang === 'en'
                ? 'Synthesize Title, Subtitle, Promise, Four Structural Pillars, Learning Objectives, and Compliance Disclaimers directly from your Stages 1–5 strategy.'
                : '將 Stages 1–5 的市場選題、UVZ 定位與顧客轉變藍圖，一鍵合成為一致且可出版的產品憲章架構與學習目標。'}
            </p>
          </div>

          <button
            type="button"
            disabled={aiBusy}
            onClick={() => void handleSynthesizeCharter()}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap shrink-0"
          >
            <Sparkles className={`w-4 h-4 ${aiBusy ? 'animate-spin' : ''}`} />
            <span>
              {aiBusy
                ? lang === 'en' ? 'Aligning Charter...' : '正在對齊生成憲章...'
                : lang === 'en' ? 'AI Synthesize & Align Charter' : 'AI 一鍵合成對齊憲章'}
            </span>
          </button>
        </div>

        <AiEngineQuickControl
          project={project}
          onUpdateAiSettings={onUpdateAiSettings}
          onOpenAiSettings={() => setActiveView('ai_settings')}
          disabled={aiBusy}
          fallbackNotice={fallbackNotice}
          lang={lang}
        />

        <input
          type="text"
          value={focusNote}
          onChange={(e) => setFocusNote(e.target.value)}
          placeholder={
            lang === 'en'
              ? 'Optional refinement note (e.g., Emphasize step-by-step templates for first-time buyers...)'
              : '選填調整指令（例如：強調針對初學者的實作檢核表與避坑清單...）'
          }
          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800"
        />
      </div>

      </details>
      {aiError && (
        <AiRateLimitNotice
          errorMessage={aiError}
          currentModel={project.aiSettings?.defaultModel || 'gemini-4-hydrogen'}
          busy={aiBusy}
          openrouterConnected={openrouterConnected}
          onRetry={() => void handleSynthesizeCharter()}
          onSwitchToFlashLiteAndRetry={handleSwitchToFlashLiteAndRetry}
          onSwitchToOpenRouterAndRetry={handleSwitchToOpenRouterAndRetry}
          onOpenAiSettings={() => setActiveView('ai_settings')}
          lang={lang}
        />
      )}

      {(savedNotice || aiSuccess) && (
        <p role="status" className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium">
          {aiSuccess || (lang === 'en' ? 'Product Charter updated. Review Gate B requirements and approve when ready.' : '產品憲章已更新。請審查 Gate B 要求並進行核准。')}
        </p>
      )}

      {editing ? (
        <form onSubmit={handleSaveCharter} className="lab-panel border-teal-300 p-6 lg:p-7 space-y-5 text-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              {lang === 'en' ? 'Edit Product Charter Architecture' : '編輯產品憲章核心架構'}
            </h2>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{lang === 'en' ? 'Save Charter' : '儲存憲章'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="font-bold text-slate-800">1. Product Title</span>
              <input
                required
                type="text"
                value={draft.productTitle}
                onChange={(e) => setDraft({ ...draft, productTitle: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="font-bold text-slate-800">2. Subtitle</span>
              <input
                type="text"
                value={draft.subtitle}
                onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="font-bold text-slate-800">Central Transformation Promise</span>
            <textarea
              rows={3}
              value={draft.centralPromise}
              onChange={(e) => setDraft({ ...draft, centralPromise: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="font-bold text-slate-800">3. Target Audience</span>
              <textarea
                rows={4}
                value={draft.targetAudience}
                onChange={(e) => setDraft({ ...draft, targetAudience: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="font-bold text-slate-800">4. Primary Problem Solved</span>
              <textarea
                rows={4}
                value={draft.primaryProblemSolved}
                onChange={(e) => setDraft({ ...draft, primaryProblemSolved: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <label className="block space-y-1.5 md:col-span-2">
              <span className="font-bold text-slate-800">6. Signature Framework</span>
              <input
                type="text"
                value={draft.signatureFramework}
                onChange={(e) => setDraft({ ...draft, signatureFramework: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="font-bold text-slate-800">Delivery Format</span>
              <select
                value={draft.deliveryFormat}
                onChange={(e) => setDraft({ ...draft, deliveryFormat: e.target.value as ProductFormat })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5"
              >
                <option value="ebook_toolkit">ebook_toolkit</option>
                <option value="ebook">ebook</option>
                <option value="workbook">workbook</option>
                <option value="template_bundle">template_bundle</option>
                <option value="mini_course">mini_course</option>
                <option value="challenge">challenge</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="font-bold text-slate-800">Target Word Count</span>
              <input
                type="number"
                min={500}
                step={500}
                value={draft.targetWordCount}
                onChange={(e) => setDraft({ ...draft, targetWordCount: Number(e.target.value) })}
                className="w-full font-mono bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <label className="block space-y-1.5">
              <span className="font-bold text-slate-800">5. Explicit Disclaimers (one per line)</span>
              <textarea
                rows={5}
                value={disclaimersText}
                onChange={(e) => setDisclaimersText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="font-bold text-slate-800">7. Structural Pillars (one per line)</span>
              <textarea
                rows={5}
                value={pillarsText}
                onChange={(e) => setPillarsText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="font-bold text-slate-800">8. Learning Objectives (one per line)</span>
              <textarea
                rows={5}
                value={objectivesText}
                onChange={(e) => setObjectivesText(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3"
              />
            </label>
          </div>
        </form>
      ) : (
        <details className="lab-panel p-6 lg:p-7 space-y-6"><summary className="cursor-pointer font-semibold">{lang==='en' ? 'Full charter and editorial details' : '完整憲章與編輯細節'}</summary>
          <div className="space-y-2.5 pb-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-teal-800 uppercase tracking-wider">
                1. Title & 2. Subtitle
              </span>
              <span className="text-xs text-slate-500 font-mono">Format: {charter?.deliveryFormat}</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">{charter?.productTitle || t.untitledProject}</h2>
            <p className="text-base font-medium text-slate-600">{charter?.subtitle}</p>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-sm text-emerald-900 mt-2">
              <strong>Central Promise:</strong> {charter?.centralPromise || '—'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5 border-b border-slate-100 text-sm">
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <strong className="text-slate-900 block">3. Target Audience:</strong>
              <p className="text-slate-700 leading-relaxed">{charter?.targetAudience || '—'}</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <strong className="text-slate-900 block">4. Primary Problem Solved:</strong>
              <p className="text-slate-700 leading-relaxed">{charter?.primaryProblemSolved || '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5 border-b border-slate-100 text-sm">
            <div className="p-5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
              <strong className="text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>5. Explicit Disclaimers (Non-guarantees):</span>
              </strong>
              <ul className="list-disc list-inside space-y-1 text-amber-900 text-xs">
                {(charter?.explicitDisclaimers || []).map((disc, idx) => (
                  <li key={idx}>{disc}</li>
                ))}
              </ul>
            </div>

            <div className="p-5 bg-sky-50/60 rounded-xl border border-sky-200 space-y-1.5">
              <strong className="text-sky-900 block">6. Signature Framework Name:</strong>
              <h4 className="text-base font-bold text-sky-800">{charter?.signatureFramework || '—'}</h4>
              <p className="text-xs font-mono text-sky-800 mt-1 tabular-nums">
                Target Depth: {charter?.contentDepthTarget} ({(charter?.targetWordCount || 0).toLocaleString()} words minimum)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            <div className="space-y-2.5">
              <strong className="text-slate-900 block">7. Four Structural Pillars:</strong>
              <div className="space-y-2">
                {(charter?.structuralPillars || []).map((pillar, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 font-medium text-slate-800">
                    {pillar}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <strong className="text-slate-900 block">8. Core Learning Objectives:</strong>
              <div className="space-y-2">
                {(charter?.learningObjectives || []).map((obj, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                    {idx + 1}. {obj}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>
      )}
    </div>
  );
};
