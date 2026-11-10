import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOpportunityScore, rankAndBadgeCandidates } from './scoring.ts';
import { validateSevenPartCard, analyzeReferenceLibrary } from './referenceParser.ts';
import { checkStagePrerequisites, calculateOverallProgress } from './workflowEngine.ts';
import { compileManuscriptMarkdown } from './markdownCompiler.ts';
import { deriveSynchronizedCandidates, SAMPLE_OBSERVATIONS } from './marketDiscoveryEngine.ts';
import { TopicCandidate, ReferenceCard, DigitalProductProject } from '../types/project.ts';

test('scoring logic calculates correct rubric total out of 100', () => {
  const breakdown: TopicCandidate['scoreBreakdown'] = {
    demandSignal: 24,       // max 25
    problemUrgency: 14,     // max 15
    competitionEntry: 13,   // max 15
    differentiation: 14,    // max 15
    creatorFit: 9,          // max 10
    audienceReach: 9,       // max 10
    digitalFit: 5,          // max 5
    costRisk: 5,            // max 5
  };
  const total = calculateOpportunityScore(breakdown);
  assert.equal(total, 93);
});

test('rankAndBadgeCandidates assigns BEST_OVERALL and EASIEST_TO_LAUNCH correctly', () => {
  const candidates: TopicCandidate[] = [
    {
      id: 'TOPIC-01',
      title: 'Topic A',
      subtitle: '',
      targetAudience: 'Audience A',
      coreProblem: 'Prob A',
      bigPromise: 'Promise A',
      suggestedFormat: 'ebook_toolkit',
      priceTestRange: { test: 9.99, regular: 14.99, premium: 24.99 },
      marketEvidenceSummary: '',
      competitiveDensity: 'MEDIUM',
      differentiationAngle: '',
      creationComplexity: 'LOW',
      potentialCompanions: [],
      confidenceRating: 'HIGH',
      opportunityScore: 0,
      scoreBreakdown: {
        demandSignal: 25,
        problemUrgency: 15,
        competitionEntry: 14,
        differentiation: 14,
        creatorFit: 9,
        audienceReach: 9,
        digitalFit: 5,
        costRisk: 5,
      },
      recommendationReason: '',
      sourceObservationIds: [],
    },
    {
      id: 'TOPIC-02',
      title: 'Topic B',
      subtitle: '',
      targetAudience: 'Audience B',
      coreProblem: 'Prob B',
      bigPromise: 'Promise B',
      suggestedFormat: 'ebook_toolkit',
      priceTestRange: { test: 7.99, regular: 12.99, premium: 19.99 },
      marketEvidenceSummary: '',
      competitiveDensity: 'LOW',
      differentiationAngle: '',
      creationComplexity: 'LOW',
      potentialCompanions: [],
      confidenceRating: 'HIGH',
      opportunityScore: 0,
      scoreBreakdown: {
        demandSignal: 20,
        problemUrgency: 12,
        competitionEntry: 15, // high ease
        differentiation: 10,
        creatorFit: 10,       // high ease
        audienceReach: 8,
        digitalFit: 5,
        costRisk: 5,          // high ease
      },
      recommendationReason: '',
      sourceObservationIds: [],
    },
  ];

  const ranked = rankAndBadgeCandidates(candidates);
  assert.equal(ranked[0].id, 'TOPIC-01');
  assert.equal(ranked[0].badge, 'BEST_OVERALL');
  assert.equal(ranked[1].id, 'TOPIC-02');
  assert.equal(ranked[1].badge, 'EASIEST_TO_LAUNCH');
});

test('validateSevenPartCard enforces all 7 mandatory sections', () => {
  const completeCard: Partial<ReferenceCard> = {
    title: 'USDA Food Plans: Cost of Food Reports',
    description: '美國農業部發布之四種成本等級家庭膳食預算基準',
    contentOutline: ['Thrifty Food Plan', 'Nutritional adequacy', 'Cost monthly benchmarks'],
    practicalFramework: {
      name: 'USDA Thrifty Tier Allocation Matrix',
      editorialOrigin: '由編輯團隊將 USDA 原始膳食預算數據綜合整理為每週分類採購矩陣',
      actionSteps: ['計算每人每餐基本預算', '設定主副食採購比例', '每月比對官方通膨調整'],
    },
    researchSummary: '本研究提供美國家庭在不同預算層級下的月平均食物支出統計與營養充足度公式...',
    editorialNotes: {
      targetChapters: ['Chapter 1', 'Chapter 2'],
      exerciseSuggestions: ['建立家庭每週食物預算上限'],
      worksheetIntegration: '整合入「每週採購預算表」',
      verificationNotes: '數據依據 USDA 2024 年度最新發布指標',
    },
    brandGuidelines: {
      toneApplication: '專業且具同理心，避免說教',
      visualDirection: '以清晰表格與圓餅圖呈現',
      audienceFraming: '專為忙碌家庭設定無壓力採購標準',
    },
  };

  const result = validateSevenPartCard(completeCard);
  assert.equal(result.isValid, true);
  assert.equal(result.missingSections.length, 0);

  // Missing section
  const incompleteCard = { ...completeCard, researchSummary: '' };
  const invalidResult = validateSevenPartCard(incompleteCard);
  assert.equal(invalidResult.isValid, false);
  assert.ok(invalidResult.missingSections.includes('E. Research Summary (實質研究摘要)'));
});

