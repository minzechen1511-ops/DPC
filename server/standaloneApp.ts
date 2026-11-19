import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { AppConfig, ensurePersistentVaultKey, loadConfig } from './config.ts';
import { createDataStore } from './db/index.ts';
import { createApiRouter } from './apiRouter.ts';
import { createOpenRouterCallbackHandler, PendingOpenRouterFlow } from './ai/openrouterAuth.ts';

export async function startStandaloneServer(options: {
  distDir?: string;
} = {}): Promise<{ server: http.Server; url: string; config: AppConfig }> {
  const initialConfig = loadConfig();

  if (!process.env.CREDENTIAL_ENCRYPTION_KEY?.trim()) {
    initialConfig.credentialEncryptionKey = ensurePersistentVaultKey(initialConfig.dataDir);
  }

  const config: AppConfig = {
    ...initialConfig,
    allowedOrigins: Array.from(
      new Set([
        ...initialConfig.allowedOrigins,
        `http://127.0.0.1:${initialConfig.port}`,
        `http://localhost:${initialConfig.port}`,
      ])
    ),
  };

  const store = await createDataStore(config);
  const openrouterFlowStore = new Map<string, PendingOpenRouterFlow>();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!config.allowIframeEmbed) {
      res.setHeader('X-Frame-Options', 'DENY');
    }
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    const connectSrc = [
      "'self'",
      'https://*.googleapis.com',
      'https://*.firebaseio.com',
      'https://securetoken.googleapis.com',
      'https://identitytoolkit.googleapis.com',
      'wss://*.firebaseio.com',
      ...(config.isProduction ? [] : ['ws:', 'wss:']),
    ].join(' ');
    const frameAncestors = config.allowIframeEmbed ? config.allowedFrameAncestors : "'none'";
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com https://*.firebaseapp.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src ${connectSrc}; frame-src 'self' https://*.firebaseapp.com https://accounts.google.com; frame-ancestors ${frameAncestors}; base-uri 'self'; form-action 'self'`
    );

    const origin = req.headers.origin;
    if (origin && config.allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    return next();
  });

  app.use('/assets/aistudio', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found.' });
  });

  app.use(express.json({ limit: '10mb' }));
  app.use('/api', createApiRouter({ store, config, openrouterFlowStore }));

  // Mount OpenRouter OAuth PKCE popup callback before Vite/static SPA catch-all
  app.get(
    [
      '/auth/openrouter/callback/:flowId',
      '/auth/openrouter/callback/:flowId/',
      '/auth/openrouter/callback',
      '/auth/openrouter/callback/',
    ],
    createOpenRouterCallbackHandler({
      store,
      config,
      flowStore: openrouterFlowStore,
    })
  );

  if (!config.isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = options.distDir || path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(config.port, config.host, () => resolve(s));
  });

  const url = `http://127.0.0.1:${config.port}`;
  console.log(
    `Digital Product Studio Commercial Cloud (${store.mode} store) running on http://${config.host}:${config.port}`
  );

  return { server, url, config };
}
