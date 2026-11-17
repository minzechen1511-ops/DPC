import test from 'node:test';
import assert from 'node:assert/strict';
import { BLANK_PROJECT } from '../data/demoProject.ts';
import type { DigitalProductProject } from '../types/project.ts';
import {
  buildTransformationSynthesisPrompt,
  buildUvzSynthesisPrompt,
  parseTitleOptionsResponse,
  parseTransformationSynthesisResponse,
  parseUvzSynthesisResponse,
  summarizeStrategyContext,
} from './strategySynthesis.ts';

function buildSampleProject(): DigitalProductProject {
  const base = structuredClone(BLANK_PROJECT);
  return {
    ...base,
    projectId: 'proj_test_synth',
    name: 'Solo Operator AI Workflow Kit',
    marketResearch: {
      ...base.marketResearch,
      selectedTopicId: 'NICHE-productivity_systems',
      topicCandidates: [
        {
          id: 'NICHE-productivity_systems',
          marketCategory: 'productivity_systems',
          title: 'Solo Operator AI Workflow Kit',
          subtitle: 'Repeatable SOPs and daily triage toolkit',
          targetAudience: 'Busy independent consultants juggling admin & delivery',
          coreProblem: 'Hours lost every week switching between scattered notes and client handoffs',
          bigPromise: 'Save 5 hours weekly with a 1-page repeatable operating system',
          suggestedFormat: 'ebook_toolkit',
          priceTestRange: { test: 15, regular: 29, premium: 49 },
          marketEvidenceSummary: 'Gumroad #6 Notion OS',
          competitiveDensity: 'MEDIUM',
          differentiationAngle: 'Action-first checklists over abstract productivity theory',
          creationComplexity: 'MODERATE',
          potentialCompanions: ['Daily Triage Matrix', 'Client Handoff SOP'],
          confidenceRating: 'MEDIUM',
          opportunityScore: 68,
          scoreBreakdown: {
            demandSignal: 20,
            problemUrgency: 10,
            competitionEntry: 8,
            differentiation: 10,
            creatorFit: 5,
            audienceReach: 5,
            digitalFit: 5,
            costRisk: 5,
          },
          recommendationReason: 'Strong chart rank',
          sourceObservationIds: ['OBS-02'],
        },
      ],
    },
    intake: {
      ...base.intake,
      productIdea: 'Solo Operator AI Workflow Kit',
      targetAudience: 'Busy independent consultants juggling admin & delivery',
      problemsSolved: 'Hours lost every week switching between scattered notes and client handoffs',
      expertise: '10 years building lean operations SOPs',
      desiredTransformation: 'Run client delivery calmly in under 4 admin hours/week',
    },
    uvz: {
      ...base.uvz,
      selectedOptionId: 'UVZ-02',
      positioningOptions: [
        {
          id: 'UVZ-01',
          name: 'All-in-One Notion Bible',
          angle: 'Complete dashboard architecture',
          targetPersona: 'Tech-savvy solo creators',
          promise: 'Centralize every task and SOP',
          pros: 'High perceived value',
          risks: 'Steeper setup curve',
          isRecommended: false,
        },
        {
          id: 'UVZ-02',
          name: 'Zero-Setup Weekend SOP Sprint',
          angle: 'Copy-paste checklists implemented in 48 hours',
          targetPersona: 'Overworked independent consultants',
          promise: 'Cut client onboarding admin in half by Monday',
          pros: 'Fastest time-to-value',
          risks: 'Needs tight scope discipline',
          isRecommended: true,
        },
      ],
    },
  };
}

test('summarizeStrategyContext resolves upstream topic, intake, and selected UVZ option', () => {
  const project = buildSampleProject();
  const summary = summarizeStrategyContext(project, 'en');
  assert.equal(summary.topicTitle, 'Solo Operator AI Workflow Kit');
  assert.equal(summary.targetAudience, 'Overworked independent consultants');
  assert.equal(summary.selectedUvzName, 'UVZ-02: Zero-Setup Weekend SOP Sprint');
  assert.equal(summary.selectedUvzPromise, 'Cut client onboarding admin in half by Monday');
});

