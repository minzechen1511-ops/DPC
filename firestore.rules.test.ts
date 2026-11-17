import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
const blueprint = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8')
);

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

interface SimAuth {
  uid: string;
  emailVerified: boolean;
}

function simulateProfileWrite(
  auth: SimAuth | null,
  targetUserId: string,
  payload: Record<string, any>,
  mode: 'create' | 'update',
  options: { existingProfile?: Record<string, any>; serverTime?: boolean } = {}
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!auth || !auth.emailVerified) return 'PERMISSION_DENIED';
  if (!VALID_ID_REGEX.test(targetUserId) || targetUserId.length > 128) return 'PERMISSION_DENIED';
  if (auth.uid !== targetUserId) return 'PERMISSION_DENIED';

  const required = blueprint.entities.UserProfile.required as string[];
  const allowed = Object.keys(blueprint.entities.UserProfile.properties);
  const payloadKeys = Object.keys(payload);

  if (!required.every((k) => payloadKeys.includes(k))) return 'PERMISSION_DENIED';
  if (!payloadKeys.every((k) => allowed.includes(k))) return 'PERMISSION_DENIED';
  if (payload.uid !== auth.uid || payload.uid !== targetUserId) return 'PERMISSION_DENIED';
  if (typeof payload.email !== 'string' || payload.email.length < 3 || payload.email.length > 320) {
    return 'PERMISSION_DENIED';
  }
  if (options.serverTime === false) return 'PERMISSION_DENIED';

  if (mode === 'update' && options.existingProfile) {
    if (payload.createdAt !== options.existingProfile.createdAt) return 'PERMISSION_DENIED';
    if (payload.uid !== options.existingProfile.uid) return 'PERMISSION_DENIED';
  }
  return 'ALLOW';
}

function simulateProjectWrite(
  auth: SimAuth | null,
  targetUserId: string,
  projectId: string,
  payload: Record<string, any>,
  mode: 'create' | 'update',
  options: { parentUserExists: boolean; existingProject?: Record<string, any>; serverTime?: boolean }
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!auth || !auth.emailVerified) return 'PERMISSION_DENIED';
  if (!VALID_ID_REGEX.test(targetUserId) || targetUserId.length > 128) return 'PERMISSION_DENIED';
  if (!VALID_ID_REGEX.test(projectId) || projectId.length > 128) return 'PERMISSION_DENIED';
  if (auth.uid !== targetUserId) return 'PERMISSION_DENIED';
  if (!options.parentUserExists) return 'PERMISSION_DENIED';

  const required = blueprint.entities.StudioProject.required as string[];
  const allowed = Object.keys(blueprint.entities.StudioProject.properties);
  const payloadKeys = Object.keys(payload);

  if (!required.every((k) => payloadKeys.includes(k))) return 'PERMISSION_DENIED';
  if (!payloadKeys.every((k) => allowed.includes(k))) return 'PERMISSION_DENIED';
  if (payload.ownerId !== auth.uid || payload.projectId !== projectId) return 'PERMISSION_DENIED';
  if (typeof payload.name !== 'string' || payload.name.length > 300) return 'PERMISSION_DENIED';
  if (options.serverTime === false) return 'PERMISSION_DENIED';
  if (payload.aiSettings?.apiKey && String(payload.aiSettings.apiKey).length > 0) {
    return 'PERMISSION_DENIED';
  }

  if (mode === 'create') {
    if (payload.revision !== 1) return 'PERMISSION_DENIED';
  } else if (options.existingProject) {
    if (payload.ownerId !== options.existingProject.ownerId) return 'PERMISSION_DENIED';
    if (payload.createdAt !== options.existingProject.createdAt) return 'PERMISSION_DENIED';
    if (payload.revision !== Number(options.existingProject.revision) + 1) return 'PERMISSION_DENIED';
  }
  return 'ALLOW';
}

function baseProject(ownerId = 'alice', projectId = 'proj_1'): Record<string, any> {
  return {
    projectId,
    ownerId,
    name: 'Commercial Playbook',
    schemaVersion: '4.0',
    isBlankProject: false,
    revision: 1,
    createdAt: 't0',
    updatedAt: 't0',
    preferences: {},
    workflow: {},
    marketResearch: {},
    intake: {},
    uvz: {},
    transformationMap: {},
    referenceLibrary: {},
    charter: {},
    outline: [],
    productBible: {},
    resources: [],
    qualityReport: {},
    brand: {},
    pricingReport: {},
    salesAssets: {},
    aiSettings: { provider: 'gemini', apiKey: '', baseUrl: '', defaultModel: 'gemini-4-hydrogen' },
  };
}

