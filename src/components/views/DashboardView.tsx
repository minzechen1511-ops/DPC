import {recommendedJourneyStage, stageName, stageHandoffCopy} from '../../utils/stageJourney.ts';
import { GATE_A_STEPS, gateAJourney } from '../../utils/gateAJourney.ts';
import { gateAJourneyText } from '../../utils/i18n.ts';
import { isRetrievedSource } from '../../utils/sourceEvidence.ts';
import { gateIssues } from '../../utils/gatePolicy.ts';
import React from 'react';
import {
  Sparkles,
  TrendingUp,
  BookOpen,
  Feather,
  Download,
  ArrowRight,
  CheckCircle2,
  Layers,
  Award,
  Tag,
  Activity,
} from 'lucide-react';
import { DigitalProductProject, StageId } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { RadialTelemetryGauge, StudioCalibrationRadar } from '../ScientificVisuals.tsx';

interface DashboardViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  progressPercent: number;
  lang?: Language;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  project,
  setActiveView,
  progressPercent,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { charter, referenceLibrary, outline, qualityReport, workflow, marketResearch, aiSettings, pricingReport } = project;

  const chaptersDone = (outline || []).filter((c) => c.isCompleted).length;
  const totalChapters = (outline || []).length;
  const verifiedRefs = (referenceLibrary?.cards || []).filter(isRetrievedSource).length;
  const targetRefs = referenceLibrary?.targetCount || 20;

  const nextId = recommendedJourneyStage(project);
  const nextStage = {stageId:nextId, title:stageName(nextId,lang), detail:stageHandoffCopy[lang][nextId] || (lang==='en'?'Review and download your current product bundle.':'覆核並下載目前產品套件。'), cta:lang==='en'?'Continue product journey':'繼續產品開發流程'};

  return (
    <div className="w-full space-y-5 pb-3">
      {/* Blank Project Onboarding Notice Banner */}
      {project.isBlankProject && (
        <div className="bg-gradient-to-r from-[#0b2933] via-[#0f3d47] to-[#0c3556] text-white rounded-2xl p-6 lg:p-7 shadow-md border border-cyan-700/40">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-4xl">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{t.blankProjectNotice}</span>
              </div>
              <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-white">
                {lang === 'en'
                  ? 'Launch a Commercial, Evidence-Backed Digital Product'
                  : '開啟全新的商業級數位商品開發專案'}
              </h2>
              <p className="text-sm text-slate-200 leading-relaxed">
                {t.blankProjectDesc}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setActiveView('new_project')}
                className="px-5 py-3 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{t.navNewProject}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('topic_selection')}
                className="px-5 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <TrendingUp className="w-4 h-4 text-sky-700" />
                <span>{t.runMarketResearchNow}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Project Command Deck + Radial Gauge */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono text-slate-600">
              <span className="font-bold text-teal-700 uppercase tracking-wider">
                {lang === 'en' ? 'Active Workspace' : '目前進行中專案'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{project.preferences?.productFormat || 'ebook_toolkit'}</span>
              <span aria-hidden="true">·</span>
              <span>
                {lang === 'en' ? 'Market' : '目標市場'}: {project.preferences?.market || 'US'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {lang === 'en' ? 'Imprint' : '品牌識別'}: {project.brand?.profileName || 'Mineral Studio'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900">
              {charter?.productTitle || project.name || t.untitledProject}
            </h1>
            <p className="text-sm lg:text-base text-slate-600 max-w-4xl leading-relaxed">
              {charter?.subtitle || charter?.centralPromise || (lang === 'en' ? 'Ready to analyze market signals and create commercial evidence-based digital products.' : '隨時可啟動市場情報調查並產出高品質商業數位產品。')}
            </p>
          </div>

          <div className="flex items-center gap-5 shrink-0">
            <RadialTelemetryGauge
              value={progressPercent}
              label={lang === 'en' ? 'Pipeline Index' : '產線完成度'}
              size={104}
            />
            <button
              type="button"
              onClick={() => setActiveView('new_project')}
              className="px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors whitespace-nowrap"
            >
              {lang === 'en' ? 'New Project' : '建立新專案'}
            </button>
          </div>
        </div>

        {/* 3 Major Human Approval Gates */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setActiveView('topic_selection')}
            className={`p-4 lg:p-5 rounded-xl border text-left transition-all ${
              workflow?.gates?.gateA?.isApproved && !gateIssues(project, 'gateA').length
                ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-400'
                : 'bg-slate-50/90 border-slate-200 hover:border-sky-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-slate-900">{t.gateA}</span>
              {workflow?.gates?.gateA?.isApproved && !gateIssues(project, 'gateA').length ? (
                <span className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {t.approved}
                </span>
              ) : (
                <span className="text-xs font-mono font-semibold text-amber-700">{t.pending}</span>
              )}
            </div>
            <p className="text-sm text-slate-600 line-clamp-1">
              {(marketResearch?.topicCandidates || []).find((c) => c.id === marketResearch?.selectedTopicId)?.title ||
                (lang === 'en' ? 'Select and approve recommended topic' : '點擊選擇並核准市場推薦題材')}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('product_charter')}
            className={`p-4 lg:p-5 rounded-xl border text-left transition-all ${
              workflow?.gates?.gateB?.isApproved && !gateIssues(project, 'gateB').length
                ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-400'
                : 'bg-slate-50/90 border-slate-200 hover:border-sky-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-slate-900">{t.gateB}</span>
              {workflow?.gates?.gateB?.isApproved && !gateIssues(project, 'gateB').length ? (
                <span className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {t.approved}
                </span>
              ) : (
                <span className="text-xs font-mono font-semibold text-amber-700">{t.pending}</span>
              )}
            </div>
            <p className="text-sm text-slate-600 line-clamp-1">
              {charter?.signatureFramework || (lang === 'en' ? 'Product Charter & Core Architecture' : '產品憲章規範基準與架構')}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('quality_assurance')}
            className={`p-4 lg:p-5 rounded-xl border text-left transition-all ${
              workflow?.gates?.gateC?.isApproved && !gateIssues(project, 'gateC').length
                ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-400'
                : 'bg-slate-50/90 border-slate-200 hover:border-sky-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-slate-900">{t.gateC}</span>
              {workflow?.gates?.gateC?.isApproved && !gateIssues(project, 'gateC').length ? (
                <span className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {lang === 'en' ? 'Ready' : '已就緒'}
                </span>
              ) : (
                <span className="text-xs font-mono font-semibold text-slate-600">
                  {lang === 'en' ? 'Pending Final Audit' : '待最後稽核'}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 line-clamp-1">
              {lang === 'en' ? 'Publication requirements to review' : '待審查出版要求'}: {gateIssues(project, 'gateC').length}
            </p>
          </button>
        </div>
      </div>

      {/* 4 Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center justify-between">
            <span>{lang === 'en' ? 'Reference Library' : '研究文獻庫 (ARCE)'}</span>
            <BookOpen className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {verifiedRefs}
            <span className="text-base font-normal text-slate-500"> / {targetRefs}</span>
          </div>
          <div className="text-xs text-emerald-700 font-medium mt-1.5">
            {lang === 'en' ? 'Retrieved & Reviewed Sources' : '已驗證並配置之知識卡'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center justify-between">
            <span>{lang === 'en' ? 'Manuscript Progress' : '完成章節與篇幅'}</span>
            <Feather className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {chaptersDone}
            <span className="text-base font-normal text-slate-500"> / {totalChapters}</span>
          </div>
          <div className="text-xs text-slate-600 mt-1.5 font-mono tabular-nums">
            {lang === 'en' ? 'Words' : '字數'}: {(qualityReport?.actualWordCount || 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center justify-between">
            <span>{lang === 'en' ? 'Commercial Price Ladder' : '商業三階定價配置'}</span>
            <Tag className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            ${pricingReport?.introductoryPrice || 19} / ${pricingReport?.regularPrice || 29} / ${pricingReport?.bundlePrice || 49}
          </div>
          <div className="text-xs text-teal-700 font-medium mt-1.5">
            {(project.resources || []).length} {lang === 'en' ? 'companion assets included' : '套伴隨實作資源'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center justify-between">
            <span>{lang === 'en' ? 'AI Engine & Usage' : 'AI 模型與用量'}</span>
            <Sparkles className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-base font-bold text-slate-900 font-mono truncate" title={aiSettings?.defaultModel}>
            {(aiSettings?.provider || 'gemini').toUpperCase()}: {aiSettings?.defaultModel || 'gemini-4-hydrogen'}
          </div>
          <div className="text-xs text-slate-600 mt-2 font-mono tabular-nums">
            {lang === 'en' ? 'Requests' : '請求'}: {aiSettings?.usageStats?.totalRequests || 0} · ${(aiSettings?.usageStats?.estimatedCostUsd || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Synthesise.ai Next Recommended Step Co-Pilot */}
      <div className="lab-panel p-5 sm:p-6 bg-gradient-to-r from-teal-50/70 via-white to-sky-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider font-bold text-teal-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'Synthesise.ai Guided Workflow Co-Pilot' : 'Synthesise.ai 產線下一步智慧引導'}</span>
          </div>
          <h2 className="text-base lg:text-lg font-bold text-slate-900">{nextStage.title}</h2>
          <p className="text-sm text-slate-600">{nextStage.detail}</p>
        </div>

        <button
          type="button"
          onClick={() => setActiveView(nextStage.stageId)}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap shrink-0"
        >
          <span>{nextStage.cta}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Scientific Telemetry Calibration Radar + 8-Stage Pipeline Matrix */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-5 lab-panel p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'en' ? 'Studio Calibration Radar' : '產線五維科學成熟度診斷'}
              </h2>
            </div>
            <span className="text-xs font-mono text-sky-700 font-semibold">
              {lang === 'en' ? '5-Axis Readiness' : '五維成熟度指標'}
            </span>
          </div>
          <StudioCalibrationRadar project={project} lang={lang} />
        </div>

        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'en' ? 'Workflow Stage Pipeline' : '自動化產線階段導航'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'en'
                  ? 'Select any stage to enter its full-screen studio workspace.'
                  : '點選直接進入各專案工作台進行檢視或自訂微調'}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1 rounded-md">
              {lang === 'en' ? 'Overall Progress' : '總進度'} {progressPercent}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              { id: 'topic_selection', title: `1. ${gateAJourneyText[lang].steps[0]}`, icon: Sparkles },
              { id: 'project_brief', title: `2. ${gateAJourneyText[lang].steps[1]}`, icon: Feather },
              { id: 'uvz', title: `3. ${gateAJourneyText[lang].steps[2]}`, icon: Sparkles },
              { id: 'transformation_map', title: `4. ${gateAJourneyText[lang].steps[3]}`, icon: TrendingUp },
              { id: 'reference_library', title: lang === 'en' ? '6. Reference Library' : '6. 來源研究與知識庫', icon: BookOpen },
              { id: 'product_charter', title: lang === 'en' ? '7. Product Charter (Gate B)' : '7. 產品憲章 (Gate B)', icon: Award },
              { id: 'content_studio', title: lang === 'en' ? '9. Content Studio' : '9. 長篇內容工廠', icon: Feather },
              { id: 'quality_assurance', title: lang === 'en' ? '11. Quality Audit (Gate C)' : '11. 品質審查 (Gate C)', icon: CheckCircle2 },
              { id: 'export_center', title: lang === 'en' ? '14. Export Bundle' : '14. 匯出下載中心', icon: Download },
            ].map((stage) => {
              const Icon = stage.icon;
              const status = project.workflow?.stageStatuses?.[stage.id as StageId];
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveView(stage.id as StageId)}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-sky-500 hover:bg-sky-50/30 text-left transition-all group"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-sky-100 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-slate-600 group-hover:text-sky-700" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800 truncate">{stage.title}</span>
                  </div>
                  {status === 'COMPLETED' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
