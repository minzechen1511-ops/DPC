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
} from 'lucide-react';
import { DigitalProductProject, StageId } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Blank Project Onboarding Notice Banner */}
      {project.isBlankProject && (
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl p-6 shadow-md border border-indigo-700/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{t.blankProjectNotice}</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                {lang === 'en'
                  ? 'Launch a Commercial, Evidence-Backed Digital Product'
                  : '開啟全新的商業級數位商品開發專案'}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t.blankProjectDesc}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setActiveView('new_project')}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{t.navNewProject}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('market_research')}
                className="px-4 py-2.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>{t.runMarketResearchNow}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Project Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-indigo-600 uppercase tracking-wide">
                {lang === 'en' ? 'Active Project' : '目前進行中專案'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{project.preferences?.productFormat || 'ebook_toolkit'}</span>
              <span aria-hidden="true">·</span>
              <span>
                {lang === 'en' ? 'Market' : '目標市場'}: {project.preferences?.market || 'US'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {lang === 'en' ? 'Imprint' : '品牌識別'}: {project.brand?.profileName || 'Modern Minimalist'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {charter?.productTitle || project.name || t.untitledProject}
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl">
              {charter?.subtitle || charter?.centralPromise || (lang === 'en' ? 'Ready to analyze market signals and create commercial evidence-based digital products.' : '隨時可啟動市場情報調查並產出高品質商業數位產品。')}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveView('new_project')}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
            >
              {lang === 'en' ? 'New Project' : '建立新專案'}
            </button>
          </div>
        </div>

        {/* 3 Major Human Approval Gates (Accessible Button Cards) */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gate A */}
          <button
            type="button"
            onClick={() => setActiveView('topic_selection')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              workflow?.gates?.gateA?.isApproved && !gateIssues(project, 'gateA').length
                ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
                : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800">{t.gateA}</span>
              {workflow?.gates?.gateA?.isApproved && !gateIssues(project, 'gateA').length ? (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {t.approved}
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-700">{t.pending}</span>
              )}
            </div>
            <p className="text-xs text-slate-600 line-clamp-1">
              {(marketResearch?.topicCandidates || []).find((c) => c.id === marketResearch?.selectedTopicId)?.title ||
                (lang === 'en' ? 'Select and approve recommended topic' : '點擊選擇並核准市場推薦題材')}
            </p>
          </button>

          {/* Gate B */}
          <button
            type="button"
            onClick={() => setActiveView('product_charter')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              workflow?.gates?.gateB?.isApproved && !gateIssues(project, 'gateB').length
                ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
                : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800">{t.gateB}</span>
              {workflow?.gates?.gateB?.isApproved && !gateIssues(project, 'gateB').length ? (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {t.approved}
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-700">{t.pending}</span>
              )}
            </div>
            <p className="text-xs text-slate-600 line-clamp-1">
              {charter?.signatureFramework || (lang === 'en' ? 'Product Charter & Core Architecture' : '17項產品規範基準與架構')}
            </p>
          </button>

          {/* Gate C */}
          <button
            type="button"
            onClick={() => setActiveView('quality_assurance')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              workflow?.gates?.gateC?.isApproved && !gateIssues(project, 'gateC').length
                ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
                : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-800">{t.gateC}</span>
              {workflow?.gates?.gateC?.isApproved && !gateIssues(project, 'gateC').length ? (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {lang === 'en' ? 'Ready' : '已就緒'}
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-600">
                  {lang === 'en' ? 'Pending Final Audit' : '待最後稽核'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 line-clamp-1">
              {lang === 'en' ? 'Publication requirements to review' : '待審查出版要求'}: {gateIssues(project, 'gateC').length}
            </p>
          </button>
        </div>
      </div>

      {/* 4 Essential Health & Commercial Posture Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 mb-1 flex items-center justify-between">
            <span>{lang === 'en' ? 'Reference Library' : '研究文獻庫 (ARCE)'}</span>
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {verifiedRefs}
            <span className="text-sm font-normal text-slate-400"> / {targetRefs}</span>
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">
            {lang === 'en' ? 'Retrieved & Reviewed Sources' : '已驗證並配置之知識卡'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 mb-1 flex items-center justify-between">
            <span>{lang === 'en' ? 'Manuscript Progress' : '完成章節與篇幅'}</span>
            <Feather className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {chaptersDone}
            <span className="text-sm font-normal text-slate-400"> / {totalChapters}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            {lang === 'en' ? 'Words' : '字數'}: {(qualityReport?.actualWordCount || 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 mb-1 flex items-center justify-between">
            <span>{lang === 'en' ? 'Commercial Price Ladder' : '商業三階定價配置'}</span>
            <Tag className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            ${pricingReport?.introductoryPrice || 19} / ${pricingReport?.regularPrice || 29} / ${pricingReport?.bundlePrice || 49}
          </div>
          <div className="text-[11px] text-indigo-700 mt-1">
            {(project.resources || []).length} {lang === 'en' ? 'companion assets included' : '套伴隨實作資源'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 mb-1 flex items-center justify-between">
            <span>{lang === 'en' ? 'AI Engine & Usage' : 'AI 模型與用量'}</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 font-mono truncate" title={aiSettings?.defaultModel}>
            {aiSettings?.provider?.toUpperCase() || 'OPENROUTER'}: {aiSettings?.defaultModel || 'default'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            {lang === 'en' ? 'Requests' : '請求'}: {aiSettings?.usageStats?.totalRequests || 0} · ${(aiSettings?.usageStats?.estimatedCostUsd || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Pipeline Stage Quick Access Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {lang === 'en' ? 'Workflow Stage Pipeline' : '自動化產線階段導航'}
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'en'
                ? 'Click any stage to enter its dedicated studio, edit data, or trigger generation.'
                : '點選直接進入各專案工作台進行檢視或自訂微調'}
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
            {lang === 'en' ? 'Overall Progress' : '總進度'} {progressPercent}%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 'market_research', title: lang === 'en' ? '1. Market Intelligence' : '1. 市場情報 (MTRE)', icon: TrendingUp },
            { id: 'topic_selection', title: lang === 'en' ? '2. Topic Recommendations' : '2. 題材推薦 (Gate A)', icon: Sparkles },
            { id: 'project_brief', title: lang === 'en' ? '3. Project Setup (13 Fields)' : '3. 13項專案設定', icon: Feather },
            { id: 'reference_library', title: lang === 'en' ? '4. Reference Library (ARCE)' : '4. 自動文獻庫 (ARCE)', icon: BookOpen },
            { id: 'product_charter', title: lang === 'en' ? '5. Product Charter (Gate B)' : '5. 產品憲章 (Gate B)', icon: Award },
            { id: 'content_studio', title: lang === 'en' ? '6. Content Studio' : '6. 長篇內容工廠', icon: Feather },
            { id: 'workbook_studio', title: lang === 'en' ? '7. Companion Toolkit' : '7. 伴隨工具套件', icon: Layers },
            { id: 'export_center', title: lang === 'en' ? '8. Export Center' : '8. 匯出下載中心', icon: Download },
          ].map((stage) => {
            const Icon = stage.icon;
            const status = project.workflow?.stageStatuses?.[stage.id as StageId];
            return (
              <button
                key={stage.id}
                onClick={() => setActiveView(stage.id as StageId)}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 text-left transition-all group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 shrink-0" />
                  <span className="text-xs font-medium text-slate-800 truncate">{stage.title}</span>
                </div>
                {status === 'COMPLETED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
