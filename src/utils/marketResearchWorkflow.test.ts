import { SYNTHETIC_IMPORT_CSV as SAMPLE_IMPORT_CSV_TEMPLATE } from '../../tests/marketImportFixtures.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import type { MarketplaceObservation } from '../types/project.ts';
import { BLANK_PROJECT } from '../data/demoProject.ts';
import {
  deriveSynchronizedCandidates,
  isCurrentMarketEvidence,
  isGateAQualifiedEvidence,
  isReviewedFallbackEvidence,
  observationCategory,
  propagateTopicToDownstream,
  SAMPLE_OBSERVATIONS,
} from './marketDiscoveryEngine.ts';
import {
  applyManualReviewDecision,
  createManualObservationRecord,
  isPrivateOrInvalidPublicUrl,
  isResourceHomepageUrl,
  parseImportedObservations,
} from './manualEvidenceReview.ts';
import { approveGate, gateIssues, revokeApprovals } from './gatePolicy.ts';
import { buildLearningBundle } from './learningBundle.ts';

function liveAppleFixture(id = '1', category = 'Business', rank = 4): MarketplaceObservation {
  const ts = new Date().toISOString();
  return {
    id: `apple-${id}`,
    marketplace: 'Apple Books',
    category,
    productTitle: `Systems Guide ${id}`,
    sellerOrAuthor: 'Author',
    productURL: `https://books.apple.com/us/book/id${id}`,
    currentPrice: 0,
    priceKnown: false,
    currency: 'USD',
    observedRank: rank,
    rankScope: 'US Apple Books · Top paid',
    productFormat: 'Ebook',
    observedAt: ts,
    dataAsOfDate: ts,
    retrievedAt: ts,
    collector: 'apple-chart-v1',
    acquisitionMethod: 'live_collector',
    sourceClass: 'primary_marketplace',
    evidenceType: 'official_ranking',
    reviewStatus: 'retrieved_checked',
    evidenceLevel: 'VERIFIED_RANKING',
    sourceURL: 'https://rss.marketingtools.apple.com/api/v2/us/books/top-paid/100/books.json',
    evidenceExcerpt: `Position ${rank} in Apple US top-paid chart`,
    excerptLocator: `feed.results[${rank - 1}]`,
    evidenceChainId: `apple-chain-${id}`,
    dataLimitations: 'Chart rank only; no sales volume or revenue.',
    isSample: false,
  };
}

test('4. Homepage URLs and private network URLs are rejected for product observations', () => {
  for (const hp of [
    'https://keepa.com/',
    'https://trends.google.com/trends/',
    'https://www.nytimes.com/books/best-sellers/',
    'https://gumroad.com/discover',
    'https://www.etsy.com/market/digital_downloads',
    'https://payhip.com/marketplace',
    'https://www.amazon.com/',
  ]) {
    assert.equal(isResourceHomepageUrl(hp), true, `Expected homepage rejection for ${hp}`);
  }

  assert.equal(isPrivateOrInvalidPublicUrl('http://127.0.0.1/test').valid, false);
  assert.equal(isPrivateOrInvalidPublicUrl('https://169.254.169.254/latest').valid, false);
  assert.equal(
    isResourceHomepageUrl('https://www.nytimes.com/books/best-sellers/2026/11/15/advice-how-to-and-miscellaneous/'),
    false
  );

  const rejectedHomepageDraft = createManualObservationRecord({
    productTitle: 'Homepage Attempt',
    marketplace: 'Keepa',
    category: 'Business Productivity',
    productFormat: 'Digital Tool',
    sourceURL: 'https://keepa.com/',
    sourceClass: 'secondary_report',
    evidenceType: 'estimate',
    dataAsOfDate: '2026-11-15',
    evidenceExcerpt: 'Valid length excerpt text describing Keepa homepage.',
    excerptLocator: 'Homepage banner',
    collectionMethodology: 'Manual check',
    keepaProvenance: 'historical',
    dataLimitations: 'Homepage has no product data.',
  });
  assert.equal(rejectedHomepageDraft.observation, undefined);
  assert.ok(rejectedHomepageDraft.errors.some((e) => e.includes('homepage')));
});

