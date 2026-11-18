import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { BLANK_PROJECT } from '../data/demoProject.ts';
import type { DigitalProductProject, MarketplaceObservation, ReferenceCard, ResourceAsset } from '../types/project.ts';
import type { ReferenceVerificationReport } from '../types/research.ts';
import { createManualObservationRecord, applyManualReviewDecision } from './manualEvidenceReview.ts';
import { deriveSynchronizedCandidates } from './marketDiscoveryEngine.ts';
import { approveGate, gateIssues, revokeApprovals } from './gatePolicy.ts';
import { calculateOverallProgress, checkStagePrerequisites, computeOutlineStageStatus } from './workflowEngine.ts';
import { chapterResearchFingerprint, sourceFingerprint } from './sourceEvidence.ts';
import { evidencePassages, makeSupportReview, resourceEvidenceDocument } from './citationEvidence.ts';
import { calculateProfitability } from './commercialMath.ts';
import { buildLearningBundle } from './learningBundle.ts';
import { sanitizeProjectForStorage } from './projectStorage.ts';
import { migrateProjectSchema } from './projectMigration.ts';

function makeRetrievedCard(id: string): ReferenceCard {
  const now = new Date().toISOString();
  const url = 'https://europepmc.org/articles/PMC9999001';
  const excerpt =
    'Structured retrieval practice and weekly review checklists improved adult learner task completion from 42% to 78% across 12-week cohorts.';
  const title = 'Structured Execution Workbooks in Adult Productivity Cohorts';
  const author = 'Elena Vance, Marcus Chen';
  const publisher = 'Europe PMC';
  const pubDate = '2024-06-15';
  const doi = '10.1234/dps.2024.9999001';
  const locator = 'Results Table 2, p. 14';

  return {
    id,
    title,
    description: 'Cohort evaluation of structured execution workbooks paired with progress tracking tables.',
    contentOutline: ['Cohort design', 'Weekly checklists', 'Completion results'],
    practicalFramework: {
      name: 'Structured Retrieval Checklist Loop',
      editorialOrigin: 'Synthesis based on retrieved cohort methodology',
      actionSteps: ['Audit baseline commitments', 'Run weekly review checklist', 'Log completion ratio'],
    },
    sourceTitle: title,
    author,
    publisherOrOrg: publisher,
    publicationDate: pubDate,
    doi,
    sourceURL: url,
    researchSummary: 'Controlled cohort tracking completion lift when playbooks pair narrative checklists with tracking tables.',
    verificationQuote: excerpt,
    verificationLocator: locator,
    qualityScore: 92,
    pillars: ['Baseline audit', 'Weekly checklist'],
    supportedClaims: ['Completion rose from 42% to 78% across 12-week cohorts.'],
    rightsNotes: 'Open-access bibliographic & excerpt verification only.',
    status: 'VERIFIED_FULL_TEXT',
    verifiedAt: now,
    retrievedAt: now,
    retrieval: {
      kind: 'full_text',
      provider: 'Europe PMC',
      documentId: 'PMC9999001',
      canonicalUrl: url,
      title,
      authors: ['Elena Vance', 'Marcus Chen'],
      publisher,
      publicationDate: pubDate,
      doi,
      excerpt,
      locator,
      contentHash: crypto.createHash('sha256').update(excerpt).digest('hex'),
      retrievedAt: now,
    },
    editorialNotes: {
      targetChapters: ['ch_1'],
      exerciseSuggestions: ['Weekly completion rate audit'],
      worksheetIntegration: 'Compare baseline week vs week 4 completion percentage',
      verificationNotes: 'Full-text excerpt retrieved from Europe PMC and checked against Table 2.',
    },
    brandGuidelines: {
      toneApplication: 'Measured, transparent academic reporting',
      visualDirection: 'Data table with zero-baseline bar chart',
      audienceFraming: 'Adult knowledge workers',
    },
    chapterRelevance: [],
  };
}

