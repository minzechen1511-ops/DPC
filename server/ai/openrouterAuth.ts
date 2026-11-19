import crypto from 'crypto';
import type { Request, Response } from 'express';
import type { AppConfig } from '../config.ts';
import type { DataStore } from '../db/store.ts';
import { decryptSecret, encryptSecret, maskSecretHint } from '../security/crypto.ts';

export interface PendingOpenRouterFlow {
  uid: string;
  codeVerifier: string;
  expiresAt: number;
}

export interface OpenRouterKeyInfo {
  valid: boolean;
  label?: string;
  usage?: number;
  limit?: number | null;
  limitRemaining?: number | null;
  isFreeTier?: boolean;
}

export interface OpenRouterCatalogModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: { prompt: string; completion: string };
  isFree: boolean;
  tier: 'standard' | 'paid';
  provider: 'openrouter';
}

export const CURATED_OPENROUTER_MODELS: OpenRouterCatalogModel[] = [
  {
    id: 'openrouter/auto',
    name: 'OpenRouter Auto Router (Smart Routing)',
    description: 'Routes prompts across top available OpenRouter providers using your connected account or key.',
    context_length: 1000000,
    pricing: { prompt: '0.00', completion: '0.00' },
    isFree: false,
    tier: 'standard',
    provider: 'openrouter',
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Google: Gemini 2.5 Flash (via OpenRouter)',
    description: 'Fast Google Gemini synthesis billed through your connected OpenRouter credits.',
    context_length: 1048576,
    pricing: { prompt: '0.30', completion: '2.50' },
    isFree: false,
    tier: 'standard',
    provider: 'openrouter',
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Google: Gemini 2.5 Pro (via OpenRouter)',
    description: 'Deep reasoning Gemini model via OpenRouter when Google AI Studio free tier hits RPM limits.',
    context_length: 1048576,
    pricing: { prompt: '1.25', completion: '10.00' },
    isFree: false,
    tier: 'paid',
    provider: 'openrouter',
  },
  {
    id: 'openai/gpt-4.1-mini',
    name: 'OpenAI: GPT-4.1 Mini (via OpenRouter)',
    description: 'Fast OpenAI model via OpenRouter — spend OpenRouter credits without needing a separate OpenAI key.',
    context_length: 1047576,
    pricing: { prompt: '0.40', completion: '1.60' },
    isFree: false,
    tier: 'paid',
    provider: 'openrouter',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'OpenAI: GPT-4o Mini (via OpenRouter)',
    description: 'Lightweight OpenAI model via OpenRouter for outlines, JSON drafts, and companion templates.',
    context_length: 128000,
    pricing: { prompt: '0.15', completion: '0.60' },
    isFree: false,
    tier: 'standard',
    provider: 'openrouter',
  },
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Anthropic: Claude Sonnet 4 (via OpenRouter)',
    description: 'Editorial clarity and long-form authoring through your connected OpenRouter account.',
    context_length: 200000,
    pricing: { prompt: '3.00', completion: '15.00' },
    isFree: false,
    tier: 'paid',
    provider: 'openrouter',
  },
  {
    id: 'deepseek/deepseek-chat-v3-0324',
    name: 'DeepSeek: V3 Chat (via OpenRouter)',
    description: 'Low-cost high-throughput reasoning model via OpenRouter.',
    context_length: 131072,
    pricing: { prompt: '0.27', completion: '1.10' },
    isFree: false,
    tier: 'standard',
    provider: 'openrouter',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Meta: Llama 3.3 70B Instruct (Free Tier via OpenRouter)',
    description: 'Zero-cost OpenRouter free model tier for quick drafts and fallback testing.',
    context_length: 131072,
    pricing: { prompt: '0.00', completion: '0.00' },
    isFree: true,
    tier: 'standard',
    provider: 'openrouter',
  },
];

const OPENROUTER_MODEL_ID_REGEX = /^[a-z0-9][a-z0-9._-]{0,60}\/[a-z0-9][a-z0-9._:-]{0,120}$/i;

export function isValidOpenRouterModelId(modelId?: string): boolean {
  return OPENROUTER_MODEL_ID_REGEX.test(String(modelId || '').trim());
}

export function normalizeOpenRouterModel(requested?: string): string {
  const trimmed = String(requested || '').trim();
  if (isValidOpenRouterModelId(trimmed)) {
    return trimmed;
  }
  return 'openrouter/auto';
}

export function resolveServerOpenRouterKey(): string {
  return process.env.OPENROUTER_API_KEY?.trim() || '';
}

export function resolveContainerCallbackBaseUrl(config: AppConfig): string {
  const raw = process.env.APP_URL?.trim() || process.env.APP_BASE_URL?.trim() || config.appBaseUrl;
  return raw.replace(/\/$/, '');
}

export function cleanupExpiredOpenRouterFlows(flowStore: Map<string, PendingOpenRouterFlow>): void {
  const now = Date.now();
  for (const [key, entry] of flowStore.entries()) {
    if (!entry || entry.expiresAt <= now) {
      flowStore.delete(key);
    }
  }
}

