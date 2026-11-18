import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertExpectedRevision,
  ProjectRevisionConflictError,
  SerializedProjectSaveQueue,
} from './projectSaveQueue.ts';

test('assertExpectedRevision validates initial creation and optimistic concurrency checks', () => {
  assert.equal(assertExpectedRevision('proj_1', null, undefined), 1);
  assert.equal(assertExpectedRevision('proj_1', null, 0), 1);
  assert.throws(
    () => assertExpectedRevision('proj_1', null, 2),
    (err: unknown) =>
      err instanceof ProjectRevisionConflictError &&
      err.expectedRevision === 2 &&
      err.actualRevision === 0
  );

  assert.equal(assertExpectedRevision('proj_1', 3, 3), 4);
  assert.throws(
    () => assertExpectedRevision('proj_1', 3, 2),
    (err: unknown) =>
      err instanceof ProjectRevisionConflictError &&
      err.expectedRevision === 2 &&
      err.actualRevision === 3
  );
});

test('SerializedProjectSaveQueue serializes overlapping saves and coalesces rapid queued snapshots cleanly', async () => {
  const queue = new SerializedProjectSaveQueue<{ projectId: string; title: string }, { project: { projectId: string; title: string }; revision: number }>();
  let serverRevision = 1;
  let serverTitle = 'Initial';
  let activeWrites = 0;
  let maxConcurrentWrites = 0;
  const seenExpectedRevisions: Array<number | undefined> = [];

  queue.setRevision('proj_sync', 1);

  let releaseFirstWrite!: () => void;
  const firstWriteGate = new Promise<void>((resolve) => {
    releaseFirstWrite = resolve;
  });

  const executor = async (
    snapshot: { projectId: string; title: string },
    expectedRevision: number | undefined
  ) => {
    activeWrites += 1;
    maxConcurrentWrites = Math.max(maxConcurrentWrites, activeWrites);
    seenExpectedRevisions.push(expectedRevision);
    if (snapshot.title === 'Edit 1') {
      await firstWriteGate;
    } else {
      await new Promise((r) => setTimeout(r, 10));
    }
    const nextRev = assertExpectedRevision(snapshot.projectId, serverRevision, expectedRevision);
    serverRevision = nextRev;
    serverTitle = snapshot.title;
    activeWrites -= 1;
    return { project: snapshot, revision: nextRev };
  };

  // Trigger three overlapping saves rapidly before the first finishes
  const p1 = queue.enqueue({ projectId: 'proj_sync', title: 'Edit 1' }, executor, 1);
  const p2 = queue.enqueue({ projectId: 'proj_sync', title: 'Edit 2 (superseded)' }, executor, 1);
  const p3 = queue.enqueue({ projectId: 'proj_sync', title: 'Edit 3 (final)' }, executor, 1);

  // Release the first write after p2 and p3 are already queued
  releaseFirstWrite();

  const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
  assert.equal(maxConcurrentWrites, 1);
  assert.equal(r1.revision, 2);
  assert.equal(r2.revision, 3);
  assert.equal(r3.revision, 3);
  assert.equal(serverRevision, 3);
  assert.equal(serverTitle, 'Edit 3 (final)');
  assert.deepEqual(seenExpectedRevisions, [1, 2]);
});

test('SerializedProjectSaveQueue surfaces ProjectRevisionConflictError when remote advances independently', async () => {
  const queue = new SerializedProjectSaveQueue<{ projectId: string; title: string }, { project: { projectId: string; title: string }; revision: number }>();
  let serverRevision = 5; // Another tab already saved r5
  let serverTitle = 'Remote Newest';

  queue.setRevision('proj_conflict', 2); // This tab is still at r2

  await assert.rejects(
    () =>
      queue.enqueue(
        { projectId: 'proj_conflict', title: 'Stale Local Edit' },
        async (snapshot, expectedRevision) => {
          const nextRev = assertExpectedRevision(
            snapshot.projectId,
            serverRevision,
            expectedRevision
          );
          serverRevision = nextRev;
          serverTitle = snapshot.title;
          return { project: snapshot, revision: nextRev };
        },
        2
      ),
    (err: unknown) =>
      err instanceof ProjectRevisionConflictError &&
      err.expectedRevision === 2 &&
      err.actualRevision === 5
  );

  // Remote data remained untouched
  assert.equal(serverRevision, 5);
  assert.equal(serverTitle, 'Remote Newest');
  // Queue recorded remote actual revision after conflict
  assert.equal(queue.getRevision('proj_conflict'), 5);
});
