import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  ExternalLink,
  TrendingUp,
  Filter,
  RefreshCw,
  Sparkles,
  Zap,
  Target,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Layers,
  Globe,
  ClipboardCheck,
  ShieldCheck,
  AlertTriangle,
  Database,
} from 'lucide-react';
import type {
  DigitalProductProject,
  GateAResourceEntry,
  MarketplaceObservation,
  TopicCandidate,
} from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import {
  getLinkedObservationForCandidate,
  isCurrentMarketEvidence,
  isGateAQualifiedEvidence,
  isReviewedFallbackEvidence,
  observationCategory,
} from '../../utils/marketDiscoveryEngine.ts';
import {
  isObservationReviewStale,
  inferObservationDefaults,
} from '../../utils/manualEvidenceReview.ts';
import { gateIssues } from '../../utils/gatePolicy.ts';
import { ScoreSpectrumBars } from '../ScientificVisuals.tsx';
import { ResourceDirectoryPanel } from '../market/ResourceDirectoryPanel.tsx';
import { ManualEvidenceReviewPanel } from '../market/ManualEvidenceReviewPanel.tsx';
import { EvidenceLedgerTable, MultiSourceMatrix, multiSourceStatusMeta } from '../market/MultiSourceMatrix.tsx';

export type MarketTabId = 'directory' | 'manual' | 'signals' | 'niches';

interface MarketIntelligenceViewProps {
  researchBusy?: boolean;
  directoryBusy?: boolean;
  researchError?: string;
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onRefreshResearch?: () => void | Promise<void>;
  onCheckResources?: () => void | Promise<void>;
  onAddManualObservation?: (obs: MarketplaceObservation) => void;
  onEditObservation?: (obs: MarketplaceObservation) => void;
  onImportObservations?: (obsList: MarketplaceObservation[]) => void;
  onReviewObservation?: (obs: MarketplaceObservation) => void;
  onDeleteObservation?: (obsId: string) => void;
  onSynchronizeToGateA?: (options?: {
    category?: string;
    prioritizedObservationId?: string;
    focusMarketplace?: string;
    searchQuery?: string;
  }) => void;
  onSelectTopic?: (topicId: string, selectedAudienceHypothesisId?: string) => void;
  onApproveGateA?: () => void;
  initialTab?: MarketTabId;
  lang?: Language;
}

