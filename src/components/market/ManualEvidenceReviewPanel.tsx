import React, { useEffect, useState } from 'react';
import {
  ClipboardCheck,
  FileUp,
  Download,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Globe,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  GateAResourceEntry,
  MarketEvidenceType,
  MarketplaceObservation,
  MarketSourceClass,
} from '../../types/project.ts';
import type { Language } from '../../utils/i18n.ts';
import {
  applyManualReviewDecision,
  createManualObservationRecord,
  inferObservationDefaults,
  parseImportedObservations,
  SAMPLE_IMPORT_CSV_TEMPLATE,
  type ManualEvidenceInput,
} from '../../utils/manualEvidenceReview.ts';
import { apiJson } from '../../services/apiClient.ts';

interface ManualEvidenceReviewPanelProps {
  observations: MarketplaceObservation[];
  prefillResource?: GateAResourceEntry | null;
  focusedObservationId?: string | null;
  onAddObservation: (obs: MarketplaceObservation) => void;
  onImportObservations: (obsList: MarketplaceObservation[]) => void;
  onReviewObservation: (updated: MarketplaceObservation) => void;
  onDeleteObservation?: (obsId: string) => void;
  lang?: Language;
}

const DEFAULT_DRAFT: ManualEvidenceInput = {
  productTitle: '',
  sellerOrAuthor: '',
  marketplace: 'NYT Best Sellers',
  country: 'US',
  category: 'Personal Finance & Budgeting',
  productFormat: 'Ebook / Digital Download',
  productURL: '',
  sourceURL: '',
  sourceClass: 'secondary_report',
  evidenceType: 'reported_ranking',
  observedRank: undefined,
  rankScope: '',
  metricName: '',
  metricValue: '',
  metricUnit: '',
  currentPrice: 0,
  currency: 'USD',
  dataAsOfDate: new Date().toISOString().slice(0, 10),
  publicationDate: '',
  evidenceExcerpt: '',
  excerptLocator: '',
  evidenceAttachmentRef: '',
  collectionMethodology: '',
  keepaProvenance: 'not_applicable',
  evidenceChainId: '',
  dataLimitations: '',
};