test('analyzeReferenceLibrary correctly computes verified counts', () => {
  const cards: ReferenceCard[] = [
    {
      id: 'REF-01',
      title: 'T1',
      description: 'D1',
      contentOutline: ['O1'],
      practicalFramework: { name: 'F1', editorialOrigin: 'EO1', actionSteps: ['S1'] },
      researchSummary: 'R1 with substantive length over thirty characters...',
      editorialNotes: { targetChapters: ['C1'], exerciseSuggestions: [], worksheetIntegration: '', verificationNotes: '' },
      brandGuidelines: { toneApplication: 'T', visualDirection: 'V', audienceFraming: 'A' },
      sourceTitle: 'ST1',
      publisherOrOrg: 'USDA',
      sourceURL: 'https://example.com/1',
      retrievedAt: '2026-11-10',
      status: 'VERIFIED_FULL_TEXT',
      qualityScore: 92,
      pillars: ['Budgeting', 'Nutrition'],
      supportedClaims: ['Claim 1'],
      rightsNotes: 'Public domain',
    },
    {
      id: 'REF-02',
      title: 'T2',
      description: 'D2',
      contentOutline: ['O2'],
      practicalFramework: { name: 'F2', editorialOrigin: 'EO2', actionSteps: ['S2'] },
      researchSummary: 'R2 with substantive length over thirty characters...',
      editorialNotes: { targetChapters: ['C2'], exerciseSuggestions: [], worksheetIntegration: '', verificationNotes: '' },
      brandGuidelines: { toneApplication: 'T', visualDirection: 'V', audienceFraming: 'A' },
      sourceTitle: 'ST2',
      publisherOrOrg: 'EPA',
      sourceURL: 'https://example.com/2',
      retrievedAt: '2026-11-10',
      status: 'METADATA_ONLY',
      qualityScore: 65,
      pillars: ['Waste Reduction'],
      supportedClaims: [],
      rightsNotes: 'Public domain',
    },
  ];

  const analysis = analyzeReferenceLibrary(cards);
  assert.equal(analysis.total, 2);
  assert.equal(analysis.verifiedCount, 1);
  assert.equal(analysis.statusCounts.VERIFIED_FULL_TEXT, 1);
  assert.equal(analysis.statusCounts.METADATA_ONLY, 1);
  assert.equal(analysis.coveragePillars['Budgeting'], 1);
  assert.equal(analysis.isTargetReached, false);
});

test('deriveSynchronizedCandidates dynamically evaluates market signals instead of static default', () => {
  const candidates = deriveSynchronizedCandidates(SAMPLE_OBSERVATIONS);
  assert.equal(candidates.length, 5);

  const bestOverall = candidates.find((c) => c.badge === 'BEST_OVERALL');
  assert.ok(bestOverall, 'Should have a BEST_OVERALL candidate');

  // Verify that BEST_OVERALL is determined by market evidence (e.g. Burnout Recovery or Solo Creator Notion OS)
  // and is NOT forced to TOPIC-01 (28-Day Budget Family Meal Plan)
  assert.notEqual(bestOverall.id, 'TOPIC-01', 'Default sample meal plan should not be forced as BEST_OVERALL');
});

test('deriveSynchronizedCandidates prioritizes specific market observation when requested', () => {
  // If user explicitly prioritizes OBS-02 (The Solo Founder OS on Gumroad)
  const candidates = deriveSynchronizedCandidates(SAMPLE_OBSERVATIONS, {
    prioritizedObservationId: 'OBS-02',
  });
  const bestOverall = candidates.find((c) => c.badge === 'BEST_OVERALL');
  assert.ok(bestOverall);
  assert.equal(bestOverall.id, 'TOPIC-02');
  assert.ok(bestOverall.recommendationReason.includes('DIRECTLY SYNCHRONIZED'));
});

