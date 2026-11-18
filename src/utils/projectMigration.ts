import type { DigitalProductProject, MarketplaceObservation } from '../types/project.ts';
import { BLANK_PROJECT } from '../data/demoProject.ts';
import { mergeResourceDirectory } from './marketResourceDirectory.ts';
import {
  computeObservationEvidenceHash,
  defaultPublisherForMarketplace,
  inferObservationDefaults,
} from './manualEvidenceReview.ts';

function isLegacySampleFixture(obs: Partial<MarketplaceObservation>): boolean {
  if (obs.isSample) return true;
  if (
    /^OBS-0[1-5]$/.test(String(obs.id || '')) &&
    !obs.collector &&
    obs.acquisitionMethod !== 'file_import' &&
    !obs.reviewedAt
  ) {
    return true;
  }
  if (/illustrative sample fixture only|sample data only/i.test(String(obs.dataLimitations || ''))) {
    return true;
  }
  return false;
}

export function migrateObservationRecord(rawObs: Partial<MarketplaceObservation>): MarketplaceObservation {
  const base: MarketplaceObservation = {
    evidenceCapture: rawObs.evidenceCapture,
    id: String(rawObs.id || `OBS-${Date.now()}`),
    marketplace: rawObs.marketplace || 'Other Research Source',
    publisher: rawObs.publisher,
    country: rawObs.country || 'US',
    category: String(rawObs.category || 'General'),
    productTitle: String(rawObs.productTitle || 'Untitled observation'),
    sellerOrAuthor: String(rawObs.sellerOrAuthor || 'Not listed'),
    productURL: String(rawObs.productURL || rawObs.sourceURL || ''),
    sourceURL: rawObs.sourceURL,
    currentPrice: Number.isFinite(Number(rawObs.currentPrice)) ? Number(rawObs.currentPrice) : 0,
    priceKnown: rawObs.priceKnown,
    currency: String(rawObs.currency || 'USD'),
    observedRank: rawObs.observedRank,
    rankScope: rawObs.rankScope,
    metricName: rawObs.metricName,
    metricValue: rawObs.metricValue,
    metricUnit: rawObs.metricUnit,
    reviewCount: rawObs.reviewCount,
    rating: rawObs.rating,
    productFormat: String(rawObs.productFormat || 'Digital Product'),
    observedAt: String(rawObs.observedAt || rawObs.dataAsOfDate || new Date().toISOString().slice(0, 10)),
    dataAsOfDate: rawObs.dataAsOfDate || rawObs.observedAt,
    publicationDate: rawObs.publicationDate,
    retrievedAt: rawObs.retrievedAt,
    evidenceExcerpt: rawObs.evidenceExcerpt,
    excerptLocator: rawObs.excerptLocator,
    evidenceAttachmentRef: rawObs.evidenceAttachmentRef,
    attachmentHash: rawObs.attachmentHash,
    importFileName: rawObs.importFileName,
    importRowNumber: rawObs.importRowNumber,
    rawImportedPayload: rawObs.rawImportedPayload,
    collectionMethodology: rawObs.collectionMethodology,
    keepaProvenance: rawObs.keepaProvenance,
    evidenceChainId: rawObs.evidenceChainId,
    evidenceVersionHash: rawObs.evidenceVersionHash,
    reviewedEvidenceHash: rawObs.reviewedEvidenceHash,
    sourceClass: rawObs.sourceClass,
    acquisitionMethod: rawObs.acquisitionMethod,
    evidenceType: rawObs.evidenceType,
    reviewStatus: rawObs.reviewStatus,
    reviewOutcome: rawObs.reviewOutcome,
    reviewAssessment: rawObs.reviewAssessment,
    reviewHistory: Array.isArray(rawObs.reviewHistory) ? [...rawObs.reviewHistory] : undefined,
    reviewerRationale: rawObs.reviewerRationale,
    reviewedAt: rawObs.reviewedAt,
    evidenceLevel: rawObs.evidenceLevel || 'SEARCH_RESULT',
    dataLimitations: String(rawObs.dataLimitations || 'Limitations not specified; inspect source before relying on record.'),
    collector: rawObs.collector,
    isSample: rawObs.isSample,
  };

  if (isLegacySampleFixture(base)) {
    return {
      ...base,
      publisher: base.publisher || defaultPublisherForMarketplace(base.marketplace),
      isSample: true,
      reviewStatus: 'unverified',
      acquisitionMethod: 'manual_observation',
      evidenceType: 'search_result',
      sourceClass: 'supporting_context',
      evidenceLevel: 'SEARCH_RESULT',
      dataLimitations: 'Sample data only; product, rank, price, and reviews are not live-verified observations.',
    };
  }

  const defaults = inferObservationDefaults(base);
  const normalized: MarketplaceObservation = {
    ...base,
    isSample: false,
    publisher: base.publisher || defaults.publisher,
    sourceClass: defaults.sourceClass,
    acquisitionMethod: defaults.acquisitionMethod,
    evidenceType: defaults.evidenceType,
    reviewStatus: defaults.reviewStatus,
    evidenceChainId: base.evidenceChainId || base.id,
  };

  const currentHash = computeObservationEvidenceHash(normalized);
  normalized.evidenceVersionHash = currentHash;

  // Migration is not a review action. Keep original material/history, but require
  // a fresh explicit review when the prior decision did not bind its evidence.
  if (
    !normalized.reviewedEvidenceHash &&
    normalized.reviewStatus === 'manually_reviewed' &&
    normalized.reviewedAt
  ) {
    normalized.reviewStatus = 'unverified';
  }

  return normalized;
}

