import type { DigitalProductProject, ModelInfo } from '../types/project.ts';
import { apiFetch } from './apiClient.ts';
import { scrubLegacyApiKeyStorage } from '../utils/projectStorage.ts';

// Clean up any legacy plaintext credentials stored in localStorage
if (typeof window !== 'undefined') {
  scrubLegacyApiKeyStorage();
}

export const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

export type GeminiModelId =
  | 'gemini-4-hydrogen'
  | 'gemini-3.1-flash-lite'
  | 'gemini-4-argon'
  | 'gemini-4-carbon';

export type StudioCopilotRoleId =
  | 'strategist'
  | 'market_analyst'
  | 'editor'
  | 'launch_copy';

export interface GroundedSource {
  title: string;
  url: string;
  domain: string;
}

export interface GroundingInfo {
  grounded: boolean;
  webSearchQueries: string[];
  sources: GroundedSource[];
}

export interface CopilotTurnMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  model?: string;
  roleId?: StudioCopilotRoleId;
  grounding?: GroundingInfo;
}

export interface AiUsageMeta {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  estimatedCostUsd?: number;
  costStatus?: 'actual' | 'estimated' | 'unknown';
  pricingNote?: string;
}

export interface CopilotChatResponse {
  success: boolean;
  provider: 'gemini';
  model: string;
  content: string;
  grounding?: GroundingInfo;
  usage?: AiUsageMeta;
  error?: string;
}

export const GEMINI_TASK_MODELS: Array<{
  id: GeminiModelId;
  labelEn: string;
  labelZh: string;
  taskHintEn: string;
  taskHintZh: string;
}> = [
  {
    id: 'gemini-4-hydrogen',
    labelEn: 'Gemini 4 Hydrogen',
    labelZh: 'Gemini 4 Hydrogen',
    taskHintEn: 'General tasks & Google Search Grounding',
    taskHintZh: '通用任務與 Google 搜尋即時實證',
  },
  {
    id: 'gemini-3.1-flash-lite',
    labelEn: 'Gemini 3.1 Flash Lite',
    labelZh: 'Gemini 3.1 Flash Lite',
    taskHintEn: 'Fast brainstorms, summaries & checklists',
    taskHintZh: '快速發想、摘要與檢核建議',
  },
  {
    id: 'gemini-4-argon',
    labelEn: 'Gemini 4 Argon',
    labelZh: 'Gemini 4 Argon',
    taskHintEn: 'Complex interactive tasks & pedagogy',
    taskHintZh: '複雜互動設計、教學結構與深層編修',
  },
  {
    id: 'gemini-4-carbon',
    labelEn: 'Gemini 4 Carbon',
    labelZh: 'Gemini 4 Carbon',
    taskHintEn: 'Deep reasoning, UVZ critique & architecture',
    taskHintZh: '深度推理、UVZ 策略檢視與產品架構',
  },
];

export const STUDIO_COPILOT_ROLE_OPTIONS: Array<{
  id: StudioCopilotRoleId;
  labelEn: string;
  labelZh: string;
  recommendedModel: GeminiModelId;
  defaultUseSearch: boolean;
  descriptionEn: string;
  descriptionZh: string;
}> = [
  {
    id: 'strategist',
    labelEn: 'Product Strategist & UVZ Advisor',
    labelZh: '產品策略與 UVZ 顧問',
    recommendedModel: 'gemini-4-carbon',
    defaultUseSearch: false,
    descriptionEn: 'Sharpens niche positioning, UVZ contrast, Transformation Map & Product Charter.',
    descriptionZh: '協助釐清利基切角、UVZ 差異化主張、轉化路徑與產品憲章。',
  },
  {
    id: 'market_analyst',
    labelEn: 'Market & Trend Analyst (Search Grounded)',
    labelZh: '市場趨勢分析師（Google 搜尋實證）',
    recommendedModel: 'gemini-4-hydrogen',
    defaultUseSearch: true,
    descriptionEn: 'Runs Google Search Grounding on gemini-4-hydrogen with live web citations.',
    descriptionZh: '使用 gemini-4-hydrogen 結合 Google 搜尋取得即時網頁引述來源。',
  },
  {
    id: 'editor',
    labelEn: 'Curriculum & Manuscript Editor',
    labelZh: '章節架構與內容主編',
    recommendedModel: 'gemini-4-argon',
    defaultUseSearch: false,
    descriptionEn: 'Refines chapter outlines, reader exercises, workbook clarity & citation rigor.',
    descriptionZh: '優化章節大綱、實作習題、工作簿模板與文獻引用精準度。',
  },
  {
    id: 'launch_copy',
    labelEn: 'Launch, Pricing & Offer Advisor',
    labelZh: '定價策略與上市銷售顧問',
    recommendedModel: 'gemini-3.1-flash-lite',
    defaultUseSearch: false,
    descriptionEn: 'Crafts honest bundle tiers, buyer FAQ objections & launch messaging fast.',
    descriptionZh: '快速規劃誠實分級定價方案、購買常見問答與上市推廣訊息。',
  },
];

