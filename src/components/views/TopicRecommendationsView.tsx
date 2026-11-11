import { gateIssues } from '../../utils/gatePolicy.ts';
import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Award,
  Zap,
  Target,
  ArrowRight,
  ShieldAlert,
  BarChart2,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { DigitalProductProject, TopicCandidate } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';
import { getLinkedObservationForCandidate, MARKET_CATEGORIES, isCurrentMarketEvidence } from '../../utils/marketDiscoveryEngine.ts';

interface TopicRecommendationsViewProps {
  researchBusy?: boolean;
  researchError?: string;
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onSelectTopic: (topicId: string) => void;
  onApproveGateA: () => void;
  onRunMarketDiscovery?: (options?: { category?: string }) => void | Promise<void>;
  lang?: Language;
}

export const TopicRecommendationsView: React.FC<TopicRecommendationsViewProps> = ({
  researchBusy = false,
  researchError = '',
  project,
  setActiveView,
  onSelectTopic,
  onApproveGateA,
  onRunMarketDiscovery,
  lang = 'en',
}) => {
  const t = translations[lang];
  const { marketResearch, workflow } = project;
  const blockers = gateIssues(project, 'gateA');
  const allCandidates = marketResearch?.topicCandidates || [];
  const selectedId = marketResearch?.selectedTopicId;

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);

  // Filter candidates if specific category selected
  const candidates = allCandidates.filter((topic) => {
    return selectedCategory === 'ALL' || topic.marketCategory === selectedCategory;
  });

  const getBadgeStyle = (badge?: TopicCandidate['badge']) => {
    switch (badge) {
      case 'BEST_OVERALL':
        return {
          label: lang === 'en' ? 'Strongest observed chart signal' : '目前最強排行榜信號',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: Award,
        };
      case 'EASIEST_TO_LAUNCH':
        return {
          label: lang === 'en' ? 'Easiest to Launch' : '最易啟動',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: Zap,
        };
      case 'HIGH_DIFFERENTIATION':
        return {
          label: lang === 'en' ? 'High Differentiation' : '高差異化利基',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: Target,
        };
      default:
        return null;
    }
  };

  const handleRunDiscovery = async (cat?: string) => {
    setIsDiscovering(true);
    try { await onRunMarketDiscovery?.({ category: (cat || selectedCategory) !== 'ALL' ? (cat || selectedCategory) : undefined }); }
    finally { setIsDiscovering(false); }
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    handleRunDiscovery(catId);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {blockers.length > 0 && <details open className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-950"><summary className="font-semibold cursor-pointer">{lang === 'en' ? 'Review requirements before approval' : '核准前請完成審查要求'}</summary><ul className="list-disc pl-5 mt-2 space-y-1">{blockers.map(item => <li key={item}>{item}</li>)}</ul></details>}
      {researchError && <p role="alert" className="p-4 bg-red-50 text-red-900">{researchError}</p>}
      <p className="text-sm p-4 bg-indigo-50 text-indigo-900 rounded-lg">{lang === 'en' ? 'Recommendations are original product concepts informed by the exact MTRE records below, not claims that a new product is a bestseller. Demand is the only observed score; other rubric dimensions and suggested prices require validation.' : '推薦題材是根據 MTRE 原始紀錄提出的原創構想，不代表新商品已暢銷。目前只評估可觀測需求，其餘評分與建議價格需驗證。'}</p>
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gate A — {t.topicTitle}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{t.topicTitle}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{t.topicSubtitle}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleRunDiscovery()}
              disabled={isDiscovering || researchBusy}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isDiscovering ? t.refreshing : t.runMarketDiscoveryCta}</span>
            </button>

            <button
              disabled={blockers.length > 0}
              title={blockers.join(" ")}
              onClick={() => {
                if (blockers.length) return;
            onApproveGateA();
                setActiveView('project_brief');
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap ${
                workflow?.gates?.gateA?.isApproved
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{workflow?.gates?.gateA?.isApproved ? t.gateAApprovedBadge : t.approveGateACta}</span>
            </button>
          </div>
        </div>

        {/* Category Selection Filter Strip */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'en' ? 'Filter by High-Demand Category:' : '熱門領域 / 題材類別篩選：'}</span>
            </span>
            {selectedCategory !== 'ALL' && (
              <button
                onClick={() => handleCategoryChange('ALL')}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 underline font-normal"
              >
                {lang === 'en' ? 'Show All Candidates' : '顯示全部候選題材'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: lang === 'en' ? 'All Categories (Top 5)' : '全部類別 (Top 5)' },
              { id: 'productivity_systems', label: lang === 'en' ? 'Notion & Systems' : 'Notion 與一人公司' },
              { id: 'wellness_habits', label: lang === 'en' ? 'Wellness & Habits' : '身心微習慣 & 倦怠自癒' },
              { id: 'personal_finance', label: lang === 'en' ? 'Finance & Real Estate' : '個人理財 & 房貸避坑' },
              { id: 'freelance_career', label: lang === 'en' ? 'Freelance & Proposals' : '接案變現 & 報價範本' },
              { id: 'budget_living', label: lang === 'en' ? 'Budget Living & Meals' : '家庭餐桌 & 平價節流' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap border ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Candidate Cards Grid or Empty State */}
      {candidates.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              {lang === 'en' ? 'No Topic Candidates Generated Yet' : '尚未發掘熱門題材'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'en'
                ? 'Check supported marketplace sources. Recommendations appear only when fresh ranking evidence is available for an educational niche; blocked or unsupported sites never generate substitute results.'
                : '檢查市場原站。只有取得適合教育題材的最新排行證據才會提供建議；網站受阻或不支援時不會產生替代結果。'}
            </p>
          </div>
          <button
            onClick={() => handleRunDiscovery()}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{t.runMarketDiscoveryCta}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Market Intelligence Live Synchronization Strip */}
          <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-indigo-950 flex items-center gap-2 flex-wrap">
                  <span>{t.synchronizedFromMtreBadge}</span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded font-bold">
                    {marketResearch.platformEvidence.some(o => isCurrentMarketEvidence(o)) ? 'CURRENT CHART SNAPSHOT' : 'SAMPLE / UNVERIFIED — RESEARCH REQUIRED'}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  {t.syncStatsSummary}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleRunDiscovery()}
              disabled={isDiscovering || researchBusy}
              className="px-3.5 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-300 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-center shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
              <span>{t.reSyncCta}</span>
            </button>
          </div>

          {candidates.map((topic) => {
            const isSelected = selectedId === topic.id;
            const badgeInfo = topic.evidenceStatus === 'CURRENT_CHART' ? getBadgeStyle(topic.badge) : null;
            const BadgeIcon = badgeInfo?.icon;
            const isExpanded = expandedTopicId === topic.id;
            const linkedObs = getLinkedObservationForCandidate(
              topic,
              project.marketResearch?.platformEvidence || []
            );

            return (
              <div
                key={topic.id}
                className={`bg-white border rounded-xl transition-all ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-6">
                  <p className="mb-3 text-xs text-amber-900">Selecting a different niche starts a fresh research plan. Download the current project backup before switching.</p>
                  {/* Top Strip: Badge, Score, Selection Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      {badgeInfo && (
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${badgeInfo.bg}`}
                        >
                          {BadgeIcon && <BadgeIcon className="w-3.5 h-3.5" />}
                          <span>{badgeInfo.label}</span>
                        </span>
                      )}
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {topic.id}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs font-medium text-slate-600">
                        {t.suggestedFormatLabel}: {topic.suggestedFormat}
                      </span>
                      {linkedObs && (
                        <a
                          href={linkedObs.productURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors group cursor-pointer"
                          title={`Inspect live listings on ${linkedObs.marketplace}`}
                        >
                          <TrendingUp className="w-3 h-3 text-indigo-500" />
                          <span>
                            {linkedObs.marketplace}: #{linkedObs.observedRank || '—'} · {linkedObs.observedAt}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5 text-indigo-400 group-hover:text-indigo-600" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Score Badge */}
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
                        <span className="text-xs text-slate-500">{lang === 'en' ? 'Observed demand' : '觀測需求'}:</span>
                        <strong className="text-base font-bold text-indigo-600 font-mono tabular-nums">
                          {topic.scoreBreakdown.demandSignal}
                        </strong>
                        <span className="text-xs text-slate-400">/25</span>
                      </div>

                      {/* Select CTA */}
                      <button
                        onClick={() => onSelectTopic(topic.id)}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isSelected ? t.topicSelectedBadge : t.selectAndPropagateBtn}</span>
                      </button>
                    </div>
                  </div>

                  {/* Title & Core Problem */}
                  <div className="mt-4 space-y-2">
                    <h2 className="text-lg font-bold text-slate-900">{topic.title}</h2>
                    <p className="text-xs font-medium text-indigo-600">{topic.subtitle}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>{t.coreProblemLabel}:</strong> {topic.coreProblem}
                    </p>
                    <p className="text-xs text-emerald-700 leading-relaxed bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100">
                      <strong>{t.bigPromiseLabel}:</strong> {topic.bigPromise}
                    </p>
                  </div>

                  {/* Key Highlights Grid */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[11px] block">{t.targetAudienceLabel}</span>
                      <strong className="text-slate-800 line-clamp-1">{topic.targetAudience}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">{t.differentiationLabel}</span>
                      <strong className="text-slate-800 line-clamp-1">{topic.differentiationAngle}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">{t.priceTestingRangeLabel}</span>
                      <strong className="text-indigo-600 font-mono">
                        ${topic.priceTestRange.test} / ${topic.priceTestRange.regular} / ${topic.priceTestRange.premium}
                      </strong>
                    </div>
                  </div>

                  {/* Expand / Collapse Details Toggle */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">
                      {topic.potentialCompanions.length} {t.companionAssetsLabel}
                    </span>
                    <button
                      onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                      <span>{isExpanded ? (lang === 'en' ? 'Hide Details' : '收合評分細項') : (lang === 'en' ? 'View 8 Rubrics & Assets' : '查看 8 項評分標準與配套')}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Expanded 8 Rubric Breakdown */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 mb-2">{t.scoreBreakdownLabel}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                          <div className="p-2 bg-slate-50 rounded border border-slate-200">
                            <span className="text-[10px] text-slate-400 block">Demand Signal</span>
                            <strong>{topic.scoreBreakdown.demandSignal} / 25</strong>
                          </div>
                          <div className="p-2 bg-slate-50 rounded border border-slate-200">
                            <span className="text-[10px] text-slate-400 block">Problem Urgency</span>
                            <strong>{topic.scoreBreakdown.problemUrgency} / 15</strong>
                          </div>
                          <div className="p-2 bg-slate-50 rounded border border-slate-200">
                            <span className="text-[10px] text-slate-400 block">Competition Entry</span>
                            <strong>{topic.scoreBreakdown.competitionEntry} / 15</strong>
                          </div>
                          <div className="p-2 bg-slate-50 rounded border border-slate-200">
                            <span className="text-[10px] text-slate-400 block">Differentiation</span>
                            <strong>{topic.scoreBreakdown.differentiation} / 15</strong>
                          </div>
                          <div className="p-2 bg-slate-50 rounded border border-slate-200">
                            <span className="text-[10px] text-slate-400 block">Creator Fit</span>
                            <strong>{topic.scoreBreakdown.creatorFit} / 10</strong>
                          </div>
                          <div className="p-2 bg-slate-50 rounded border border-slate-200">
                            <span className="text-[10px] text-slate-400 block">Audience Reach</span>
                            <strong>{topic.scoreBreakdown.audienceReach} / 10</strong>
                          </div>
                          <div className="p-2 bg-slate-50 rounded border border-slate-200">
                            <span className="text-[10px] text-slate-400 block">Digital Format Fit</span>
                            <strong>{topic.scoreBreakdown.digitalFit} / 5</strong>
                          </div>
                          <div className="p-2 bg-slate-50 rounded border border-slate-200">
                            <span className="text-[10px] text-slate-400 block">Cost & Risk Score</span>
                            <strong>{topic.scoreBreakdown.costRisk} / 5</strong>
                          </div>
                        </div>
                      </div>

                      {/* Companion Assets */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 mb-1.5">{t.companionAssetsLabel}</h4>
                        <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                          {topic.potentialCompanions.map((comp, idx) => (
                            <li key={idx}>{comp}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Market Evidence Summary */}
                      <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs text-indigo-900">
                        <strong className="block text-indigo-950 mb-0.5">Empirical Evidence Summary:</strong>
                        <span>{topic.marketEvidenceSummary}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
