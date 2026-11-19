import type { DigitalProductProject, ModelInfo, TokenSaverMode } from '../types/project.ts';
import { apiFetch } from './apiClient.ts';
import { scrubLegacyApiKeyStorage } from '../utils/projectStorage.ts';

// Clean up any legacy plaintext credentials stored in localStorage
if (typeof window !== 'undefined') {
  scrubLegacyApiKeyStorage();
}

export const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';
export const DEFAULT_OPENROUTER_MODEL = 'openrouter/auto';
export const AI_CATALOG_UPDATED_EVENT = 'dpc-ai-catalog-updated';

export type ActiveStudioProvider = 'gemini' | 'openrouter' | 'openai';

export type GeminiModelId =
  | 'gemini-3.1-flash-lite'
  | 'gemini-4-hydrogen'
  | 'gemini-4-neon'
  | 'gemini-4-argon'
  | 'gemini-4-carbon';

export type OpenAiServerModelId = 'gpt-4.1-mini' | 'gpt-4o-mini' | 'gpt-4.1';

export type { TokenSaverMode };

export function normalizeStudioProvider(provider?: string, model?: string): ActiveStudioProvider {
  if (provider === 'openrouter') return 'openrouter';
  if (provider === 'openai') return 'openai';
  if (provider === 'gemini') return 'gemini';
  if (typeof model === 'string' && /^[a-z0-9][a-z0-9._-]{0,60}\/[a-z0-9][a-z0-9._:-]{0,120}$/i.test(model.trim())) {
    return 'openrouter';
  }
  return 'gemini';
}

export function dispatchAiCatalogUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AI_CATALOG_UPDATED_EVENT));
  }
}

export const TOKEN_SAVER_MODES: Array<{
  id: TokenSaverMode;
  shortLabelEn: string;
  shortLabelZh: string;
  labelEn: string;
  labelZh: string;
  descriptionEn: string;
  descriptionZh: string;
}> = [
  {
    id: 'economy',
    shortLabelEn: 'Eco',
    shortLabelZh: '省 Token',
    labelEn: 'Economy (Token-Saver)',
    labelZh: '省 Token 模式（預設）',
    descriptionEn:
      'Minimizes hidden thinking overhead (MINIMAL on Flash Lite / LOW on Gemini 4) and enforces concise output.',
    descriptionZh:
      '降低隱藏思考 Token 消耗（Flash Lite 用 MINIMAL、Gemini 4 用 LOW），並要求精簡回覆以保留配額。',
  },
  {
    id: 'balanced',
    shortLabelEn: 'Balanced',
    shortLabelZh: '平衡',
    labelEn: 'Balanced (MEDIUM Thinking)',
    labelZh: '平衡模式（中等思考深度）',
    descriptionEn:
      'Uses LOW thinking on Flash Lite and MEDIUM on Gemini 4 for stronger multi-angle synthesis.',
    descriptionZh:
      'Flash Lite 採 LOW、Gemini 4 採 MEDIUM 思考層級，兼顧結構品質與 Token 消耗。',
  },
  {
    id: 'deep',
    shortLabelEn: 'Deep',
    shortLabelZh: '深度',
    labelEn: 'Deep Reasoning (HIGH Thinking)',
    labelZh: '深度推理（高 Token 消耗）',
    descriptionEn:
      'Uses MEDIUM on Flash Lite and HIGH on Gemini 4. Best paired with a billing-enabled API key or OpenRouter.',
    descriptionZh:
      '使用較深推理思考（Gemini 4 採 HIGH），建議搭配已啟用計費的 Gemini 金鑰或 OpenRouter 使用。',
  },
];

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
  provider: ActiveStudioProvider;
  credentialSource?: 'oauth_account' | 'server_secret';
  model: string;
  primaryModel?: string;
  fallbackUsed?: boolean;
  tokenSaverMode?: TokenSaverMode;
  content: string;
  grounding?: GroundingInfo;
  usage?: AiUsageMeta;
  error?: string;
}

export interface OpenRouterKeyInfo {
  valid: boolean;
  label?: string;
  usage?: number;
  limit?: number | null;
  limitRemaining?: number | null;
  isFreeTier?: boolean;
}

