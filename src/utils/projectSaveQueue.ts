import type {DigitalProductProject} from '../types/project.ts';

export class ProjectRevisionConflictError extends Error {
  readonly projectId: string;
  readonly expectedRevision: number;
  readonly actualRevision: number;

  constructor(projectId: string, expectedRevision: number, actualRevision: number) {
    super(
      `Revision conflict for project "${projectId}": expected revision ${expectedRevision}, but cloud storage is at revision ${actualRevision}. Reload from Cloud before saving.`
    );
    this.name = 'ProjectRevisionConflictError';
    this.projectId = projectId;
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

export function isProjectRevisionConflictError(error: unknown): error is ProjectRevisionConflictError {
  return (
    error instanceof ProjectRevisionConflictError ||
    (Boolean(error) &&
      typeof error === 'object' &&
      (error as { name?: string }).name === 'ProjectRevisionConflictError')
  );
}

/**
 * Validates optimistic concurrency against the current stored revision and returns the next revision.
 */
export function assertExpectedRevision(
  projectId: string,
  existingRevision: number | null,
  expectedRevision?: number
): number {
  if (existingRevision === null) {
    if (expectedRevision !== undefined && expectedRevision > 0) {
      throw new ProjectRevisionConflictError(projectId, expectedRevision, 0);
    }
    return 1;
  }
  if (expectedRevision !== undefined && existingRevision !== expectedRevision) {
    throw new ProjectRevisionConflictError(projectId, expectedRevision, existingRevision);
  }
  return existingRevision + 1;
}

/** Compare normalized workspace data, including decisions, evidence, and the resume point.
 * Firestore owns the modification timestamp. Object field order has no persistence semantics.
 */
export function sameSavedProject(left: DigitalProductProject, right: DigitalProductProject): boolean {
  function serialized(project: DigitalProductProject) {
    const {updatedAt, ...fields} = project;
    return JSON.stringify(fields, (_key, value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
      return Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]]));
    });
  }
  return serialized(left) === serialized(right);
}

interface PendingEntry<TProject, TResult> {
  snapshot: TProject;
  waiters: Array<{
    resolve: (result: TResult) => void;
    reject: (error: unknown) => void;
  }>;
}

/**
 * Serializes saves per projectId and coalesces rapid queued snapshots so overlapping
 * saves never overtake each other or submit stale expectedRevision values.
 */
export class SerializedProjectSaveQueue<
  TProject extends { projectId: string },
  TResult extends { revision: number }
> {
  private readonly revisions = new Map<string, number>();
  private readonly active = new Map<string, Promise<void>>();
  private readonly pending = new Map<string, PendingEntry<TProject, TResult>>();

  setRevision(projectId: string, revision: number): void {
    this.revisions.set(projectId, revision);
  }

  getRevision(projectId: string): number | undefined {
    return this.revisions.get(projectId);
  }

  hasPending(projectId: string): boolean {
    return this.active.has(projectId) || this.pending.has(projectId);
  }

  clearProject(projectId: string): void {
    const entry = this.pending.get(projectId);
    if (entry) {
      for (const waiter of entry.waiters) {
        waiter.reject(new Error(`Pending save queue cleared for project "${projectId}".`));
      }
      this.pending.delete(projectId);
    }
    this.revisions.delete(projectId);
  }

  reset(): void {
    for (const projectId of [...this.pending.keys()]) {
      this.clearProject(projectId);
    }
    this.revisions.clear();
  }

  enqueue(
    snapshot: TProject,
    executor: (target: TProject, expectedRevision: number | undefined) => Promise<TResult>,
    initialExpectedRevision?: number
  ): Promise<TResult> {
    const projectId = snapshot.projectId;
    if (!this.revisions.has(projectId) && initialExpectedRevision !== undefined) {
      this.revisions.set(projectId, initialExpectedRevision);
    }

    return new Promise<TResult>((resolve, reject) => {
      const existingPending = this.pending.get(projectId);
      if (existingPending) {
        existingPending.snapshot = snapshot;
        existingPending.waiters.push({ resolve, reject });
      } else {
        this.pending.set(projectId, {
          snapshot,
          waiters: [{ resolve, reject }],
        });
      }

      if (!this.active.has(projectId)) {
        const runner = this.drain(projectId, executor).finally(() => {
          this.active.delete(projectId);
        });
        this.active.set(projectId, runner);
      }
    });
  }

  private async drain(
    projectId: string,
    executor: (target: TProject, expectedRevision: number | undefined) => Promise<TResult>
  ): Promise<void> {
    while (this.pending.has(projectId)) {
      const batch = this.pending.get(projectId)!;
      this.pending.delete(projectId);

      const expectedRevision = this.revisions.get(projectId);
      try {
        const result = await executor(batch.snapshot, expectedRevision);
        this.revisions.set(projectId, result.revision);
        for (const waiter of batch.waiters) {
          waiter.resolve(result);
        }
      } catch (error) {
        if (isProjectRevisionConflictError(error)) {
          this.revisions.set(projectId, error.actualRevision);
          const stalePending = this.pending.get(projectId);
          if (stalePending) {
            this.pending.delete(projectId);
            for (const waiter of stalePending.waiters) {
              waiter.reject(error);
            }
          }
        }
        for (const waiter of batch.waiters) {
          waiter.reject(error);
        }
        if (isProjectRevisionConflictError(error)) {
          break;
        }
      }
    }
  }
}
