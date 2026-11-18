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
  Pencil,
  History,
  CheckSquare,
} from 'lucide-react';
import type {
  GateAResourceEntry,
  MarketEvidenceType,
  MarketplaceObservation,
  MarketSourceClass,
  ObservationReviewAssessment,
} from '../../types/project.ts';
import type { Language } from '../../utils/i18n.ts';
import {
  applyManualReviewDecision,
  computeSha256Hex,
  createManualObservationRecord,
  editManualObservationRecord,
  inferObservationDefaults,
  isObservationReviewStale,
  previewImportedObservations,
  SAMPLE_IMPORT_CSV_TEMPLATE,
  type ImportPreviewResult,
  type ManualEvidenceInput,
} from '../../utils/manualEvidenceReview.ts';
import { apiJson } from '../../services/apiClient.ts';

interface ManualEvidenceReviewPanelProps {
  observations: MarketplaceObservation[];
  prefillResource?: GateAResourceEntry | null;
  focusedObservationId?: string | null;
  onAddObservation: (obs: MarketplaceObservation) => void;
  onEditObservation?: (updated: MarketplaceObservation) => void;
  onImportObservations: (obsList: MarketplaceObservation[]) => void;
  onReviewObservation: (updated: MarketplaceObservation) => void;
  onDeleteObservation?: (obsId: string) => void;
  lang?: Language;
}

