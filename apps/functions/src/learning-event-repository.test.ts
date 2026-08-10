import type { Firestore } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';

import { createFirestoreLearningEventRepository } from './learning-event-repository.js';

interface StoredDocument {
  [key: string]: unknown;
}

interface FakeTransaction {
  create(reference: { path: string }, data: StoredDocument): void;
  get(reference: { path: string }): Promise<{
    data(): StoredDocument | undefined;
    exists: boolean;
  }>;
  set(reference: { path: string }, data: StoredDocument): void;
}

function createFakeFirestore(initialDocuments: Record<string, StoredDocument> = {}) {
  const documents = new Map(Object.entries(initialDocuments));

  const firestore = {
    doc(path: string) {
      return { path };
    },
    async runTransaction<T>(callback: (transaction: FakeTransaction) => Promise<T>): Promise<T> {
      const transaction = {
        async get(reference: { path: string }) {
          const data = documents.get(reference.path);

          return {
            data: () => data,
            exists: data !== undefined,
          };
        },
        create(reference: { path: string }, data: StoredDocument) {
          if (documents.has(reference.path)) {
            throw new Error('already exists');
          }

          documents.set(reference.path, data);
        },
        set(reference: { path: string }, data: StoredDocument) {
          documents.set(reference.path, data);
        },
      };

      return callback(transaction);
    },
  } as unknown as Firestore;

  return { documents, firestore };
}

describe('Firestore learning event repository', () => {
  it('deduplicates a retry and rejects the same key with a different payload', async () => {
    const { documents, firestore } = createFakeFirestore();
    const repository = createFirestoreLearningEventRepository(firestore, {
      now: () => new Date('2026-08-11T00:00:00.000Z'),
    });
    const input = {
      dedupeKey: 'client-event-01',
      eventType: 'playground_run_failed' as const,
      payload: {
        algorithmId: 'perceptron',
        normalizedErrorCode: 'WORKER_TIMEOUT',
        runId: 'run-01',
        scenarioId: 'pg-xor',
      },
      uid: 'learner-01',
    };

    const first = await repository.record(input);
    const retry = await repository.record(input);

    expect(first.statusCode).toBe(201);
    expect(retry).toEqual({ ...first, statusCode: 200 });
    expect([...documents.keys()]).toHaveLength(1);

    await expect(
      repository.record({
        ...input,
        payload: { ...input.payload, normalizedErrorCode: 'WORKER_CRASH' },
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'IDEMPOTENCY_CONFLICT' });
  });

  it('stores no raw uid and uses the event TTL field', async () => {
    const { documents, firestore } = createFakeFirestore();
    const repository = createFirestoreLearningEventRepository(firestore, {
      now: () => new Date('2026-08-11T00:00:00.000Z'),
    });

    await repository.record({
      dedupeKey: 'client-event-02',
      eventType: 'playground_run_failed',
      payload: {
        algorithmId: 'perceptron',
        normalizedErrorCode: 'WORKER_TIMEOUT',
        scenarioId: 'pg-xor',
      },
      uid: 'learner-02',
    });

    const stored = [...documents.values()][0];

    expect(stored).toHaveProperty('expireAt', new Date('2027-02-07T00:00:00.000Z'));
    expect(stored).not.toHaveProperty('uid', 'learner-02');
    expect(JSON.stringify(stored)).not.toContain('learner-02');
  });
});