test('buildUvzSynthesisPrompt includes language, lens guidance, and custom focus note', () => {
  const project = buildSampleProject();
  const { systemPrompt, userPrompt } = buildUvzSynthesisPrompt(project, 'zh', {
    lens: 'action_toolkit',
    focusNote: '強調週五回顧與報價單範本',
  });
  assert.match(systemPrompt, /Synthesise\.ai/i);
  assert.match(userPrompt, /Traditional Chinese/);
  assert.match(userPrompt, /即開即用實作套件/);
  assert.match(userPrompt, /強調週五回顧與報價單範本/);
  assert.match(userPrompt, /Solo Operator AI Workflow Kit/);
});

test('parseUvzSynthesisResponse normalizes markdown-fenced JSON and assigns UVZ-01..03 IDs', () => {
  const project = buildSampleProject();
  const raw = `\`\`\`json
  {
    "buyerProblems": ["Messy client handoffs", "Forgetting follow-ups"],
    "potentialSolutions": ["1-page intake checklist", "Automated Friday review"],
    "creatorExpertiseFit": "Grounded in 10 years of lean operations consulting.",
    "commercialFeasibility": "High urgency with strong $29-$49 bundle margin.",
    "differentiationOpportunities": ["Built for non-technical consultants", "Zero database tinkering"],
    "positioningOptions": [
      {
        "name": "30-Minute Client Portal",
        "angle": "Fastest onboarding setup",
        "targetPersona": "Solo designers",
        "promise": "Send polished onboarding packets in 10 minutes",
        "pros": "Immediate relief",
        "risks": "Narrower tool scope",
        "isRecommended": false
      },
      {
        "name": "Calm Consultant Operating System",
        "angle": "Weekly rhythm + reusable SOP library",
        "targetPersona": "Retainer consultants",
        "promise": "Recover 5 weekly admin hours",
        "pros": "Strongest retention & bundle fit",
        "risks": "Requires 2-hour initial setup",
        "isRecommended": true
      }
    ]
  }
  \`\`\``;

  const parsed = parseUvzSynthesisResponse(raw, project.uvz);
  assert.equal(parsed.positioningOptions.length, 2);
  assert.equal(parsed.positioningOptions[0].id, 'UVZ-01');
  assert.equal(parsed.positioningOptions[1].id, 'UVZ-02');
  assert.equal(parsed.selectedOptionId, 'UVZ-02');
  assert.equal(parsed.creatorExpertiseFit, 'Grounded in 10 years of lean operations consulting.');
  assert.deepEqual(parsed.differentiationOpportunities, [
    'Built for non-technical consultants',
    'Zero database tinkering',
  ]);
});

test('parseUvzSynthesisResponse throws clear error when JSON or options are missing', () => {
  assert.throws(() => parseUvzSynthesisResponse('No structured json here'), /structured JSON/);
  assert.throws(
    () => parseUvzSynthesisResponse('{"buyerProblems": ["a"], "positioningOptions": []}'),
    /positioning options/
  );
});

test('buildTransformationSynthesisPrompt carries selected UVZ context and supports titlesOnly mode', () => {
  const project = buildSampleProject();
  const full = buildTransformationSynthesisPrompt(project, 'en', {
    lens: 'beginner_playbook',
    focusNote: 'Target coaches transitioning from corporate',
  });
  assert.match(full.userPrompt, /Zero-Setup Weekend SOP Sprint/);
  assert.match(full.userPrompt, /Beginner-Friendly Playbook/);
  assert.match(full.userPrompt, /Target coaches transitioning from corporate/);

  const titlesOnly = buildTransformationSynthesisPrompt(project, 'zh', { titlesOnly: true });
  assert.match(titlesOnly.userPrompt, /titleOptions/);
  assert.doesNotMatch(titlesOnly.userPrompt, /"beforeState"/);
});