/**
 * Safely migrates legacy or imported DigitalProductProject payloads to current schema
 * without erasing live collector records, manual observations, file imports, attachment hashes,
 * or Gate B reference cards. Legacy sample fixtures (OBS-01..05) are quarantined as isSample: true.
 */
export function migrateProjectSchema(raw: any): DigitalProductProject {
  const baseline = structuredClone(BLANK_PROJECT);
  const input = raw && typeof raw === 'object' ? raw : {};

  const rawObs: Partial<MarketplaceObservation>[] = Array.isArray(input.marketResearch?.platformEvidence)
    ? input.marketResearch.platformEvidence
    : [];

  const migratedObservations = rawObs.map(migrateObservationRecord);
  const mergedDirectory = mergeResourceDirectory(input.marketResearch?.resourceDirectory);

  const automationMode =
    input.preferences?.automationMode === 'guided_until_gate' ? 'guided_until_gate' : 'manual_review';

  return {
    ...baseline,
    ...input,
    schemaVersion: '4.0',
    projectId: String(input.projectId || baseline.projectId),
    name: String(input.name || input.charter?.productTitle || baseline.name),
    createdAt: String(input.createdAt || baseline.createdAt),
    updatedAt: String(input.updatedAt || new Date().toISOString()),
    preferences: {
      ...baseline.preferences,
      ...(input.preferences || {}),
      automationMode,
      autoApproveNonCritical: false,
    },
    workflow: {
      ...baseline.workflow,
      ...(input.workflow || {}),
      isAutopilotRunning: false,
      stageStatuses: {
        ...baseline.workflow.stageStatuses,
        ...(input.workflow?.stageStatuses || {}),
      },
      gates: {
        gateA: { ...baseline.workflow.gates.gateA, ...(input.workflow?.gates?.gateA || {}) },
        gateB: { ...baseline.workflow.gates.gateB, ...(input.workflow?.gates?.gateB || {}) },
        gateC: { ...baseline.workflow.gates.gateC, ...(input.workflow?.gates?.gateC || {}) },
      },
    },
    marketResearch: {
      ...baseline.marketResearch,
      ...(input.marketResearch || {}),
      resourceDirectory: mergedDirectory,
      platformEvidence: migratedObservations,
      topicCandidates: Array.isArray(input.marketResearch?.topicCandidates)
        ? input.marketResearch.topicCandidates
        : [],
    },
    referenceLibrary: {
      ...baseline.referenceLibrary,
      ...(input.referenceLibrary || {}),
      cards: Array.isArray(input.referenceLibrary?.cards) ? input.referenceLibrary.cards : [],
    },
  };
}