test('5. Manual & CSV/JSON imports enter Unverified, reject checkbox-only approvals, and never relabel as collector-verified', () => {
  const { imported, rejected } = parseImportedObservations(SAMPLE_IMPORT_CSV_TEMPLATE, 'nyt-sample.csv');
  assert.equal(rejected.length, 0);
  assert.equal(imported.length, 1);
  assert.equal(imported[0].acquisitionMethod, 'file_import');
  assert.equal(imported[0].reviewStatus, 'unverified');
  assert.equal(isCurrentMarketEvidence(imported[0]), false);
  assert.equal(isGateAQualifiedEvidence(imported[0]), false);

  // JSON import with forged "reviewed" fields in payload must still be forced unverified + file_import
  const forgedJson = JSON.stringify([
    {
      productTitle: 'Keepa Historical Tracker Note',
      marketplace: 'Keepa',
      category: 'Personal Finance & Budgeting',
      productFormat: 'Kindle Ebook',
      sourceURL: 'https://keepa.com/#!product/1-B0TEST1234',
      sourceClass: 'secondary_report',
      evidenceType: 'estimate',
      reviewStatus: 'manually_reviewed',
      acquisitionMethod: 'live_collector',
      keepaProvenance: 'estimated',
      dataAsOfDate: '2026-11-15',
      evidenceExcerpt: 'BSR remained between #1,200 and #1,800 across 30 days on Keepa plot.',
      excerptLocator: '30-day Sales Rank graph',
      collectionMethodology: 'Keepa historical plot inspection',
      dataLimitations: 'Estimated BSR plot only; unit sales estimates require subscription API.',
    },
  ]);
  const jsonRes = parseImportedObservations(forgedJson, 'keepa.json');
  assert.equal(jsonRes.imported.length, 1);
  assert.equal(jsonRes.imported[0].reviewStatus, 'unverified');
  assert.equal(jsonRes.imported[0].acquisitionMethod, 'file_import');

  // Checkbox alone without substantive rationale must fail
  const rubberStamp = applyManualReviewDecision(imported[0], {
    status: 'manually_reviewed',
    inspectedConfirmed: true,
    rationale: 'looks good',
  });
  assert.equal(rubberStamp.observation, undefined);

  // Full inspection + rationale succeeds cleanly without relabeling as live_collector
  const approved = applyManualReviewDecision(imported[0], {
    status: 'manually_reviewed',
    inspectedConfirmed: true,
    rationale:
      'Inspected NYT Advice/How-To combined print & ebook archive entry; supports general habit interest context only, not digital-only rank.',
  });
  assert.ok(approved.observation);
  assert.equal(approved.observation.acquisitionMethod, 'file_import');
  assert.equal(approved.observation.reviewStatus, 'manually_reviewed');
  assert.equal(isCurrentMarketEvidence(approved.observation), false);
  assert.equal(isReviewedFallbackEvidence(approved.observation), true);
  assert.equal(isGateAQualifiedEvidence(approved.observation), true);
});

test('6. Fiction and unknown categories are excluded cleanly', () => {
  const romance = liveAppleFixture('f1', 'Books > Fiction > Romance', 1);
  const sciFi = liveAppleFixture('f2', 'Science Fiction & Fantasy', 2);
  const nonFiction = liveAppleFixture('nf1', 'Cookbooks, Food & Wine > Budget Cooking', 5);

  assert.equal(observationCategory(romance), 'other');
  assert.equal(observationCategory(sciFi), 'other');
  assert.equal(observationCategory(nonFiction), 'budget_living');

  const candidates = deriveSynchronizedCandidates([romance, sciFi, nonFiction]);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].marketCategory, 'budget_living');
});

