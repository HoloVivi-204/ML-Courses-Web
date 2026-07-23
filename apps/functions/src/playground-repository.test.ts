import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';

import { createFirestorePlaygroundRepository } from './playground-repository.js';

interface FakeDocumentReference {
  path: string;
}

interface FakeCollectionReference {
  get(): Promise<FakeQuerySnapshot>;
  orderBy(fieldPath: string, directionStr?: 'asc' | 'desc'): FakeCollectionReference;
  path: string;
  where(fieldPath: string, opStr: '==', value: unknown): FakeCollectionReference;
}

interface FakeDocumentSnapshot {
  exists: boolean;
  id: string;
  ref: FakeDocumentReference;
  data(): Record<string, unknown> | undefined;
}

interface FakeQuerySnapshot {
  docs: FakeDocumentSnapshot[];
}

interface FakeTransaction {
  delete(reference: FakeDocumentReference): void;
  get(reference: FakeDocumentReference): Promise<FakeDocumentSnapshot>;
  set(
    reference: FakeDocumentReference,
    data: Record<string, unknown>,
    options?: { merge?: boolean },
  ): void;
}

function createFakeFirestore(initialDocuments: Record<string, Record<string, unknown>> = {}) {
  const documents = new Map<string, Record<string, unknown>>(Object.entries(initialDocuments));
  const firestore = {
    batch() {
      const deletes: string[] = [];

      return {
        delete(reference: FakeDocumentReference) {
          deletes.push(reference.path);
        },
        async commit() {
          for (const path of deletes) {
            documents.delete(path);
          }
        },
      };
    },
    collection(path: string): FakeCollectionReference {
      return createCollectionReference(documents, path);
    },
    doc(path: string): FakeDocumentReference {
      return { path };
    },
    async runTransaction<TResult>(callback: (transaction: FakeTransaction) => Promise<TResult>) {
      const transaction: FakeTransaction = {
        delete(reference) {
          documents.delete(reference.path);
        },
        async get(reference) {
          return createSnapshot(reference.path, documents.get(reference.path));
        },
        set(reference, data, options) {
          const currentData = documents.get(reference.path) ?? {};
          documents.set(reference.path, options?.merge ? { ...currentData, ...data } : data);
        },
      };

      return callback(transaction);
    },
  } as unknown as Firestore;

  return { documents, firestore };
}

function createCollectionReference(
  documents: Map<string, Record<string, unknown>>,
  path: string,
  filters: ReadonlyArray<{ fieldPath: string; value: unknown }> = [],
  ordering: { fieldPath: string; direction: 'asc' | 'desc' } | null = null,
): FakeCollectionReference {
  return {
    path,
    async get() {
      const prefix = `${path}/`;
      const docs = [...documents.entries()]
        .filter(([documentPath]) => {
          const suffix = documentPath.slice(prefix.length);

          return documentPath.startsWith(prefix) && suffix.length > 0 && !suffix.includes('/');
        })
        .filter(([, data]) => filters.every((filter) => data[filter.fieldPath] === filter.value))
        .map(([documentPath, data]) => createSnapshot(documentPath, data));

      if (ordering) {
        docs.sort((left, right) => {
          const leftValue = getComparableValue(left.data()?.[ordering.fieldPath]);
          const rightValue = getComparableValue(right.data()?.[ordering.fieldPath]);

          return ordering.direction === 'asc' ? leftValue - rightValue : rightValue - leftValue;
        });
      }

      return { docs };
    },
    orderBy(fieldPath, directionStr = 'asc') {
      return createCollectionReference(documents, path, filters, {
        fieldPath,
        direction: directionStr,
      });
    },
    where(fieldPath, opStr, value) {
      if (opStr !== '==') {
        throw new Error('Only equality filters are supported by this fake.');
      }

      return createCollectionReference(
        documents,
        path,
        [...filters, { fieldPath, value }],
        ordering,
      );
    },
  };
}

function createSnapshot(
  path: string,
  data: Record<string, unknown> | undefined,
): FakeDocumentSnapshot {
  return {
    exists: data !== undefined,
    id: path.split('/').at(-1) ?? path,
    ref: { path },
    data: () => data,
  };
}

function getComparableValue(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  ) {
    return value.toMillis();
  }

  return 0;
}

