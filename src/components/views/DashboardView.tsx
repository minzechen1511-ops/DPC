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

  const getNextRecommendedStage = (): {
    stageId: StageId;
    title: string;
    detail: string;
    cta: string;
  } => {
    const journeyNext = gateAJourney(project).next;
    const journeyIndex = GATE_A_STEPS.indexOf(journeyNext as any);
    if (journeyIndex >= 0) {
      return {stageId: journeyNext, title: gateAJourneyText[lang].steps[journeyIndex], detail: gateAJourneyText[lang].control, cta: lang === 'en' ? 'Continue recommended path' : '繼續推薦流程'};
    }
    if ((marketResearch?.platformEvidence || []).length === 0) {
      return {
        stageId: 'market_research',
        title: lang === 'en' ? 'Stage 1: Inspect Research Sources & Capture Evidence' : '階段 1：檢視研究資源並蒐集市場實證',
        detail:
          lang === 'en'
            ? 'Review the Gate A resource directory, run live official chart collectors, or log dated observations in Manual Evidence Review.'
            : '檢視公開研究資源目錄、掃描即時排行榜或透過人工證據審查記錄觀測資料。',
        cta: lang === 'en' ? 'Open Market Research' : '前往市場研究',
      };
    }
    if (!workflow?.gates?.gateA?.isApproved) {
      return {
        stageId: 'topic_selection',
        title: lang === 'en' ? 'Stage 2: Select & Approve Niche Candidate (Gate A)' : '階段 2：評估推薦選題並核准 (Gate A)',
        detail:
          lang === 'en'
            ? 'Inspect Evidence Strength vs. Product Suitability for each niche candidate and explicitly approve Gate A.'
            : '分別檢視證據強度與產品適配假設，選定題材並手動核准 Gate A。',
        cta: lang === 'en' ? 'Open Topic Selection' : '前往選題評估',
      };
    }
    if (workflow?.stageStatuses?.project_brief !== 'COMPLETED') {
      return {
        stageId: 'project_brief',
        title: lang === 'en' ? 'Stage 3: Define 13-Field Project Brief' : '階段 3：設定 13 項專案核心規範',
        detail:
          lang === 'en'
            ? 'Refine buyer persona, core problem boundaries, safety guardrails, and editorial voice.'
            : '完備目標受眾、問題邊界、安全準則與品牌語調規範。',
        cta: lang === 'en' ? 'Open Project Brief' : '前往專案設定',
      };
    }
    if (workflow?.stageStatuses?.uvz !== 'COMPLETED') {
      return {
        stageId: 'uvz',
        title: lang === 'en' ? 'Stage 4: Define Unique Value Zone (UVZ)' : '階段 4：制定獨特價值區隔 (UVZ)',
        detail:
          lang === 'en'
            ? 'Structure differentiated positioning wedges so your product stands apart from generic books.'
            : '建立具差異化的市場定位切角與主張。',
        cta: lang === 'en' ? 'Open UVZ Studio' : '前往 UVZ 策略',
      };
    }
    if (workflow?.stageStatuses?.transformation_map !== 'COMPLETED') {
      return {
        stageId: 'transformation_map',
        title: lang === 'en' ? 'Stage 5: Map Customer Transformation & Titles' : '階段 5：顧客轉變路徑與書名定位',
        detail:
          lang === 'en'
            ? 'Structure the Before → Bridge → After roadmap and choose a clear title & subtitle.'
            : '建立 Before → Bridge → After 轉變藍圖並選定書名定位。',
        cta: lang === 'en' ? 'Open Transformation Map' : '前往轉變藍圖',
      };
    }
    if (verifiedRefs < 1) {
      return {
        stageId: 'reference_library',
        title: lang === 'en' ? 'Stage 6: Retrieve Grounded Research Sources (ARCE)' : '階段 6：建立來源實證文獻庫 (ARCE)',
        detail:
          lang === 'en'
            ? 'Retrieve and verify real bibliographic references to back claims and satisfy Gate B.'
            : '擷取真實文獻摘要與出處連結，滿足 Gate B 引用依據要求。',
        cta: lang === 'en' ? 'Open Reference Library' : '前往來源研究',
      };
    }
    if (!workflow?.gates?.gateB?.isApproved || gateIssues(project, 'gateB').length > 0) {
      return {
        stageId: 'product_charter',
        title: lang === 'en' ? 'Stage 7: Align & Approve Product Charter (Gate B)' : '階段 7：對齊產品憲章並核准 (Gate B)',
        detail:
          lang === 'en'
            ? 'Finalize charter pillars & learning objectives, review requirements, and unlock chapter generation.'
            : '對齊產品支柱與學習目標，核准 Gate B 以解鎖章節撰寫。',
        cta: lang === 'en' ? 'Open Product Charter' : '前往產品憲章',
      };
    }
    if (totalChapters === 0) {
      return {
        stageId: 'outline_builder',
        title: lang === 'en' ? 'Stage 8: Architect Chapter Outline' : '階段 8：規劃章節大綱架構',
        detail:
          lang === 'en'
            ? 'Structure outcome-driven chapters mapped directly to your retrieved research sources.'
            : '建立具明確交付物與來源對應的章節大綱結構。',
        cta: lang === 'en' ? 'Open Outline Builder' : '前往章節大綱',
      };
    }
    if (chaptersDone < totalChapters) {
      return {
        stageId: 'content_studio',
        title:
          lang === 'en'
            ? `Stage 9: Draft Remaining Chapters (${chaptersDone}/${totalChapters} Done)`
            : `階段 9：撰寫電子書章節正文（已完成 ${chaptersDone}/${totalChapters}）`,
        detail:
          lang === 'en'
            ? 'Draft chapter-by-chapter with inline source citations and passage-level review.'
            : '完成逐章正文撰寫、連續記憶同步與引用查核。',
        cta: lang === 'en' ? 'Open Content Studio' : '前往長篇內容工廠',
      };
    }
    if ((project.resources || []).length === 0) {
      return {
        stageId: 'workbook_studio',
        title: lang === 'en' ? 'Stage 10: Build Companion Toolkit Suite' : '階段 10：製作伴隨實作工具套件',
        detail:
          lang === 'en'
            ? 'Create practical workbooks, checklists, and decision worksheets included with the product.'
            : '製作實作工作表、檢核清單與速查範本提升交付實用度。',
        cta: lang === 'en' ? 'Open Companion Toolkit' : '前往伴隨工具套件',
      };
    }
    if (!workflow?.gates?.gateC?.isApproved || gateIssues(project, 'gateC').length > 0) {
      return {
        stageId: 'quality_assurance',
        title: lang === 'en' ? 'Stage 11: Complete Quality & Citation Audit (Gate C)' : '階段 11：完成出版品質與引用稽核 (Gate C)',
        detail:
          lang === 'en'
            ? 'Verify passage-level source support and approve Gate C to unlock buyer bundle export.'
            : '完成逐段引用核對與 Gate C 核准，解鎖買家正式套件匯出。',
        cta: lang === 'en' ? 'Open Quality Audit' : '前往品質審查',
      };
    }
    if (workflow?.stageStatuses?.brand_design !== 'COMPLETED') {
      return {
        stageId: 'brand_design',
        title: lang === 'en' ? 'Stage 12: Apply Commercial Imprint & Cover Styling' : '階段 12：設定出版視覺品牌與封面排版',
        detail:
          lang === 'en'
            ? 'Configure typography and 60-30-10 palette for your exported HTML e-book.'
            : '套用配色與出版字體，規範專書、封面與工作表排版視覺。',
        cta: lang === 'en' ? 'Open Brand Design' : '前往品牌視覺設計',
      };
    }
    if (workflow?.stageStatuses?.pricing_launch !== 'COMPLETED') {
      return {
        stageId: 'pricing_launch',
        title: lang === 'en' ? 'Stage 13: Finalize Pricing & Storefront Copy' : '階段 13：制定定價與上市銷售文案',
        detail:
          lang === 'en'
            ? 'Model channel margins and prepare honest sales copy, FAQ, and launch emails.'
            : '試算平台淨利並準備誠實透明的上架銷售文案。',
        cta: lang === 'en' ? 'Open Pricing & Launch' : '前往定價與行銷',
      };
    }
    return {
      stageId: 'export_center',
      title: lang === 'en' ? 'Stage 14: Export Buyer Learning Bundle ZIP' : '階段 14：預覽並匯出完整商業套件 ZIP',
      detail:
        lang === 'en'
          ? 'Download your Buyer Learning Bundle (.zip) with START-HERE.html, Styled E-Book, Workbooks, Provenance Records & Storefront Listing Kit.'
          : '立即匯出含 START-HERE 入口、精裝電子書、伴隨工作表與來源稽核檔之完整 ZIP。',
      cta: lang === 'en' ? 'Open Export Center' : '前往匯出下載中心',
    };
  };

  const nextStage = getNextRecommendedStage();

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
                onClick={() => setActiveView('market_research')}
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
            onClick={() => setActiveView('market_research')}
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
              { id: 'market_research', title: lang === 'en' ? '1. Market Research & Sources' : '1. 市場研究與資源檢核', icon: TrendingUp },
              { id: 'topic_selection', title: lang === 'en' ? '2. Topic Selection (Gate A)' : '2. 選題評估與核准 (Gate A)', icon: Sparkles },
              { id: 'project_brief', title: lang === 'en' ? '3. Project Brief (13 Fields)' : '3. 13項專案設定', icon: Feather },
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
