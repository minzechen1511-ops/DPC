import type {
  ChapterOutlineItem,
  DigitalProductProject,
  ProductBible,
  ProductCharter,
  ProjectIntake,
  ResourceAsset,
} from '../types/project.ts';
import type { Language } from './i18n.ts';
import { summarizeStrategyContext } from './strategySynthesis.ts';

function extractJsonObject(rawContent: string): Record<string, any> {
  const raw = String(rawContent || '').trim();
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response did not contain a structured JSON object.');
  }
  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI response returned an unexpected JSON shape.');
  }
  return parsed as Record<string, any>;
}

function extractJsonArray(rawContent: string): any[] {
  const raw = String(rawContent || '').trim();
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const arrMatch = stripped.match(/\[[\s\S]*\]/);
  if (!arrMatch) {
    throw new Error('AI response did not contain a structured JSON array.');
  }
  const parsed = JSON.parse(arrMatch[0]);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AI response returned an empty JSON array.');
  }
  return parsed;
}

function cleanStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.map((item) => String(item ?? '').trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : fallback;
}

function safeHex(value: unknown, fallback: string): string {
  const s = String(value ?? '').trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(s) ? s : fallback;
}

/* ============================================================================
 * STAGE 2: 13-Field Project Brief Synthesis
 * ========================================================================== */

export function buildBriefSynthesisPrompt(
  project: DigitalProductProject,
  lang: Language = 'en',
  focusNote?: string
): { systemPrompt: string; userPrompt: string } {
  const ctx = summarizeStrategyContext(project, lang);
  const selectedTopic = project.marketResearch?.topicCandidates?.find(
    (c) => c.id === project.marketResearch.selectedTopicId
  );
  const outputLang = lang === 'en' ? 'English' : 'Traditional Chinese (繁體中文)';

  const systemPrompt =
    'You are a commercial digital product strategist (Synthesise.ai methodology). Output valid JSON only with no markdown fences. Craft compelling, specific, truthful project brief specifications ready to produce a bestseller-grade bundle.';

  const userPrompt = `Refine and synthesize all 13 Project Brief specifications in ${outputLang} so this digital product stands out on commercial marketplaces (Amazon Kindle, Gumroad, Etsy, Payhip).

UPSTREAM CONTEXT:
- Selected Niche / Topic: ${ctx.topicTitle}
- Current Subtitle / Hook: ${selectedTopic?.subtitle || project.charter?.subtitle || ''}
- Creator / Brand: ${project.intake?.creatorName || 'Not provided — do not invent'}
- Existing Audience Note: ${project.intake?.targetAudience || selectedTopic?.targetAudience || ''}
- Existing Problem Note: ${project.intake?.problemsSolved || selectedTopic?.coreProblem || ''}
- Product Format: ${ctx.productFormat}
- Current Price Tiers: Intro $${project.intake?.recommendedPrice?.introductoryTest ?? 15}, Regular $${project.intake?.recommendedPrice?.regular ?? 29}, Bundle $${project.intake?.recommendedPrice?.premiumBundle ?? 49}
${focusNote?.trim() ? `- User Direction / Customization Hint: ${focusNote.trim()}` : ''}

Return valid JSON matching this exact schema:
{
  "projectName": "Sharp, commercially compelling project working title",
  "relevantExperience": "Practical background summary that builds realistic buyer trust",
  "expertise": "Focused domain strength",
  "interests": "Curated practical angles covered",
  "targetAudience": "Specific high-intent buyer persona with clear stage & situation",
  "problemsSolved": "2-3 sentences detailing the painful friction and costly mistakes buyers face today",
  "productIdea": "Clear bestseller positioning hook + why the deliverable bundle feels irresistible",
  "desiredTransformation": "Tangible, realistic outcome buyers achieve upon applying the system",
  "brandStyleAndVoice": {
    "personality": "3 evocative brand personality adjectives",
    "writingVoice": "Clear editorial tone (e.g. Warm, crisp, structured practitioner)",
    "typographyDirection": "Display + Body direction suitable for readable commercial layout"
  },
  "constraintsAndExclusions": {
    "productBoundaries": "Scope boundaries preventing bloat",
    "accuracyStandards": "Evidence & source verification standard",
    "safetyRules": "Non-medical / non-legal / realistic claims guardrail"
  },
  "recommendedPriceRationale": "Clear 2-sentence explanation of why this 3-tier price ladder converts and justifies the bundle"
}`;

  return { systemPrompt, userPrompt };
}

