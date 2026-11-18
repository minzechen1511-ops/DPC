import React, { useState } from 'react';
import {
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  Globe,
  ClipboardEdit,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react';
import type { GateAResourceEntry, ResourceScopeKind } from '../../types/project.ts';
import type { Language } from '../../utils/i18n.ts';
import { mergeResourceDirectory } from '../../utils/marketResourceDirectory.ts';

interface ResourceDirectoryPanelProps {
  resources?: GateAResourceEntry[];
  busy?: boolean;
  onCheckResources?: () => void | Promise<void>;
  onRecordManualForResource?: (resource: GateAResourceEntry) => void;
  lang?: Language;
}

export const ResourceDirectoryPanel: React.FC<ResourceDirectoryPanelProps> = ({
  resources,
  busy = false,
  onCheckResources,
  onRecordManualForResource,
  lang = 'en',
}) => {
  const [scopeFilter, setScopeFilter] = useState<'all' | ResourceScopeKind>('all');
  const directory = mergeResourceDirectory(resources);

  const filtered = directory.filter(
    (entry) => scopeFilter === 'all' || entry.scopeKind === scopeFilter
  );

  const getAccessBadge = (entry: GateAResourceEntry) => {
    switch (entry.accessStatus) {
      case 'accessible':
        return {
          label: lang === 'en' ? `Accessible (${entry.httpStatus || 200})` : `可連線 (${entry.httpStatus || 200})`,
          cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
        };
      case 'redirected':
        return {
          label: lang === 'en' ? `Redirect (${entry.httpStatus || 301})` : `轉址 (${entry.httpStatus || 301})`,
          cls: 'bg-sky-50 text-sky-800 border-sky-200',
          icon: AlertTriangle,
        };
      case 'blocked':
        return {
          label: lang === 'en' ? `Blocked (${entry.httpStatus || 403})` : `存取受阻 (${entry.httpStatus || 403})`,
          cls: 'bg-amber-50 text-amber-900 border-amber-200',
          icon: ShieldAlert,
        };
      case 'unavailable':
        return {
          label: lang === 'en' ? `Unavailable${entry.httpStatus ? ` (${entry.httpStatus})` : ''}` : '無法取得',
          cls: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: XCircle,
        };
      default:
        return {
          label: lang === 'en' ? 'Not yet checked' : '尚未實測檢查',
          cls: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: Clock,
        };
    }
  };

  const getMethodLabel = (method: GateAResourceEntry['collectionMethod']) => {
    switch (method) {
      case 'supported_collector':
        return {
          label: lang === 'en' ? 'Supported Live Collector' : '支援即時採集器',
          cls: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        };
      case 'manual_review':
        return {
          label: lang === 'en' ? 'Manual Review / Import' : '人工檢閱 / 匯入',
          cls: 'bg-teal-50 text-teal-800 border-teal-200',
        };
      case 'import':
        return {
          label: lang === 'en' ? 'File Import' : '檔案匯入',
          cls: 'bg-slate-100 text-slate-700 border-slate-200',
        };
      default:
        return {
          label: lang === 'en' ? 'Unavailable' : '暫不可用',
          cls: 'bg-rose-50 text-rose-800 border-rose-200',
        };
    }
  };

  const getScopeLabel = (kind: ResourceScopeKind) => {
    switch (kind) {
      case 'official_chart':
        return lang === 'en' ? 'Official Chart Resource' : '官方排行榜資源';
      case 'published_report':
        return lang === 'en' ? 'Published Ranking / Historical Report' : '公開排名 / 歷史報告資源';
      default:
        return lang === 'en' ? 'Supporting Interest & Discovery' : '輔助趨勢與探索資源';
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-teal-700" />
              <span>
                {lang === 'en'
                  ? 'Gate A Market Research Resource Directory'
                  : 'Gate A 市場研究公開資源檢視目錄'}
              </span>
            </h2>
            <p className="text-sm text-slate-600 max-w-4xl leading-relaxed">
              {lang === 'en'
                ? 'Inspectable seed directory of official charts, published reports, and discovery catalogs. Seed URLs never invent products, ranks, sales, or claims.'
                : '可公開檢核之官方榜單、出版報告與發現平台起始資源目錄。資源連結本身不等同於已驗證商品或暢銷證明。'}
            </p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void onCheckResources?.()}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl transition-colors inline-flex items-center gap-2 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
            <span>
              {busy
                ? lang === 'en'
                  ? 'Checking URLs...'
                  : '檢查連線中...'
                : lang === 'en'
                ? 'Check Source Accessibility'
                : '實測各資源連線狀態'}
            </span>
          </button>
        </div>

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>{lang === 'en' ? 'Verification Rule:' : '驗證規範：'}</strong>{' '}
            {lang === 'en'
              ? 'An HTTP 200 response proves server reachability only. It never validates claims on a page, converts discovery pages (Whop, Etsy, Gumroad, Payhip) into verified rankings, or overrides combined print/ebook list scopes (NYT Best Sellers).'
              : 'HTTP 200 回應僅代表伺服器可連線，絕不代表該頁面宣稱正確或具有暢銷榜單效力；探勘型平台或合併榜單仍須受限於各自的涵蓋範圍與人工檢核規範。'}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {[
            { id: 'all', label: lang === 'en' ? `All Seed Resources (${directory.length})` : `全部資源 (${directory.length})` },
            { id: 'official_chart', label: lang === 'en' ? 'Official Charts (2)' : '官方排行榜 (2)' },
            { id: 'published_report', label: lang === 'en' ? 'Published Reports (2)' : '出版/歷史報告 (2)' },
            { id: 'supporting_discovery', label: lang === 'en' ? 'Interest & Discovery (5)' : '興趣信號與探索 (5)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScopeFilter(tab.id as 'all' | ResourceScopeKind)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                scopeFilter === tab.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filtered.map((entry) => {
          const access = getAccessBadge(entry);
          const method = getMethodLabel(entry.collectionMethod);
          const AccessIcon = access.icon;

          return (
            <article
              key={entry.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-teal-700 font-semibold">
                      {entry.publisher} · {getScopeLabel(entry.scopeKind)}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      {entry.resourceName}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold ${access.cls}`}>
                      <AccessIcon className="w-3.5 h-3.5" />
                      <span>{access.label}</span>
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-semibold ${method.cls}`}>
                      {method.label}
                    </span>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-500">URL:</span>
                    <a
                      href={entry.originalURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-700 hover:text-sky-900 underline font-mono break-all inline-flex items-center gap-1"
                    >
                      <span>{entry.originalURL}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                  {entry.resolvedURL && entry.resolvedURL !== entry.originalURL && (
                    <div className="text-[11px] font-mono text-slate-600 break-all">
                      {lang === 'en' ? 'Resolved target:' : '轉址目標：'} {entry.resolvedURL}
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">{entry.purpose}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">{lang === 'en' ? 'Geography' : '地區範圍'}</span>
                    <strong className="text-slate-800">{entry.geography}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{lang === 'en' ? 'Categories' : '分類涵蓋'}</span>
                    <strong className="text-slate-800">{entry.categoryCoverage}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{lang === 'en' ? 'Formats' : '格式涵蓋'}</span>
                    <strong className="text-slate-800">{entry.formatCoverage}</strong>
                  </div>
                </div>

                <div className="space-y-2 text-xs leading-relaxed">
                  <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-lg text-emerald-950">
                    <strong>{lang === 'en' ? 'Supports:' : '可支持項目：'}</strong> {entry.whatItSupports}
                  </div>
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg text-amber-950">
                    <strong>{lang === 'en' ? 'Important limitations:' : '重要限制：'}</strong> {entry.importantLimitations}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-slate-500 font-mono space-y-0.5">
                  <div>
                    {lang === 'en' ? 'Last checked:' : '最近檢查：'}{' '}
                    {entry.lastCheckedAt ? new Date(entry.lastCheckedAt).toLocaleString() : lang === 'en' ? 'Never' : '尚未檢查'}
                  </div>
                  {entry.lastCheckNote && (
                    <div className="text-[11px] text-slate-600 line-clamp-1" title={entry.lastCheckNote}>
                      {entry.lastCheckNote}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onRecordManualForResource?.(entry)}
                  className="px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                >
                  <ClipboardEdit className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'en' ? 'Log Manual Evidence →' : '記錄此來源人工證據 →'}
                  </span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