test('7 & 8. NYT secondary report scope preserved, discovery sources cannot get verified badges, and same evidenceChainId deduplicates cleanly', () => {
  const obs1 = createManualObservationRecord({
    productTitle: 'Household Budgeting Trends Article A',
    marketplace: 'NYT Best Sellers',
    category: 'Personal Finance & Budgeting',
    productFormat: 'Combined Print & E-Book',
    sourceURL: 'https://www.nytimes.com/books/best-sellers/2026/11/15/advice-how-to-and-miscellaneous/',
    sourceClass: 'secondary_report',
    evidenceType: 'reported_ranking',
    observedRank: 2,
    rankScope: 'NYT Combined Print & E-Book Advice List',
    dataAsOfDate: '2026-11-15',
    evidenceExcerpt: 'Combined print & ebook list shows steady personal finance handbook ranking at #2.',
    excerptLocator: 'NYT Advice List #2',
    collectionMethodology: 'Manual review of dated NYT list',
    evidenceChainId: 'shared-nyt-study-2026-11-15',
    dataLimitations: 'Combined print and ebook list; not an isolated digital marketplace chart.',
  }).observation!;

  const obs2 = createManualObservationRecord({
    productTitle: 'Secondary Commentary B Citing Same NYT List',
    marketplace: 'Keepa',
    category: 'Personal Finance & Budgeting',
    productFormat: 'Combined Print & E-Book',
    sourceURL: 'https://keepa.com/#!product/1-B0SHARED02',
    sourceClass: 'secondary_report',
    evidenceType: 'reported_ranking',
    observedRank: 2,
    rankScope: 'NYT Combined Print & E-Book Advice List (re-reported)',
    keepaProvenance: 'historical',
    dataAsOfDate: '2026-11-15',
    evidenceExcerpt: 'Re-reports the exact same #2 combined print and ebook list entry without new primary sales proof.',
    excerptLocator: 'Article paragraph 3',
    collectionMethodology: 'Manual secondary cross-reference',
    evidenceChainId: 'shared-nyt-study-2026-11-15',
    dataLimitations: 'Derived from same underlying NYT dataset as obs1.',
  }).observation!;

  const rev1 = applyManualReviewDecision(obs1, {
    status: 'manually_reviewed',
    inspectedConfirmed: true,
    rationale: 'Verified dated NYT combined print & ebook archive entry; reflects editorial list position only.',
  }).observation!;
  const rev2 = applyManualReviewDecision(obs2, {
    status: 'manually_reviewed',
    inspectedConfirmed: true,
    rationale: 'Confirmed second citation shares exact underlying NYT study ID and must collapse cleanly.',
  }).observation!;

  const candidates = deriveSynchronizedCandidates([rev1, rev2]);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].evidenceLabel, 'SECONDARY_REPORTED_RANKING');
  assert.equal(candidates[0].badge, undefined, 'Manual fallback must NEVER receive BEST_OVERALL verified badge');
  assert.equal(candidates[0].evidenceStrength?.collectorVerifiedCount, 0);
  assert.equal(candidates[0].evidenceStrength?.manuallyReviewedCount, 2);
  assert.equal(candidates[0].evidenceStrength?.independentChainCount, 1, 'Shared evidenceChainId must collapse to 1 chain');
  assert.match(candidates[0].evidenceStrength?.scopeFitSummary || '', /combined/i);
});

