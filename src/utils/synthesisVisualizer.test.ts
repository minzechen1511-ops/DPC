import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  formatElapsedClock,
  formatLocalizedRateLimitError,
  getActiveSynthesisStepIndex,
  getSynthesisVisualSteps,
  parseGeminiRateLimitDetails,
} from './synthesisVisualizer.ts';
import { SynthesisProgressVisualizer } from '../components/SynthesisProgressVisualizer.tsx';
import { AiEngineQuickControl } from '../components/AiEngineQuickControl.tsx';
import { AiRateLimitNotice } from '../components/AiRateLimitNotice.tsx';
import { DEMO_PROJECT } from '../data/demoProject.ts';
import { generationError } from './gateAJourney.ts';
import { formatGeminiUpstreamError } from '../../server/ai/geminiHelpers.ts';

test('stage synthesis visual steps cover stage 3 UVZ and stage 4 Transformation Map with bilingual copy', () => {
  const uvzSteps = getSynthesisVisualSteps('uvz');
  const mapFullSteps = getSynthesisVisualSteps('transformation_full');
  const mapTitleSteps = getSynthesisVisualSteps('transformation_titles');

  assert.equal(uvzSteps.length, 4);
  assert.equal(mapFullSteps.length, 4);
  assert.equal(mapTitleSteps.length, 3);

  for (const step of [...uvzSteps, ...mapFullSteps, ...mapTitleSteps]) {
    assert.ok(step.labelEn.trim().length > 0);
    assert.ok(step.labelZh.trim().length > 0);
    assert.ok(step.detailEn.trim().length > 0);
    assert.ok(step.detailZh.trim().length > 0);
  }
});

test('active synthesis step index progresses with elapsed time and clock formats MM:SS cleanly', () => {
  const uvzSteps = getSynthesisVisualSteps('uvz');
  assert.equal(getActiveSynthesisStepIndex(uvzSteps, 0), 0);
  assert.equal(getActiveSynthesisStepIndex(uvzSteps, 2500), 1);
  assert.equal(getActiveSynthesisStepIndex(uvzSteps, 6000), 2);
  assert.equal(getActiveSynthesisStepIndex(uvzSteps, 12000), 3);
  assert.equal(getActiveSynthesisStepIndex(uvzSteps, -50), 0);

  assert.equal(formatElapsedClock(0), '00:00');
  assert.equal(formatElapsedClock(9400), '00:09');
  assert.equal(formatElapsedClock(72500), '01:12');
});

test('SynthesisProgressVisualizer renders animated SVG schematic, step timeline, and 3-column wireframe preview for Stage 3 and Stage 4', () => {
  const uvzHtml = renderToStaticMarkup(
    React.createElement(SynthesisProgressVisualizer, {
      stage: 'uvz',
      model: 'gemini-4-hydrogen',
      contextTitle: 'Remote Freelancer Pricing System',
      lang: 'en',
    })
  );

  assert.match(uvzHtml, /data-testid="synthesis-visualizer-uvz"/);
  assert.match(uvzHtml, /role="status"/);
  assert.match(uvzHtml, /<svg[^>]*role="img"/);
  assert.match(uvzHtml, /signal-dash-animated/);
  assert.match(uvzHtml, /synthesis-sweep-bar/);
  assert.match(uvzHtml, /01\. Ingesting Niche &amp; Brief Signal/);
  assert.match(uvzHtml, /Positioning Option 01/);
  assert.match(uvzHtml, /Existing work is retained until this request succeeds\./);

  const mapHtml = renderToStaticMarkup(
    React.createElement(SynthesisProgressVisualizer, {
      stage: 'transformation_full',
      model: 'gemini-4-hydrogen',
      contextTitle: 'Actionable Toolkit Angle',
      lang: 'zh',
    })
  );

  assert.match(mapHtml, /data-testid="synthesis-visualizer-transformation_full"/);
  assert.match(mapHtml, /BEFORE/);
  assert.match(mapHtml, /BRIDGE/);
  assert.match(mapHtml, /AFTER/);
  assert.match(mapHtml, /請求成功前會保留現有內容/);
  assert.match(mapHtml, /01\. 承接所選 UVZ 價值定位核心/);
});

