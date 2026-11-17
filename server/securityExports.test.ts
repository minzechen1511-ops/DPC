import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { loadConfig } from './config.ts';
import { LocalStore } from './db/localStore.ts';
import { createApiRouter } from './apiRouter.ts';
import { validateAiBaseUrl } from './ai/urlGuard.ts';
import { calculateAiUsageCost } from './ai/pricing.ts';
import { normalizeGeminiModel } from './ai/aiRoutes.ts';
import { BLANK_PROJECT } from '../src/data/demoProject.ts';
import { buildLearningBundle } from '../src/utils/learningBundle.ts';
import { hasSensitiveSecrets } from '../src/utils/projectSanitizer.ts';
import type { FirebaseTokenVerifier } from './security/firebaseToken.ts';

const testVerifier: FirebaseTokenVerifier = async (token: string) => {
  if (token === 'valid-user-token') {
    return { uid: 'uid_sec_1', email: 'sec@example.com', emailVerified: true };
  }
  throw new Error('Unauthorized');
};

async function setupServer(envOverrides: NodeJS.ProcessEnv = {}) {
  const config = loadConfig({
    NODE_ENV: 'test',
    CREDENTIAL_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    ...envOverrides,
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
  return {
    baseUrl: `http://127.0.0.1:${addr.port}`,
    store,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer valid-user-token',
};

test('AI URL guard blocks SSRF targets and active Gemini catalog excludes deprecated models', async () => {
  await assert.rejects(() =>
    validateAiBaseUrl('gemini', 'http://generativelanguage.googleapis.com', { skipDnsLookup: true })
  );
  await assert.rejects(() =>
    validateAiBaseUrl('gemini', 'https://169.254.169.254/latest', { skipDnsLookup: true })
  );
  await assert.rejects(() =>
    validateAiBaseUrl('gemini', 'https://127.0.0.1:8080/v1', { skipDnsLookup: true })
  );
  const okUrl = await validateAiBaseUrl('gemini', 'https://generativelanguage.googleapis.com/', {
    skipDnsLookup: true,
  });
  assert.equal(okUrl, 'https://generativelanguage.googleapis.com');

  assert.equal(normalizeGeminiModel('openrouter/free'), 'gemini-4-hydrogen');
  assert.equal(normalizeGeminiModel('gemini-2.5-flash'), 'gemini-4-hydrogen');
  assert.equal(normalizeGeminiModel('gemini-1.5-pro'), 'gemini-4-hydrogen');
  assert.equal(normalizeGeminiModel('gemini-4-argon'), 'gemini-4-argon');
});

test('buyer bundle keeps Gate C check, guided jobs protect locked chapters, and missing server GEMINI_API_KEY reports 503 honestly', async () => {
  const prevGemini = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const ctx = await setupServer();
  try {
    const modelsRes = await fetch(`${ctx.baseUrl}/api/ai/models`);
    assert.equal(modelsRes.status, 200);
    const modelsJson = await modelsRes.json();
    assert.equal(modelsJson.provider, 'gemini');
    assert.ok(modelsJson.models.some((m: any) => m.id === 'gemini-4-hydrogen'));

    const chatNoKey = await fetch(`${ctx.baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ model: 'gemini-4-hydrogen', messages: [{ role: 'user', content: 'hi' }] }),
    });
    assert.equal(chatNoKey.status, 503);
    const noKeyJson = await chatNoKey.json();
    assert.equal(noKeyJson.code, 'MISSING_SERVER_GEMINI_KEY');

    await fetch(`${ctx.baseUrl}/api/projects`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({
        project: { ...BLANK_PROJECT, projectId: 'proj_std_gate', name: 'Incomplete Product' },
      }),
    });

    const gateFail = await fetch(`${ctx.baseUrl}/api/projects/export-bundle`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({
        mode: 'buyer_bundle',
        project: { ...BLANK_PROJECT, projectId: 'proj_std_gate', name: 'Incomplete Product' },
      }),
    });
    assert.equal(gateFail.status, 422);
    assert.equal((await gateFail.json()).code, 'GATE_CHECK_FAILED');

    const jobRes = await fetch(`${ctx.baseUrl}/api/jobs`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ projectId: 'proj_std_gate', mode: 'guided_until_gate', stopAtGate: 'gateA' }),
    });
    assert.equal(jobRes.status, 201);
    const jobData = await jobRes.json();
    assert.equal(jobData.job.status, 'waiting_gate');

    const pauseRes = await fetch(`${ctx.baseUrl}/api/jobs/${jobData.job.id}/pause`, {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-user-token' },
    });
    assert.equal((await pauseRes.json()).job.status, 'paused');

    const resumeRes = await fetch(`${ctx.baseUrl}/api/jobs/${jobData.job.id}/resume`, {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-user-token' },
    });
    assert.equal((await resumeRes.json()).job.status, 'waiting_gate');

    const cancelRes = await fetch(`${ctx.baseUrl}/api/jobs/${jobData.job.id}/cancel`, {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-user-token' },
    });
    assert.equal((await cancelRes.json()).job.status, 'cancelled');
  } finally {
    if (prevGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevGemini;
    await ctx.close();
  }
});

test('pricing accounting estimates Gemini 4 rates and ZIP bundle never leaks canary secrets', async () => {
  const flashCost = calculateAiUsageCost({
    provider: 'gemini',
    model: 'gemini-4-hydrogen',
    promptTokens: 1000,
    completionTokens: 1000,
  });
  assert.equal(flashCost.costStatus, 'estimated');
  assert.ok(flashCost.estimatedCostUsd > 0);

  const unknownCost = calculateAiUsageCost({
    provider: 'gemini',
    model: 'vendor/custom-unlisted-model',
    totalTokens: 2000,
  });
  assert.equal(unknownCost.costStatus, 'unknown');

  const dirtyProject = {
    ...BLANK_PROJECT,
    aiSettings: {
      ...BLANK_PROJECT.aiSettings,
      apiKey: 'sk-or-v1-canarysecret1234567890abcdef',
      apiKeys: {
        openrouter: 'sk-or-v1-canarysecret1234567890abcdef',
        gemini: 'AIzaSyCanarySecretKey1234567890abcd',
        openai: 'sk-proj-canarysecret1234567890abcd',
        claude: 'sk-ant-canarysecret1234567890abcd',
      },
    },
  };

  const { zip } = await buildLearningBundle(dirtyProject);
  const backupJson = await zip.file('publisher/project-backup.json')?.async('string');
  assert.ok(backupJson);
  assert.equal(hasSensitiveSecrets(backupJson), false);
});