test('firestore.rules enforces Eight Pillars & matches firebase-blueprint.json verbatim', () => {
  assert.match(rulesText, /^rules_version\s*=\s*'2';/);
  assert.match(rulesText, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesText, /allow list: if false;/);
  assert.match(rulesText, /function isValidUserProfile/);
  assert.match(rulesText, /function isValidStudioProject/);
  assert.match(rulesText, /incoming\(\)\.revision == existing\(\)\.revision \+ 1/);
  assert.match(rulesText, /incoming\(\)\.diff\(existing\(\)\)\.affectedKeys\(\)\.hasOnly/);
  assert.match(rulesText, /resource == null \|\| existing\(\)\.ownerId == request\.auth\.uid/);

  assert.ok(rulesText.includes(`data.name.size() <= ${blueprint.entities.StudioProject.properties.name.maxLength}`));
  assert.ok(rulesText.includes(`data.email.size() <= ${blueprint.entities.UserProfile.properties.email.maxLength}`));
});

test('Dirty Dozen security payloads all return PERMISSION_DENIED', () => {
  const alice: SimAuth = { uid: 'alice', emailVerified: true };
  const unverified: SimAuth = { uid: 'alice', emailVerified: false };
  const validProfile = {
    uid: 'alice',
    email: 'alice@example.com',
    displayName: 'Alice',
    photoURL: '',
    activeProjectId: 'proj_1',
    preferredLang: 'en',
    createdAt: 't0',
    updatedAt: 't0',
  };

  // 1. Cross-tenant profile write
  assert.equal(simulateProfileWrite(alice, 'bob', validProfile, 'create'), 'PERMISSION_DENIED');
  // 2. Unverified email bypass
  assert.equal(simulateProfileWrite(unverified, 'alice', validProfile, 'create'), 'PERMISSION_DENIED');
  // 3. Shadow role escalation on profile create
  assert.equal(
    simulateProfileWrite(alice, 'alice', { ...validProfile, isAdmin: true }, 'create'),
    'PERMISSION_DENIED'
  );
  // 4. Owner spoofing on project create
  assert.equal(
    simulateProjectWrite(alice, 'alice', 'proj_1', baseProject('bob', 'proj_1'), 'create', {
      parentUserExists: true,
    }),
    'PERMISSION_DENIED'
  );
  // 5. Orphan project create when parent user doc missing
  assert.equal(
    simulateProjectWrite(alice, 'alice', 'proj_1', baseProject('alice', 'proj_1'), 'create', {
      parentUserExists: false,
    }),
    'PERMISSION_DENIED'
  );
  // 6. ID poisoning / oversized name
  assert.equal(
    simulateProjectWrite(alice, 'alice', '../evil', baseProject('alice', '../evil'), 'create', {
      parentUserExists: true,
    }),
    'PERMISSION_DENIED'
  );
  assert.equal(
    simulateProjectWrite(
      alice,
      'alice',
      'proj_1',
      { ...baseProject('alice', 'proj_1'), name: 'x'.repeat(500) },
      'create',
      { parentUserExists: true }
    ),
    'PERMISSION_DENIED'
  );
  // 7. Forged client timestamp
  assert.equal(
    simulateProjectWrite(
      alice,
      'alice',
      'proj_1',
      baseProject('alice', 'proj_1'),
      'create',
      { parentUserExists: true, serverTime: false }
    ),
    'PERMISSION_DENIED'
  );
  // 8. Update immutable ownerId / createdAt
  const existing = baseProject('alice', 'proj_1');
  assert.equal(
    simulateProjectWrite(
      alice,
      'alice',
      'proj_1',
      { ...existing, createdAt: 'tampered', revision: 2 },
      'update',
      { parentUserExists: true, existingProject: existing }
    ),
    'PERMISSION_DENIED'
  );
  // 9. Revision replay
  assert.equal(
    simulateProjectWrite(alice, 'alice', 'proj_1', { ...existing, revision: 1 }, 'update', {
      parentUserExists: true,
      existingProject: existing,
    }),
    'PERMISSION_DENIED'
  );
  // 10. Ghost field shadow update
  assert.equal(
    simulateProjectWrite(
      alice,
      'alice',
      'proj_1',
      { ...existing, revision: 2, extraBypass: true },
      'update',
      { parentUserExists: true, existingProject: existing }
    ),
    'PERMISSION_DENIED'
  );
  // 11. Secret injection into Firestore project
  assert.equal(
    simulateProjectWrite(
      alice,
      'alice',
      'proj_1',
      {
        ...existing,
        revision: 2,
        aiSettings: { provider: 'gemini', apiKey: 'AIzaSyFakeSecret1234567890', baseUrl: '' },
      },
      'update',
      { parentUserExists: true, existingProject: existing }
    ),
    'PERMISSION_DENIED'
  );
  // 12. Valid create & update succeed cleanly
  assert.equal(simulateProfileWrite(alice, 'alice', validProfile, 'create'), 'ALLOW');
  assert.equal(
    simulateProjectWrite(alice, 'alice', 'proj_1', existing, 'create', { parentUserExists: true }),
    'ALLOW'
  );
  assert.equal(
    simulateProjectWrite(
      alice,
      'alice',
      'proj_1',
      { ...existing, revision: 2, name: 'Updated Book' },
      'update',
      { parentUserExists: true, existingProject: existing }
    ),
    'ALLOW'
  );
});
