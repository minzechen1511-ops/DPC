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
} from 'lucide-react';
import { DigitalProductProject, TopicCandidate } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import {
  getLinkedObservationForCandidate,
  isCurrentMarketEvidence,
  observationCategory,
} from '../../utils/marketDiscoveryEngine.ts';
import { gateIssues } from '../../utils/gatePolicy.ts';
import { ScoreSpectrumBars } from '../ScientificVisuals.tsx';

interface MarketIntelligenceViewProps {
  researchBusy?: boolean;
  researchError?: string;
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onRefreshResearch?: () => void | Promise<void>;
  onSynchronizeToGateA?: (options?: {
    category?: string;
    prioritizedObservationId?: string;
    focusMarketplace?: string;
    searchQuery?: string;
  }) => void;
  onSelectTopic?: (topicId: string) => void;
  onApproveGateA?: () => void;
  initialTab?: 'niches' | 'signals';
  lang?: Language;
}

export const MarketIntelligenceView: React.FC<MarketIntelligenceViewProps> = ({
  researchBusy = false,
  researchError = '',
  project,
  setActiveView,
  onRefreshResearch,
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

  const [activeTab, setActiveTab] = useState<'niches' | 'signals'>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [showSourcesPanel, setShowSourcesPanel] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const autoScannedRef = useRef<boolean>(false);
  const hasCurrentEvidence = observations.some((o) => isCurrentMarketEvidence(o));

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (autoScannedRef.current || researchBusy) return;
    if (!hasCurrentEvidence || allCandidates.length === 0) {
      autoScannedRef.current = true;
      void onRefreshResearch?.();
    }
  }, [hasCurrentEvidence, allCandidates.length, researchBusy, onRefreshResearch]);

  const marketplaces = ['ALL', 'Amazon Kindle', 'Apple Books', 'Gumroad', 'Payhip', 'Etsy'];

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
      obs.sellerOrAuthor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || observationCategory(obs) === selectedCategory;
    return matchesMarket && matchesSearch && matchesCategory;
  });

  const currentObservationsCount = observations.filter((o) => isCurrentMarketEvidence(o)).length;
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

  const getBadgeStyle = (badge?: TopicCandidate['badge']) => {
    switch (badge) {
      case 'BEST_OVERALL':
        return {
          label: lang === 'en' ? 'Strongest observed chart signal' : '目前最強排行榜信號',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: Award,
        };
      case 'EASIEST_TO_LAUNCH':
        return {
          label: lang === 'en' ? 'Easiest to Launch' : '最易啟動',
          bg: 'bg-sky-50 text-sky-800 border-sky-200',
          icon: Zap,
        };
      case 'HIGH_DIFFERENTIATION':
        return {
          label: lang === 'en' ? 'High Differentiation' : '高差異化利基',
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          icon: Target,
        };
      default:
        return null;
    }
  };

  const busy = isRefreshing || researchBusy;

  return (
    <div className="w-full space-y-5 pb-3">
      {researchError && (
        <div role="alert" className="p-4 bg-red-50 text-red-900 border border-red-200 rounded-xl text-sm font-medium">
          <span>{researchError}</span>
        </div>
      )}

      {/* Integrated Gate A Header & Primary Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-7 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-teal-700">
              <TrendingUp className="w-4 h-4" />
              <span>
                {lang === 'en'
                  ? 'STAGE 1 · INTEGRATED MARKET RESEARCH & GATE A NICHE STUDIO'
                  : '步驟 1 · 市場情報與熱門選題整合工作台 (GATE A)'}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {lang === 'en'
                ? 'Market Signals & Recommended Niches (Gate A)'
                : '市場實證情報與推薦數位商品題材 (Gate A)'}
            </h1>
            <p className="text-sm text-slate-600 max-w-4xl">
              {lang === 'en'
                ? 'Live marketplace charts feed directly into original digital product niches below. Pick a niche to scaffold your blueprint, then approve Gate A to advance.'
                : '即時平台暢銷排行直接同步演算為下方原創商品選題。選定題材並核准 Gate A，即可一鍵建立完整專案大綱與定價結構。'}
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
              <span>{busy ? t.refreshing : lang === 'en' ? 'Scan Live Charts' : '重新掃描市場排行'}</span>
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
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{gateAApproved ? t.gateAApprovedBadge : t.approveGateACta}</span>
            </button>
          </div>
        </div>

        {/* Sub-navigation tabs + Evidence Summary strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="inline-flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setActiveTab('niches')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2 ${
                activeTab === 'niches'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {lang === 'en'
                  ? `Recommended Niches (${filteredCandidates.length})`
                  : `推薦商品題材 (${filteredCandidates.length})`}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signals')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2 ${
                activeTab === 'signals'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>
                {lang === 'en'
                  ? `Live Chart Signals (${filteredObservations.length})`
                  : `即時市場排行信號 (${filteredObservations.length})`}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-700 flex-wrap">
            <span className="font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold">
              {currentObservationsCount} {lang === 'en' ? 'verified live chart records' : '筆即時排行證據'}
            </span>
            <button
              type="button"
              onClick={() => setShowSourcesPanel((v) => !v)}
              className="text-sky-700 hover:text-sky-900 font-semibold inline-flex items-center gap-1 underline text-sm"
            >
              <span>{lang === 'en' ? 'Source access status' : '來源存取狀態'}</span>
              {showSourcesPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Source Access Diagnostics */}
        {showSourcesPanel && (
          <section className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <p className="text-sm text-slate-600">
              {lang === 'en'
                ? 'Only source-backed chart positions captured within 48 hours can feed Gate A. Unreachable or unranked platforms never generate fake substitute listings.'
                : '只有 48 小時內取得的原站排行榜證據可進入 Gate A。網站受阻或無公開排行時不會產生替代資料。'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {marketResearch.sourceReports?.map((report) => (
                <article
                  key={`${report.marketplace}-${report.url}`}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5"
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
                      className={`font-mono text-xs px-2 py-0.5 rounded font-semibold ${
                        report.status === 'verified'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {report.status} · {report.count}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{report.message}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Domain Filter Bar */}
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
      </div>

      {/* Blockers / Gate A Notice */}
      {blockers.length > 0 && activeTab === 'niches' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-950 flex items-center justify-between gap-3 flex-wrap">
          <span>
            <strong>{lang === 'en' ? 'Gate A Next Step:' : 'Gate A 下一步：'}</strong>{' '}
            {blockers[0]}
          </span>
          {selectedId && (
            <button
              type="button"
              onClick={() => void handleRunRefresh()}
              className="px-4 py-2 bg-amber-900 text-white rounded-lg text-xs font-semibold"
            >
              {lang === 'en' ? 'Refresh Evidence' : '重新取得市場證據'}
            </button>
          )}
        </div>
      )}

      {/* TAB 1: RECOMMENDED DIGITAL PRODUCT NICHES (GATE A) */}
      {activeTab === 'niches' && (
        <div className="space-y-4">
          {busy && filteredCandidates.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <RefreshCw className="w-9 h-9 text-teal-600 animate-spin mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">
                {lang === 'en'
                  ? 'Scanning Live Marketplace Charts...'
                  : '正在掃描公開平台排行榜並萃取熱門商機...'}
              </h3>
              <p className="text-sm text-slate-500 max-w-lg mx-auto">
                {lang === 'en'
                  ? 'Fetching live Amazon Kindle educational category charts and Apple Books feeds to identify verified niche demand.'
                  : '正在即時擷取 Amazon Kindle 教育分類排行與 Apple Books 榜單以建立實證題材候選清單。'}
              </p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="max-w-lg mx-auto space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedCategory !== 'ALL'
                    ? lang === 'en'
                      ? 'No Chart Signals Matched This Domain Filter'
                      : '此領域篩選條件下尚無相符題材'
                    : lang === 'en'
                    ? 'No Niche Candidates Generated Yet'
                    : '尚未產生推薦題材'}
                </h3>
                <p className="text-sm text-slate-500">
                  {lang === 'en'
                    ? 'Click Scan Live Charts to capture fresh public ranking data, or reset your domain filter to see all active niches.'
                    : '點擊「重新掃描市場排行」取得最新公開排行證據，或切換為「全部領域」檢視所有候選題材。'}
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
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{lang === 'en' ? 'Scan Live Charts Now' : '立即掃描公開市場排行'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm p-4 bg-sky-50 text-sky-950 border border-sky-200 rounded-xl leading-relaxed">
                {lang === 'en'
                  ? 'Recommendations are original product concepts grounded in current live chart positions below (demand score reflects observed chart rank only; validate pricing and buyer fit directly). Selecting a niche builds your 5-chapter draft outline and pricing ladder without inventing fake references.'
                  : '以下推薦題材根據下方即時排行榜證據建立（需求分數依實測名次計算，最終定價仍需創作者檢視）。選定題材後系統將自動配置 5 章實作大綱與定價階梯，絕不捏造假文獻。'}
              </p>

              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
                {filteredCandidates.map((topic) => {
                  const isSelected = selectedId === topic.id;
                  const badgeInfo = topic.evidenceStatus === 'CURRENT_CHART' ? getBadgeStyle(topic.badge) : null;
                  const BadgeIcon = badgeInfo?.icon;
                  const isExpanded = expandedTopicId === topic.id;
                  const linkedObs = getLinkedObservationForCandidate(topic, observations);

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
                            {badgeInfo && (
                              <span
                                className={`text-xs font-semibold px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 ${badgeInfo.bg}`}
                              >
                                {BadgeIcon && <BadgeIcon className="w-3.5 h-3.5" />}
                                <span>{badgeInfo.label}</span>
                              </span>
                            )}
                            <span className="text-xs font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                              {topic.sourceObservationIds.length}{' '}
                              {lang === 'en' ? 'chart signals' : '筆排行信號'}
                            </span>
                            <span className="text-xs font-mono text-slate-500">
                              {topic.suggestedFormat}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                              <span className="text-xs text-slate-600">
                                {lang === 'en' ? 'Demand' : '需求指標'}:
                              </span>
                              <strong className="text-lg font-bold text-sky-700 font-mono tabular-nums">
                                {topic.scoreBreakdown.demandSignal}
                              </strong>
                              <span className="text-xs text-slate-400">/25</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => onSelectTopic?.(topic.id)}
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
                                <span>{lang === 'en' ? 'Approve & Next Step' : '核准並下一步'}</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title, Promise & Linked Source */}
                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-xl font-bold text-slate-900">{topic.title}</h2>
                            {linkedObs && (
                              <a
                                href={linkedObs.productURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                                <span>
                                  {linkedObs.marketplace} #{linkedObs.observedRank || '—'} ·{' '}
                                  {linkedObs.productTitle.slice(0, 30)}
                                  {linkedObs.productTitle.length > 30 ? '…' : ''}
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

                        {/* Score Spectrum Telemetry Bars */}
                        <ScoreSpectrumBars breakdown={topic.scoreBreakdown} lang={lang} />

                        {/* Key Highlights Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                          <div>
                            <span className="text-slate-500 text-xs block mb-0.5">{t.targetAudienceLabel}</span>
                            <strong className="text-slate-800 line-clamp-3">{topic.targetAudience}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 text-xs block mb-0.5">{t.differentiationLabel}</span>
                            <strong className="text-slate-800 line-clamp-3">{topic.differentiationAngle}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 text-xs block mb-0.5">{t.priceTestingRangeLabel}</span>
                            <strong className="text-teal-800 font-mono text-base">
                              ${topic.priceTestRange.test} / ${topic.priceTestRange.regular} / $
                              {topic.priceTestRange.premium}
                            </strong>
                          </div>
                        </div>

                        {/* Expand / Collapse Details */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-xs text-slate-600 inline-flex items-center gap-1.5 font-medium">
                            <Layers className="w-4 h-4 text-teal-600" />
                            <span>
                              {topic.potentialCompanions.length} {t.companionAssetsLabel}
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
                                  ? 'Hide Details'
                                  : '收合細項'
                                : lang === 'en'
                                ? 'View Deliverables & Chart Evidence'
                                : '查看伴隨交付物與市場實證'}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="pt-4 border-t border-slate-100 space-y-4">
                            <div>
                              <h4 className="text-sm font-bold text-slate-800 mb-2">{t.companionAssetsLabel}</h4>
                              <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                                {topic.potentialCompanions.map((comp, idx) => (
                                  <li key={idx}>{comp}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="p-4 bg-sky-50/70 rounded-xl border border-sky-200 text-sm text-sky-950">
                              <strong className="block mb-1">
                                {lang === 'en' ? 'Linked Live Chart Evidence:' : '對應即時排行榜實證紀錄：'}
                              </strong>
                              <span>{topic.marketEvidenceSummary}</span>
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

      {/* TAB 2: LIVE MARKETPLACE CHART SIGNALS */}
      {activeTab === 'signals' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl overflow-x-auto">
              {marketplaces.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMarketplace(m)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    selectedMarketplace === m
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m === 'ALL' ? t.allPlatforms : m}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-80">
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
                <span>{lang === 'en' ? 'Prioritize in Gate A' : '設為 Gate A 首選推薦'}</span>
              </button>
            </div>
          )}

          {filteredObservations.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-4">
              <p className="text-sm text-slate-600">{t.noObservationsFound}</p>
              <button
                type="button"
                onClick={() => void handleRunRefresh()}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{t.runDiscoveryBtn}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filteredObservations.map((obs) => {
                const isLeader = velocityLeader?.id === obs.id;
                const current = isCurrentMarketEvidence(obs);
                const mappedDomain = observationCategory(obs);
                return (
                  <div
                    key={obs.id}
                    className={`bg-white border rounded-2xl p-5 hover:border-sky-400 transition-all flex flex-col justify-between space-y-4 ${
                      isLeader ? 'ring-1 ring-amber-400/60 border-amber-300' : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-md">
                          {obs.marketplace}
                        </span>
                        <span className="text-slate-500 font-mono">{obs.observedAt.slice(0, 10)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block line-clamp-1">{obs.category}</span>
                        <span
                          className={`text-xs font-semibold ${
                            current ? 'text-emerald-700' : 'text-amber-800'
                          }`}
                        >
                          {current
                            ? lang === 'en'
                              ? 'Current verified chart record'
                              : '即時排行榜實證紀錄'
                            : lang === 'en'
                            ? 'Sample / excluded from Gate A'
                            : '樣本或逾期資料'}
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
                          <strong className="text-sm text-sky-700">#{obs.observedRank || '—'}</strong>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block">{t.priceLabel}</span>
                          <strong className="text-sm text-slate-900">
                            {obs.priceKnown === false ? 'Not supplied' : `$${obs.currentPrice.toFixed(2)}`}
                          </strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <a
                          href={obs.productURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-3 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors inline-flex items-center justify-center gap-1.5 text-center"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{lang === 'en' ? 'Inspect Live' : '查看原站'}</span>
                        </a>

                        <button
                          type="button"
                          disabled={!current || mappedDomain === 'other'}
                          onClick={() => handlePrioritizeSignal(obs.id)}
                          className="py-2 px-3 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors inline-flex items-center justify-center gap-1.5 text-center"
                        >
                          <Target className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                          <span>{lang === 'en' ? 'Prioritize ↑' : '置頂推薦 ↑'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
