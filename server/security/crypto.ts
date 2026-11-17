import crypto from 'crypto';

export function deriveAes256Key(rawKey: string): Buffer {
  const trimmed = rawKey.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  try {
    const b64 = Buffer.from(trimmed, 'base64');
    if ((b64.length === 32 && trimmed.endsWith('=')) || (b64.length === 32 && b64.toString('base64') === trimmed)) {
      return b64;
    }
  } catch {
    // fallback to SHA-256 derivation
  }
  return crypto.createHash('sha256').update(trimmed, 'utf8').digest();
}

export function encryptSecret(
  plaintext: string,
  rawKey: string,
  keyVersion = 1
): { ciphertext: string; iv: string; authTag: string; keyVersion: number } {
  const key = deriveAes256Key(rawKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion,
  };
}

export function decryptSecret(
  encrypted: { ciphertext: string; iv: string; authTag: string },
  rawKey: string
): string {
  const key = deriveAes256Key(rawKey);
  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function maskSecretHint(secret: string): string {
  const s = secret.trim();
  if (!s) return '';
  if (s.length <= 8) return '••••••••';
  return `${s.slice(0, 6)}••••${s.slice(-4)}`;
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}