export function parseBriefSynthesisResponse(
  rawContent: string,
  existingIntake: ProjectIntake
): ProjectIntake {
  const parsed = extractJsonObject(rawContent);
  const voice =
    parsed.brandStyleAndVoice && typeof parsed.brandStyleAndVoice === 'object'
      ? parsed.brandStyleAndVoice
      : {};
  const constraints =
    parsed.constraintsAndExclusions && typeof parsed.constraintsAndExclusions === 'object'
      ? parsed.constraintsAndExclusions
      : {};

  return {
    ...existingIntake,
    projectName: String(parsed.projectName ?? '').trim() || existingIntake.projectName,
    relevantExperience:
      existingIntake.relevantExperience,
    expertise: existingIntake.expertise,
    interests: existingIntake.interests,
    targetAudience: String(parsed.targetAudience ?? '').trim() || existingIntake.targetAudience,
    problemsSolved: String(parsed.problemsSolved ?? '').trim() || existingIntake.problemsSolved,
    productIdea: String(parsed.productIdea ?? '').trim() || existingIntake.productIdea,
    desiredTransformation:
      String(parsed.desiredTransformation ?? '').trim() || existingIntake.desiredTransformation,
    brandStyleAndVoice: {
      ...existingIntake.brandStyleAndVoice,
      personality:
        String(voice.personality ?? '').trim() || existingIntake.brandStyleAndVoice.personality,
      writingVoice:
        String(voice.writingVoice ?? '').trim() || existingIntake.brandStyleAndVoice.writingVoice,
      typographyDirection:
        String(voice.typographyDirection ?? '').trim() ||
        existingIntake.brandStyleAndVoice.typographyDirection,
    },
    constraintsAndExclusions: {
      ...existingIntake.constraintsAndExclusions,
      productBoundaries:
        String(constraints.productBoundaries ?? '').trim() ||
        existingIntake.constraintsAndExclusions.productBoundaries,
      accuracyStandards:
        String(constraints.accuracyStandards ?? '').trim() ||
        existingIntake.constraintsAndExclusions.accuracyStandards,
      safetyRules:
        String(constraints.safetyRules ?? '').trim() ||
        existingIntake.constraintsAndExclusions.safetyRules,
    },
    recommendedPrice: {
      ...existingIntake.recommendedPrice,
      rationale:
        String(parsed.recommendedPriceRationale ?? '').trim() ||
        existingIntake.recommendedPrice.rationale,
    },
  };
}

/* ============================================================================
 * STAGE 6: Product Charter (Gate B) Alignment & Synthesis
 * ========================================================================== */

export function buildCharterSynthesisPrompt(
  project: DigitalProductProject,
  lang: Language = 'en',
  focusNote?: string
): { systemPrompt: string; userPrompt: string } {
  const ctx = summarizeStrategyContext(project, lang);
  const selectedTitle = project.transformationMap?.titleOptions?.find(
    (t) => t.id === project.transformationMap.selectedTitleId
  );
  const outputLang = lang === 'en' ? 'English' : 'Traditional Chinese (繁體中文)';

  const systemPrompt =
    'You are a senior digital publishing director (Synthesise.ai methodology). Output strictly valid JSON only with no markdown fences, unifying upstream positioning and transformation strategy into an actionable, bestseller-caliber Product Charter.';

  const userPrompt = `Synthesize and harmonize the Product Charter in ${outputLang} using all upstream decisions from Stages 1-5:

UPSTREAM STRATEGY:
- Preferred Product Title: ${selectedTitle?.title || project.charter?.productTitle || ctx.topicTitle}
- Preferred Subtitle: ${selectedTitle?.subtitle || project.charter?.subtitle || ''}
- Selected UVZ Angle: ${ctx.selectedUvzName || 'Not specified'}
- Target Audience Persona: ${ctx.targetAudience}
- Core Problems Solved: ${ctx.coreProblem}
- Transformation Big Promise: ${project.transformationMap?.bigPromise || ctx.selectedUvzPromise || ''}
- Signature Framework Name: ${project.transformationMap?.bridgeProcess?.signatureFrameworkName || project.charter?.signatureFramework || ''}
- Transformation Milestones: ${(project.transformationMap?.bridgeProcess?.keyMilestones || []).join(' | ')}
- Acquired Capabilities / Outcomes: ${(project.transformationMap?.afterState?.tangibleOutcomes || []).join(' | ')}
- Delivery Format: ${ctx.productFormat}
- Current Mapped References Count: ${project.referenceLibrary?.cards?.length || 0}
${focusNote?.trim() ? `- Creator Alignment Note: ${focusNote.trim()}` : ''}

Return valid JSON matching this exact schema:
{
  "productTitle": "Polished bestseller title",
  "subtitle": "Outcome-focused commercial subtitle",
  "targetAudience": "Sharp 2-sentence buyer definition",
  "primaryProblemSolved": "Sharp 2-sentence core problem statement",
  "centralPromise": "Compelling, truthful transformation promise",
  "signatureFramework": "Cohesive proprietary framework name",
  "brandVoiceSummary": "Concise editorial voice direction",
  "structuralPillars": ["4 distinct structural pillars forming the backbone of the product"],
  "learningObjectives": ["4 measurable, concrete buyer learning objectives"],
  "explicitDisclaimers": ["2 clear educational/non-guarantee compliance disclaimers"],
  "companionResourcePlan": ["3 practical companion deliverables included in the bundle"],
  "targetWordCount": 7500
}`;

  return { systemPrompt, userPrompt };
}