describe('Firestore playground repository run sessions', () => {
  it('rejects pg-xor Perceptron sessions until the algorithm is unlocked', async () => {
    const { firestore } = createFakeFirestore();
    const repository = createFirestorePlaygroundRepository(firestore);

    await expect(
      repository.createRunSession({
        uid: 'learner-01',
        scenarioId: 'pg-xor',
        algorithmId: 'perceptron',
        datasetVersionId: 'ds-xor-noisy-v1',
        deviceProfile: 'desktop',
        config: {
          learningRate: 0.1,
          epochs: 100,
          trainRatio: 0.75,
          seed: 42,
        },
      }),
    ).rejects.toMatchObject({
      code: 'PLAYGROUND_ALGORITHM_LOCKED',
      statusCode: 403,
    });
  });

  it('creates an issued run session with normalized config after unlock', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01/algorithmUnlocks/perceptron': {
        algorithmId: 'perceptron',
        schemaVersion: 1,
      },
    });
    const repository = createFirestorePlaygroundRepository(firestore);

    const result = await repository.createRunSession({
      uid: 'learner-01',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      deviceProfile: 'mobile',
      config: {
        learningRate: 0.1,
        epochs: 200,
        trainRatio: 0.75,
        seed: 42,
      },
    });

    expect(result.statusCode).toBe(201);
    expect(result.data).toMatchObject({
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      config: {
        learningRate: 0.1,
        epochs: 200,
        trainRatio: 0.75,
        seed: 42,
      },
      status: 'issued',
      verificationLevel: 'client-computed',
      workerProtocolVersion: 'ml-worker-v1',
    });
    expect(result.data.configHash).toMatch(/^[a-f0-9]{64}$/);
    expect(documents.get(`playgroundRunSessions/${result.data.sessionId}`)).toMatchObject({
      uid: 'learner-01',
      status: 'issued',
      configHash: result.data.configHash,
    });
  });

  it('cancels an owner run session idempotently', async () => {
    const { documents, firestore } = createFakeFirestore({
      'playgroundRunSessions/session-01': {
        uid: 'learner-01',
        status: 'issued',
      },
    });
    const repository = createFirestorePlaygroundRepository(firestore);

    const firstResult = await repository.cancelRunSession({
      uid: 'learner-01',
      sessionId: 'session-01',
    });
    const retryResult = await repository.cancelRunSession({
      uid: 'learner-01',
      sessionId: 'session-01',
    });

    expect(firstResult.data).toEqual({ sessionId: 'session-01', status: 'cancelled' });
    expect(retryResult.data).toEqual(firstResult.data);
    expect(documents.get('playgroundRunSessions/session-01')).toMatchObject({
      uid: 'learner-01',
      status: 'cancelled',
    });
  });

  it('saves a completed run idempotently and consumes the issued run session', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01/algorithmUnlocks/perceptron': {
        algorithmId: 'perceptron',
        schemaVersion: 1,
      },
      'playgroundRunSessions/session-01': {
        uid: 'learner-01',
        status: 'issued',
        scenarioId: 'pg-xor',
        algorithmId: 'perceptron',
        datasetVersionId: 'ds-xor-noisy-v1',
        configHash: 'hash-01',
        config: {
          learningRate: 0.1,
          epochs: 100,
          trainRatio: 0.75,
          seed: 42,
        },
        expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
      },
    });
    const repository = createFirestorePlaygroundRepository(firestore);

    const firstResult = await repository.saveRun({
      uid: 'learner-01',
      idempotencyKey: 'save-run-key-01',
      sessionId: 'session-01',
      result: createCompletedRunResult(),
    });
    const retryResult = await repository.saveRun({
      uid: 'learner-01',
      idempotencyKey: 'save-run-key-01',
      sessionId: 'session-01',
      result: createCompletedRunResult(),
    });
    const listedRuns = await repository.listRuns({
      uid: 'learner-01',
      scenarioId: 'pg-xor',
    });

    expect(firstResult.statusCode).toBe(201);
    expect(retryResult.data).toEqual(firstResult.data);
    expect(firstResult.data.run).toMatchObject({
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      verificationLevel: 'client-computed',
      metrics: {
        accuracy: 0.5,
        loss: 0.5,
      },
    });
    expect(documents.get('playgroundRunSessions/session-01')).toMatchObject({
      status: 'consumed',
      consumedRunId: firstResult.data.run.runId,
    });
    expect(
      documents.get(`users/learner-01/playgroundRuns/${firstResult.data.run.runId}`),
    ).toMatchObject({
      runId: firstResult.data.run.runId,
      verificationLevel: 'client-computed',
      isPinned: false,
    });
    expect(listedRuns.data.runs[0]).toMatchObject({
      runId: firstResult.data.run.runId,
      feedback: ['linear-limit', 'non-convergence'],
    });
  });

  it('lists valid saved runs when an older stored run is no longer compatible', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01/playgroundRuns/run-valid-01': createStoredRunDocument({
        createdAtIso: '2026-07-19T14:00:00.000Z',
        runId: 'run-valid-01',
      }),
      'users/learner-01/playgroundRuns/run-legacy-invalid': createStoredRunDocument({
        config: {
          learningRate: 0.1,
          epochs: 900,
          trainRatio: 0.75,
          seed: 42,
        },
        createdAtIso: '2026-07-18T14:00:00.000Z',
        runId: 'run-legacy-invalid',
      }),
    });
    const repository = createFirestorePlaygroundRepository(firestore);

    const result = await repository.listRuns({
      uid: 'learner-01',
      scenarioId: 'pg-xor',
    });

    expect(result.data.runs).toEqual([
      expect.objectContaining({
        runId: 'run-valid-01',
        verificationLevel: 'client-computed',
      }),
    ]);
  });

  it('rejects saving a successful run through a cancelled session', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01/algorithmUnlocks/perceptron': {
        algorithmId: 'perceptron',
        schemaVersion: 1,
      },
      'playgroundRunSessions/session-01': {
        uid: 'learner-01',
        status: 'cancelled',
        scenarioId: 'pg-xor',
        algorithmId: 'perceptron',
        datasetVersionId: 'ds-xor-noisy-v1',
        configHash: 'hash-01',
        config: {
          learningRate: 0.1,
          epochs: 100,
          trainRatio: 0.75,
          seed: 42,
        },
        expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
      },
    });
    const repository = createFirestorePlaygroundRepository(firestore);

    await expect(
      repository.saveRun({
        uid: 'learner-01',
        idempotencyKey: 'save-run-key-01',
        sessionId: 'session-01',
        result: createCompletedRunResult(),
      }),
    ).rejects.toMatchObject({
      code: 'PLAYGROUND_RUN_SESSION_NOT_ISSUED',
      statusCode: 409,
    });
  });

  it('keeps only the newest 50 unpinned runs for a learner scenario', async () => {
    const initialDocuments: Record<string, Record<string, unknown>> = {
      'users/learner-01/algorithmUnlocks/perceptron': {
        algorithmId: 'perceptron',
        schemaVersion: 1,
      },
      'playgroundRunSessions/session-01': {
        uid: 'learner-01',
        status: 'issued',
        scenarioId: 'pg-xor',
        algorithmId: 'perceptron',
        datasetVersionId: 'ds-xor-noisy-v1',
        configHash: 'hash-01',
        config: {
          learningRate: 0.1,
          epochs: 100,
          trainRatio: 0.75,
          seed: 42,
        },
        expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
      },
    };

    for (let index = 1; index <= 50; index += 1) {
      initialDocuments[`users/learner-01/playgroundRuns/run-${String(index).padStart(2, '0')}`] = {
        runId: `run-${String(index).padStart(2, '0')}`,
        scenarioId: 'pg-xor',
        algorithmId: 'perceptron',
        datasetVersionId: 'ds-xor-noisy-v1',
        isPinned: false,
        createdAtMillis: index,
      };
    }

    const { documents, firestore } = createFakeFirestore(initialDocuments);
    const repository = createFirestorePlaygroundRepository(firestore);

    await repository.saveRun({
      uid: 'learner-01',
      idempotencyKey: 'save-run-key-01',
      sessionId: 'session-01',
      result: createCompletedRunResult(),
    });

    const retainedRunPaths = [...documents.keys()].filter((path) =>
      path.startsWith('users/learner-01/playgroundRuns/'),
    );

    expect(retainedRunPaths).toHaveLength(50);
    expect(documents.has('users/learner-01/playgroundRuns/run-01')).toBe(false);
  });

  it('creates, lists, renames, and deletes an owner saved config', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01/algorithmUnlocks/perceptron': {
        algorithmId: 'perceptron',
        schemaVersion: 1,
      },
    });
    const repository = createFirestorePlaygroundRepository(firestore);

    const createdConfig = await repository.createConfig({
      uid: 'learner-01',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      name: '  XOR baseline  ',
      config: {
        learningRate: 0.1,
        epochs: 100,
        trainRatio: 0.75,
        seed: 42,
      },
    });
    const listedBeforeRename = await repository.listConfigs({
      uid: 'learner-01',
      scenarioId: 'pg-xor',
    });
    const renamedConfig = await repository.updateConfig({
      uid: 'learner-01',
      configId: createdConfig.data.config.configId,
      name: 'Renamed XOR baseline',
    });

    await repository.deleteConfig({
      uid: 'learner-01',
      configId: createdConfig.data.config.configId,
    });

    expect(createdConfig.data.config).toMatchObject({
      name: 'XOR baseline',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      compatibilityStatus: 'compatible',
    });
    expect(listedBeforeRename.data.configs).toHaveLength(1);
    expect(renamedConfig.data.config.name).toBe('Renamed XOR baseline');
    expect(
      documents.has(`users/learner-01/playgroundConfigs/${createdConfig.data.config.configId}`),
    ).toBe(false);
  });

  it('deletes only the owner Playground data for account deletion', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01/playgroundRuns/run-01': {
        runId: 'run-01',
        scenarioId: 'pg-xor',
      },
      'users/learner-01/playgroundConfigs/config-01': {
        configId: 'config-01',
        scenarioId: 'pg-xor',
      },
      'playgroundRunSessions/session-01': {
        uid: 'learner-01',
        status: 'issued',
      },
      'playgroundRunSessions/session-02': {
        uid: 'learner-02',
        status: 'issued',
      },
      'users/learner-02/playgroundRuns/run-02': {
        runId: 'run-02',
        scenarioId: 'pg-xor',
      },
      'users/learner-02/playgroundConfigs/config-02': {
        configId: 'config-02',
        scenarioId: 'pg-xor',
      },
    });
    const repository = createFirestorePlaygroundRepository(firestore);

    const firstResult = await repository.deleteLearnerPlaygroundData({ uid: 'learner-01' });
    const retryResult = await repository.deleteLearnerPlaygroundData({ uid: 'learner-01' });

    expect(firstResult).toEqual({ statusCode: 204, data: null });
    expect(retryResult).toEqual(firstResult);
    expect(documents.has('users/learner-01/playgroundRuns/run-01')).toBe(false);
    expect(documents.has('users/learner-01/playgroundConfigs/config-01')).toBe(false);
    expect(documents.has('playgroundRunSessions/session-01')).toBe(false);
    expect(documents.get('playgroundRunSessions/session-02')).toMatchObject({
      uid: 'learner-02',
      status: 'issued',
    });
    expect(documents.get('users/learner-02/playgroundRuns/run-02')).toMatchObject({
      runId: 'run-02',
    });
    expect(documents.get('users/learner-02/playgroundConfigs/config-02')).toMatchObject({
      configId: 'config-02',
    });
  });
});

