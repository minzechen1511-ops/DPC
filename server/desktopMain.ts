import express from 'express';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { createApiRouter } from './apiRouter.ts';
import { getLocalSubscriptionFilePath } from './desktopPackage.ts';

declare const __EMBEDDED_ASSETS__: Record<string, { mime: string; gzipBase64: string }> | undefined;

const ASSETS: Record<string, { mime: string; gzipBase64: string }> =
  typeof __EMBEDDED_ASSETS__ !== 'undefined' ? __EMBEDDED_ASSETS__ : {};

const decodedCache = new Map<string, Buffer>();

function readEmbeddedAsset(reqPath: string): { mime: string; content: Buffer } | null {
  const cleanPath = reqPath.split('?')[0] || '/';
  const key = cleanPath === '/' ? '/index.html' : cleanPath;
  const entry = ASSETS[key] || ASSETS['/index.html'];
  if (!entry) return null;

  const cacheKey = ASSETS[key] ? key : '/index.html';
  let buffer = decodedCache.get(cacheKey);
  if (!buffer) {
    buffer = zlib.gunzipSync(Buffer.from(entry.gzipBase64, 'base64'));
    decodedCache.set(cacheKey, buffer);
  }
  return { mime: entry.mime, content: buffer };
}

function safeSpawnDetached(command: string, args: string[]): void {
  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });
    child.on('error', () => {
      // Ignore launcher errors; local server URL stays printed in console
    });
    child.unref();
  } catch {
    // Ignore synchronous spawn errors
  }
}

function launchDesktopWindow(url: string): void {
  if (process.env.NO_OPEN_BROWSER === '1') {
    return;
  }

  if (process.platform === 'win32') {
    const candidates = [
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];

    const appBrowser = candidates.find((candidate) => fs.existsSync(candidate));
    if (appBrowser) {
      safeSpawnDetached(appBrowser, [`--app=${url}`, '--window-size=1440,920']);
      return;
    }

    execFile('cmd.exe', ['/c', 'start', '', url], { windowsHide: true }, () => {});
    return;
  }

  if (process.platform === 'darwin') {
    safeSpawnDetached('open', [url]);
    return;
  }

  safeSpawnDetached('xdg-open', [url]);
}

function startDesktopApplication(): void {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api', createApiRouter({ includeDesktopPackager: false }));

  app.get('*', (req, res) => {
    const asset = readEmbeddedAsset(req.path);
    if (!asset) {
      return res.status(404).send('Digital Product Studio assets not embedded.');
    }
    res.setHeader('Content-Type', asset.mime);
    res.send(asset.content);
  });

  const preferredPort = Number(process.env.PORT || 3847);
  const server = app.listen(preferredPort, '127.0.0.1', () => {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : preferredPort;
    const appUrl = `http://127.0.0.1:${port}`;
    console.log('');
    console.log('==========================================================');
    console.log(' Digital Product Studio — Desktop Edition Running');
    console.log(` App Window URL : ${appUrl}`);
    console.log(` License Vault  : ${getLocalSubscriptionFilePath()}`);
    console.log(' Keep this window open while using the desktop studio.');
    console.log('==========================================================');
    launchDesktopWindow(appUrl);
  });

  server.on('error', (err: any) => {
    if (err?.code === 'EADDRINUSE') {
      const fallbackServer = app.listen(0, '127.0.0.1', () => {
        const address = fallbackServer.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        const appUrl = `http://127.0.0.1:${port}`;
        console.log(`Digital Product Studio running on ${appUrl}`);
        launchDesktopWindow(appUrl);
      });
    } else {
      console.error('Failed to start Digital Product Studio Desktop:', err);
      process.exit(1);
    }
  });
}

startDesktopApplication();
