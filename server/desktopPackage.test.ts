import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DESKTOP_EXE_FILENAME,
  getDesktopPackageInfo,
  readDesktopSubscription,
  stripPeCertificateTable,
  writeDesktopSubscription,
} from './desktopPackage';
import { issueSubscriptionKey } from '../src/utils/subscriptionLicense';

test('writeDesktopSubscription and readDesktopSubscription persist license state to local desktop vault', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dps-desktop-vault-'));
  const filePath = path.join(tmpRoot, 'subscription.json');

  const initial = readDesktopSubscription(filePath);
  assert.equal(initial.activePlan, 'TRIAL');

  const key = issueSubscriptionKey({
    email: 'desktop@studio.example',
    plan: 'PRO_MONTHLY',
    expiresAt: '2027-05-01T00:00:00.000Z',
    nonce: 'DSK001',
  });

  const saved = writeDesktopSubscription(
    {
      ...initial,
      activePlan: 'PRO_MONTHLY',
      subscriberEmail: 'desktop@studio.example',
      subscriberName: 'Alex Rivera',
      licenseKey: key,
    },
    filePath
  );

  assert.equal(saved.activePlan, 'PRO_MONTHLY');
  const reloaded = readDesktopSubscription(filePath);
  assert.equal(reloaded.subscriberEmail, 'desktop@studio.example');
  assert.equal(reloaded.licenseKey, key);

  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

test('stripPeCertificateTable zeroes PE32+ security directory and trims trailing signature', () => {
  // Construct minimal synthetic PE32+ header + 16-byte trailing Authenticode certificate
  const peOffset = 0x80;
  const optOffset = peOffset + 24;
  const secDirOffset = optOffset + 112 + 4 * 8;
  const totalBeforeSig = 0x200;
  const sigBytes = 16;
  const buf = Buffer.alloc(totalBeforeSig + sigBytes, 0);

  buf[0] = 0x4d; // 'M'
  buf[1] = 0x5a; // 'Z'
  buf.writeUInt32LE(peOffset, 0x3c);
  buf.write('PE\0\0', peOffset, 'ascii');
  buf.writeUInt16LE(0x020b, optOffset); // PE32+
  buf.writeUInt32LE(16, optOffset + 108); // NumberOfRvaAndSizes
  buf.writeUInt32LE(totalBeforeSig, secDirOffset); // Certificate file offset
  buf.writeUInt32LE(sigBytes, secDirOffset + 4); // Certificate size

  const stripped = stripPeCertificateTable(buf);
  assert.equal(stripped.length, totalBeforeSig);
  assert.equal(stripped.readUInt32LE(secDirOffset), 0);
  assert.equal(stripped.readUInt32LE(secDirOffset + 4), 0);
});

test('getDesktopPackageInfo reports missing vs built executable accurately', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dps-pkg-info-'));
  const missing = getDesktopPackageInfo(tmpRoot);
  assert.equal(missing.ready, false);
  assert.equal(missing.fileName, DESKTOP_EXE_FILENAME);

  const releaseDir = path.join(tmpRoot, 'release');
  fs.mkdirSync(releaseDir, { recursive: true });
  fs.writeFileSync(path.join(releaseDir, DESKTOP_EXE_FILENAME), Buffer.alloc(4096, 0x41));

  const ready = getDesktopPackageInfo(tmpRoot);
  assert.equal(ready.ready, true);
  assert.equal(ready.sizeBytes, 4096);
  assert.match(ready.sha256 || '', /^[a-f0-9]{64}$/);

  fs.rmSync(tmpRoot, { recursive: true, force: true });
});
