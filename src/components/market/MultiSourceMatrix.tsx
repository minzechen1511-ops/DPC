import React from 'react';
import { ExternalLink, ClipboardCheck, AlertTriangle, GitCompare } from 'lucide-react';
import type {
  CandidateEvidenceComparisonRow,
  MarketplaceObservation,
  MultiSourceStatus,
} from '../../types/project.ts';
import type { Language } from '../../utils/i18n.ts';
import {
  inferObservationDefaults,
  isObservationReviewStale,
} from '../../utils/manualEvidenceReview.ts';
import {
  isCurrentMarketEvidence,
  isHistoricalOrAgedRanking,
  isReviewedFallbackEvidence,
} from '../../utils/marketDiscoveryEngine.ts';

interface MultiSourceMatrixProps {
  multiSourceStatus?: MultiSourceStatus;
  rows: CandidateEvidenceComparisonRow[];
  onInspectObservation: (obsId: string) => void;
  lang?: Language;
}

export function multiSourceStatusMeta(status?: MultiSourceStatus, lang: Language = 'en') {
  switch (status) {
    case 'REVIEWED_MULTI_SOURCE':
      return {
        label: lang === 'en' ? 'Reviewed Multi-Source' : '多來源已覆核互證',
        cls: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      };
    case 'SINGLE_SOURCE':
      return {
        label: lang === 'en' ? 'Single-Source Evidence' : '單一獨立來源證據',
        cls: 'bg-amber-50 text-amber-950 border-amber-200',
      };
    default:
      return {
        label: lang === 'en' ? 'Needs Evidence' : '尚待補充實證',
        cls: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
}

export const MultiSourceMatrix: React.FC<MultiSourceMatrixProps> = ({
  multiSourceStatus,
  rows,
  onInspectObservation,
  lang = 'en',
}) => {
  const statusMeta = multiSourceStatusMeta(multiSourceStatus, lang);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 inline-flex items-center gap-1.5">
          <GitCompare className="w-4 h-4 text-teal-700" />
          <span>
            {lang === 'en'
              ? `Multi-Source Evidence Comparison Matrix (${rows.length})`
              : `多來源證據交叉比對矩陣 (${rows.length})`}
          </span>
        </h4>
        <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md border ${statusMeta.cls}`}>
          {statusMeta.label}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          {lang === 'en'
            ? 'No comparison rows recorded for this niche domain yet.'
            : '此領域尚無可供比對的觀測紀錄。'}
        </p>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs tabular-nums">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 font-semibold whitespace-nowrap">Record / Chain</th>
                <th className="py-2 px-3 font-semibold whitespace-nowrap">Source & Type</th>
                <th className="py-2 px-3 font-semibold whitespace-nowrap">Review State</th>
                <th className="py-2 px-3 font-semibold whitespace-nowrap">Relation</th>
                <th className="py-2 px-3 font-semibold min-w-[200px]">What It Supports</th>
                <th className="py-2 px-3 font-semibold min-w-[220px]">Cannot Establish / Conflict</th>
                <th className="py-2 px-3 font-semibold text-right whitespace-nowrap">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row) => {
                const stateCls =
                  row.reviewState === 'valid_live' || row.reviewState === 'valid_manual'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : row.reviewState === 'stale_review'
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : row.reviewState === 'rejected_blocked'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200';

                const relCls =
                  row.relationship === 'contradicts'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : row.relationship === 'duplicates_dataset'
                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                    : row.relationship === 'corroborates'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-sky-50 text-sky-800 border-sky-200';

                return (
                  <tr key={row.observationId} className="align-top hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                      <div className="font-bold text-slate-900">{row.observationId}</div>
                      <div className="text-[11px] text-slate-500">chain: {row.evidenceChainId}</div>
                      <div className="text-[11px] text-slate-500">{row.dataAsOfDate.slice(0, 10)}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{row.marketplace}</div>
                      <div className="text-[11px] font-mono text-slate-600">{row.sourceClass}</div>
                      <div className="text-[11px] font-mono text-slate-600">
                        {row.acquisitionMethod} · {row.evidenceType}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded border font-mono text-[11px] font-semibold ${stateCls}`}>
                        {row.reviewState}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded border font-mono text-[11px] font-semibold ${relCls}`}>
                        {row.relationship}
                      </span>
                      {row.sharesDatasetWithIds.length > 0 && (
                        <div className="text-[10px] font-mono text-amber-800 mt-1">
                          same dataset: {row.sharesDatasetWithIds.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 leading-relaxed">{row.supports}</td>
                    <td className="py-2.5 px-3 text-slate-600 leading-relaxed">
                      <div className="font-medium text-slate-800">{row.cannotEstablish}</div>
                      {row.conflictOrLimitationNote && (
                        <div className="text-[11px] text-amber-900 mt-1">{row.conflictOrLimitationNote}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <a
                          href={row.sourceURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 text-sky-700 hover:bg-slate-50"
                          title="Open Source URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => onInspectObservation(row.observationId)}
                          className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <ClipboardCheck className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface EvidenceLedgerTableProps {
  observations: MarketplaceObservation[];
  onInspectObservation: (obsId: string) => void;
  onPrioritizeSignal?: (obsId: string) => void;
  lang?: Language;
}

export const EvidenceLedgerTable: React.FC<EvidenceLedgerTableProps> = ({
  observations,
  onInspectObservation,
  onPrioritizeSignal,
  lang = 'en',
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
      <table className="w-full text-left text-xs tabular-nums">
        <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
          <tr>
            <th className="py-3 px-3.5 font-semibold whitespace-nowrap">Title & Publisher</th>
            <th className="py-3 px-3 font-semibold whitespace-nowrap">Marketplace / Format</th>
            <th className="py-3 px-3 font-semibold whitespace-nowrap">Class · Method · Type</th>
            <th className="py-3 px-3 font-semibold whitespace-nowrap">Rank / Metric & Scope</th>
            <th className="py-3 px-3 font-semibold whitespace-nowrap">As-Of / Retrieved</th>
            <th className="py-3 px-3 font-semibold whitespace-nowrap">Review & Chain</th>
            <th className="py-3 px-3.5 font-semibold text-right whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {observations.map((obs) => {
            const defs = inferObservationDefaults(obs);
            const live = isCurrentMarketEvidence(obs);
            const manualValid = isReviewedFallbackEvidence(obs);
            const stale = isObservationReviewStale(obs);
            const agedHistorical = isHistoricalOrAgedRanking(obs);

            return (
              <tr key={obs.id} className="align-top hover:bg-slate-50/70">
                <td className="py-3 px-3.5 max-w-[260px]">
                  <div className="font-bold text-slate-900 line-clamp-2">{obs.productTitle}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {defs.publisher} · {obs.sellerOrAuthor}
                  </div>
                </td>
                <td className="py-3 px-3 whitespace-nowrap">
                  <div className="font-semibold text-teal-800">{obs.marketplace}</div>
                  <div className="text-[11px] text-slate-600">{obs.country || 'US'} · {obs.productFormat}</div>
                </td>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                  <div>{defs.sourceClass}</div>
                  <div>{defs.acquisitionMethod}</div>
                  <div className="text-slate-500">{defs.evidenceType}</div>
                </td>
                <td className="py-3 px-3 max-w-[210px]">
                  <div className="font-mono font-bold text-sky-700">
                    {obs.observedRank
                      ? `#${obs.observedRank}`
                      : obs.metricValue !== undefined
                      ? `${obs.metricValue} ${obs.metricUnit || ''}`.trim()
                      : '—'}
                    {agedHistorical && !live ? (
                      <span className="ml-1.5 text-[10px] text-amber-800 font-normal">(Historical/aged)</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-slate-600 line-clamp-2">
                    {obs.rankScope || obs.metricName || obs.category}
                  </div>
                </td>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                  <div>as-of: {(obs.dataAsOfDate || obs.observedAt).slice(0, 10)}</div>
                  {obs.retrievedAt && <div className="text-slate-500">got: {obs.retrievedAt.slice(0, 10)}</div>}
                </td>
                <td className="py-3 px-3 whitespace-nowrap">
                  {obs.isSample ? (
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px]">
                      sample (excluded)
                    </span>
                  ) : stale ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300 font-mono text-[11px] font-semibold">
                      <AlertTriangle className="w-3 h-3" />
                      <span>stale_review</span>
                    </span>
                  ) : live ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px] font-semibold">
                      live_verified (&lt;48h)
                    </span>
                  ) : manualValid ? (
                    <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-mono text-[11px] font-semibold">
                      manually_reviewed {obs.reviewOutcome ? `(${obs.reviewOutcome})` : ''}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-mono text-[11px]">
                      {defs.reviewStatus}
                    </span>
                  )}
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    chain: {obs.evidenceChainId || obs.id}
                  </div>
                </td>
                <td className="py-3 px-3.5 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5">
                    <a
                      href={obs.sourceURL || obs.productURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-sky-700 hover:bg-slate-50 font-semibold inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{lang === 'en' ? 'URL' : '來源'}</span>
                    </a>
                    {!obs.isSample && (
                      <button
                        type="button"
                        onClick={() => onInspectObservation(obs.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                      >
                        {lang === 'en' ? 'Inspect' : '檢核'}
                      </button>
                    )}
                    {(live || manualValid) && onPrioritizeSignal && (
                      <button
                        type="button"
                        onClick={() => onPrioritizeSignal(obs.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold"
                      >
                        ↑
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