function createCompletedRunResult() {
  return {
    runId: 'client-run-01',
    scenarioId: 'pg-xor',
    algorithmId: 'perceptron',
    datasetVersionId: 'ds-xor-noisy-v1',
    configHash: 'hash-01',
    durationMs: 1234,
    metrics: {
      accuracy: 0.5,
      loss: 0.5,
      testAccuracy: 0.5,
      trainAccuracy: 0.5,
    },
    feedback: ['linear-limit', 'non-convergence'],
    boundary: {
      weights: [0.1, -0.1],
      bias: 0,
    },
    lossCurve: [{ epoch: 100, loss: 0.5 }],
  };
}

function createStoredRunDocument(input: {
  config?: { epochs: number; learningRate: number; seed: number; trainRatio: number };
  createdAtIso: string;
  runId: string;
}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    runId: input.runId,
    scenarioId: 'pg-xor',
    algorithmId: 'perceptron',
    datasetVersionId: 'ds-xor-noisy-v1',
    config: input.config ?? {
      learningRate: 0.1,
      epochs: 100,
      trainRatio: 0.75,
      seed: 42,
    },
    metrics: {
      accuracy: 0.5,
      loss: 0.5,
      testAccuracy: 0.5,
      trainAccuracy: 0.5,
    },
    chartSummary: {
      feedback: ['linear-limit'],
      lossCurve: [{ epoch: 100, loss: 0.5 }],
    },
    durationMs: 1234,
    targetReached: null,
    targetVersionId: null,
    verificationLevel: 'client-computed',
    isPinned: false,
    createdAtIso: input.createdAtIso,
    createdAtMillis: Date.parse(input.createdAtIso),
  };
}
