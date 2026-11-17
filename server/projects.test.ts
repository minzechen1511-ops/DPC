import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { loadConfig } from './config.ts';
import { LocalStore } from './db/localStore.ts';
import { createApiRouter } from './apiRouter.ts';
import { BLANK_PROJECT } from '../src/data/demoProject.ts';
import { hasSensitiveSecrets } from '../src/utils/projectSanitizer.ts';
import type { FirebaseTokenVerifier } from './security/firebaseToken.ts';

const testVerifier: FirebaseTokenVerifier = async (token: string) => {
  if (token === 'valid-user-token') {
    return { uid: 'uid_owner_1', email: 'owner@example.com', emailVerified: true };
  }
  throw new Error('Unauthorized');
};

async function setupServer() {
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
  return {
    baseUrl: `http://127.0.0.1:${addr.port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer valid-user-token',
};

test('workspace CRUD enforces optimistic revision conflict detection cleanly', async () => {
  const ctx = await setupServer();
  try {
    const createRes = await fetch(`${ctx.baseUrl}/api/projects`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({
        project: { ...BLANK_PROJECT, projectId: 'proj_cloud_rev', name: 'Commercial Guide' },
      }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.revision, 1);

    const patch1 = await fetch(`${ctx.baseUrl}/api/projects/proj_cloud_rev`, {
      method: 'PATCH',
      headers: AUTH_HEADERS,
      body: JSON.stringify({
        expectedRevision: 1,
        project: { ...created.project, name: 'Commercial Guide v2' },
      }),
    });
    assert.equal(patch1.status, 200);
    assert.equal((await patch1.json()).revision, 2);

    const stalePatch = await fetch(`${ctx.baseUrl}/api/projects/proj_cloud_rev`, {
      method: 'PATCH',
      headers: AUTH_HEADERS,
      body: JSON.stringify({
        expectedRevision: 1,
        project: { ...created.project, name: 'Stale Overwrite' },
      }),
    });
    assert.equal(stalePatch.status, 409);
    const conflictBody = await stalePatch.json();
    assert.equal(conflictBody.code, 'REVISION_CONFLICT');
    assert.equal(conflictBody.currentRevision, 2);
  } finally {
    await ctx.close();
  }
});

test('JSON project import strips embedded API keys & legacy desktop licenses while normalizing to Gemini', async () => {
  const ctx = await setupServer();
  try {
    const dirtyProjects = [
      {
        ...BLANK_PROJECT,
        projectId: 'legacy_1',
        name: 'Product 1',
        subscriptionState: { licenseKey: 'DPS1-FAKE-LEGACY-KEY-9999', status: 'active' },
        aiSettings: {
          ...BLANK_PROJECT.aiSettings,
          provider: 'openrouter',
          defaultModel: 'gemini-2.5-flash',
          apiKey: 'sk-or-v1-canarysecret1234567890abcdef',
          apiKeys: {
            openrouter: 'sk-or-v1-canarysecret1234567890abcdef',
            gemini: 'AIzaSyCanarySecretKey1234567890abcd',
            openai: 'sk-proj-canarysecret1234567890abcd',
            claude: 'sk-ant-canarysecret1234567890abcd',
          },
        },
        preferences: {
          ...BLANK_PROJECT.preferences,
          automationMode: 'manual_review',
          autoApproveNonCritical: true,
        },
      },
      { ...BLANK_PROJECT, projectId: 'legacy_2', name: 'Product 2' },
      { ...BLANK_PROJECT, projectId: 'legacy_3', name: 'Product 3' },
    ];

    const importRes = await fetch(`${ctx.baseUrl}/api/projects/import`, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ projects: dirtyProjects }),
    });
    assert.equal(importRes.status, 200);
    const importJson = await importRes.json();

    assert.equal(importJson.importedCount, 3);
    assert.equal(importJson.skippedCount, 0);

    const first = importJson.imported[0].data;
    assert.equal(hasSensitiveSecrets(first), false);
    assert.equal('subscriptionState' in first, false);
    assert.equal(first.aiSettings.apiKey, '');
    assert.equal(first.aiSettings.provider, 'gemini');
    assert.equal(first.aiSettings.defaultModel, 'gemini-4-hydrogen');
    assert.equal(first.preferences.autoApproveNonCritical, false);
  } finally {
    await ctx.close();
  }
});