export function parseCharterSynthesisResponse(
  rawContent: string,
  existingCharter: ProductCharter
): ProductCharter {
  const parsed = extractJsonObject(rawContent);
  const wordCount = Number(parsed.targetWordCount);

  return {
    ...existingCharter,
    productTitle: String(parsed.productTitle ?? '').trim() || existingCharter.productTitle,
    subtitle: String(parsed.subtitle ?? '').trim() || existingCharter.subtitle,
    targetAudience: String(parsed.targetAudience ?? '').trim() || existingCharter.targetAudience,
    primaryProblemSolved:
      String(parsed.primaryProblemSolved ?? '').trim() || existingCharter.primaryProblemSolved,
    centralPromise: String(parsed.centralPromise ?? '').trim() || existingCharter.centralPromise,
    signatureFramework:
      String(parsed.signatureFramework ?? '').trim() || existingCharter.signatureFramework,
    brandVoiceSummary:
      String(parsed.brandVoiceSummary ?? '').trim() || existingCharter.brandVoiceSummary,
    structuralPillars: cleanStringArray(parsed.structuralPillars, existingCharter.structuralPillars),
    learningObjectives: cleanStringArray(
      parsed.learningObjectives,
      existingCharter.learningObjectives
    ),
    explicitDisclaimers: cleanStringArray(
      parsed.explicitDisclaimers,
      existingCharter.explicitDisclaimers
    ),
    companionResourcePlan: cleanStringArray(
      parsed.companionResourcePlan,
      existingCharter.companionResourcePlan
    ),
    targetWordCount:
      Number.isFinite(wordCount) && wordCount >= 1000 ? wordCount : existingCharter.targetWordCount,
    isApproved: false,
    approvedAt: undefined,
  };
}

/* ============================================================================
 * STAGE 7: Enriched Outline Builder Synthesis
 * ========================================================================== */

