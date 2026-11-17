import test from 'node:test';
import assert from 'node:assert/strict';
import { BLANK_PROJECT, DEMO_PROJECT } from '../data/demoProject.ts';
import {
  buildBrandDirectionPrompt,
  buildBriefSynthesisPrompt,
  buildCharterSynthesisPrompt,
  buildOutlineSynthesisPrompt,
  buildWorkbookSuitePrompt,
  extractChapterContinuity,
  parseBrandDirectionResponse,
  parseBriefSynthesisResponse,
  parseCharterSynthesisResponse,
  parseOutlineSynthesisResponse,
  parseWorkbookSuiteResponse,
} from './stageSynthesis.ts';

test('buildBriefSynthesisPrompt & parseBriefSynthesisResponse synthesize 13-field brief safely', () => {
  const project = structuredClone(DEMO_PROJECT);
  const { userPrompt } = buildBriefSynthesisPrompt(project, 'en', 'Focus on busy parents');
  assert.match(userPrompt, /Focus on busy parents/);
  assert.match(userPrompt, /13 Project Brief/);

  const updated = parseBriefSynthesisResponse(
    JSON.stringify({
      projectName: 'The 20-Minute Family Dinner Matrix',
      targetAudience: 'Dual-income parents cooking 5 nights a week',
      problemsSolved: 'Grocery inflation and 6 PM decision fatigue.',
      productIdea: 'Interchangeable pantry matrix + weekly printable prep cards',
      desiredTransformation: 'Cut grocery waste by 30% with 15-minute weeknight assembly',
      brandStyleAndVoice: {
        personality: 'Warm, Practical, Grounded',
        writingVoice: 'Clear kitchen coach',
      },
      constraintsAndExclusions: {
        safetyRules: 'Educational meal organization only; no medical nutrition therapy.',
      },
      recommendedPriceRationale: 'Low friction $12 entry, $24 main guide, $39 full print bundle.',
    }),
    project.intake
  );

  assert.equal(updated.projectName, 'The 20-Minute Family Dinner Matrix');
  assert.equal(updated.brandStyleAndVoice.personality, 'Warm, Practical, Grounded');
  assert.equal(updated.recommendedPrice.rationale, 'Low friction $12 entry, $24 main guide, $39 full print bundle.');
});

test('buildCharterSynthesisPrompt & parseCharterSynthesisResponse align Gate B charter and reset approval', () => {
  const project = structuredClone(DEMO_PROJECT);
  project.charter.isApproved = true;
  const { userPrompt } = buildCharterSynthesisPrompt(project, 'zh');
  assert.match(userPrompt, /Traditional Chinese/);

  const updated = parseCharterSynthesisResponse(
    `\`\`\`json
    {
      "productTitle": "Zero-Waste Family Meal System",
      "subtitle": "5-Base Pantry Matrix & Weekly Prep Playbook",
      "targetAudience": "Busy households aiming to cut food waste",
      "primaryProblemSolved": "Spoiled produce and impulsive takeout",
      "centralPromise": "Cook varied weeknight meals in 20 minutes",
      "signatureFramework": "The 5-Base Pantry Loop",
      "brandVoiceSummary": "Practical, encouraging, step-by-step",
      "structuralPillars": ["Pantry Audit", "5-Base Matrix", "Unit Pricing", "45-Min Batch Prep"],
      "learningObjectives": ["Inventory staples", "Build interchangeable menus", "Track weekly spend", "Repurpose leftovers"],
      "explicitDisclaimers": ["Educational kitchen planning guide only."],
      "companionResourcePlan": ["Meal Matrix Sheet", "Pantry Inventory", "30-Day Tracker"],
      "targetWordCount": 8000
    }
    \`\`\``,
    project.charter
  );

  assert.equal(updated.productTitle, 'Zero-Waste Family Meal System');
  assert.equal(updated.structuralPillars.length, 4);
  assert.equal(updated.targetWordCount, 8000);
  assert.equal(updated.isApproved, false);
});

test('parseOutlineSynthesisResponse normalizes chapters and maps available references', () => {
  const project = structuredClone(DEMO_PROJECT);
  const { userPrompt } = buildOutlineSynthesisPrompt(project, 'en', 'Include batch prep checklist');
  assert.match(userPrompt, /Include batch prep checklist/);

  const chapters = parseOutlineSynthesisResponse(
    JSON.stringify([
      {
        title: 'Chapter 1: Pantry Audit',
        objective: 'Map current staples',
        subtopics: ['Freezer check', 'Staple tiers'],
        targetWordCount: 1600,
        practicalDeliverable: 'Pantry Map PDF',
        completionMilestone: 'All shelves inventoried',
      },
      {
        title: 'Chapter 2: Cross-Utilization',
        objective: 'Link 5 base ingredients',
        subtopics: ['Base proteins', 'Sauce swaps'],
        targetWordCount: 2000,
        practicalDeliverable: 'Weekly Menu Matrix',
        completionMilestone: '5 dinners planned with <18 items',
      },
    ]),
    ['REF-01', 'REF-02']
  );

  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].id, 'CH-01');
  assert.deepEqual(chapters[1].mappedReferenceIds, ['REF-02']);
  assert.equal(chapters[1].completionMilestone, '5 dinners planned with <18 items');
});

