import express, { Request, Response, Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { AppConfig } from '../config.ts';
import { DataStore } from '../db/store.ts';
import { createRateLimiter } from '../middleware/rateLimit.ts';
import { redactSecretStrings } from '../../src/utils/projectSanitizer.ts';
import { calculateAiUsageCost } from './pricing.ts';
import {
  buildStudioSystemInstruction,
  extractGroundingResult,
  prepareMultiTurnConversation,
  selectTaskGeminiModel,
  STUDIO_COPILOT_ROLES,
} from './geminiHelpers.ts';
import {
  AuthenticatedRequest,
  createRequireFirebaseAuth,
  FirebaseTokenVerifier,
} from '../security/firebaseToken.ts';

export const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

export const ACTIVE_GEMINI_MODELS = [
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen (Default Studio Engine)',
    description:
      'Recommended all-around Gemini 4 model for general tasks, Google Search grounding, and launch copy.',
    context_length: 1048576,
    pricing: { prompt: '0.15', completion: '0.60' },
    isFree: false,
    tier: 'standard',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite (Fast Low-Latency)',
    description: 'High-throughput lightweight model for fast tasks, quick outlines, checklists, and summaries.',
    context_length: 1048576,
    pricing: { prompt: '0.08', completion: '0.30' },
    isFree: false,
    tier: 'standard',
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon (Complex Interactive · Paid Tier)',
    description: 'Complex interactive tasks, multi-stage synthesis, and analytical editing (requires paid Gemini key).',
    context_length: 1048576,
    pricing: { prompt: '1.25', completion: '5.00' },
    isFree: false,
    tier: 'paid',
  },
  {
    id: 'gemini-4-carbon',
    name: 'Gemini 4 Carbon (Deep Reasoning · Paid Tier)',
    description: 'Deep reasoning for multi-chapter strategy, architectural critique, and high-stakes QA (requires paid Gemini key).',
    context_length: 1048576,
    pricing: { prompt: '2.50', completion: '10.00' },
    isFree: false,
    tier: 'paid',
  },
] as const;

const ACTIVE_MODEL_IDS = new Set<string>(ACTIVE_GEMINI_MODELS.map((m) => m.id));

export function normalizeGeminiModel(requested?: string): string {
  const trimmed = String(requested || '').trim();
  if (ACTIVE_MODEL_IDS.has(trimmed)) {
    return trimmed;
  }
  return DEFAULT_GEMINI_MODEL;
}

function createServerGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
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

function buildUsagePayload(response: any, modelUsed: string) {
  const promptTokens = Number(response?.usageMetadata?.promptTokenCount || 0);
  const completionTokens = Number(response?.usageMetadata?.candidatesTokenCount || 0);
  const totalTokens = Number(response?.usageMetadata?.totalTokenCount || promptTokens + completionTokens);
  const cost = calculateAiUsageCost({
    provider: 'gemini',
    model: modelUsed,
    promptTokens,
    completionTokens,
    totalTokens,
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

export function createAiRouter(deps: {
  store: DataStore;
  config: AppConfig;
  verifyToken?: FirebaseTokenVerifier;
}): Router {
  const router = express.Router();
  const { store } = deps;
  const requireAuth = createRequireFirebaseAuth(deps.verifyToken);
  const aiRateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });

  router.get('/models', (_req: Request, res: Response) => {
    return res.json({
      success: true,
      provider: 'gemini',
      models: ACTIVE_GEMINI_MODELS,
      roles: Object.values(STUDIO_COPILOT_ROLES),
    });
  });

  router.get('/roles', (_req: Request, res: Response) => {
    return res.json({
      success: true,
      roles: Object.values(STUDIO_COPILOT_ROLES),
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
    try {
      const ai = createServerGeminiClient();
      const modelUsed = normalizeGeminiModel(req.body?.model);
      await withGeminiRetry(() =>
        ai.models.generateContent({
          model: modelUsed,
          contents: 'Reply with OK.',
        })
      );
      return res.json({
        success: true,
        provider: 'gemini',
        model: modelUsed,
        message: `Connected to server Gemini engine (${modelUsed}).`,
      });
    } catch (err: any) {
      const statusCode = Number(err?.statusCode || err?.status || 400);
      const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 502;
      return res.status(safeStatus).json({
        success: false,
        code: err?.code || 'GEMINI_CONNECTION_ERROR',
        error: redactSecretStrings(err?.message || 'Gemini connection test failed.'),
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

    const modelUsed = selectTaskGeminiModel({
      requestedModel: req.body?.model,
      useSearch,
      allowedModels: ACTIVE_MODEL_IDS,
      fallbackModel: DEFAULT_GEMINI_MODEL,
    });

    try {
      const ai = createServerGeminiClient();
      const prepared = prepareMultiTurnConversation(messages);
      const systemInstruction = buildStudioSystemInstruction({
        roleId,
        customSystemInstruction,
        inlineSystemPrompts: prepared.inlineSystemPrompts,
        projectContext,
        useSearch,
        lang,
      });

      const chatConfig: Record<string, unknown> = {};
      if (systemInstruction) {
        chatConfig.systemInstruction = systemInstruction;
      }
      if (useSearch) {
        chatConfig.tools = [{ googleSearch: {} }];
      }

      const response = await withGeminiRetry(async () => {
        if (prepared.history.length > 0) {
          const chat = ai.chats.create({
            model: modelUsed,
            history: prepared.history,
            config: Object.keys(chatConfig).length > 0 ? chatConfig : undefined,
          });
          return chat.sendMessage({ message: prepared.latestMessage });
        }
        return ai.models.generateContent({
          model: modelUsed,
          contents: prepared.latestMessage,
          config: Object.keys(chatConfig).length > 0 ? chatConfig : undefined,
        });
      });

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
      const statusCode = Number(err?.statusCode || err?.status || 502);
      const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 502;
      return res.status(safeStatus).json({
        code: err?.code || 'GEMINI_REQUEST_FAILED',
        error: redactSecretStrings(err?.message || 'Gemini AI generation failed.'),
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
      const statusCode = Number(err?.statusCode || err?.status || 502);
      const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 502;
      return res.status(safeStatus).json({
        code: err?.code || 'GEMINI_SEARCH_FAILED',
        error: redactSecretStrings(err?.message || 'Google Search Grounding request failed.'),
      });
    }
  });

  return router;
}

