import express, { Request, Response, Router } from 'express';
import { AppConfig } from '../config.ts';
import { DataStore } from '../db/store.ts';
import {
  AuthenticatedRequest,
  createRequireFirebaseAuth,
  FirebaseTokenVerifier,
} from '../security/firebaseToken.ts';

const DEFAULT_GUIDED_STEPS = [
  { stepOrder: 1, stepKey: 'market_research' },
  { stepOrder: 2, stepKey: 'topic_candidates_sync' },
  { stepOrder: 3, stepKey: 'project_brief_draft' },
  { stepOrder: 4, stepKey: 'uvz_and_transformation' },
  { stepOrder: 5, stepKey: 'reference_evidence_check' },
  { stepOrder: 6, stepKey: 'outline_architecture' },
  { stepOrder: 7, stepKey: 'chapter_drafts_unlocked_only' },
  { stepOrder: 8, stepKey: 'companion_resources' },
];

export function createJobRouter(deps: {
  store: DataStore;
  config: AppConfig;
  verifyToken?: FirebaseTokenVerifier;
}): Router {
  const router = express.Router();
  const { store } = deps;
  const requireAuth = createRequireFirebaseAuth(deps.verifyToken);

  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
    const jobs = await store.listJobs(uid, projectId);
    return res.json({ jobs });
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const found = await store.getJobWithSteps(uid, String(req.params.id));
    if (!found) {
      return res.status(404).json({ error: 'Workflow job not found.' });
    }
    return res.json(found);
  });

  router.post('/', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const projectId = String(req.body?.projectId || '');
    const mode = req.body?.mode === 'guided_until_gate' ? 'guided_until_gate' : 'manual_review';
    const stopAtGate =
      req.body?.stopAtGate === 'gateA' || req.body?.stopAtGate === 'gateB' || req.body?.stopAtGate === 'gateC'
        ? req.body.stopAtGate
        : 'gateA';

    const proj = await store.getProject(uid, projectId);
    if (!proj) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const lockedCount = (proj.data.outline || []).filter((c) => c.isLocked || c.isCompleted).length;
    const steps = DEFAULT_GUIDED_STEPS.map((s) => ({
      ...s,
      input:
        s.stepKey === 'chapter_drafts_unlocked_only'
          ? { preserveLockedChapters: true, lockedChapterCount: lockedCount }
          : { stopAtGate },
    }));

    const created = await store.createJob({
      userId: uid,
      projectId: proj.id,
      mode,
      stopAtGate,
      steps,
    });

    const gateStatus = mode === 'guided_until_gate' ? 'waiting_gate' : 'paused';
    const updatedJob = await store.updateJob(uid, created.job.id, {
      status: gateStatus,
      startedAt: new Date().toISOString(),
    });

    if (lockedCount > 0) {
      const draftStep = created.steps.find((s) => s.stepKey === 'chapter_drafts_unlocked_only');
      if (draftStep) {
        await store.updateJobStep(uid, draftStep.id, {
          status: 'skipped_locked',
          output: { reason: `Preserved ${lockedCount} locked/approved chapters without overwrite.` },
        });
      }
    }

    const refreshed = await store.getJobWithSteps(uid, created.job.id);
    return res.status(201).json(refreshed || { job: updatedJob, steps: created.steps });
  });

  router.post('/:id/pause', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const job = await store.updateJob(uid, String(req.params.id), {
      status: 'paused',
    });
    if (!job) return res.status(404).json({ error: 'Workflow job not found.' });
    return res.json({ job });
  });

  router.post('/:id/resume', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const found = await store.getJobWithSteps(uid, String(req.params.id));
    if (!found) return res.status(404).json({ error: 'Workflow job not found.' });
    if (found.job.status === 'cancelled' || found.job.status === 'completed') {
      return res.status(409).json({ error: `Cannot resume a ${found.job.status} job.` });
    }
    const job = await store.updateJob(uid, found.job.id, {
      status: 'waiting_gate',
      errorMessage: null,
    });
    return res.json({ job, steps: found.steps });
  });

  router.post('/:id/cancel', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const found = await store.getJobWithSteps(uid, String(req.params.id));
    if (!found) return res.status(404).json({ error: 'Workflow job not found.' });
    const job = await store.updateJob(uid, found.job.id, {
      status: 'cancelled',
      completedAt: new Date().toISOString(),
    });
    for (const s of found.steps) {
      if (s.status === 'pending' || s.status === 'running') {
        await store.updateJobStep(uid, s.id, { status: 'cancelled' });
      }
    }
    return res.json({ job });
  });

  router.post('/:id/retry', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const found = await store.getJobWithSteps(uid, String(req.params.id));
    if (!found) return res.status(404).json({ error: 'Workflow job not found.' });
    for (const s of found.steps) {
      if (s.status === 'failed') {
        await store.updateJobStep(uid, s.id, {
          status: 'pending',
          errorMessage: null,
          attempts: s.attempts + 1,
        });
      }
    }
    const job = await store.updateJob(uid, found.job.id, {
      status: 'waiting_gate',
      errorMessage: null,
    });
    return res.json({ job });
  });

  return router;
}
