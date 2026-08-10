import { describe, expect, it, vi } from 'vitest';

import type { Firestore } from 'firebase-admin/firestore';

import {
  createDraftFromPublished,
  createPublishedContentFromDraft,
  type AdminContentSummary,
} from './admin-content-repository.js';
import { createReleaseOneFirestoreAdminContentSeed } from './admin-content-emulator-seed.js';
import {
  createFirestoreAdminContentRepository,
  seedFirestoreAdminContentForEmulator,
} from './firestore-admin-content-repository.js';

const contentFixture: AdminContentSummary = {
  courseId: 'course-deep-learning-basic',
  draftRevisionId: null,
  emergencyBlocked: false,
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

function createFirestoreForPersistedEvidenceList(): Firestore {
  const contentChecksum = 'a'.repeat(64);
  const draftSnapshot = {
    data: () => ({
      contentChecksum,
      draft: {},
      entityKey: 'post:dl-p01-neuron-perceptron',
      schemaVersion: 1,
      state: 'draft',
    }),
    exists: true,
  };
  const evidenceCollection = {
    async get() {
      return {
        docs: [
          {
            data: () => ({
              artifactId: 'dl-p01-neuron-perceptron',
              checksum: contentChecksum,
              evidenceRef: 'evidence://license-review',
              kind: 'license',
              result: 'pending',
              schemaVersion: 1,
            }),
          },
        ],
      };
    },
  };
  const revisionCollection = {
    doc() {
      return {
        collection: () => evidenceCollection,
        get: async () => draftSnapshot,
      };
    },
  };

  return {
    collection(name: string) {
      return name === 'adminContentRevisions' ? revisionCollection : {};
    },
  } as unknown as Firestore;
}

function createFirestoreForPersistedQuizPreview(): Firestore {
  const seededQuiz = createReleaseOneFirestoreAdminContentSeed().find(
    (record) =>
      record.content.entityType === 'quiz' && record.content.entityId === 'quiz-post-dl-p01',
  );

  if (!seededQuiz?.learnerContent) {
    throw new Error('Expected the seeded quiz learner content.');
  }

  const draft = {
    ...createDraftFromPublished(seededQuiz.content),
    preview: {
      en: 'Draft quiz description',
      vi: 'Mo ta quiz draft',
    },
    title: {
      en: 'Draft quiz title',
      vi: 'Tieu de quiz draft',
    },
  };
  const draftSnapshot = {
    data: () => ({
      contentChecksum: 'c'.repeat(64),
      createdAt: '2026-08-10T00:00:00.000Z',
      draft,
      entityKey: `quiz:${draft.entityId}`,
      learnerContent: seededQuiz.learnerContent,
      schemaVersion: 1,
      state: 'draft',
      updatedAt: '2026-08-10T00:00:00.000Z',
    }),
    exists: true,
  };
  const revisionCollection = {
    doc(revisionId: string) {
      if (revisionId !== draft.draftRevisionId) {
        throw new Error(`Unexpected draft revision ${revisionId}.`);
      }

      return {
        get: async () => draftSnapshot,
      };
    },
  };

  return {
    collection(name: string) {
      return name === 'adminContentRevisions' ? revisionCollection : {};
    },
  } as unknown as Firestore;
}

describe('Firestore Admin content repository', () => {
  it('omits an absent validation manifest before course revisions are serialized to Firestore', () => {
    const course = createReleaseOneFirestoreAdminContentSeed().find(
      (record) => record.content.entityType === 'course',
    );

    if (!course) {
      throw new Error('Expected a seeded course.');
    }

    const draft = createDraftFromPublished(course.content);
    const published = createPublishedContentFromDraft({
      draft,
      previousPublishedRevisionId: course.content.publishedRevisionId,
    });

    expect(draft).not.toHaveProperty('validationManifest');
    expect(published).not.toHaveProperty('validationManifest');
  });

  it('rejects an Emulator-only publication outside the Emulator before a transaction starts', async () => {
    const repository = createFirestoreAdminContentRepository({
      firestore: {
        collection: vi.fn().mockReturnValue({}),
      } as unknown as Firestore,
      isEmulator: () => false,
    });

    await expect(
      repository.publishRevision({
        actorUid: 'admin-01',
        idempotencyKey: 'emulator-demo-key',
        publicationScope: 'emulator-demo',
        reason: 'Attempt an Emulator-only publish outside the Emulator.',
        requestId: 'request-emulator-demo',
        revisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
      }),
    ).rejects.toMatchObject({
      code: 'ADMIN_CONTENT_EMULATOR_PUBLISH_ONLY',
      statusCode: 403,
    });
  });

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
    expect(result.data.nextCursor).toBeNull();
  });

  it('projects durable evidence without leaking persistence-only fields', async () => {
    const repository = createFirestoreAdminContentRepository({
      firestore: createFirestoreForPersistedEvidenceList(),
    });

    const result = await repository.listEvidence({
      revisionId: 'draft-post-dl-p01-neuron-perceptron-rev-d1',
    });

    expect(result.data).toEqual({
      contentChecksum: 'a'.repeat(64),
      evidence: [
        {
          artifactId: 'dl-p01-neuron-perceptron',
          checksum: 'a'.repeat(64),
          evidenceRef: 'evidence://license-review',
          kind: 'license',
          result: 'pending',
        },
      ],
    });
  });

  it('rebuilds a quiz learner preview from the persisted draft without answer material', async () => {
    const repository = createFirestoreAdminContentRepository({
      firestore: createFirestoreForPersistedQuizPreview(),
    });

    const result = await repository.getRevisionPreview({
      revisionId: 'draft-quiz-quiz-post-dl-p01-rev-d1',
    });

    expect(result.data.draft.title).toEqual({
      en: 'Draft quiz title',
      vi: 'Tieu de quiz draft',
    });
    expect(result.data.preview).toMatchObject({
      contentType: 'quiz',
      quiz: {
        description: { en: 'Draft quiz description', vi: 'Mo ta quiz draft' },
        revisionId: 'draft-quiz-quiz-post-dl-p01-rev-d1',
        title: { en: 'Draft quiz title', vi: 'Tieu de quiz draft' },
      },
    });

    if (result.data.preview.contentType !== 'quiz') {
      throw new Error('Expected a quiz preview.');
    }

    expect(result.data.preview.questions).not.toHaveLength(0);
    expect(result.data.preview.questions[0]).not.toHaveProperty('correctAnswer');
    expect(result.data.preview.questions[0]).not.toHaveProperty('explanation');
    expect(result.data.preview.questions[0]).not.toHaveProperty('hints');
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
