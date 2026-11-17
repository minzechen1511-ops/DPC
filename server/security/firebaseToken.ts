import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  authUser?: VerifiedFirebaseUser;
}

export type FirebaseTokenVerifier = (idToken: string) => Promise<VerifiedFirebaseUser>;

const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedProjectId: string | null = null;
let certCache: { certs: Record<string, string>; expiresAt: number } = {
  certs: {},
  expiresAt: 0,
};

export function getFirebaseProjectId(): string {
  if (cachedProjectId) return cachedProjectId;
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!raw?.projectId || typeof raw.projectId !== 'string') {
    throw new Error('Missing projectId in firebase-applet-config.json');
  }
  const projectId: string = raw.projectId;
  cachedProjectId = projectId;
  return projectId;
}

function decodeBase64UrlJson<T = any>(segment: string): T {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(padded, 'base64').toString('utf8');
  return JSON.parse(json) as T;
}

async function fetchGoogleSecureTokenCerts(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceRefresh && certCache.expiresAt > now && Object.keys(certCache.certs).length > 0) {
    return certCache.certs;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(FIREBASE_CERTS_URL, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Unable to fetch Google securetoken certificates (HTTP ${res.status})`);
    }
    const cacheControl = res.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
    const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600_000;
    const certs = (await res.json()) as Record<string, string>;
    certCache = {
      certs,
      expiresAt: Date.now() + Math.max(60_000, maxAgeMs),
    };
    return certs;
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  const parts = String(idToken || '').trim().split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed Firebase ID token.');
  }

  const [headerB64, payloadB64, sigB64] = parts;
  const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(headerB64);
  const payload = decodeBase64UrlJson<{
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
    email_verified?: boolean;
    name?: string;
  }>(payloadB64);

  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
    throw new Error('Unsupported Firebase token header.');
  }

  const projectId = getFirebaseProjectId();
  const nowSec = Math.floor(Date.now() / 1000);

  if (payload.aud !== projectId) {
    throw new Error('Firebase token audience mismatch.');
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Firebase token issuer mismatch.');
  }
  if (typeof payload.sub !== 'string' || !/^[a-zA-Z0-9_\-]{1,128}$/.test(payload.sub)) {
    throw new Error('Invalid Firebase user subject.');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Firebase session token expired.');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) {
    throw new Error('Firebase token issued-at timestamp invalid.');
  }
  if (payload.email_verified !== true) {
    throw new Error('Verified Google email is required.');
  }

  let certs = await fetchGoogleSecureTokenCerts(false);
  let certPem = certs[header.kid];
  if (!certPem) {
    certs = await fetchGoogleSecureTokenCerts(true);
    certPem = certs[header.kid];
  }
  if (!certPem) {
    throw new Error('Signing certificate not found for Firebase token.');
  }

  const sigPadded = sigB64.replace(/-/g, '+').replace(/_/g, '/');
  const sigBuf = Buffer.from(sigPadded, 'base64');
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();

  if (!verifier.verify(certPem, sigBuf)) {
    throw new Error('Invalid Firebase token signature.');
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : '',
    emailVerified: true,
    name: typeof payload.name === 'string' ? payload.name : undefined,
  };
}

export function extractBearerToken(req: Request): string {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

export function createRequireFirebaseAuth(
  verifyFn: FirebaseTokenVerifier = verifyFirebaseIdToken
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({
        error: 'Google Sign-In required. Sign in with Google to use Digital Product Studio.',
        code: 'AUTH_REQUIRED',
      });
    }

    try {
      const user = await verifyFn(token);
      (req as AuthenticatedRequest).authUser = user;
      return next();
    } catch (err: any) {
      return res.status(401).json({
        error: err?.message || 'Invalid or expired Google session.',
        code: 'AUTH_INVALID',
      });
    }
  };
}