const DEFAULT_DRAFT: ManualEvidenceInput = {
  productTitle: '',
  publisher: 'The New York Times',
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

const DEFAULT_ASSESSMENT: ObservationReviewAssessment = {
  establishes: '',
  dateScopeProductMatch: 'exact_match',
  metricNature: 'reported',
  limitationsSummary: '',
  liveRetrievalUnavailableDisclosed: false,
};

function draftFromObservation(obs: MarketplaceObservation): ManualEvidenceInput {
  const defs = inferObservationDefaults(obs);
  return {
    id: obs.id,
    productTitle: obs.productTitle,
    publisher: defs.publisher,
    sellerOrAuthor: obs.sellerOrAuthor,
    marketplace: obs.marketplace,
    country: obs.country || 'US',
    category: obs.category,
    productFormat: obs.productFormat,
    productURL: obs.productURL || '',
    sourceURL: obs.sourceURL || obs.productURL || '',
    sourceClass: defs.sourceClass,
    acquisitionMethod: defs.acquisitionMethod,
    evidenceType: defs.evidenceType,
    observedRank: obs.observedRank,
    rankScope: obs.rankScope || '',
    metricName: obs.metricName || '',
    metricValue: obs.metricValue ?? '',
    metricUnit: obs.metricUnit || '',
    currentPrice: obs.currentPrice || 0,
    currency: obs.currency || 'USD',
    dataAsOfDate: (obs.dataAsOfDate || obs.observedAt || '').slice(0, 10),
    publicationDate: (obs.publicationDate || '').slice(0, 10),
    evidenceExcerpt: obs.evidenceExcerpt || '',
    excerptLocator: obs.excerptLocator || '',
    evidenceAttachmentRef: obs.evidenceAttachmentRef || '',
    collectionMethodology: obs.collectionMethodology || '',
    keepaProvenance: obs.keepaProvenance || 'not_applicable',
    evidenceChainId: obs.evidenceChainId || '',
    dataLimitations: obs.dataLimitations || '',
  };
}

export const ManualEvidenceReviewPanel: React.FC<ManualEvidenceReviewPanelProps> = ({
  observations,
  prefillResource,
  focusedObservationId,
  onAddObservation,
  onEditObservation,
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

  // Two-step import state
  const [importText, setImportText] = useState('');
  const [importFilename, setImportFilename] = useState('manual-import.csv');
  const [importPreview, setImportPreview] = useState<ImportPreviewResult | null>(null);
  const [importCommitMessage, setImportCommitMessage] = useState('');
  const [importError, setImportError] = useState('');

  // Review & edit queue state
  const nonSampleObs = observations.filter((o) => !o.isSample);
  const [selectedReviewId, setSelectedReviewId] = useState<string>(
    focusedObservationId || nonSampleObs[0]?.id || ''
  );
  const [reviewFilter, setReviewFilter] = useState<'all' | 'unverified' | 'manually_reviewed' | 'rejected_blocked'>('all');
  const [inspectedConfirmed, setInspectedConfirmed] = useState(false);
  const [reviewerRationale, setReviewerRationale] = useState('');
  const [reviewAssessment, setReviewAssessment] = useState<ObservationReviewAssessment>(DEFAULT_ASSESSMENT);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Inline edit state for inspected observation
  const [isEditingObs, setIsEditingObs] = useState(false);
  const [editDraft, setEditDraft] = useState<ManualEvidenceInput | null>(null);
  const [editErrors, setEditErrors] = useState<string[]>([]);

  const syncReviewFormForObservation = (obs?: MarketplaceObservation | null) => {
    setInspectedConfirmed(false);
    setReviewError('');
    setReviewSuccess('');
    setIsEditingObs(false);
    setEditDraft(null);
    setEditErrors([]);
    if (!obs) {
      setReviewerRationale('');
      setReviewAssessment(DEFAULT_ASSESSMENT);
      return;
    }
    const defs = inferObservationDefaults(obs);
    setReviewerRationale(obs.reviewerRationale || '');
    setReviewAssessment({
      relationship: obs.reviewAssessment?.relationship,
      relationshipRationale: obs.reviewAssessment?.relationshipRationale || '',
      establishes: obs.reviewAssessment?.establishes || '',
      dateScopeProductMatch: obs.reviewAssessment?.dateScopeProductMatch || 'exact_match',
      metricNature:
        obs.reviewAssessment?.metricNature ||
        (defs.evidenceType === 'official_ranking'
          ? 'observed'
          : defs.evidenceType === 'reported_ranking'
          ? 'reported'
          : 'estimated'),
      limitationsSummary: obs.reviewAssessment?.limitationsSummary || obs.dataLimitations || '',
      liveRetrievalUnavailableDisclosed: Boolean(obs.reviewAssessment?.liveRetrievalUnavailableDisclosed),
    });
  };

  useEffect(() => {
    if (focusedObservationId) {
      setSelectedReviewId(focusedObservationId);
      const match = nonSampleObs.find((o) => o.id === focusedObservationId);
      syncReviewFormForObservation(match);
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
        publisher: 'The New York Times',
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
        publisher: 'Keepa',
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
        publisher: 'Google Trends',
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
        publisher: 'Etsy',
        sourceClass: 'supporting_context',
        evidenceType: res.id === 'res-etsy-seller-handbook' ? 'interest_signal' : 'featured_collection',
        collectionMethodology: 'Manual inspection of specific Etsy public listing or Seller Handbook trend report',
        dataLimitations: 'Etsy has no verified public ranking collector; search placement and marketplace badges are not verified demand metrics.',
      });
    } else if (res.id === 'res-gumroad-discover') {
      setDraft({
        ...DEFAULT_DRAFT,
        marketplace: 'Gumroad',
        publisher: 'Gumroad',
        sourceClass: 'supporting_context',
        evidenceType: 'featured_collection',
        collectionMethodology: 'Manual inspection of specific public Gumroad creator product URL',
        dataLimitations: 'Gumroad Discover placement is editorial/algorithmic discovery; self-reported sales counts are seller claims.',
      });
    } else if (res.id === 'res-payhip-marketplace') {
      setDraft({
        ...DEFAULT_DRAFT,
        marketplace: 'Payhip',
        publisher: 'Payhip',
        sourceClass: 'supporting_context',
        evidenceType: 'featured_collection',
        collectionMethodology: 'Manual inspection of specific public Payhip storefront listing',
        dataLimitations: 'Payhip marketplace does not expose verified public category rankings.',
      });
    } else {
      setDraft({
        ...DEFAULT_DRAFT,
        marketplace: res.id.includes('apple') ? 'Apple Books' : 'Amazon Kindle',
        publisher: res.id.includes('apple') ? 'Apple Books' : 'Amazon',
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
        lastCheckedAt: string;
        lastCheckNote: string;
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
            res.data.lastCheckedAt
          ).toLocaleString()} — ${res.data.lastCheckNote} (Reachability check only; does not verify product claims.)`
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
    syncReviewFormForObservation(result.observation);
    setFormNotice(
      lang === 'en'
        ? `Saved ${result.observation.id} as Unverified (Manual observation). Complete the 5-point structured Review Checklist below before Gate A can use it.`
        : `已建立人工觀測紀錄 ${result.observation.id}（狀態：Unverified）。請於下方佇列完成 5 項結構化覆核。`
    );
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFilename(file.name);
    const content = await file.text();
    setImportText(content);
    setImportPreview(null);
    setImportCommitMessage('');
    setImportError('');
    e.target.value = '';
  };

  const handlePreviewImport = async () => {
    setImportError('');
    setImportCommitMessage('');
    try {
      const sha = await computeSha256Hex(importText);
      const preview = previewImportedObservations(importText, importFilename, sha);
      setImportPreview(preview);
    } catch (err: any) {
      setImportPreview(null);
      setImportError(err?.message || 'Import preview failed.');
    }
  };

  const handleConfirmImport = () => {
    if (!importPreview || importPreview.validRows.length === 0) return;
    onImportObservations(importPreview.validRows);
    setSelectedReviewId(importPreview.validRows[0].id);
    syncReviewFormForObservation(importPreview.validRows[0]);
    setImportCommitMessage(
      lang === 'en'
        ? `Imported ${importPreview.validRows.length} observation(s) from "${importPreview.fileName}" (SHA-256 ${importPreview.fileHash.slice(0, 12)}…) as Unverified (file_import).`
        : `已從 ${importPreview.fileName} 匯入 ${importPreview.validRows.length} 筆未驗證紀錄 (file_import)。`
    );
    setImportPreview(null);
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
    const stale = isObservationReviewStale(obs);
    if (reviewFilter === 'unverified') return st === 'unverified' || st === 'retrieved_checked' || stale;
    if (reviewFilter === 'manually_reviewed') return st === 'manually_reviewed' && !stale;
    if (reviewFilter === 'rejected_blocked') return st === 'rejected' || st === 'blocked';
    return true;
  });

  const inspectedObs =
    nonSampleObs.find((o) => o.id === selectedReviewId) || filteredQueue[0] || nonSampleObs[0] || null;

  const submitReviewDecision = (
    status: 'manually_reviewed' | 'blocked' | 'rejected' | 'unverified',
    outcome?: 'accepted' | 'qualified' | 'rejected' | 'blocked'
  ) => {
    if (!inspectedObs) return;
    setReviewError('');
    setReviewSuccess('');
    const result = applyManualReviewDecision(inspectedObs, {
      status,
      outcome,
      rationale: reviewerRationale,
      inspectedConfirmed,
      assessment: reviewAssessment,
      requireStructuredChecklist: status === 'manually_reviewed',
    });
    if (!result.observation) {
      setReviewError(result.error || 'Review validation failed.');
      return;
    }
    onReviewObservation(result.observation);
    setReviewSuccess(
      lang === 'en'
        ? `Recorded "${outcome || status}" review for ${inspectedObs.id} (${result.observation.evidenceVersionHash}).`
        : `已記錄 ${inspectedObs.id} 之覆核結論：${outcome || status}。`
    );
  };

  const handleSaveObservationEdit = () => {
    if (!inspectedObs || !editDraft) return;
    setEditErrors([]);
    const res = editManualObservationRecord(inspectedObs, editDraft);
    if (!res.observation) {
      setEditErrors(res.errors);
      return;
    }
    if (onEditObservation) {
      onEditObservation(res.observation);
    } else {
      onReviewObservation(res.observation);
    }
    setIsEditingObs(false);
    setEditDraft(null);
    syncReviewFormForObservation(res.observation);
    setReviewSuccess(
      lang === 'en'
        ? `Updated ${res.observation.id}. Because evidentiary fields changed, review status reset to "unverified" and any prior Gate A approval was invalidated until re-reviewed.`
        : `已更新 ${res.observation.id}；證據內容異動已將審查狀態重設為 unverified 並撤銷既有 Gate A 核准。`
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
            ? 'Fallback Observation Intake, 2-Step File Import & Structured Human Audit'
            : '手動觀察建檔、兩段式 CSV/JSON 匯入與結構化人工實證審查'}
        </h2>
        <p className="text-sm text-slate-600 max-w-4xl leading-relaxed">
          {lang === 'en'
            ? 'Log specific dated chart entries, NYT editorial lists, Keepa historical/estimated records, Google Trends indices, or preview CSV/JSON files. Editing evidentiary fields automatically invalidates prior review approvals and Gate A until re-verified.'
            : '登錄特定排行、NYT 書單、Keepa 歷史/估算紀錄、Google Trends 指標或預覽匯入檔案。修改已審查證據欄位會自動作廢先前覆核並重設 Gate A。'}
        </p>
      </div>

      {/* Form + 2-Step CSV Import Grid */}
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
            <label className="space-y-1 sm:col-span-2">
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
                {lang === 'en' ? 'Publisher / Report Owner *' : '發布機構 / 報告出版方 *'}
              </span>
              <input
                type="text"
                value={draft.publisher || ''}
                onChange={(e) => setDraft({ ...draft, publisher: e.target.value })}
                placeholder="e.g., The New York Times / Apple Books / Keepa"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Seller / Product Author' : '商品作者 / 賣家'}
              </span>
              <input
                type="text"
                value={draft.sellerOrAuthor || ''}
                onChange={(e) => setDraft({ ...draft, sellerOrAuthor: e.target.value })}
                placeholder="e.g., Author or Studio Name"
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
                <option value="published_research">Published research / survey (context, not product demand)</option>
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
                placeholder="e.g., nyt-advice-2026-11-15"
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

        {/* Two-Step CSV / JSON Import Box */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileUp className="w-4 h-4 text-teal-700" />
                <span>{lang === 'en' ? '2. 2-Step CSV / JSON Import' : '2. 兩段式 CSV / JSON 匯入'}</span>
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
                ? 'Step A parses and validates every row with a SHA-256 attachment hash before committing. Step B imports valid rows strictly as acquisitionMethod = file_import and reviewStatus = unverified.'
                : '第一階段先驗證資料列並產生檔案雜湊摘要預覽；確認無誤後才以 file_import 與 unverified 寫入研究紀錄。'}
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
                rows={6}
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportPreview(null);
                }}
                placeholder="productTitle,publisher,sellerOrAuthor,marketplace,country,category,productFormat,productURL,sourceURL,sourceClass,evidenceType,observedRank,rankScope,dataAsOfDate,evidenceExcerpt,excerptLocator,collectionMethodology,dataLimitations"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </label>

            {importError && (
              <div role="alert" className="p-3 rounded-xl border bg-rose-50 border-rose-200 text-xs text-rose-900">
                {importError}
              </div>
            )}

            {importPreview && (
              <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 text-xs space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1 font-mono text-[11px]">
                  <span className="font-bold text-indigo-950">
                    Preview: {importPreview.validRows.length}/{importPreview.totalRows} valid row(s)
                  </span>
                  <span className="text-slate-600">SHA-256: {importPreview.fileHash.slice(0, 12)}…</span>
                </div>
                {importPreview.validRows.length > 0 && (
                  <div className="max-h-36 overflow-y-auto border border-indigo-200/70 rounded-lg bg-white divide-y divide-slate-100">
                    {importPreview.validRows.map((row) => (
                      <div key={row.id} className="p-2 flex items-center justify-between gap-2 text-[11px]">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            Row {row.importRowNumber}: {row.productTitle}
                          </div>
                          <div className="font-mono text-slate-500 truncate">
                            {row.marketplace} · {row.evidenceType} · {row.dataAsOfDate} · chain {row.evidenceChainId}
                          </div>
                        </div>
                        <span className="font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 shrink-0">
                          unverified
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {importPreview.rejectedRows.length > 0 && (
                  <div className="text-rose-800 space-y-1">
                    <div className="font-semibold">Rejected {importPreview.rejectedRows.length} row(s):</div>
                    {importPreview.rejectedRows.slice(0, 4).map((r) => (
                      <div key={r.row}>
                        Row {r.row}: {r.errors.join(' ')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {importCommitMessage && (
              <div role="status" className="p-3 rounded-xl border bg-emerald-50 border-emerald-200 text-xs text-emerald-900 font-medium">
                {importCommitMessage}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <button
              type="button"
              disabled={!importText.trim()}
              onClick={() => void handlePreviewImport()}
              className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2"
            >
              <FileUp className="w-4 h-4" />
              <span>{lang === 'en' ? 'Step A: Preview & Validate Import Rows' : '步驟 A：預覽並驗證匯入內容'}</span>
            </button>

            {importPreview && importPreview.validRows.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {lang === 'en'
                    ? `Step B: Confirm Import (${importPreview.validRows.length} Unverified Row(s))`
                    : `步驟 B：確認匯入 ${importPreview.validRows.length} 筆（未驗證）`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inspection & Structured Human Audit Queue */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {lang === 'en'
                ? `3. Evidence Inspection, Edit & Structured Human Audit Queue (${nonSampleObs.length})`
                : `3. 證據檢核、編修與結構化人工覆核佇列 (${nonSampleObs.length})`}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {lang === 'en'
                ? 'Requires completing all 5 review criteria (what it establishes, date/scope/product match, metric nature, limitations disclosure, and written rationale). Editing evidence resets status to Unverified.'
                : '須完成 5 項實證審查清單後方可核准或保留採信；編修觀測資料將自動作廢先前審查結果。'}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'all', label: `All (${nonSampleObs.length})` },
              {
                id: 'unverified',
                label: `Needs Review / Stale (${
                  nonSampleObs.filter((o) => {
                    const st = inferObservationDefaults(o).reviewStatus;
                    return st === 'unverified' || st === 'retrieved_checked' || isObservationReviewStale(o);
                  }).length
                })`,
              },
              {
                id: 'manually_reviewed',
                label: `Manually Reviewed (${
                  nonSampleObs.filter(
                    (o) => inferObservationDefaults(o).reviewStatus === 'manually_reviewed' && !isObservationReviewStale(o)
                  ).length
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
            <div className="lg:col-span-5 space-y-2 max-h-[680px] overflow-y-auto pr-1">
              {filteredQueue.map((obs) => {
                const defs = inferObservationDefaults(obs);
                const stale = isObservationReviewStale(obs);
                const isActive = inspectedObs?.id === obs.id;
                return (
                  <button
                    key={obs.id}
                    type="button"
                    onClick={() => {
                      setSelectedReviewId(obs.id);
                      syncReviewFormForObservation(obs);
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
                          stale
                            ? 'bg-amber-100 text-amber-950 border border-amber-300'
                            : defs.reviewStatus === 'manually_reviewed'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : defs.reviewStatus === 'retrieved_checked'
                            ? 'bg-sky-50 text-sky-800 border border-sky-200'
                            : defs.reviewStatus === 'rejected' || defs.reviewStatus === 'blocked'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {stale ? 'stale_review' : defs.reviewStatus}
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

            {/* Detail Inspector, Inline Editor & Structured Review Checklist */}
            {inspectedObs && (
              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                {(() => {
                  const defs = inferObservationDefaults(inspectedObs);
                  const stale = isObservationReviewStale(inspectedObs);
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
                          {defs.acquisitionMethod !== 'live_collector' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditingObs) {
                                  setIsEditingObs(false);
                                  setEditDraft(null);
                                  setEditErrors([]);
                                } else {
                                  setEditDraft(draftFromObservation(inspectedObs));
                                  setEditErrors([]);
                                  setIsEditingObs(true);
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-white border border-slate-300 rounded-lg inline-flex items-center gap-1"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>{isEditingObs ? 'Cancel Edit' : 'Edit Fields'}</span>
                            </button>
                          )}
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

                      {stale && (
                        <div role="alert" className="p-3 bg-amber-100 border border-amber-300 rounded-lg text-xs text-amber-950 font-medium flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>
                            Stale Review: Evidentiary fields were modified after the last approval ({inspectedObs.reviewedEvidenceHash}). Complete the structured review again to re-enable this observation for Gate A.
                          </span>
                        </div>
                      )}

                      {isEditingObs && editDraft ? (
                        <div className="bg-white border border-indigo-200 rounded-xl p-4 space-y-3 text-xs">
                          <div className="font-bold text-indigo-950">
                            Edit Observation Fields (resets approval to Unverified until re-reviewed)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="space-y-1 sm:col-span-2">
                              <span className="font-semibold text-slate-700">Title *</span>
                              <input
                                type="text"
                                value={editDraft.productTitle}
                                onChange={(e) => setEditDraft({ ...editDraft, productTitle: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="font-semibold text-slate-700">Publisher</span>
                              <input
                                type="text"
                                value={editDraft.publisher || ''}
                                onChange={(e) => setEditDraft({ ...editDraft, publisher: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="font-semibold text-slate-700">Data-As-Of Date *</span>
                              <input
                                type="date"
                                value={editDraft.dataAsOfDate.slice(0, 10)}
                                onChange={(e) => setEditDraft({ ...editDraft, dataAsOfDate: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                              />
                            </label>
                            <label className="space-y-1 sm:col-span-2">
                              <span className="font-semibold text-slate-700">Original Source URL *</span>
                              <input
                                type="url"
                                value={editDraft.sourceURL}
                                onChange={(e) => setEditDraft({ ...editDraft, sourceURL: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="font-semibold text-slate-700">Rank Scope</span>
                              <input
                                type="text"
                                value={editDraft.rankScope || ''}
                                onChange={(e) => setEditDraft({ ...editDraft, rankScope: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="font-semibold text-slate-700">Evidence Chain ID</span>
                              <input
                                type="text"
                                value={editDraft.evidenceChainId || ''}
                                onChange={(e) => setEditDraft({ ...editDraft, evidenceChainId: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                              />
                            </label>
                            <label className="space-y-1 sm:col-span-2">
                              <span className="font-semibold text-slate-700">Supporting Excerpt *</span>
                              <textarea
                                rows={2}
                                value={editDraft.evidenceExcerpt}
                                onChange={(e) => setEditDraft({ ...editDraft, evidenceExcerpt: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                              />
                            </label>
                            <label className="space-y-1 sm:col-span-2">
                              <span className="font-semibold text-slate-700">Known Limitations *</span>
                              <input
                                type="text"
                                value={editDraft.dataLimitations}
                                onChange={(e) => setEditDraft({ ...editDraft, dataLimitations: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                              />
                            </label>
                          </div>
                          {editErrors.length > 0 && (
                            <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-900">
                              {editErrors.join(' ')}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={handleSaveObservationEdit}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
                          >
                            Save Changes & Reset to Unverified
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-lg border border-slate-200">
                          <div>
                            <span className="text-slate-500">Publisher / Source Class / Evidence Type:</span>
                            <div className="font-semibold text-slate-800">
                              {defs.publisher} · <span className="font-mono">{defs.sourceClass} · {defs.evidenceType}</span>
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
                              {inspectedObs.metricValue !== undefined
                                ? ` · ${inspectedObs.metricName || 'Metric'}: ${inspectedObs.metricValue} ${inspectedObs.metricUnit || ''}`
                                : ''}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Dates (As-of / Publication / Retrieved):</span>
                            <div className="font-mono text-slate-800">
                              as-of: {inspectedObs.dataAsOfDate || inspectedObs.observedAt}
                              {inspectedObs.publicationDate ? ` · pub: ${inspectedObs.publicationDate}` : ''}
                              {inspectedObs.retrievedAt ? ` · got: ${inspectedObs.retrievedAt.slice(0, 10)}` : ''}
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
                            <span className="text-slate-500">Supporting Excerpt & Attachment Provenance:</span>
                            <blockquote className="mt-1 p-2.5 bg-slate-50 border-l-2 border-teal-600 text-slate-800 italic">
                              “{inspectedObs.evidenceExcerpt || 'No excerpt captured'}”
                              {inspectedObs.evidenceCapture && <details className="mt-2"><summary>Original collector material · SHA-256 {inspectedObs.evidenceCapture.sha256}</summary><pre className="whitespace-pre-wrap break-all max-h-64 overflow-auto">{inspectedObs.evidenceCapture.content}</pre></details>}
                              {inspectedObs.rawImportedPayload && <details className="mt-2"><summary>Original imported row</summary><pre className="whitespace-pre-wrap break-all max-h-64 overflow-auto">{JSON.stringify(inspectedObs.rawImportedPayload,null,2)}</pre></details>}
                            </blockquote>
                            <div className="text-[11px] font-mono text-slate-500 mt-1 space-y-0.5">
                              <div>
                                Locator: {inspectedObs.excerptLocator || 'None'}{' '}
                                {inspectedObs.evidenceAttachmentRef ? `· Attachment: ${inspectedObs.evidenceAttachmentRef}` : ''}
                              </div>
                              {inspectedObs.attachmentHash && (
                                <div>
                                  File Hash: {inspectedObs.attachmentHash.slice(0, 16)}… · Row #{inspectedObs.importRowNumber || 1}
                                </div>
                              )}
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
                      )}

                      {defs.acquisitionMethod === 'live_collector' ? (
                        <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-950">
                          {lang === 'en'
                            ? 'This record originated from a live supported chart collector. You may still mark it Rejected or Blocked below if invalid, or inspect its metadata above.'
                            : '此筆紀錄由即時支援榜單採集器取得；若有異常仍可於下方標記為拒絕或封鎖。'}
                        </div>
                      ) : null}

                      {/* 5-Criteria Structured Human Audit Checklist */}
                      <div className="space-y-3 pt-1 bg-white p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                          <CheckSquare className="w-4 h-4 text-teal-700" />
                          <span>{lang === 'en' ? 'Structured Review Checklist (5 Required Checks)' : '結構化人工實證審查清單（5 項必填）'}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <label className="space-y-1 sm:col-span-2">
                            <span className="font-semibold text-slate-700">
                              1. What does this observation actually establish? (min 10 chars) *
                            </span>
                            <input
                              type="text"
                              value={reviewAssessment.establishes}
                              onChange={(e) =>
                                setReviewAssessment({ ...reviewAssessment, establishes: e.target.value })
                              }
                              placeholder="e.g., Editorial Advice/How-To persistence across print & ebook editions — NOT digital-only unit sales."
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                          </label>

                          <label className="space-y-1">
                            <span className="font-semibold text-slate-700">2. Date, Scope & Product Match *</span>
                            <select
                              value={reviewAssessment.dateScopeProductMatch}
                              onChange={(e) =>
                                setReviewAssessment({
                                  ...reviewAssessment,
                                  dateScopeProductMatch: e.target.value as ObservationReviewAssessment['dateScopeProductMatch'],
                                })
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                            >
                              <option value="exact_match">Exact match (scope, product, date align)</option>
                              <option value="partial_scope_match">Partial match (combined print/ebook, broad trend, or aged date)</option>
                              <option value="mismatch">Mismatch (contradicts or wrong format/period — cannot Accept)</option>
                            </select>
                          </label>

                          <label className="space-y-1">
                            <span className="font-semibold text-slate-700">3. Metric Nature *</span>
                            <select
                              value={reviewAssessment.metricNature}
                              onChange={(e) =>
                                setReviewAssessment({
                                  ...reviewAssessment,
                                  metricNature: e.target.value as ObservationReviewAssessment['metricNature'],
                                })
                              }
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                            >
                              <option value="observed">Directly observed (primary marketplace / explicit price/rank)</option>
                              <option value="reported">Published secondary report (editorial list / trade roundup)</option>
                              <option value="estimated">Estimated / indexed signal (Keepa model / Google Trends index)</option>
                            </select>
                          </label>

                          <label className="space-y-1 sm:col-span-2">
                            <span className="font-semibold text-slate-700">
                              4. Scope Boundaries & Limitations Summary (min 10 chars) *
                            </span>
                            <input
                              type="text"
                              value={reviewAssessment.limitationsSummary}
                              onChange={(e) =>
                                setReviewAssessment({ ...reviewAssessment, limitationsSummary: e.target.value })
                              }
                              placeholder="Document why sales velocity, revenue, or niche buyer conversion remains unmeasured..."
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                          </label>
                        </div>

                        <label className="block text-xs space-y-1">
                          <span>Relationship to the opportunity (explicit review, optional)</span>
                          <select className="w-full border rounded p-2" value={reviewAssessment.relationship || ''} onChange={e=>setReviewAssessment({...reviewAssessment,relationship:(e.target.value || undefined) as ObservationReviewAssessment['relationship']})}>
                            <option value="">Conservative comparison by evidence type</option><option value="corroborates">Corroborating</option><option value="complements">Complementary</option><option value="contradicts">Contradictory</option>
                          </select>
                          {reviewAssessment.relationship && <textarea className="w-full border rounded p-2" aria-label="Source relationship rationale" placeholder="Explain which specific opportunity claim this corroborates, complements, or contradicts (min 20 characters)." value={reviewAssessment.relationshipRationale || ''} onChange={e=>setReviewAssessment({...reviewAssessment,relationshipRationale:e.target.value})}/>}
                        </label>
                        <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(reviewAssessment.liveRetrievalUnavailableDisclosed)}
                            onChange={(e) =>
                              setReviewAssessment({
                                ...reviewAssessment,
                                liveRetrievalUnavailableDisclosed: e.target.checked,
                              })
                            }
                            className="mt-0.5 rounded border-slate-300"
                          />
                          <span>
                            Acknowledge manual/fallback status (never upgrades to automated live collector or current bestseller rank)
                          </span>
                        </label>

                        <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={inspectedConfirmed}
                            onChange={(e) => setInspectedConfirmed(e.target.checked)}
                            className="mt-0.5 rounded border-slate-300"
                          />
                          <span className="font-medium">
                            5.{' '}
                            {lang === 'en'
                              ? 'I have directly inspected the supporting excerpt, locator/attachment, source URL, dates, and limitations shown above.'
                              : '我已實際檢視上方引文摘錄、段落標記/附件、原始連結、日期與限制條件。'}
                          </span>
                        </label>

                        <label className="block space-y-1">
                          <span className="text-xs font-semibold text-slate-700">
                            {lang === 'en'
                              ? 'Reviewer Rationale (min 20 chars required to Accept or Qualify) *'
                              : '審查人評估理由（核准或附條件採信至少需 20 字）*'}
                          </span>
                          <textarea
                            rows={2}
                            value={reviewerRationale}
                            onChange={(e) => setReviewerRationale(e.target.value)}
                            placeholder="Explain what this record actually proves, why its scope fits or is qualified, and any conflicting signals..."
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
                            <>
                              <button
                                type="button"
                                onClick={() => submitReviewDecision('manually_reviewed', 'accepted')}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Accept (Reviewed)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => submitReviewDecision('manually_reviewed', 'qualified')}
                                className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                                <span>Qualify (Scoped Context)</span>
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => submitReviewDecision('blocked', 'blocked')}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Mark Blocked</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => submitReviewDecision('rejected', 'rejected')}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Mark Rejected</span>
                          </button>
                        </div>
                      </div>

                      {/* Review History Timeline */}
                      {inspectedObs.reviewHistory && inspectedObs.reviewHistory.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
                          <div className="text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 text-slate-500" />
                            <span>Review History ({inspectedObs.reviewHistory.length})</span>
                          </div>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto text-[11px]">
                            {[...inspectedObs.reviewHistory].reverse().map((entry, idx) => (
                              <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="font-mono text-slate-600 flex flex-wrap justify-between gap-1">
                                  <span className="font-semibold text-slate-900">
                                    {entry.outcome.toUpperCase()} ({entry.status})
                                  </span>
                                  <span>{entry.timestamp.slice(0, 19).replace('T', ' ')} · {entry.evidenceVersionHash}</span>
                                </div>
                                <div className="text-slate-700 mt-0.5">{entry.rationale}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