export interface OpenRouterStatusResponse {
  connected: boolean;
  source: 'oauth_account' | 'server_secret' | null;
  hint: string | null;
  updatedAt: string | null;
  keyInfo: OpenRouterKeyInfo | null;
}

export const GEMINI_TASK_MODELS: Array<{
  id: GeminiModelId;
  labelEn: string;
  labelZh: string;
  taskHintEn: string;
  taskHintZh: string;
  paidTier: boolean;
}> = [
  {
    id: 'gemini-3.1-flash-lite',
    labelEn: 'Gemini 3.1 Flash Lite (Token-Saver · High RPM)',
    labelZh: 'Gemini 3.1 Flash Lite（最省 Token · 高上限）',
    taskHintEn: 'Lowest token usage & separate quota bucket',
    taskHintZh: '最少 Token 消耗、獨立配額、快速生成與摘要',
    paidTier: false,
  },
  {
    id: 'gemini-4-hydrogen',
    labelEn: 'Gemini 4 Hydrogen (Default Studio Engine)',
    labelZh: 'Gemini 4 Hydrogen（預設平衡引擎）',
    taskHintEn: 'General synthesis & Google Search Grounding',
    taskHintZh: '均衡分析、結構化 JSON 與 Google 搜尋即時實證',
    paidTier: false,
  },
  {
    id: 'gemini-4-neon',
    labelEn: 'Gemini 4 Neon (Paid Tier)',
    labelZh: 'Gemini 4 Neon（付費層級）',
    taskHintEn: 'Stronger reasoning & writing (paid key required)',
    taskHintZh: '強化推理與長文撰寫品質（需付費金鑰）',
    paidTier: true,
  },
  {
    id: 'gemini-4-argon',
    labelEn: 'Gemini 4 Argon (Paid Tier)',
    labelZh: 'Gemini 4 Argon（付費層級）',
    taskHintEn: 'Complex interactive tasks & pedagogy (paid key)',
    taskHintZh: '複雜互動設計、教學結構與深層編修（需付費金鑰）',
    paidTier: true,
  },
  {
    id: 'gemini-4-carbon',
    labelEn: 'Gemini 4 Carbon (Paid Tier)',
    labelZh: 'Gemini 4 Carbon（付費層級）',
    taskHintEn: 'Deep reasoning, UVZ critique & QA (paid key)',
    taskHintZh: '深度推理、UVZ 策略檢視與架構 QA（需付費金鑰）',
    paidTier: true,
  },
];

export const OPENROUTER_CURATED_MODELS: ModelInfo[] = [
  {
    id: 'openrouter/auto',
    name: 'OpenRouter Auto Router (Smart Routing)',
    description: 'Routes prompts across OpenRouter providers using your connected account or key.',
    context_length: 1000000,
    pricing: { prompt: '0.00', completion: '0.00' },
    isFree: false,
    tier: 'standard',
    provider: 'openrouter',
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Google: Gemini 2.5 Flash (via OpenRouter)',
    description: 'Fast Google Gemini synthesis billed through your connected OpenRouter account.',
    context_length: 1048576,
    pricing: { prompt: '0.30', completion: '2.50' },
    isFree: false,
    tier: 'standard',
    provider: 'openrouter',
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Google: Gemini 2.5 Pro (via OpenRouter)',
    description: 'Deep reasoning Gemini model via OpenRouter when Google AI Studio free tier limits trigger.',
    context_length: 1048576,
    pricing: { prompt: '1.25', completion: '10.00' },
    isFree: false,
    tier: 'paid',
    provider: 'openrouter',
  },
  {
    id: 'openai/gpt-4.1-mini',
    name: 'OpenAI: GPT-4.1 Mini (via OpenRouter)',
    description: 'Run GPT-4.1 Mini through your OpenRouter credits without needing an OpenAI secret.',
    context_length: 1047576,
    pricing: { prompt: '0.40', completion: '1.60' },
    isFree: false,
    tier: 'paid',
    provider: 'openrouter',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'OpenAI: GPT-4o Mini (via OpenRouter)',
    description: 'Fast OpenAI model via OpenRouter for outlines, JSON drafts, and companion templates.',
    context_length: 128000,
    pricing: { prompt: '0.15', completion: '0.60' },
    isFree: false,
    tier: 'standard',
    provider: 'openrouter',
  },
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Anthropic: Claude Sonnet 4 (via OpenRouter)',
    description: 'High editorial quality & long-form structure billed to your connected OpenRouter account.',
    context_length: 200000,
    pricing: { prompt: '3.00', completion: '15.00' },
    isFree: false,
    tier: 'paid',
    provider: 'openrouter',
  },
  {
    id: 'deepseek/deepseek-chat-v3-0324',
    name: 'DeepSeek: V3 Chat (via OpenRouter)',
    description: 'Low-cost reasoning model via OpenRouter.',
    context_length: 131072,
    pricing: { prompt: '0.27', completion: '1.10' },
    isFree: false,
    tier: 'standard',
    provider: 'openrouter',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Meta: Llama 3.3 70B Instruct (Free Tier via OpenRouter)',
    description: 'Free-tier OpenRouter model for lightweight testing and fallback generation.',
    context_length: 131072,
    pricing: { prompt: '0.00', completion: '0.00' },
    isFree: true,
    tier: 'standard',
    provider: 'openrouter',
  },
];