export function buildOutlineSynthesisPrompt(
  project: DigitalProductProject,
  lang: Language = 'en',
  focusNote?: string
): { systemPrompt: string; userPrompt: string } {
  const outputLang = lang === 'en' ? 'English' : 'Traditional Chinese (繁體中文)';
  const refSummary =
    project.referenceLibrary.cards
      .map((c) => `${c.id}: ${c.sourceTitle}`)
      .join(' | ') || 'none';
  const milestones =
    (project.transformationMap?.bridgeProcess?.keyMilestones || []).join(' -> ') || 'Not specified';

  const systemPrompt =
    'You are an editorial curriculum architect (Synthesise.ai methodology). Output strictly valid JSON only containing an array of 5 to 7 structured chapters engineered to turn readers into successful practitioners.';

  const userPrompt = `Design a commercial bestseller chapter outline in ${outputLang}. Return JSON array ONLY:
- Product Title: ${project.charter?.productTitle || project.name}
- Subtitle: ${project.charter?.subtitle || ''}
- Target Audience: ${project.charter?.targetAudience || project.intake?.targetAudience || ''}
- Central Promise: ${project.charter?.centralPromise || ''}
- Signature Framework: ${project.charter?.signatureFramework || ''}
- Structural Pillars: ${(project.charter?.structuralPillars || []).join(' | ')}
- Transformation Milestones: ${milestones}
- Available Reference IDs: ${refSummary}
${focusNote?.trim() ? `- Outline Direction Note: ${focusNote.trim()}` : ''}

JSON schema:
[
  {
    "title": "Action-oriented, memorable chapter title",
    "objective": "Clear learning & execution objective",
    "subtopics": ["3-4 logical subtopics moving from principle to worked practice"],
    "targetWordCount": 1800,
    "practicalDeliverable": "Concrete template, audit, or worksheet completed in this chapter",
    "completionMilestone": "Specific verification check proving mastery of this chapter"
  }
]`;

  return { systemPrompt, userPrompt };
}

export function parseOutlineSynthesisResponse(
  rawContent: string,
  availableReferenceIds: string[]
): ChapterOutlineItem[] {
  const parsed = extractJsonArray(rawContent);

  return parsed.map((item: any, idx: number) => {
    const order = idx + 1;
    return {
      id: `CH-${String(order).padStart(2, '0')}`,
      order,
      title: String(item.title || `Chapter ${order}`).trim(),
      objective: String(item.objective || '').trim(),
      subtopics: cleanStringArray(item.subtopics, ['Core concept', 'Step-by-step practice', 'Action review']),
      targetWordCount: Number(item.targetWordCount) || 1800,
      practicalDeliverable: String(item.practicalDeliverable || 'Actionable chapter worksheet').trim(),
      mappedReferenceIds: availableReferenceIds.length
        ? [availableReferenceIds[idx % availableReferenceIds.length]]
        : [],
      exampleScenarios: [],
      completionMilestone: String(item.completionMilestone || 'Chapter deliverable verified').trim(),
      isCompleted: false,
      isLocked: false,
    };
  });
}

/* ============================================================================
 * STAGE 8: Content Studio Continuity Helper
 * ========================================================================== */