test('9. Unmeasured rubric dimensions stay UNMEASURED (0) and creator identity is never fabricated', () => {
  const live = liveAppleFixture('s1', 'Computers & Productivity Systems', 3);
  const candidates = deriveSynchronizedCandidates([live]);
  assert.equal(candidates.length, 1);
  const c = candidates[0];

  assert.ok(c.scoreBreakdown.demandSignal > 0);
  assert.equal(c.scoreBreakdown.problemUrgency, 0);
  assert.equal(c.scoreBreakdown.competitionEntry, 0);
  assert.equal(c.scoreBreakdown.differentiation, 0);
  assert.equal(c.scoreBreakdown.creatorFit, 0);
  assert.equal(c.scoreBreakdown.audienceReach, 0);
  assert.equal(c.scoreBreakdown.digitalFit, 0);
  assert.equal(c.scoreBreakdown.costRisk, 0);

  const unmeasuredFactors = (c.factorAssessments || []).filter((f) => f.status === 'UNMEASURED');
  assert.equal(unmeasuredFactors.length, 7);
  assert.equal(c.productSuitability?.creatorFitStatus, 'UNMEASURED');

  // Topic propagation preserves blank creator credentials — never invents expertise or testimonials
  let project = structuredClone(BLANK_PROJECT);
  project.marketResearch.platformEvidence = [live];
  project.marketResearch.topicCandidates = candidates;
  project = propagateTopicToDownstream(project, c.id);
  assert.equal(project.intake.creatorName, '');
  assert.equal(project.intake.relevantExperience, '');
  assert.equal(project.intake.expertise, '');
});

test('10. Sample fixtures excluded; manual reviewed fallback unlocks Gate A; evidence rejection revokes Gate A; exports preserve provenance', async () => {
  // Sample fixtures alone cannot satisfy Gate A
  let project = structuredClone(BLANK_PROJECT);
  project.marketResearch.platformEvidence = SAMPLE_OBSERVATIONS;
  assert.equal(deriveSynchronizedCandidates(project.marketResearch.platformEvidence).length, 0);
  assert.ok(gateIssues(project, 'gateA').length > 0);

  // Reviewed Google Trends interest signal qualifies cleanly for manual fallback Gate A workflow
  const draftSignal = createManualObservationRecord({
    productTitle: 'Solo Productivity Systems Interest Trend',
    marketplace: 'Google Trends',
    category: 'Business Productivity & Notion Workflows',
    productFormat: 'Search Interest Index',
    sourceURL: 'https://trends.google.com/trends/explore?q=notion%20workflow%20templates',
    sourceClass: 'supporting_context',
    evidenceType: 'interest_signal',
    metricName: 'Relative Interest',
    metricValue: 74,
    metricUnit: '0-100 index',
    dataAsOfDate: '2026-11-16',
    evidenceExcerpt: '12-month US query interest for workflow templates remained between 65 and 82.',
    excerptLocator: 'Interest over time chart CSV',
    collectionMethodology: 'Google Trends manual exploration',
    dataLimitations: 'Normalized search interest index only; does not establish sales volume or conversion.',
  }).observation!;

  const reviewedSignal = applyManualReviewDecision(draftSignal, {
    status: 'manually_reviewed',
    inspectedConfirmed: true,
    rationale: 'Inspected Trends CSV export confirming consistent US search attention; still requires buyer willingness validation.',
  }).observation!;

  project.marketResearch.platformEvidence = [reviewedSignal];
  project.marketResearch.topicCandidates = deriveSynchronizedCandidates(project.marketResearch.platformEvidence);
  assert.equal(project.marketResearch.topicCandidates.length, 1);
  project = propagateTopicToDownstream(project, project.marketResearch.topicCandidates[0].id);

  const approved = approveGate(project, 'gateA');
  assert.equal(approved.workflow.gates.gateA.isApproved, true);

  // Upstream evidence rejection revokes Gate A approval
  const rejectedObs = applyManualReviewDecision(reviewedSignal, {
    status: 'rejected',
    inspectedConfirmed: true,
    rationale: 'Re-inspection showed search query included unrelated software.',
  }).observation!;
  const afterRejection = revokeApprovals(
    {
      ...approved,
      marketResearch: {
        ...approved.marketResearch,
        platformEvidence: [rejectedObs],
        topicCandidates: deriveSynchronizedCandidates([rejectedObs]),
      },
    },
    'gateA'
  );
  assert.equal(afterRejection.workflow.gates.gateA.isApproved, false);
  assert.ok(gateIssues(afterRejection, 'gateA').length > 0);

  // Provenance exported cleanly in bundle
  const { zip } = await buildLearningBundle(approved);
  const exportedEvidence = JSON.parse(await zip.file('research/marketplace-evidence.json')!.async('string'));
  assert.equal(exportedEvidence.provenanceSummary.manuallyReviewedCount, 1);
  assert.equal(exportedEvidence.provenanceSummary.liveCollectorCount, 0);
  assert.equal(exportedEvidence.provenanceSummary.sampleCount, 0);
});

