import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_SUBSCRIPTION_STATE,
  normalizeSubscriptionState,
  type AppSubscriptionState,
} from '../src/utils/subscriptionLicense.ts';

export const DESKTOP_EXE_FILENAME = 'Digital Product Studio.exe';

export interface DesktopPackageInfo {
  ready: boolean;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  sha256: string | null;
  builtAt: string | null;
  targetPlatform: string;
  runtimeArchitecture: string;
  appVersion: string;
}

export function getDesktopExecutablePath(baseDir: string = process.cwd()): string {
  return path.resolve(baseDir, 'release', DESKTOP_EXE_FILENAME);
}

export function getLocalSubscriptionFilePath(homeDir: string = os.homedir(), appDataDir?: string): string {
  const effectiveAppData = appDataDir ?? process.env.APPDATA;
  if (process.platform === 'win32' && effectiveAppData) {
    return path.join(effectiveAppData, 'DigitalProductStudio', 'subscription.json');
  }
  return path.join(homeDir, '.digital-product-studio', 'subscription.json');
}

export function readDesktopSubscription(filePath: string = getLocalSubscriptionFilePath()): AppSubscriptionState {
  try {
    if (!fs.existsSync(filePath)) {
      return structuredClone(DEFAULT_SUBSCRIPTION_STATE);
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return normalizeSubscriptionState(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_SUBSCRIPTION_STATE);
  }
}

export function writeDesktopSubscription(
  state: unknown,
  filePath: string = getLocalSubscriptionFilePath()
): AppSubscriptionState {
  const normalized = normalizeSubscriptionState(state);
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

/**
 * Strips the Windows PE Authenticode security directory table from a PE/PE32+ binary
 * so Node.js SEA resource injection (`postject`) produces a clean unsigned Windows executable.
 */
export function stripPeCertificateTable(peBuffer: Buffer): Buffer {
  if (peBuffer.length < 0x40 || peBuffer[0] !== 0x4d || peBuffer[1] !== 0x5a) {
    throw new Error('Invalid PE executable: missing MZ header.');
  }
  const peOffset = peBuffer.readUInt32LE(0x3c);
  if (
    peOffset + 24 >= peBuffer.length ||
    peBuffer.toString('ascii', peOffset, peOffset + 4) !== 'PE\0\0'
  ) {
    throw new Error('Invalid PE executable: missing PE signature.');
  }

  const optionalHeaderOffset = peOffset + 24;
  const magic = peBuffer.readUInt16LE(optionalHeaderOffset);
  let dataDirOffset: number;
  let numberOfRvaAndSizesOffset: number;

  if (magic === 0x020b) {
    // PE32+ (64-bit)
    numberOfRvaAndSizesOffset = optionalHeaderOffset + 108;
    dataDirOffset = optionalHeaderOffset + 112;
  } else if (magic === 0x010b) {
    // PE32 (32-bit)
    numberOfRvaAndSizesOffset = optionalHeaderOffset + 92;
    dataDirOffset = optionalHeaderOffset + 96;
  } else {
    throw new Error(`Unsupported PE Optional Header magic: 0x${magic.toString(16)}`);
  }

  const numDirs = peBuffer.readUInt32LE(numberOfRvaAndSizesOffset);
  if (numDirs <= 4) {
    return Buffer.from(peBuffer);
  }

  // IMAGE_DIRECTORY_ENTRY_SECURITY = index 4 (8 bytes: file offset, size)
  const securityDirOffset = dataDirOffset + 4 * 8;
  const certOffset = peBuffer.readUInt32LE(securityDirOffset);
  const certSize = peBuffer.readUInt32LE(securityDirOffset + 4);

  const out = Buffer.from(peBuffer);
  out.writeUInt32LE(0, securityDirOffset);
  out.writeUInt32LE(0, securityDirOffset + 4);

  if (certOffset > 0 && certSize > 0 && certOffset + certSize <= out.length && certOffset + certSize === out.length) {
    return out.subarray(0, certOffset);
  }
  return out;
}

const shaCache = new Map<string, { mtimeMs: number; size: number; sha256: string }>();

export function getDesktopPackageInfo(
  baseDir: string = process.cwd(),
  appVersion: string = '4.0.0'
): DesktopPackageInfo {
  const filePath = getDesktopExecutablePath(baseDir);
  if (!fs.existsSync(filePath)) {
    return {
      ready: false,
      fileName: DESKTOP_EXE_FILENAME,
      filePath,
      sizeBytes: 0,
      sha256: null,
      builtAt: null,
      targetPlatform: 'Windows 10 / 11 (x64)',
      runtimeArchitecture: 'Standalone Single-File Windows Executable (PE32+)',
      appVersion,
    };
  }

  const stat = fs.statSync(filePath);
  const cached = shaCache.get(filePath);
  let sha256: string;
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    sha256 = cached.sha256;
  } else {
    const hash = crypto.createHash('sha256');
    const fd = fs.openSync(filePath, 'r');
    try {
      const chunk = Buffer.allocUnsafe(1024 * 1024);
      let bytesRead = 0;
      while ((bytesRead = fs.readSync(fd, chunk, 0, chunk.length, null)) > 0) {
        hash.update(bytesRead === chunk.length ? chunk : chunk.subarray(0, bytesRead));
      }
    } finally {
      fs.closeSync(fd);
    }
    sha256 = hash.digest('hex');
    shaCache.set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size, sha256 });
  }

  return {
    ready: stat.size > 1024,
    fileName: DESKTOP_EXE_FILENAME,
    filePath,
    sizeBytes: stat.size,
    sha256,
    builtAt: stat.mtime.toISOString(),
    targetPlatform: 'Windows 10 / 11 (x64)',
    runtimeArchitecture: 'Standalone Single-File Windows Executable (PE32+)',
    appVersion,
  };
}