export function extractChapterContinuity(
  chapter: ChapterOutlineItem,
  contentMarkdown: string,
  existingBible: ProductBible
): ProductBible {
  const headings = [...contentMarkdown.matchAll(/^#{2,3}\s+(.+)$/gm)]
    .map((m) => m[1].replace(/[*_`]/g, '').trim())
    .filter((h) => h.length > 3 && h.length < 90);

  const mergedConcepts = [...new Set([...(existingBible.introducedConcepts || []), ...headings])].slice(
    0,
    18
  );

  const handoffNote = `${chapter.id} (${chapter.title}): Completed deliverable "${chapter.practicalDeliverable || 'Action guide'}".`;
  const existingNotes = (existingBible.continuityHandoffNotes || []).filter(
    (n) => !n.startsWith(`${chapter.id} (`)
  );

  return {
    ...existingBible,
    introducedConcepts: mergedConcepts,
    continuityHandoffNotes: [...existingNotes, handoffNote],
  };
}

/* ============================================================================
 * STAGE 9: Companion Workbook & Toolkit Suite Synthesis
 * ========================================================================== */

export function buildWorkbookSuitePrompt(
  project: DigitalProductProject,
  lang: Language = 'en',
  options?: { mode?: 'suite' | 'single'; chapterId?: string; focusNote?: string }
): { systemPrompt: string; userPrompt: string } {
  const outputLang = lang === 'en' ? 'English' : 'Traditional Chinese (繁體中文)';
  const mode = options?.mode || 'suite';
  const targetChapter = options?.chapterId
    ? project.outline.find((ch) => ch.id === options.chapterId)
    : undefined;

  const systemPrompt =
    'You are a commercial instructional designer creating high-value companion workbooks, checklists, and cheat sheets (Synthesise.ai methodology). Output strictly valid JSON only with no markdown fences. Each resource contentMarkdown must be rich, actionable, formatted with clean Markdown tables and checkboxes, and at least 350 characters long.';

  if (mode === 'single') {
    const userPrompt = `Create 1 high-utility companion worksheet resource in ${outputLang} for:
- Product: ${project.charter?.productTitle || project.name}
- Target Audience: ${project.charter?.targetAudience || project.intake?.targetAudience || ''}
- Signature Framework: ${project.charter?.signatureFramework || ''}
${targetChapter ? `- Focused Chapter: ${targetChapter.id} — ${targetChapter.title} (Deliverable: ${targetChapter.practicalDeliverable}; Objective: ${targetChapter.objective})` : '- Scope: Complete Product Companion'}
${options?.focusNote?.trim() ? `- Custom Focus: ${options.focusNote.trim()}` : ''}

Return valid JSON object matching:
{
  "resources": [
    {
      "title": "Actionable Resource Title",
      "category": "WORKSHEET",
      "purpose": "Clear outcome buyers achieve using this tool",
      "instructions": "Step-by-step usage instructions",
      "completionCriteria": "How the buyer verifies they completed this worksheet properly",
      "sampleEntries": ["Realistic filled-in example line 1", "Realistic filled-in example line 2"],
      "contentMarkdown": "Detailed Markdown worksheet (>= 400 chars) with fillable Markdown table, numbered action prompts, and - [ ] checkboxes"
    }
  ]
}`;
    return { systemPrompt, userPrompt };
  }

  const chapterList =
    project.outline
      .map((ch) => `${ch.id}: ${ch.title} (Deliverable: ${ch.practicalDeliverable})`)
      .join(' | ') || 'Core framework steps';

  const userPrompt = `Create a 3-piece bestseller companion toolkit suite in ${outputLang} that substantially elevates the perceived value of this digital product bundle:
- Product Title: ${project.charter?.productTitle || project.name}
- Target Audience: ${project.charter?.targetAudience || project.intake?.targetAudience || ''}
- Big Promise: ${project.charter?.centralPromise || project.transformationMap?.bigPromise || ''}
- Signature Framework: ${project.charter?.signatureFramework || ''}
- Chapters & Deliverables: ${chapterList}
${options?.focusNote?.trim() ? `- Custom Focus: ${options.focusNote.trim()}` : ''}

Generate exactly 3 distinct, immediately usable companion assets:
1. Category "WORKSHEET": Core Implementation Workbook (fillable diagnostic & action tables)
2. Category "CHECKLIST": 30-Day Execution Sprint & Mastery Checklist (weekly checkboxes & milestones)
3. Category "TEMPLATE": Quick-Reference Cheat Sheet & Decision Matrix (at-a-glance rules & troubleshooting table)

Return valid JSON matching:
{
  "resources": [
    {
      "title": "string",
      "category": "WORKSHEET | CHECKLIST | TEMPLATE",
      "purpose": "string",
      "instructions": "string",
      "completionCriteria": "string",
      "sampleEntries": ["string", "string"],
      "contentMarkdown": "Rich, detailed Markdown (>= 450 chars) with headings, Markdown tables, and - [ ] checkboxes. Avoid fake un-cited empirical statistics."
    }
  ]
}`;

  return { systemPrompt, userPrompt };
}

const VALID_CATEGORIES = new Set<ResourceAsset['category']>([
  'WORKSHEET',
  'CHECKLIST',
  'TRACKER',
  'CALENDAR',
  'TEMPLATE',
  'GUIDE',
]);

export function parseWorkbookSuiteResponse(
  rawContent: string,
  associatedChapterId?: string
): ResourceAsset[] {
  const parsed = extractJsonObject(rawContent);
  const rawList = Array.isArray(parsed.resources) ? parsed.resources : [];
  if (rawList.length === 0) {
    throw new Error('AI response did not include any valid companion resources.');
  }

  return rawList
    .filter((item: any) => item && item.title && String(item.contentMarkdown || '').trim().length >= 150)
    .map((item: any, idx: number) => {
      const catUpper = String(item.category || 'WORKSHEET').toUpperCase() as ResourceAsset['category'];
      const category = VALID_CATEGORIES.has(catUpper) ? catUpper : 'WORKSHEET';
      return {
        id: `RES-${String(idx + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`,
        title: String(item.title).trim(),
        category,
        purpose: String(item.purpose || 'Practical buyer execution aid').trim(),
        instructions: String(item.instructions || 'Complete each section sequentially alongside the main guide.').trim(),
        fieldsOrColumns: [],
        sampleEntries: cleanStringArray(item.sampleEntries, []),
        completionCriteria: String(item.completionCriteria || 'All checkboxes and table entries reviewed').trim(),
        associatedChapterId: associatedChapterId || undefined,
        contentMarkdown: String(item.contentMarkdown).trim(),
      };
    });
}

/* ============================================================================
 * STAGE 11: Brand & Cover Art Direction Synthesis
 * ========================================================================== */

export function buildBrandDirectionPrompt(
  project: DigitalProductProject,
  lang: Language = 'en',
  focusNote?: string
): { systemPrompt: string; userPrompt: string } {
  const ctx = summarizeStrategyContext(project, lang);
  const outputLang = lang === 'en' ? 'English' : 'Traditional Chinese (繁體中文)';

  const systemPrompt =
    'You are an editorial publishing art director (Synthesise.ai methodology). Output strictly valid JSON only with no markdown fences, prescribing a cohesive 60-30-10 color palette, serif/sans typographic pairing, and commercial cover/layout specification tailored to the book topic.';

  const userPrompt = `Recommend a bespoke commercial publishing brand identity and cover art direction in ${outputLang} for this digital product:
- Title: ${project.charter?.productTitle || ctx.topicTitle}
- Subtitle: ${project.charter?.subtitle || ''}
- Target Audience: ${ctx.targetAudience}
- Format: ${ctx.productFormat}
- Tone & Voice: ${project.intake?.brandStyleAndVoice?.personality || 'Clear, trustworthy, modern'}
${focusNote?.trim() ? `- Aesthetic Preference: ${focusNote.trim()}` : ''}

Allowed Display Fonts: ["Fraunces", "Playfair Display", "Plus Jakarta Sans", "Space Grotesk", "Merriweather"]
Allowed Body Fonts: ["Plus Jakarta Sans", "Source Sans 3", "Merriweather", "JetBrains Mono"]

Return valid JSON matching:
{
  "profileName": "Distinctive 2-4 word imprint name",
  "primaryHex": "#162B32",
  "secondaryHex": "#0F766E",
  "accentHex": "#D97706",
  "neutralBgHex": "#F8FAFC",
  "fontDisplay": "Fraunces",
  "fontBody": "Plus Jakarta Sans",
  "coverBrief": "2-3 crisp sentences detailing cover contrast, focal motif, typography placement, and shelf appeal",
  "manuscriptLayoutNotes": "2-3 crisp sentences detailing whitespace rhythm, callout style, table clarity, and print readability"
}`;

  return { systemPrompt, userPrompt };
}

export function parseBrandDirectionResponse(
  rawContent: string,
  existingBrand: DigitalProductProject['brand']
): DigitalProductProject['brand'] {
  const parsed = extractJsonObject(rawContent);
  const allowedDisplay = new Set([
    'Fraunces',
    'Playfair Display',
    'Plus Jakarta Sans',
    'Space Grotesk',
    'Merriweather',
  ]);
  const allowedBody = new Set([
    'Plus Jakarta Sans',
    'Source Sans 3',
    'Merriweather',
    'JetBrains Mono',
  ]);

  const disp = String(parsed.fontDisplay ?? '').trim();
  const body = String(parsed.fontBody ?? '').trim();

  return {
    ...existingBrand,
    profileName: String(parsed.profileName ?? '').trim() || existingBrand.profileName,
    primaryHex: safeHex(parsed.primaryHex, existingBrand.primaryHex || '#162B32'),
    secondaryHex: safeHex(parsed.secondaryHex, existingBrand.secondaryHex || '#0F766E'),
    accentHex: safeHex(parsed.accentHex, existingBrand.accentHex || '#D97706'),
    neutralBgHex: safeHex(parsed.neutralBgHex, existingBrand.neutralBgHex || '#F8FAFC'),
    fontDisplay: allowedDisplay.has(disp) ? disp : existingBrand.fontDisplay,
    fontBody: allowedBody.has(body) ? body : existingBrand.fontBody,
    coverBrief: String(parsed.coverBrief ?? '').trim() || existingBrand.coverBrief,
    manuscriptLayoutNotes:
      String(parsed.manuscriptLayoutNotes ?? '').trim() || existingBrand.manuscriptLayoutNotes,
  };
}
