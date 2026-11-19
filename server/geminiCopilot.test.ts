import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { loadConfig } from './config.ts';
import { LocalStore } from './db/localStore.ts';
import { createApiRouter } from './apiRouter.ts';
import {
  buildStudioSystemInstruction,
  extractGroundingResult,
  getFallbackGeminiModels,
  prepareMultiTurnConversation,
  resolveGeminiThinkingLevel,
  resolveRolePreset,
  selectTaskGeminiModel,
  shouldFallbackGeminiError,
} from './ai/geminiHelpers.ts';
import { ACTIVE_GEMINI_MODELS } from './ai/aiRoutes.ts';
import { DEMO_PROJECT } from '../src/data/demoProject.ts';
import { sanitizeProjectForExport } from '../src/utils/projectSanitizer.ts';
import type { FirebaseTokenVerifier } from './security/firebaseToken.ts';

const testVerifier: FirebaseTokenVerifier = async (token: string) => {
  if (token === 'valid-user-token') {
    return { uid: 'uid_ai_test', email: 'ai-test@example.com', emailVerified: true };
  }
  throw new Error('Unauthorized');
};

test('selectTaskGeminiModel switches to gemini-4-hydrogen when Google Search Grounding is active', () => {
  const allowed = new Set<string>(ACTIVE_GEMINI_MODELS.map((m) => m.id));

  assert.equal(
    selectTaskGeminiModel({ requestedModel: 'gemini-4-carbon', useSearch: true, allowedModels: allowed }),
    'gemini-4-hydrogen'
  );
  assert.equal(
    selectTaskGeminiModel({ requestedModel: 'gemini-4-carbon', useSearch: false, allowedModels: allowed }),
    'gemini-4-carbon'
  );
  assert.equal(
    selectTaskGeminiModel({ requestedModel: 'gemini-4-neon', useSearch: false, allowedModels: allowed }),
    'gemini-4-neon'
  );
  assert.equal(
    selectTaskGeminiModel({ requestedModel: 'gemini-4-argon', useSearch: false, allowedModels: allowed }),
    'gemini-4-argon'
  );
  assert.equal(
    selectTaskGeminiModel({ requestedModel: 'gemini-3.1-flash-lite', useSearch: false, allowedModels: allowed }),
    'gemini-3.1-flash-lite'
  );
  assert.equal(
    selectTaskGeminiModel({ requestedModel: 'legacy-unknown-model', useSearch: false, allowedModels: allowed }),
    'gemini-4-hydrogen'
  );
});

