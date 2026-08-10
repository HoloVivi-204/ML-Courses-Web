import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';

import { createFirestorePlaygroundRepository } from './playground-repository.js';

interface FakeDocumentReference {
  path: string;
}

interface FakeCollectionReference {
  get(): Promise<FakeQuerySnapshot>;
  limit(limit: number): FakeCollectionReference;
  orderBy(fieldPath: string, directionStr?: 'asc' | 'desc'): FakeCollectionReference;
  path: string;
  startAfter(...values: unknown[]): FakeCollectionReference;
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
  const queryLog: Array<{ limit: number | null; path: string }> = [];
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
      return createCollectionReference(documents, path, [], [], [], null, queryLog);
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

  return { documents, firestore, queryLog };
}

interface FakeOrdering {
  direction: 'asc' | 'desc';
  fieldPath: string;
}

function createCollectionReference(
  documents: Map<string, Record<string, unknown>>,
  path: string,
  filters: ReadonlyArray<{ fieldPath: string; value: unknown }> = [],
  ordering: ReadonlyArray<FakeOrdering> = [],
  startAfterValues: ReadonlyArray<unknown> = [],
  pageLimit: number | null = null,
  queryLog: Array<{ limit: number | null; path: string }> = [],
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

      if (ordering.length > 0) {
        docs.sort((left, right) => compareOrderedDocuments(left.data(), right.data(), ordering));
      }

      const pageDocs =
        startAfterValues.length > 0
          ? docs.filter(
              (doc) => compareDocumentToCursor(doc.data(), ordering, startAfterValues) > 0,
            )
          : docs;

      queryLog.push({ limit: pageLimit, path });

      return { docs: pageLimit === null ? pageDocs : pageDocs.slice(0, pageLimit) };
    },
    limit(limit) {
      return createCollectionReference(
        documents,
        path,
        filters,
        ordering,
        startAfterValues,
        limit,
        queryLog,
      );
    },
    orderBy(fieldPath, directionStr = 'asc') {
      return createCollectionReference(
        documents,
        path,
        filters,
        [...ordering, { fieldPath, direction: directionStr }],
        startAfterValues,
        pageLimit,
        queryLog,
      );
    },
    startAfter(...values) {
      return createCollectionReference(
        documents,
        path,
        filters,
        ordering,
        values,
        pageLimit,
        queryLog,
      );
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
        startAfterValues,
        pageLimit,
        queryLog,
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

function getComparableValue(value: unknown): number | string {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
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

function compareComparableValues(left: number | string, right: number | string): number {
  if (typeof left === 'string' && typeof right === 'string') {
    return left.localeCompare(right);
  }

  return Number(left) - Number(right);
}

function compareOrderedDocuments(
  left: Record<string, unknown> | undefined,
  right: Record<string, unknown> | undefined,
  ordering: ReadonlyArray<FakeOrdering>,
): number {
  for (const order of ordering) {
    const comparison = compareComparableValues(
      getComparableValue(left?.[order.fieldPath]),
      getComparableValue(right?.[order.fieldPath]),
    );

    if (comparison !== 0) {
      return order.direction === 'asc' ? comparison : -comparison;
    }
  }

  return 0;
}

function compareDocumentToCursor(
  document: Record<string, unknown> | undefined,
  ordering: ReadonlyArray<FakeOrdering>,
  cursorValues: ReadonlyArray<unknown>,
): number {
  for (const [index, order] of ordering.entries()) {
    const comparison = compareComparableValues(
      getComparableValue(document?.[order.fieldPath]),
      getComparableValue(cursorValues[index]),
    );

    if (comparison !== 0) {
      return order.direction === 'asc' ? comparison : -comparison;
    }
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

  it('persists a non-XOR submission pair with generic metric and config version metadata', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01/algorithmUnlocks/pca': {
        algorithmId: 'pca',
        schemaVersion: 1,
      },
    });
    const repository = createFirestorePlaygroundRepository(firestore);

    const session = await repository.createRunSession({
      uid: 'learner-01',
      scenarioId: 'pg-country-indicators',
      algorithmId: 'pca',
      datasetVersionId: 'ds-country-indicators-v1',
      deviceProfile: 'desktop',
      config: {
        components: 2,
        scale: true,
      },
    });
    const savedRun = await repository.saveRun({
      uid: 'learner-01',
      idempotencyKey: 'save-pca-run-key-01',
      sessionId: session.data.sessionId,
      result: {
        runId: 'client-run-pca-01',
        scenarioId: 'pg-country-indicators',
        algorithmId: 'pca',
        datasetVersionId: 'ds-country-indicators-v1',
        configHash: session.data.configHash,
        durationMs: 900,
        metrics: {
          'explained-variance': 0.82,
          'reconstruction-error': 0.18,
        },
        feedback: ['low-variance'],
        chartSummary: {
          projection: '2d',
        },
        textAlternative: {
          en: 'Two principal components explain 82% of variance.',
          vi: 'Hai thành phần chính giải thích 82% phương sai.',
        },
      },
    });
    const savedConfig = await repository.createConfig({
      uid: 'learner-01',
      scenarioId: 'pg-country-indicators',
      algorithmId: 'pca',
      datasetVersionId: 'ds-country-indicators-v1',
      name: '  PCA default  ',
      config: session.data.config,
    });
    const listedRuns = await repository.listRuns({
      uid: 'learner-01',
      scenarioId: 'pg-country-indicators',
    });
    const listedConfigs = await repository.listConfigs({
      uid: 'learner-01',
      scenarioId: 'pg-country-indicators',
    });

    expect(session.data).toMatchObject({
      scenarioId: 'pg-country-indicators',
      algorithmId: 'pca',
      datasetVersionId: 'ds-country-indicators-v1',
      config: {
        components: 2,
        scale: true,
      },
      adapterVersion: 'ml-pca-v1',
      configSchemaVersion: 1,
      workerProtocolVersion: 'ml-worker-v1',
    });
    expect(savedRun.data.run).toMatchObject({
      scenarioId: 'pg-country-indicators',
      algorithmId: 'pca',
      datasetVersionId: 'ds-country-indicators-v1',
      adapterVersion: 'ml-pca-v1',
      configSchemaVersion: 1,
      metrics: {
        'explained-variance': 0.82,
        'reconstruction-error': 0.18,
      },
      feedback: ['low-variance'],
      verificationLevel: 'client-computed',
    });
    expect(savedConfig.data.config).toMatchObject({
      name: 'PCA default',
      scenarioId: 'pg-country-indicators',
      algorithmId: 'pca',
      datasetVersionId: 'ds-country-indicators-v1',
      adapterVersion: 'ml-pca-v1',
      configSchemaVersion: 1,
      compatibilityStatus: 'compatible',
    });
    expect(listedRuns.data.runs).toHaveLength(1);
    expect(listedRuns.data.runs[0]).toMatchObject(savedRun.data.run);
    expect(listedConfigs.data.configs).toHaveLength(1);
    expect(listedConfigs.data.configs[0]).toMatchObject(savedConfig.data.config);
  });

  it('persists a Firestore-safe chart summary when a browser result contains matrix data', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01/algorithmUnlocks/pca': {
        algorithmId: 'pca',
        schemaVersion: 1,
      },
    });
    const repository = createFirestorePlaygroundRepository(firestore);
    const session = await repository.createRunSession({
      uid: 'learner-01',
      scenarioId: 'pg-country-indicators',
      algorithmId: 'pca',
      datasetVersionId: 'ds-country-indicators-v1',
      deviceProfile: 'desktop',
      config: {
        components: 2,
        scale: true,
      },
    });

    const savedRun = await repository.saveRun({
      uid: 'learner-01',
      idempotencyKey: 'save-pca-matrix-run-key-01',
      sessionId: session.data.sessionId,
      result: {
        runId: 'client-run-pca-matrix-01',
        scenarioId: 'pg-country-indicators',
        algorithmId: 'pca',
        datasetVersionId: 'ds-country-indicators-v1',
        configHash: session.data.configHash,
        durationMs: 900,
        metrics: {
          'explained-variance': 0.82,
          'reconstruction-error': 0.18,
        },
        feedback: ['low-variance'],
        chartSummary: {
          kind: 'projection-2d',
          loadings: [
            [0.12, 0.24],
            [0.36, 0.48],
          ],
        },
        textAlternative: {
          en: 'Two principal components explain 82% of variance.',
          vi: 'Hai thanh phan chinh giai thich 82% phuong sai.',
        },
      },
    });

    const storedRun = documents.get(`users/learner-01/playgroundRuns/${savedRun.data.run.runId}`);

    expect(savedRun.statusCode).toBe(201);
    expect(storedRun?.chartSummary).toMatchObject({
      feedback: ['low-variance'],
      kind: 'projection-2d',
    });
    expect(hasNestedArray(storedRun?.chartSummary)).toBe(false);
  });

  it('rejects run results with metrics outside the pair manifest', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01/algorithmUnlocks/pca': {
        algorithmId: 'pca',
        schemaVersion: 1,
      },
    });
    const repository = createFirestorePlaygroundRepository(firestore);

    const session = await repository.createRunSession({
      uid: 'learner-01',
      scenarioId: 'pg-country-indicators',
      algorithmId: 'pca',
      datasetVersionId: 'ds-country-indicators-v1',
      deviceProfile: 'desktop',
      config: {
        components: 2,
        scale: true,
      },
    });

    await expect(
      repository.saveRun({
        uid: 'learner-01',
        idempotencyKey: 'save-pca-run-key-unknown-metric',
        sessionId: session.data.sessionId,
        result: {
          runId: 'client-run-pca-unknown-metric',
          scenarioId: 'pg-country-indicators',
          algorithmId: 'pca',
          datasetVersionId: 'ds-country-indicators-v1',
          configHash: session.data.configHash,
          durationMs: 900,
          metrics: {
            'explained-variance': 0.82,
            'reconstruction-error': 0.18,
            accuracy: 0.99,
          },
          feedback: ['low-variance'],
        },
      }),
    ).rejects.toMatchObject({
      code: 'PLAYGROUND_RUN_RESULT_INVALID',
      statusCode: 400,
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

  it('lists every scenario through a bounded cursor page', async () => {
    const { firestore, queryLog } = createFakeFirestore({
      'users/learner-01/playgroundRuns/run-xor': createStoredRunDocument({
        createdAtIso: '2026-07-19T14:00:00.000Z',
        runId: 'run-xor',
      }),
      'users/learner-01/playgroundRuns/run-pca': {
        ...createStoredRunDocument({
          createdAtIso: '2026-07-19T15:00:00.000Z',
          runId: 'run-pca',
        }),
        scenarioId: 'pg-country-indicators',
        algorithmId: 'pca',
        datasetVersionId: 'ds-country-indicators-v1',
        config: { components: 2, scale: true },
        chartSummary: { feedback: ['low-variance'] },
        metrics: { 'explained-variance': 0.82, 'reconstruction-error': 0.18 },
      },
      'users/learner-01/playgroundRuns/run-old': createStoredRunDocument({
        createdAtIso: '2026-07-19T13:00:00.000Z',
        runId: 'run-old',
      }),
    });
    const repository = createFirestorePlaygroundRepository(firestore);

    const firstPage = await repository.listRuns({
      limit: 2,
      uid: 'learner-01',
    });
    const secondPage = await repository.listRuns({
      cursor: firstPage.data.nextCursor ?? '',
      limit: 2,
      uid: 'learner-01',
    });

    expect(firstPage.data.runs.map((run) => run.runId)).toEqual(['run-pca', 'run-xor']);
    expect(firstPage.data.nextCursor).toEqual(expect.any(String));
    expect(secondPage.data.runs.map((run) => run.runId)).toEqual(['run-old']);
    expect(secondPage.data.nextCursor).toBeNull();
    expect(queryLog.filter((query) => query.path.endsWith('/playgroundRuns'))).toEqual([
      { limit: 3, path: 'users/learner-01/playgroundRuns' },
      { limit: 3, path: 'users/learner-01/playgroundRuns' },
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

  it('keeps a saved config visible and read-only when its adapter version is stale', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01/playgroundConfigs/config-stale-adapter': {
        configId: 'config-stale-adapter',
        name: 'Legacy XOR setup',
        scenarioId: 'pg-xor',
        algorithmId: 'perceptron',
        datasetVersionId: 'ds-xor-noisy-v1',
        adapterVersion: 'tfjs-core-v0',
        configSchemaVersion: 1,
        config: {
          learningRate: 0.1,
          epochs: 100,
          trainRatio: 0.75,
          seed: 42,
        },
      },
    });
    const repository = createFirestorePlaygroundRepository(firestore);

    const result = await repository.listConfigs({
      uid: 'learner-01',
      scenarioId: 'pg-xor',
    });

    expect(result.data.configs).toEqual([
      expect.objectContaining({
        configId: 'config-stale-adapter',
        compatibilityStatus: 'incompatible',
        compatibilityReason: expect.stringContaining('tfjs-core-v0'),
        config: {
          learningRate: 0.1,
          epochs: 100,
          trainRatio: 0.75,
          seed: 42,
        },
      }),
    ]);

    await expect(
      repository.updateConfig({
        uid: 'learner-01',
        configId: 'config-stale-adapter',
        name: 'Should stay read-only',
      }),
    ).rejects.toMatchObject({
      code: 'PLAYGROUND_CONFIG_INCOMPATIBLE',
      statusCode: 409,
    });
  });

  it('keeps a saved config visible and read-only when its dataset version is no longer published', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01/playgroundConfigs/config-legacy-dataset': {
        configId: 'config-legacy-dataset',
        name: 'Legacy dataset setup',
        scenarioId: 'pg-xor',
        algorithmId: 'perceptron',
        datasetVersionId: 'ds-xor-noisy-v0',
        adapterVersion: 'tfjs-core-v0',
        configSchemaVersion: 1,
        config: {
          learningRate: 0.1,
          epochs: 100,
          trainRatio: 0.75,
          seed: 42,
        },
      },
    });
    const repository = createFirestorePlaygroundRepository(firestore);

    const result = await repository.listConfigs({
      uid: 'learner-01',
      scenarioId: 'pg-xor',
    });

    expect(result.data.configs).toEqual([
      expect.objectContaining({
        configId: 'config-legacy-dataset',
        compatibilityStatus: 'incompatible',
        compatibilityReason: expect.stringContaining('no longer published'),
      }),
    ]);
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
    createdAt: Timestamp.fromMillis(Date.parse(input.createdAtIso)),
    createdAtIso: input.createdAtIso,
    createdAtMillis: Date.parse(input.createdAtIso),
  };
}

function hasNestedArray(value: unknown, isNestedInArray = false): boolean {
  if (Array.isArray(value)) {
    return isNestedInArray || value.some((item) => hasNestedArray(item, true));
  }

  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return Object.values(value).some((item) => hasNestedArray(item, isNestedInArray));
}
