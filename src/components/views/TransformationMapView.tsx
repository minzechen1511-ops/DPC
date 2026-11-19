import { generationError } from '../../utils/gateAJourney.ts';
import { gateAJourneyText } from '../../utils/i18n.ts';
import { gateAApproved, selectedPositioning, usableMap } from '../../utils/gateAJourney.ts';
import React, { useMemo, useState } from 'react';
import { GitFork, Plus, Edit3, Save, X, Sparkles, RefreshCw, Compass } from 'lucide-react';
import { DigitalProductProject, TransformationMap } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { generateTextWithAi } from '../../services/aiService.ts';
import {
  buildTransformationSynthesisPrompt,
  parseTitleOptionsResponse,
  parseTransformationSynthesisResponse,
  StrategyFocusLens,
  summarizeStrategyContext,
} from '../../utils/strategySynthesis.ts';

interface TransformationMapViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onSelectTitle: (titleId: string) => void;
  onUpdateTransformationMap: (map: TransformationMap) => void;
  onRecordAiUsage?: (usage?: { total_tokens?: number; estimatedCostUsd?: number }, model?: string) => void;
  lang?: Language;
}

const FRAMING_LENSES: Array<{ id: StrategyFocusLens; labelEn: string; labelZh: string }> = [
  { id: 'balanced', labelEn: 'Balanced Conversion Trio', labelZh: '均衡商業轉換結構' },
  { id: 'beginner_playbook', labelEn: 'Beginner Step-by-Step', labelZh: '新手零壓力漸進引導' },
  { id: 'action_toolkit', labelEn: 'Action Kit & Deliverables', labelZh: '實戰工具與即用成果' },
  { id: 'specialist_deep_dive', labelEn: 'Signature Mastery System', labelZh: '進階系統與方法論命名' },
];