test('raw Gemini 429 RESOURCE_EXHAUSTED JSON payloads and formatted messages extract wait seconds accurately', () => {
  const raw429 = JSON.stringify({
    error: {
      code: 429,
      message:
        'You exceeded your current quota, please check your plan and billing details.\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 5, model: gemini-4-hydrogen.\nPlease retry in 39.86628752s.',
      status: 'RESOURCE_EXHAUSTED',
      details: [
        {
          '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
          violations: [{ quotaDimensions: { model: 'gemini-4-hydrogen' } }],
        },
        {
          '@type': 'type.googleapis.com/google.rpc.RetryInfo',
          retryDelay: '39s',
        },
      ],
    },
  });

  const parsed = parseGeminiRateLimitDetails(raw429, 429);
  assert.ok(parsed);
  assert.equal(parsed.isRateLimit, true);
  assert.equal(parsed.model, 'gemini-4-hydrogen');
  assert.equal(parsed.retryAfterSeconds, 40);

  const formattedText =
    'Gemini API rate limit reached. Please wait ~45s before retrying, or attach a billing-enabled API key in Settings > Secrets for higher quota.';
  const parsedFormatted = parseGeminiRateLimitDetails(formattedText, 429);
  assert.ok(parsedFormatted);
  assert.equal(parsedFormatted.isRateLimit, true);
  assert.equal(parsedFormatted.retryAfterSeconds, 45);

  const clientEn = generationError(new Error(raw429), 'en');
  const clientZh = generationError(new Error(raw429), 'zh');
  assert.doesNotMatch(clientEn, /\{"error":/);
  assert.match(clientEn, /rate limit reached \(gemini-4-hydrogen\)/i);
  assert.match(clientEn, /~40s/);
  assert.match(clientZh, /40 秒/);
  assert.match(formatLocalizedRateLimitError(parsed, 'en'), /Settings > Secrets/);

  const serverFormatted = formatGeminiUpstreamError({ status: 429, message: raw429 });
  assert.equal(serverFormatted.statusCode, 429);
  assert.equal(serverFormatted.code, 'GEMINI_RATE_LIMIT');
  assert.equal(serverFormatted.retryAfterSeconds, 40);
  assert.doesNotMatch(serverFormatted.message, /\{"error":/);
  assert.match(serverFormatted.message, /~40s/);
});

test('AiEngineQuickControl and AiRateLimitNotice render model options, Token-Saver toggle, and 1-click Flash Lite recovery CTA', () => {
  const quickHtml = renderToStaticMarkup(
    React.createElement(AiEngineQuickControl, {
      project: DEMO_PROJECT,
      onUpdateAiSettings: () => {},
      onOpenAiSettings: () => {},
      fallbackNotice: 'Auto-switched from gemini-4-hydrogen to gemini-3.1-flash-lite due to rate limit.',
      lang: 'en',
    })
  );

  assert.match(quickHtml, /data-testid="ai-engine-quick-control"/);
  assert.match(quickHtml, /gemini-3\.1-flash-lite/);
  assert.match(quickHtml, /gemini-4-hydrogen/);
  assert.match(quickHtml, /gemini-4-neon/);
  assert.match(quickHtml, /Eco/);
  assert.match(quickHtml, /Balanced/);
  assert.match(quickHtml, /Deep/);
  assert.match(quickHtml, /Auto-switched from gemini-4-hydrogen/);

  const noticeHtml = renderToStaticMarkup(
    React.createElement(AiRateLimitNotice, {
      errorMessage:
        'Gemini API rate limit reached. Please wait ~45s before retrying, or attach a billing-enabled API key in Settings > Secrets for higher quota.',
      currentModel: 'gemini-4-hydrogen',
      onRetry: () => {},
      onSwitchToFlashLiteAndRetry: () => {},
      onOpenAiSettings: () => {},
      lang: 'en',
    })
  );

  assert.match(noticeHtml, /data-testid="ai-rate-limit-notice"/);
  assert.match(noticeHtml, /Your previous draft is retained\./);
  assert.match(noticeHtml, /Cooldown countdown: 00:45 remaining/);
  assert.match(noticeHtml, /Switch to Gemini 3\.1 Flash Lite \(Token-Saver\) &amp; Retry/);
  assert.match(noticeHtml, /Retry \(45s\)/);
  assert.match(noticeHtml, /Open AI Settings/);
});