export const OPENAI_SERVER_MODELS: Array<{
  id: OpenAiServerModelId;
  name: string;
  description: string;
  pricing: { prompt: string; completion: string };
  context_length: number;
  provider: 'openai';
  tier: 'paid';
}> = [
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini (OpenAI Server Secret)',
    description: 'Fast, low-cost OpenAI model powered by server-side OPENAI_API_KEY in Settings > Secrets.',
    context_length: 1047576,
    pricing: { prompt: '0.40', completion: '1.60' },
    provider: 'openai',
    tier: 'paid',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini (OpenAI Server Secret)',
    description: 'Lightweight OpenAI model for crisp JSON structuring and companion templates.',
    context_length: 128000,
    pricing: { prompt: '0.15', completion: '0.60' },
    provider: 'openai',
    tier: 'paid',
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1 (OpenAI Server Secret)',
    description: 'Full flagship OpenAI model for complex editorial synthesis.',
    context_length: 1047576,
    pricing: { prompt: '2.00', completion: '8.00' },
    provider: 'openai',
    tier: 'paid',
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
    recommendedModel: 'gemini-4-hydrogen',
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
  const selectedUvz = (project.uvz?.positioningOptions || []).find(
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
    uvzAngle: selectedUvz?.angle || selectedUvz?.promise || project.uvz?.buyerProblems?.[0],
    outlineChapterCount: project.outline?.length || 0,
    verifiedReferenceCount: project.referenceLibrary?.cards?.length || 0,
  };
}

