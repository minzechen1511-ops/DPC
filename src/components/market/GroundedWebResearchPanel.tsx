import React, { useState } from 'react';
import {
  ClipboardPlus,
  ExternalLink,
  Globe,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react';
import type { GateAResourceEntry } from '../../types/project.ts';
import type { Language } from '../../utils/i18n.ts';
import {
  type AiUsageMeta,
  type GroundedSource,
  type GroundingInfo,
  runGroundedMarketSearch,
} from '../../services/aiService.ts';

interface GroundedWebResearchPanelProps {
  projectId: string;
  defaultDomain?: string;
  onLogLeadToManualReview?: (resource: GateAResourceEntry) => void;
  onRecordAiUsage?: (usage?: AiUsageMeta, model?: string) => void;
  lang?: Language;
}

export const GroundedWebResearchPanel: React.FC<GroundedWebResearchPanelProps> = ({
  projectId,
  defaultDomain = '',
  onLogLeadToManualReview,
  onRecordAiUsage,
  lang = 'en',
}) => {
  const [query, setQuery] = useState<string>('');
  const [domainFocus, setDomainFocus] = useState<string>(defaultDomain);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [resultText, setResultText] = useState<string>('');
  const [grounding, setGrounding] = useState<GroundingInfo | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('gemini-4-hydrogen');

  const quickQueries =
    lang === 'zh'
      ? [
          '2026 熱門數位模板與 Notion 工作系統買家需求趨勢與定價',
          '個人理財與預算規劃電子書／工作簿常見消費者痛點',
          '接案者提案範本與合約工具包目前市場競品與缺口',
        ]
      : [
          'Top buyer pain points and pricing benchmarks for Notion templates & digital productivity toolkits',
          'Current demand trends for personal finance budgeting workbooks and debt payoff templates',
          'Freelance proposal and client onboarding digital bundle gaps on Gumroad and Etsy',
        ];

  const executeSearch = async (searchText?: string) => {
    const q = (searchText ?? query).trim();
    if (q.length < 3 || busy) return;
    if (searchText) setQuery(searchText);
    setBusy(true);
    setError('');
    try {
      const res = await runGroundedMarketSearch({
        query: q,
        domainFocus: domainFocus.trim() || undefined,
        projectId,
        lang,
      });
      setResultText(res.content || '');
      setGrounding(res.grounding || { grounded: false, webSearchQueries: [], sources: [] });
      setModelUsed(res.model || 'gemini-4-hydrogen');
      onRecordAiUsage?.(res.usage, res.model);
    } catch (err: any) {
      setError(
        err?.message ||
          (lang === 'en'
            ? 'Google Search Grounding request failed.'
            : 'Google 搜尋即時查證失敗。')
      );
    } finally {
      setBusy(false);
    }
  };

  const handleLogLead = (source: GroundedSource) => {
    if (!onLogLeadToManualReview) return;
    const entry: GateAResourceEntry = {
      id: `res-web-lead-${Date.now()}`,
      resourceName: source.title,
      publisher: source.domain || 'Web Search Source',
      originalURL: source.url,
      purpose: 'Unverified web research lead', geography: 'Not established',
      categoryCoverage: 'Not established', formatCoverage: 'Not established',
      whatItSupports: 'Discovery only; inspect original evidence before review',
      scopeKind: 'supporting_discovery',
      accessStatus: 'unchecked',
      collectionMethod: 'manual_review',
      importantLimitations:
        'Discovered via Gemini Google Search Grounding (gemini-4-hydrogen). Inspect original URL, date, and metric before approving.',
    };
    onLogLeadToManualReview(entry);
  };

  return (
    <div className="space-y-4">
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-sky-800">
              <Globe className="w-4 h-4 text-sky-700" />
              <span>GEMINI 4 HYDROGEN · GOOGLE SEARCH GROUNDING</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {lang === 'en'
                ? 'Live Web Market Research (Google Search Grounded)'
                : '即時網路市場研究（Google 搜尋即時引述）'}
            </h2>
            <p className="text-sm text-slate-600 max-w-4xl">
              {lang === 'en'
                ? 'Query live public web trends, competitor positioning, and buyer demand discussions using gemini-4-hydrogen with Google Search Grounding. Discovered URLs enter Manual Evidence Review as unverified leads until you inspect them.'
                : '透過 gemini-4-hydrogen 結合 Google Search Grounding 即時搜尋公開市場趨勢、買家痛點與競品定位。找到的網址可一鍵帶入「人工證據審查通道」進行查證。'}
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void executeSearch();
          }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end"
        >
          <label className="lg:col-span-7 block text-xs font-semibold text-slate-700">
            {lang === 'en' ? 'Market Research Question' : '市場研究檢索問題'}
            <div className="relative mt-1.5">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                minLength={3}
                maxLength={600}
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  lang === 'en'
                    ? 'e.g., What digital budgeting templates and pricing tiers are buyers seeking in 2026?'
                    : '例：2026 年買家最常尋找哪些理財規劃模板或工作簿？主流定價為何？'
                }
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-normal"
              />
            </div>
          </label>

          <label className="lg:col-span-3 block text-xs font-semibold text-slate-700">
            {lang === 'en' ? 'Domain / Format Focus (optional)' : '領域或產品形式聚焦（選填）'}
            <input
              type="text"
              value={domainFocus}
              onChange={(e) => setDomainFocus(e.target.value)}
              placeholder={lang === 'en' ? 'e.g., Notion Toolkit, Ebook' : '例：Notion 模板、電子書'}
              className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-normal"
            />
          </label>

          <button
            type="submit"
            disabled={busy || query.trim().length < 3}
            className="lg:col-span-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{busy ? (lang === 'en' ? 'Searching...' : '搜尋中...') : lang === 'en' ? 'Search Web' : '即時搜尋'}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">
            {lang === 'en' ? 'Quick prompts:' : '建議研究問題：'}
          </span>
          {quickQueries.map((qq) => (
            <button
              key={qq}
              type="button"
              onClick={() => void executeSearch(qq)}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-900 border border-slate-200 text-slate-700 transition-colors text-left"
            >
              {qq}
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium">
            {error}
          </div>
        )}
      </section>

      {(resultText || grounding) && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-sky-50 text-sky-800 border border-sky-200">
                {modelUsed} + Google Search
              </span>
              {grounding?.grounded && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {grounding.sources.length}{' '}
                  {lang === 'en' ? 'grounded web source(s)' : '筆即時引述網頁來源'}
                </span>
              )}
            </div>
            {grounding && grounding.webSearchQueries.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-600">
                <span>Queries:</span>
                {grounding.webSearchQueries.map((q) => (
                  <span key={q} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                    {q}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{resultText}</div>

          {grounding && grounding.sources.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {lang === 'en'
                  ? 'Grounded Web Citations (Inspect Before Gate A Promotion)'
                  : 'Google 搜尋即時引述來源（需經人工審查後方可納入 Gate A）'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {grounding.sources.map((src) => (
                  <div
                    key={src.url}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2.5 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="font-bold text-slate-900 line-clamp-2">{src.title}</div>
                      <div className="font-mono text-[11px] text-slate-500 truncate">
                        {src.domain || src.url}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-sky-700 hover:text-sky-900 font-semibold inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'Open URL' : '開啟來源'}</span>
                      </a>
                      {onLogLeadToManualReview && (
                        <button
                          type="button"
                          onClick={() => handleLogLead(src)}
                          className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold inline-flex items-center gap-1"
                        >
                          <ClipboardPlus className="w-3.5 h-3.5" />
                          <span>
                            {lang === 'en' ? 'Log Lead to Manual Review' : '帶入人工證據審查'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
