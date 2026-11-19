import type { DigitalProductProject, TransformationMap, UVZAnalysis } from '../types/project.ts';
import type { Language } from './i18n.ts';

export type StrategyFocusLens =
  | 'balanced'
  | 'beginner_playbook'
  | 'action_toolkit'
  | 'specialist_deep_dive';

export interface StrategySynthesisOptions {
  lens?: StrategyFocusLens;
  focusNote?: string;
  titlesOnly?: boolean;
}

export interface StrategyContextSummary {
  topicTitle: string;
  targetAudience: string;
  coreProblem: string;
  productFormat: string;
  selectedUvzName?: string;
  selectedUvzPromise?: string;
}

const LENS_INSTRUCTIONS: Record<StrategyFocusLens, { en: string; zh: string }> = {
  balanced: {
    en: 'Balanced Commercial Trio: provide 3 diverse positioning angles spanning beginner quick-start, workflow toolkit, and specialized mastery.',
    zh: '均衡商業三角定位：提供 3 個互補切角（涵蓋新手入門實戰、模板工具套件與進階專家系統）。',
  },
  beginner_playbook: {
    en: 'Beginner-Friendly Playbook: prioritize low-jargon, step-by-step clarity, quick wins, and reducing overwhelm for newcomers.',
    zh: '新手友善實戰手冊：強調零門檻、白話拆解、分步執行與降低焦慮的快速上手體驗。',
  },
  action_toolkit: {
    en: 'Template & Action System: emphasize plug-and-play worksheets, checklists, decision matrices, and time-saving ready-to-use assets.',
    zh: '即開即用實作套件：強調高實用度工作表、檢核清單、SOP 與省時可套用範本價值。',
  },
  specialist_deep_dive: {
    en: 'High-Authority Specialist Framework: highlight diagnostic rigor, edge-case handling, quantifiable KPIs, and repeatable methodology.',
    zh: '深度專業方法論：強調結構化診斷邏輯、關鍵盲點排雷、可量化指標與可複製框架。',
  },
};

function cleanStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.map((item) => String(item ?? '').trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : fallback;
}

