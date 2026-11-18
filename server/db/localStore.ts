import { invalidateChangedApprovals } from '../../src/utils/approvalIntegrity.ts';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { AIProviderType, DigitalProductProject } from '../../src/types/project.ts';
import { sanitizeProjectForExport } from '../../src/utils/projectSanitizer.ts';
import {
  DataStore,
  EncryptedCredentialRecord,
  JobStepRecord,
  ProjectRow,
  ProjectSnapshotRecord,
  RevisionConflictError,
  UsageEventRecord,
  WorkflowJobRecord,
} from './store.ts';

interface PersistedShape {
  projects: ProjectRow[];
  projectSnapshots: ProjectSnapshotRecord[];
  encryptedCredentials: EncryptedCredentialRecord[];
  workflowJobs: WorkflowJobRecord[];
  jobSteps: JobStepRecord[];
  usageEvents: UsageEventRecord[];
}

function emptyState(): PersistedShape {
  return {
    projects: [],
    projectSnapshots: [],
    encryptedCredentials: [],
    workflowJobs: [],
    jobSteps: [],
    usageEvents: [],
  };
}

function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

export class LocalStore implements DataStore {
  readonly mode = 'local' as const;
  private state: PersistedShape = emptyState();
  private readonly filePath: string | null;

  constructor(filePath: string = path.resolve(process.cwd(), '.local-data/store.json')) {
    this.filePath = filePath === ':memory:' ? null : filePath;
  }

