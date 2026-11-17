import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const OWNER_USER_ID = 'local-owner';

export interface AppConfig {
  nodeEnv: string;
  isProduction: boolean;
  port: number;
  host: string;
  dataDir: string;
  appBaseUrl: string;
  allowedOrigins: string[];
  allowIframeEmbed: boolean;
  allowedFrameAncestors: string;
  ownerUserId: string;
  credentialEncryptionKey: string;
  credentialKeyVersion: number;
}

const EPHEMERAL_DEV_CRED_KEY = crypto
  .createHash('sha256')
  .update(`dpc-cloud-cred-${process.cwd()}`)
  .digest('hex');

export function resolveDefaultDataDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.DPC_DATA_DIR && env.DPC_DATA_DIR.trim()) {
    return path.resolve(env.DPC_DATA_DIR.trim());
  }
  return path.resolve(process.cwd(), '.local-data');
}

export function ensurePersistentVaultKey(dataDir: string): string {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const keyFile = path.join(dataDir, 'vault.key');
  if (fs.existsSync(keyFile)) {
    const existing = fs.readFileSync(keyFile, 'utf8').trim();
    if (/^[0-9a-fA-F]{64}$/.test(existing)) {
      return existing;
    }
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(keyFile, `${generated}\n`, { encoding: 'utf8', mode: 0o600 });
  return generated;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const port = Number(env.PORT || 3000);
  const host = env.HOST || '0.0.0.0';
  const dataDir = resolveDefaultDataDir(env);

  const rawBaseUrl = env.APP_BASE_URL || env.APP_URL || `http://127.0.0.1:${port}`;
  const appBaseUrl = rawBaseUrl.replace(/\/$/, '');

  const originCandidates = [
    ...(env.ALLOWED_ORIGIN ? env.ALLOWED_ORIGIN.split(',') : []),
    appBaseUrl,
    env.APP_URL || '',
    env.APP_BASE_URL || '',
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ];
  const allowedOrigins = Array.from(
    new Set(originCandidates.map((s) => s.trim().replace(/\/$/, '')).filter(Boolean))
  );

  const tryParseHostname = (value?: string): string => {
    if (!value) return '';
    try {
      return new URL(value).hostname;
    } catch {
      return '';
    }
  };
  const isAiStudioHosted = [env.APP_URL, env.APP_BASE_URL].some((candidate) =>
    /\.run\.app$/i.test(tryParseHostname(candidate))
  );
  const allowIframeEmbed =
    env.ALLOW_IFRAME_EMBED === 'true'
      ? true
      : env.ALLOW_IFRAME_EMBED === 'false'
      ? false
      : !isProduction || isAiStudioHosted;

  const allowedFrameAncestors =
    env.ALLOWED_FRAME_ANCESTORS?.trim() ||
    "'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com https://*.usercontent.goog";

  let credentialEncryptionKey = env.CREDENTIAL_ENCRYPTION_KEY?.trim() || '';
  if (!credentialEncryptionKey) {
    const keyFile = path.join(dataDir, 'vault.key');
    if (fs.existsSync(keyFile)) {
      const stored = fs.readFileSync(keyFile, 'utf8').trim();
      if (/^[0-9a-fA-F]{64}$/.test(stored)) {
        credentialEncryptionKey = stored;
      }
    }
  }
  if (!credentialEncryptionKey) {
    credentialEncryptionKey = EPHEMERAL_DEV_CRED_KEY;
  }

  return {
    nodeEnv,
    isProduction,
    port,
    host,
    dataDir,
    appBaseUrl,
    allowedOrigins,
    allowIframeEmbed,
    allowedFrameAncestors,
    ownerUserId: OWNER_USER_ID,
    credentialEncryptionKey,
    credentialKeyVersion: Number(env.CREDENTIAL_KEY_VERSION || 1),
  };
}
