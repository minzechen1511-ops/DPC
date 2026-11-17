import type { AIProviderType, DigitalProductProject } from '../../src/types/project.ts';

export interface ProjectSummary {
  id: string;
  ownerUserId: string;
  title: string;
  slug: string | null;
  stage: string;
  revision: number;
  updatedAt: string;
  createdAt: string;
}

export interface ProjectRow extends ProjectSummary {
  data: DigitalProductProject;
  deletedAt: string | null;
}

export interface ProjectSnapshotRecord {
  id: string;
  projectId: string;
  ownerUserId: string;
  revision: number;
  reason: string;
  data: DigitalProductProject;
  createdAt: string;
}

export interface EncryptedCredentialRecord {
  id: string;
  userId: string;
  provider: AIProviderType;
  keyVersion: number;
  ciphertext: string;
  iv: string;
  authTag: string;
  hint: string;
  baseUrl: string | null;
  updatedAt: string;
}

export type WorkflowJobStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'waiting_gate'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface WorkflowJobRecord {
  id: string;
  userId: string;
  projectId: string;
  mode: 'manual_review' | 'guided_until_gate';
  status: WorkflowJobStatus;
  currentStep: string | null;
  stopAtGate: 'gateA' | 'gateB' | 'gateC' | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobStepRecord {
  id: string;
  jobId: string;
  stepOrder: number;
  stepKey: string;
  status: 'pending' | 'running' | 'completed' | 'skipped_locked' | 'failed' | 'cancelled';
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  errorMessage: string | null;
  attempts: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface UsageEventRecord {
  id: string;
  userId: string;
  projectId: string | null;
  eventKind: 'ai_chat' | 'market_research' | 'reference_research' | 'export_bundle';
  provider: string | null;
  model: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  costStatus: 'actual' | 'estimated' | 'unknown';
  createdAt: string;
}

export class RevisionConflictError extends Error {
  constructor(public currentRevision: number) {
    super(`Project revision conflict: local revision is ${currentRevision}.`);
    this.name = 'RevisionConflictError';
  }
}

export interface DataStore {
  readonly mode: 'local';
  init(): Promise<void>;
  close(): Promise<void>;

  // Owner-scoped Local Projects
  listProjects(ownerUserId: string): Promise<ProjectRow[]>;
  getProject(ownerUserId: string, projectId: string): Promise<ProjectRow | null>;
  createProject(input: {
    ownerUserId: string;
    project: DigitalProductProject;
    slug?: string | null;
  }): Promise<ProjectRow>;
  updateProject(input: {
    ownerUserId: string;
    projectId: string;
    expectedRevision: number;
    project: DigitalProductProject;
    reason?: string;
  }): Promise<ProjectRow>;
  softDeleteProject(ownerUserId: string, projectId: string): Promise<boolean>;
  listSnapshots(ownerUserId: string, projectId: string): Promise<ProjectSnapshotRecord[]>;

  // Encrypted BYOK Credentials
  listCredentials(userId: string): Promise<EncryptedCredentialRecord[]>;
  getCredential(userId: string, provider: AIProviderType): Promise<EncryptedCredentialRecord | null>;
  upsertCredential(input: Omit<EncryptedCredentialRecord, 'id' | 'updatedAt'>): Promise<EncryptedCredentialRecord>;
  deleteCredential(userId: string, provider: AIProviderType): Promise<boolean>;

  // Workflow Jobs & Steps
  createJob(input: {
    userId: string;
    projectId: string;
    mode: 'manual_review' | 'guided_until_gate';
    stopAtGate?: 'gateA' | 'gateB' | 'gateC' | null;
    steps: Array<{ stepOrder: number; stepKey: string; input?: Record<string, unknown> }>;
  }): Promise<{ job: WorkflowJobRecord; steps: JobStepRecord[] }>;
  listJobs(userId: string, projectId?: string): Promise<WorkflowJobRecord[]>;
  getJobWithSteps(userId: string, jobId: string): Promise<{ job: WorkflowJobRecord; steps: JobStepRecord[] } | null>;
  updateJob(
    userId: string,
    jobId: string,
    patch: Partial<Pick<WorkflowJobRecord, 'status' | 'currentStep' | 'stopAtGate' | 'errorMessage' | 'startedAt' | 'completedAt'>>
  ): Promise<WorkflowJobRecord | null>;
  updateJobStep(
    userId: string,
    stepId: string,
    patch: Partial<Pick<JobStepRecord, 'status' | 'output' | 'errorMessage' | 'attempts' | 'startedAt' | 'completedAt'>>
  ): Promise<JobStepRecord | null>;

  // Usage Events
  recordUsageEvent(input: Omit<UsageEventRecord, 'id' | 'createdAt'>): Promise<UsageEventRecord>;
  getDailyUsageCounts(userId: string, sinceIso: string): Promise<{
    aiRequests: number;
    researchRequests: number;
    exportRequests: number;
    totalTokens: number;
    estimatedCostUsd: number;
  }>;
  listUsageEvents(userId: string, limit?: number): Promise<UsageEventRecord[]>;
}