export function summarizeProjectForAiContext(project: DigitalProductProject): Record<string, unknown> {
  const selectedTopic = (project.marketResearch?.topicCandidates || []).find(
    (t) => t.id === project.marketResearch?.selectedTopicId
  );
  const selectedUvz = (project.uvz?.recommendations || []).find(
    (r) => r.id === project.uvz?.selectedOptionId
  );

  return {
    projectName: project.charter?.productTitle || project.name,
    activeStage: project.workflow?.activeStage,
    market: project.preferences?.market,
    productFormat: project.preferences?.productFormat,
    gates: {
      gateA: Boolean(project.workflow?.gates?.gateA?.isApproved),
      gateB: Boolean(project.workflow?.gates?.gateB?.isApproved),
      gateC: Boolean(project.workflow?.gates?.gateC?.isApproved),
    },
    selectedTopic: selectedTopic
      ? {
          title: selectedTopic.title,
          coreProblem: selectedTopic.coreProblem,
          bigPromise: selectedTopic.bigPromise,
        }
      : undefined,
    targetAudience: project.charter?.targetAudience || project.intake?.targetAudience,
    centralPromise: project.charter?.centralPromise || project.transformationMap?.bigPromise,
    uvzAngle: selectedUvz?.angle || project.uvz?.customStatement,
    outlineChapterCount: project.outline?.length || 0,
    verifiedReferenceCount: project.referenceLibrary?.cards?.length || 0,
  };
}

export async function testAiConnection(model: string = DEFAULT_GEMINI_MODEL) {
  const res = await apiFetch('/api/ai/connection/test', {
    method: 'POST',
    body: JSON.stringify({ model }),
  });
  return res.json();
}

export async function fetchModels(): Promise<{
  success: boolean;
  models: ModelInfo[];
  error?: string;
}> {
  const res = await apiFetch('/api/ai/models');
  return res.json();
}

export interface ChatGenerateOptions {
  provider?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  projectId?: string;
}

export async function generateTextWithAi(options: ChatGenerateOptions) {
  const messages = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: options.userPrompt });

  const res = await apiFetch('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      model: options.model || DEFAULT_GEMINI_MODEL,
      messages,
      maxTokens: options.maxTokens || 2500,
      projectId: options.projectId,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

export async function sendCopilotChat(options: {
  model: GeminiModelId;
  roleId: StudioCopilotRoleId;
  systemInstruction?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  useSearch?: boolean;
  projectContext?: Record<string, unknown> | null;
  projectId?: string;
  lang?: 'en' | 'zh';
}): Promise<CopilotChatResponse> {
  const res = await apiFetch('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      model: options.useSearch ? 'gemini-4-hydrogen' : options.model,
      roleId: options.roleId,
      systemInstruction: options.systemInstruction?.trim() || undefined,
      messages: options.messages,
      useSearch: Boolean(options.useSearch),
      projectContext: options.projectContext || undefined,
      projectId: options.projectId,
      lang: options.lang || 'en',
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

export async function runGroundedMarketSearch(options: {
  query: string;
  domainFocus?: string;
  projectId?: string;
  lang?: 'en' | 'zh';
}): Promise<CopilotChatResponse> {
  const res = await apiFetch('/api/ai/search', {
    method: 'POST',
    body: JSON.stringify({
      query: options.query,
      domainFocus: options.domainFocus,
      projectId: options.projectId,
      lang: options.lang || 'en',
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}