export const ManualEvidenceReviewPanel: React.FC<ManualEvidenceReviewPanelProps> = ({
  observations,
  prefillResource,
  focusedObservationId,
  onAddObservation,
  onImportObservations,
  onReviewObservation,
  onDeleteObservation,
  lang = 'en',
}) => {
  const [draft, setDraft] = useState<ManualEvidenceInput>(DEFAULT_DRAFT);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formNotice, setFormNotice] = useState<string>('');
  const [urlCheckInfo, setUrlCheckInfo] = useState<string>('');
  const [urlChecking, setUrlChecking] = useState(false);

  // Import state
  const [importText, setImportText] = useState('');
  const [importFilename, setImportFilename] = useState('manual-import.csv');
  const [importStatus, setImportStatus] = useState<{
    accepted: number;
    rejected: Array<{ row: number; errors: string[] }>;
    error?: string;
  } | null>(null);

  // Review inspection state
  const nonSampleObs = observations.filter((o) => !o.isSample);
  const [selectedReviewId, setSelectedReviewId] = useState<string>(
    focusedObservationId || nonSampleObs[0]?.id || ''
  );
  const [reviewFilter, setReviewFilter] = useState<'all' | 'unverified' | 'manually_reviewed' | 'rejected_blocked'>('all');
  const [inspectedConfirmed, setInspectedConfirmed] = useState(false);
  const [reviewerRationale, setReviewerRationale] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  useEffect(() => {
    if (focusedObservationId) {
      setSelectedReviewId(focusedObservationId);
      setInspectedConfirmed(false);
      setReviewerRationale('');
      setReviewError('');
    }
  }, [focusedObservationId]);

  useEffect(() => {
    if (!prefillResource) return;
    applyTemplateFromResource(prefillResource);
  }, [prefillResource]);

  const applyTemplateFromResource = (res: GateAResourceEntry) => {
    setFormErrors([]);
    setFormNotice('');
    setUrlCheckInfo('');

    if (res.id === 'res-nyt-bestsellers') {
      setDraft({
        ...DEFAULT_DRAFT,
        marketplace: 'NYT Best Sellers',
        sourceClass: 'secondary_report',
        evidenceType: 'reported_ranking',
        rankScope: 'NYT Advice, How-To & Miscellaneous (Combined Print & E-Book — not isolated digital ranking)',
        productFormat: 'Combined Print & E-Book',
        collectionMethodology: 'Manual review of dated NYT Best Sellers weekly editorial list page',
        dataLimitations: 'Combined print-and-ebook list scope does not isolate Kindle or creator digital-download unit sales.',
      });
    } else if (res.id === 'res-keepa') {
      setDraft({
        ...DEFAULT_DRAFT,
        marketplace: 'Keepa',
        sourceClass: 'secondary_report',
        evidenceType: 'estimate',
        metricName: 'Estimated Monthly Rank / Price History',
        metricUnit: 'BSR / USD',
        keepaProvenance: 'historical',
        collectionMethodology: 'Manual ASIN lookup on Keepa historical chart',
        dataLimitations: 'Keepa charts report ASIN price/BSR history; estimated unit sales depend on subscription/API model estimates.',
      });
    } else if (res.id === 'res-google-trends') {
      setDraft({
        ...DEFAULT_DRAFT,
        marketplace: 'Google Trends',
        sourceClass: 'supporting_context',
        evidenceType: 'interest_signal',
        metricName: 'Relative Search Interest Index',
        metricUnit: '0-100 normalized index',
        collectionMethodology: 'Manual inspection of Google Trends topic comparison query',
        dataLimitations: 'Google Trends shows relative normalized search interest (0–100) only; not purchase intent or sales rank.',
      });
    } else if (res.id === 'res-etsy-digital-downloads' || res.id === 'res-etsy-seller-handbook') {
      setDraft({
        ...DEFAULT_DRAFT,
        marketplace: 'Etsy',
        sourceClass: 'supporting_context',
        evidenceType: res.id === 'res-etsy-seller-handbook' ? 'interest_signal' : 'featured_collection',
        collectionMethodology: 'Manual inspection of specific Etsy public listing or Seller Handbook trend report',
        dataLimitations: 'Etsy has no verified public ranking collector; search placement and marketplace badges are not verified demand metrics.',
      });
    } else if (res.id === 'res-gumroad-discover') {
      setDraft({
        ...DEFAULT_DRAFT,
        marketplace: 'Gumroad',
        sourceClass: 'supporting_context',
        evidenceType: 'featured_collection',
        collectionMethodology: 'Manual inspection of specific public Gumroad creator product URL',
        dataLimitations: 'Gumroad Discover placement is editorial/algorithmic discovery; self-reported sales counts are seller claims.',
      });
    } else if (res.id === 'res-payhip-marketplace') {
      setDraft({
        ...DEFAULT_DRAFT,
        marketplace: 'Payhip',
        sourceClass: 'supporting_context',
        evidenceType: 'featured_collection',
        collectionMethodology: 'Manual inspection of specific public Payhip storefront listing',
        dataLimitations: 'Payhip marketplace does not expose verified public category rankings.',
      });
    } else {
      setDraft({
        ...DEFAULT_DRAFT,
        marketplace: res.id.includes('apple') ? 'Apple Books' : 'Amazon Kindle',
        sourceClass: 'primary_marketplace',
        evidenceType: 'official_ranking',
        rankScope: `${res.resourceName} — explicit category chart`,
        collectionMethodology: `Manual inspection of specific dated chart entry from ${res.publisher}`,
        dataLimitations: res.importantLimitations,
      });
    }
  };

  const handleInspectSourceUrl = async () => {
    if (!draft.sourceURL.trim()) {
      setUrlCheckInfo('Enter a specific report or listing URL first.');
      return;
    }
    setUrlChecking(true);
    setUrlCheckInfo('');
    try {
      const res = await apiJson<{
        accessStatus: string;
        httpStatus: number | null;
        resolvedURL?: string;
        checkedAt: string;
        note: string;
        error?: string;
      }>('/api/market/evidence/inspect-url', {
        method: 'POST',
        body: JSON.stringify({ url: draft.sourceURL.trim() }),
      });
      if (!res.ok) {
        setUrlCheckInfo(res.data?.error || 'Could not inspect URL.');
      } else {
        setUrlCheckInfo(
          `${res.data.accessStatus.toUpperCase()} (HTTP ${res.data.httpStatus ?? 'err'}) at ${new Date(
            res.data.checkedAt
          ).toLocaleTimeString()} — ${res.data.note} (Reachability check only; does not verify product claims.)`
        );
      }
    } finally {
      setUrlChecking(false);
    }
  };

  const handleCreateObservation = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    setFormNotice('');

    const result = createManualObservationRecord(draft, 'manual_observation');
    if (!result.observation) {
      setFormErrors(result.errors);
      return;
    }

    onAddObservation(result.observation);
    setSelectedReviewId(result.observation.id);
    setInspectedConfirmed(false);
    setReviewerRationale('');
    setFormNotice(
      lang === 'en'
        ? `Saved ${result.observation.id} as Unverified (Manual observation). Inspect and review it in the Review Queue below before Gate A can use it.`
        : `已建立人工觀測紀錄 ${result.observation.id}（狀態：Unverified）。請於下方檢閱佇列完成人工覆核。`
    );
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFilename(file.name);
    const content = await file.text();
    setImportText(content);
  };

  const handleRunImport = () => {
    setImportStatus(null);
    try {
      const result = parseImportedObservations(importText, importFilename);
      if (result.imported.length > 0) {
        onImportObservations(result.imported);
        setSelectedReviewId(result.imported[0].id);
      }
      setImportStatus({
        accepted: result.imported.length,
        rejected: result.rejected,
      });
    } catch (err: any) {
      setImportStatus({
        accepted: 0,
        rejected: [],
        error: err?.message || 'Import failed.',
      });
    }
  };

  const handleDownloadCsvTemplate = () => {
    const blob = new Blob([SAMPLE_IMPORT_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gate-a-evidence-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredQueue = nonSampleObs.filter((obs) => {
    const st = inferObservationDefaults(obs).reviewStatus;
    if (reviewFilter === 'unverified') return st === 'unverified' || st === 'retrieved_checked';
    if (reviewFilter === 'manually_reviewed') return st === 'manually_reviewed';
    if (reviewFilter === 'rejected_blocked') return st === 'rejected' || st === 'blocked';
    return true;
  });

  const inspectedObs =
    nonSampleObs.find((o) => o.id === selectedReviewId) || filteredQueue[0] || nonSampleObs[0] || null;

  const submitReviewDecision = (status: 'manually_reviewed' | 'blocked' | 'rejected' | 'unverified') => {
    if (!inspectedObs) return;
    setReviewError('');
    setReviewSuccess('');
    const result = applyManualReviewDecision(inspectedObs, {
      status,
      rationale: reviewerRationale,
      inspectedConfirmed,
    });
    if (!result.observation) {
      setReviewError(result.error || 'Review validation failed.');
      return;
    }
    onReviewObservation(result.observation);
    setReviewSuccess(
      lang === 'en'
        ? `Updated ${inspectedObs.id} review status to "${status}".`
        : `已將 ${inspectedObs.id} 的審查狀態更新為 ${status}。`
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-semibold text-teal-700">
          <ClipboardCheck className="w-4 h-4" />
          <span>{lang === 'en' ? 'Manual Evidence Review & Fallback Intake Route' : '人工證據審查與替代資料匯入通道'}</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          {lang === 'en'
            ? 'Fallback Observation Intake, File Import & Human Audit Queue'
            : '手動觀察建檔、CSV/JSON 匯入與人工實證審查工作台'}
        </h2>
        <p className="text-sm text-slate-600 max-w-4xl leading-relaxed">
          {lang === 'en'
            ? 'Log specific dated chart entries, NYT editorial list observations, Keepa historical/estimated reports, Google Trends interest indices, or CSV/JSON files. Imports and manual entries always enter Unverified and require explicit source inspection and written rationale.'
            : '可用於建立特定排行紀錄、NYT 書單（保留印刷與電子合併範圍）、Keepa 歷史/估算紀錄、Google Trends 相對熱度或 CSV/JSON 檔案。手動與匯入資料一律標為未驗證，須通過證據檢核與審查理由才能納入參考。'}
        </p>
      </div>

      {/* Form + CSV Import Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Manual Observation Intake Form */}
        <form
          onSubmit={handleCreateObservation}
          className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              {lang === 'en' ? '1. Record Specific Market Observation' : '1. 建立特定市場實證紀錄'}
            </h3>
            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
              Acquisition: manual_observation · Initial: Unverified
            </span>
          </div>

          {/* Quick source templates */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">{lang === 'en' ? 'Quick Preset:' : '快速套用範本：'}</span>
            {[
              { id: 'res-nyt-bestsellers', label: 'NYT Dated List' },
              { id: 'res-keepa', label: 'Keepa ASIN Report' },
              { id: 'res-google-trends', label: 'Google Trends Index' },
              { id: 'res-amazon-kindle-bestsellers', label: 'Official Chart Entry' },
              { id: 'res-gumroad-discover', label: 'Creator Marketplace Listing' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  applyTemplateFromResource({
                    id: preset.id,
                    publisher: preset.label,
                    resourceName: preset.label,
                    originalURL: '',
                    scopeKind: 'published_report',
                    purpose: '',
                    geography: 'US',
                    categoryCoverage: '',
                    formatCoverage: '',
                    whatItSupports: '',
                    importantLimitations: 'Manual inspection required; check scope and currency.',
                    accessStatus: 'unchecked',
                    collectionMethod: 'manual_review',
                  })
                }
                className="px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Product or Report Title *' : '商品或報告標題 *'}
              </span>
              <input
                type="text"
                value={draft.productTitle}
                onChange={(e) => setDraft({ ...draft, productTitle: e.target.value })}
                placeholder="e.g., NYT Advice & How-To Entry — Clear Habit Guide"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Author / Publisher / Collector' : '作者 / 發布機構 / 採集者'}
              </span>
              <input
                type="text"
                value={draft.sellerOrAuthor}
                onChange={(e) => setDraft({ ...draft, sellerOrAuthor: e.target.value })}
                placeholder="e.g., The New York Times / Author Name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Marketplace / Source Platform *' : '來源平台 *'}
              </span>
              <select
                value={draft.marketplace}
                onChange={(e) =>
                  setDraft({ ...draft, marketplace: e.target.value as MarketplaceObservation['marketplace'] })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="Amazon Kindle">Amazon Kindle</option>
                <option value="Apple Books">Apple Books</option>
                <option value="NYT Best Sellers">NYT Best Sellers</option>
                <option value="Keepa">Keepa</option>
                <option value="Google Trends">Google Trends</option>
                <option value="Etsy">Etsy</option>
                <option value="Gumroad">Gumroad</option>
                <option value="Payhip">Payhip</option>
                <option value="Other Research Source">Other Research Source</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">
                  {lang === 'en' ? 'Country' : '國家/地區'}
                </span>
                <input
                  type="text"
                  value={draft.country || ''}
                  onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                  placeholder="US"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">
                  {lang === 'en' ? 'Format *' : '商品格式 *'}
                </span>
                <input
                  type="text"
                  value={draft.productFormat}
                  onChange={(e) => setDraft({ ...draft, productFormat: e.target.value })}
                  placeholder="Kindle Ebook / Combined Print & Ebook"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </label>
            </div>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Category (used for non-fiction educational matching) *' : '分類（僅限非小說教育類）*'}
              </span>
              <input
                type="text"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="e.g., Personal Finance & Budgeting / Business Productivity / Habits & Wellness"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </label>

            <div className="sm:col-span-2 space-y-1">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Original Report / Source URL (Specific URL — never homepage) *' : '原始報告或特定頁面 URL（不得填首頁）*'}
              </span>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={draft.sourceURL}
                  onChange={(e) => setDraft({ ...draft, sourceURL: e.target.value })}
                  placeholder="https://www.nytimes.com/books/best-sellers/2026/11/15/advice-how-to-and-miscellaneous/"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
                <button
                  type="button"
                  disabled={urlChecking}
                  onClick={() => void handleInspectSourceUrl()}
                  className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg whitespace-nowrap inline-flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{urlChecking ? 'Checking...' : 'Check Reachability'}</span>
                </button>
              </div>
              {urlCheckInfo && (
                <p className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md">
                  {urlCheckInfo}
                </p>
              )}
            </div>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Specific Product URL (optional)' : '商品個別連結（選填）'}
              </span>
              <input
                type="url"
                value={draft.productURL || ''}
                onChange={(e) => setDraft({ ...draft, productURL: e.target.value })}
                placeholder="https://www.amazon.com/dp/..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
            </label>

            {/* Separate Source Class & Evidence Type Dimensions */}
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Source Class *' : '來源層級 *'}
              </span>
              <select
                value={draft.sourceClass}
                onChange={(e) => setDraft({ ...draft, sourceClass: e.target.value as MarketSourceClass })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="primary_marketplace">Primary marketplace</option>
                <option value="secondary_report">Secondary report</option>
                <option value="supporting_context">Supporting/context source</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Evidence Type *' : '證據類型 *'}
              </span>
              <select
                value={draft.evidenceType}
                onChange={(e) => setDraft({ ...draft, evidenceType: e.target.value as MarketEvidenceType })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="official_ranking">Official ranking</option>
                <option value="reported_ranking">Reported ranking</option>
                <option value="estimate">Estimate</option>
                <option value="interest_signal">Interest signal</option>
                <option value="search_result">Search result</option>
                <option value="featured_collection">Featured collection</option>
                <option value="seller_claim">Seller claim</option>
              </select>
            </label>

            {draft.marketplace === 'Keepa' && (
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs font-semibold text-slate-700">
                  {lang === 'en' ? 'Keepa Information Provenance *' : 'Keepa 資訊性質標註 *'}
                </span>
                <select
                  value={draft.keepaProvenance || 'historical'}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      keepaProvenance: e.target.value as ManualEvidenceInput['keepaProvenance'],
                    })
                  }
                  className="w-full px-3 py-2 border border-amber-300 bg-amber-50/50 rounded-lg text-sm"
                >
                  <option value="historical">Historical public/tracked BSR & price curve</option>
                  <option value="estimated">Estimated sales / rank estimate</option>
                  <option value="subscription_only">Subscription-only Keepa UI data</option>
                  <option value="authorized_api">Obtained through authorized Keepa API</option>
                </select>
              </label>
            )}

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">
                  {lang === 'en' ? 'Observed Rank' : '實際名次（如有）'}
                </span>
                <input
                  type="number"
                  min={1}
                  value={draft.observedRank ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      observedRank: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">
                  {lang === 'en' ? 'Rank Scope (if ranked)' : '名次適用範圍'}
                </span>
                <input
                  type="text"
                  value={draft.rankScope || ''}
                  onChange={(e) => setDraft({ ...draft, rankScope: e.target.value })}
                  placeholder="e.g., Combined Print & Ebook Advice"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Metric Name</span>
                <input
                  type="text"
                  value={draft.metricName || ''}
                  onChange={(e) => setDraft({ ...draft, metricName: e.target.value })}
                  placeholder="e.g., Trend Index"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Metric Value</span>
                <input
                  type="text"
                  value={String(draft.metricValue ?? '')}
                  onChange={(e) => setDraft({ ...draft, metricValue: e.target.value })}
                  placeholder="78"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700">Units</span>
                <input
                  type="text"
                  value={draft.metricUnit || ''}
                  onChange={(e) => setDraft({ ...draft, metricUnit: e.target.value })}
                  placeholder="0-100 index"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Data-As-Of Date *' : '資料基準日期 *'}
              </span>
              <input
                type="date"
                value={draft.dataAsOfDate.slice(0, 10)}
                onChange={(e) => setDraft({ ...draft, dataAsOfDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Publication Date (if published report)' : '報告發布日（選填）'}
              </span>
              <input
                type="date"
                value={(draft.publicationDate || '').slice(0, 10)}
                onChange={(e) => setDraft({ ...draft, publicationDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Underlying Dataset / Evidence-Chain ID' : '底層資料鏈 ID（防重複計算）'}
              </span>
              <input
                type="text"
                value={draft.evidenceChainId || ''}
                onChange={(e) => setDraft({ ...draft, evidenceChainId: e.target.value })}
                placeholder="e.g., nyt-advice-2026-11-15 (shared across articles from same study)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Collection Methodology *' : '採集方法與口徑 *'}
              </span>
              <input
                type="text"
                value={draft.collectionMethodology}
                onChange={(e) => setDraft({ ...draft, collectionMethodology: e.target.value })}
                placeholder="Manual inspection of dated report / ASIN CSV export"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Exact Supporting Excerpt (min 20 chars) *' : '原出處支持引文摘錄（至少 20 字）*'}
              </span>
              <textarea
                rows={2}
                value={draft.evidenceExcerpt}
                onChange={(e) => setDraft({ ...draft, evidenceExcerpt: e.target.value })}
                placeholder="Paste the exact rank line, metric, or factual excerpt observed in the report..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Excerpt Locator *' : '段落/位置標記 *'}
              </span>
              <input
                type="text"
                value={draft.excerptLocator}
                onChange={(e) => setDraft({ ...draft, excerptLocator: e.target.value })}
                placeholder="Table Row #3 / Section 2 / Archive capture note"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Attachment Filename / Reference (optional)' : '附件檔名/佐證編號（選填）'}
              </span>
              <input
                type="text"
                value={draft.evidenceAttachmentRef || ''}
                onChange={(e) => setDraft({ ...draft, evidenceAttachmentRef: e.target.value })}
                placeholder="nyt-2026-11-15-screenshot.png"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Known Limitations *' : '已知限制條件 *'}
              </span>
              <input
                type="text"
                value={draft.dataLimitations}
                onChange={(e) => setDraft({ ...draft, dataLimitations: e.target.value })}
                placeholder="Document scope boundaries (e.g., combined print/ebook scope, estimated BSR, no sales revenue)..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </label>
          </div>

          {formErrors.length > 0 && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
              {formErrors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}

          {formNotice && (
            <div role="status" className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium">
              {formNotice}
            </div>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'en' ? 'Save Unverified Observation' : '儲存為未驗證觀測紀錄'}</span>
          </button>
        </form>

        {/* CSV / JSON Import Box */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileUp className="w-4 h-4 text-teal-700" />
                <span>{lang === 'en' ? '2. Import CSV / JSON Observations' : '2. 匯入 CSV / JSON 觀測檔案'}</span>
              </h3>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="text-xs font-semibold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'CSV Template' : '下載範本'}</span>
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
              {lang === 'en'
                ? 'Imported rows are tagged acquisitionMethod = file_import and reviewStatus = unverified. Homepage URLs or rows missing excerpts, locators, dates, or limitations are rejected.'
                : '所有匯入列一律設為 file_import 及 unverified。指向首頁或缺少引文、位置標記、日期與限制之資料列將被安全拒絕。'}
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Select .csv or .json File (max 500 KB, 100 rows)' : '選擇 .csv 或 .json 檔案（上限 500 KB / 100 列）'}
              </span>
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={(e) => void handleImportFile(e)}
                className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Or Paste CSV / JSON Payload' : '或直接貼上 CSV / JSON 內容'}
              </span>
              <textarea
                rows={7}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="productTitle,sellerOrAuthor,marketplace,country,category,productFormat,productURL,sourceURL,sourceClass,evidenceType,observedRank,rankScope,dataAsOfDate,evidenceExcerpt,excerptLocator,collectionMethodology,dataLimitations"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </label>

            {importStatus && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  importStatus.error
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {importStatus.error ? (
                  <div>{importStatus.error}</div>
                ) : (
                  <>
                    <div className="font-semibold text-emerald-800">
                      Imported {importStatus.accepted} record(s) as Unverified (`file_import`).
                    </div>
                    {importStatus.rejected.length > 0 && (
                      <div className="text-rose-800 space-y-1">
                        <div className="font-semibold">Rejected {importStatus.rejected.length} row(s):</div>
                        {importStatus.rejected.slice(0, 4).map((r) => (
                          <div key={r.row}>
                            Row {r.row}: {r.errors.join(' ')}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!importText.trim()}
            onClick={handleRunImport}
            className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2"
          >
            <FileUp className="w-4 h-4" />
            <span>{lang === 'en' ? 'Validate & Import as Unverified' : '驗證並匯入為未驗證紀錄'}</span>
          </button>
        </div>
      </div>

      {/* Inspection & Human Audit Queue */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {lang === 'en'
                ? `3. Evidence Inspection & Human Review Queue (${nonSampleObs.length})`
                : `3. 證據內容檢核與人工覆核佇列 (${nonSampleObs.length})`}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {lang === 'en'
                ? 'Manually reviewed fallback records can only be approved after inspecting the actual excerpt/locator and writing a specific rationale. Collector-verified status is never spoofed.'
                : '人工覆核須在檢視實際引文摘錄與出處並撰寫具體理由後方可完成；絕不偽造為採集器即時驗證狀態。'}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'all', label: `All (${nonSampleObs.length})` },
              {
                id: 'unverified',
                label: `Needs Review (${
                  nonSampleObs.filter((o) => {
                    const st = inferObservationDefaults(o).reviewStatus;
                    return st === 'unverified' || st === 'retrieved_checked';
                  }).length
                })`,
              },
              {
                id: 'manually_reviewed',
                label: `Manually Reviewed (${
                  nonSampleObs.filter((o) => inferObservationDefaults(o).reviewStatus === 'manually_reviewed').length
                })`,
              },
              {
                id: 'rejected_blocked',
                label: `Rejected/Blocked (${
                  nonSampleObs.filter((o) => {
                    const st = inferObservationDefaults(o).reviewStatus;
                    return st === 'rejected' || st === 'blocked';
                  }).length
                })`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReviewFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg border font-semibold ${
                  reviewFilter === tab.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredQueue.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-300 rounded-xl text-center text-sm text-slate-500">
            {lang === 'en'
              ? 'No non-sample observations match this filter yet. Scan live charts, log a manual observation, or import a CSV/JSON file above.'
              : '目前沒有符合條件的非樣本觀測紀錄。請掃描即時榜單、手動建檔或匯入 CSV/JSON。'}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Queue List */}
            <div className="lg:col-span-5 space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {filteredQueue.map((obs) => {
                const defs = inferObservationDefaults(obs);
                const isActive = inspectedObs?.id === obs.id;
                return (
                  <button
                    key={obs.id}
                    type="button"
                    onClick={() => {
                      setSelectedReviewId(obs.id);
                      setInspectedConfirmed(false);
                      setReviewerRationale(obs.reviewerRationale || '');
                      setReviewError('');
                      setReviewSuccess('');
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all space-y-1.5 ${
                      isActive
                        ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="font-bold text-slate-700">{obs.marketplace}</span>
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          defs.reviewStatus === 'manually_reviewed'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : defs.reviewStatus === 'retrieved_checked'
                            ? 'bg-sky-50 text-sky-800 border border-sky-200'
                            : defs.reviewStatus === 'rejected' || defs.reviewStatus === 'blocked'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {defs.reviewStatus}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 line-clamp-1">{obs.productTitle}</div>
                    <div className="text-[11px] text-slate-500 font-mono flex flex-wrap gap-2">
                      <span>{defs.sourceClass}</span>
                      <span>·</span>
                      <span>{defs.acquisitionMethod}</span>
                      <span>·</span>
                      <span>{defs.evidenceType}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Detail Inspector & Review Form */}
            {inspectedObs && (
              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                {(() => {
                  const defs = inferObservationDefaults(inspectedObs);
                  return (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-3">
                        <div>
                          <div className="text-xs font-mono text-slate-500">
                            ID: {inspectedObs.id} · Chain: {inspectedObs.evidenceChainId || inspectedObs.id}
                          </div>
                          <h4 className="text-base font-bold text-slate-900 mt-0.5">
                            {inspectedObs.productTitle}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-800">
                            {defs.acquisitionMethod}
                          </span>
                          {onDeleteObservation && defs.acquisitionMethod !== 'live_collector' && (
                            <button
                              type="button"
                              onClick={() => onDeleteObservation(inspectedObs.id)}
                              title="Delete manual/imported observation"
                              className="p-1.5 text-rose-700 hover:bg-rose-100 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-slate-500">Source Class / Evidence Type:</span>
                          <div className="font-mono font-semibold text-slate-800">
                            {defs.sourceClass} · {defs.evidenceType}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500">Marketplace / Country / Format:</span>
                          <div className="font-semibold text-slate-800">
                            {inspectedObs.marketplace} ({inspectedObs.country || 'US'}) · {inspectedObs.productFormat}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500">Rank & Scope / Metric:</span>
                          <div className="font-mono text-slate-800">
                            {inspectedObs.observedRank ? `#${inspectedObs.observedRank} (${inspectedObs.rankScope || 'scope unstated'})` : 'Unranked'}
                            {inspectedObs.metricValue ? ` · ${inspectedObs.metricName || 'Metric'}: ${inspectedObs.metricValue} ${inspectedObs.metricUnit || ''}` : ''}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500">Dates (Data-as-of vs Retrieved):</span>
                          <div className="font-mono text-slate-800">
                            as-of: {inspectedObs.dataAsOfDate || inspectedObs.observedAt}
                            {inspectedObs.publicationDate ? ` · pub: ${inspectedObs.publicationDate}` : ''}
                            {inspectedObs.retrievedAt ? ` · retrieved: ${inspectedObs.retrievedAt.slice(0, 10)}` : ''}
                          </div>
                        </div>
                        <div className="sm:col-span-2 break-all">
                          <span className="text-slate-500">Source URL: </span>
                          <a
                            href={inspectedObs.sourceURL || inspectedObs.productURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-700 underline font-mono inline-flex items-center gap-1"
                          >
                            <span>{inspectedObs.sourceURL || inspectedObs.productURL}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-slate-500">Supporting Excerpt:</span>
                          <blockquote className="mt-1 p-2.5 bg-slate-50 border-l-2 border-teal-600 text-slate-800 italic">
                            “{inspectedObs.evidenceExcerpt || 'No excerpt captured'}”
                          </blockquote>
                          <div className="text-[11px] font-mono text-slate-500 mt-1">
                            Locator: {inspectedObs.excerptLocator || 'None'}{' '}
                            {inspectedObs.evidenceAttachmentRef ? `· Attachment: ${inspectedObs.evidenceAttachmentRef}` : ''}
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-slate-500">Methodology & Limitations:</span>
                          <div className="text-slate-700 mt-0.5">
                            {inspectedObs.collectionMethodology || inspectedObs.collector || 'Not recorded'}
                            {inspectedObs.keepaProvenance && inspectedObs.keepaProvenance !== 'not_applicable'
                              ? ` [Keepa: ${inspectedObs.keepaProvenance}]`
                              : ''}
                          </div>
                          <div className="text-amber-900 mt-1 font-medium">{inspectedObs.dataLimitations}</div>
                        </div>
                      </div>

                      {defs.acquisitionMethod === 'live_collector' ? (
                        <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-950">
                          {lang === 'en'
                            ? 'This record originated from a live supported chart collector. You may still mark it Rejected or Blocked if invalid, or inspect its metadata above.'
                            : '此筆紀錄由即時支援榜單採集器取得；若有異常仍可標記為拒絕或封鎖。'}
                        </div>
                      ) : null}

                      <div className="space-y-3 pt-1">
                        <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inspectedConfirmed}
                            onChange={(e) => setInspectedConfirmed(e.target.checked)}
                            className="mt-0.5 rounded border-slate-300"
                          />
                          <span>
                            {lang === 'en'
                              ? 'I have directly inspected the exact source URL, supporting excerpt, locator, rank scope, dates, and limitations above.'
                              : '我已實際檢視上方原始連結、引文摘錄、段落標記、排名範圍、基準日期與限制條件。'}
                          </span>
                        </label>

                        <label className="block space-y-1">
                          <span className="text-xs font-semibold text-slate-700">
                            {lang === 'en'
                              ? 'Reviewer Rationale (min 20 chars required to approve)'
                              : '審查人評估理由（核准至少需 20 字）'}
                          </span>
                          <textarea
                            rows={2}
                            value={reviewerRationale}
                            onChange={(e) => setReviewerRationale(e.target.value)}
                            placeholder="Explain what this record actually proves, its scope limits, and why it should be approved or rejected..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                        </label>

                        {reviewError && (
                          <div role="alert" className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>{reviewError}</span>
                          </div>
                        )}
                        {reviewSuccess && (
                          <div role="status" className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{reviewSuccess}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {defs.acquisitionMethod !== 'live_collector' && (
                            <button
                              type="button"
                              onClick={() => submitReviewDecision('manually_reviewed')}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Mark Manually Reviewed</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => submitReviewDecision('blocked')}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Mark Blocked</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => submitReviewDecision('rejected')}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Mark Rejected</span>
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
