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
  SAMPLE_IMPORT_CSV_TEMPLATE,
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