test('parseTransformationSynthesisResponse populates Before/Bridge/After subfields and selects recommended title', () => {
  const project = buildSampleProject();
  const raw = JSON.stringify({
    bigPromise: 'Move from ad-hoc firefighting to a calm, checklist-driven solo practice.',
    uniqueSellingProposition: 'Skip complex Notion builds with copy-ready 1-page SOP cards.',
    beforeState: {
      currentPains: ['Rewriting the same client emails weekly', 'Lost project files'],
      anxietiesAndFrustrations: ['Fear of dropping a client deadline'],
      flawedAlternatives: ['Bloated enterprise PM software'],
      dailyDrainCost: '6+ hours every week wasted on preventable admin chaos.',
    },
    bridgeProcess: {
      signatureFrameworkName: 'The 3-Card Operator Loop',
      coreMethodology: 'Audit bottlenecks first, standardize top 3 deliverables, lock a 20-min Friday reset.',
      keyMilestones: ['Audit weekly time leaks', 'Deploy onboarding card', 'Lock Friday review'],
      practicalTools: ['Time-Leak Tracker', 'Scope Guardrail Script'],
      obstacleBypasses: ['No-code templates remove setup procrastination'],
    },
    afterState: {
      tangibleOutcomes: ['Predictable onboarding in 15 minutes', 'Zero missed client handoffs'],
      acquiredCapabilities: ['Repeatable SOP writing'],
      completedDeliverables: ['Personal 5-SOP Vault'],
      measurableMetrics: ['Admin hours reduced below 4 hrs/week'],
    },
    titleOptions: [
      { title: 'The Calm Consultant SOP Kit', subtitle: '48-Hour Client Systems', rationale: 'Direct speed appeal', isRecommended: false },
      { title: 'Zero-Chaos Solo Practice', subtitle: 'Repeatable SOPs & Weekly Checklists', rationale: 'Strongest pain-to-outcome hook', isRecommended: true },
    ],
  });

  const mapped = parseTransformationSynthesisResponse(raw, project.transformationMap);
  assert.equal(mapped.selectedTitleId, 'TITLE-02');
  assert.equal(mapped.titleOptions[1].title, 'Zero-Chaos Solo Practice');
  assert.equal(mapped.bridgeProcess.signatureFrameworkName, 'The 3-Card Operator Loop');
  assert.deepEqual(mapped.beforeState.flawedAlternatives, ['Bloated enterprise PM software']);
  assert.deepEqual(mapped.afterState.measurableMetrics, ['Admin hours reduced below 4 hrs/week']);
  assert.equal(
    mapped.uniqueSellingProposition,
    'Skip complex Notion builds with copy-ready 1-page SOP cards.'
  );
});

test('parseTitleOptionsResponse refreshes title options without overwriting Before/Bridge/After state', () => {
  const project = buildSampleProject();
  const existing = {
    ...project.transformationMap,
    bigPromise: 'Existing promise kept intact',
    bridgeProcess: {
      ...project.transformationMap.bridgeProcess,
      signatureFrameworkName: 'Custom Existing Loop',
    },
  };
  const updated = parseTitleOptionsResponse(
    JSON.stringify({
      titleOptions: [
        { title: 'Fresh Title One', subtitle: 'Sub 1', rationale: 'Hook 1', isRecommended: true },
        { title: 'Fresh Title Two', subtitle: 'Sub 2', rationale: 'Hook 2', isRecommended: false },
      ],
    }),
    existing
  );
  assert.equal(updated.bigPromise, 'Existing promise kept intact');
  assert.equal(updated.bridgeProcess.signatureFrameworkName, 'Custom Existing Loop');
  assert.equal(updated.selectedTitleId, 'TITLE-01');
  assert.equal(updated.titleOptions[0].title, 'Fresh Title One');
});
