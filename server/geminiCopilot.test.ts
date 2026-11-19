import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { loadConfig } from './config.ts';
import { LocalStore } from './db/localStore.ts';
import { createApiRouter } from './apiRouter.ts';
import {
  buildStudioSystemInstruction,
  extractGroundingResult,
  prepareMultiTurnConversation,
  resolveRolePreset,
  selectTaskGeminiModel,
} from './ai/geminiHelpers.ts';
import { ACTIVE_GEMINI_MODELS } from './ai/aiRoutes.ts';
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

test('buildStudioSystemInstruction composes role preset, search rule, language, and project context', () => {
  const preset = resolveRolePreset('market_analyst');
  assert.equal(preset.recommendedModel, 'gemini-4-hydrogen');
  assert.equal(preset.defaultUseSearch, true);

  const instruction = buildStudioSystemInstruction({
    roleId: 'strategist',
    useSearch: true,
    lang: 'zh',
    projectContext: { projectName: 'Freelance Pricing Toolkit', activeStage: 'uvz' },
  });

  assert.match(instruction, /Digital Product Studio strategist/i);
  assert.match(instruction, /Google Search Grounding is active/i);
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

test('AI endpoints expose roles and validate Google Search Grounding requests', async () => {
  const prevGemini = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

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
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await store.close();
  }
});
