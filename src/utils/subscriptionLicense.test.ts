import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SUBSCRIPTION_STATE,
  evaluateSubscriptionStatus,
  issueSubscriptionKey,
  normalizeSubscriptionState,
  verifySubscriptionKey,
  type AppSubscriptionState,
} from './subscriptionLicense';

test('issueSubscriptionKey and verifySubscriptionKey enforce email binding and tamper detection', () => {
  const key = issueSubscriptionKey({
    email: 'buyer@studio.example',
    plan: 'PRO_MONTHLY',
    expiresAt: '2027-03-15T00:00:00.000Z',
    nonce: 'A1B2C3',
  });

  assert.match(key, /^DPS1-PRO-20270315-A1B2C3-[A-F0-9]{8}$/);

  const valid = verifySubscriptionKey(key, 'Buyer@Studio.Example', new Date('2026-11-12T00:00:00.000Z'));
  assert.equal(valid.valid, true);
  assert.equal(valid.plan, 'PRO_MONTHLY');
  assert.equal(valid.isLifetime, false);

  const wrongEmail = verifySubscriptionKey(key, 'other@studio.example', new Date('2026-11-12T00:00:00.000Z'));
  assert.equal(wrongEmail.valid, false);

  const tamperedKey = key.slice(0, -1) + (key.endsWith('0') ? '1' : '0');
  const tampered = verifySubscriptionKey(tamperedKey, 'buyer@studio.example', new Date('2026-11-12T00:00:00.000Z'));
  assert.equal(tampered.valid, false);
});

test('verifySubscriptionKey rejects expired keys and supports perpetual Founder Lifetime keys', () => {
  const expiredKey = issueSubscriptionKey({
    email: 'expired@studio.example',
    plan: 'PRO_MONTHLY',
    expiresAt: '2026-01-01T00:00:00.000Z',
    nonce: 'DEAD01',
  });
  const expiredResult = verifySubscriptionKey(expiredKey, 'expired@studio.example', new Date('2026-11-12T00:00:00.000Z'));
  assert.equal(expiredResult.valid, false);
  assert.match(expiredResult.error || '', /expired/i);

  const founderKey = issueSubscriptionKey({
    email: 'founder@studio.example',
    plan: 'LIFETIME_FOUNDER',
    nonce: 'FND999',
  });
  assert.match(founderKey, /^DPS1-FND-LIFETIME-FND999-[A-F0-9]{8}$/);
  const founderValid = verifySubscriptionKey(founderKey, 'founder@studio.example', new Date('2035-06-01T00:00:00.000Z'));
  assert.equal(founderValid.valid, true);
  assert.equal(founderValid.isLifetime, true);
});

test('evaluateSubscriptionStatus enforces manual export gate when unlicensed or suspended and unlocks when licensed', () => {
  const now = new Date('2026-11-12T12:00:00.000Z');
  const gatedTrial: AppSubscriptionState = {
    ...structuredClone(DEFAULT_SUBSCRIPTION_STATE),
    trialStartedAt: '2026-11-10T00:00:00.000Z',
    programConfig: {
      ...DEFAULT_SUBSCRIPTION_STATE.programConfig,
      enforceExportGate: true,
    },
  };

  const trialEval = evaluateSubscriptionStatus(gatedTrial, now, 'en');
  assert.equal(trialEval.health, 'TRIAL_ACTIVE');
  assert.equal(trialEval.isPaidLicense, false);
  assert.equal(trialEval.canExportCommercialBundle, false);

  const key = issueSubscriptionKey({
    email: 'pro@studio.example',
    plan: 'STUDIO_ANNUAL',
    expiresAt: '2027-11-12T00:00:00.000Z',
    nonce: 'PRO123',
  });

  const licensedState: AppSubscriptionState = {
    ...gatedTrial,
    activePlan: 'STUDIO_ANNUAL',
    subscriberEmail: 'pro@studio.example',
    licenseKey: key,
  };
  const licensedEval = evaluateSubscriptionStatus(licensedState, now, 'en');
  assert.equal(licensedEval.health, 'ACTIVE');
  assert.equal(licensedEval.isPaidLicense, true);
  assert.equal(licensedEval.canExportCommercialBundle, true);

  const suspendedEval = evaluateSubscriptionStatus({ ...licensedState, isSuspended: true }, now, 'en');
  assert.equal(suspendedEval.health, 'SUSPENDED');
  assert.equal(suspendedEval.canExportCommercialBundle, false);
});

test('normalizeSubscriptionState safely recovers corrupted input', () => {
  const recovered = normalizeSubscriptionState({ activePlan: 'INVALID_PLAN', programConfig: { trialDays: -5 } });
  assert.equal(recovered.activePlan, 'TRIAL');
  assert.equal(recovered.programConfig.trialDays, 7);
});