test('11. 2-step import preview preserves SHA-256 attachmentHash, row numbers & raw payloads without committing before confirm', async () => {
  const { computeSha256Hex, previewImportedObservations } = await import('./manualEvidenceReview.ts');
  const hash = await computeSha256Hex(SAMPLE_IMPORT_CSV_TEMPLATE);
  const preview = previewImportedObservations(SAMPLE_IMPORT_CSV_TEMPLATE, 'editorial-batch.csv', hash);

  assert.equal(preview.fileName, 'editorial-batch.csv');
  assert.equal(preview.fileHash, hash);
  assert.equal(preview.totalRows, 1);
  assert.equal(preview.validRows.length, 1);
  assert.equal(preview.rejectedRows.length, 0);

  const row = preview.validRows[0];
  assert.equal(row.publisher, 'The New York Times');
  assert.equal(row.importFileName, 'editorial-batch.csv');
  assert.equal(row.importRowNumber, 1);
  assert.equal(row.attachmentHash, hash);
  assert.ok(row.rawImportedPayload && row.rawImportedPayload.productTitle);
  assert.equal(row.acquisitionMethod, 'file_import');
  assert.equal(row.reviewStatus, 'unverified');
});

test('12. Structured 5-part review checklist blocks mismatch acceptance, and editing evidence invalidates prior approval & revokes Gate A', async () => {
  const { editManualObservationRecord, isObservationReviewStale } = await import('./manualEvidenceReview.ts');
  const draft = createManualObservationRecord({
    productTitle: 'Historical Finance Rank Snapshot',
    publisher: 'Keepa',
    marketplace: 'Keepa',
    category: 'Personal Finance & Budgeting',
    productFormat: 'Kindle Ebook',
    sourceURL: 'https://keepa.com/#!product/1-B0HIST0001',
    sourceClass: 'primary_marketplace',
    evidenceType: 'official_ranking',
    observedRank: 8,
    rankScope: 'Amazon Kindle Personal Finance (2025 historical curve)',
    keepaProvenance: 'historical',
    dataAsOfDate: '2025-10-01',
    evidenceExcerpt: 'Historical rank trace stayed between #5 and #12 during October 2025 snapshot window.',
    excerptLocator: 'Keepa Oct 2025 CSV export Row 4',
    collectionMethodology: 'Manual Keepa historical CSV inspection',
    dataLimitations: 'Historical October 2025 data only; does not establish current bestseller status.',
  }).observation!;

  // Mismatch cannot be accepted via structured checklist
  const mismatchBlocked = applyManualReviewDecision(draft, {
    status: 'manually_reviewed',
    outcome: 'accepted',
    inspectedConfirmed: true,
    requireStructuredChecklist: true,
    assessment: {
      establishes: 'Historical oct 2025 chart position in personal finance.',
      dateScopeProductMatch: 'mismatch',
      metricNature: 'observed',
      limitationsSummary: 'Historical 2025 archive does not show current performance.',
    },
    rationale: 'Checked Oct 2025 Keepa curve; clearly aged and cannot prove current bestseller rank.',
  });
  assert.equal(mismatchBlocked.observation, undefined);

  // Qualify succeeds and records reviewHistory + hash
  const qualified = applyManualReviewDecision(draft, {
    status: 'manually_reviewed',
    outcome: 'qualified',
    inspectedConfirmed: true,
    requireStructuredChecklist: true,
    assessment: {
      establishes: 'Historical 2025 topic durability for household finance guides.',
      dateScopeProductMatch: 'partial_scope_match',
      metricNature: 'observed',
      limitationsSummary: 'Aged archive (>14 days) and historical Keepa trace; never a current bestseller badge.',
      liveRetrievalUnavailableDisclosed: true,
    },
    rationale: 'Qualified as historical context signal only; aged archive cannot earn current bestseller badge.',
  }).observation!;

  assert.equal(qualified.reviewOutcome, 'qualified');
  assert.equal(qualified.reviewHistory?.length, 1);
  assert.equal(isObservationReviewStale(qualified), false);

  // Historical observation must NEVER produce CURRENT_OFFICIAL_CHART or current bestseller badge
  const histCandidates = deriveSynchronizedCandidates([qualified]);
  assert.equal(histCandidates.length, 1);
  assert.notEqual(histCandidates[0].evidenceLabel, 'CURRENT_OFFICIAL_CHART');
  assert.equal(histCandidates[0].badge, undefined);
  assert.match(histCandidates[0].evidenceStrength?.recencySummary || '', /historical/i);

  // Simulate post-approval edit through editManualObservationRecord -> resets to unverified + records invalidated history
  let proj = structuredClone(BLANK_PROJECT);
  proj.marketResearch.platformEvidence = [qualified];
  proj.marketResearch.topicCandidates = histCandidates;
  proj = propagateTopicToDownstream(proj, histCandidates[0].id);
  proj = approveGate(proj, 'gateA');
  assert.equal(proj.workflow.gates.gateA.isApproved, true);

  const edited = editManualObservationRecord(qualified, {
    productTitle: qualified.productTitle,
    publisher: qualified.publisher,
    sellerOrAuthor: qualified.sellerOrAuthor,
    marketplace: qualified.marketplace,
    country: qualified.country,
    category: qualified.category,
    productFormat: qualified.productFormat,
    sourceURL: qualified.sourceURL!,
    sourceClass: 'primary_marketplace',
    evidenceType: 'official_ranking',
    observedRank: 18,
    rankScope: qualified.rankScope,
    keepaProvenance: 'historical',
    dataAsOfDate: '2025-10-02',
    evidenceExcerpt: 'Updated excerpt showing historical rank slipped to #18 in follow-up export.',
    excerptLocator: 'Keepa Oct 2025 CSV export Row 5',
    collectionMethodology: qualified.collectionMethodology!,
    dataLimitations: qualified.dataLimitations,
  }).observation!;

  assert.equal(edited.reviewStatus, 'unverified');
  assert.equal(edited.reviewHistory?.length, 2);
  assert.equal(edited.reviewHistory?.[1].outcome, 'invalidated');
  assert.equal(isGateAQualifiedEvidence(edited), false);

  // Also test raw tampered observation triggering stale detection in gateIssues
  const tampered: MarketplaceObservation = { ...qualified, observedRank: 99, evidenceExcerpt: 'Tampered excerpt text after approval signature' };
  assert.equal(isObservationReviewStale(tampered), true);
  assert.equal(isReviewedFallbackEvidence(tampered), false);
  const tamperedProj = {
    ...proj,
    marketResearch: { ...proj.marketResearch, platformEvidence: [tampered] },
  };
  assert.ok(gateIssues(tamperedProj, 'gateA').some((m) => /stale/i.test(m)));
});

