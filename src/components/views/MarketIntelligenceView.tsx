import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  TrendingUp,
  Filter,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Zap,
  Target,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { DigitalProductProject, MarketplaceObservation } from '../../types/project.ts';
import { Language, translations } from '../../utils/i18n.ts';

interface MarketIntelligenceViewProps {
  project: DigitalProductProject;
  setActiveView: (view: any) => void;
  onRefreshResearch?: () => void;
  onSynchronizeToGateA?: (options?: {
    prioritizedObservationId?: string;
    focusMarketplace?: string;
    searchQuery?: string;
  }) => void;
  lang?: Language;
}

export const MarketIntelligenceView: React.FC<MarketIntelligenceViewProps> = ({
  project,
  setActiveView,
  onRefreshResearch,
  onSynchronizeToGateA,
  lang = 'en',
}) => {
  const t = translations[lang];
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const observations = project.marketResearch?.platformEvidence || [];
  const marketplaces = ['ALL', 'Amazon Kindle', 'Apple Books', 'Gumroad', 'Payhip', 'Etsy'];

  const filteredObservations = observations.filter((obs) => {
    const matchesMarket = selectedMarketplace === 'ALL' || obs.marketplace === selectedMarketplace;
    const matchesSearch =
      searchQuery.trim() === '' ||
      obs.productTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obs.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obs.sellerOrAuthor.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Category match
    let matchesCategory = true;
    if (selectedCategory === 'productivity_systems') {
      matchesCategory = obs.category.toLowerCase().includes('notion') || obs.category.toLowerCase().includes('productivity') || obs.productTitle.toLowerCase().includes('solo');
    } else if (selectedCategory === 'wellness_habits') {
      matchesCategory = obs.category.toLowerCase().includes('wellness') || obs.category.toLowerCase().includes('habit') || obs.productTitle.toLowerCase().includes('burnout');
    } else if (selectedCategory === 'personal_finance') {
      matchesCategory = obs.category.toLowerCase().includes('finance') || obs.category.toLowerCase().includes('mortgage') || obs.productTitle.toLowerCase().includes('homebuyer');
    } else if (selectedCategory === 'freelance_career') {
      matchesCategory = obs.category.toLowerCase().includes('freelance') || obs.category.toLowerCase().includes('career') || obs.productTitle.toLowerCase().includes('proposal');
    } else if (selectedCategory === 'budget_living') {
      matchesCategory = obs.category.toLowerCase().includes('budget') || obs.category.toLowerCase().includes('food') || obs.productTitle.toLowerCase().includes('meal');
    }

    return matchesMarket && matchesSearch && matchesCategory;
  });

  // Calculate highest velocity market leader based on reviews & rank
  const velocityLeader = [...observations].sort((a, b) => {
    const scoreA = (a.reviewCount || 0) * (a.rating || 4) / Math.max(1, a.observedRank || 10);
    const scoreB = (b.reviewCount || 0) * (b.rating || 4) / Math.max(1, b.observedRank || 10);
    return scoreB - scoreA;
  })[0];

  const handleRunRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      if (onRefreshResearch) onRefreshResearch();
    }, 800);
  };

  const handleTriggerSync = (options?: {
    category?: string;
    prioritizedObservationId?: string;
    focusMarketplace?: string;
    searchQuery?: string;
  }) => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      if (onSynchronizeToGateA) {
        onSynchronizeToGateA({
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          ...options,
        });
      } else {
        setActiveView('topic_selection');
      }
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-indigo-600 font-semibold mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>MTRE — Market Trend & Recommendation Engine</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{t.mtreTitle}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{t.mtreSubtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isRefreshing ? t.refreshing : t.refresh}</span>
            </button>
            <button
              onClick={() =>
                handleTriggerSync({
                  category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
                  focusMarketplace: selectedMarketplace !== 'ALL' ? selectedMarketplace : undefined,
                  searchQuery: searchQuery.trim().length > 0 ? searchQuery : undefined,
                })
              }
              disabled={isSyncing}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{t.syncMarketToIntelligenceBtn} →</span>
            </button>
          </div>
        </div>

        {/* Category Filter Chips Strip */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'en' ? 'Product Category / Topic Filter:' : '目標領域 / 產品類別篩選：'}</span>
            </span>
            {selectedCategory !== 'ALL' && (
              <button
                onClick={() => setSelectedCategory('ALL')}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 underline font-normal"
              >
                {lang === 'en' ? 'Clear Category Filter' : '重設類別'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: lang === 'en' ? 'All Domains' : '全部領域' },
              { id: 'productivity_systems', label: lang === 'en' ? 'Notion & Systems' : 'Notion 與一人公司' },
              { id: 'wellness_habits', label: lang === 'en' ? 'Wellness & Habits' : '身心微習慣 & 倦怠自癒' },
              { id: 'personal_finance', label: lang === 'en' ? 'Finance & Real Estate' : '個人理財 & 房貸避坑' },
              { id: 'freelance_career', label: lang === 'en' ? 'Freelance & Proposals' : '接案變現 & 報價範本' },
              { id: 'budget_living', label: lang === 'en' ? 'Budget Living & Meals' : '家庭餐桌 & 平價節流' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
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

        {/* Platform & Search Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
          {/* Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {marketplaces.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMarketplace(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedMarketplace === m
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m === 'ALL' ? t.allPlatforms : m}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchMarketplacePlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Market Intelligence Synthesis & Opportunity Matrix Banner */}
      {observations.length > 0 && velocityLeader && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-5 border border-indigo-700/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-amber-300 bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-400" />
                <span>{t.mtreSynthesisTitle}</span>
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-300">
                {observations.length} {lang === 'en' ? 'signals across 5 marketplaces' : '組多平台實證信號'}
              </span>
            </div>
            <div className="text-sm font-semibold text-white flex items-center gap-2 flex-wrap">
              <span className="text-slate-300 text-xs font-normal">{t.detectedMarketLeader}:</span>
              <span className="font-bold text-indigo-200">
                {velocityLeader.productTitle} ({velocityLeader.marketplace})
              </span>
              <span className="text-[11px] font-mono bg-indigo-500/30 px-2 py-0.5 rounded text-indigo-300">
                #{velocityLeader.observedRank} · {velocityLeader.reviewCount?.toLocaleString()} reviews · ${velocityLeader.currentPrice.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.syncStatsSummary}
            </p>
          </div>

          <button
            onClick={() =>
              handleTriggerSync({
                prioritizedObservationId: velocityLeader.id,
              })
            }
            className="px-4 py-2.5 text-xs font-semibold text-indigo-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-all shadow-sm shrink-0 flex items-center gap-2 active:scale-95"
          >
            <Zap className="w-4 h-4 fill-current text-indigo-950" />
            <span>{t.syncMarketToIntelligenceBtn}</span>
          </button>
        </div>
      )}

      {/* Observations Grid or Empty State */}
      {filteredObservations.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              {lang === 'en' ? 'No Market Signals Detected' : '尚未啟動市場信號探測'}
            </h3>
            <p className="text-xs text-slate-500">{t.noObservationsFound}</p>
          </div>
          <button
            onClick={handleRunRefresh}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{t.runDiscoveryBtn}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredObservations.map((obs) => {
            const isLeader = velocityLeader?.id === obs.id;
            return (
              <div
                key={obs.id}
                className={`bg-white border rounded-xl p-5 hover:border-indigo-300 transition-all flex flex-col justify-between space-y-4 shadow-2xs ${
                  isLeader ? 'ring-1 ring-amber-400/50 border-amber-300' : 'border-slate-200'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Platform Badge & Evidence Level */}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                        {obs.marketplace}
                      </span>
                      {isLeader && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Award className="w-3 h-3 text-amber-500" />
                          <span>Velocity #1</span>
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 font-mono">{obs.observedAt}</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block line-clamp-1">{obs.category}</span>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mt-0.5">
                      {obs.productTitle}
                    </h3>
                    <span className="text-xs text-slate-500 mt-1 block">by {obs.sellerOrAuthor}</span>
                  </div>
                </div>

                {/* Metrics Strip */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-3 gap-2 py-2 px-2.5 bg-slate-50 rounded-lg text-xs font-mono text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t.priceLabel}</span>
                      <strong className="text-slate-900">${obs.currentPrice.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t.rankLabel}</span>
                      <strong className="text-indigo-600">#{obs.observedRank || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{t.reviewsLabel}</span>
                      <strong>{obs.reviewCount?.toLocaleString() || '0'}</strong>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-slate-50/50 p-2 rounded border border-slate-100">
                    <span className="font-semibold text-slate-600 block">{t.dataLimitationNotice}</span>
                    <span className="line-clamp-2">{obs.dataLimitations}</span>
                  </div>

                  {/* Actions Strip: Live Inspection & Prioritize */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <a
                      href={obs.productURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-2.5 text-[11px] font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs text-center"
                      title={`Open live search query on ${obs.marketplace}`}
                    >
                      <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{lang === 'en' ? 'Inspect Live' : '查看原站'}</span>
                    </a>

                    <button
                      onClick={() => handleTriggerSync({ prioritizedObservationId: obs.id })}
                      className="py-2 px-2.5 text-[11px] font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex items-center justify-center gap-1 active:scale-[0.98] text-center"
                      title="Synthesize this market observation as the top recommendation in Gate A"
                    >
                      <Target className="w-3 h-3 text-indigo-600 shrink-0" />
                      <span className="truncate">{t.prioritizeSignalBtn}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
