import type {
  MarketAcquisitionMethod,
  MarketEvidenceType,
  MarketplaceObservation,
  MarketReviewStatus,
  MarketSourceClass,
  ObservationReviewAssessment,
  ObservationReviewHistoryEntry,
} from '../types/project.ts';
import { INITIAL_GATE_A_RESOURCES } from './marketResourceDirectory.ts';

export const MAX_IMPORT_BYTES = 500_000;
export const MAX_IMPORT_ROWS = 100;

const RESOURCE_HOMEPAGE_NORMALIZED = new Set(
  INITIAL_GATE_A_RESOURCES.map((r) => normalizeUrlForCompare(r.originalURL)).concat([
    normalizeUrlForCompare('https://rss.marketingtools.apple.com/api/v2/us/books/top-paid/100/books.json'),
    normalizeUrlForCompare('https://www.amazon.com/'),
    normalizeUrlForCompare('https://www.nytimes.com/'),
    normalizeUrlForCompare('https://keepa.com/'),
    normalizeUrlForCompare('https://trends.google.com/'),
    normalizeUrlForCompare('https://www.etsy.com/'),
    normalizeUrlForCompare('https://gumroad.com/'),
    normalizeUrlForCompare('https://payhip.com/'),
  ])
);

function normalizeUrlForCompare(raw: string): string {
  try {
    const u = new URL(raw.trim());
    return `${u.origin}${u.pathname.replace(/\/+$/, '') || '/'}`.toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function defaultPublisherForMarketplace(marketplace: MarketplaceObservation['marketplace']): string {
  switch (marketplace) {
    case 'Apple Books':
      return 'Apple Books';
    case 'Amazon Kindle':
      return 'Amazon';
    case 'NYT Best Sellers':
      return 'The New York Times';
    case 'Keepa':
      return 'Keepa';
    case 'Google Trends':
      return 'Google Trends';
    case 'Etsy':
      return 'Etsy';
    case 'Gumroad':
      return 'Gumroad';
    case 'Payhip':
      return 'Payhip';
    case 'Google Play Books':
      return 'Google Play';
    case 'Kobo':
      return 'Rakuten Kobo';
    default:
      return 'Independent / Specified Publisher';
  }
}

/**
 * Deterministic canonical evidence-version fingerprint across all evidentiary fields.
 * Editing any evidentiary field changes this hash so prior approvals become stale cleanly.
 */
export function computeObservationEvidenceHash(obs: Partial<MarketplaceObservation>): string {
  const canonicalPayload = JSON.stringify([
    (obs.productTitle || '').trim(),
    (obs.publisher || '').trim(),
    (obs.sellerOrAuthor || '').trim(),
    (obs.marketplace || '').trim(),
    (obs.country || 'US').trim(),
    (obs.category || '').trim(),
    (obs.productFormat || '').trim(),
    (obs.productURL || '').trim(),
    (obs.sourceURL || '').trim(),
    (obs.sourceClass || '').trim(),
    (obs.acquisitionMethod || '').trim(),
    (obs.evidenceType || '').trim(),
    obs.observedRank ?? null,
    (obs.rankScope || '').trim(),
    (obs.metricName || '').trim(),
    obs.metricValue ?? null,
    (obs.metricUnit || '').trim(),
    (obs.dataAsOfDate || obs.observedAt || '').trim(),
    (obs.publicationDate || '').trim(),
    (obs.evidenceExcerpt || '').trim(),
    (obs.excerptLocator || '').trim(),
    (obs.evidenceAttachmentRef || '').trim(),
    (obs.attachmentHash || '').trim(),
    (obs.collectionMethodology || '').trim(),
    (obs.keepaProvenance || 'not_applicable').trim(),
    (obs.evidenceChainId || '').trim(),
    (obs.dataLimitations || '').trim(),
  ]);

  let h1 = 0x811c9dc5;
  let h2 = 0xdeadbeef;
  for (let i = 0; i < canonicalPayload.length; i++) {
    const code = canonicalPayload.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `ev_${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export async function computeSha256Hex(content: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const bytes = new TextEncoder().encode(content);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return computeObservationEvidenceHash({ evidenceExcerpt: content });
}

export function isObservationReviewStale(obs: MarketplaceObservation): boolean {
  if (obs.isSample) return false;
  if (obs.reviewStatus !== 'manually_reviewed') return false;
  const currentHash = computeObservationEvidenceHash(obs);
  if (obs.reviewedEvidenceHash && obs.reviewedEvidenceHash !== currentHash) {
    return true;
  }
  if (obs.evidenceVersionHash && obs.reviewedEvidenceHash && obs.evidenceVersionHash !== obs.reviewedEvidenceHash) {
    return true;
  }
  return false;
}

export function isResourceHomepageUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const hasSpecificQuery =
      parsed.search.length > 1 &&
      /(q=|date=|asin=|id=|list=|keyword=|tab=)/.test(parsed.search.toLowerCase());
    const hasSpecificHash = parsed.hash.length > 2;
    if ((parsed.pathname === '/' || parsed.pathname === '') && !hasSpecificQuery && !hasSpecificHash) {
      return true;
    }
    const normalized = normalizeUrlForCompare(trimmed);
    return RESOURCE_HOMEPAGE_NORMALIZED.has(normalized) && !hasSpecificQuery && !hasSpecificHash;
  } catch {
    return false;
  }
}

export function isPrivateOrInvalidPublicUrl(rawUrl: string): { valid: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { valid: false, reason: 'URL must be a valid https:// web address.' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, reason: 'Only http:// or https:// URLs are permitted.' };
  }
  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'Credentials inside URLs are forbidden.' };
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '::1' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^0\./.test(host) ||
    /^\[(fe80|fc|fd|::1)/i.test(host)
  ) {
    return { valid: false, reason: 'Private, loopback, or metadata network hosts are blocked.' };
  }
  return { valid: true };
}

export function inferObservationDefaults(obs: MarketplaceObservation): {
  sourceClass: MarketSourceClass;
  acquisitionMethod: MarketAcquisitionMethod;
  evidenceType: MarketEvidenceType;
  reviewStatus: MarketReviewStatus;
  publisher: string;
} {
  const sourceClass: MarketSourceClass =
    obs.sourceClass ||
    (obs.marketplace === 'NYT Best Sellers' || obs.marketplace === 'Keepa'
      ? 'secondary_report'
      : obs.marketplace === 'Google Trends' ||
        obs.marketplace === 'Gumroad' ||
        obs.marketplace === 'Etsy' ||
        obs.marketplace === 'Payhip' ||
        obs.marketplace === 'Other Research Source'
      ? 'supporting_context'
      : 'primary_marketplace');

  const acquisitionMethod: MarketAcquisitionMethod =
    obs.acquisitionMethod ||
    (obs.collector === 'apple-chart-v1' || obs.collector === 'amazon-chart-v1'
      ? 'live_collector'
      : 'manual_observation');

  const evidenceType: MarketEvidenceType =
    obs.evidenceType ||
    (obs.collector === 'apple-chart-v1' || obs.collector === 'amazon-chart-v1'
      ? 'official_ranking'
      : obs.evidenceLevel === 'FEATURED_COLLECTION'
      ? 'featured_collection'
      : obs.evidenceLevel === 'SELLER_CLAIM'
      ? 'seller_claim'
      : obs.marketplace === 'Google Trends'
      ? 'interest_signal'
      : obs.marketplace === 'Keepa'
      ? 'estimate'
      : obs.marketplace === 'NYT Best Sellers'
      ? 'reported_ranking'
      : 'search_result');

  const reviewStatus: MarketReviewStatus =
    obs.reviewStatus ||
    (obs.isSample
      ? 'unverified'
      : acquisitionMethod === 'live_collector' && obs.evidenceLevel === 'VERIFIED_RANKING'
      ? 'retrieved_checked'
      : 'unverified');

  const publisher = (obs.publisher || defaultPublisherForMarketplace(obs.marketplace)).trim();

  return { sourceClass, acquisitionMethod, evidenceType, reviewStatus, publisher };
}

export function evidenceLevelFromType(type: MarketEvidenceType, collector?: string): MarketplaceObservation['evidenceLevel'] {
  if (type === 'official_ranking' && (collector === 'apple-chart-v1' || collector === 'amazon-chart-v1')) {
    return 'VERIFIED_RANKING';
  }
  if (type === 'featured_collection') return 'FEATURED_COLLECTION';
  if (type === 'seller_claim') return 'SELLER_CLAIM';
  if (type === 'reported_ranking' || type === 'estimate' || type === 'interest_signal' || type === 'official_ranking') {
    return 'PUBLIC_MARKET_INDEX';
  }
  return 'SEARCH_RESULT';
}

export interface ManualEvidenceInput {
  id?: string;
  productTitle: string;
  publisher?: string;
  sellerOrAuthor?: string;
  marketplace: MarketplaceObservation['marketplace'];
  country?: string;
  category: string;
  productFormat: string;
  productURL?: string;
  sourceURL: string;
  sourceClass: MarketSourceClass;
  acquisitionMethod?: MarketAcquisitionMethod;
  evidenceType: MarketEvidenceType;
  observedRank?: number;
  rankScope?: string;
  metricName?: string;
  metricValue?: number | string;
  metricUnit?: string;
  currentPrice?: number;
  currency?: string;
  dataAsOfDate: string;
  publicationDate?: string;
  retrievedAt?: string;
  evidenceExcerpt: string;
  excerptLocator: string;
  evidenceAttachmentRef?: string;
  attachmentHash?: string;
  importFileName?: string;
  importRowNumber?: number;
  rawImportedPayload?: Record<string, unknown>;
  collectionMethodology: string;
  dataLimitations: string;
  keepaProvenance?: MarketplaceObservation['keepaProvenance'];
  evidenceChainId?: string;
}

export function validateManualEvidenceDraft(input: ManualEvidenceInput): string[] {
  const errors: string[] = [];
  if (!input.productTitle || input.productTitle.trim().length < 3) {
    errors.push('Product or report title is required (min 3 characters).');
  }
  if (!input.category || input.category.trim().length < 2) {
    errors.push('Category is required.');
  }
  if (!input.productFormat || input.productFormat.trim().length < 2) {
    errors.push('Product format is required.');
  }

  const srcCheck = isPrivateOrInvalidPublicUrl(input.sourceURL);
  if (!srcCheck.valid) {
    errors.push(`Original source/report URL: ${srcCheck.reason}`);
  } else if (isResourceHomepageUrl(input.sourceURL)) {
    errors.push(
      'Resource homepage URLs (e.g. keepa.com/, trends.google.com/trends/, nytimes.com/books/best-sellers/) cannot serve as a product observation. Provide the specific report/listing URL or attach a dated export URL/file reference.'
    );
  }

  if (input.productURL && input.productURL.trim()) {
    const prodCheck = isPrivateOrInvalidPublicUrl(input.productURL);
    if (!prodCheck.valid) {
      errors.push(`Product URL: ${prodCheck.reason}`);
    } else if (isResourceHomepageUrl(input.productURL)) {
      errors.push('Product URL cannot be a generic resource homepage.');
    }
  }

  if (!input.dataAsOfDate || !Number.isFinite(Date.parse(input.dataAsOfDate))) {
    errors.push('Valid data-as-of date (YYYY-MM-DD or ISO timestamp) is required.');
  }
  if (!input.collectionMethodology || input.collectionMethodology.trim().length < 5) {
    errors.push('Collection method / methodology description is required.');
  }
  if (!input.dataLimitations || input.dataLimitations.trim().length < 10) {
    errors.push('Known data limitations must be documented explicitly (min 10 characters).');
  }
  if (!input.evidenceExcerpt || input.evidenceExcerpt.trim().length < 20) {
    errors.push('Exact supporting excerpt is required (min 20 characters).');
  }
  if (
    (!input.excerptLocator || input.excerptLocator.trim().length < 4) &&
    (!input.evidenceAttachmentRef || input.evidenceAttachmentRef.trim().length < 3)
  ) {
    errors.push('Provide an excerpt locator (table/section/page) or evidence attachment reference.');
  }

  if (
    (input.evidenceType === 'official_ranking' || input.evidenceType === 'reported_ranking') &&
    (!input.rankScope || input.rankScope.trim().length < 4)
  ) {
    errors.push('Rankings require an explicit ranking scope (e.g., list name, category, print/ebook distinction).');
  }

  if (input.marketplace === 'Keepa' && (!input.keepaProvenance || input.keepaProvenance === 'not_applicable')) {
    errors.push('Keepa observations must specify provenance: historical, estimated, subscription_only, or authorized_api.');
  }

  return errors;
}

export function createManualObservationRecord(
  input: ManualEvidenceInput,
  acquisitionOverride?: MarketAcquisitionMethod
): { observation?: MarketplaceObservation; errors: string[] } {
  const errors = validateManualEvidenceDraft(input);
  if (errors.length > 0) {
    return { errors };
  }

  const nowIso = new Date().toISOString();
  const acquisitionMethod: MarketAcquisitionMethod =
    acquisitionOverride ||
    (input.acquisitionMethod === 'file_import' ? 'file_import' : 'manual_observation');

  const safePrice = Number.isFinite(Number(input.currentPrice)) ? Number(input.currentPrice) : 0;
  const rankNum =
    input.observedRank !== undefined && Number.isFinite(Number(input.observedRank)) && Number(input.observedRank) > 0
      ? Math.round(Number(input.observedRank))
      : undefined;

  const baseObservation: MarketplaceObservation = {
    id: input.id?.trim() || `MAN-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    marketplace: input.marketplace,
    publisher: (input.publisher || defaultPublisherForMarketplace(input.marketplace)).trim(),
    country: (input.country || 'US').trim(),
    category: input.category.trim(),
    productTitle: input.productTitle.trim(),
    sellerOrAuthor: (input.sellerOrAuthor || 'Not listed').trim(),
    productURL: (input.productURL || input.sourceURL).trim(),
    sourceURL: input.sourceURL.trim(),
    currentPrice: safePrice,
    priceKnown: safePrice > 0,
    currency: (input.currency || 'USD').trim().toUpperCase(),
    observedRank: rankNum,
    rankScope: input.rankScope?.trim() || undefined,
    metricName: input.metricName?.trim() || undefined,
    metricValue: input.metricValue !== undefined && input.metricValue !== '' ? input.metricValue : undefined,
    metricUnit: input.metricUnit?.trim() || undefined,
    productFormat: input.productFormat.trim(),
    observedAt: input.dataAsOfDate.trim(),
    dataAsOfDate: input.dataAsOfDate.trim(),
    publicationDate: input.publicationDate?.trim() || undefined,
    retrievedAt: input.retrievedAt?.trim() || nowIso,
    evidenceExcerpt: input.evidenceExcerpt.trim(),
    excerptLocator: input.excerptLocator.trim(),
    evidenceAttachmentRef: input.evidenceAttachmentRef?.trim() || undefined,
    attachmentHash: input.attachmentHash?.trim() || undefined,
    importFileName: input.importFileName?.trim() || undefined,
    importRowNumber: input.importRowNumber,
    rawImportedPayload: input.rawImportedPayload,
    collectionMethodology: input.collectionMethodology.trim(),
    keepaProvenance: input.keepaProvenance || 'not_applicable',
    evidenceChainId: input.evidenceChainId?.trim() || `chain-${normalizeUrlForCompare(input.sourceURL)}`,
    sourceClass: input.sourceClass,
    // Manual entries & imports ALWAYS enter as unverified — never collector-verified!
    acquisitionMethod,
    evidenceType: input.evidenceType,
    reviewStatus: 'unverified',
    evidenceLevel: evidenceLevelFromType(input.evidenceType),
    dataLimitations: input.dataLimitations.trim(),
    isSample: false,
  };

  baseObservation.evidenceVersionHash = computeObservationEvidenceHash(baseObservation);
  return { observation: baseObservation, errors: [] };
}

export function editManualObservationRecord(
  existing: MarketplaceObservation,
  updatedInput: ManualEvidenceInput
): { observation?: MarketplaceObservation; errors: string[] } {
  if (existing.isSample) {
    return { errors: ['Sample fixture records cannot be edited into real evidence.'] };
  }
  if (existing.collector === 'apple-chart-v1' || existing.collector === 'amazon-chart-v1') {
    return { errors: ['Live collector records are immutable read-only chart captures; log a separate manual note instead.'] };
  }

  const preservedAcquisition: MarketAcquisitionMethod =
    existing.acquisitionMethod === 'file_import' ? 'file_import' : 'manual_observation';

  const rebuilt = createManualObservationRecord(
    {
      ...updatedInput,
      id: existing.id,
      retrievedAt: existing.retrievedAt,
      importFileName: existing.importFileName,
      importRowNumber: existing.importRowNumber,
      attachmentHash: updatedInput.attachmentHash || existing.attachmentHash,
      rawImportedPayload: existing.rawImportedPayload,
    },
    preservedAcquisition
  );

  if (!rebuilt.observation) {
    return { errors: rebuilt.errors };
  }

  const oldHash = existing.evidenceVersionHash || computeObservationEvidenceHash(existing);
  const nextHash = rebuilt.observation.evidenceVersionHash!;
  const changed = oldHash !== nextHash;
  const wasReviewed = existing.reviewStatus === 'manually_reviewed';

  const nextHistory: ObservationReviewHistoryEntry[] = [...(existing.reviewHistory || [])];
  if (wasReviewed && changed) {
    nextHistory.push({
      timestamp: new Date().toISOString(),
      status: 'unverified',
      outcome: 'invalidated',
      rationale: 'Evidentiary fields were edited after prior review; previous approval invalidated pending fresh review.',
      evidenceVersionHash: oldHash,
    });
  }

  return {
    observation: {
      ...rebuilt.observation,
      // Any edit to evidentiary content forces unverified until re-reviewed cleanly
      reviewStatus: changed ? 'unverified' : existing.reviewStatus || 'unverified',
      reviewOutcome: changed ? undefined : existing.reviewOutcome,
      reviewedAt: changed ? undefined : existing.reviewedAt,
      reviewerRationale: changed ? undefined : existing.reviewerRationale,
      reviewAssessment: changed ? undefined : existing.reviewAssessment,
      reviewedEvidenceHash: changed ? undefined : existing.reviewedEvidenceHash,
      reviewHistory: nextHistory,
    },
    errors: [],
  };
}

export function applyManualReviewDecision(
  observation: MarketplaceObservation,
  decision: {
    status: 'manually_reviewed' | 'blocked' | 'rejected' | 'unverified';
    outcome?: 'accepted' | 'qualified' | 'rejected' | 'blocked';
    rationale: string;
    inspectedConfirmed: boolean;
    assessment?: Partial<ObservationReviewAssessment>;
    requireStructuredChecklist?: boolean;
  }
): { observation?: MarketplaceObservation; error?: string } {
  if (observation.isSample) {
    return { error: 'Legacy sample records cannot be marked as manually reviewed real evidence.' };
  }

  const trimmedRationale = (decision.rationale || '').trim();
  const excerptLen = (observation.evidenceExcerpt || '').trim().length;
  const hasLocator =
    Boolean((observation.excerptLocator || '').trim()) ||
    Boolean((observation.evidenceAttachmentRef || '').trim());

  const resolvedOutcome: 'accepted' | 'qualified' | 'rejected' | 'blocked' =
    decision.status === 'rejected'
      ? 'rejected'
      : decision.status === 'blocked'
      ? 'blocked'
      : decision.outcome === 'qualified'
      ? 'qualified'
      : 'accepted';

  if (decision.status === 'manually_reviewed') {
    if (!decision.inspectedConfirmed) {
      return { error: 'Confirm that you have inspected the underlying source evidence before marking reviewed.' };
    }
    if (excerptLen < 20 || !hasLocator) {
      return {
        error:
          'A review checkbox alone cannot validate evidence. Retain an exact supporting excerpt (>= 20 chars) and locator/attachment reference.',
      };
    }
    if (trimmedRationale.length < 20) {
      return {
        error:
          'Record a specific reviewer rationale (>= 20 characters) summarizing what this evidence supports and its limitations.',
      };
    }
    if (isResourceHomepageUrl(observation.sourceURL || observation.productURL || '')) {
      return { error: 'Cannot approve an observation pointing only to a resource homepage.' };
    }

    if (decision.requireStructuredChecklist) {
      const establishes = (decision.assessment?.establishes || '').trim();
      const lim = (decision.assessment?.limitationsSummary || '').trim();
      if (establishes.length < 10) {
        return { error: 'Specify what this observation actually establishes (min 10 characters).' };
      }
      if (!decision.assessment?.dateScopeProductMatch) {
        return { error: 'Assess whether the date, ranking/metric scope, and product match your topic.' };
      }
      if (!decision.assessment?.metricNature) {
        return { error: 'Classify whether the key metric is directly observed, reported, or estimated.' };
      }
      if (lim.length < 10) {
        return { error: 'Summarize scope and limitation boundaries for this review (min 10 characters).' };
      }
      if (resolvedOutcome === 'accepted' && decision.assessment.dateScopeProductMatch === 'mismatch') {
        return {
          error:
            'An observation with a date/scope/product mismatch cannot be Accepted without qualification. Choose "Qualify", "Block", or "Reject".',
        };
      }
    }
  } else if ((decision.status === 'blocked' || decision.status === 'rejected') && trimmedRationale.length < 10) {
    return { error: 'Provide a clear reason (>= 10 characters) when blocking or rejecting an observation.' };
  }

  const defaults = inferObservationDefaults(observation);
  // Never relabel manual/import acquisition as live_collector
  const preservedAcquisition: MarketAcquisitionMethod =
    defaults.acquisitionMethod === 'live_collector' &&
    (observation.collector === 'apple-chart-v1' || observation.collector === 'amazon-chart-v1')
      ? 'live_collector'
      : defaults.acquisitionMethod;

  const inferredMetricNature: ObservationReviewAssessment['metricNature'] =
    defaults.evidenceType === 'official_ranking'
      ? 'observed'
      : defaults.evidenceType === 'reported_ranking'
      ? 'reported'
      : 'estimated';

  const normalizedAssessment: ObservationReviewAssessment = {
    establishes:
      (decision.assessment?.establishes || '').trim() ||
      `${defaults.evidenceType.replaceAll('_', ' ')} (${observation.rankScope || observation.category})`,
    dateScopeProductMatch: decision.assessment?.dateScopeProductMatch || 'exact_match',
    metricNature: decision.assessment?.metricNature || inferredMetricNature,
    limitationsSummary: (decision.assessment?.limitationsSummary || observation.dataLimitations || '').trim(),
    liveRetrievalUnavailableDisclosed: Boolean(decision.assessment?.liveRetrievalUnavailableDisclosed),
  };

  const evHash = computeObservationEvidenceHash({
    ...observation,
    publisher: defaults.publisher,
    sourceClass: defaults.sourceClass,
    acquisitionMethod: preservedAcquisition,
    evidenceType: defaults.evidenceType,
  });

  const reviewedAt = new Date().toISOString();
  const nextHistory: ObservationReviewHistoryEntry[] = [
    ...(observation.reviewHistory || []),
    {
      timestamp: reviewedAt,
      status: decision.status,
      outcome: resolvedOutcome,
      rationale: trimmedRationale,
      evidenceVersionHash: evHash,
      establishes: normalizedAssessment.establishes,
    },
  ];

  return {
    observation: {
      ...observation,
      publisher: defaults.publisher,
      sourceClass: defaults.sourceClass,
      acquisitionMethod: preservedAcquisition,
      evidenceType: defaults.evidenceType,
      reviewStatus: decision.status,
      reviewOutcome: decision.status === 'unverified' ? undefined : resolvedOutcome,
      reviewAssessment: normalizedAssessment,
      reviewHistory: nextHistory,
      reviewerRationale: trimmedRationale,
      reviewedAt,
      evidenceVersionHash: evHash,
      reviewedEvidenceHash: decision.status === 'manually_reviewed' ? evHash : undefined,
    },
  };
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell.trim());
      if (row.some((v) => v.length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((v) => v.length > 0)) rows.push(row);
  return rows;
}

const VALID_SOURCE_CLASSES = new Set<MarketSourceClass>([
  'primary_marketplace',
  'secondary_report',
  'supporting_context',
]);

const VALID_EVIDENCE_TYPES = new Set<MarketEvidenceType>([
  'official_ranking',
  'reported_ranking',
  'estimate',
  'interest_signal',
  'search_result',
  'featured_collection',
  'seller_claim',
]);

function mapMarketplaceValue(raw: string): MarketplaceObservation['marketplace'] {
  const val = raw.trim().toLowerCase();
  if (val.includes('amazon')) return 'Amazon Kindle';
  if (val.includes('apple')) return 'Apple Books';
  if (val.includes('nytimes') || val.includes('new york times') || val === 'nyt') return 'NYT Best Sellers';
  if (val.includes('keepa')) return 'Keepa';
  if (val.includes('google trends') || val.includes('trends')) return 'Google Trends';
  if (val.includes('gumroad')) return 'Gumroad';
  if (val.includes('etsy')) return 'Etsy';
  if (val.includes('payhip')) return 'Payhip';
  if (val.includes('kobo')) return 'Kobo';
  if (val.includes('google play')) return 'Google Play Books';
  return 'Other Research Source';
}

export interface ImportPreviewResult {
  fileName: string;
  fileHash: string;
  totalRows: number;
  validRows: MarketplaceObservation[];
  rejectedRows: Array<{ row: number; productTitle?: string; errors: string[] }>;
}

export function previewImportedObservations(
  rawText: string,
  filename: string,
  fileHash?: string
): ImportPreviewResult {
  if (!rawText || rawText.length > MAX_IMPORT_BYTES) {
    throw new Error(`Import payload must be non-empty and under ${MAX_IMPORT_BYTES / 1000} KB.`);
  }

  let rawRecords: Record<string, any>[] = [];
  const lower = filename.toLowerCase();

  if (lower.endsWith('.json') || rawText.trim().startsWith('[') || rawText.trim().startsWith('{')) {
    const parsed = JSON.parse(rawText);
    rawRecords = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.observations)
      ? parsed.observations
      : [];
    if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
      throw new Error('JSON import must contain a non-empty array or { "observations": [...] }.');
    }
  } else {
    const rows = parseCsvRows(rawText);
    if (rows.length < 2) {
      throw new Error('CSV import must contain a header row and at least one data row.');
    }
    const headers = rows[0].map((h) => h.trim());
    rawRecords = rows.slice(1).map((cols) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        if (h) obj[h] = cols[idx] ?? '';
      });
      return obj;
    });
  }

  if (rawRecords.length > MAX_IMPORT_ROWS) {
    throw new Error(`Import exceeds maximum of ${MAX_IMPORT_ROWS} rows per upload.`);
  }

  const effectiveHash =
    fileHash?.trim() || computeObservationEvidenceHash({ evidenceExcerpt: rawText, productTitle: filename });

  const validRows: MarketplaceObservation[] = [];
  const rejectedRows: Array<{ row: number; productTitle?: string; errors: string[] }> = [];

  rawRecords.forEach((rec, idx) => {
    const marketplace = mapMarketplaceValue(String(rec.marketplace || rec.publisher || 'Other'));
    const srcClassRaw = String(rec.sourceClass || rec.source_class || 'supporting_context').trim() as MarketSourceClass;
    const evTypeRaw = String(rec.evidenceType || rec.evidence_type || 'interest_signal').trim() as MarketEvidenceType;

    const draft: ManualEvidenceInput = {
      id: rec.id ? `IMP-${String(rec.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)}` : undefined,
      productTitle: String(rec.productTitle || rec.title || '').trim(),
      publisher: String(rec.publisher || defaultPublisherForMarketplace(marketplace)).trim(),
      sellerOrAuthor: String(rec.sellerOrAuthor || rec.author || rec.publisher || 'Not listed').trim(),
      marketplace,
      country: String(rec.country || 'US').trim(),
      category: String(rec.category || '').trim(),
      productFormat: String(rec.productFormat || rec.format || 'Digital Download').trim(),
      productURL: String(rec.productURL || rec.product_url || '').trim(),
      sourceURL: String(rec.sourceURL || rec.source_url || rec.reportUrl || '').trim(),
      sourceClass: VALID_SOURCE_CLASSES.has(srcClassRaw) ? srcClassRaw : 'supporting_context',
      acquisitionMethod: 'file_import',
      evidenceType: VALID_EVIDENCE_TYPES.has(evTypeRaw) ? evTypeRaw : 'interest_signal',
      observedRank: rec.observedRank || rec.rank ? Number(rec.observedRank || rec.rank) : undefined,
      rankScope: String(rec.rankScope || rec.rank_scope || '').trim() || undefined,
      metricName: String(rec.metricName || rec.metric_name || '').trim() || undefined,
      metricValue: rec.metricValue ?? rec.metric_value ?? undefined,
      metricUnit: String(rec.metricUnit || rec.metric_unit || '').trim() || undefined,
      currentPrice: rec.currentPrice ? Number(rec.currentPrice) : 0,
      currency: String(rec.currency || 'USD').trim(),
      dataAsOfDate: String(rec.dataAsOfDate || rec.data_as_of_date || rec.observedAt || '').trim(),
      publicationDate: String(rec.publicationDate || rec.publication_date || '').trim() || undefined,
      evidenceExcerpt: String(rec.evidenceExcerpt || rec.excerpt || '').trim(),
      excerptLocator: String(rec.excerptLocator || rec.locator || '').trim(),
      evidenceAttachmentRef: filename,
      attachmentHash: effectiveHash,
      importFileName: filename,
      importRowNumber: idx + 1,
      rawImportedPayload: { ...rec },
      collectionMethodology: String(
        rec.collectionMethodology || rec.methodology || `Imported from ${filename}`
      ).trim(),
      keepaProvenance: rec.keepaProvenance || 'not_applicable',
      evidenceChainId: String(rec.evidenceChainId || rec.evidence_chain_id || '').trim() || undefined,
      dataLimitations: String(rec.dataLimitations || rec.limitations || '').trim(),
    };

    const created = createManualObservationRecord(draft, 'file_import');
    if (created.observation) {
      // Force file_import & unverified regardless of any status columns in the uploaded file!
      validRows.push({
        ...created.observation,
        acquisitionMethod: 'file_import',
        reviewStatus: 'unverified',
        reviewOutcome: undefined,
        reviewedAt: undefined,
        reviewerRationale: undefined,
        reviewedEvidenceHash: undefined,
      });
    } else {
      rejectedRows.push({
        row: idx + 1,
        productTitle: draft.productTitle || undefined,
        errors: created.errors,
      });
    }
  });

  return {
    fileName: filename,
    fileHash: effectiveHash,
    totalRows: rawRecords.length,
    validRows,
    rejectedRows,
  };
}

