import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import { build as esbuildBundle } from 'esbuild';
import { inject as postjectInject } from 'postject';
import {
  DESKTOP_EXE_FILENAME,
  getDesktopExecutablePath,
  getDesktopPackageInfo,
  stripPeCertificateTable,
  type DesktopPackageInfo,
} from '../server/desktopPackage.ts';

const execFileAsync = promisify(execFile);

const WIN_NODE_VERSION = 'v22.23.2';
const WIN_NODE_URL = `https://nodejs.org/dist/${WIN_NODE_VERSION}/win-x64/node.exe`;
const NODE_SEA_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

const MIME_BY_EXT: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
};

function collectDistAssets(distDir: string): Record<string, { mime: string; gzipBase64: string }> {
  const out: Record<string, { mime: string; gzipBase64: string }> = {};
  if (!fs.existsSync(distDir)) {
    throw new Error('Compiled frontend dist/ directory does not exist. Run vite build first.');
  }

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const rel = '/' + path.relative(distDir, fullPath).replace(/\\/g, '/');
        const ext = path.extname(entry.name).toLowerCase();
        const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
        const raw = fs.readFileSync(fullPath);
        const gz = zlib.gzipSync(raw, { level: 9 });
        out[rel] = {
          mime,
          gzipBase64: gz.toString('base64'),
        };
      }
    }
  };

  walk(distDir);
  if (!out['/index.html']) {
    throw new Error('dist/index.html missing after build.');
  }
  return out;
}

async function ensureWinNodeBinary(cacheDir: string): Promise<string> {
  fs.mkdirSync(cacheDir, { recursive: true });
  const cachedPath = path.join(cacheDir, `node-${WIN_NODE_VERSION}-win-x64.exe`);
  if (fs.existsSync(cachedPath) && fs.statSync(cachedPath).size > 30_000_000) {
    return cachedPath;
  }

  const response = await fetch(WIN_NODE_URL);
  if (!response.ok) {
    throw new Error(`Unable to download Windows x64 Node runtime (${response.status}).`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const rawBuffer = Buffer.from(arrayBuffer);
  const stripped = stripPeCertificateTable(rawBuffer);
  fs.writeFileSync(cachedPath, stripped);
  return cachedPath;
}

let inFlightBuild: Promise<DesktopPackageInfo> | null = null;

export async function buildDesktopExecutable(options?: {
  baseDir?: string;
  rebuildFrontend?: boolean;
}): Promise<DesktopPackageInfo> {
  if (inFlightBuild) {
    return inFlightBuild;
  }

  inFlightBuild = (async () => {
    const baseDir = options?.baseDir || process.cwd();
    const distDir = path.join(baseDir, 'dist');
    const buildDir = path.join(baseDir, 'build-desktop');
    const cacheDir = path.join(baseDir, '.desktop-cache');
    const releaseDir = path.join(baseDir, 'release');
    const outputExe = getDesktopExecutablePath(baseDir);

    fs.mkdirSync(buildDir, { recursive: true });
    fs.mkdirSync(releaseDir, { recursive: true });

    // 1. Build frontend production bundle if requested or missing
    if (options?.rebuildFrontend || !fs.existsSync(path.join(distDir, 'index.html'))) {
      const viteBin = path.join(baseDir, 'node_modules', '.bin', 'vite');
      await execFileAsync(viteBin, ['build'], { cwd: baseDir, maxBuffer: 10 * 1024 * 1024 });
    }

    // 2. Pack dist/ assets into gzipped base64 dictionary
    const packedAssets = collectDistAssets(distDir);

    // 3. Bundle desktopMain + apiRouter + express + research + AI proxy into one CJS file
    const bundlePath = path.join(buildDir, 'desktop-bundle.cjs');
    await esbuildBundle({
      entryPoints: [path.join(baseDir, 'server', 'desktopMain.ts')],
      bundle: true,
      platform: 'node',
      target: 'node22',
      format: 'cjs',
      minify: true,
      outfile: bundlePath,
      define: {
        __EMBEDDED_ASSETS__: JSON.stringify(packedAssets),
      },
    });

    // 4. Generate Node.js SEA blob (platform-independent JS source blob)
    const seaBlobPath = path.join(buildDir, 'sea-prep.blob');
    const seaConfigPath = path.join(buildDir, 'sea-config.json');
    fs.writeFileSync(
      seaConfigPath,
      JSON.stringify(
        {
          main: bundlePath,
          output: seaBlobPath,
          disableExperimentalSEAWarning: true,
          useSnapshot: false,
          useCodeCache: false,
        },
        null,
        2
      ),
      'utf8'
    );

    await execFileAsync(process.execPath, ['--experimental-sea-config', seaConfigPath], {
      cwd: baseDir,
      maxBuffer: 20 * 1024 * 1024,
    });

    // 5. Prepare stripped Windows x64 node.exe and inject SEA resource blob
    const winNodePath = await ensureWinNodeBinary(cacheDir);
    const tempExe = path.join(buildDir, `${DESKTOP_EXE_FILENAME}.tmp`);
    fs.copyFileSync(winNodePath, tempExe);

    const blobBuffer = fs.readFileSync(seaBlobPath);
    await postjectInject(tempExe, 'NODE_SEA_BLOB', blobBuffer, {
      sentinelFuse: NODE_SEA_FUSE,
      overwrite: true,
    });

    fs.renameSync(tempExe, outputExe);
    return getDesktopPackageInfo(baseDir);
  })();

  try {
    return await inFlightBuild;
  } finally {
    inFlightBuild = null;
  }
}

// Allow running directly via CLI: `tsx scripts/buildDesktopExe.ts`
const isDirectExecution =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.includes('buildDesktopExe');

if (isDirectExecution) {
  buildDesktopExecutable({ rebuildFrontend: true })
    .then((info) => {
      console.log(`Built ${info.fileName} (${(info.sizeBytes / (1024 * 1024)).toFixed(2)} MB)`);
      console.log(`SHA-256: ${info.sha256}`);
    })
    .catch((err) => {
      console.error('Desktop .exe build failed:', err);
      process.exit(1);
    });
}
