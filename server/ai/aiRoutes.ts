import express, { Request, Response, Router } from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { AppConfig } from '../config.ts';
import { DataStore } from '../db/store.ts';
import { createRateLimiter } from '../middleware/rateLimit.ts';
import { redactSecretStrings } from '../../src/utils/projectSanitizer.ts';
import { calculateAiUsageCost } from './pricing.ts';
import { validateAiBaseUrl } from './urlGuard.ts';
import {
  buildStudioSystemInstruction,
  extractGroundingResult,
  formatGeminiUpstreamError,
  getFallbackGeminiModels,
  prepareMultiTurnConversation,
  resolveGeminiThinkingLevel,
  selectTaskGeminiModel,
  shouldFallbackGeminiError,
  STUDIO_COPILOT_ROLES,
  TokenSaverMode,
} from './geminiHelpers.ts';
import {
  CURATED_OPENROUTER_MODELS,
  fetchOpenRouterKeyInfo,
  fetchOpenRouterModelCatalog,
  isValidOpenRouterModelId,
  normalizeOpenRouterModel,
  resolveContainerCallbackBaseUrl,
  resolveOpenRouterCredentialForUser,
  resolveServerOpenRouterKey,
} from './openrouterAuth.ts';
import {
  AuthenticatedRequest,
  createRequireFirebaseAuth,
  extractBearerToken,
  FirebaseTokenVerifier,
  verifyFirebaseIdToken,
} from '../security/firebaseToken.ts';

export const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

export const ACTIVE_GEMINI_MODELS = [
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite (Token-Saver · High RPM)',
    description:
      'Lowest token usage & separate quota bucket with minimal thinking overhead. Best for avoiding rate limits.',
    context_length: 1048576,
    pricing: { prompt: '0.08', completion: '0.30' },
    isFree: false,
    tier: 'standard',
    provider: 'gemini',
  },
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen (Default Studio Engine)',
    description:
      'Balanced Gemini 4 model for structured strategy, Google Search grounding, and launch copy.',
    context_length: 1048576,
    pricing: { prompt: '0.15', completion: '0.60' },
    isFree: false,
    tier: 'standard',
    provider: 'gemini',
  },
  {
    id: 'gemini-4-neon',
    name: 'Gemini 4 Neon (Complex Synthesis · Paid Tier)',
    description:
      'Stronger reasoning and writing quality for full chapters and detailed synthesis (requires paid Gemini key).',
    context_length: 1048576,
    pricing: { prompt: '0.60', completion: '2.50' },
    isFree: false,
    tier: 'paid',
    provider: 'gemini',
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon (Complex Interactive · Paid Tier)',
    description: 'Complex interactive tasks, multi-stage synthesis, and analytical editing (requires paid Gemini key).',
    context_length: 1048576,
    pricing: { prompt: '1.25', completion: '5.00' },
    isFree: false,
    tier: 'paid',
    provider: 'gemini',
  },
  {
    id: 'gemini-4-carbon',
    name: 'Gemini 4 Carbon (Deep Reasoning · Paid Tier)',
    description: 'Deep reasoning for multi-chapter strategy, architectural critique, and high-stakes QA (requires paid Gemini key).',
    context_length: 1048576,
    pricing: { prompt: '2.50', completion: '10.00' },
    isFree: false,
    tier: 'paid',
    provider: 'gemini',
  },
] as const;

export const OPENAI_SERVER_MODELS = [
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini (OpenAI Server Secret)',
    description: 'Fast, low-cost OpenAI model powered by server-side OPENAI_API_KEY in Settings > Secrets.',
    context_length: 1047576,
    pricing: { prompt: '0.40', completion: '1.60' },
    isFree: false,
    tier: 'paid',
    provider: 'openai',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini (OpenAI Server Secret)',
    description: 'Lightweight OpenAI model for crisp JSON structuring and companion templates.',
    context_length: 128000,
    pricing: { prompt: '0.15', completion: '0.60' },
    isFree: false,
    tier: 'paid',
    provider: 'openai',
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1 (OpenAI Server Secret)',
    description: 'Full flagship OpenAI model for complex editorial synthesis.',
    context_length: 1047576,
    pricing: { prompt: '2.00', completion: '8.00' },
    isFree: false,
    tier: 'paid',
    provider: 'openai',
  },
] as const;