export const MarketIntelligenceView: React.FC<MarketIntelligenceViewProps> = ({
  researchBusy = false,
  directoryBusy = false,
  researchError = '',
  project,
  setActiveView,
  onRefreshResearch,
  onCheckResources,
  onAddManualObservation,
  onEditObservation,
  onImportObservations,
  onReviewObservation,
  onDeleteObservation,
  onSynchronizeToGateA,
  onSelectTopic,
  onApproveGateA,
  initialTab = 'niches',
  lang = 'en',
}) => {
  const t = translations[lang];
  const { marketResearch, workflow } = project;
  const observations = marketResearch?.platformEvidence || [];
  const allCandidates = marketResearch?.topicCandidates || [];
  const selectedId = marketResearch?.selectedTopicId;
  const blockers = gateIssues(project, 'gateA');
  const gateAApproved = Boolean(workflow?.gates?.gateA?.isApproved) && blockers.length === 0;

  const [activeTab, setActiveTab] = useState<MarketTabId>(initialTab);
  const [ledgerViewMode, setLedgerViewMode] = useState<'table' | 'cards'>('table');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [showSourcesPanel, setShowSourcesPanel] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [prefillResource, setPrefillResource] = useState<GateAResourceEntry | null>(null);
  const [focusedObsId, setFocusedObsId] = useState<string | null>(null);
  const [draftAudienceByTopic, setDraftAudienceByTopic] = useState<Record<string, string>>({});

  const autoScannedRef = useRef<boolean>(false);
  const realObservations = observations.filter((o) => !o.isSample);
  const liveChartCount = realObservations.filter((o) => isCurrentMarketEvidence(o)).length;
  const reviewedFallbackCount = realObservations.filter((o) => isReviewedFallbackEvidence(o)).length;
  const staleReviewCount = realObservations.filter((o) => isObservationReviewStale(o)).length;
  const unverifiedRealCount = realObservations.filter((o) => {
    const st = inferObservationDefaults(o).reviewStatus;
    return !isGateAQualifiedEvidence(o) && st !== 'rejected' && st !== 'blocked' && !isObservationReviewStale(o);
  }).length;
  const sampleCount = observations.filter((o) => o.isSample).length;

  const resourceDir = marketResearch?.resourceDirectory || [];
  const accessibleResources = resourceDir.filter((r) => r.accessStatus === 'accessible' || r.accessStatus === 'redirected').length;
  const retrievedCount = realObservations.filter((o) => Boolean(o.retrievedAt) || Boolean(o.evidenceAttachmentRef)).length;
  const extractedCount = realObservations.length;
  const reviewedQualifiedCount = liveChartCount + reviewedFallbackCount;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (autoScannedRef.current || researchBusy) return;
    if (liveChartCount === 0 && reviewedFallbackCount === 0 && allCandidates.length === 0) {
      autoScannedRef.current = true;
      void onRefreshResearch?.();
    }
  }, [liveChartCount, reviewedFallbackCount, allCandidates.length, researchBusy, onRefreshResearch]);

  const marketplaces = [
    'ALL',
    'Amazon Kindle',
    'Apple Books',
    'NYT Best Sellers',
    'Keepa',
    'Google Trends',
    'Gumroad',
    'Payhip',
    'Etsy',
    'Other Research Source',
  ];

  const categoryOptions = [
    { id: 'ALL', label: lang === 'en' ? 'All Domains' : '全部領域' },
    { id: 'productivity_systems', label: lang === 'en' ? 'Notion & Systems' : 'Notion 與一人公司' },
    { id: 'wellness_habits', label: lang === 'en' ? 'Wellness & Habits' : '身心微習慣 & 倦怠自癒' },
    { id: 'personal_finance', label: lang === 'en' ? 'Finance & Real Estate' : '個人理財 & 房貸避坑' },
    { id: 'freelance_career', label: lang === 'en' ? 'Freelance & Proposals' : '接案變現 & 報價範本' },
    { id: 'budget_living', label: lang === 'en' ? 'Budget Living & Meals' : '家庭餐桌 & 平價節流' },
  ];

  const filteredCandidates = allCandidates.filter(
    (topic) => selectedCategory === 'ALL' || topic.marketCategory === selectedCategory
  );

  const filteredObservations = observations.filter((obs) => {
    const matchesMarket = selectedMarketplace === 'ALL' || obs.marketplace === selectedMarketplace;
    const matchesSearch =
      searchQuery.trim() === '' ||
      obs.productTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obs.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obs.sellerOrAuthor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (obs.evidenceChainId || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || observationCategory(obs) === selectedCategory;
    return matchesMarket && matchesSearch && matchesCategory;
  });

  const velocityLeader = [...filteredObservations.filter((o) => isCurrentMarketEvidence(o))].sort(
    (a, b) => (a.observedRank || 100) - (b.observedRank || 100)
  )[0];

  const handleRunRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshResearch?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePrioritizeSignal = (obsId: string) => {
    onSynchronizeToGateA?.({
      category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      prioritizedObservationId: obsId,
    });
    setActiveTab('niches');
  };

  const openManualReviewForResource = (resource: GateAResourceEntry) => {
    setPrefillResource(resource);
    setActiveTab('manual');
  };

  const openManualReviewForObservation = (obsId: string) => {
    setFocusedObsId(obsId);
    setActiveTab('manual');
  };

  const getEvidenceLabelStyle = (topic: TopicCandidate) => {
    switch (topic.evidenceLabel) {
      case 'CURRENT_OFFICIAL_CHART':
        return {
          label: lang === 'en' ? 'Current Official Chart Observation' : '近期官方排行榜實測紀錄',
          cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'MANUALLY_REVIEWED_PRIMARY':
        return {
          label: lang === 'en' ? 'Manually Reviewed Primary Observation' : '人工審查主要市場觀測',
          cls: 'bg-teal-50 text-teal-800 border-teal-200',
        };
      case 'SECONDARY_REPORTED_RANKING':
        return {
          label: lang === 'en' ? 'Secondary Reported Ranking (Check Scope)' : '次級公開排行報告（需留意統計範圍）',
          cls: 'bg-sky-50 text-sky-800 border-sky-200',
        };
      case 'SUPPORTING_INTEREST_SIGNAL':
        return {
          label: lang === 'en' ? 'Supporting Interest / Estimate Signal' : '輔助趨勢與估算信號',
          cls: 'bg-amber-50 text-amber-900 border-amber-200',
        };
      default:
        return {
          label: lang === 'en' ? 'Opportunity Hypothesis · Needs Validation' : '題材假設 · 仍需實證驗證',
          cls: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const getBadgeStyle = (badge?: TopicCandidate['badge']) => {
    if (badge === 'BEST_OVERALL') {
      return {
        label: lang === 'en' ? 'Verified Live Chart Signal' : '即時採集器實測排行榜信號',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: Award,
      };
    }
    if (badge === 'EASIEST_TO_LAUNCH') {
      return {
        label: lang === 'en' ? 'Lower Execution Scope' : '實作範圍較精簡',
        bg: 'bg-sky-50 text-sky-800 border-sky-200',
        icon: Zap,
      };
    }
    if (badge === 'HIGH_DIFFERENTIATION') {
      return {
        label: lang === 'en' ? 'Differentiation Hypothesis' : '差異化切角假設',
        bg: 'bg-teal-50 text-teal-800 border-teal-200',
        icon: Target,
      };
    }
    return null;
  };

  const busy = isRefreshing || researchBusy;

  return (
    <div className="w-full space-y-5 pb-3">
      {researchError && (
        <div role="alert" className="p-4 bg-red-50 text-red-900 border border-red-200 rounded-xl text-sm font-medium">
          <span>{researchError}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-teal-700">
              <TrendingUp className="w-4 h-4" />
              <span>
                {lang === 'en'
                  ? 'STAGES 1–2 · MARKET RESEARCH RESOURCES, EVIDENCE REVIEW & GATE A TOPIC SELECTION'
                  : '階段 1–2 · 市場研究資源目錄、人工實證審查與 Gate A 選題工作台'}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {lang === 'en'
                ? 'Market Research & Topic Selection (Gate A)'
                : '市場研究實證與選題評估中心 (Gate A)'}
            </h1>
            <p className="text-sm text-slate-600 max-w-4xl">
              {lang === 'en'
                ? 'Inspect research sources, run live official chart collectors, log or import manual fallback observations, and review honest Evidence Strength vs. Product Suitability before approving Gate A.'
                : '檢視公開研究資源、執行即時榜單採集、登錄或匯入人工補充證據，並在核准 Gate A 前清楚區分「證據強度」與「產品適配假設」。'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => void handleRunRefresh()}
              disabled={busy}
              className="px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin text-teal-700' : ''}`} />
              <span>{busy ? t.refreshing : lang === 'en' ? 'Scan Live Collectors' : '掃描即時榜單採集器'}</span>
            </button>

            <button
              type="button"
              disabled={blockers.length > 0}
              title={blockers.join(' ')}
              onClick={() => {
                if (blockers.length) return;
                onApproveGateA?.();
                setActiveView('project_brief');
              }}
              className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all inline-flex items-center gap-2 shadow-sm whitespace-nowrap ${
                gateAApproved
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white active:scale-95'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{gateAApproved ? t.gateAApprovedBadge : t.approveGateACta}</span>
            </button>
          </div>
        </div>

        {/* 4 Route Tabs + Honest Evidence Counts */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setActiveTab('directory')}
              className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                activeTab === 'directory'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>{lang === 'en' ? 'Resource Directory (9)' : '研究資源目錄 (9)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                activeTab === 'manual'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>{lang === 'en' ? 'Manual Evidence Review' : '人工證據審查通道'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('signals')}
              className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                activeTab === 'signals'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>
                {lang === 'en'
                  ? `Evidence Ledger (${filteredObservations.length})`
                  : `觀測證據帳本 (${filteredObservations.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('niches')}
              className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                activeTab === 'niches'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {lang === 'en'
                  ? `Topic Recommendations (${filteredCandidates.length})`
                  : `推薦選題評估 (${filteredCandidates.length})`}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-700 flex-wrap font-mono">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-bold">
              {liveChartCount} {lang === 'en' ? 'live chart (<48h)' : '筆即時榜單'}
            </span>
            <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-lg font-bold">
              {reviewedFallbackCount} {lang === 'en' ? 'manually reviewed' : '筆人工覆核'}
            </span>
            {staleReviewCount > 0 && (
              <span className="bg-amber-100 text-amber-950 border border-amber-300 px-2.5 py-1 rounded-lg font-bold">
                {staleReviewCount} {lang === 'en' ? 'stale review' : '筆過期重審'}
              </span>
            )}
            {unverifiedRealCount > 0 && (
              <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg font-semibold">
                {unverifiedRealCount} {lang === 'en' ? 'unverified' : '筆待覆核'}
              </span>
            )}
            {sampleCount > 0 && (
              <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg">
                {sampleCount} sample (excluded)
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowSourcesPanel((v) => !v)}
              className="text-sky-700 hover:text-sky-900 font-sans font-semibold inline-flex items-center gap-1 underline text-xs ml-1"
            >
              <span>{lang === 'en' ? 'Collector diagnostics' : '採集器診斷'}</span>
              {showSourcesPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 5-State Workflow Progression Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-xs">
          {[
            {
              step: '1. Resource Available',
              detail: `${accessibleResources}/${resourceDir.length || 9} reachable`,
              done: accessibleResources > 0,
            },
            {
              step: '2. Page Retrieved',
              detail: `${retrievedCount} captured/attached`,
              done: retrievedCount > 0,
            },
            {
              step: '3. Observation Extracted',
              detail: `${extractedCount} structured row(s)`,
              done: extractedCount > 0,
            },
            {
              step: '4. Evidence Reviewed',
              detail: `${reviewedQualifiedCount} qualified`,
              done: reviewedQualifiedCount > 0,
            },
            {
              step: '5. Topic Approved',
              detail: gateAApproved ? 'Gate A Approved' : 'Explicit Choice Pending',
              done: gateAApproved,
            },
          ].map((item) => (
            <div
              key={item.step}
              className={`px-3 py-2 rounded-xl border ${
                item.done
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div className="font-semibold truncate">{item.step}</div>
              <div className="font-mono text-[11px] opacity-85 truncate tabular-nums">{item.detail}</div>
            </div>
          ))}
        </div>

        {/* Collapsible Live Collector Diagnostics */}
        {showSourcesPanel && (
          <section className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              {lang === 'en'
                ? 'Live ranking collectors cover Apple Books US Top Paid (<48h) and explicitly numbered Amazon Kindle Best Sellers cards. Blocked/unranked discovery platforms never fabricate rankings; use Manual Evidence Review for dated external reports.'
                : '即時採集器僅涵蓋 48 小時內之 Apple Books 官方排行與具明確名次編號之 Amazon Kindle 榜單。受阻或無排名之探索平台絕不偽造替代數據。'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              {marketResearch.sourceReports?.map((report) => (
                <article
                  key={`${report.marketplace}-${report.url}`}
                  className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <a
                      className="font-bold text-sky-700 underline truncate"
                      href={report.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {report.marketplace}
                    </a>
                    <span
                      className={`font-mono text-[11px] px-2 py-0.5 rounded font-semibold ${
                        report.status === 'verified'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {report.status} · {report.count}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{report.message}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Domain Filter Bar (shown on signals & niches tabs) */}
        {(activeTab === 'niches' || activeTab === 'signals') && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-teal-600" />
                <span>{lang === 'en' ? 'Niche Domain Filter:' : '目標領域 / 產品類別篩選：'}</span>
              </span>
              {selectedCategory !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className="text-xs text-sky-700 hover:text-sky-900 underline font-semibold"
                >
                  {lang === 'en' ? 'Show All Domains' : '顯示全部領域'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {categoryOptions.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all whitespace-nowrap border ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Blockers / Gate A Notice */}
      {blockers.length > 0 && activeTab === 'niches' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-950 flex items-center justify-between gap-3 flex-wrap">
          <span>
            <strong>{lang === 'en' ? 'Gate A Next Step:' : 'Gate A 下一步：'}</strong> {blockers[0]}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className="px-3.5 py-2 bg-white border border-amber-300 text-amber-950 rounded-lg text-xs font-semibold hover:bg-amber-100"
            >
              {lang === 'en' ? 'Open Manual Evidence Review' : '開啟人工證據審查'}
            </button>
            <button
              type="button"
              onClick={() => void handleRunRefresh()}
              className="px-4 py-2 bg-amber-900 text-white rounded-lg text-xs font-semibold"
            >
              {lang === 'en' ? 'Scan Live Collectors' : '掃描即時排行榜'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: RESOURCE DIRECTORY */}
      {activeTab === 'directory' && (
        <ResourceDirectoryPanel
          resources={marketResearch.resourceDirectory}
          busy={directoryBusy}
          onCheckResources={onCheckResources}
          onRecordManualForResource={openManualReviewForResource}
          lang={lang}
        />
      )}

      {/* TAB 2: MANUAL EVIDENCE REVIEW */}
      {activeTab === 'manual' && (
        <ManualEvidenceReviewPanel
          observations={observations}
          prefillResource={prefillResource}
          focusedObservationId={focusedObsId}
          onAddObservation={(obs) => onAddManualObservation?.(obs)}
          onEditObservation={(obs) => onEditObservation?.(obs)}
          onImportObservations={(list) => onImportObservations?.(list)}
          onReviewObservation={(obs) => onReviewObservation?.(obs)}
          onDeleteObservation={onDeleteObservation}
          lang={lang}
        />
      )}

      {/* TAB 3: EVIDENCE LEDGER */}
      {activeTab === 'signals' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl overflow-x-auto">
              {marketplaces.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMarketplace(m)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    selectedMarketplace === m
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m === 'ALL' ? t.allPlatforms : m}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setLedgerViewMode('table')}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    ledgerViewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {lang === 'en' ? 'Table' : '表格'}
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerViewMode('cards')}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    ledgerViewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {lang === 'en' ? 'Cards' : '卡片'}
                </button>
              </div>

              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchMarketplacePlaceholder}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                />
              </div>
            </div>
          </div>

          {velocityLeader && (
            <div className="bg-gradient-to-r from-[#0b2933] via-[#0f3d47] to-[#0c3556] text-white rounded-2xl p-6 border border-cyan-700/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>{t.mtreSynthesisTitle}</span>
                </div>
                <div className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                  <span className="text-slate-300 text-sm font-normal">{t.detectedMarketLeader}:</span>
                  <span className="text-cyan-200">
                    {velocityLeader.productTitle} ({velocityLeader.marketplace})
                  </span>
                  <span className="text-xs font-mono bg-cyan-500/20 border border-cyan-400/30 px-2.5 py-0.5 rounded-md text-cyan-200">
                    #{velocityLeader.observedRank} · {velocityLeader.rankScope}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{t.syncStatsSummary}</p>
              </div>

              <button
                type="button"
                onClick={() => handlePrioritizeSignal(velocityLeader.id)}
                className="px-5 py-3 text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-sm shrink-0 inline-flex items-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current text-slate-900" />
                <span>{lang === 'en' ? 'Prioritize in Gate A' : '設為 Gate A 優先顯示'}</span>
              </button>
            </div>
          )}

          {filteredObservations.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-4">
              <p className="text-sm text-slate-600">{t.noObservationsFound}</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleRunRefresh()}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{t.runDiscoveryBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl"
                >
                  {lang === 'en' ? 'Add Manual Evidence' : '手動建立/匯入證據'}
                </button>
              </div>
            </div>
          ) : ledgerViewMode === 'table' ? (
            <EvidenceLedgerTable
              observations={filteredObservations}
              onInspectObservation={openManualReviewForObservation}
              onPrioritizeSignal={handlePrioritizeSignal}
              lang={lang}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredObservations.map((obs) => {
                const isLeader = velocityLeader?.id === obs.id;
                const live = isCurrentMarketEvidence(obs);
                const fallbackReviewed = isReviewedFallbackEvidence(obs);
                const mappedDomain = observationCategory(obs);
                const defs = inferObservationDefaults(obs);

                const statusLabel = obs.isSample
                  ? lang === 'en'
                    ? 'Legacy sample (excluded)'
                    : '樣本參考（不採計）'
                  : live
                  ? lang === 'en'
                    ? 'Live collector chart (<48h)'
                    : '即時採集器榜單'
                  : fallbackReviewed
                  ? lang === 'en'
                    ? 'Manually reviewed fallback'
                    : '已通過人工覆核'
                  : defs.reviewStatus === 'rejected' || defs.reviewStatus === 'blocked'
                  ? `${defs.reviewStatus.toUpperCase()} (excluded)`
                  : lang === 'en'
                  ? 'Unverified (needs review)'
                  : '尚未覆核';

                return (
                  <div
                    key={obs.id}
                    className={`bg-white border rounded-2xl p-5 hover:border-sky-400 transition-all flex flex-col justify-between space-y-4 ${
                      isLeader ? 'ring-1 ring-amber-400/60 border-amber-300' : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-md truncate">
                          {obs.marketplace}
                        </span>
                        <span className="text-slate-500 font-mono shrink-0">
                          {(obs.dataAsOfDate || obs.observedAt).slice(0, 10)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {defs.sourceClass}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {defs.acquisitionMethod}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {defs.evidenceType}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-slate-500 block line-clamp-1">{obs.category}</span>
                        <span
                          className={`text-xs font-semibold ${
                            live || fallbackReviewed ? 'text-emerald-700' : 'text-amber-800'
                          }`}
                        >
                          {statusLabel}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 line-clamp-2 mt-1">
                          {obs.productTitle}
                        </h3>
                        <span className="text-xs text-slate-600 mt-1 block">by {obs.sellerOrAuthor}</span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-3 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-2.5 py-2.5 px-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-700">
                        <div>
                          <span className="text-[11px] text-slate-500 block">{t.rankLabel}</span>
                          <strong className="text-sm text-sky-700">
                            {obs.observedRank ? `#${obs.observedRank}` : obs.metricValue ?? '—'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block">{t.priceLabel}</span>
                          <strong className="text-sm text-slate-900">
                            {obs.priceKnown === false || !obs.currentPrice ? 'Not supplied' : `$${obs.currentPrice.toFixed(2)}`}
                          </strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={obs.sourceURL || obs.productURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-2.5 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors inline-flex items-center justify-center gap-1 text-center"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{lang === 'en' ? 'Source URL' : '原站連結'}</span>
                        </a>

                        {!obs.isSample ? (
                          <button
                            type="button"
                            onClick={() => openManualReviewForObservation(obs.id)}
                            className="py-2 px-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors inline-flex items-center justify-center gap-1 text-center"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>{lang === 'en' ? 'Inspect' : '檢核審查'}</span>
                          </button>
                        ) : (
                          <span className="py-2 px-2 text-[11px] font-mono text-slate-400 text-center">Sample</span>
                        )}
                      </div>

                      {(live || fallbackReviewed) && mappedDomain !== 'other' && (
                        <button
                          type="button"
                          onClick={() => handlePrioritizeSignal(obs.id)}
                          className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors inline-flex items-center justify-center gap-1.5 text-center"
                        >
                          <Target className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                          <span>{lang === 'en' ? 'Prioritize in Topic Recommendations ↑' : '於選題建議中置頂顯示 ↑'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TOPIC RECOMMENDATIONS (GATE A) */}
      {activeTab === 'niches' && (
        <div className="space-y-4">
          {busy && filteredCandidates.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <RefreshCw className="w-9 h-9 text-teal-600 animate-spin mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">
                {lang === 'en'
                  ? 'Running Gate A Chart Collectors...'
                  : '正在掃描公開平台排行榜並萃取實證選題...'}
              </h3>
              <p className="text-sm text-slate-500 max-w-lg mx-auto">
                {lang === 'en'
                  ? 'Fetching live Apple Books US Top Paid and numbered Amazon Kindle Best Sellers charts.'
                  : '正在即時擷取 Apple Books 與 Amazon Kindle 教育分類公開排行以建立實證題材候選清單。'}
              </p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="max-w-2xl mx-auto space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedCategory !== 'ALL'
                    ? lang === 'en'
                      ? 'No Qualified Evidence Matched This Domain Filter'
                      : '此領域篩選條件下尚無已合格實證題材'
                    : lang === 'en'
                    ? 'Insufficient Evidence for Gate A Topic Proposals'
                    : '尚無足夠實證可生成 Gate A 推薦選題'}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {lang === 'en'
                    ? 'Research gap: Gate A only builds educational topic hypotheses from current official chart records (<48h) or manually reviewed primary/secondary/supporting evidence (excluding fiction, unreviewed uploads, rejected/blocked sources, and sample fixtures).'
                    : '研究缺口說明：Gate A 僅根據 48 小時內之官方榜單或通過「人工證據審查」的非小說教育類資料生成建議（排除小說、未審資料與樣本）。'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {selectedCategory !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ALL')}
                    className="px-4 py-2.5 text-sm font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-xl"
                  >
                    {lang === 'en' ? 'Reset Domain Filter' : '顯示全部領域'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleRunRefresh()}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Scan Live Collectors' : '掃描即時採集器'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('directory')}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl"
                >
                  {lang === 'en' ? 'Inspect Resource Directory' : '檢視研究資源目錄'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className="px-4 py-2.5 text-sm font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl"
                >
                  {lang === 'en' ? 'Open Manual Evidence Review' : '開啟人工證據審查'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-sky-50 text-sky-950 border border-sky-200 rounded-xl text-xs sm:text-sm leading-relaxed">
                {lang === 'en'
                  ? 'Notice: Market charts and external reports inform initial product hypotheses only. Evidence Strength (source credibility, currency, scope, and unique dataset chains) is separated strictly from Product Suitability (concept clarity, creator-fit unmeasured status, and next validation steps). Creator expertise and audiences are never invented.'
                  : '說明：下方題材均明確區隔「A. 證據強度（來源公信力、時效性、統計範圍與獨立證據鏈）」與「B. 產品適配假設（尚待驗證）」。系統絕不預設創作者專業背景、學經歷或既有受眾。'}
              </div>

              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
                {filteredCandidates.map((topic) => {
                  const isSelected = selectedId === topic.id;
                  const evLabel = getEvidenceLabelStyle(topic);
                  const badgeInfo = topic.evidenceStatus === 'CURRENT_CHART' ? getBadgeStyle(topic.badge) : null;
                  const BadgeIcon = badgeInfo?.icon;
                  const isExpanded = expandedTopicId === topic.id;
                  const linkedObs = getLinkedObservationForCandidate(topic, observations);
                  const allLinked = observations.filter((o) => topic.sourceObservationIds.includes(o.id));
                  const evStrength = topic.evidenceStrength;
                  const suitability = topic.productSuitability;
                  const multiMeta = multiSourceStatusMeta(topic.multiSourceStatus, lang);
                  const chosenHypothesisId =
                    draftAudienceByTopic[topic.id] ||
                    topic.selectedAudienceHypothesisId ||
                    topic.audienceTopicHypotheses?.[0]?.id;

                  return (
                    <div
                      key={topic.id}
                      className={`bg-white border rounded-2xl transition-all ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="p-6 space-y-4">
                        {/* Top Strip */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${evLabel.cls}`}>
                              {evLabel.label}
                            </span>
                            <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-md border ${multiMeta.cls}`}>
                              {multiMeta.label}
                            </span>
                            {badgeInfo && (
                              <span
                                className={`text-xs font-semibold px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 ${badgeInfo.bg}`}
                              >
                                {BadgeIcon && <BadgeIcon className="w-3.5 h-3.5" />}
                                <span>{badgeInfo.label}</span>
                              </span>
                            )}
                            <span className="text-xs font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                              {topic.sourceObservationIds.length} obs / {topic.independentChainIds?.length || topic.sourceObservationIds.length}{' '}
                              {lang === 'en' ? 'independent chain(s)' : '條獨立證據鏈'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap shrink-0">
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                              <span className="text-xs text-slate-600">
                                {lang === 'en' ? 'Measured Demand' : '實測需求分數'}:
                              </span>
                              <strong className="text-lg font-bold text-sky-700 font-mono tabular-nums">
                                {topic.scoreBreakdown.demandSignal}
                              </strong>
                              <span className="text-xs text-slate-400">/25</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => onSelectTopic?.(topic.id, chosenHypothesisId)}
                              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all inline-flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>
                                {isSelected
                                  ? t.topicSelectedBadge
                                  : lang === 'en'
                                  ? 'Select This Niche'
                                  : '選定此題材'}
                              </span>
                            </button>

                            {isSelected && blockers.length === 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  onApproveGateA?.();
                                  setActiveView('project_brief');
                                }}
                                className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white inline-flex items-center gap-1.5"
                              >
                                <span>{lang === 'en' ? 'Approve Gate A & Next Step' : '核准 Gate A 並下一步'}</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title, Promise & Linked Lead Observation */}
                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-xl font-bold text-slate-900">{topic.title}</h2>
                            {linkedObs && (
                              <a
                                href={linkedObs.sourceURL || linkedObs.productURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                                <span>
                                  {linkedObs.marketplace} {linkedObs.observedRank ? `#${linkedObs.observedRank}` : ''} ·{' '}
                                  {linkedObs.productTitle.slice(0, 28)}
                                  {linkedObs.productTitle.length > 28 ? '…' : ''}
                                </span>
                                <ExternalLink className="w-3 h-3 text-sky-600" />
                              </a>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-teal-800">{topic.subtitle}</p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            <strong>{t.coreProblemLabel}:</strong> {topic.coreProblem}
                          </p>
                          <p className="text-sm text-emerald-900 leading-relaxed bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
                            <strong>{t.bigPromiseLabel}:</strong> {topic.bigPromise}
                          </p>
                        </div>

                        {/* Separated A. Evidence Strength vs B. Product Suitability */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 text-xs">
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between font-bold text-slate-900">
                              <span className="inline-flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-teal-700" />
                                <span>{lang === 'en' ? 'A. Evidence Strength' : 'A. 證據強度稽核'}</span>
                              </span>
                              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800">
                                {evStrength?.overallLevel || topic.confidenceRating}
                              </span>
                            </div>
                            <ul className="space-y-1 text-slate-700 leading-relaxed">
                              <li>
                                <strong>{lang === 'en' ? 'Credibility:' : '公信力依據：'}</strong>{' '}
                                {evStrength?.credibilityBasis || topic.recommendationReason}
                              </li>
                              <li>
                                <strong>{lang === 'en' ? 'Currency:' : '時效窗口：'}</strong>{' '}
                                {evStrength?.recencySummary || 'Check record dates'}
                              </li>
                              <li>
                                <strong>{lang === 'en' ? 'Scope & Corroboration:' : '涵蓋與互證：'}</strong>{' '}
                                {evStrength?.corroborationSummary || `${topic.sourceObservationIds.length} record(s)`}
                              </li>
                            </ul>
                          </div>

                          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2">
                            <div className="flex items-center justify-between font-bold text-slate-900">
                              <span className="inline-flex items-center gap-1.5">
                                <Target className="w-4 h-4 text-amber-700" />
                                <span>{lang === 'en' ? 'B. Product Suitability' : 'B. 產品適配與假設'}</span>
                              </span>
                              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white border border-amber-200 text-amber-900">
                                {suitability?.readinessStatus || 'HYPOTHESIS_NEEDS_VALIDATION'}
                              </span>
                            </div>
                            <ul className="space-y-1 text-slate-700 leading-relaxed">
                              <li>
                                <strong>{lang === 'en' ? 'Creator Fit:' : '創作者適配：'}</strong>{' '}
                                <span className="font-mono text-amber-900 font-semibold">
                                  {suitability?.creatorFitStatus || 'UNMEASURED'}
                                </span>{' '}
                                — {suitability?.creatorFitNote || 'Domain expertise & audience not assumed.'}
                              </li>
                              <li>
                                <strong>{lang === 'en' ? 'Next Validation:' : '下一步驗證：'}</strong>{' '}
                                {suitability?.nextValidationStep || 'Validate pricing and buyer willingness directly.'}
                              </li>
                            </ul>
                          </div>
                        </div>

                        {/* Honest Score Spectrum Bars (marks UNMEASURED cleanly) */}
                        <ScoreSpectrumBars
                          breakdown={topic.scoreBreakdown}
                          factorAssessments={topic.factorAssessments}
                          lang={lang}
                        />

                        {/* Plausible Audience-Topic Combinations (Unapproved Hypotheses Until Chosen) */}
                        {topic.audienceTopicHypotheses && topic.audienceTopicHypotheses.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              {lang === 'en'
                                ? 'Plausible Audience-Topic Hypotheses (Select Angle for Project Brief)'
                                : '潛在受眾與切角假設（供人工挑選並帶入專案簡報）'}
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {topic.audienceTopicHypotheses.map((hyp) => {
                                const activeHyp = chosenHypothesisId === hyp.id;
                                return (
                                  <label
                                    key={hyp.id}
                                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                                      activeHyp
                                        ? 'border-indigo-600 bg-indigo-50/40'
                                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`audience-${topic.id}`}
                                      checked={activeHyp}
                                      onChange={() => {
                                        setDraftAudienceByTopic((prev) => ({ ...prev, [topic.id]: hyp.id }));
                                        if (isSelected) {
                                          onSelectTopic?.(topic.id, hyp.id);
                                        }
                                      }}
                                      className="mt-0.5"
                                    />
                                    <div className="space-y-0.5">
                                      <div className="font-bold text-slate-900">{hyp.audienceLabel}</div>
                                      <div className="text-slate-700">{hyp.productAngle}</div>
                                      <div className="text-[11px] text-slate-500">
                                        {hyp.evidenceBasis} · <span className="text-amber-900">{hyp.uncertainty}</span>
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Research Gap Note */}
                        {topic.researchGapNote && (
                          <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-lg">
                            <strong>{lang === 'en' ? 'Research Gap / Uncertainty:' : '研究缺口與不確定性：'}</strong>{' '}
                            {topic.researchGapNote}
                          </div>
                        )}

                        {/* Expand / Collapse Rubric & Multi-Source Comparison */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-xs text-slate-600 inline-flex items-center gap-1.5 font-medium">
                            <Layers className="w-4 h-4 text-teal-600" />
                            <span>
                              {topic.potentialCompanions.length} {t.companionAssetsLabel} · ${topic.priceTestRange.test}/$
                              {topic.priceTestRange.regular}/${topic.priceTestRange.premium}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                            className="text-sky-700 hover:text-sky-900 font-semibold inline-flex items-center gap-1 text-sm"
                          >
                            <span>
                              {isExpanded
                                ? lang === 'en'
                                  ? 'Hide Matrix, Rubric & Observations'
                                  : '收合比對矩陣與實證細節'
                                : lang === 'en'
                                ? 'View Multi-Source Matrix & Rubric'
                                : '查看多來源比對矩陣與指標'}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="pt-4 border-t border-slate-100 space-y-4">
                            <MultiSourceMatrix
                              multiSourceStatus={topic.multiSourceStatus}
                              rows={topic.evidenceComparison || []}
                              onInspectObservation={openManualReviewForObservation}
                              lang={lang}
                            />

                            {topic.factorAssessments && topic.factorAssessments.length > 0 && (
                              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                    <tr>
                                      <th className="py-2 px-3 font-semibold">Factor</th>
                                      <th className="py-2 px-3 font-semibold">Status</th>
                                      <th className="py-2 px-3 font-semibold">Score</th>
                                      <th className="py-2 px-3 font-semibold">Basis & Uncertainty</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {topic.factorAssessments.map((fa) => (
                                      <tr key={fa.key}>
                                        <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">{fa.label}</td>
                                        <td className="py-2 px-3 font-mono whitespace-nowrap">
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                              fa.status === 'UNMEASURED'
                                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                            }`}
                                          >
                                            {fa.status}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 font-mono whitespace-nowrap">
                                          {fa.score === null ? `Unmeasured (/${fa.maxScore})` : `${fa.score}/${fa.maxScore}`}
                                        </td>
                                        <td className="py-2 px-3 text-slate-600">
                                          <div>{fa.basis}</div>
                                          <div className="text-[11px] text-amber-900">{fa.uncertainty}</div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            <div className="space-y-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                {lang === 'en'
                                  ? `Linked Supporting Observations (${allLinked.length})`
                                  : `對應市場觀察紀錄 (${allLinked.length})`}
                              </h4>
                              <div className="space-y-2">
                                {allLinked.map((obs) => {
                                  const defs = inferObservationDefaults(obs);
                                  return (
                                    <div
                                      key={obs.id}
                                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                    >
                                      <div className="space-y-0.5 min-w-0">
                                        <div className="font-mono text-[11px] text-slate-600 flex flex-wrap gap-2">
                                          <strong className="text-slate-900">{obs.id}</strong>
                                          <span>{obs.marketplace}</span>
                                          {obs.observedRank && <span>Rank #{obs.observedRank}</span>}
                                          <span>as-of {obs.dataAsOfDate || obs.observedAt}</span>
                                          <span>chain: {obs.evidenceChainId || obs.id}</span>
                                          <span className="text-teal-800 font-semibold">{defs.acquisitionMethod}</span>
                                        </div>
                                        <div className="font-semibold text-slate-900 truncate">{obs.productTitle}</div>
                                        <div className="text-[11px] text-amber-900">{obs.dataLimitations}</div>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <a
                                          href={obs.sourceURL || obs.productURL}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sky-700 font-semibold inline-flex items-center gap-1"
                                        >
                                          <span>Source</span>
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                        <button
                                          type="button"
                                          onClick={() => openManualReviewForObservation(obs.id)}
                                          className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg font-semibold"
                                        >
                                          Inspect
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
