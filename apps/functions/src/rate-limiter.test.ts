import type { Firestore } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';

import { createFirestoreRateLimiter } from './rate-limiter.js';

interface StoredBucket {
  count: number;
  expireAt: Date;
  identityHash: string;
  scope: string;
  windowStartedAt: Date;
}

function createFakeFirestore() {
  const buckets = new Map<string, StoredBucket>();
  const firestore = {
    collection(collectionPath: string) {
      return {
        doc(documentId: string) {
          return { path: `${collectionPath}/${documentId}` };
        },
      };
    },
    async runTransaction<T>(
      callback: (transaction: {
        get(reference: { path: string }): Promise<{ data(): StoredBucket | undefined }>;
        set(reference: { path: string }, data: StoredBucket, options: { merge: boolean }): void;
      }) => Promise<T>,
    ): Promise<T> {
      return callback({
        async get(reference) {
          return { data: () => buckets.get(reference.path) };
        },
        set(reference, data, options) {
          buckets.set(
            reference.path,
            options.merge ? { ...buckets.get(reference.path), ...data } : data,
          );
        },
      });
    },
  };

  return { buckets, firestore: firestore as unknown as Firestore };
}

describe('Firestore rate limiter', () => {
  it('shares a fixed-window bucket across Function instances without storing the UID', async () => {
    const { buckets, firestore } = createFakeFirestore();
    const now = () => 12_500;
    const firstInstance = createFirestoreRateLimiter(firestore, now);
    const secondInstance = createFirestoreRateLimiter(firestore, now);
    const request = {
      identity: 'learner-01',
      policy: { maxRequests: 1, windowSeconds: 60 },
      scope: 'quiz-submission',
    };

    await expect(firstInstance.consume(request)).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    await expect(secondInstance.consume(request)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 48,
    });

    expect(buckets).toHaveLength(1);
    expect(JSON.stringify([...buckets.values()])).not.toContain('learner-01');
    expect([...buckets.values()][0]).toMatchObject({
      count: 1,
      scope: 'quiz-submission',
      windowStartedAt: new Date(0),
      expireAt: new Date(60_000),
    });
  });
});
