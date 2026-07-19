import { type Firestore } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';

import { createFirestorePlaygroundRepository } from './playground-repository.js';

interface FakeDocumentReference {
  path: string;
}

interface FakeDocumentSnapshot {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

interface FakeTransaction {
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
    doc(path: string): FakeDocumentReference {
      return { path };
    },
    async runTransaction<TResult>(callback: (transaction: FakeTransaction) => Promise<TResult>) {
      const transaction: FakeTransaction = {
        async get(reference) {
          return createSnapshot(documents.get(reference.path));
        },
        set(reference, data, options) {
          const currentData = documents.get(reference.path) ?? {};
          documents.set(reference.path, options?.merge ? { ...currentData, ...data } : data);
        },
      };

      return callback(transaction);
    },
  } as Firestore;

  return { documents, firestore };
}

function createSnapshot(data: Record<string, unknown> | undefined): FakeDocumentSnapshot {
  return {
    exists: data !== undefined,
    data: () => data,
  };
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
});