async function parseApiJsonResponse<T = any>(res: Response): Promise<T> {
  const raw = await res.text();
  if (!raw.trim()) {
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} (${res.statusText || 'Empty server response'})`);
    }
    return {} as T;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    if (/starting server/i.test(raw) || raw.trim().startsWith('<')) {
      throw new Error(
        'Studio server is still starting up or restarting. Wait a few seconds and retry.'
      );
    }
    const preview = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
    throw new Error(`HTTP ${res.status}: ${preview || 'Server returned a non-JSON response.'}`);
  }
}

function buildStructuredAiError(json: any, status: number): Error {
  const err = new Error(json?.error || `HTTP ${status}`) as Error & {
    statusCode?: number;
    code?: string;
    retryAfterSeconds?: number;
  };
  err.statusCode = status;
  if (typeof json?.code === 'string') {
    err.code = json.code;
  }
  if (typeof json?.retryAfterSeconds === 'number' && Number.isFinite(json.retryAfterSeconds)) {
    err.retryAfterSeconds = json.retryAfterSeconds;
  }
  return err;
}

export async function testAiConnection(
  model: string = DEFAULT_GEMINI_MODEL,
  provider: string = 'gemini'
) {
  const normalizedProvider = normalizeStudioProvider(provider, model);
  const res = await apiFetch('/api/ai/connection/test', {
    method: 'POST',
    body: JSON.stringify({ model, provider: normalizedProvider }),
  });
  return parseApiJsonResponse(res);
}

export interface FetchModelsResponse {
  success: boolean;
  provider?: string;
  geminiConfigured?: boolean;
  openaiConfigured?: boolean;
  openrouterConnected?: boolean;
  openrouterConfigured?: boolean;
  openrouterSource?: 'oauth_account' | 'server_secret' | null;
  openrouterHint?: string | null;
  models: ModelInfo[];
  openrouterModels?: ModelInfo[];
  openaiModels?: ModelInfo[];
  error?: string;
}

export async function fetchModels(): Promise<FetchModelsResponse> {
  const res = await apiFetch('/api/ai/models');
  return parseApiJsonResponse<FetchModelsResponse>(res);
}

export async function startOpenRouterOAuth(): Promise<{
  success: boolean;
  url: string;
  callbackUrl: string;
  flowId: string;
}> {
  const res = await apiFetch('/api/auth/openrouter/start', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const json = await parseApiJsonResponse<any>(res);
  if (!res.ok || !json?.url) {
    throw buildStructuredAiError(json, res.status);
  }
  return json;
}

export async function fetchOpenRouterStatus(): Promise<OpenRouterStatusResponse> {
  const res = await apiFetch('/api/ai/openrouter/status');
  const json = await parseApiJsonResponse<OpenRouterStatusResponse>(res);
  if (!res.ok) {
    throw buildStructuredAiError(json, res.status);
  }
  return json;
}

export async function disconnectOpenRouter(): Promise<{
  success: boolean;
  disconnectedUserAccount?: boolean;
  stillConfiguredViaSecret?: boolean;
}> {
  const res = await apiFetch('/api/ai/openrouter/connection', {
    method: 'DELETE',
  });
  const json = await parseApiJsonResponse<any>(res);
  if (!res.ok) {
    throw buildStructuredAiError(json, res.status);
  }
  return json;
}

export interface ChatGenerateOptions {
  provider?: string;
  model?: string;
  tokenSaverMode?: TokenSaverMode;
  allowRateLimitFallback?: boolean;
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  projectId?: string;
  responseFormat?: 'json' | 'text';
}

export async function generateTextWithAi(options: ChatGenerateOptions) {
  const messages = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: options.userPrompt });

  const inferredFormat =
    options.responseFormat ??
    (/valid json|strictly valid json|return valid json/i.test(
      `${options.systemPrompt || ''}\n${options.userPrompt || ''}`
    )
      ? 'json'
      : 'text');

  const resolvedProvider = normalizeStudioProvider(options.provider, options.model);

  const res = await apiFetch('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      provider: resolvedProvider,
      model: options.model || (resolvedProvider === 'openrouter' ? DEFAULT_OPENROUTER_MODEL : DEFAULT_GEMINI_MODEL),
      tokenSaverMode: options.tokenSaverMode || 'economy',
      allowRateLimitFallback: options.allowRateLimitFallback ?? true,
      messages,
      maxTokens: options.maxTokens || 2500,
      projectId: options.projectId,
      responseFormat: inferredFormat,
    }),
  });

  const json = await parseApiJsonResponse<any>(res);
  if (!res.ok) {
    throw buildStructuredAiError(json, res.status);
  }
  return json;
}

export async function sendCopilotChat(options: {
  provider?: ActiveStudioProvider;
  model: string;
  tokenSaverMode?: TokenSaverMode;
  allowRateLimitFallback?: boolean;
  roleId: StudioCopilotRoleId;
  systemInstruction?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  useSearch?: boolean;
  projectContext?: Record<string, unknown> | null;
  projectId?: string;
  lang?: 'en' | 'zh';
}): Promise<CopilotChatResponse> {
  const resolvedProvider = options.useSearch
    ? 'gemini'
    : normalizeStudioProvider(options.provider, options.model);

  const res = await apiFetch('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      provider: resolvedProvider,
      model: options.useSearch ? 'gemini-4-hydrogen' : options.model,
      tokenSaverMode: options.tokenSaverMode || 'economy',
      allowRateLimitFallback: options.allowRateLimitFallback ?? true,
      roleId: options.roleId,
      systemInstruction: options.systemInstruction?.trim() || undefined,
      messages: options.messages,
      useSearch: Boolean(options.useSearch),
      projectContext: options.projectContext || undefined,
      projectId: options.projectId,
      lang: options.lang || 'en',
    }),
  });

  const json = await parseApiJsonResponse<any>(res);
  if (!res.ok) {
    throw buildStructuredAiError(json, res.status);
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

  const json = await parseApiJsonResponse<any>(res);
  if (!res.ok) {
    throw buildStructuredAiError(json, res.status);
  }
  return json;
}