export const TransformationMapView: React.FC<TransformationMapViewProps> = ({
  project,
  setActiveView,
  onSelectTitle,
  onUpdateTransformationMap,
  onRecordAiUsage,
  lang = 'en',
}) => {
  const t = translations[lang];
  const journey = gateAJourneyText[lang];
  const { transformationMap } = project;
  const titleOptions = transformationMap?.titleOptions || [];
  const beforeState = transformationMap?.beforeState;
  const bridgeProcess = transformationMap?.bridgeProcess;
  const afterState = transformationMap?.afterState;

  const contextSummary = useMemo(() => summarizeStrategyContext(project, lang), [project, lang]);

  const [lens, setLens] = useState<StrategyFocusLens>('balanced');
  const [focusNote, setFocusNote] = useState('');
  const [aiBusy, setAiBusy] = useState<'full' | 'titles' | null>(null);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState('');

  const [showAddTitle, setShowAddTitle] = useState(false);
  const [newTitle, setNewTitle] = useState({ title: '', subtitle: '', rationale: '' });

  const [editingMap, setEditingMap] = useState(false);
  const [bigPromiseText, setBigPromiseText] = useState(transformationMap?.bigPromise || '');
  const [uspText, setUspText] = useState(transformationMap?.uniqueSellingProposition || '');
  const [painsText, setPainsText] = useState((beforeState?.currentPains || []).join('\n'));
  const [anxietiesText, setAnxietiesText] = useState((beforeState?.anxietiesAndFrustrations || []).join('\n'));
  const [flawedText, setFlawedText] = useState((beforeState?.flawedAlternatives || []).join('\n'));
  const [drainCostText, setDrainCostText] = useState(beforeState?.dailyDrainCost || '');
  const [frameworkName, setFrameworkName] = useState(bridgeProcess?.signatureFrameworkName || '');
  const [coreMethodologyText, setCoreMethodologyText] = useState(bridgeProcess?.coreMethodology || '');
  const [milestonesText, setMilestonesText] = useState((bridgeProcess?.keyMilestones || []).join('\n'));
  const [practicalToolsText, setPracticalToolsText] = useState((bridgeProcess?.practicalTools || []).join('\n'));
  const [obstacleBypassesText, setObstacleBypassesText] = useState((bridgeProcess?.obstacleBypasses || []).join('\n'));
  const [outcomesText, setOutcomesText] = useState((afterState?.tangibleOutcomes || []).join('\n'));
  const [capabilitiesText, setCapabilitiesText] = useState((afterState?.acquiredCapabilities || []).join('\n'));
  const [deliverablesText, setDeliverablesText] = useState((afterState?.completedDeliverables || []).join('\n'));
  const [metricsText, setMetricsText] = useState((afterState?.measurableMetrics || []).join('\n'));

  const handleSynthesizeMap = async (titlesOnly = false) => {
    if (aiBusy) return;
    if (!gateAApproved(project) || !selectedPositioning(project) || aiBusy) return;
    setAiBusy(titlesOnly ? 'titles' : 'full');
    setAiError('');
    setAiSuccess('');
    try {
      const { systemPrompt, userPrompt } = buildTransformationSynthesisPrompt(project, lang, {
        lens,
        focusNote,
        titlesOnly,
      });
      const res = await generateTextWithAi({
        provider: 'gemini',
        model: project.aiSettings?.defaultModel || 'gemini-4-hydrogen',
        systemPrompt,
        userPrompt,
        maxTokens: titlesOnly ? 1200 : 2200,
        projectId: project.projectId,
      });
      onRecordAiUsage?.(res?.usage, res?.model);
      const updatedMap = titlesOnly
        ? parseTitleOptionsResponse(res?.content || '', transformationMap)
        : parseTransformationSynthesisResponse(res?.content || '', transformationMap);
      onUpdateTransformationMap(updatedMap);
      setEditingMap(false);
      setAiSuccess(
        titlesOnly
          ? lang === 'en'
            ? `Generated ${updatedMap.titleOptions.length} commercial title & subtitle options aligned with your transformation map.`
            : `已重新生成 ${updatedMap.titleOptions.length} 組商業書名與副標題切入建議。`
          : lang === 'en'
          ? `Synthesized full Before → Bridge → After transformation architecture and ${updatedMap.titleOptions.length} title options.`
          : `已自動生成完整 Before → Bridge → After 客戶轉變地圖與 ${updatedMap.titleOptions.length} 組書名建議。`
      );
    } catch (err: any) {
      setAiError(generationError(err, lang));
    } finally {
      setAiBusy(null);
    }
  };

  const handleAddTitle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.title.trim()) return;
    const id = `TITLE-${String(titleOptions.length + 1).padStart(2, '0')}`;
    const updated: TransformationMap = {
      ...transformationMap,
      titleOptions: [
        ...titleOptions,
        {
          id,
          title: newTitle.title.trim(),
          subtitle: newTitle.subtitle.trim(),
          rationale: newTitle.rationale.trim() || (lang === 'en' ? 'Custom commercial positioning' : '自訂商業書名切入'),
          isRecommended: titleOptions.length === 0,
        },
      ],
      selectedTitleId: id,
    };
    onUpdateTransformationMap(updated);
    setNewTitle({ title: '', subtitle: '', rationale: '' });
    setShowAddTitle(false);
  };

  const openEditor = () => {
    setBigPromiseText(transformationMap?.bigPromise || '');
    setUspText(transformationMap?.uniqueSellingProposition || '');
    setPainsText((beforeState?.currentPains || []).join('\n'));
    setAnxietiesText((beforeState?.anxietiesAndFrustrations || []).join('\n'));
    setFlawedText((beforeState?.flawedAlternatives || []).join('\n'));
    setDrainCostText(beforeState?.dailyDrainCost || '');
    setFrameworkName(bridgeProcess?.signatureFrameworkName || '');
    setCoreMethodologyText(bridgeProcess?.coreMethodology || '');
    setMilestonesText((bridgeProcess?.keyMilestones || []).join('\n'));
    setPracticalToolsText((bridgeProcess?.practicalTools || []).join('\n'));
    setObstacleBypassesText((bridgeProcess?.obstacleBypasses || []).join('\n'));
    setOutcomesText((afterState?.tangibleOutcomes || []).join('\n'));
    setCapabilitiesText((afterState?.acquiredCapabilities || []).join('\n'));
    setDeliverablesText((afterState?.completedDeliverables || []).join('\n'));
    setMetricsText((afterState?.measurableMetrics || []).join('\n'));
    setEditingMap(true);
  };

  const splitLines = (txt: string) => txt.split('\n').map((s) => s.trim()).filter(Boolean);

  const handleSavePillars = () => {
    onUpdateTransformationMap({
      ...transformationMap,
      bigPromise: bigPromiseText.trim(),
      uniqueSellingProposition: uspText.trim(),
      beforeState: {
        ...transformationMap.beforeState,
        currentPains: splitLines(painsText),
        anxietiesAndFrustrations: splitLines(anxietiesText),
        flawedAlternatives: splitLines(flawedText),
        dailyDrainCost: drainCostText.trim(),
      },
      bridgeProcess: {
        ...transformationMap.bridgeProcess,
        signatureFrameworkName: frameworkName.trim(),
        coreMethodology: coreMethodologyText.trim(),
        keyMilestones: splitLines(milestonesText),
        practicalTools: splitLines(practicalToolsText),
        obstacleBypasses: splitLines(obstacleBypassesText),
      },
      afterState: {
        ...transformationMap.afterState,
        tangibleOutcomes: splitLines(outcomesText),
        acquiredCapabilities: splitLines(capabilitiesText),
        completedDeliverables: splitLines(deliverablesText),
        measurableMetrics: splitLines(metricsText),
      },
    });
    setEditingMap(false);
  };

  return (
    <div className="w-full space-y-5 pb-3">
      {/* Top Banner */}
      <div className="lab-panel p-6 lg:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-teal-700 mb-1.5">
            <GitFork className="w-4 h-4" />
            <span>{t.navTransformationMap}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t.mapTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">{t.mapSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">


          <button
            type="button"
            onClick={() => setShowAddTitle((v) => !v)}
            className="px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-2"
          >
            {showAddTitle ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showAddTitle ? (lang === 'en' ? 'Cancel' : '取消') : (lang === 'en' ? 'Add Title Option' : '新增書名備選')}</span>
          </button>

          <button
            type="button"
            disabled={Boolean(aiBusy) || !gateAApproved(project) || !selectedPositioning(project)}
            onClick={() => {
              if (!usableMap(project) || project.workflow.stageStatuses.transformation_map === 'NEEDS_REVIEW') {void handleSynthesizeMap(false); return;}
              setActiveView('reference_library');
            }}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <span>{!usableMap(project) || project.workflow.stageStatuses.transformation_map === 'NEEDS_REVIEW' ? journey.generateMap : journey.continueMap}</span>
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-700">{lang === 'en' ? `Carried forward: ${selectedPositioning(project)?.name || 'select a UVZ option first'}. The map turns that positioning into Before → Bridge → After and editable title/subtitle options. Reference Library will collect and review sources for these intended outcomes.` : `已承接：${selectedPositioning(project)?.name || '請先選擇 UVZ 方案'}。此步將定位轉為 Before → Bridge → After 與可編輯書名／副標題；接著前往來源研究庫，蒐集並審查支持這些目標的證據。`}</p>
      <div aria-live="polite">{aiBusy && <p role="status" className="text-sm text-teal-900">{lang === 'en' ? 'Generating a draft… Existing work is retained until this request succeeds.' : '正在生成草稿… 請求成功前會保留現有內容。'}</p>}{aiError && <p role="alert" className="p-3 text-sm rounded-lg bg-rose-50 text-rose-900">{aiError} {lang === 'en' ? 'Your previous draft is retained. Retry the generation action.' : '已保留原草稿，請重試生成。'}</p>}</div>
      <details><summary className="cursor-pointer font-semibold text-teal-800 p-3 focus-visible:outline-2">{lang === 'en' ? 'Optional AI settings and regeneration' : '選用 AI 設定與重新生成'}</summary>
      {/* Guided Automated Synthesis Panel */}
      <div className="lab-panel p-6 lg:p-7 space-y-5 bg-gradient-to-br from-white via-teal-50/20 to-indigo-50/25">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-700" />
              <span>
                {lang === 'en'
                  ? 'Automated Transformation & Titling Synthesizer'
                  : 'AI 客戶轉變路徑與商業書名生成引擎'}
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {lang === 'en'
                ? 'Automatically translates your selected UVZ positioning and buyer problems into a complete Before → Bridge → After transformation pathway, proprietary method name, and 3 title/subtitle hooks.'
                : '系統將延續您在第 3 步選擇的 UVZ 定位與痛點矩陣，自動推演完整 Before → Bridge → After 轉變步驟、獨家方法論名稱與 3 組高轉換書名建議。'}
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-md shrink-0 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span>
              {contextSummary.selectedUvzName
                ? contextSummary.selectedUvzName
                : lang === 'en'
                ? 'Select a UVZ option before generating the map'
                : '請先選擇 UVZ 定位，再生成地圖'}
            </span>
          </span>
        </div>

        {/* Lens Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {FRAMING_LENSES.map((item) => {
            const active = lens === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setLens(item.id)}
                className={`p-3 rounded-xl border text-left transition-all text-sm font-semibold ${
                  active
                    ? 'border-teal-600 bg-teal-50/80 text-teal-950 ring-2 ring-teal-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {lang === 'en' ? item.labelEn : item.labelZh}
              </button>
            );
          })}
        </div>

        {/* Custom Direction Input + Action Buttons */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-end">
          <label className="flex-1 block">
            <span className="text-xs font-bold text-slate-800 block mb-1.5">
              {lang === 'en'
                ? 'Optional Customization Note (e.g. target timeframe, tone, or deliverable focus)'
                : '補充需求或書名風格偏好（可留白，例如：強調 14 天見效、適合完全初學者）'}
            </span>
            <input
              type="text"
              value={focusNote}
              onChange={(e) => setFocusNote(e.target.value)}
              placeholder={
                lang === 'en'
                  ? 'e.g. Highlight a 7-day weekend sprint, include checkable templates, warm practical tone...'
                  : '例如：主打 7 天實戰改造、附可下載檢查表，語氣專業但親切...'
              }
              className="w-full"
            />
          </label>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              disabled={Boolean(aiBusy)}
              onClick={() => handleSynthesizeMap(true)}
              className="px-4 py-3 text-sm font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${aiBusy === 'titles' ? 'animate-spin' : ''}`} />
              <span>
                {aiBusy === 'titles'
                  ? lang === 'en' ? 'Refreshing Titles...' : '生成書名中...'
                  : lang === 'en' ? 'Generate 3 Title Ideas Only' : '僅重新生成 3 組書名'}
              </span>
            </button>
            <button
              type="button"
              disabled={Boolean(aiBusy)}
              onClick={() => handleSynthesizeMap(false)}
              className="px-5 py-3 text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60"
            >
              <Sparkles className={`w-4 h-4 ${aiBusy === 'full' ? 'animate-spin' : ''}`} />
              <span>
                {aiBusy === 'full'
                  ? lang === 'en' ? 'Building Map & Titles...' : '正在建置轉變地圖...'
                  : lang === 'en' ? 'Synthesize Full Map & Titles' : '生成完整轉變地圖與書名'}
              </span>
            </button>
          </div>
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

      </details>
      {showAddTitle && (
        <form onSubmit={handleAddTitle} className="lab-panel border-teal-300 p-6 lg:p-7 space-y-4 text-sm">
          <h2 className="text-base font-bold text-slate-900">{lang === 'en' ? 'Add Custom Product Title & Subtitle' : '新增自訂商品書名與副標題'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input required placeholder={lang === 'en' ? 'Book / Product Title' : '主標題'} value={newTitle.title} onChange={(e) => setNewTitle({ ...newTitle, title: e.target.value })} />
            <input required placeholder={lang === 'en' ? 'Outcome-oriented Subtitle' : '成果導向副標題'} value={newTitle.subtitle} onChange={(e) => setNewTitle({ ...newTitle, subtitle: e.target.value })} />
            <input placeholder={lang === 'en' ? 'Hook / Conversion Rationale' : '轉換訴求說明'} value={newTitle.rationale} onChange={(e) => setNewTitle({ ...newTitle, rationale: e.target.value })} />
          </div>
          <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">
            {lang === 'en' ? 'Save & Select Title' : '儲存並選定此書名'}
          </button>
        </form>
      )}

      {/* Title Options Selector */}
      <div className="lab-panel p-6 lg:p-7 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">{t.titleOptionsTitle}</h2>
          <span className="text-xs font-mono text-slate-500">
            {titleOptions.length > 0
              ? lang === 'en'
                ? `${titleOptions.length} Options · Active: ${transformationMap.selectedTitleId || 'None'}`
                : `${titleOptions.length} 組書名 · 已選定：${transformationMap.selectedTitleId || '未選擇'}`
              : lang === 'en'
              ? 'No titles generated yet'
              : '尚未產生書名建議'}
          </span>
        </div>

        {titleOptions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center space-y-3">
            <p className="text-sm text-slate-700 max-w-2xl mx-auto">
              {lang === 'en'
                ? 'Click "Synthesize Full Map & Titles" or "Generate 3 Title Ideas Only" above so AI proposes commercial titles & subtitles grounded in your niche.'
                : '目前尚未生成書名候選。請點擊上方「生成完整轉變地圖與書名」或「僅重新生成 3 組書名」，讓 AI 自動產出高吸引力書名。'}
            </p>

          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {titleOptions.map((item) => {
              const isSelected = transformationMap.selectedTitleId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTitle(item.id)}
                  className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/25 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">{item.id}</span>
                      {item.isRecommended && (
                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {lang === 'en' ? 'Recommended' : '推薦'}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1.5 leading-snug">{item.title}</h3>
                    <p className="text-sm text-slate-700 mb-2">{item.subtitle}</p>
                    <p className="text-xs text-slate-500">{item.rationale}</p>
                  </div>

                  <div className="pt-3.5 mt-4 border-t border-slate-200/70 flex items-center justify-between text-sm font-semibold">
                    <span className={isSelected ? 'text-teal-700' : 'text-slate-500'}>
                      {isSelected ? (lang === 'en' ? '✓ Selected' : '✓ 已選定') : t.selectTitleBtn}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Core Offer Anchors + 3 Pillars: Before, Bridge, After */}
      <div className="lab-panel p-6 lg:p-7 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            {lang === 'en' ? 'Before → Bridge → After Transformation Matrix' : 'Before → Bridge → After 轉變架構矩陣'}
          </h2>
          {editingMap ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingMap(false)}
                className="px-3 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                {lang === 'en' ? 'Cancel' : '取消'}
              </button>
              <button
                type="button"
                onClick={handleSavePillars}
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{lang === 'en' ? 'Save Full Matrix' : '儲存完整矩陣'}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openEditor}
              className="text-sm font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1.5"
            >
              <Edit3 className="w-4 h-4" />
              <span>{lang === 'en' ? 'Edit Full Matrix' : '編輯完整三階段內容'}</span>
            </button>
          )}
        </div>

        {editingMap ? (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="font-bold text-slate-800">{lang === 'en' ? 'Big Transformation Promise' : '產品核心大承諾 (Big Promise)'}</span>
                <textarea rows={3} value={bigPromiseText} onChange={(e) => setBigPromiseText(e.target.value)} className="w-full" />
              </label>
              <label className="block space-y-1.5">
                <span className="font-bold text-slate-800">{lang === 'en' ? 'Unique Selling Proposition (USP)' : '獨特賣點 (USP)'}</span>
                <textarea rows={3} value={uspText} onChange={(e) => setUspText(e.target.value)} className="w-full" />
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Before Edit */}
              <div className="p-4 rounded-xl bg-rose-50/30 border border-rose-200 space-y-3">
                <div className="text-xs font-mono font-bold uppercase text-rose-700">{t.beforeStateTitle}</div>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-800">{lang === 'en' ? 'Current Pains (one per line)' : '日常痛點（每行一項）'}</span>
                  <textarea rows={4} value={painsText} onChange={(e) => setPainsText(e.target.value)} className="w-full" />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-800">{lang === 'en' ? 'Anxieties & Frustrations (one per line)' : '內心焦慮與挫折（每行一項）'}</span>
                  <textarea rows={3} value={anxietiesText} onChange={(e) => setAnxietiesText(e.target.value)} className="w-full" />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-800">{lang === 'en' ? 'Flawed Alternatives (one per line)' : '失敗的替代方案（每行一項）'}</span>
                  <textarea rows={3} value={flawedText} onChange={(e) => setFlawedText(e.target.value)} className="w-full" />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-800">{lang === 'en' ? 'Daily Drain Cost' : '每日時間/精力消耗代價'}</span>
                  <input type="text" value={drainCostText} onChange={(e) => setDrainCostText(e.target.value)} className="w-full" />
                </label>
              </div>

              {/* Bridge Edit */}
              <div className="p-4 rounded-xl bg-teal-50/30 border border-teal-200 space-y-3">
                <div className="text-xs font-mono font-bold uppercase text-teal-800">{t.bridgeProcessTitle}</div>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-800">{lang === 'en' ? 'Signature Framework Name' : '專屬方法論名稱'}</span>
                  <input type="text" value={frameworkName} onChange={(e) => setFrameworkName(e.target.value)} className="w-full" />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-800">{lang === 'en' ? 'Core Methodology' : '核心執行邏輯'}</span>
                  <textarea rows={3} value={coreMethodologyText} onChange={(e) => setCoreMethodologyText(e.target.value)} className="w-full" />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-800">{lang === 'en' ? 'Key Milestones (one per line)' : '關鍵步驟與里程碑（每行一項）'}</span>
                  <textarea rows={4} value={milestonesText} onChange={(e) => setMilestonesText(e.target.value)} className="w-full" />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-800">{lang === 'en' ? 'Practical Tools (one per line)' : '附帶實作工具（每行一項）'}</span>
                  <textarea rows={3} value={practicalToolsText} onChange={(e) => setPracticalToolsText(e.target.value)} className="w-full" />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-800">{lang === 'en' ? 'Obstacle Bypasses (one per line)' : '卡關突破機制（每行一項）'}</span>
                  <textarea rows={3} value={obstacleBypassesText} onChange={(e) => setObstacleBypassesText(e.target.value)} className="w-full" />
                </label>
              </div>

              {/* After Edit */}
              <div className="p-4 rounded-xl bg-emerald-50/30 border border-emerald-200 space-y-3">
                <div className="text-xs font-mono font-bold uppercase text-emerald-700">{t.afterStateTitle}</div>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-800">{lang === 'en' ? 'Tangible Outcomes (one per line)' : '實質成果收穫（每行一項）'}</span>
                  <textarea rows={4} value={outcomesText} onChange={(e) => setOutcomesText(e.target.value)} className="w-full" />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-800">{lang === 'en' ? 'Acquired Capabilities (one per line)' : '學會的新能力（每行一項）'}</span>
                  <textarea rows={3} value={capabilitiesText} onChange={(e) => setCapabilitiesText(e.target.value)} className="w-full" />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-800">{lang === 'en' ? 'Completed Deliverables (one per line)' : '帶走的完成作品（每行一項）'}</span>
                  <textarea rows={3} value={deliverablesText} onChange={(e) => setDeliverablesText(e.target.value)} className="w-full" />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-800">{lang === 'en' ? 'Measurable Metrics (one per line)' : '可驗證成效指標（每行一項）'}</span>
                  <textarea rows={3} value={metricsText} onChange={(e) => setMetricsText(e.target.value)} className="w-full" />
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {(transformationMap?.bigPromise || transformationMap?.uniqueSellingProposition) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-200/80">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-800 mb-1">
                    {lang === 'en' ? 'Core Big Promise' : '產品核心大承諾'}
                  </div>
                  <p className="text-sm font-medium text-slate-800">{transformationMap.bigPromise || '—'}</p>
                </div>
                <div className="p-4 rounded-xl bg-teal-50/40 border border-teal-200/80">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-800 mb-1">
                    {lang === 'en' ? 'Unique Selling Proposition (USP)' : '獨特賣點定位 (USP)'}
                  </div>
                  <p className="text-sm font-medium text-slate-800">{transformationMap.uniqueSellingProposition || '—'}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Before */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5">
                <div className="text-rose-700 text-xs font-mono font-bold uppercase tracking-wider">{t.beforeStateTitle}</div>
                <div className="space-y-3 text-sm text-slate-700">
                  <div>
                    <span className="font-bold text-slate-900 block mb-1">{lang === 'en' ? 'Daily Pains & Friction:' : '日常痛點：'}</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      {(beforeState?.currentPains || []).map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </div>
                  {(beforeState?.anxietiesAndFrustrations || []).length > 0 && (
                    <div>
                      <span className="font-bold text-slate-900 block mb-1">{lang === 'en' ? 'Anxieties & Doubts:' : '心理焦慮與摩擦：'}</span>
                      <ul className="list-disc list-inside space-y-1 text-slate-600">
                        {beforeState.anxietiesAndFrustrations.map((a, idx) => (
                          <li key={idx}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(beforeState?.flawedAlternatives || []).length > 0 && (
                    <div>
                      <span className="font-bold text-slate-900 block mb-1">{lang === 'en' ? 'Why Existing Alternatives Fail:' : '為何常見替代方式會失敗：'}</span>
                      <ul className="list-disc list-inside space-y-1 text-slate-600">
                        {beforeState.flawedAlternatives.map((f, idx) => (
                          <li key={idx}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-900">
                    <strong>{lang === 'en' ? 'Daily Drain Cost:' : '每日消耗代價：'}</strong> {beforeState?.dailyDrainCost || '—'}
                  </div>
                </div>
              </div>

              {/* Bridge */}
              <div className="bg-teal-50/40 border border-teal-200 rounded-2xl p-5 space-y-3.5">
                <div className="text-teal-800 text-xs font-mono font-bold uppercase tracking-wider">{t.bridgeProcessTitle}</div>
                <div className="space-y-3 text-sm text-slate-700">
                  <div>
                    <span className="text-xs text-slate-500 block">{lang === 'en' ? 'Signature Method:' : '專屬方法論名稱：'}</span>
                    <span className="font-bold text-slate-900 text-base">{bridgeProcess?.signatureFrameworkName || '—'}</span>
                  </div>
                  {bridgeProcess?.coreMethodology && (
                    <p className="text-xs text-slate-700 bg-white/80 border border-teal-100 rounded-xl p-3 leading-relaxed">
                      {bridgeProcess.coreMethodology}
                    </p>
                  )}
                  <div>
                    <span className="font-bold text-slate-900 block mb-1">{lang === 'en' ? 'Step-by-Step Milestones:' : '核心執行步驟：'}</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                      {(bridgeProcess?.keyMilestones || []).map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>
                  {(bridgeProcess?.practicalTools || []).length > 0 && (
                    <div>
                      <span className="font-bold text-slate-900 block mb-1">{lang === 'en' ? 'Action Tools & Templates:' : '實作輔助工具：'}</span>
                      <ul className="list-disc list-inside space-y-1 text-slate-600">
                        {bridgeProcess.practicalTools.map((tool, idx) => (
                          <li key={idx}>{tool}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(bridgeProcess?.obstacleBypasses || []).length > 0 && (
                    <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-xs text-teal-950">
                      <strong className="block mb-1">{lang === 'en' ? 'Obstacle Bypasses:' : '卡關突破設計：'}</strong>
                      <ul className="list-disc list-inside space-y-0.5">
                        {bridgeProcess.obstacleBypasses.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* After */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5">
                <div className="text-emerald-700 text-xs font-mono font-bold uppercase tracking-wider">{t.afterStateTitle}</div>
                <div className="space-y-3 text-sm text-slate-700">
                  <div>
                    <span className="font-bold text-slate-900 block mb-1">{lang === 'en' ? 'Measurable Outcomes:' : '實質收穫：'}</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      {(afterState?.tangibleOutcomes || []).map((o, idx) => (
                        <li key={idx}>{o}</li>
                      ))}
                    </ul>
                  </div>
                  {(afterState?.acquiredCapabilities || []).length > 0 && (
                    <div>
                      <span className="font-bold text-slate-900 block mb-1">{lang === 'en' ? 'Acquired Capabilities:' : '建立的持久能力：'}</span>
                      <ul className="list-disc list-inside space-y-1 text-slate-600">
                        {afterState.acquiredCapabilities.map((cap, idx) => (
                          <li key={idx}>{cap}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(afterState?.completedDeliverables || []).length > 0 && (
                    <div>
                      <span className="font-bold text-slate-900 block mb-1">{lang === 'en' ? 'Completed Deliverables:' : '完成帶走的成果物：'}</span>
                      <ul className="list-disc list-inside space-y-1 text-slate-600">
                        {afterState.completedDeliverables.map((del, idx) => (
                          <li key={idx}>{del}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                    <strong>{lang === 'en' ? 'Metrics:' : '關鍵指標：'}</strong> {(afterState?.measurableMetrics || []).join(' · ') || '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