export function startOpenRouterPkceFlow(options: {
  uid: string;
  config: AppConfig;
  flowStore: Map<string, PendingOpenRouterFlow>;
}): { url: string; callbackUrl: string; flowId: string } {
  cleanupExpiredOpenRouterFlows(options.flowStore);

  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier, 'utf8').digest('base64url');
  const flowId = crypto.randomBytes(18).toString('base64url');

  options.flowStore.set(flowId, {
    uid: options.uid,
    codeVerifier,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const baseUrl = resolveContainerCallbackBaseUrl(options.config);
  const callbackUrl = `${baseUrl}/auth/openrouter/callback/${flowId}`;
  const params = new URLSearchParams({
    callback_url: callbackUrl,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return {
    url: `https://openrouter.ai/auth?${params.toString()}`,
    callbackUrl,
    flowId,
  };
}

export async function exchangeOpenRouterAuthCode(options: {
  code: string;
  codeVerifier: string;
}): Promise<{ key: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: options.code,
        code_verifier: options.codeVerifier,
        code_challenge_method: 'S256',
      }),
      signal: controller.signal,
    });
    const payload = (await res.json().catch(() => ({}))) as any;
    const key = typeof payload?.key === 'string' ? payload.key.trim() : '';
    if (!res.ok || !key) {
      const reason =
        payload?.error?.message ||
        payload?.message ||
        `OpenRouter key exchange failed (HTTP ${res.status}).`;
      throw new Error(reason);
    }
    return { key };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchOpenRouterKeyInfo(apiKey: string): Promise<OpenRouterKeyInfo> {
  if (!apiKey.trim()) {
    return { valid: false };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/key', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      return { valid: false };
    }
    const payload = (await res.json().catch(() => ({}))) as any;
    const data = payload?.data || payload || {};
    return {
      valid: true,
      label: typeof data.label === 'string' ? data.label : undefined,
      usage: typeof data.usage === 'number' ? data.usage : undefined,
      limit: typeof data.limit === 'number' || data.limit === null ? data.limit : undefined,
      limitRemaining:
        typeof data.limit_remaining === 'number' || data.limit_remaining === null
          ? data.limit_remaining
          : undefined,
      isFreeTier: typeof data.is_free_tier === 'boolean' ? data.is_free_tier : undefined,
    };
  } catch {
    return { valid: true };
  } finally {
    clearTimeout(timer);
  }
}

let cachedCatalog: { expiresAt: number; models: OpenRouterCatalogModel[] } = {
  expiresAt: 0,
  models: [],
};

function formatPerMillion(perTokenRaw: unknown): string {
  const num = Number(perTokenRaw || 0);
  if (!Number.isFinite(num) || num <= 0) return '0.00';
  return (num * 1_000_000).toFixed(2);
}

export async function fetchOpenRouterModelCatalog(apiKey?: string): Promise<OpenRouterCatalogModel[]> {
  const now = Date.now();
  if (cachedCatalog.expiresAt > now && cachedCatalog.models.length > 0) {
    return cachedCatalog.models;
  }

  const byId = new Map<string, OpenRouterCatalogModel>();
  for (const model of CURATED_OPENROUTER_MODELS) {
    byId.set(model.id, model);
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const headers: Record<string, string> = {};
      if (apiKey?.trim()) {
        headers.Authorization = `Bearer ${apiKey.trim()}`;
      }
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers,
        signal: controller.signal,
      });
      if (res.ok) {
        const json = (await res.json().catch(() => ({}))) as any;
        const list = Array.isArray(json?.data) ? json.data : [];
        for (const item of list) {
          const id = typeof item?.id === 'string' ? item.id.trim() : '';
          if (!id || byId.has(id) || byId.size >= 45) continue;
          const promptRate = formatPerMillion(item?.pricing?.prompt);
          const completionRate = formatPerMillion(item?.pricing?.completion);
          const isFree = promptRate === '0.00' && completionRate === '0.00';
          byId.set(id, {
            id,
            name: typeof item?.name === 'string' && item.name.trim() ? item.name.trim() : id,
            description:
              typeof item?.description === 'string' && item.description.trim()
                ? item.description.trim().slice(0, 180)
                : 'Live OpenRouter catalog model.',
            context_length: Number(item?.context_length || 32768),
            pricing: { prompt: promptRate, completion: completionRate },
            isFree,
            tier: isFree ? 'standard' : 'paid',
            provider: 'openrouter',
          });
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Keep curated list cleanly when offline or catalog request times out
  }

  const merged = Array.from(byId.values());
  cachedCatalog = {
    expiresAt: Date.now() + 10 * 60 * 1000,
    models: merged,
  };
  return merged;
}

export interface ResolvedOpenRouterCredential {
  apiKey: string;
  source: 'oauth_account' | 'server_secret';
  hint: string;
  updatedAt?: string;
}

