import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.ts';
import type { DigitalProductProject } from '../types/project.ts';
import { sanitizeProjectForExport } from '../utils/projectSanitizer.ts';
import { migrateProjectSchema } from '../utils/projectMigration.ts';
import type { Language } from '../utils/i18n.ts';
import { invalidateChangedApprovals } from '../utils/approvalIntegrity.ts';
import { compactMarketResearch, hydrateMarketResearch } from '../utils/marketPersistence.ts';

export interface FirestoreProjectRecord {
  project: DigitalProductProject;
  revision: number;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

function normalizeId(raw: string, fallbackPrefix = 'proj'): string {
  const cleaned = String(raw || '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 120);
  if (cleaned && VALID_ID_REGEX.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}_${Date.now()}`;
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined && typeof val !== 'function') {
        out[key] = stripUndefinedDeep(val);
      }
    }
    return out as T;
  }
  return value;
}

function toIsoString(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate().toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return new Date().toISOString();
}

export async function ensureUserProfile(
  user: User,
  preferredLang: Language = 'en',
  activeProjectId = ''
): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const safeEmail = (user.email || 'user@google.com').slice(0, 320);
  const safeDisplayName = (user.displayName || safeEmail.split('@')[0] || 'Creator').slice(0, 120);
  const safePhoto = (user.photoURL || '').slice(0, 1024);
  const safeActiveId = activeProjectId ? normalizeId(activeProjectId).slice(0, 128) : '';

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: safeEmail,
        displayName: safeDisplayName,
        photoURL: safePhoto,
        activeProjectId: safeActiveId,
        preferredLang,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existing = snap.data();
      await updateDoc(ref, {
        email: safeEmail,
        displayName: safeDisplayName,
        photoURL: safePhoto,
        activeProjectId: safeActiveId || String(existing?.activeProjectId || '').slice(0, 128),
        preferredLang,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserProjects(
  uid: string,
  onProjects: (records: FirestoreProjectRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const path = `users/${uid}/projects`;
  const q = query(collection(db, 'users', uid, 'projects'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: FirestoreProjectRecord[] = snapshot.docs.map((docSnap) => {
        const raw = docSnap.data();
        const rev = typeof raw.revision === 'number' ? raw.revision : 1;
        const normalized = sanitizeProjectForExport(
          migrateProjectSchema({
            ...raw,
            projectId: String(raw.projectId || docSnap.id),
            createdAt: toIsoString(raw.createdAt),
            updatedAt: toIsoString(raw.updatedAt),
          })
        );
        return {
          project: {...normalized, marketResearch: hydrateMarketResearch(normalized.marketResearch)},
          revision: rev,
        };
      });
      list.sort((a, b) => b.project.updatedAt.localeCompare(a.project.updatedAt));
      onProjects(list);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveProjectToFirestore(
  uid: string,
  project: DigitalProductProject,
  expectedRevision?: number
): Promise<{ project: DigitalProductProject; revision: number }> {
  const safeProjectId = normalizeId(project.projectId);
  const path = `users/${uid}/projects/${safeProjectId}`;
  const ref = doc(db, 'users', uid, 'projects', safeProjectId);

  const sanitized = sanitizeProjectForExport({
    ...project,
    projectId: safeProjectId,
  });

  const payloadFields = stripUndefinedDeep({
    projectId: safeProjectId,
    ownerId: uid,
    name: String(sanitized.name || sanitized.charter?.productTitle || 'Untitled Project').slice(0, 300),
    schemaVersion: String(sanitized.schemaVersion || '4.0').slice(0, 16),
    isBlankProject: Boolean(sanitized.isBlankProject ?? false),
    preferences: sanitized.preferences,
    workflow: sanitized.workflow,
    marketResearch: compactMarketResearch(sanitized.marketResearch),
    intake: sanitized.intake,
    uvz: sanitized.uvz,
    transformationMap: sanitized.transformationMap,
    referenceLibrary: sanitized.referenceLibrary,
    charter: sanitized.charter,
    outline: (sanitized.outline || []).slice(0, 100),
    productBible: sanitized.productBible,
    resources: (sanitized.resources || []).slice(0, 100),
    qualityReport: sanitized.qualityReport,
    brand: sanitized.brand,
    pricingReport: sanitized.pricingReport,
    salesAssets: sanitized.salesAssets,
    aiSettings: sanitized.aiSettings,
  });

  const encodedBytes = new TextEncoder().encode(JSON.stringify(payloadFields)).byteLength;
  if (encodedBytes > 950_000) {
    throw new Error(
      `Project payload (${Math.round(encodedBytes / 1024)} KB) is approaching Firestore's 1 MiB document limit. Trim embedded images or large imports before syncing.`
    );
  }

  try {
    const revision = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        tx.set(ref, {
          ...payloadFields,
          revision: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return 1;
      }
      const existing = snap.data();
      const currentRevision=typeof existing.revision==='number'?existing.revision:1;
      if(expectedRevision!==undefined && currentRevision!==expectedRevision)throw new Error(`Project revision conflict: expected ${expectedRevision}, current ${currentRevision}. Reload before saving to preserve the newer work.`);
      const reconciled=invalidateChangedApprovals(migrateProjectSchema(existing),sanitized);
      const nextRev = (typeof existing.revision === 'number' ? existing.revision : 1) + 1;
      const { projectId: _pid, ownerId: _oid, ...mutableFields } = payloadFields;
      tx.update(ref, {
        ...mutableFields,
        workflow: stripUndefinedDeep(reconciled.workflow),
        charter: stripUndefinedDeep(reconciled.charter),
        revision: nextRev,
        updatedAt: serverTimestamp(),
      });
      return nextRev;
    });

    return { project: sanitized, revision };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProjectFromFirestore(uid: string, projectId: string): Promise<void> {
  const safeProjectId = normalizeId(projectId);
  const path = `users/${uid}/projects/${safeProjectId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'projects', safeProjectId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
