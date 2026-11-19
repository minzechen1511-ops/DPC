import { generationError } from '../../utils/gateAJourney.ts';
import { gateAJourneyText } from '../../utils/i18n.ts';
import { gateAApproved, usableBrief } from '../../utils/gateAJourney.ts';
import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, Lock, Unlock, Save, Sparkles } from 'lucide-react';
import { DigitalProductProject, ProjectIntake } from '../../types/project.ts';
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
import { buildBriefSynthesisPrompt, parseBriefSynthesisResponse } from '../../utils/stageSynthesis.ts';

interface ProjectBriefViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onUpdateIntake: (intake: ProjectIntake) => void;
  onUpdateAiSettings?: (settings: any) => void;
  onRecordAiUsage?: (usage?: { total_tokens?: number; estimatedCostUsd?: number }, model?: string, provider?: ActiveStudioProvider) => void;
  lang?: Language;
}

export const ProjectBriefView: React.FC<ProjectBriefViewProps> = ({
  project,
  setActiveView,
  onUpdateIntake,
  onUpdateAiSettings,
  onRecordAiUsage,
  lang = 'en',
}) => {
  const t = translations[lang];
  const journey = gateAJourneyText[lang];
  const [intake, setIntake] = useState<ProjectIntake>(project.intake);
  const [lockedFields, setLockedFields] = useState<Record<string, boolean>>({});
  const [savedNotice, setSavedNotice] = useState(false);
  const [focusNote, setFocusNote] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState('');
  const [fallbackNotice, setFallbackNotice] = useState('');
  const openrouterConnected = useOpenRouterConnected();

  useEffect(() => {
    setIntake(project.intake);
  }, [project.projectId, project.intake]);

  const handleToggleLock = (fieldKey: string) => {
    setLockedFields((prev) => ({
      ...prev,
      [fieldKey]: !prev[fieldKey],
    }));
  };

  const handleSaveDraft = () => {
    onUpdateIntake(intake);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleAcceptAll = () => {
    onUpdateIntake(intake);
    setActiveView('uvz');
  };

  const handleSynthesizeBrief = async (overrideModel?: string, overrideProvider?: ActiveStudioProvider) => {
    if (!gateAApproved(project) || aiBusy) return;
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
      const workingProject: DigitalProductProject = {
        ...project,
        intake,
      };
      const { systemPrompt, userPrompt } = buildBriefSynthesisPrompt(workingProject, lang, focusNote);
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
      const synthesized = parseBriefSynthesisResponse(res?.content || '', intake);
      const merged: ProjectIntake = {
        ...synthesized,
        projectName: lockedFields['projectName'] ? intake.projectName : synthesized.projectName,
        creatorName: lockedFields['creatorName'] ? intake.creatorName : synthesized.creatorName,
      };
      setIntake(merged);
      onUpdateIntake(merged);
      setAiSuccess(
        (lang === 'en'
          ? 'Brief draft updated. Creator facts were preserved; audience and product claims still require validation.'
          : '簡報草稿已更新；已保留創作者事實，受眾與產品主張仍待驗證。') + (fallbackTag ? ` (${fallbackTag})` : '')
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
    void handleSynthesizeBrief('gemini-3.1-flash-lite', 'gemini');
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
    void handleSynthesizeBrief(nextModel, 'openrouter');
  };

  return (
    <div className="w-full space-y-5 pb-3">
      {/* Top Banner */}
      <div className="lab-panel p-6 lg:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-teal-700 mb-1.5">
            <FileText className="w-4 h-4" />
            <span>{t.navProjectBrief}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t.briefTitle}</h1>
          <p className="text-sm text-slate-600 mt-1">{t.briefSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{t.saveDraft}</span>
          </button>

          <button
            type="button"
            onClick={handleAcceptAll}
            disabled={!gateAApproved(project) || !usableBrief({...project, intake}) || aiBusy}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{journey.continueBrief}</span>
          </button>
        </div>
      </div>

      <section aria-label={journey.steps[1]} className="border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="text-lg font-semibold">{journey.steps[1]}</h2>
        <p className="text-sm text-slate-600">{lang === 'en' ? 'Carried forward from your selected, approved niche. Use this draft as-is; detailed fields and AI polish are optional. Unknown creator facts stay blank.' : '已承接您選定並核准的題材，可直接使用此草稿；詳細欄位與 AI 潤飾皆為選用。未知的創作者資料維持空白。'}</p>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">{[
          [lang === 'en' ? 'Audience hypothesis' : '受眾假設', intake.targetAudience],
          [lang === 'en' ? 'Problem' : '問題', intake.problemsSolved],
          [lang === 'en' ? 'Product direction' : '產品方向', intake.productIdea],
          [lang === 'en' ? 'Intended transformation' : '預期轉變', intake.desiredTransformation],
          [lang === 'en' ? 'Delivery format · editable default' : '交付形式 · 可編輯預設值', project.preferences.productFormat],
          [lang === 'en' ? 'Boundaries' : '內容邊界', intake.constraintsAndExclusions.productBoundaries || (lang === 'en' ? 'Educational draft; verify factual claims before publication.' : '教育用途草稿；出版前須查核事實主張。')],
          [lang === 'en' ? 'Pricing hypothesis · not measured willingness to pay' : '定價假設 · 非已測得的付費意願', `${intake.recommendedPrice.currency || 'USD'} ${intake.recommendedPrice.introductoryTest} / ${intake.recommendedPrice.regular} / ${intake.recommendedPrice.premiumBundle}`],
        ].map(([label,value]) => <div key={label}><dt className="font-semibold text-slate-900">{label}</dt><dd className="text-slate-700 mt-1">{value || (lang === 'en' ? 'Not provided' : '尚未提供')}</dd></div>)}</dl>
      </section>
      <aside role="note" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>{lang === 'en' ? 'Creator knowledge and credibility' : '創作者知識與可信度'}</strong>
        <p className="mt-1">{!intake.expertise.trim() && !intake.relevantExperience.trim()
          ? (lang === 'en' ? 'Creator expertise is not provided. The audience/product evidence does not establish creator-market fit. Plan qualified expert review and supporting references before making factual or specialist claims.' : '尚未提供創作者專業背景。受眾／產品證據不代表已證實創作者與市場適配；提出事實或專業主張前，請安排合格專家覆核並提供支持文獻。')
          : (lang === 'en' ? 'Your background is self-reported, and its relevance to this topic is not independently verified. If the topic is outside your expertise, arrange qualified expert review. Source and claim reviews are still required.' : '您的背景為自行提供，與此題材的關聯尚未經獨立查證。若題材超出您的專業，請安排合格專家覆核；仍需審查來源與主張。')}</p>
      </aside>
      <details><summary className="cursor-pointer font-semibold text-teal-800 py-3 focus-visible:outline-2">{lang === 'en' ? 'Optional: polish this brief with AI' : '選用：以 AI 潤飾此簡報'}</summary>

      <div className="lab-panel p-5 sm:p-6 bg-gradient-to-r from-teal-50/70 via-white to-sky-50/60 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider font-bold text-teal-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Optional brief polish' : '選用簡報潤飾'}</span>
            </div>
            <p className="text-sm text-slate-700">
              {lang === 'en'
                ? 'Automatically enrich audience specificity, painful friction hooks, brand voice, and safety guardrails from your selected Gate A niche.'
                : '根據已核准的 Gate A 利基選題，一鍵強化受眾精準度、痛點描述、品牌語調與合規邊界。'}
            </p>
          </div>

          <button
            type="button"
            disabled={aiBusy}
            onClick={() => void handleSynthesizeBrief()}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap shrink-0"
          >
            <Sparkles className={`w-4 h-4 ${aiBusy ? 'animate-spin' : ''}`} />
            <span>
              {aiBusy
                ? lang === 'en' ? 'Synthesizing 13 Fields...' : '正在智能生成 13 項設定...'
                : lang === 'en' ? 'Optional: polish this brief with AI' : '選用：以 AI 潤飾此簡報'}
            </span>
          </button>
        </div>

        <AiEngineQuickControl
          project={project}
          onUpdateAiSettings={onUpdateAiSettings}
          onOpenAiSettings={() => {
            onUpdateIntake(intake);
            setActiveView('ai_settings');
          }}
          disabled={aiBusy}
          fallbackNotice={fallbackNotice}
          lang={lang}
        />

        <input
          type="text"
          aria-label={lang === 'en' ? 'Optional brief polish direction' : '選用簡報潤飾方向'}
          value={focusNote}
          onChange={(e) => setFocusNote(e.target.value)}
          placeholder={
            lang === 'en'
              ? 'Optional angle or customization note (e.g., Focus on busy parents, emphasize measurable 30-day templates...)'
              : '選填客製化引導備註（例如：聚焦高工時上班族、強調 30 天實作表格成果...）'
          }
          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800"
        />
      </div>

      </details>
      <div aria-live="polite">
        {aiBusy && (
          <SynthesisProgressVisualizer
            stage="project_brief"
            model={project.aiSettings?.defaultModel || 'gemini-4-hydrogen'}
            contextTitle={intake.projectName || project.name}
            lang={lang}
          />
        )}
        {aiError && (
          <AiRateLimitNotice
            errorMessage={aiError}
            currentModel={project.aiSettings?.defaultModel || 'gemini-4-hydrogen'}
            busy={aiBusy}
            openrouterConnected={openrouterConnected}
            onRetry={() => void handleSynthesizeBrief()}
            onSwitchToFlashLiteAndRetry={handleSwitchToFlashLiteAndRetry}
            onSwitchToOpenRouterAndRetry={handleSwitchToOpenRouterAndRetry}
            onOpenAiSettings={() => {
              onUpdateIntake(intake);
              setActiveView('ai_settings');
            }}
            lang={lang}
          />
        )}
      </div>

      {(savedNotice || aiSuccess) && (
        <p role="status" className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium">
          {aiSuccess || (lang === 'en' ? 'Brief changes applied. Check the header for cloud saving, saved or retry status.' : '已套用簡報變更；請查看頁首的雲端儲存中、已儲存或重試狀態。')}
        </p>
      )}

      <details className="group" onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget as Node) && JSON.stringify(intake) !== JSON.stringify(project.intake)) onUpdateIntake(intake);}}><summary className="cursor-pointer font-semibold text-teal-800 p-3 focus-visible:outline-2">{journey.optional}</summary>
      {/* 13 Fields Full-Width Grid */}
      <div className="space-y-5">
        {/* Part 1 */}
        <div className="lab-panel p-6 lg:p-7 space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            {t.part1Title}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-800">1. {lang === 'en' ? 'Project Name' : '專案名稱'}</span>
                <button type="button" aria-label={lang === 'en' ? 'Toggle project name lock' : '切換專案名稱鎖定'} aria-pressed={Boolean(lockedFields['projectName'])} onClick={() => handleToggleLock('projectName')} className="text-slate-500 hover:text-slate-700 p-1">
                  {lockedFields['projectName'] ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4" />}
                </button>
              </div>
              <input
                type="text"
                disabled={lockedFields['projectName']}
                aria-label={lang === 'en' ? 'Project name' : '專案名稱'}
                value={intake.projectName}
                onChange={(e) => setIntake({ ...intake, projectName: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl px-3.5 py-2.5"
              />
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-800">2. {lang === 'en' ? 'Creator / Brand Name' : '創作者/品牌名稱'}</span>
                <button type="button" aria-label={lang === 'en' ? 'Toggle creator or brand name lock' : '切換創作者或品牌名稱鎖定'} aria-pressed={Boolean(lockedFields['creatorName'])} onClick={() => handleToggleLock('creatorName')} className="text-slate-500 hover:text-slate-700 p-1">
                  {lockedFields['creatorName'] ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4" />}
                </button>
              </div>
              <input
                type="text"
                disabled={lockedFields['creatorName']}
                aria-label={lang === 'en' ? 'Creator or brand name' : '創作者或品牌名稱'}
                value={intake.creatorName}
                onChange={(e) => setIntake({ ...intake, creatorName: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl px-3.5 py-2.5"
              />
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-sm block">3. {lang === 'en' ? 'Experience Level' : '經驗等級'}</span>
              <select
                aria-label={lang === 'en' ? 'Experience level' : '經驗等級'}
                value={intake.experienceLevel}
                onChange={(e) => setIntake({ ...intake, experienceLevel: e.target.value as any })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl px-3.5 py-2.5"
              >
                <option value="">{lang === 'en' ? 'Not provided' : '尚未提供'}</option>
                <option value="BEGINNER">BEGINNER</option>
                <option value="INTERMEDIATE">INTERMEDIATE</option>
                <option value="ADVANCED">ADVANCED</option>
                <option value="EXPERT">EXPERT</option>
              </select>
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-sm block">4. {lang === 'en' ? 'Relevant Experience' : '相關實務經驗'}</span>
              <input
                type="text"
                aria-label={lang === 'en' ? 'Relevant experience' : '相關經驗'}
                value={intake.relevantExperience}
                onChange={(e) => setIntake({ ...intake, relevantExperience: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl px-3.5 py-2.5"
              />
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-sm block">5. {lang === 'en' ? 'Subject Matter Expertise' : '核心專業範疇'}</span>
              <input
                type="text"
                aria-label={lang === 'en' ? 'Subject matter expertise' : '主題專業'}
                value={intake.expertise}
                onChange={(e) => setIntake({ ...intake, expertise: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl px-3.5 py-2.5"
              />
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-sm block">6. {lang === 'en' ? 'Creator Focus & Interests' : '創作者研究興趣'}</span>
              <input
                type="text"
                aria-label={lang === 'en' ? 'Creator interests' : '創作者興趣'}
                value={intake.interests}
                onChange={(e) => setIntake({ ...intake, interests: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl px-3.5 py-2.5"
              />
            </div>
          </div>
        </div>

        {/* Part 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            {t.part2Title}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-sm block">7. {lang === 'en' ? 'Target Audience Definition' : '目標受眾設定'}</span>
              <textarea
                rows={4}
                aria-label={lang === 'en' ? 'Audience hypothesis' : '受眾假設'}
                value={intake.targetAudience}
                onChange={(e) => setIntake({ ...intake, targetAudience: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl p-3"
              />
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-sm block">8. {lang === 'en' ? 'Core Problems Solved' : '解決之痛點難題'}</span>
              <textarea
                rows={4}
                aria-label={lang === 'en' ? 'Core problem' : '核心問題'}
                value={intake.problemsSolved}
                onChange={(e) => setIntake({ ...intake, problemsSolved: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl p-3"
              />
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-sm block">9. {lang === 'en' ? 'Product Concept & Hook' : '產品概念與訴求'}</span>
              <textarea
                rows={4}
                aria-label={lang === 'en' ? 'Product concept' : '產品概念'}
                value={intake.productIdea}
                onChange={(e) => setIntake({ ...intake, productIdea: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl p-3"
              />
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-sm block">10. {lang === 'en' ? 'Desired Transformation Promise' : '核心承諾與轉變'}</span>
              <textarea
                rows={4}
                aria-label={lang === 'en' ? 'Intended outcome' : '預期成果'}
                value={intake.desiredTransformation}
                onChange={(e) => setIntake({ ...intake, desiredTransformation: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl p-3"
              />
            </div>
          </div>
        </div>

        {/* Part 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 space-y-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            {t.part3Title}
          </h2>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3">
              <span className="font-bold text-slate-900 block">11. {lang === 'en' ? 'Brand Voice & Style' : '品牌語調與視覺方向'}</span>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Personality</span>
                <input
                  type="text"
                  value={intake.brandStyleAndVoice.personality}
                  onChange={(e) => setIntake({ ...intake, brandStyleAndVoice: { ...intake.brandStyleAndVoice, personality: e.target.value } })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Writing Voice</span>
                <input
                  type="text"
                  value={intake.brandStyleAndVoice.writingVoice}
                  onChange={(e) => setIntake({ ...intake, brandStyleAndVoice: { ...intake.brandStyleAndVoice, writingVoice: e.target.value } })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Typography Direction</span>
                <input
                  type="text"
                  value={intake.brandStyleAndVoice.typographyDirection}
                  onChange={(e) => setIntake({ ...intake, brandStyleAndVoice: { ...intake.brandStyleAndVoice, typographyDirection: e.target.value } })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2"
                />
              </label>
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3">
              <span className="font-bold text-slate-900 block">12. {lang === 'en' ? 'Constraints & Disclaimers' : '邊界限制與免責規範'}</span>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Product Boundaries</span>
                <input
                  type="text"
                  value={intake.constraintsAndExclusions.productBoundaries}
                  onChange={(e) => setIntake({ ...intake, constraintsAndExclusions: { ...intake.constraintsAndExclusions, productBoundaries: e.target.value } })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Accuracy Standards</span>
                <input
                  type="text"
                  value={intake.constraintsAndExclusions.accuracyStandards}
                  onChange={(e) => setIntake({ ...intake, constraintsAndExclusions: { ...intake.constraintsAndExclusions, accuracyStandards: e.target.value } })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Safety Rules</span>
                <input
                  type="text"
                  value={intake.constraintsAndExclusions.safetyRules}
                  onChange={(e) => setIntake({ ...intake, constraintsAndExclusions: { ...intake.constraintsAndExclusions, safetyRules: e.target.value } })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2"
                />
              </label>
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3">
              <span className="font-bold text-slate-900 block">13. {lang === 'en' ? 'Pricing Ladder' : '建議定價階梯'}</span>
              <div className="grid grid-cols-3 gap-2.5">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">Test</span>
                  <input
                    type="number"
                    min={0}
                    value={intake.recommendedPrice.introductoryTest}
                    onChange={(e) => setIntake({ ...intake, recommendedPrice: { ...intake.recommendedPrice, introductoryTest: Number(e.target.value) } })}
                    className="w-full font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 tabular-nums"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">Regular</span>
                  <input
                    type="number"
                    min={0}
                    value={intake.recommendedPrice.regular}
                    onChange={(e) => setIntake({ ...intake, recommendedPrice: { ...intake.recommendedPrice, regular: Number(e.target.value) } })}
                    className="w-full font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 tabular-nums"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">Bundle</span>
                  <input
                    type="number"
                    min={0}
                    value={intake.recommendedPrice.premiumBundle}
                    onChange={(e) => setIntake({ ...intake, recommendedPrice: { ...intake.recommendedPrice, premiumBundle: Number(e.target.value) } })}
                    className="w-full font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 tabular-nums"
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Rationale</span>
                <textarea
                  rows={3}
                  value={intake.recommendedPrice.rationale}
                  onChange={(e) => setIntake({ ...intake, recommendedPrice: { ...intake.recommendedPrice, rationale: e.target.value } })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
      </details>
    </div>
  );
};