  async init(): Promise<void> {
    if (!this.filePath) return;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.state = {
          projects: Array.isArray(parsed.projects) ? parsed.projects : [],
          projectSnapshots: Array.isArray(parsed.projectSnapshots) ? parsed.projectSnapshots : [],
          encryptedCredentials: Array.isArray(parsed.encryptedCredentials) ? parsed.encryptedCredentials : [],
          workflowJobs: Array.isArray(parsed.workflowJobs) ? parsed.workflowJobs : [],
          jobSteps: Array.isArray(parsed.jobSteps) ? parsed.jobSteps : [],
          usageEvents: Array.isArray(parsed.usageEvents) ? parsed.usageEvents : [],
        };
      } catch (cause) {
        throw new Error('Stored workspace could not be read. Original data was preserved; restore a valid backup before starting.', {cause});
      }
    }
  }

  async close(): Promise<void> {
    this.flush();
  }

  private flush(): void {
    if (!this.filePath) return;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2), 'utf8');
    fs.renameSync(tmp, this.filePath);
  }

  async listProjects(ownerUserId: string): Promise<ProjectRow[]> {
    return this.state.projects
      .filter((p) => p.ownerUserId === ownerUserId && !p.deletedAt)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .map((p) => ({ ...p, data: sanitizeProjectForExport(p.data) }));
  }

  async getProject(ownerUserId: string, projectId: string): Promise<ProjectRow | null> {
    const found = this.state.projects.find(
      (p) => p.id === projectId && p.ownerUserId === ownerUserId && !p.deletedAt
    );
    return found ? { ...found, data: sanitizeProjectForExport(found.data) } : null;
  }

  async createProject(input: {
    ownerUserId: string;
    project: DigitalProductProject;
    slug?: string | null;
  }): Promise<ProjectRow> {
    const now = new Date().toISOString();
    const clean = sanitizeProjectForExport({
      ...input.project,
      projectId: input.project.projectId || uid('proj'),
      createdAt: input.project.createdAt || now,
      updatedAt: now,
    });
    const existing = this.state.projects.find(
      (p) => p.id === clean.projectId && !p.deletedAt
    );
    if (existing) {
      clean.projectId = uid('proj');
    }

    const row: ProjectRow = {
      id: clean.projectId,
      ownerUserId: input.ownerUserId,
      title: clean.charter?.productTitle || clean.name || 'Untitled Project',
      slug: input.slug ?? null,
      stage: clean.workflow?.activeStage || 'market_research',
      revision: 1,
      data: clean,
      deletedAt: null,
      createdAt: clean.createdAt,
      updatedAt: now,
    };
    this.state.projects.push(row);
    this.state.projectSnapshots.push({
      id: uid('snp'),
      projectId: row.id,
      ownerUserId: input.ownerUserId,
      revision: 1,
      reason: 'create',
      data: clean,
      createdAt: now,
    });
    this.flush();
    return row;
  }

  async updateProject(input: {
    ownerUserId: string;
    projectId: string;
    expectedRevision: number;
    project: DigitalProductProject;
    reason?: string;
  }): Promise<ProjectRow> {
    const row = this.state.projects.find(
      (p) => p.id === input.projectId && p.ownerUserId === input.ownerUserId && !p.deletedAt
    );
    if (!row) {
      throw new Error('Project not found.');
    }
    if (row.revision !== input.expectedRevision) {
      throw new RevisionConflictError(row.revision);
    }

    const now = new Date().toISOString();
    const clean = invalidateChangedApprovals(row.data, sanitizeProjectForExport({
      ...input.project,
      projectId: input.projectId,
      updatedAt: now,
    }));
    row.title = clean.charter?.productTitle || clean.name || row.title;
    row.stage = clean.workflow?.activeStage || row.stage;
    row.revision += 1;
    row.data = clean;
    row.updatedAt = now;

    this.state.projectSnapshots.push({
      id: uid('snp'),
      projectId: row.id,
      ownerUserId: input.ownerUserId,
      revision: row.revision,
      reason: input.reason || 'autosave',
      data: clean,
      createdAt: now,
    });

    const projSnaps = this.state.projectSnapshots.filter((s) => s.projectId === row.id);
    if (projSnaps.length > 25) {
      const keepIds = new Set(
        projSnaps.sort((a, b) => b.revision - a.revision).slice(0, 25).map((s) => s.id)
      );
      this.state.projectSnapshots = this.state.projectSnapshots.filter(
        (s) => s.projectId !== row.id || keepIds.has(s.id)
      );
    }

    this.flush();
    return row;
  }

  async softDeleteProject(ownerUserId: string, projectId: string): Promise<boolean> {
    const row = this.state.projects.find(
      (p) => p.id === projectId && p.ownerUserId === ownerUserId && !p.deletedAt
    );
    if (!row) return false;
    row.deletedAt = new Date().toISOString();
    this.flush();
    return true;
  }

  async listSnapshots(ownerUserId: string, projectId: string): Promise<ProjectSnapshotRecord[]> {
    return this.state.projectSnapshots
      .filter((s) => s.projectId === projectId && s.ownerUserId === ownerUserId)
      .sort((a, b) => b.revision - a.revision);
  }

  async listCredentials(userId: string): Promise<EncryptedCredentialRecord[]> {
    return this.state.encryptedCredentials.filter((c) => c.userId === userId);
  }

  async getCredential(
    userId: string,
    provider: AIProviderType
  ): Promise<EncryptedCredentialRecord | null> {
    return (
      this.state.encryptedCredentials.find(
        (c) => c.userId === userId && c.provider === provider
      ) || null
    );
  }

  async upsertCredential(
    input: Omit<EncryptedCredentialRecord, 'id' | 'updatedAt'>
  ): Promise<EncryptedCredentialRecord> {
    const now = new Date().toISOString();
    const existing = this.state.encryptedCredentials.find(
      (c) => c.userId === input.userId && c.provider === input.provider
    );
    if (existing) {
      Object.assign(existing, input, { updatedAt: now });
      this.flush();
      return existing;
    }
    const created: EncryptedCredentialRecord = {
      ...input,
      id: uid('crd'),
      updatedAt: now,
    };
    this.state.encryptedCredentials.push(created);
    this.flush();
    return created;
  }

  async deleteCredential(userId: string, provider: AIProviderType): Promise<boolean> {
    const before = this.state.encryptedCredentials.length;
    this.state.encryptedCredentials = this.state.encryptedCredentials.filter(
      (c) => !(c.userId === userId && c.provider === provider)
    );
    if (this.state.encryptedCredentials.length !== before) {
      this.flush();
      return true;
    }
    return false;
  }

  async createJob(input: {
    userId: string;
    projectId: string;
    mode: 'manual_review' | 'guided_until_gate';
    stopAtGate?: 'gateA' | 'gateB' | 'gateC' | null;
    steps: Array<{ stepOrder: number; stepKey: string; input?: Record<string, unknown> }>;
  }): Promise<{ job: WorkflowJobRecord; steps: JobStepRecord[] }> {
    const now = new Date().toISOString();
    const job: WorkflowJobRecord = {
      id: uid('job'),
      userId: input.userId,
      projectId: input.projectId,
      mode: input.mode,
      status: 'queued',
      currentStep: input.steps[0]?.stepKey || null,
      stopAtGate: input.stopAtGate ?? null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const steps: JobStepRecord[] = input.steps.map((s) => ({
      id: uid('stp'),
      jobId: job.id,
      stepOrder: s.stepOrder,
      stepKey: s.stepKey,
      status: 'pending',
      input: s.input || {},
      output: {},
      errorMessage: null,
      attempts: 0,
      startedAt: null,
      completedAt: null,
    }));
    this.state.workflowJobs.unshift(job);
    this.state.jobSteps.push(...steps);
    this.flush();
    return { job, steps };
  }

  async listJobs(userId: string, projectId?: string): Promise<WorkflowJobRecord[]> {
    return this.state.workflowJobs.filter(
      (j) => j.userId === userId && (!projectId || j.projectId === projectId)
    );
  }

  async getJobWithSteps(
    userId: string,
    jobId: string
  ): Promise<{ job: WorkflowJobRecord; steps: JobStepRecord[] } | null> {
    const job = this.state.workflowJobs.find((j) => j.id === jobId && j.userId === userId);
    if (!job) return null;
    const steps = this.state.jobSteps
      .filter((s) => s.jobId === jobId)
      .sort((a, b) => a.stepOrder - b.stepOrder);
    return { job, steps };
  }

  async updateJob(
    userId: string,
    jobId: string,
    patch: Partial<
      Pick<
        WorkflowJobRecord,
        'status' | 'currentStep' | 'stopAtGate' | 'errorMessage' | 'startedAt' | 'completedAt'
      >
    >
  ): Promise<WorkflowJobRecord | null> {
    const job = this.state.workflowJobs.find((j) => j.id === jobId && j.userId === userId);
    if (!job) return null;
    Object.assign(job, patch, { updatedAt: new Date().toISOString() });
    this.flush();
    return job;
  }

  async updateJobStep(
    userId: string,
    stepId: string,
    patch: Partial<
      Pick<JobStepRecord, 'status' | 'output' | 'errorMessage' | 'attempts' | 'startedAt' | 'completedAt'>
    >
  ): Promise<JobStepRecord | null> {
    const step = this.state.jobSteps.find((s) => s.id === stepId);
    if (!step) return null;
    const job = this.state.workflowJobs.find((j) => j.id === step.jobId && j.userId === userId);
    if (!job) return null;
    Object.assign(step, patch);
    this.flush();
    return step;
  }

  async recordUsageEvent(
    input: Omit<UsageEventRecord, 'id' | 'createdAt'>
  ): Promise<UsageEventRecord> {
    const ev: UsageEventRecord = {
      ...input,
      id: uid('usg'),
      createdAt: new Date().toISOString(),
    };
    this.state.usageEvents.unshift(ev);
    this.flush();
    return ev;
  }

  async getDailyUsageCounts(userId: string, sinceIso: string): Promise<{
    aiRequests: number;
    researchRequests: number;
    exportRequests: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }> {
    const cutoff = Date.parse(sinceIso);
    const recent = this.state.usageEvents.filter(
      (e) => e.userId === userId && Date.parse(e.createdAt) >= cutoff
    );
    return {
      aiRequests: recent.filter((e) => e.eventKind === 'ai_chat').length,
      researchRequests: recent.filter(
        (e) => e.eventKind === 'market_research' || e.eventKind === 'reference_research'
      ).length,
      exportRequests: recent.filter((e) => e.eventKind === 'export_bundle').length,
      totalTokens: recent.reduce((sum, e) => sum + e.totalTokens, 0),
      estimatedCostUsd: Number(
        recent.reduce((sum, e) => sum + e.estimatedCostUsd, 0).toFixed(4)
      ),
    };
  }

  async listUsageEvents(userId: string, limit = 50): Promise<UsageEventRecord[]> {
    return this.state.usageEvents.filter((e) => e.userId === userId).slice(0, limit);
  }
}