test('13. Multi-source comparison matrix handles corroborating, complementary, contradictory, duplicate-chain records & enforces multiSourceStatus', async () => {
  const { compareCandidateEvidence } = await import('./marketDiscoveryEngine.ts');
  const liveApple = liveAppleFixture('ms1', 'Business & Productivity Systems', 5);
  const liveDuplicate = { ...liveApple, id: 'apple-ms1-dup', productTitle: 'Duplicate Copy Same Chain' };

  const trendsObs = createManualObservationRecord({
    productTitle: 'Notion SOP Templates US Search Interest',
    publisher: 'Google Trends',
    marketplace: 'Google Trends',
    category: 'Business Productivity Systems',
    productFormat: 'Search Interest Index',
    sourceURL: 'https://trends.google.com/trends/explore?q=notion%20sop%20templates',
    sourceClass: 'supporting_context',
    evidenceType: 'interest_signal',
    metricName: 'Relative Search Index',
    metricValue: 81,
    metricUnit: '0-100 index',
    dataAsOfDate: new Date().toISOString().slice(0, 10),
    evidenceExcerpt: 'Relative US search interest remained above 70 across 2026.',
    excerptLocator: 'Google Trends interest curve',
    collectionMethodology: 'Manual Google Trends inspection',
    evidenceChainId: 'gtrends-sop-2026',
    dataLimitations: 'Search attention index only; does not establish unit purchases.',
  }).observation!;
  const reviewedTrends = applyManualReviewDecision(trendsObs, {
    status: 'manually_reviewed',
    outcome: 'qualified',
    inspectedConfirmed: true,
    rationale: 'Reviewed Google Trends interest curve complementing Apple chart category visibility.',
  }).observation!;

  const rejectedContra = applyManualReviewDecision(
    createManualObservationRecord({
      productTitle: 'Conflicting Overstated Claim Listing',
      publisher: 'Gumroad',
      marketplace: 'Gumroad',
      category: 'Business Productivity Systems',
      productFormat: 'Notion Template',
      sourceURL: 'https://gumroad.com/l/example-prod-claim',
      sourceClass: 'supporting_context',
      evidenceType: 'featured_collection',
      dataAsOfDate: new Date().toISOString().slice(0, 10),
      evidenceExcerpt: 'Creator page claims massive unverified demand without transparent sales data.',
      excerptLocator: 'Listing header',
      collectionMethodology: 'Manual Gumroad inspection',
      evidenceChainId: 'gumroad-contra-1',
      dataLimitations: 'Unsubstantiated creator claims.',
    }).observation!,
    {
      status: 'rejected',
      outcome: 'rejected',
      inspectedConfirmed: true,
      rationale: 'Rejected contradictory seller claim due to missing verifiable demand evidence.',
    }
  ).observation!;

  const all = [liveApple, liveDuplicate, reviewedTrends, rejectedContra];
  const comp = compareCandidateEvidence(all, 'productivity_systems');
  assert.equal(comp.multiSourceStatus, 'REVIEWED_MULTI_SOURCE');
  assert.equal(comp.qualifiedChainIds.length, 2);

  const dupRow = comp.evidenceComparison.find((r) => r.observationId === 'apple-ms1-dup')!;
  const trendsRow = comp.evidenceComparison.find((r) => r.observationId === reviewedTrends.id)!;
  const contraRow = comp.evidenceComparison.find((r) => r.observationId === rejectedContra.id)!;

  assert.equal(dupRow.relationship, 'duplicates_dataset');
  assert.equal(trendsRow.relationship, 'complements');
  assert.match(trendsRow.cannotEstablish, /unit sales/i);
  assert.equal(contraRow.relationship, 'excluded');
  assert.equal(contraRow.reviewState, 'rejected_blocked');

  // Single-chain only -> SINGLE_SOURCE
  const singleComp = compareCandidateEvidence([liveApple, liveDuplicate], 'productivity_systems');
  assert.equal(singleComp.multiSourceStatus, 'SINGLE_SOURCE');

  // Unverified only -> NEEDS_EVIDENCE
  const needsComp = compareCandidateEvidence([trendsObs], 'productivity_systems');
  assert.equal(needsComp.multiSourceStatus, 'NEEDS_EVIDENCE');
});