const ACTIVE_MODEL_IDS = new Set<string>(ACTIVE_GEMINI_MODELS.map((m) => m.id));
const OPENAI_MODEL_IDS = new Set<string>(OPENAI_SERVER_MODELS.map((m) => m.id));

const THINKING_LEVEL_ENUM_MAP = {
  MINIMAL: ThinkingLevel.MINIMAL,
  LOW: ThinkingLevel.LOW,
  MEDIUM: ThinkingLevel.MEDIUM,
  HIGH: ThinkingLevel.HIGH,
} as const;

export function normalizeGeminiModel(requested?: string): string {
  const trimmed = String(requested || '').trim();
  if (ACTIVE_MODEL_IDS.has(trimmed)) {
    return trimmed;
  }
  return DEFAULT_GEMINI_MODEL;
}

export function normalizeOpenAiModel(requested?: string): string {
  const trimmed = String(requested || '').trim();
  if (OPENAI_MODEL_IDS.has(trimmed)) {
    return trimmed;
  }
  return 'gpt-4.1-mini';
}

export function resolveServerGeminiKey(): string {
  return process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || '';
}

export function resolveServerOpenAiKey(): string {
  return process.env.OPENAI_API_KEY?.trim() || '';
}

function createServerGeminiClient(): GoogleGenAI {
  const apiKey = resolveServerGeminiKey();
  if (!apiKey) {
    const err = new Error(
      'Server Gemini token (GEMINI_API_KEY) is not configured in Settings > Secrets.'
    ) as Error & { statusCode?: number; code?: string };
    err.statusCode = 503;
    err.code = 'MISSING_SERVER_GEMINI_KEY';
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withGeminiRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = Number(err?.status || err?.statusCode || 0);
      const retryable = status === 503 || status === 502 || err?.name === 'FetchError';
      if (!retryable || attempt === 2) break;
      await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

function buildUsagePayload(
  response: any,
  modelUsed: string,
  provider: 'gemini' | 'openrouter' | 'openai' = 'gemini',
  reportedCostUsd?: number | null
) {
  const promptTokens = Number(response?.usageMetadata?.promptTokenCount || response?.usage?.prompt_tokens || 0);
  const completionTokens = Number(
    response?.usageMetadata?.candidatesTokenCount || response?.usage?.completion_tokens || 0
  );
  const totalTokens = Number(
    response?.usageMetadata?.totalTokenCount || response?.usage?.total_tokens || promptTokens + completionTokens
  );
  const rawCost =
    typeof reportedCostUsd === 'number'
      ? reportedCostUsd
      : typeof response?.usage?.cost === 'number'
      ? response.usage.cost
      : null;
  const cost = calculateAiUsageCost({
    provider,
    model: modelUsed,
    promptTokens,
    completionTokens,
    totalTokens,
    reportedCostUsd: rawCost,
  });
  return {
    promptTokens,
    completionTokens,
    totalTokens,
    cost,
    responseUsage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      estimatedCostUsd: cost.estimatedCostUsd,
      costStatus: cost.costStatus,
      pricingNote: cost.pricingNote,
    },
  };
}

async function callServerOpenAiChat(options: {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  wantsJson?: boolean;
}) {
  const apiKey = resolveServerOpenAiKey();
  if (!apiKey) {
    const err = new Error(
      'OpenAI server token (OPENAI_API_KEY) is not configured in Settings > Secrets. Consumer ChatGPT subscriptions cannot be linked via OAuth.'
    ) as Error & { statusCode?: number; code?: string };
    err.statusCode = 503;
    err.code = 'MISSING_SERVER_OPENAI_KEY';
    throw err;
  }

  const baseUrl = await validateAiBaseUrl('openai');
  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
  };
  if (options.wantsJson) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    const errMsg = payload?.error?.message || `OpenAI API request failed (HTTP ${res.status}).`;
    const err = new Error(errMsg) as Error & { statusCode?: number; code?: string };
    err.statusCode = res.status;
    err.code = res.status === 429 ? 'OPENAI_RATE_LIMIT' : 'OPENAI_REQUEST_FAILED';
    throw err;
  }
  return payload;
}