function extractJsonObject(rawContent: string): Record<string, any> {
  const raw = String(rawContent || '').trim();
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const startIdx = stripped.indexOf('{');
  if (startIdx < 0) {
    throw new Error('AI response did not contain a structured JSON object.');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let endIdx = -1;

  for (let i = startIdx; i < stripped.length; i++) {
    const ch = stripped[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  const candidate = endIdx >= startIdx ? stripped.slice(startIdx, endIdx + 1) : stripped.slice(startIdx);
  const parsed = JSON.parse(candidate);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI response returned an unexpected JSON shape.');
  }
  return parsed as Record<string, any>;
}

export function summarizeStrategyContext(
  project: DigitalProductProject,
  lang: Language = 'en'
): StrategyContextSummary {
  const selectedTopic = project.marketResearch?.topicCandidates?.find(
    (c) => c.id === project.marketResearch.selectedTopicId
  );
  const selectedUvz = project.uvz?.positioningOptions?.find(
    (o) => o.id === project.uvz?.selectedOptionId
  );

  return {
    topicTitle:
      selectedTopic?.title ||
      project.intake?.productIdea ||
      project.charter?.productTitle ||
      project.name ||
      (lang === 'en' ? 'Untitled Digital Product' : '未命名數位商品'),
    targetAudience:
      selectedUvz?.targetPersona ||
      project.intake?.targetAudience ||
      selectedTopic?.targetAudience ||
      project.charter?.targetAudience ||
      (lang === 'en' ? 'Practical buyers seeking structured guidance' : '尋求結構化指引之目標客群'),
    coreProblem:
      project.intake?.problemsSolved ||
      selectedTopic?.coreProblem ||
      project.charter?.primaryProblemSolved ||
      project.uvz?.buyerProblems?.[0] ||
      (lang === 'en' ? 'Scattered advice without a clear step-by-step system' : '缺乏系統化操作流程與實作工具'),
    productFormat:
      project.preferences?.productFormat ||
      selectedTopic?.suggestedFormat ||
      project.charter?.deliveryFormat ||
      'ebook_toolkit',
    selectedUvzName: selectedUvz ? `${selectedUvz.id}: ${selectedUvz.name}` : undefined,
    selectedUvzPromise: selectedUvz?.promise || project.intake?.desiredTransformation || selectedTopic?.bigPromise,
  };
}

export function buildUvzSynthesisPrompt(
  project: DigitalProductProject,
  lang: Language = 'en',
  options?: StrategySynthesisOptions
): { systemPrompt: string; userPrompt: string } {
  const ctx = summarizeStrategyContext(project, lang);
  const lens: StrategyFocusLens = options?.lens || 'balanced';
  const outputLang = lang === 'en' ? 'English' : 'Traditional Chinese';
  const lensGuide = lang === 'en' ? LENS_INSTRUCTIONS[lens].en : LENS_INSTRUCTIONS[lens].zh;

  const selectedTopic = project.marketResearch?.topicCandidates?.find(
    (c) => c.id === project.marketResearch.selectedTopicId
  );

  const systemPrompt =
    'You are an elite digital product positioning strategist (Digital Product Studio editorial workflow). Output strictly valid JSON only with no markdown fences, grounded in realistic buyer psychology and commercial feasibility. Never fabricate creator identity, expertise, experience, credentials or results. Unknown creator facts remain unresolved. Treat proposed audiences, outcomes, pricing and demand as hypotheses, not measured facts. Never fabricate revenue guarantees or medical/legal claims.';

  const userPrompt = `Analyze the selected topic and project brief below, and synthesize a complete Unique Value Zone (UVZ) analysis + 3 distinct market positioning options in ${outputLang}.

CONTEXT INPUTS:
- Topic / Product Concept: ${ctx.topicTitle}
- Target Audience: ${ctx.targetAudience}
- Core Problems Solved: ${ctx.coreProblem}
- Creator Background & Expertise: ${project.intake?.expertise || 'Unknown — do not invent'} | ${project.intake?.relevantExperience || 'Unknown — do not invent'}
- Creator Interests & Strengths: ${project.intake?.interests || 'Not provided'}
- Desired Buyer Transformation: ${project.intake?.desiredTransformation || selectedTopic?.bigPromise || 'Clarity and repeatable execution'}
- Delivery Format: ${ctx.productFormat}
- Market Differentiation Note: ${selectedTopic?.differentiationAngle || 'Combine clear explanations with usable templates'}
- Price Ladder: Intro $${project.intake?.recommendedPrice?.introductoryTest ?? 15}, Regular $${project.intake?.recommendedPrice?.regular ?? 29}, Bundle $${project.intake?.recommendedPrice?.premiumBundle ?? 49}
- Negative Constraints / Claims to Avoid: ${project.intake?.constraintsAndExclusions?.claimsToAvoid || 'Avoid unrealistic guarantees'}
- Strategic Lens: ${lensGuide}
${options?.focusNote?.trim() ? `- User Specific Direction / Focus Note: ${options.focusNote.trim()}` : ''}

Return valid JSON matching this exact schema:
{
  "buyerProblems": ["4-5 specific, vivid buyer pain points and daily frustrations"],
  "potentialSolutions": ["4-5 actionable product solutions/mechanisms addressing each pain"],
  "creatorExpertiseFit": "2-3 concise sentences explaining how creator strengths and honest practitioner framing build credibility",
  "commercialFeasibility": "2-3 concise sentences evaluating demand urgency, format-to-price fit, and bundle upsell feasibility",
  "differentiationOpportunities": ["4 concrete white-space differentiators competitors miss"],
  "positioningOptions": [
    {
      "id": "UVZ-01",
      "name": "Memorable positioning title",
      "angle": "Why this angle stands out cleanly in the market",
      "targetPersona": "Exact sub-segment of the audience most eager for this angle",
      "promise": "Specific, truthful outcome promise",
      "pros": "Key conversion & authority strengths",
      "risks": "Realistic scope or validation risk to manage",
      "isRecommended": true
    },
    {
      "id": "UVZ-02",
      "name": "...",
      "angle": "...",
      "targetPersona": "...",
      "promise": "...",
      "pros": "...",
      "risks": "...",
      "isRecommended": false
    },
    {
      "id": "UVZ-03",
      "name": "...",
      "angle": "...",
      "targetPersona": "...",
      "promise": "...",
      "pros": "...",
      "risks": "...",
      "isRecommended": false
    }
  ]
}`;

  return { systemPrompt, userPrompt };
}

export function parseUvzSynthesisResponse(
  rawContent: string,
  existingUvz?: UVZAnalysis
): UVZAnalysis {
  const parsed = extractJsonObject(rawContent);
  const rawOptions = Array.isArray(parsed.positioningOptions) ? parsed.positioningOptions : [];

  const normalizedOptions = rawOptions
    .filter((item: any) => item && (item.name || item.angle || item.promise))
    .slice(0, 3)
    .map((item: any, idx: number) => ({
      id: `UVZ-${String(idx + 1).padStart(2, '0')}`,
      name: String(item.name || `Positioning Option ${idx + 1}`).trim(),
      angle: String(item.angle || '').trim(),
      targetPersona: String(item.targetPersona || '').trim(),
      promise: String(item.promise || '').trim(),
      pros: String(item.pros || 'Not established; validate with prospective buyers').trim(),
      risks: String(item.risks || 'Requires real buyer feedback').trim(),
      isRecommended: Boolean(item.isRecommended),
    }));

  if (normalizedOptions.length !== 3 || normalizedOptions.some(option => !option.angle || !option.promise || !option.targetPersona)) {
    throw new Error('AI response must include 3 complete, comparable UVZ positioning options. Existing work was retained; retry generation.');
  }

  if (!normalizedOptions.some((o) => o.isRecommended)) {
    normalizedOptions[0].isRecommended = true;
  }

  return {
    buyerProblems: cleanStringArray(parsed.buyerProblems, existingUvz?.buyerProblems || []),
    potentialSolutions: cleanStringArray(parsed.potentialSolutions, existingUvz?.potentialSolutions || []),
    creatorExpertiseFit:
      String(parsed.creatorExpertiseFit ?? '').trim() || existingUvz?.creatorExpertiseFit || '',
    commercialFeasibility:
      String(parsed.commercialFeasibility ?? '').trim() || existingUvz?.commercialFeasibility || '',
    differentiationOpportunities: cleanStringArray(
      parsed.differentiationOpportunities,
      existingUvz?.differentiationOpportunities || []
    ),
    positioningOptions: normalizedOptions,
    selectedOptionId: '', // Generated suggestions require an explicit creator choice.
  };
}

export function buildTransformationSynthesisPrompt(
  project: DigitalProductProject,
  lang: Language = 'en',
  options?: StrategySynthesisOptions
): { systemPrompt: string; userPrompt: string } {
  const ctx = summarizeStrategyContext(project, lang);
  const lens: StrategyFocusLens = options?.lens || 'balanced';
  const outputLang = lang === 'en' ? 'English' : 'Traditional Chinese';
  const lensGuide = lang === 'en' ? LENS_INSTRUCTIONS[lens].en : LENS_INSTRUCTIONS[lens].zh;

  const selectedUvz = project.uvz?.positioningOptions?.find(
    (o) => o.id === project.uvz?.selectedOptionId
  );

  const systemPrompt = options?.titlesOnly
    ? 'You are a commercial digital product copywriter and book titling strategist. Output strictly valid JSON only with no markdown fences.'
    : 'You are a transformational learning & commercial product architect (Digital Product Studio editorial workflow). Output strictly valid JSON only with no markdown fences, creating cohesive Before -> Bridge -> After customer transformation pathways and high-converting, truthful product titles.';

  if (options?.titlesOnly) {
    const userPrompt = `Generate 3 distinct, compelling commercial Title + Subtitle + Rationale options in ${outputLang} for this digital product.

CONTEXT:
- Concept: ${ctx.topicTitle}
- Selected UVZ Positioning: ${selectedUvz ? `${selectedUvz.name} — ${selectedUvz.angle}` : ctx.topicTitle}
- Target Buyer Persona: ${ctx.targetAudience}
- Big Promise / Transformation: ${project.transformationMap?.bigPromise || ctx.selectedUvzPromise || ctx.coreProblem}
- Signature Framework: ${project.transformationMap?.bridgeProcess?.signatureFrameworkName || ''}
- Strategic Lens: ${lensGuide}
${options?.focusNote?.trim() ? `- User Title / Hook Preference: ${options.focusNote.trim()}` : ''}

Return valid JSON matching this exact schema:
{
  "titleOptions": [
    {"id": "TITLE-01", "title": "Main Title", "subtitle": "Specific outcome-focused subtitle", "rationale": "Why this converts", "isRecommended": true},
    {"id": "TITLE-02", "title": "Main Title", "subtitle": "Specific outcome-focused subtitle", "rationale": "Why this appeals to practical buyers", "isRecommended": false},
    {"id": "TITLE-03", "title": "Main Title", "subtitle": "Specific outcome-focused subtitle", "rationale": "Why this stands out on marketplaces", "isRecommended": false}
  ]
}`;
    return { systemPrompt, userPrompt };
  }

  const userPrompt = `Synthesize a complete Customer Transformation Map (Before -> Bridge -> After) and 3 commercial Title Options in ${outputLang}.

UPSTREAM CONTEXT (FROM GATE A, 13-FIELD BRIEF & UVZ STAGE):
- Topic / Product Concept: ${ctx.topicTitle}
- Format: ${ctx.productFormat}
- Selected UVZ Angle: ${selectedUvz ? `${selectedUvz.name} (${selectedUvz.angle})` : 'Not selected yet — infer optimal positioning'}
- Target Persona: ${ctx.targetAudience}
- Buyer Problems Identified: ${(project.uvz?.buyerProblems || [ctx.coreProblem]).join(' | ')}
- Core Solutions Identified: ${(project.uvz?.potentialSolutions || []).join(' | ')}
- UVZ Promise: ${ctx.selectedUvzPromise || 'Clear, actionable progression'}
- Strategic Lens: ${lensGuide}
${options?.focusNote?.trim() ? `- User Focus / Customization Note: ${options.focusNote.trim()}` : ''}

Return valid JSON matching this exact schema:
{
  "bigPromise": "1-2 clear, non-hyped sentences stating the realistic core transformation buyers unlock",
  "uniqueSellingProposition": "1 concise sentence explaining why this product delivers the outcome faster or clearer than generic alternatives",
  "beforeState": {
    "currentPains": ["4 concrete day-to-day frustrations buyers feel right now"],
    "anxietiesAndFrustrations": ["3 emotional tensions, doubts, or overwhelm loops"],
    "flawedAlternatives": ["3 common DIY / competitor approaches that fail them and why"],
    "dailyDrainCost": "1-2 sentences quantifying the weekly time, energy, or confusion drain of staying stuck"
  },
  "bridgeProcess": {
    "signatureFrameworkName": "Memorable 3-5 word proprietary method or system name",
    "coreMethodology": "2-3 sentences explaining how the step-by-step method bridges Before to After",
    "keyMilestones": ["4 sequential execution steps / milestones from start to finish"],
    "practicalTools": ["3-4 ready-to-use worksheets, checklists, scripts, or trackers included"],
    "obstacleBypasses": ["3 common sticking points and how this product prevents quitting"]
  },
  "afterState": {
    "tangibleOutcomes": ["4 concrete results buyers experience upon completion"],
    "acquiredCapabilities": ["3 lasting skills or habits the buyer now owns independently"],
    "completedDeliverables": ["3-4 finished artifacts/assets the buyer walks away with"],
    "measurableMetrics": ["3 observable checkpoints / verification metrics proving progress"]
  },
  "titleOptions": [
    {"id": "TITLE-01", "title": "Strongest Commercial Title", "subtitle": "Clear benefit + format subtitle", "rationale": "Conversion rationale", "isRecommended": true},
    {"id": "TITLE-02", "title": "Method-Driven Title", "subtitle": "Framework + target persona subtitle", "rationale": "Authority rationale", "isRecommended": false},
    {"id": "TITLE-03", "title": "Quick-Win / Action Title", "subtitle": "Tangible milestone subtitle", "rationale": "Speed-to-value rationale", "isRecommended": false}
  ]
}`;

  return { systemPrompt, userPrompt };
}

export function parseTitleOptionsResponse(
  rawContent: string,
  existingMap: TransformationMap
): TransformationMap {
  const parsed = extractJsonObject(rawContent);
  const rawTitles = Array.isArray(parsed.titleOptions) ? parsed.titleOptions : [];

  const normalizedTitles = rawTitles
    .filter((item: any) => item && item.title)
    .slice(0, 3)
    .map((item: any, idx: number) => ({
      id: `TITLE-${String(idx + 1).padStart(2, '0')}`,
      title: String(item.title).trim(),
      subtitle: String(item.subtitle || '').trim(),
      rationale: String(item.rationale || 'Outcome-oriented marketplace positioning').trim(),
      isRecommended: Boolean(item.isRecommended),
    }));

  if (normalizedTitles.length === 0) {
    throw new Error('AI response did not include any valid product title options.');
  }

  if (!normalizedTitles.some((t) => t.isRecommended)) {
    normalizedTitles[0].isRecommended = true;
  }

  return {
    ...existingMap,
    titleOptions: normalizedTitles,
    selectedTitleId: '',
  };
}

export function parseTransformationSynthesisResponse(
  rawContent: string,
  existingMap?: TransformationMap
): TransformationMap {
  const parsed = extractJsonObject(rawContent);
  const prevBefore = existingMap?.beforeState;
  const prevBridge = existingMap?.bridgeProcess;
  const prevAfter = existingMap?.afterState;

  const rawBefore = parsed.beforeState && typeof parsed.beforeState === 'object' ? parsed.beforeState : {};
  const rawBridge = parsed.bridgeProcess && typeof parsed.bridgeProcess === 'object' ? parsed.bridgeProcess : {};
  const rawAfter = parsed.afterState && typeof parsed.afterState === 'object' ? parsed.afterState : {};

  if (!cleanStringArray(rawBefore.currentPains).length || !cleanStringArray(rawBridge.keyMilestones).length || !cleanStringArray(rawAfter.tangibleOutcomes).length) {
    throw new Error('AI response omitted required Before / Bridge / After milestones. Existing draft retained; retry generation.');
  }

  const rawTitles = Array.isArray(parsed.titleOptions) ? parsed.titleOptions : [];
  const normalizedTitles = rawTitles
    .filter((item: any) => item && item.title)
    .slice(0, 3)
    .map((item: any, idx: number) => ({
      id: `TITLE-${String(idx + 1).padStart(2, '0')}`,
      title: String(item.title).trim(),
      subtitle: String(item.subtitle || '').trim(),
      rationale: String(item.rationale || 'Clear outcome positioning').trim(),
      isRecommended: Boolean(item.isRecommended),
    }));

  if (normalizedTitles.length === 0) {
    throw new Error('AI response did not include valid transformation pillars or title options.');
  }

  const finalTitles =
    normalizedTitles.length > 0 ? normalizedTitles : existingMap?.titleOptions || [];
  if (finalTitles.length > 0 && !finalTitles.some((t) => t.isRecommended)) {
    finalTitles[0] = { ...finalTitles[0], isRecommended: true };
  }

  const base: TransformationMap = {
    beforeState: {
      currentPains: cleanStringArray(rawBefore.currentPains, prevBefore?.currentPains || []),
      anxietiesAndFrustrations: cleanStringArray(
        rawBefore.anxietiesAndFrustrations,
        prevBefore?.anxietiesAndFrustrations || []
      ),
      flawedAlternatives: cleanStringArray(
        rawBefore.flawedAlternatives,
        prevBefore?.flawedAlternatives || []
      ),
      dailyDrainCost:
        String(rawBefore.dailyDrainCost ?? '').trim() || prevBefore?.dailyDrainCost || '',
    },
    bridgeProcess: {
      coreMethodology:
        String(rawBridge.coreMethodology ?? '').trim() || prevBridge?.coreMethodology || '',
      signatureFrameworkName:
        String(rawBridge.signatureFrameworkName ?? '').trim() ||
        prevBridge?.signatureFrameworkName ||
        '',
      keyMilestones: cleanStringArray(rawBridge.keyMilestones, prevBridge?.keyMilestones || []),
      practicalTools: cleanStringArray(rawBridge.practicalTools, prevBridge?.practicalTools || []),
      obstacleBypasses: cleanStringArray(
        rawBridge.obstacleBypasses,
        prevBridge?.obstacleBypasses || []
      ),
    },
    afterState: {
      tangibleOutcomes: cleanStringArray(
        rawAfter.tangibleOutcomes,
        prevAfter?.tangibleOutcomes || []
      ),
      acquiredCapabilities: cleanStringArray(
        rawAfter.acquiredCapabilities,
        prevAfter?.acquiredCapabilities || []
      ),
      completedDeliverables: cleanStringArray(
        rawAfter.completedDeliverables,
        prevAfter?.completedDeliverables || []
      ),
      measurableMetrics: cleanStringArray(
        rawAfter.measurableMetrics,
        prevAfter?.measurableMetrics || []
      ),
    },
    titleOptions: finalTitles,
    selectedTitleId: '',
    bigPromise: String(parsed.bigPromise ?? '').trim() || existingMap?.bigPromise || '',
    uniqueSellingProposition:
      String(parsed.uniqueSellingProposition ?? '').trim() ||
      existingMap?.uniqueSellingProposition ||
      '',
  };

  if (
    base.beforeState.currentPains.length === 0 &&
    base.bridgeProcess.keyMilestones.length === 0 &&
    base.afterState.tangibleOutcomes.length === 0
  ) {
    throw new Error('AI response omitted required Before / Bridge / After milestones.');
  }

  return base;
}
