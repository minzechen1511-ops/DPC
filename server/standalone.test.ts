import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createApiRouter } from './apiRouter.ts';
import { resolveDefaultDataDir } from './config.ts';
import { BLANK_PROJECT } from '../src/data/demoProject.ts';
import type { FirebaseTokenVerifier } from './security/firebaseToken.ts';

const testVerifier: FirebaseTokenVerifier = async (token: string) => {
  if (token === 'token-alice') {
    return { uid: 'uid_alice', email: 'alice@example.com', emailVerified: true, name: 'Alice' };
  }
  if (token === 'token-bob') {
    return { uid: 'uid_bob', email: 'bob@example.com', emailVerified: true, name: 'Bob' };
  }
  throw new Error('Invalid test Firebase token');
};

function withTestServer(fn: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use('/api', createApiRouter({ verifyToken: testVerifier }));

  return new Promise<void>((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', async () => {
      try {
        const addr = server.address();
        assert.ok(addr && typeof addr === 'object');
        await fn(`http://127.0.0.1:${addr.port}`);
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
}

test('resolveDefaultDataDir falls back to .local-data when a Windows drive path is supplied on non-Windows', () => {
  if (process.platform !== 'win32') {
    const resolved = resolveDefaultDataDir({ DPC_DATA_DIR: 'D:\\Digital Product Studio' });
    assert.equal(resolved, path.resolve(process.cwd(), '.local-data'));
  }
});

test('desktop .exe endpoints and legacy SaaS endpoints are removed (404)', async () => {
  await withTestServer(async (baseUrl) => {
    const removedEndpoints: Array<{ method: string; path: string; body?: unknown }> = [
      { method: 'GET', path: '/api/desktop/status' },
      { method: 'GET', path: '/api/desktop/download-exe' },
      { method: 'POST', path: '/api/desktop/install-shortcut', body: {} },
      { method: 'POST', path: '/api/desktop/shutdown', body: {} },
      { method: 'GET', path: '/api/me' },
      { method: 'GET', path: '/api/billing/plans' },
      { method: 'POST', path: '/api/auth/sandbox/login', body: { email: 'test@example.com' } },
      { method: 'PUT', path: '/api/ai/credentials/openrouter', body: { apiKey: 'test' } },
    ];

    for (const ep of removedEndpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: ep.body ? { 'Content-Type': 'application/json' } : undefined,
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      assert.equal(res.status, 404, `${ep.method} ${ep.path} must return 404`);
    }
  });
});

test('/api/health reports commercial-cloud mode with Gemini engine', async () => {
  await withTestServer(async (baseUrl) => {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.status, 'ok');
    assert.equal(health.mode, 'commercial-cloud');
    assert.equal(health.app, 'Digital Product Studio');
    assert.equal(health.authRequired, true);
    assert.deepEqual(health.supportedProviders, ['gemini']);
    assert.equal(health.defaultModel, 'gemini-4-hydrogen');
  });
});

test('protected AI, project, and job routes reject unauthenticated requests (401) and work with Firebase auth', async () => {
  await withTestServer(async (baseUrl) => {
    const unauthProj = await fetch(`${baseUrl}/api/projects`);
    assert.equal(unauthProj.status, 401);

    const unauthAi = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
    });
    assert.equal(unauthAi.status, 401);

    // Authenticated Alice creates project & exports author_review ZIP statelessly
    const res = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-alice',
      },
      body: JSON.stringify({
        project: { ...BLANK_PROJECT, projectId: 'proj_cloud_1', name: 'Commercial Book 1' },
      }),
    });
    assert.equal(res.status, 201);

    // Multi-user isolation: Bob cannot read Alice's project
    const bobRead = await fetch(`${baseUrl}/api/projects/proj_cloud_1`, {
      headers: { Authorization: 'Bearer token-bob' },
    });
    assert.equal(bobRead.status, 404);

    // Stateless export-bundle works cleanly for authenticated user
    const zipRes = await fetch(`${baseUrl}/api/projects/export-bundle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-alice',
      },
      body: JSON.stringify({
        mode: 'author_review',
        project: { ...BLANK_PROJECT, projectId: 'proj_cloud_1', name: 'Commercial Book 1' },
      }),
    });
    assert.equal(zipRes.status, 200);
    assert.equal(zipRes.headers.get('content-type'), 'application/zip');

    // Guided workflow jobs require auth and work cleanly
    const jobRes = await fetch(`${baseUrl}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-alice',
      },
      body: JSON.stringify({ projectId: 'proj_cloud_1', mode: 'guided_until_gate', stopAtGate: 'gateA' }),
    });
    assert.equal(jobRes.status, 201);
    const jobData = await jobRes.json();
    assert.equal(jobData.job.status, 'waiting_gate');
  });
});

test('repository has removed desktop packaging artifacts cleanly', () => {
  const removedPaths = [
    'server/desktop',
    'scripts/package-exe.mjs',
    'build-exe',
    'server/standalone-entry.ts',
  ];

  for (const rel of removedPaths) {
    assert.equal(fs.existsSync(path.resolve(process.cwd(), rel)), false, `${rel} should be removed`);
  }
});
