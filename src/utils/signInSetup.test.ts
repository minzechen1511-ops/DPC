import test from 'node:test';
import assert from 'node:assert/strict';
import { checkGeminiConfiguration, checkSignInDomain, isAuthorizedSignInUrl } from './signInSetup.ts';

test('Firebase domains distinguish loopback names and ignore URL ports', () => {
  assert.equal(isAuthorizedSignInUrl('http://127.0.0.1:3102/', ['localhost']), false);
  assert.equal(isAuthorizedSignInUrl('http://127.0.0.1:3102/', ['127.0.0.1']), true);
  assert.equal(isAuthorizedSignInUrl('http://localhost:3102/', ['localhost']), true);
  assert.equal(isAuthorizedSignInUrl('https://preview.studio.example/', ['studio.example']), true);
  assert.equal(isAuthorizedSignInUrl('https://evil-studio.example/', ['studio.example']), false);
  assert.equal(isAuthorizedSignInUrl('https://studio.example.attacker.example/', ['studio.example']), false);
  assert.equal(isAuthorizedSignInUrl('file:///studio.example', ['studio.example']), false);
});

const respond = (body: unknown, status = 200) =>
  (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

test('live allowlist diagnostic reports a missing loopback domain without rewriting configuration', async () => {
  assert.equal(await checkSignInDomain('public-config-key', 'http://127.0.0.1:3102/',
    respond({ authorizedDomains: ['studio.firebaseapp.com'] })), 'unauthorized');
  assert.equal(await checkSignInDomain('public-config-key', 'http://127.0.0.1:3102/',
    respond({ authorizedDomains: ['127.0.0.1'] })), 'authorized');
});

test('failed or malformed diagnostics remain unknown rather than asserting access or readiness', async () => {
  for (const request of [respond({}, 403), respond({}), respond({ authorizedDomains: [null] }),
    (async () => { throw new Error('offline'); }) as typeof fetch]) {
    assert.equal(await checkSignInDomain('key', 'http://localhost/', request), 'unknown');
  }
  assert.equal(await checkGeminiConfiguration(respond({ geminiConfigured: true })), true);
  assert.equal(await checkGeminiConfiguration(respond({ geminiConfigured: false })), false);
  assert.equal(await checkGeminiConfiguration(respond({})), null);
  assert.equal(await checkGeminiConfiguration(respond({}, 503)), null);
});