test('resolveGeminiThinkingLevel and getFallbackGeminiModels protect token budget and quota buckets', () => {
  assert.equal(resolveGeminiThinkingLevel('gemini-3.1-flash-lite', 'economy'), 'MINIMAL');
  assert.equal(resolveGeminiThinkingLevel('gemini-3.1-flash-lite', 'balanced'), 'LOW');
  assert.equal(resolveGeminiThinkingLevel('gemini-3.1-flash-lite', 'deep'), 'MEDIUM');

  // Gemini 4 models reject MINIMAL and use LOW/MEDIUM/HIGH
  assert.equal(resolveGeminiThinkingLevel('gemini-4-hydrogen', 'economy'), 'LOW');
  assert.equal(resolveGeminiThinkingLevel('gemini-4-hydrogen', 'balanced'), 'MEDIUM');
  assert.equal(resolveGeminiThinkingLevel('gemini-4-hydrogen', 'deep'), 'HIGH');
  assert.equal(resolveGeminiThinkingLevel('gemini-4-neon', 'economy'), 'LOW');

  assert.deepEqual(getFallbackGeminiModels('gemini-4-hydrogen'), ['gemini-3.1-flash-lite']);
  assert.deepEqual(getFallbackGeminiModels('gemini-3.1-flash-lite'), ['gemini-4-hydrogen']);
  assert.deepEqual(getFallbackGeminiModels('gemini-4-carbon'), ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']);
  assert.deepEqual(getFallbackGeminiModels('gemini-4-hydrogen', { allowRateLimitFallback: false }), []);
  assert.deepEqual(getFallbackGeminiModels('gemini-4-hydrogen', { useSearch: true }), []);

  assert.equal(shouldFallbackGeminiError({ status: 429, message: 'RESOURCE_EXHAUSTED' }), true);
  assert.equal(shouldFallbackGeminiError({ message: 'Quota exceeded for metric' }), true);
  assert.equal(shouldFallbackGeminiError({ status: 401, message: 'Invalid API key' }), false);
});

test('prepareMultiTurnConversation produces strict alternating history and extracts latest message', () => {
  const prepared = prepareMultiTurnConversation([
    { role: 'system', content: 'Follow product quality rules.' },
    { role: 'assistant', content: 'Leading orphan assistant message should be dropped.' },
    { role: 'user', content: 'First question' },
    { role: 'user', content: 'Clarification on first question' },
    { role: 'assistant', content: 'First detailed answer' },
    { role: 'user', content: 'Follow-up turn' },
  ]);

  assert.deepEqual(prepared.inlineSystemPrompts, ['Follow product quality rules.']);
  assert.equal(prepared.latestMessage, 'Follow-up turn');
  assert.deepEqual(prepared.history, [
    { role: 'user', parts: [{ text: 'First question\n\nClarification on first question' }] },
    { role: 'model', parts: [{ text: 'First detailed answer' }] },
  ]);
});

test('buildStudioSystemInstruction composes role preset, search rule, token-saver directive, language, and project context', () => {
  const preset = resolveRolePreset('market_analyst');
  assert.equal(preset.recommendedModel, 'gemini-4-hydrogen');
  assert.equal(preset.defaultUseSearch, true);

  const instruction = buildStudioSystemInstruction({
    roleId: 'strategist',
    useSearch: true,
    lang: 'zh',
    tokenSaverMode: 'economy',
    projectContext: { projectName: 'Freelance Pricing Toolkit', activeStage: 'uvz' },
  });

  assert.match(instruction, /Digital Product Studio strategist/i);
  assert.match(instruction, /Google Search Grounding is active/i);
  assert.match(instruction, /Token-Saver mode is active/i);
  assert.match(instruction, /Traditional Chinese/);
  assert.match(instruction, /Freelance Pricing Toolkit/);
});

test('extractGroundingResult deduplicates web chunk URLs and preserves queries safely', () => {
  const empty = extractGroundingResult({});
  assert.equal(empty.grounded, false);
  assert.deepEqual(empty.sources, []);

  const parsed = extractGroundingResult({
    candidates: [
      {
        groundingMetadata: {
          webSearchQueries: ['notion template pricing 2026', 'notion template pricing 2026'],
          groundingChunks: [
            { web: { uri: 'https://www.example.com/pricing-guide', title: '2026 Pricing Guide' } },
            { web: { uri: 'https://www.example.com/pricing-guide', title: 'Duplicate URL' } },
            { web: { uri: 'https://research.org/report', title: 'Creator Economy Report' } },
          ],
        },
      },
    ],
  });

  assert.equal(parsed.grounded, true);
  assert.deepEqual(parsed.webSearchQueries, ['notion template pricing 2026']);
  assert.equal(parsed.sources.length, 2);
  assert.deepEqual(parsed.sources[0], {
    title: '2026 Pricing Guide',
    url: 'https://www.example.com/pricing-guide',
    domain: 'example.com',
  });
});

test('sanitizeProjectForExport preserves Token-Saver preferences, valid OpenAI server models, and zeroes secret fields', () => {
  const withOpenAi = sanitizeProjectForExport({
    ...DEMO_PROJECT,
    aiSettings: {
      ...DEMO_PROJECT.aiSettings,
      provider: 'openai',
      defaultModel: 'gpt-4.1-mini',
      tokenSaverMode: 'balanced',
      allowRateLimitFallback: false,
      apiKey: 'sk-proj-testsecretkey1234567890',
      baseUrl: 'https://custom.invalid',
    },
  });

  assert.equal(withOpenAi.aiSettings.provider, 'openai');
  assert.equal(withOpenAi.aiSettings.defaultModel, 'gpt-4.1-mini');
  assert.equal(withOpenAi.aiSettings.tokenSaverMode, 'balanced');
  assert.equal(withOpenAi.aiSettings.allowRateLimitFallback, false);
  assert.equal(withOpenAi.aiSettings.apiKey, '');
  assert.equal(withOpenAi.aiSettings.baseUrl, '');

  const mismatchedProvider = sanitizeProjectForExport({
    ...DEMO_PROJECT,
    aiSettings: {
      ...DEMO_PROJECT.aiSettings,
      provider: 'openai',
      defaultModel: 'gemini-4-neon',
    },
  });

  assert.equal(mismatchedProvider.aiSettings.provider, 'gemini');
  assert.equal(mismatchedProvider.aiSettings.defaultModel, 'gemini-4-neon');

  const withOpenRouter = sanitizeProjectForExport({
    ...DEMO_PROJECT,
    aiSettings: {
      ...DEMO_PROJECT.aiSettings,
      provider: 'openrouter',
      defaultModel: 'google/gemini-2.5-flash',
      apiKey: 'sk-or-v1-should-never-leak-to-project',
      baseUrl: 'https://evil.invalid',
    },
  });

  assert.equal(withOpenRouter.aiSettings.provider, 'openrouter');
  assert.equal(withOpenRouter.aiSettings.defaultModel, 'google/gemini-2.5-flash');
  assert.equal(withOpenRouter.aiSettings.apiKey, '');
  assert.equal(withOpenRouter.aiSettings.baseUrl, '');
});

test('AI endpoints expose roles, OpenAI secret status, and validate Google Search Grounding requests', async () => {
  const prevGemini = process.env.GEMINI_API_KEY;
  const prevOpenAi = process.env.OPENAI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const config = loadConfig({
    NODE_ENV: 'test',
    CREDENTIAL_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  });
  const store = new LocalStore(':memory:');
  await store.init();
  const app = express();
  app.use(express.json());
  app.use('/api', createApiRouter({ store, config, verifyToken: testVerifier }));
  const server = await new Promise<import('http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address() as import('net').AddressInfo;
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    const healthWithoutOpenAi = await fetch(`${baseUrl}/api/health`).then((r) => r.json());
    assert.equal(healthWithoutOpenAi.openaiConfigured, false);
    assert.deepEqual(healthWithoutOpenAi.supportedProviders, ['gemini']);

    const modelsWithoutOpenAi = await fetch(`${baseUrl}/api/ai/models`).then((r) => r.json());
    assert.equal(modelsWithoutOpenAi.openaiConfigured, false);
    assert.deepEqual(modelsWithoutOpenAi.openaiModels, []);
    assert.ok(modelsWithoutOpenAi.models.some((m: any) => m.id === 'gemini-4-neon'));

    process.env.OPENAI_API_KEY = 'sk-proj-dummytestvalueforhealthcheckonly';
    const healthWithOpenAi = await fetch(`${baseUrl}/api/health`).then((r) => r.json());
    assert.equal(healthWithOpenAi.openaiConfigured, true);
    assert.deepEqual(healthWithOpenAi.supportedProviders, ['gemini', 'openai']);

    const modelsWithOpenAi = await fetch(`${baseUrl}/api/ai/models`).then((r) => r.json());
    assert.equal(modelsWithOpenAi.openaiConfigured, true);
    assert.ok(modelsWithOpenAi.openaiModels.some((m: any) => m.id === 'gpt-4.1-mini'));

    const rolesRes = await fetch(`${baseUrl}/api/ai/roles`);
    assert.equal(rolesRes.status, 200);
    const rolesJson = await rolesRes.json();
    assert.ok(rolesJson.roles.some((r: any) => r.id === 'strategist'));
    assert.ok(rolesJson.roles.some((r: any) => r.id === 'market_analyst'));

    const invalidSearch = await fetch(`${baseUrl}/api/ai/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-user-token',
      },
      body: JSON.stringify({ query: 'ab' }),
    });
    assert.equal(invalidSearch.status, 400);

    const noKeySearch = await fetch(`${baseUrl}/api/ai/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-user-token',
      },
      body: JSON.stringify({ query: 'Notion template buyer demand 2026' }),
    });
    assert.equal(noKeySearch.status, 503);
    const noKeyBody = await noKeySearch.json();
    assert.equal(noKeyBody.code, 'MISSING_SERVER_GEMINI_KEY');
  } finally {
    if (prevGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevGemini;
    if (prevOpenAi === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevOpenAi;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await store.close();
  }
});

test('balanced JSON extractor handles trailing notes and resolveServerGeminiKey accepts GOOGLE_API_KEY fallback', async () => {
  const { parseUvzSynthesisResponse } = await import('../src/utils/strategySynthesis.ts');
  const { resolveServerGeminiKey } = await import('./ai/aiRoutes.ts');

  const sampleWithNotes = [
    '```json',
    JSON.stringify({
      buyerProblems: ['Lack of structure'],
      potentialSolutions: ['Guided system'],
      differentiationOpportunities: ['Checklist-driven'],
      positioningOptions: [1, 2, 3].map((i) => ({
        name: `Angle ${i}`,
        angle: `Distinct angle ${i}`,
        targetPersona: `Buyer ${i}`,
        promise: `Outcome ${i}`,
        isRecommended: i === 1,
      })),
    }),
    '```',
    'Note: {trailing brace note} ignored safely.',
  ].join('\n');

  const parsed = parseUvzSynthesisResponse(sampleWithNotes);
  assert.equal(parsed.positioningOptions.length, 3);

  const prevGemini = process.env.GEMINI_API_KEY;
  const prevGoogle = process.env.GOOGLE_API_KEY;
  try {
    delete process.env.GEMINI_API_KEY;
    process.env.GOOGLE_API_KEY = 'google-fallback-key';
    assert.equal(resolveServerGeminiKey(), 'google-fallback-key');
    process.env.GEMINI_API_KEY = 'primary-gemini-key';
    assert.equal(resolveServerGeminiKey(), 'primary-gemini-key');
  } finally {
    if (prevGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevGemini;
    if (prevGoogle === undefined) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = prevGoogle;
  }

  const { isProxyStartingHtml } = await import('../src/services/apiClient.ts');
  assert.equal(
    isProxyStartingHtml(
      'text/html; charset=utf-8',
      '<html><style>:root { color-scheme: light dark; }</style><body>Starting Server...</body></html>'
    ),
    true
  );
  assert.equal(isProxyStartingHtml('application/json', '{"success":true}'), false);
});

test('OpenRouter OAuth PKCE flow, encrypted token storage, live spend verification, chat routing, disconnect, and server secret fallback', async () => {
  const prevOpenRouter = process.env.OPENROUTER_API_KEY;
  const prevAppUrl = process.env.APP_URL;
  delete process.env.OPENROUTER_API_KEY;
  process.env.APP_URL = 'https://studio-preview.example.run.app';

  const { createOpenRouterCallbackHandler } = await import('./ai/openrouterAuth.ts');

  const config = loadConfig({
    NODE_ENV: 'test',
    APP_BASE_URL: 'https://studio-preview.example.run.app',
    CREDENTIAL_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  });
  const store = new LocalStore(':memory:');
  await store.init();
  const openrouterFlowStore = new Map();

  const observedChatCalls: Array<{ apiKey: string; model: string; messages: any[] }> = [];

  const app = express();
  app.use(express.json());
  app.get(
    ['/auth/openrouter/callback/:flowId', '/auth/openrouter/callback'],
    createOpenRouterCallbackHandler({
      store,
      config,
      flowStore: openrouterFlowStore,
      exchangeCodeFn: async ({ code, codeVerifier }) => {
        assert.equal(code, 'oauth_code_123');
        assert.ok(codeVerifier.length >= 20);
        return { key: 'sk-or-v1-oauth-account-token-9876543210' };
      },
      fetchKeyInfoFn: async (apiKey) => ({
        valid: apiKey === 'sk-or-v1-oauth-account-token-9876543210' || apiKey === 'sk-or-v1-server-secret-token-11223344',
        label: 'Test Account Key',
        usage: 1.25,
        limit: 10,
        limitRemaining: 8.75,
        isFreeTier: false,
      }),
    })
  );
  app.use(
    '/api',
    createApiRouter({
      store,
      config,
      verifyToken: testVerifier,
      openrouterFlowStore,
      openrouterKeyInfoFn: async (apiKey) => ({
        valid: true,
        label: apiKey.includes('oauth') ? 'OAuth User Account' : 'Server Secret',
        usage: 1.25,
        limit: 10,
        limitRemaining: 8.75,
        isFreeTier: false,
      }),
      openrouterModelsFn: async () => [
        {
          id: 'openrouter/auto',
          name: 'OpenRouter Auto Router',
          description: 'Smart routing',
          context_length: 1000000,
          pricing: { prompt: '0.00', completion: '0.00' },
          isFree: false,
          tier: 'standard',
          provider: 'openrouter',
        },
        {
          id: 'google/gemini-2.5-flash',
          name: 'Google: Gemini 2.5 Flash (via OpenRouter)',
          description: 'Gemini via OpenRouter',
          context_length: 1048576,
          pricing: { prompt: '0.30', completion: '2.50' },
          isFree: false,
          tier: 'standard',
          provider: 'openrouter',
        },
      ],
      openrouterChatFn: async (opts) => {
        observedChatCalls.push({ apiKey: opts.apiKey, model: opts.model, messages: opts.messages });
        return {
          model: opts.model,
          choices: [{ message: { content: 'OK from OpenRouter' } }],
          usage: {
            prompt_tokens: 18,
            completion_tokens: 12,
            total_tokens: 30,
            cost: 0.00042,
          },
        };
      },
    })
  );

  const server = await new Promise<import('http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address() as import('net').AddressInfo;
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    // 1. Unauthenticated /start rejected
    const unauthStart = await fetch(`${baseUrl}/api/auth/openrouter/start`, { method: 'POST' });
    assert.equal(unauthStart.status, 401);

    // 2. Authenticated PKCE start generates S256 OpenRouter URL & callback URL
    const startRes = await fetch(`${baseUrl}/api/auth/openrouter/start`, {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-user-token' },
    });
    assert.equal(startRes.status, 200);
    const startJson = await startRes.json();
    assert.ok(startJson.flowId);
    assert.match(startJson.url, /^https:\/\/openrouter\.ai\/auth\?/);
    assert.match(startJson.url, /code_challenge_method=S256/);
    assert.equal(
      startJson.callbackUrl,
      `https://studio-preview.example.run.app/auth/openrouter/callback/${startJson.flowId}`
    );

    // 3. OAuth callback exchanges code, encrypts credential in DB, and posts success message
    const cbRes = await fetch(`${baseUrl}/auth/openrouter/callback/${startJson.flowId}?code=oauth_code_123`);
    assert.equal(cbRes.status, 200);
    const cbHtml = await cbRes.text();
    assert.match(cbHtml, /OPENROUTER_OAUTH_SUCCESS/);

    // Stored credential must be encrypted ciphertext, never plaintext
    const storedCred = await store.getCredential('uid_ai_test', 'openrouter');
    assert.ok(storedCred?.ciphertext);
    assert.ok(!storedCred.ciphertext.includes('sk-or-v1'));

    // 4. Models & status report oauth_account connected and balance info
    const modelsJson = await fetch(`${baseUrl}/api/ai/models`, {
      headers: { Authorization: 'Bearer valid-user-token' },
    }).then((r) => r.json());
    assert.equal(modelsJson.openrouterConnected, true);
    assert.equal(modelsJson.openrouterSource, 'oauth_account');
    assert.ok(modelsJson.openrouterModels.some((m: any) => m.id === 'google/gemini-2.5-flash'));

    const statusJson = await fetch(`${baseUrl}/api/ai/openrouter/status`, {
      headers: { Authorization: 'Bearer valid-user-token' },
    }).then((r) => r.json());
    assert.equal(statusJson.connected, true);
    assert.equal(statusJson.source, 'oauth_account');
    assert.equal(statusJson.keyInfo.limitRemaining, 8.75);

    // 5. Connection test verifies live key & executes minimal chat spend
    const testJson = await fetch(`${baseUrl}/api/ai/connection/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-user-token',
      },
      body: JSON.stringify({ provider: 'openrouter', model: 'openrouter/auto' }),
    }).then((r) => r.json());
    assert.equal(testJson.success, true);
    assert.equal(testJson.provider, 'openrouter');
    assert.equal(testJson.credentialSource, 'oauth_account');
    assert.equal(observedChatCalls[0].apiKey, 'sk-or-v1-oauth-account-token-9876543210');

    // 6. Chat request uses decrypted OAuth account key and records cost & provider
    const chatJson = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-user-token',
      },
      body: JSON.stringify({
        provider: 'openrouter',
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: 'Draft 3 bullet takeaways.' }],
      }),
    }).then((r) => r.json());
    assert.equal(chatJson.success, true);
    assert.equal(chatJson.provider, 'openrouter');
    assert.equal(chatJson.credentialSource, 'oauth_account');
    assert.equal(chatJson.content, 'OK from OpenRouter');
    assert.equal(chatJson.usage.estimatedCostUsd, 0.00042);

    const usageEvents = await store.listUsageEvents('uid_ai_test', 5);
    assert.equal(usageEvents[0].provider, 'openrouter');
    assert.equal(usageEvents[0].model, 'google/gemini-2.5-flash');
    assert.equal(usageEvents[0].estimatedCostUsd, 0.00042);

    // 7. Disconnect removes OAuth account key
    const delJson = await fetch(`${baseUrl}/api/ai/openrouter/connection`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer valid-user-token' },
    }).then((r) => r.json());
    assert.equal(delJson.success, true);
    assert.equal(delJson.disconnectedUserAccount, true);

    const afterDisconnectStatus = await fetch(`${baseUrl}/api/ai/openrouter/status`, {
      headers: { Authorization: 'Bearer valid-user-token' },
    }).then((r) => r.json());
    assert.equal(afterDisconnectStatus.connected, false);

    // 8. OPENROUTER_API_KEY Secret acts as clean fallback when account is not linked
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-server-secret-token-11223344';
    const healthSecret = await fetch(`${baseUrl}/api/health`).then((r) => r.json());
    assert.equal(healthSecret.openrouterConfigured, true);
    assert.deepEqual(healthSecret.supportedProviders, ['gemini', 'openrouter']);

    const secretChat = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-user-token',
      },
      body: JSON.stringify({
        provider: 'openrouter',
        model: 'openrouter/auto',
        messages: [{ role: 'user', content: 'Hello from secret fallback.' }],
      }),
    }).then((r) => r.json());
    assert.equal(secretChat.success, true);
    assert.equal(secretChat.credentialSource, 'server_secret');
    assert.equal(observedChatCalls[observedChatCalls.length - 1].apiKey, 'sk-or-v1-server-secret-token-11223344');
  } finally {
    if (prevOpenRouter === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = prevOpenRouter;
    if (prevAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = prevAppUrl;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await store.close();
  }
});
