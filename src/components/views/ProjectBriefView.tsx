import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, Lock, Unlock, Save, Sparkles } from 'lucide-react';
import { DigitalProductProject, ProjectIntake } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { generateTextWithAi } from '../../services/aiService.ts';
import { buildBriefSynthesisPrompt, parseBriefSynthesisResponse } from '../../utils/stageSynthesis.ts';

interface ProjectBriefViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onUpdateIntake: (intake: ProjectIntake) => void;
  onRecordAiUsage?: (usage?: { total_tokens?: number }, model?: string) => void;
  lang?: Language;
}

export const ProjectBriefView: React.FC<ProjectBriefViewProps> = ({
  project,
  setActiveView,
  onUpdateIntake,
  onRecordAiUsage,
  lang = 'en',
}) => {
  const t = translations[lang];
  const [intake, setIntake] = useState<ProjectIntake>(project.intake);
  const [lockedFields, setLockedFields] = useState<Record<string, boolean>>({});
  const [savedNotice, setSavedNotice] = useState(false);
  const [focusNote, setFocusNote] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState('');

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

  const handleSynthesizeBrief = async () => {
    setAiBusy(true);
    setAiError('');
    setAiSuccess('');
    try {
      const workingProject: DigitalProductProject = {
        ...project,
        intake,
      };
      const { systemPrompt, userPrompt } = buildBriefSynthesisPrompt(workingProject, lang, focusNote);
      const res = await generateTextWithAi({
        provider: 'gemini',
        model: project.aiSettings?.defaultModel || 'gemini-4-hydrogen',
        systemPrompt,
        userPrompt,
        maxTokens: 2000,
        projectId: project.projectId,
      });
      onRecordAiUsage?.(res?.usage, res?.model);
      const synthesized = parseBriefSynthesisResponse(res?.content || '', intake);
      const merged: ProjectIntake = {
        ...synthesized,
        projectName: lockedFields['projectName'] ? intake.projectName : synthesized.projectName,
        creatorName: lockedFields['creatorName'] ? intake.creatorName : synthesized.creatorName,
      };
      setIntake(merged);
      onUpdateIntake(merged);
      setAiSuccess(
        lang === 'en'
          ? 'All 13 Project Brief fields have been refined and aligned for commercial positioning.'
          : '已完成 13 項專案設定的 AI 商業定位強化與同步更新。'
      );
    } catch (err: any) {
      setAiError(
        err?.message ||
          (lang === 'en'
            ? 'Could not reach server Gemini engine to synthesize the brief.'
            : '無法連接伺服器端 Gemini 引擎以合成專案設定。')
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
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t.approveBriefCta}</span>
          </button>
        </div>
      </div>

      {/* Synthesise.ai Brief Co-Pilot Bar */}
      <div className="lab-panel p-5 sm:p-6 bg-gradient-to-r from-teal-50/70 via-white to-sky-50/60 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider font-bold text-teal-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Synthesise.ai Brief Co-Pilot' : 'Synthesise.ai 專案定位智能助手'}</span>
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
            onClick={handleSynthesizeBrief}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap shrink-0"
          >
            <Sparkles className={`w-4 h-4 ${aiBusy ? 'animate-spin' : ''}`} />
            <span>
              {aiBusy
                ? lang === 'en' ? 'Synthesizing 13 Fields...' : '正在智能生成 13 項設定...'
                : lang === 'en' ? 'AI Synthesize & Polish 13 Fields' : 'AI 一鍵優化 13 項設定'}
            </span>
          </button>
        </div>

        <input
          type="text"
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

      {aiError && (
        <p role="alert" className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm font-medium">
          {aiError}
        </p>
      )}

      {(savedNotice || aiSuccess) && (
        <p role="status" className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium">
          {aiSuccess || (lang === 'en' ? '13-Field Project Brief draft saved.' : '13 項專案設定草稿已儲存。')}
        </p>
      )}

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
                <button type="button" onClick={() => handleToggleLock('projectName')} className="text-slate-500 hover:text-slate-700 p-1">
                  {lockedFields['projectName'] ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4" />}
                </button>
              </div>
              <input
                type="text"
                disabled={lockedFields['projectName']}
                value={intake.projectName}
                onChange={(e) => setIntake({ ...intake, projectName: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl px-3.5 py-2.5"
              />
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-800">2. {lang === 'en' ? 'Creator / Brand Name' : '創作者/品牌名稱'}</span>
                <button type="button" onClick={() => handleToggleLock('creatorName')} className="text-slate-500 hover:text-slate-700 p-1">
                  {lockedFields['creatorName'] ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4" />}
                </button>
              </div>
              <input
                type="text"
                disabled={lockedFields['creatorName']}
                value={intake.creatorName}
                onChange={(e) => setIntake({ ...intake, creatorName: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl px-3.5 py-2.5"
              />
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-sm block">3. {lang === 'en' ? 'Experience Level' : '經驗等級'}</span>
              <select
                value={intake.experienceLevel}
                onChange={(e) => setIntake({ ...intake, experienceLevel: e.target.value as any })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl px-3.5 py-2.5"
              >
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
                value={intake.relevantExperience}
                onChange={(e) => setIntake({ ...intake, relevantExperience: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl px-3.5 py-2.5"
              />
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-sm block">5. {lang === 'en' ? 'Subject Matter Expertise' : '核心專業範疇'}</span>
              <input
                type="text"
                value={intake.expertise}
                onChange={(e) => setIntake({ ...intake, expertise: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl px-3.5 py-2.5"
              />
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-sm block">6. {lang === 'en' ? 'Creator Focus & Interests' : '創作者研究興趣'}</span>
              <input
                type="text"
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
                value={intake.targetAudience}
                onChange={(e) => setIntake({ ...intake, targetAudience: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl p-3"
              />
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-sm block">8. {lang === 'en' ? 'Core Problems Solved' : '解決之痛點難題'}</span>
              <textarea
                rows={4}
                value={intake.problemsSolved}
                onChange={(e) => setIntake({ ...intake, problemsSolved: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl p-3"
              />
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-sm block">9. {lang === 'en' ? 'Product Concept & Hook' : '產品概念與訴求'}</span>
              <textarea
                rows={4}
                value={intake.productIdea}
                onChange={(e) => setIntake({ ...intake, productIdea: e.target.value })}
                className="w-full font-medium bg-white border border-slate-300 rounded-xl p-3"
              />
            </div>

            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-sm block">10. {lang === 'en' ? 'Desired Transformation Promise' : '核心承諾與轉變'}</span>
              <textarea
                rows={4}
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
    </div>
  );
};
