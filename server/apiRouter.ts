import express, { Request, Response, Router } from 'express';
import { AppConfig, loadConfig } from './config.ts';
import { DataStore } from './db/store.ts';
import { LocalStore } from './db/localStore.ts';
import { createProjectRouter } from './projects/projectRoutes.ts';
import { createAiRouter, DEFAULT_GEMINI_MODEL } from './ai/aiRoutes.ts';
import { createJobRouter } from './jobs/jobRoutes.ts';
import { createRateLimiter } from './middleware/rateLimit.ts';
import { searchReferences, retrieveReference, verifyReferenceRecords } from './referenceResearch.ts';
import { collectMarketResearch } from './marketResearch.ts';
import { FirebaseTokenVerifier } from './security/firebaseToken.ts';

export interface ApiRouterDeps {
  store?: DataStore;
  config?: AppConfig;
  verifyToken?: FirebaseTokenVerifier;
}

export function createApiRouter(deps: ApiRouterDeps = {}): Router {
  const router = express.Router();
  const config = deps.config || loadConfig();
  const store = deps.store || new LocalStore(':memory:');
  const ownerId = config.ownerUserId;

  const researchRateLimit = createRateLimiter({ windowMs: 60_000, maxRequests: 40 });

  async function recordResearchEvent(kind: 'market_research' | 'reference_research'): Promise<void> {
    await store.recordUsageEvent({
      userId: ownerId,
      projectId: null,
      eventKind: kind,
      provider: 'research',
      model: 'live-http',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      costStatus: 'actual',
    });
  }

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      version: '4.1.0',
      mode: 'commercial-cloud',
      dbMode: 'firestore',
      app: 'Digital Product Studio',
      authRequired: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      supportedProviders: ['gemini'],
      defaultModel: DEFAULT_GEMINI_MODEL,
      time: new Date().toISOString(),
    });
  });

  // Authenticated multi-user project backup/bundle export & server routes
  router.use('/projects', createProjectRouter({ store, config, verifyToken: deps.verifyToken }));

  // Authenticated server-side Gemini AI engine proxy
  router.use('/ai', createAiRouter({ store, config, verifyToken: deps.verifyToken }));

  // Authenticated guided workflow jobs
  router.use('/jobs', createJobRouter({ store, config, verifyToken: deps.verifyToken }));

  // Live market & academic reference research endpoints
  router.get('/market/research', researchRateLimit, async (_req: Request, res: Response) => {
    await recordResearchEvent('market_research');
    try {
      return res.json(await collectMarketResearch());
    } catch {
      return res
        .status(502)
        .json({ error: 'Market research failed. Retry after checking source access.' });
    }
  });

  router.get('/references/search', researchRateLimit, async (req: Request, res: Response) => {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    if (query.trim().length < 3 || query.length > 250) {
      return res.status(400).json({ error: 'Use a research query between 3 and 250 characters.' });
    }
    await recordResearchEvent('reference_research');
    try {
      return res.json(await searchReferences(query));
    } catch {
      return res.status(502).json({
        error: 'Reference search failed; no validated source records were created.',
      });
    }
  });

  router.post('/references/retrieve', researchRateLimit, async (req: Request, res: Response) => {
    const { pmcid, url } = req.body || {};
    if ((typeof pmcid !== 'string' && typeof url !== 'string') || (url?.length || 0) > 2000) {
      return res.status(400).json({ error: 'Provide a supported source URL or PMC identifier.' });
    }
    await recordResearchEvent('reference_research');
    try {
      return res.json(await retrieveReference({ pmcid, url }));
    } catch (error) {
      return res.status(422).json({
        error:
          error instanceof Error && error.message !== 'fetch failed'
            ? error.message
            : 'Could not retrieve the source text. Check network access; metadata is not validated full text.',
      });
    }
  });

  router.post('/references/verify', researchRateLimit, async (req: Request, res: Response) => {
    const cards = req.body?.cards;
    if (!Array.isArray(cards) || !cards.length || cards.length > 50) {
      return res.status(400).json({ error: 'Provide 1–50 source records for checking.' });
    }
    await recordResearchEvent('reference_research');
    try {
      return res.json(await verifyReferenceRecords(cards));
    } catch {
      return res.status(422).json({
        error: 'Source records could not be checked; no source validation was granted.',
      });
    }
  });

  router.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  return router;
}
