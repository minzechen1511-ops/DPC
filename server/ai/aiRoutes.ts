import express, { Request, Response, Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { AppConfig } from '../config.ts';
import { DataStore } from '../db/store.ts';
import { createRateLimiter } from '../middleware/rateLimit.ts';
import { redactSecretStrings } from '../../src/utils/projectSanitizer.ts';
import { calculateAiUsageCost } from './pricing.ts';
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
      'Recommended all-around Gemini 4 model for market synthesis, chapter drafting, and launch copy.',
    context_length: 1048576,
    pricing: { prompt: '0.15', completion: '0.60' },
    isFree: false,
    tier: 'standard',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite (Fast Low-Latency)',
    description: 'High-throughput lightweight model for quick outlines, checklists, and summaries.',
    context_length: 1048576,
    pricing: { prompt: '0.08', completion: '0.30' },
    isFree: false,
    tier: 'standard',
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon (Advanced Reasoning · Paid Tier)',
    description: 'Complex synthesis, technical frameworks, and analytical editing (requires paid Gemini key).',
    context_length: 1048576,
    pricing: { prompt: '1.25', completion: '5.00' },
    isFree: false,
    tier: 'paid',
  },
  {
    id: 'gemini-4-carbon',
    name: 'Gemini 4 Carbon (Deep Architecture · Paid Tier)',
    description: 'Maximum reasoning depth for multi-chapter synthesis and high-stakes QA (requires paid Gemini key).',
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
      'GEMINI_API_KEY is missing. Configure it in the server environment (.env locally or deployment secrets), then restart/redeploy. Google sign-in does not supply a Gemini API key.'
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
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return res.status(400).json({ error: 'Provide between 1 and 50 messages.' });
    }

    const projectId = typeof req.body?.projectId === 'string' ? req.body.projectId : null;
    const modelUsed = normalizeGeminiModel(req.body?.model);

    try {
      const ai = createServerGeminiClient();
      const systemInstruction = messages
        .filter((m: any) => m?.role === 'system' && typeof m?.content === 'string')
        .map((m: any) => m.content)
        .join('\n\n')
        .trim();

      const promptText = messages
        .filter((m: any) => m?.role !== 'system')
        .map((m: any) => `${String(m.role || 'user').toUpperCase()}: ${String(m.content || '')}`)
        .join('\n\n');

      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: modelUsed,
          contents: promptText || 'Continue.',
          config: systemInstruction ? { systemInstruction } : undefined,
        })
      );

      const content = response.text || '';
      const promptTokens = Number((response as any).usageMetadata?.promptTokenCount || 0);
      const completionTokens = Number((response as any).usageMetadata?.candidatesTokenCount || 0);
      const totalTokens = Number(
        (response as any).usageMetadata?.totalTokenCount || promptTokens + completionTokens
      );

      const cost = calculateAiUsageCost({
        provider: 'gemini',
        model: modelUsed,
        promptTokens,
        completionTokens,
        totalTokens,
      });

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
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          estimatedCostUsd: cost.estimatedCostUsd,
          costStatus: cost.costStatus,
          pricingNote: cost.pricingNote,
        },
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

  return router;
}