export async function resolveOpenRouterCredentialForUser(
  store: DataStore,
  config: AppConfig,
  uid?: string | null
): Promise<ResolvedOpenRouterCredential | null> {
  if (uid) {
    const saved = await store.getCredential(uid, 'openrouter');
    if (saved && saved.ciphertext && saved.iv && saved.authTag) {
      try {
        const decrypted = decryptSecret(
          { ciphertext: saved.ciphertext, iv: saved.iv, authTag: saved.authTag },
          config.credentialEncryptionKey
        ).trim();
        if (decrypted) {
          return {
            apiKey: decrypted,
            source: 'oauth_account',
            hint: saved.hint || maskSecretHint(decrypted),
            updatedAt: saved.updatedAt,
          };
        }
      } catch {
        // Ignore undecryptable legacy ciphertext cleanly so user can reconnect or fall back to Secrets
      }
    }
  }

  const envKey = resolveServerOpenRouterKey();
  if (envKey) {
    return {
      apiKey: envKey,
      source: 'server_secret',
      hint: maskSecretHint(envKey),
    };
  }

  return null;
}

function renderPopupResultHtml(options: {
  ok: boolean;
  message: string;
  payload: Record<string, unknown>;
}): string {
  const safeJson = JSON.stringify(options.payload).replace(/</g, '\\u003c');
  const escapedText = options.message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>OpenRouter Authentication</title>
  </head>
  <body style="font-family:system-ui,-apple-system,sans-serif;padding:28px;color:#0f172a;background:#f8fafc;">
    <div style="max-width:440px;margin:24px auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
      <h1 style="font-size:16px;margin:0 0 8px;">${options.ok ? 'OpenRouter Connected' : 'OpenRouter Connection Failed'}</h1>
      <p style="font-size:14px;line-height:1.5;margin:0 0 12px;color:#334155;">${escapedText}</p>
      <p style="font-size:12px;color:#64748b;margin:0;">You can close this window if it does not close automatically.</p>
    </div>
    <script>
      (function () {
        var msg = ${safeJson};
        if (window.opener) {
          window.opener.postMessage(msg, '*');
          setTimeout(function () { window.close(); }, 180);
        } else {
          setTimeout(function () { window.location.href = '/'; }, 1200);
        }
      })();
    </script>
  </body>
</html>`;
}

export function createOpenRouterCallbackHandler(deps: {
  store: DataStore;
  config: AppConfig;
  flowStore: Map<string, PendingOpenRouterFlow>;
  exchangeCodeFn?: typeof exchangeOpenRouterAuthCode;
  fetchKeyInfoFn?: typeof fetchOpenRouterKeyInfo;
}) {
  const exchangeFn = deps.exchangeCodeFn || exchangeOpenRouterAuthCode;
  const keyInfoFn = deps.fetchKeyInfoFn || fetchOpenRouterKeyInfo;

  return async (req: Request, res: Response) => {
    cleanupExpiredOpenRouterFlows(deps.flowStore);

    const code = typeof req.query?.code === 'string' ? req.query.code.trim() : '';
    const flowId = String(req.params?.flowId || req.query?.flow || '').trim();

    if (!code || !flowId) {
      return res.status(400).send(
        renderPopupResultHtml({
          ok: false,
          message: 'Missing OpenRouter authorization code or session identifier. Please retry connecting from AI Settings.',
          payload: {
            type: 'OPENROUTER_OAUTH_ERROR',
            error: 'Missing OpenRouter authorization code.',
          },
        })
      );
    }

    const pending = deps.flowStore.get(flowId);
    deps.flowStore.delete(flowId);

    if (!pending || pending.expiresAt <= Date.now()) {
      return res.status(400).send(
        renderPopupResultHtml({
          ok: false,
          message: 'OpenRouter authorization session expired. Return to AI Settings and click Connect again.',
          payload: {
            type: 'OPENROUTER_OAUTH_ERROR',
            error: 'OpenRouter authorization session expired.',
          },
        })
      );
    }

    try {
      const { key } = await exchangeFn({
        code,
        codeVerifier: pending.codeVerifier,
      });
      const encrypted = encryptSecret(
        key,
        deps.config.credentialEncryptionKey,
        deps.config.credentialKeyVersion
      );
      const hint = maskSecretHint(key);

      await deps.store.upsertCredential({
        userId: pending.uid,
        provider: 'openrouter',
        keyVersion: encrypted.keyVersion,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        hint,
        baseUrl: 'https://openrouter.ai/api/v1',
      });

      const keyInfo = await keyInfoFn(key).catch(() => ({ valid: true } as OpenRouterKeyInfo));

      return res.status(200).send(
        renderPopupResultHtml({
          ok: true,
          message: 'Your OpenRouter account key has been securely linked and encrypted on the server.',
          payload: {
            type: 'OPENROUTER_OAUTH_SUCCESS',
            provider: 'openrouter',
            hint,
            keyInfo,
          },
        })
      );
    } catch (err: any) {
      const msg = err?.message || 'Unable to exchange OpenRouter authorization code.';
      return res.status(400).send(
        renderPopupResultHtml({
          ok: false,
          message: msg,
          payload: {
            type: 'OPENROUTER_OAUTH_ERROR',
            error: msg,
          },
        })
      );
    }
  };
}
