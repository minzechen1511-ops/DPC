import type {
  MarketAcquisitionMethod,
  MarketEvidenceType,
  MarketplaceObservation,
  MarketReviewStatus,
  MarketSourceClass,
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

  return { sourceClass, acquisitionMethod, evidenceType, reviewStatus };
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

  const observation: MarketplaceObservation = {
    id: input.id?.trim() || `MAN-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    marketplace: input.marketplace,
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

  return { observation, errors: [] };
}

export function applyManualReviewDecision(
  observation: MarketplaceObservation,
  decision: {
    status: 'manually_reviewed' | 'blocked' | 'rejected' | 'unverified';
    rationale: string;
    inspectedConfirmed: boolean;
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

  return {
    observation: {
      ...observation,
      sourceClass: defaults.sourceClass,
      acquisitionMethod: preservedAcquisition,
      evidenceType: defaults.evidenceType,
      reviewStatus: decision.status,
      reviewerRationale: trimmedRationale,
      reviewedAt: new Date().toISOString(),
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

export function parseImportedObservations(
  rawText: string,
  filename: string
): { imported: MarketplaceObservation[]; rejected: Array<{ row: number; errors: string[] }> } {
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

  const imported: MarketplaceObservation[] = [];
  const rejected: Array<{ row: number; errors: string[] }> = [];

  rawRecords.forEach((rec, idx) => {
    const srcClassRaw = String(rec.sourceClass || rec.source_class || 'supporting_context').trim() as MarketSourceClass;
    const evTypeRaw = String(rec.evidenceType || rec.evidence_type || 'interest_signal').trim() as MarketEvidenceType;

    const draft: ManualEvidenceInput = {
      id: rec.id ? `IMP-${String(rec.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)}` : undefined,
      productTitle: String(rec.productTitle || rec.title || '').trim(),
      sellerOrAuthor: String(rec.sellerOrAuthor || rec.publisher || rec.author || 'Not listed').trim(),
      marketplace: mapMarketplaceValue(String(rec.marketplace || rec.publisher || 'Other')),
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
      collectionMethodology: String(
        rec.collectionMethodology || rec.methodology || `Imported from ${filename}`
      ).trim(),
      keepaProvenance: rec.keepaProvenance || 'not_applicable',
      evidenceChainId: String(rec.evidenceChainId || rec.evidence_chain_id || '').trim() || undefined,
      dataLimitations: String(
        rec.dataLimitations || rec.limitations || ''
      ).trim(),
    };

    const created = createManualObservationRecord(draft, 'file_import');
    if (created.observation) {
      // Force file_import & unverified regardless of any status columns in the uploaded file!
      imported.push({
        ...created.observation,
        acquisitionMethod: 'file_import',
        reviewStatus: 'unverified',
        reviewedAt: undefined,
        reviewerRationale: undefined,
      });
    } else {
      rejected.push({ row: idx + 1, errors: created.errors });
    }
  });

  return { imported, rejected };
}

export const SAMPLE_IMPORT_CSV_TEMPLATE = [
  'productTitle,sellerOrAuthor,marketplace,country,category,productFormat,productURL,sourceURL,sourceClass,evidenceType,observedRank,rankScope,metricName,metricValue,metricUnit,dataAsOfDate,publicationDate,evidenceExcerpt,excerptLocator,collectionMethodology,evidenceChainId,dataLimitations',
  '"Atomic Habits (Combined Print & E-Book Example)","James Clear","NYT Best Sellers","US","Self-Help / Advice, How-To","Print & Ebook","https://www.nytimes.com/books/best-sellers/advice-how-to-and-miscellaneous/","https://www.nytimes.com/books/best-sellers/advice-how-to-and-miscellaneous/","secondary_report","reported_ranking",1,"NYT Advice, How-To & Miscellaneous (Combined Print & E-Book)","Weeks on List",240,"weeks","2026-11-15","2026-11-15","Weekly editorial list entry noting Advice & How-To category persistence across print and ebook editions.","NYT List Entry #1 · Print & E-Book edition note","Manual inspection of dated NYT Best Sellers archive","nyt-advice-2026-11-15","Combined print-and-ebook list does not isolate Kindle or digital-only sales velocity."',
].join('\n');
