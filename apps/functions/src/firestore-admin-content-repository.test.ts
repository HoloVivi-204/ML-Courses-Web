import { describe, expect, it, vi } from 'vitest';

import type { Firestore } from 'firebase-admin/firestore';

import type { AdminContentSummary } from './admin-content-repository.js';
import {
  createFirestoreAdminContentRepository,
  seedFirestoreAdminContentForEmulator,
} from './firestore-admin-content-repository.js';

const contentFixture: AdminContentSummary = {
  courseId: 'course-deep-learning-basic',
  draftRevisionId: null,
  entityId: 'dl-p01-neuron-perceptron',
  entityType: 'post',
  localeAvailability: ['en', 'vi'],
  moduleId: 'dl-m01-neuron-perceptron',
  preview: { en: 'Preview', vi: 'Tom tat' },
  publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
  sourceReview: {
    attribution: { en: 'Source', vi: 'Nguon' },
    license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    sourceId: 'source-google-ml-crash-course',
    title: 'Google Machine Learning Crash Course',
  },
  sourceStatus: 'seeded',
  status: 'published',
  title: { en: 'Neuron', vi: 'Neuron' },
  validationStatus: 'not-run',
};

function createFirestoreForPersistedList(): Firestore {
  const entityCollection = {
    async get() {
      return {
        docs: [
          {
            data: () => ({
              currentContent: contentFixture,
              draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
              entityId: contentFixture.entityId,
              entityType: contentFixture.entityType,
              schemaVersion: 1,
              updatedAt: '2026-07-27T00:00:00.000Z',
            }),
            exists: true,
          },
        ],
      };
    },
  };
  const emptyCollection = {};

  return {
    collection(name: string) {
      return name === 'adminContentEntities' ? entityCollection : emptyCollection;
    },
  } as unknown as Firestore;
}

describe('Firestore Admin content repository', () => {
  it('reads the durable draft pointer rather than a process-local repository', async () => {
    const repository = createFirestoreAdminContentRepository({
      firestore: createFirestoreForPersistedList(),
    });

    const result = await repository.listContent({ entityType: 'post' });

    expect(result.data.content).toEqual([
      {
        ...contentFixture,
        draftRevisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      },
    ]);
  });

  it('rejects the Emulator seed helper outside the Emulator Suite before a write', async () => {
    vi.stubEnv('FIRESTORE_EMULATOR_HOST', '');

    await expect(
      seedFirestoreAdminContentForEmulator({
        content: [],
        firestore: {} as Firestore,
      }),
    ).rejects.toThrow('Firestore Admin content seed is restricted to the Emulator Suite.');

    vi.unstubAllEnvs();
  });
});
