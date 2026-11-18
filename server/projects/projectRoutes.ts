import express, { Request, Response, Router } from 'express';
import { AppConfig } from '../config.ts';
import { DataStore, RevisionConflictError } from '../db/store.ts';
import { DigitalProductProject } from '../../src/types/project.ts';
import { sanitizeProjectForExport } from '../../src/utils/projectSanitizer.ts';
import { migrateProjectSchema } from '../../src/utils/projectMigration.ts';
import { gateIssues, revokeApprovals } from '../../src/utils/gatePolicy.ts';
import { verifyReferenceRecords } from '../referenceResearch.ts';
import { isRetrievedSource } from '../../src/utils/sourceEvidence.ts';
import { buildLearningBundle } from '../../src/utils/learningBundle.ts';
import {
  AuthenticatedRequest,
  createRequireFirebaseAuth,
  FirebaseTokenVerifier,
} from '../security/firebaseToken.ts';

function isValidProjectShape(obj: any): obj is DigitalProductProject {
  return (
    Boolean(obj) &&
    typeof obj === 'object' &&
    typeof obj.projectId === 'string' &&
    obj.projectId.trim().length > 0 &&
    (typeof obj.name === 'string' || typeof obj.charter?.productTitle === 'string')
  );
}

async function compileVerifiedZipBundle(
  rawProject: DigitalProductProject,
  mode: 'buyer_bundle' | 'author_review'
): Promise<{
  status: number;
  errorPayload?: Record<string, any>;
  buffer?: Buffer;
  filename?: string;
}> {
  const project = sanitizeProjectForExport(rawProject);
  let sourceReport;

  if (mode === 'buyer_bundle') {
    const issues = gateIssues(project, 'gateC');
    if (!project.workflow?.gates?.gateC?.isApproved) {
      issues.push('Explicit Gate C approval is required.');
    }
    if (issues.length > 0) {
      return {
        status: 422,
        errorPayload: {
          error: 'Publication requirements must pass before generating a commercial buyer bundle.',
          code: 'GATE_CHECK_FAILED',
          issues,
        },
      };
    }

    const retrievedSources = (project.referenceLibrary?.cards || []).filter(isRetrievedSource);
    if (retrievedSources.length > 0) {
      sourceReport = await verifyReferenceRecords(retrievedSources);
      if (!sourceReport.valid) {
        return {
          status: 422,
          errorPayload: {
            error: 'Server-side source verification failed; buyer delivery remains blocked.',
            code: 'SOURCE_CHECK_FAILED',
            issues: sourceReport.checks.filter((c) => !c.valid).map((c) => c.message || c.id),
          },
        };
      }
    }
  }

  const { zip } = await buildLearningBundle(project, sourceReport);
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const slug =
    (project.intake?.projectName || project.name || 'digital-product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'digital-product';
  const filename = `${slug}-${mode === 'buyer_bundle' ? 'learning-bundle' : 'author-review'}.zip`;

  return { status: 200, buffer, filename };
}

export function createProjectRouter(deps: {
  store: DataStore;
  config: AppConfig;
  verifyToken?: FirebaseTokenVerifier;
}): Router {
  const router = express.Router();
  const { store } = deps;
  const requireAuth = createRequireFirebaseAuth(deps.verifyToken);

  router.use(requireAuth);

  // Stateless bundle compilation for Cloud Run + Firestore multi-user workspaces
  router.post('/export-bundle', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const candidate = req.body?.project;
    const mode = req.body?.mode === 'author_review' ? 'author_review' : 'buyer_bundle';

    if (!isValidProjectShape(candidate)) {
      return res.status(400).json({ error: 'Valid project payload with projectId is required.' });
    }

    const compiled = await compileVerifiedZipBundle(candidate, mode);
    if (compiled.errorPayload || !compiled.buffer || !compiled.filename) {
      return res.status(compiled.status).json(compiled.errorPayload);
    }

    await store.recordUsageEvent({
      userId: uid,
      projectId: candidate.projectId,
      eventKind: 'export_bundle',
      provider: null,
      model: mode,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      costStatus: 'actual',
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${compiled.filename}"`);
    return res.send(compiled.buffer);
  });

  router.get('/', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const rows = await store.listProjects(uid);
    return res.json({
      projects: rows.map((r) => ({
        id: r.id,
        title: r.title,
        stage: r.stage,
        revision: r.revision,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        data: r.data,
      })),
    });
  });

  router.post('/', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const candidate = req.body?.project || req.body;
    if (!isValidProjectShape(candidate)) {
      return res.status(400).json({ error: 'Valid project payload with projectId is required.' });
    }

    const row = await store.createProject({
      ownerUserId: uid,
      project: sanitizeProjectForExport(candidate),
      slug: typeof req.body?.slug === 'string' ? req.body.slug : null,
    });

    return res.status(201).json({
      project: row.data,
      revision: row.revision,
      updatedAt: row.updatedAt,
    });
  });

  router.post('/import', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const rawList: unknown[] = Array.isArray(req.body?.projects)
      ? req.body.projects
      : req.body?.project
      ? [req.body.project]
      : [];

    if (!rawList.length || rawList.length > 50) {
      return res.status(400).json({ error: 'Provide 1 to 50 projects to import.' });
    }

    const imported: Array<{ id: string; title: string; revision: number; data: DigitalProductProject }> = [];
    const skipped: Array<{ title: string; reason: string }> = [];

    for (const item of rawList) {
      if (!isValidProjectShape(item)) {
        skipped.push({ title: 'Unknown', reason: 'Invalid project JSON schema' });
        continue;
      }

      const sanitized = sanitizeProjectForExport(migrateProjectSchema(item));
      const safeProject = revokeApprovals(
        {
          ...sanitized,
          projectId: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          preferences: {
            ...sanitized.preferences,
            automationMode:
              sanitized.preferences?.automationMode === 'guided_until_gate'
                ? 'guided_until_gate'
                : 'manual_review',
            autoApproveNonCritical: false,
          },
        },
        'gateA'
      );

      const created = await store.createProject({
        ownerUserId: uid,
        project: safeProject,
      });
      imported.push({
        id: created.id,
        title: created.title,
        revision: created.revision,
        data: created.data,
      });
    }

    return res.status(200).json({
      imported,
      skipped,
      importedCount: imported.length,
      skippedCount: skipped.length,
    });
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const row = await store.getProject(uid, String(req.params.id));
    if (!row) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    return res.json({
      project: row.data,
      revision: row.revision,
      updatedAt: row.updatedAt,
    });
  });

  router.patch('/:id', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const projectId = String(req.params.id);
    const expectedRevision = Number(req.body?.expectedRevision);
    const candidate = req.body?.project;

    if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
      return res.status(400).json({ error: 'Valid integer expectedRevision (>= 1) is required.' });
    }
    if (!candidate || typeof candidate !== 'object') {
      return res.status(400).json({ error: 'Project payload is required.' });
    }

    try {
      const updated = await store.updateProject({
        ownerUserId: uid,
        projectId,
        expectedRevision,
        project: sanitizeProjectForExport({ ...candidate, projectId }),
        reason: typeof req.body?.reason === 'string' ? req.body.reason : 'autosave',
      });
      return res.json({
        project: updated.data,
        revision: updated.revision,
        updatedAt: updated.updatedAt,
      });
    } catch (err: any) {
      if (err instanceof RevisionConflictError) {
        const latest = await store.getProject(uid, projectId);
        return res.status(409).json({
          error: err.message,
          code: 'REVISION_CONFLICT',
          currentRevision: err.currentRevision,
          serverProject: latest?.data || null,
        });
      }
      return res.status(404).json({ error: err?.message || 'Project not found.' });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const deleted = await store.softDeleteProject(uid, String(req.params.id));
    if (!deleted) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    return res.json({ ok: true, id: String(req.params.id) });
  });

  router.post('/:id/duplicate', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const source = await store.getProject(uid, String(req.params.id));
    if (!source) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const now = new Date().toISOString();
    const copyTitle = `${source.data.charter?.productTitle || source.title || 'Project'} (Copy)`;
    const cloned = sanitizeProjectForExport({
      ...source.data,
      projectId: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: copyTitle,
      createdAt: now,
      updatedAt: now,
      charter: {
        ...source.data.charter,
        productTitle: copyTitle,
      },
    });

    const created = await store.createProject({ ownerUserId: uid, project: cloned });
    return res.status(201).json({
      project: created.data,
      revision: created.revision,
      updatedAt: created.updatedAt,
    });
  });

  router.get('/:id/snapshots', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const snaps = await store.listSnapshots(uid, String(req.params.id));
    return res.json({
      snapshots: snaps.map((s) => ({
        id: s.id,
        revision: s.revision,
        reason: s.reason,
        createdAt: s.createdAt,
      })),
    });
  });

  router.get('/:id/export-backup', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const row = await store.getProject(uid, String(req.params.id));
    if (!row) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    const clean = sanitizeProjectForExport(row.data);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${row.id}.json"`);
    return res.send(JSON.stringify(clean, null, 2));
  });

  router.post('/:id/export-bundle', async (req: Request, res: Response) => {
    const uid = (req as AuthenticatedRequest).authUser!.uid;
    const mode = req.body?.mode === 'author_review' ? 'author_review' : 'buyer_bundle';
    const row = await store.getProject(uid, String(req.params.id));
    if (!row) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const compiled = await compileVerifiedZipBundle(row.data, mode);
    if (compiled.errorPayload || !compiled.buffer || !compiled.filename) {
      return res.status(compiled.status).json(compiled.errorPayload);
    }

    await store.recordUsageEvent({
      userId: uid,
      projectId: row.id,
      eventKind: 'export_bundle',
      provider: null,
      model: mode,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      costStatus: 'actual',
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${compiled.filename}"`);
    return res.send(compiled.buffer);
  });

  return router;
}
