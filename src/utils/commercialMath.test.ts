import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProfitability } from './commercialMath';
import { sanitizeProjectForStorage, upsertSavedProject, removeSavedProject } from './projectStorage';
import { BLANK_PROJECT } from '../data/demoProject';

test('calculateProfitability computes blended AOV, platform fees, net profit, and break-even units accurately', () => {
  const result = calculateProfitability({
    introductoryPrice: 19,
    regularPrice: 29,
    bundlePrice: 49,
    monthlyVisitors: 4000,
    conversionRatePercent: 2.5,
    bundleSharePercent: 20,
    introSharePercent: 10,
    platformFeePercent: 10,
    fixedFeePerSale: 0,
    monthlyOverheadUsd: 200,
  });

  // 4000 * 2.5% = 100 units
  assert.equal(result.monthlyUnits, 100);
  // Blended AOV = 19*0.1 + 29*0.7 + 49*0.2 = 1.9 + 20.3 + 9.8 = 32.00
  assert.equal(result.blendedAverageOrderValue, 32);
  assert.equal(result.grossMonthlyRevenue, 3200);
  assert.equal(result.monthlyPlatformFees, 320);
  // Net = 3200 - 320 - 200 = 2680
  assert.equal(result.netMonthlyProfit, 2680);
  assert.equal(result.annualizedNetProfit, 32160);
  assert.equal(result.netPerSale, 28.8);
  assert.equal(result.breakEvenUnits, Math.ceil(200 / 28.8));
});

test('sanitizeProjectForStorage strips API keys while preserving project data and saved list operations', () => {
  const withSecret = {
    ...structuredClone(BLANK_PROJECT),
    projectId: 'proj_commercial_test',
    aiSettings: {
      ...BLANK_PROJECT.aiSettings,
      apiKey: 'sk-secret-key',
      apiKeys: {
        openrouter: 'sk-or-secret',
        gemini: 'AIza-secret',
        openai: 'sk-openai-secret',
        claude: 'sk-ant-secret',
      },
    },
  };

  const sanitized = sanitizeProjectForStorage(withSecret);
  assert.equal(sanitized.aiSettings.apiKey, '');
  assert.equal(sanitized.aiSettings.apiKeys.openrouter, '');
  assert.equal(sanitized.aiSettings.apiKeys.gemini, '');
  assert.equal(sanitized.aiSettings.apiKeys.openai, '');
  assert.equal(sanitized.aiSettings.apiKeys.claude, '');

  const list1 = upsertSavedProject([], withSecret);
  assert.equal(list1.length, 1);
  assert.equal(list1[0].aiSettings.apiKey, '');

  const updated = { ...withSecret, name: 'Updated Commercial Guide' };
  const list2 = upsertSavedProject(list1, updated);
  assert.equal(list2.length, 1);
  assert.equal(list2[0].name, 'Updated Commercial Guide');

  const list3 = removeSavedProject(list2, 'proj_commercial_test');
  assert.equal(list3.length, 0);
});