export function parseImportedObservations(
  rawText: string,
  filename: string,
  fileHash?: string
): { imported: MarketplaceObservation[]; rejected: Array<{ row: number; errors: string[] }>; fileHash: string } {
  const preview = previewImportedObservations(rawText, filename, fileHash);
  return {
    imported: preview.validRows,
    rejected: preview.rejectedRows.map(({ row, errors }) => ({ row, errors })),
    fileHash: preview.fileHash,
  };
}

export const SAMPLE_IMPORT_CSV_TEMPLATE = [
  'productTitle,publisher,sellerOrAuthor,marketplace,country,category,productFormat,productURL,sourceURL,sourceClass,evidenceType,observedRank,rankScope,metricName,metricValue,metricUnit,dataAsOfDate,publicationDate,evidenceExcerpt,excerptLocator,collectionMethodology,evidenceChainId,dataLimitations',
  '"Atomic Habits (Combined Print & E-Book Example)","The New York Times","James Clear","NYT Best Sellers","US","Self-Help / Advice, How-To","Print & Ebook","https://www.nytimes.com/books/best-sellers/advice-how-to-and-miscellaneous/","https://www.nytimes.com/books/best-sellers/advice-how-to-and-miscellaneous/","secondary_report","reported_ranking",1,"NYT Advice, How-To & Miscellaneous (Combined Print & E-Book)","Weeks on List",240,"weeks","2026-11-15","2026-11-15","Weekly editorial list entry noting Advice & How-To category persistence across print and ebook editions.","NYT List Entry #1 · Print & E-Book edition note","Manual inspection of dated NYT Best Sellers archive","nyt-advice-2026-11-15","Combined print-and-ebook list does not isolate Kindle or digital-only sales velocity."',
].join('\n');