export async function callOpenRouterChat(options: {
  apiKey: string;
  appBaseUrl: string;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  wantsJson?: boolean;
  maxTokens?: number;
}) {
  const baseUrl = await validateAiBaseUrl('openrouter');

  const sendRequest = async (includeJsonFormat: boolean) => {
    const body: Record<string, unknown> = {
      model: options.model,
      messages: options.messages,
    };
    if (includeJsonFormat) {
      body.response_format = { type: 'json_object' };
    }
    if (typeof options.maxTokens === 'number' && options.maxTokens > 0) {
      body.max_tokens = options.maxTokens;
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
        'HTTP-Referer': options.appBaseUrl,
        'X-Title': 'Digital Product Studio',
      },
      body: JSON.stringify(body),
    });

    const payload = await res.json().catch(() => ({} as any));
    return { res, payload };
  };

  let { res, payload } = await sendRequest(Boolean(options.wantsJson));

  if (!res.ok && options.wantsJson && (res.status === 400 || res.status === 422)) {
    const rawMsg = String(payload?.error?.message || payload?.message || '').toLowerCase();
    if (rawMsg.includes('response_format') || rawMsg.includes('json_object') || rawMsg.includes('structured')) {
      const retried = await sendRequest(false);
      res = retried.res;
      payload = retried.payload;
    }
  }

  if (!res.ok) {
    const errMsg =
      payload?.error?.message ||
      payload?.message ||
      `OpenRouter API request failed (HTTP ${res.status}).`;
    const err = new Error(errMsg) as Error & { statusCode?: number; code?: string };
    err.statusCode = res.status;
    if (res.status === 401 || res.status === 403) {
      err.code = 'OPENROUTER_AUTH_INVALID';
    } else if (res.status === 402) {
      err.code = 'OPENROUTER_INSUFFICIENT_CREDITS';
    } else if (res.status === 429) {
      err.code = 'OPENROUTER_RATE_LIMIT';
    } else {
      err.code = 'OPENROUTER_REQUEST_FAILED';
    }
    throw err;
  }

  return payload;
}

export interface AiRouterDeps {
  store: DataStore;
  config: AppConfig;
  verifyToken?: FirebaseTokenVerifier;
  openrouterKeyInfoFn?: typeof fetchOpenRouterKeyInfo;
  openrouterModelsFn?: typeof fetchOpenRouterModelCatalog;
  openrouterChatFn?: typeof callOpenRouterChat;
}

