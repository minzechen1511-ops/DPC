import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AISettingsView} from '../components/views/AISettingsView.tsx';
import {journeyFixture} from '../../tests/gateAJourneyFixture.ts';
import {addAiUsage} from './aiSettings.ts';
import {readAiResponse} from './aiResponse.ts';
import {generationError} from './gateAJourney.ts';
import {sanitizeProjectForStorage} from './projectStorage.ts';

test('late usage recording preserves the newly selected OpenRouter provider/model through storage', () => {
  const project=journeyFixture();
  project.aiSettings={...project.aiSettings,provider:'openrouter',defaultModel:'test/model:free'};
  project.aiSettings=addAiUsage(project.aiSettings,{total_tokens:47,estimatedCostUsd:0});
  const restored=sanitizeProjectForStorage(JSON.parse(JSON.stringify(project)));
  assert.equal(restored.aiSettings.provider,'openrouter');
  assert.equal(restored.aiSettings.defaultModel,'test/model:free');
  assert.equal(restored.aiSettings.usageStats.totalTokens,47);
});

test('AI transport distinguishes a proxy HTML page, empty text and a rejected session', async () => {
  await assert.rejects(readAiResponse(new Response('<html>Starting server</html>',{headers:{'content-type':'text/html'}})),{code:'AI_BACKEND_RESPONSE'});
  await assert.rejects(readAiResponse(Response.json({content:''}),true),{code:'EMPTY_AI_RESPONSE'});
  try {await readAiResponse(Response.json({code:'AUTH_REQUIRED',error:'Sign in again'},{status:401}));assert.fail('must reject');}
  catch(err) {assert.match(generationError(err,'en'),/session or provider key/);}
  assert.match(generationError(new SyntaxError('Unexpected end of JSON input'),'en'),/draft was incomplete/);
});

test('AI settings exposes real key verification and free-model controls without an unverified account-connect button', () => {
  const html=renderToStaticMarkup(React.createElement(AISettingsView,{project:journeyFixture(),onUpdateAiSettings:()=>{},lang:'en'}));
  assert.match(html,/Save and verify key/);
  assert.match(html,/type="password"/);
  assert.match(html,/Show free OpenRouter models only/);
  assert.doesNotMatch(html,/Connect OpenRouter Account|connect-openrouter-btn/);
  assert.doesNotMatch(html,/GEMINI_API_KEY Active/);
});