test('14. Audience-topic hypothesis selection propagates chosen angle cleanly without inventing creator credentials', () => {
  const live = liveAppleFixture('ah1', 'Business Productivity Systems', 2);
  const candidates = deriveSynchronizedCandidates([live]);
  const c = candidates[0];
  assert.ok(c.audienceTopicHypotheses && c.audienceTopicHypotheses.length >= 2);

  const secondHyp = c.audienceTopicHypotheses[1];
  let project = structuredClone(BLANK_PROJECT);
  project.marketResearch.platformEvidence = [live];
  project.marketResearch.topicCandidates = candidates;
  project = propagateTopicToDownstream(project, c.id, 'en', secondHyp.id);

  assert.equal(project.intake.targetAudience, secondHyp.audienceLabel);
  assert.equal(project.charter.targetAudience, secondHyp.audienceLabel);
  assert.equal(project.intake.expertise, '');
  assert.equal(project.intake.creatorName, '');
});

test('15. Legacy project migration preserves live/manual/import observations, attachment hashes & Gate B cards while quarantining OBS-01..05 demos', async () => {
  const { migrateProjectSchema } = await import('./projectMigration.ts');
  const legacyPayload = {
    schemaVersion: '3.0',
    projectId: 'proj_legacy_1',
    name: 'Legacy Workspace',
    preferences: { automationMode: 'selection_autopilot', autoApproveNonCritical: true },
    marketResearch: {
      platformEvidence: [
        {
          id: 'OBS-01',
          marketplace: 'Amazon Kindle',
          category: 'Cookbooks',
          productTitle: 'Sample Cookbook',
          sellerOrAuthor: 'Demo Author',
          productURL: 'https://www.amazon.com/s?k=demo',
          currentPrice: 9.99,
          currency: 'USD',
          observedRank: 4,
          productFormat: 'Kindle',
          observedAt: '2026-11-01',
          evidenceLevel: 'VERIFIED_RANKING',
          dataLimitations: 'Illustrative sample fixture only.',
        },
        {
          id: 'MAN-REAL-1',
          marketplace: 'NYT Best Sellers',
          category: 'Personal Finance',
          productTitle: 'Real Manual NYT Note',
          sellerOrAuthor: 'Author A',
          productURL: 'https://www.nytimes.com/books/best-sellers/2026/11/15/advice-how-to-and-miscellaneous/',
          sourceURL: 'https://www.nytimes.com/books/best-sellers/2026/11/15/advice-how-to-and-miscellaneous/',
          currentPrice: 0,
          currency: 'USD',
          productFormat: 'Print & Ebook',
          observedAt: '2026-11-15',
          dataAsOfDate: '2026-11-15',
          evidenceExcerpt: 'Explicit real manual observation preserved during schema upgrade.',
          excerptLocator: 'Advice List #3',
          attachmentHash: 'sha256_preserved_hash',
          acquisitionMethod: 'file_import',
          reviewStatus: 'manually_reviewed',
          reviewedAt: '2026-11-16T00:00:00.000Z',
          reviewerRationale: 'Verified real NYT archive entry retained across migration.',
          evidenceLevel: 'PUBLIC_MARKET_INDEX',
          dataLimitations: 'Combined print and ebook list.',
        },
      ],
    },
    referenceLibrary: {
      cards: [{ id: 'REF-01', sourceTitle: 'Academic Paper' }],
    },
  };

  const migrated = migrateProjectSchema(legacyPayload);
  assert.equal(migrated.schemaVersion, '4.0');
  assert.equal(migrated.preferences.automationMode, 'manual_review');
  assert.equal(migrated.preferences.autoApproveNonCritical, false);
  assert.equal(migrated.marketResearch.resourceDirectory?.length, 10);
  assert.equal(migrated.referenceLibrary.cards.length, 1);

  const obsSample = migrated.marketResearch.platformEvidence.find((o) => o.id === 'OBS-01')!;
  const obsReal = migrated.marketResearch.platformEvidence.find((o) => o.id === 'MAN-REAL-1')!;
  assert.equal(obsSample.isSample, true);
  assert.equal(obsSample.reviewStatus, 'unverified');
  assert.equal(obsReal.isSample, false);
  assert.equal(obsReal.attachmentHash, 'sha256_preserved_hash');
  assert.equal(obsReal.acquisitionMethod, 'file_import');
  assert.equal(obsReal.reviewStatus, 'unverified');
  assert.equal(obsReal.reviewedEvidenceHash, undefined);
  assert.ok(obsReal.reviewedAt, 'Preserve the legacy decision without manufacturing a new one');
});