test('extractChapterContinuity captures headings into ProductBible without duplicates', () => {
  const project = structuredClone(DEMO_PROJECT);
  const chapter = project.outline[0];
  const nextBible = extractChapterContinuity(
    chapter,
    '## Diagnosing Kitchen Leaks\n\nText here.\n\n### Unit Cost Audits\n\nMore prose.',
    project.productBible
  );
  assert.ok(nextBible.introducedConcepts.includes('Diagnosing Kitchen Leaks'));
  assert.ok(nextBible.introducedConcepts.includes('Unit Cost Audits'));
  assert.ok(nextBible.continuityHandoffNotes.some((n) => n.startsWith(`${chapter.id} (`)));
});

test('buildWorkbookSuitePrompt & parseWorkbookSuiteResponse build valid companion resources >=150 chars', () => {
  const project = structuredClone(DEMO_PROJECT);
  const { userPrompt } = buildWorkbookSuitePrompt(project, 'en', { mode: 'suite' });
  assert.match(userPrompt, /WORKSHEET/);
  assert.match(userPrompt, /CHECKLIST/);

  const longBody =
    '## Weekly Pantry & Menu Planner\n\n| Day | Base Protein | Prep Step | Status |\n|---|---|---|---|\n| Mon | Chicken | Batch roast | [ ] |\n| Tue | Lentils | Simmer base | [ ] |\n\n- [ ] Inventory fridge before shopping\n- [ ] Verify unit prices per serving across 2 store visits.';

  const assets = parseWorkbookSuiteResponse(
    JSON.stringify({
      resources: [
        {
          title: '30-Day Kitchen Execution Workbook',
          category: 'WORKSHEET',
          purpose: 'Track weekly menus and grocery savings',
          instructions: 'Fill columns every Sunday before grocery shopping.',
          completionCriteria: 'Four completed weekly planners logged',
          sampleEntries: ['Week 1: $68 total spend'],
          contentMarkdown: longBody,
        },
        {
          title: 'Quick-Reference Substitution Matrix',
          category: 'TEMPLATE',
          purpose: 'Swap seasonal produce smoothly',
          instructions: 'Pick any equal-tier substitute from the table.',
          completionCriteria: 'Used on 3 dinners',
          sampleEntries: ['Spinach -> Kale or Swiss Chard'],
          contentMarkdown: longBody,
        },
      ],
    })
  );

  assert.equal(assets.length, 2);
  assert.equal(assets[0].category, 'WORKSHEET');
  assert.equal(assets[1].category, 'TEMPLATE');
  assert.ok(assets[0].contentMarkdown.length >= 150);
});

test('buildBrandDirectionPrompt & parseBrandDirectionResponse validate hex colors and allowed fonts', () => {
  const project = structuredClone(BLANK_PROJECT);
  const { userPrompt } = buildBrandDirectionPrompt(project, 'en', 'Warm culinary editorial feel');
  assert.match(userPrompt, /Warm culinary editorial feel/);

  const brand = parseBrandDirectionResponse(
    JSON.stringify({
      profileName: 'Hearth & Table Press',
      primaryHex: '#1b4332',
      secondaryHex: '#2d6a4f',
      accentHex: 'invalid-color',
      neutralBgHex: '#faf9f6',
      fontDisplay: 'Fraunces',
      fontBody: 'UnknownFont',
      coverBrief: 'High-contrast botanical cover with clean centered display typography.',
      manuscriptLayoutNotes: 'Generous 1.75 line height and crisp step tables.',
    }),
    project.brand
  );

  assert.equal(brand.profileName, 'Hearth & Table Press');
  assert.equal(brand.primaryHex, '#1B4332');
  assert.equal(brand.accentHex, project.brand.accentHex); // fell back safely on invalid hex
  assert.equal(brand.fontDisplay, 'Fraunces');
  assert.equal(brand.fontBody, project.brand.fontBody); // fell back safely on disallowed font
});

test('compileStyledHtml enforces font whitelist and renders commercial imprint cover', async () => {
  const { compileStyledHtml } = await import('./styledBook.ts');
  const project = structuredClone(DEMO_PROJECT);
  project.brand.fontDisplay = 'EvilFont;}body{display:none}';
  project.brand.fontBody = 'Source Sans 3';
  project.brand.primaryHex = '#1B4332';

  const html = compileStyledHtml(project);
  assert.ok(!html.includes('EvilFont'));
  assert.ok(!html.includes('body{display:none}'));
  assert.match(html, /--font-display:"Fraunces",Georgia,serif/);
  assert.match(html, /--font-body:"Source Sans 3",system-ui/);
  assert.match(html, /class="cover-promise"/);
  assert.match(html, /Signature Framework/);
});

test('buildLearningBundle includes branded START-HERE portal and storefront-listing.html kit', async () => {
  const { buildLearningBundle } = await import('./learningBundle.ts');
  const project = structuredClone(DEMO_PROJECT);
  project.brand.profileName = 'Obsidian Craft Press';
  project.brand.fontDisplay = 'Playfair Display';

  const { zip, manifest } = await buildLearningBundle(project);
  assert.ok(zip.file('publisher/storefront-listing.html'));
  assert.ok(manifest.some((entry) => entry.path === 'publisher/storefront-listing.html'));

  const startHere = await zip.file('START-HERE.html')!.async('string');
  assert.match(startHere, /Buyer Welcome Portal/);
  assert.match(startHere, /Playfair Display/);
  assert.match(startHere, /publisher\/storefront-listing\.html/);

  const storefront = await zip.file('publisher/storefront-listing.html')!.async('string');
  assert.match(storefront, /Storefront Listing Kit/);
  assert.match(storefront, /3-Tier Commercial Pricing Table/);
});