export function createAiRouter(deps: AiRouterDeps): Router {
  const router = express.Router();
  const { store } = deps;
  const verifyFn = deps.verifyToken || verifyFirebaseIdToken;
  const requireAuth = createRequireFirebaseAuth(verifyFn);
  const keyInfoFn = deps.openrouterKeyInfoFn || fetchOpenRouterKeyInfo;
  const modelsCatalogFn = deps.openrouterModelsFn || fetchOpenRouterModelCatalog;
  const openrouterChat = deps.openrouterChatFn || callOpenRouterChat;
  const aiRateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });

  router.get('/models', async (req: Request, res: Response) => {
    const openaiConfigured = Boolean(resolveServerOpenAiKey());
    const openrouterSecretConfigured = Boolean(resolveServerOpenRouterKey());

    let uid: string | null = null;
    const token = extractBearerToken(req);
    if (token) {
      try {
        const user = await verifyFn(token);
        uid = user.uid;
      } catch {
        uid = null;
      }
    }

    const openrouterCred = await resolveOpenRouterCredentialForUser(store, deps.config, uid);
    const openrouterConnected = Boolean(openrouterCred);
    const openrouterModels = openrouterCred
      ? await modelsCatalogFn(openrouterCred.apiKey).catch(() => CURATED_OPENROUTER_MODELS)
      : CURATED_OPENROUTER_MODELS;

    return res.json({
      success: true,
      provider: 'gemini',
      geminiConfigured: Boolean(resolveServerGeminiKey()),
      openaiConfigured,
      openrouterConnected,
      openrouterConfigured: openrouterSecretConfigured || openrouterConnected,
      openrouterSource: openrouterCred?.source || null,
      openrouterHint: openrouterCred?.hint || null,
      models: ACTIVE_GEMINI_MODELS,
      openrouterModels,
      openaiModels: openaiConfigured ? OPENAI_SERVER_MODELS : [],
      roles: Object.values(STUDIO_COPILOT_ROLES),
    });
  });

  router.get('/roles', (_req: Request, res: Response) => {
    return res.json({
      success: true,
      roles: Object.values(STUDIO_COPILOT_ROLES),
    });
  });

  router.get('/openrouter/status', requireAuth, async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const cred = await resolveOpenRouterCredentialForUser(store, deps.config, uid);
    if (!cred) {
      return res.json({
        connected: false,
        source: null,
        hint: null,
        updatedAt: null,
        keyInfo: null,
      });
    }

    const keyInfo = await keyInfoFn(cred.apiKey);
    return res.json({
      connected: keyInfo.valid !== false,
      source: cred.source,
      hint: cred.hint,
      updatedAt: cred.updatedAt || null,
      keyInfo,
    });
  });

  router.delete('/openrouter/connection', requireAuth, async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    await store.deleteCredential(uid, 'openrouter');
    return res.json({
      success: true,
      disconnectedUserAccount: true,
      stillConfiguredViaSecret: Boolean(resolveServerOpenRouterKey()),
    });
  });

  router.get('/usage', requireAuth, async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [daily, recent] = await Promise.all([
      store.getDailyUsageCounts(uid, since),
      store.listUsageEvents(uid, 25),
    ]);
    return res.json({
      daily,
      recent,
    });
  });

  router.post('/connection/test', requireAuth, aiRateLimit, async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const requestedProvider = String(req.body?.provider || 'gemini').trim().toLowerCase();
    const requestedModel = String(req.body?.model || '').trim();

    if (
      requestedProvider === 'openrouter' ||
      (requestedProvider !== 'gemini' &&
        requestedProvider !== 'openai' &&
        isValidOpenRouterModelId(requestedModel))
    ) {
      const cred = await resolveOpenRouterCredentialForUser(store, deps.config, uid);
      if (!cred) {
        return res.status(401).json({
          success: false,
          code: 'OPENROUTER_NOT_CONNECTED',
          error:
            'OpenRouter is not connected. Sign in with your OpenRouter account in AI Settings or configure OPENROUTER_API_KEY in Settings > Secrets.',
        });
      }

      try {
        const modelUsed = normalizeOpenRouterModel(requestedModel);
        const keyInfo = await keyInfoFn(cred.apiKey);
        if (keyInfo.valid === false) {
          return res.status(401).json({
            success: false,
            code: 'OPENROUTER_AUTH_INVALID',
            error:
              'Connected OpenRouter key was rejected or revoked. Reconnect your OpenRouter account in AI Settings.',
          });
        }
        await openrouterChat({
          apiKey: cred.apiKey,
          appBaseUrl: resolveContainerCallbackBaseUrl(deps.config),
          model: modelUsed,
          messages: [{ role: 'user', content: 'Reply with OK.' }],
          maxTokens: 16,
        });
        return res.json({
          success: true,
          provider: 'openrouter',
          source: cred.source,
          credentialSource: cred.source,
          model: modelUsed,
          keyInfo,
          message: `Connected & verified token spend on OpenRouter (${modelUsed} via ${
            cred.source === 'oauth_account' ? 'Connected OpenRouter Account' : 'OPENROUTER_API_KEY Secret'
          }).`,
        });
      } catch (err: any) {
        const statusCode = Number(err?.statusCode || 502);
        return res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 502).json({
          success: false,
          code: err?.code || 'OPENROUTER_TEST_FAILED',
          error: redactSecretStrings(err?.message || 'OpenRouter connection test failed.'),
        });
      }
    }

    if (requestedProvider === 'openai' || OPENAI_MODEL_IDS.has(requestedModel)) {
      try {
        const modelUsed = normalizeOpenAiModel(requestedModel);
        await callServerOpenAiChat({
          model: modelUsed,
          messages: [{ role: 'user', content: 'Reply with OK.' }],
        });
        return res.json({
          success: true,
          provider: 'openai',
          model: modelUsed,
          message: `Connected cleanly to server-side OpenAI engine (${modelUsed}).`,
        });
      } catch (err: any) {
        const statusCode = Number(err?.statusCode || 502);
        return res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 502).json({
          success: false,
          code: err?.code || 'OPENAI_TEST_FAILED',
          error: redactSecretStrings(err?.message || 'OpenAI connection test failed.'),
        });
      }
    }

    try {
      const ai = createServerGeminiClient();
      const modelUsed = normalizeGeminiModel(requestedModel);
      const levelName = resolveGeminiThinkingLevel(modelUsed, 'economy');
      await withGeminiRetry(() =>
        ai.models.generateContent({
          model: modelUsed,
          contents: 'Reply with OK.',
          config: {
            thinkingConfig: { thinkingLevel: THINKING_LEVEL_ENUM_MAP[levelName] },
          },
        })
      );
      return res.json({
        success: true,
        provider: 'gemini',
        model: modelUsed,
        message: `Connected & verified token spend on Google Gemini (${modelUsed}).`,
      });
    } catch (err: any) {
      const formatted = formatGeminiUpstreamError(err, 'Gemini connection test failed.');
      return res.status(formatted.statusCode).json({
        success: false,
        code: formatted.code,
        retryAfterSeconds: formatted.retryAfterSeconds,
        error: redactSecretStrings(formatted.message),
      });
    }
  });

  router.post('/chat', requireAuth, aiRateLimit, async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) {
      return res.status(400).json({ error: 'Provide between 1 and 60 messages.' });
    }

    const projectId = typeof req.body?.projectId === 'string' ? req.body.projectId : null;
    const useSearch = Boolean(req.body?.useSearch);
    const roleId = typeof req.body?.roleId === 'string' ? req.body.roleId : undefined;
    const customSystemInstruction =
      typeof req.body?.systemInstruction === 'string' ? req.body.systemInstruction : undefined;
    const projectContext =
      req.body?.projectContext && typeof req.body.projectContext === 'object'
        ? req.body.projectContext
        : typeof req.body?.projectContext === 'string'
        ? req.body.projectContext
        : null;
    const lang = req.body?.lang === 'zh' ? 'zh' : 'en';
    const tokenSaverMode: TokenSaverMode =
      req.body?.tokenSaverMode === 'balanced' || req.body?.tokenSaverMode === 'deep'
        ? req.body.tokenSaverMode
        : 'economy';
    const allowRateLimitFallback = req.body?.allowRateLimitFallback !== false;

    const wantsJson = req.body?.responseFormat === 'json' && !useSearch;
    const requestedProvider = String(req.body?.provider || 'gemini').trim().toLowerCase();
    const requestedModelRaw = String(req.body?.model || '').trim();
    const useOpenRouter =
      !useSearch &&
      (requestedProvider === 'openrouter' ||
        (requestedProvider !== 'gemini' &&
          requestedProvider !== 'openai' &&
          isValidOpenRouterModelId(requestedModelRaw)));
    const useOpenAi =
      !useSearch && !useOpenRouter && (requestedProvider === 'openai' || OPENAI_MODEL_IDS.has(requestedModelRaw));

    const prepared = prepareMultiTurnConversation(messages);
    const systemInstruction = buildStudioSystemInstruction({
      roleId,
      customSystemInstruction,
      inlineSystemPrompts: prepared.inlineSystemPrompts,
      projectContext,
      useSearch,
      lang,
      tokenSaverMode,
    });

    if (useOpenRouter) {
      const cred = await resolveOpenRouterCredentialForUser(store, deps.config, uid);
      if (!cred) {
        return res.status(401).json({
          code: 'OPENROUTER_NOT_CONNECTED',
          error:
            'OpenRouter is not connected. Connect your OpenRouter account in AI Settings or configure OPENROUTER_API_KEY in Settings > Secrets.',
        });
      }

      const openRouterModel = normalizeOpenRouterModel(requestedModelRaw);
      try {
        const openRouterMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
        if (systemInstruction) {
          openRouterMessages.push({ role: 'system', content: systemInstruction });
        }
        for (const msg of messages) {
          if (!msg || typeof msg.content !== 'string' || msg.role === 'system') continue;
          const mappedRole = msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user';
          openRouterMessages.push({ role: mappedRole, content: msg.content.trim().slice(0, 16000) });
        }

        const payload = await openrouterChat({
          apiKey: cred.apiKey,
          appBaseUrl: resolveContainerCallbackBaseUrl(deps.config),
          model: openRouterModel,
          messages: openRouterMessages,
          wantsJson,
        });
        const content = String(payload?.choices?.[0]?.message?.content || '').trim();
        if (!content) {
          return res.status(502).json({
            code: 'EMPTY_OPENROUTER_RESPONSE',
            error: 'OpenRouter returned an empty response. Retry your request.',
          });
        }
        const actualModel = typeof payload?.model === 'string' && payload.model.trim() ? payload.model.trim() : openRouterModel;
        const { promptTokens, completionTokens, totalTokens, cost, responseUsage } = buildUsagePayload(
          payload,
          actualModel,
          'openrouter'
        );
        await store.recordUsageEvent({
          userId: uid,
          projectId,
          eventKind: 'ai_chat',
          provider: 'openrouter',
          model: actualModel,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCostUsd: cost.estimatedCostUsd,
          costStatus: cost.costStatus,
        });
        return res.json({
          success: true,
          provider: 'openrouter',
          credentialSource: cred.source,
          model: actualModel,
          primaryModel: openRouterModel,
          fallbackUsed: false,
          tokenSaverMode,
          content,
          usage: responseUsage,
        });
      } catch (err: any) {
        const statusCode = Number(err?.statusCode || 502);
        return res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 502).json({
          code: err?.code || 'OPENROUTER_REQUEST_FAILED',
          error: redactSecretStrings(err?.message || 'OpenRouter request failed.'),
        });
      }
    }

    if (useOpenAi) {
      const openAiModel = normalizeOpenAiModel(requestedModelRaw);
      try {
        const openAiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
        if (systemInstruction) {
          openAiMessages.push({ role: 'system', content: systemInstruction });
        }
        for (const msg of messages) {
          if (!msg || typeof msg.content !== 'string' || msg.role === 'system') continue;
          const mappedRole = msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user';
          openAiMessages.push({ role: mappedRole, content: msg.content.trim().slice(0, 16000) });
        }
        const payload = await callServerOpenAiChat({
          model: openAiModel,
          messages: openAiMessages,
          wantsJson,
        });
        const content = String(payload?.choices?.[0]?.message?.content || '').trim();
        if (!content) {
          return res.status(502).json({
            code: 'EMPTY_OPENAI_RESPONSE',
            error: 'OpenAI returned an empty response. Retry your request.',
          });
        }
        const { promptTokens, completionTokens, totalTokens, cost, responseUsage } = buildUsagePayload(
          payload,
          openAiModel,
          'openai'
        );
        await store.recordUsageEvent({
          userId: uid,
          projectId,
          eventKind: 'ai_chat',
          provider: 'openai',
          model: openAiModel,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCostUsd: cost.estimatedCostUsd,
          costStatus: cost.costStatus,
        });
        return res.json({
          success: true,
          provider: 'openai',
          model: openAiModel,
          primaryModel: openAiModel,
          fallbackUsed: false,
          content,
          usage: responseUsage,
        });
      } catch (err: any) {
        const statusCode = Number(err?.statusCode || 502);
        return res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 502).json({
          code: err?.code || 'OPENAI_REQUEST_FAILED',
          error: redactSecretStrings(err?.message || 'OpenAI request failed.'),
        });
      }
    }

    const primaryModel = selectTaskGeminiModel({
      requestedModel: requestedModelRaw,
      useSearch,
      allowedModels: ACTIVE_MODEL_IDS,
      fallbackModel: DEFAULT_GEMINI_MODEL,
    });

    try {
      const ai = createServerGeminiClient();

      const executeWithModel = async (targetModel: string) => {
        const levelName = resolveGeminiThinkingLevel(targetModel, tokenSaverMode);
        const chatConfig: Record<string, unknown> = {
          thinkingConfig: { thinkingLevel: THINKING_LEVEL_ENUM_MAP[levelName] },
        };
        if (systemInstruction) {
          chatConfig.systemInstruction = systemInstruction;
        }
        if (useSearch) {
          chatConfig.tools = [{ googleSearch: {} }];
        } else if (wantsJson) {
          chatConfig.responseMimeType = 'application/json';
        }

        return withGeminiRetry(async () => {
          if (prepared.history.length > 0) {
            const chat = ai.chats.create({
              model: targetModel,
              history: prepared.history,
              config: chatConfig,
            });
            return chat.sendMessage({ message: prepared.latestMessage });
          }
          return ai.models.generateContent({
            model: targetModel,
            contents: prepared.latestMessage,
            config: chatConfig,
          });
        });
      };

      const candidateChain = [
        primaryModel,
        ...getFallbackGeminiModels(primaryModel, { useSearch, allowRateLimitFallback }),
      ];

      let modelUsed = primaryModel;
      let fallbackUsed = false;
      let response: any = null;
      let lastErr: any = null;

      for (let i = 0; i < candidateChain.length; i++) {
        const candidate = candidateChain[i];
        try {
          response = await executeWithModel(candidate);
          modelUsed = candidate;
          fallbackUsed = candidate !== primaryModel;
          break;
        } catch (err: any) {
          lastErr = err;
          const hasMoreCandidates = i < candidateChain.length - 1;
          if (!hasMoreCandidates || !shouldFallbackGeminiError(err)) {
            throw err;
          }
        }
      }

      if (!response && lastErr) {
        throw lastErr;
      }

      const content = (response?.text || '').trim();
      if (!content) {
        return res.status(502).json({
          code: 'EMPTY_GEMINI_RESPONSE',
          error: 'Gemini returned an empty response. Retry your request.',
        });
      }

      const grounding = extractGroundingResult(response);
      const { promptTokens, completionTokens, totalTokens, cost, responseUsage } = buildUsagePayload(
        response,
        modelUsed,
        'gemini'
      );

      await store.recordUsageEvent({
        userId: uid,
        projectId,
        eventKind: 'ai_chat',
        provider: 'gemini',
        model: modelUsed,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd: cost.estimatedCostUsd,
        costStatus: cost.costStatus,
      });

      return res.json({
        success: true,
        provider: 'gemini',
        model: modelUsed,
        primaryModel,
        fallbackUsed,
        tokenSaverMode,
        content,
        grounding,
        usage: responseUsage,
      });
    } catch (err: any) {
      const formatted = formatGeminiUpstreamError(err, 'Gemini AI generation failed.');
      return res.status(formatted.statusCode).json({
        code: formatted.code,
        retryAfterSeconds: formatted.retryAfterSeconds,
        error: redactSecretStrings(formatted.message),
      });
    }
  });

  router.post('/search', requireAuth, aiRateLimit, async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (query.length < 3 || query.length > 600) {
      return res.status(400).json({ error: 'Provide a search research query between 3 and 600 characters.' });
    }

    const projectId = typeof req.body?.projectId === 'string' ? req.body.projectId : null;
    const domainFocus = typeof req.body?.domainFocus === 'string' ? req.body.domainFocus.trim() : '';
    const lang = req.body?.lang === 'zh' ? 'zh' : 'en';
    const modelUsed = 'gemini-4-hydrogen';

    const systemInstruction = [
      'You are executing live Google Search Grounding for Digital Product Studio market research.',
      'Synthesize current public marketplace demand, buyer pain points, content gaps, price anchors, and competing digital product formats found via Google Search.',
      'Be explicit about limitations: search summaries do NOT substitute for manual verification of primary chart ranks.',
      lang === 'zh'
        ? 'Respond in Traditional Chinese (繁體中文) with concise structured sections.'
        : 'Respond in English with concise structured sections: Market Signal Summary, Buyer Pain Points & Gaps, Format & Positioning Ideas.',
    ].join(' ');

    const fullPrompt = domainFocus
      ? `Niche domain focus: ${domainFocus}\n\nResearch query: ${query}`
      : query;

    try {
      const ai = createServerGeminiClient();
      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: modelUsed,
          contents: fullPrompt,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            tools: [{ googleSearch: {} }],
          },
        })
      );

      const content = response.text || '';
      const grounding = extractGroundingResult(response);
      const { promptTokens, completionTokens, totalTokens, cost, responseUsage } = buildUsagePayload(
        response,
        modelUsed
      );

      await store.recordUsageEvent({
        userId: uid,
        projectId,
        eventKind: 'ai_chat',
        provider: 'gemini',
        model: modelUsed,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd: cost.estimatedCostUsd,
        costStatus: cost.costStatus,
      });

      return res.json({
        success: true,
        provider: 'gemini',
        model: modelUsed,
        content,
        grounding,
        usage: responseUsage,
      });
    } catch (err: any) {
      const formatted = formatGeminiUpstreamError(err, 'Google Search Grounding request failed.');
      return res.status(formatted.statusCode).json({
        code: formatted.code,
        retryAfterSeconds: formatted.retryAfterSeconds,
        error: redactSecretStrings(formatted.message),
      });
    }
  });

  return router;
}