test('End-to-end 14-stage release audit: Gate A->B->C, invalidation, backup/restore, and verified ZIP export', async () => {
  const today = new Date().toISOString().slice(0, 10);

  // Stage 1: Market Research (reviewed multi-source route with 2 independent chains)
  const created1 = createManualObservationRecord(
    {
      marketplace: 'Apple Books',
      publisher: 'Apple Inc.',
      country: 'US',
      category: 'Business & Personal Finance',
      productTitle: 'Weekly Focus Reset Playbook',
      sellerOrAuthor: 'Indie Workflow Press',
      productFormat: 'Ebook + Playbook',
      productURL: 'https://books.apple.com/us/book/weekly-focus-reset/id100001',
      sourceURL: 'https://rss.marketingtools.apple.com/api/v2/us/books/top-paid/25/books.json',
      sourceClass: 'primary_marketplace',
      evidenceType: 'official_ranking',
      collectionMethodology: 'Inspected Apple Books US top-paid feed entry and verified category scope.',
      currentPrice: 19,
      currency: 'USD',
      observedRank: 4,
      rankScope: 'US Top Paid Books #4',
      metricName: 'chart_rank',
      metricValue: '4',
      dataAsOfDate: today,
      evidenceExcerpt: 'Chart entry #4 in US Top Paid Books under Business & Productivity workflows.',
      excerptLocator: 'Apple RSS feed position 4',
      evidenceChainId: 'CHAIN-APPLE-1',
      dataLimitations: 'Chart rank reflects storefront ordering only; unit sales volume is unpublished.',
    },
    'manual_observation'
  );
  assert.deepEqual(created1.errors, []);
  assert.ok(created1.observation);

  const created2 = createManualObservationRecord(
    {
      marketplace: 'Gumroad',
      publisher: 'Gumroad Creator Listing',
      country: 'US',
      category: 'Notion & Solo Founder Systems',
      productTitle: 'Quarterly Reset Workbook Bundle',
      sellerOrAuthor: 'Template Works',
      productFormat: 'Digital Bundle (PDF + CSV)',
      productURL: 'https://gumroad.com/l/quarterly-reset-bundle',
      sourceURL: 'https://gumroad.com/l/quarterly-reset-bundle',
      sourceClass: 'supporting_context',
      evidenceType: 'search_result',
      collectionMethodology: 'Inspected public Gumroad product card header and pricing module.',
      currentPrice: 39,
      currency: 'USD',
      dataAsOfDate: today,
      evidenceExcerpt: 'Listing displays $39 bundle tier with 48 buyer ratings for focus workbook & tracker.',
      excerptLocator: 'Public listing header & price tier box',
      evidenceChainId: 'CHAIN-GUMROAD-2',
      dataLimitations: 'Gumroad public listing confirms listed price and review count only; conversion rate unknown.',
    },
    'manual_observation'
  );
  assert.deepEqual(created2.errors, []);
  assert.ok(created2.observation);

  const review1 = applyManualReviewDecision(created1.observation!, {
    status: 'manually_reviewed',
    outcome: 'accepted',
    inspectedConfirmed: true,
    requireStructuredChecklist: true,
    rationale: 'Verified Apple RSS US top-paid entry and recorded scope limitation on unpublished unit volume.',
    assessment: {
      establishes: 'Top-paid Apple Books chart visibility (#4) in Business & Finance',
      dateScopeProductMatch: 'exact_match',
      metricNature: 'observed',
      limitationsSummary: 'Chart rank does not reveal unit sales volume or conversion rate.',
    },
  });
  const review2 = applyManualReviewDecision(created2.observation!, {
    status: 'manually_reviewed',
    outcome: 'accepted',
    inspectedConfirmed: true,
    requireStructuredChecklist: true,
    rationale: 'Confirmed independent creator pricing benchmark ($39) with public buyer ratings and unknown conversion.',
    assessment: {
      establishes: 'Comparable bundle price anchor ($39) on Gumroad storefront',
      dateScopeProductMatch: 'exact_match',
      metricNature: 'observed',
      limitationsSummary: 'Storefront listing omits traffic volume, refunds, and unit conversion.',
    },
  });
  assert.ok(review1.observation && review2.observation);

  const obsList: MarketplaceObservation[] = [review1.observation!, review2.observation!];
  const candidates = deriveSynchronizedCandidates(obsList);
  assert.ok(candidates.length >= 1);
  const leadCandidate = candidates[0];
  assert.equal(leadCandidate.productSuitability?.creatorFitStatus, 'UNMEASURED');

  // Stage 2: Topic Selection & explicit Gate A approval
  let project: DigitalProductProject = structuredClone(BLANK_PROJECT);
  project.projectId = 'proj_release_audit_14';
  project.name = 'Focus Execution System';
  project.marketResearch.platformEvidence = obsList;
  project.marketResearch.topicCandidates = candidates;
  project.marketResearch.selectedTopicId = leadCandidate.id;

  assert.equal(gateIssues(project, 'gateA').length, 0);
  project = approveGate(project, 'gateA');
  assert.equal(project.workflow.gates.gateA.isApproved, true);

  // Stages 3-5: Project Brief, UVZ, Transformation Map
  project.intake.projectName = 'Focus Execution System';
  project.intake.targetAudience = 'Independent knowledge workers managing weekly project overload';
  project.intake.problemsSolved = 'Fragmented task lists and unfinished weekly execution plans';
  project.intake.desiredTransformation = 'Complete priority weekly milestones consistently using checklists';
  project.uvz.commercialFeasibility = 'Checklist-driven weekly execution sprint paired with tracker CSV';
  project.transformationMap.beforeState.currentPains = ['Unfinished weekly plans', 'Context switching'];
  project.transformationMap.bridgeProcess.signatureFrameworkName = 'Weekly Reset Method';
  project.transformationMap.bridgeProcess.keyMilestones = ['Baseline audit', '3-step sprint', 'Weekly review'];
  project.transformationMap.afterState.tangibleOutcomes = ['Verified weekly deliverable completion'];

  // Stage 6 & 7: Reference Library + Product Charter -> Approve Gate B BEFORE Stage 8 Outline Builder
  const card = makeRetrievedCard('REF-2024-01');
  project.referenceLibrary.cards = [card];
  project.charter = {
    ...project.charter,
    productTitle: 'Focus Execution System',
    subtitle: 'Checklist-Driven Weekly Delivery Playbook',
    targetAudience: project.intake.targetAudience,
    primaryProblemSolved: project.intake.problemsSolved,
    centralPromise: project.intake.desiredTransformation,
    signatureFramework: 'Weekly Reset Method',
    learningObjectives: ['Audit weekly bottlenecks', 'Execute a structured 3-step weekly sprint'],
  };
  project.outline = [];
  assert.equal(checkStagePrerequisites('outline_builder', project).canRun, false);

  // Approve Gate B explicitly before creating an outline
  assert.deepEqual(gateIssues(project, 'gateB'), []);
  project = approveGate(project, 'gateB');
  assert.equal(project.workflow.gates.gateB.isApproved, true);
  assert.equal(checkStagePrerequisites('outline_builder', project).canRun, true);

  // Stage 8: Outline Builder (now unlocked by Gate B) updates outline_builder status & progress
  const progressBeforeOutline = calculateOverallProgress(project);
  const chapter1Base = {
    id: 'ch_1',
    order: 1,
    title: 'Baseline Audit and Weekly Execution Framework',
    objective: 'Identify bottlenecks and run a structured weekly sprint checklist',
    subtopics: ['Step 1: Audit baseline workload', 'Step 2: Run focus sprint checklist', 'Step 3: Review completion ratio'],
    targetWordCount: 220,
    actualWordCount: 0,
    practicalDeliverable: 'Baseline Weekly Reset Sheet',
    mappedReferenceIds: [card.id],
    exampleScenarios: ['Solo consultant balancing client delivery'],
    completionMilestone: '70%+ weekly milestone completion tracked in CSV',
    contentMarkdown: `## Evidence Benchmark Overview

Cohort evidence shows structured retrieval practice and weekly review checklists improved adult learner completion [REF-2024-01].

| Cohort Stage | Completion Rate | Source |
|---|---|---|
| Baseline | 42% | [REF-2024-01] |
| After Weekly Checklists | 78% | [REF-2024-01] |

- Step 1: Audit current open commitments and eliminate duplicate queues.
- Step 2: Schedule two protected execution blocks per week before accepting new work.
- Step 3: Record weekly completion rate and unresolved blockers inside the tracker sheet.

Apply this framework immediately using the companion worksheet so every weekly commitment ends with a measurable deliverable and documented reflection across consecutive cycles. Start each Monday with a five-minute workload triage, confirm that every high-priority deliverable has a scheduled deep-work slot on your calendar, and close Friday with an objective comparison against your planned completion ratio in the spreadsheet tracker. Over two consecutive weekly sprints, inspect where context switching occurred, refine your block estimates using actual logged hours, and document concrete process adjustments inside the reflection column before adding any new project commitments to your queue.`,
    citationReviews: [],
    isCompleted: true,
    isLocked: false,
  };

  project.outline = [chapter1Base];
  project.workflow.stageStatuses.outline_builder = computeOutlineStageStatus(
    project.outline,
    project.referenceLibrary.cards
  );
  assert.equal(project.workflow.stageStatuses.outline_builder, 'COMPLETED');
  assert.ok(calculateOverallProgress(project) > progressBeforeOutline);

  // Gate C must reject chapters missing explicit chapter-level source relevance
  assert.ok(gateIssues(project, 'gateC').some((issue) => issue.includes('relevance to the current chapter objective')));

  card.chapterRelevance = [
    {
      chapterId: chapter1Base.id,
      chapterFingerprint: chapterResearchFingerprint(chapter1Base),
      rationale: 'Supports chapter completion benchmarks and structured weekly checklist table values.',
      reviewedAt: new Date().toISOString(),
    },
  ];

  // Stage 9 & 10: Content Studio & Workbook Studio + Passage-level Citation & Editorial Reviews
  const chPassages = evidencePassages(project.outline[0]);
  project.outline[0].citationReviews = chPassages.map((p) => {
    if (p.referenceIds.includes(card.id)) {
      return makeSupportReview(p, card, 'supports', 'Verified exact Table 2 completion lift excerpt supports this claim.');
    }
    return {
      passageKey: p.key,
      referenceId: '',
      relationship: 'editorial',
      rationale: 'Original practitioner workflow instruction written as an implementation step.',
      reviewedAt: new Date().toISOString(),
    };
  });

  const resource: ResourceAsset = {
    id: 'RES-1',
    title: 'Weekly Reset Tracker',
    category: 'CHECKLIST',
    purpose: 'Track weekly baseline commitments and completion milestones systematically.',
    instructions: 'Open at Monday planning and record Friday actual outcomes before resetting.',
    fieldsOrColumns: ['Deliverable', 'Planned Hours', 'Completed', 'Notes'],
    sampleEntries: ['Ship client brief | 4h | Yes | Clean handoff'],
    contentMarkdown:
      '## Weekly Checklist\n\n- Confirm top 3 deliverables for the sprint week.\n- Log daily block hours and blockers cleanly in the spreadsheet.\n- Review completion percentage and carry forward lessons into next week.',
    completionCriteria: 'All three milestone rows logged and reviewed by Friday.',
    citationReviews: [],
  };
  const resPassages = evidencePassages(resourceEvidenceDocument(resource));
  resource.citationReviews = resPassages.map((p) => ({
    passageKey: p.key,
    referenceId: '',
    relationship: 'editorial' as const,
    rationale: 'Original companion tracker instructions authored for practical workflow execution.',
    reviewedAt: new Date().toISOString(),
  }));
  project.resources = [resource];

  // Stage 11: Quality Assurance & Explicit Gate C Approval
  assert.deepEqual(gateIssues(project, 'gateC'), []);
  project = approveGate(project, 'gateC');
  assert.equal(project.workflow.gates.gateC.isApproved, true);

  // Stage 12 & 13: Brand Design & Pricing/Launch with explicit CAC + assumptions
  project.brand = {
    ...project.brand,
    profileName: 'Focus Press',
    primaryHex: '#0f766e',
  };
  project.pricingReport = {
    introductoryPrice: 15,
    regularPrice: 29,
    bundlePrice: 49,
    currency: 'USD',
    rationale: 'Anchored below $50 productivity cohort toolkits for frictionless entry.',
    marketComparisonSummary: 'Competes with $19 ebooks and $39-$59 creator bundles.',
  };
  const econ = calculateProfitability({
    introductoryPrice: 15,
    regularPrice: 29,
    bundlePrice: 49,
    monthlyVisitors: 2000,
    conversionRatePercent: 2.5,
    bundleSharePercent: 25,
    introSharePercent: 15,
    platformFeePercent: 5,
    fixedFeePerSale: 0.5,
    monthlyOverheadUsd: 100,
    monthlyAcquisitionCostUsd: 250,
  });
  assert.equal(econ.effectiveCacPerSale, 5);

  // Stage 14a: Export without sourceCheck -> must be unapproved Author Review Edition
  const draftBundle = await buildLearningBundle(project);
  const draftStart = await draftBundle.zip.file('START-HERE.html')?.async('string');
  assert.ok(draftStart?.includes('AUTHOR REVIEW EDITION'));
  const draftManifest = JSON.parse((await draftBundle.zip.file('manifest.json')?.async('string')) || '{}');
  assert.equal(draftManifest.reviewed, false);

  // Stage 14b: Export with fresh matching sourceCheck -> Buyer-ready reviewed bundle
  const sourceCheck: ReferenceVerificationReport = {
    valid: true,
    checkedAt: new Date().toISOString(),
    checks: [
      {
        id: card.id,
        valid: true,
        message: 'Verified full-text Europe PMC record matches bibliography & excerpt.',
        sourceFingerprint: sourceFingerprint(card),
      },
    ],
  };
  const readyBundle = await buildLearningBundle(project, sourceCheck);
  const readyManifest = JSON.parse((await readyBundle.zip.file('manifest.json')?.async('string')) || '{}');
  assert.equal(readyManifest.reviewed, true);

  // Verify required bundle files & SHA-256 integrity across every entry in manifest.json
  const expectedFiles = [
    'START-HERE.html',
    'README.txt',
    'book/executive-ebook.html',
    'book/manuscript.md',
    'resources/executive-summary.html',
    'resources/learning-progress.csv',
    'resources/worksheet-1.html',
    'resources/companion-1.html',
    'research/marketplace-evidence.json',
    'research/reading-room.html',
    'research/claim-evidence-matrix.html',
    'publisher/launch-summary.html',
    'publisher/storefront-listing.html',
    'publisher/project-backup.json',
    'review/publication-review.json',
  ];
  for (const path of expectedFiles) {
    assert.ok(readyBundle.zip.file(path), `Missing expected ZIP file: ${path}`);
  }
  for (const entry of readyManifest.files as Array<{ path: string; bytes: number; sha256: string }>) {
    const fileObj = readyBundle.zip.file(entry.path);
    assert.ok(fileObj, `Manifest path missing in ZIP: ${entry.path}`);
    const bytes = await fileObj!.async('uint8array');
    const actualSha = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(bytes.byteLength, entry.bytes);
    assert.equal(actualSha, entry.sha256);
  }

  // Verify book/executive-ebook.html separates data-backed SVG charts from conceptual figures and includes CAC assumptions in launch kit
  const ebookHtml = (await readyBundle.zip.file('book/executive-ebook.html')?.async('string')) || '';
  assert.ok(ebookHtml.includes('class="data-figure"'));
  assert.ok(ebookHtml.includes('Values transcribed from the adjacent manuscript table'));
  assert.ok(ebookHtml.includes('class="process-figure"'));
  assert.ok(ebookHtml.includes('conceptual summary of this section; not measured data'));

  const launchHtml = (await readyBundle.zip.file('publisher/launch-summary.html')?.async('string')) || '';
  assert.ok(launchHtml.includes('Eff. CAC / Sale'));
  assert.ok(launchHtml.includes('Model Assumptions &amp; Commercial Unknowns'));

  // Upstream change invalidation check: editing outline / bible / Gate A must revoke affected downstream gates
  const bibleRevoked = revokeApprovals(project, 'gateC');
  assert.equal(bibleRevoked.workflow.gates.gateA.isApproved, true);
  assert.equal(bibleRevoked.workflow.gates.gateB.isApproved, true);
  assert.equal(bibleRevoked.workflow.gates.gateC.isApproved, false);

  const strategyRevoked = revokeApprovals(project, 'gateB');
  assert.equal(strategyRevoked.workflow.gates.gateA.isApproved, true);
  assert.equal(strategyRevoked.workflow.gates.gateB.isApproved, false);
  assert.equal(strategyRevoked.workflow.gates.gateC.isApproved, false);
  assert.equal(strategyRevoked.charter.isApproved, false);

  const topicRevoked = revokeApprovals(project, 'gateA');
  assert.equal(topicRevoked.workflow.gates.gateA.isApproved, false);
  assert.equal(topicRevoked.workflow.gates.gateB.isApproved, false);
  assert.equal(topicRevoked.workflow.gates.gateC.isApproved, false);

  // Backup export & restore migration check (strips secrets + preserves manually reviewed & live records)
  const backupJson = JSON.stringify(
    sanitizeProjectForStorage({
      ...project,
      aiSettings: {
        ...project.aiSettings,
        apiKey: 'secret-should-strip',
      },
    })
  );
  const restored = migrateProjectSchema(sanitizeProjectForStorage(JSON.parse(backupJson)));
  assert.equal(restored.aiSettings.apiKey, '');
  assert.equal(restored.marketResearch.platformEvidence.length, 2);
  assert.equal(restored.marketResearch.platformEvidence[0].reviewStatus, 'manually_reviewed');
  assert.equal(restored.workflow.gates.gateC.isApproved, true);
});
