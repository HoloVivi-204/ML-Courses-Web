import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { describe, expect, it, vi } from 'vitest';

import { createLearningLearnerHash } from './learning-events.js';
import { createFirestoreLearningRepository } from './learning-repository.js';
import {
  getReleaseLearningCatalog,
  getReleaseModule,
  getSubmissionLearningUnits,
} from './release-learning-catalog.js';
import { getQuizManifest, type QuizAnswer } from './quiz-manifest.js';

const revisionPinFieldNames = [
  'revisionId',
  'publishedRevisionId',
  'courseRevisionId',
  'moduleRevisionId',
  'postRevisionId',
  'demoRevisionId',
  'quizRevisionId',
] as const;

interface FakeDocumentReference {
  get(): Promise<FakeDocumentSnapshot>;
  path: string;
}

interface FakeCollectionReference {
  doc(documentId: string): FakeDocumentReference;
  listDocuments(): Promise<FakeDocumentReference[]>;
  path: string;
  where(fieldPath: string, opStr: '==', value: string): FakeQuery;
}

interface FakeQuery {
  get(): Promise<{
    docs: Array<{
      data(): Record<string, unknown>;
      id: string;
      ref: FakeDocumentReference;
    }>;
  }>;
  limit(limit: number): FakeQuery;
}

interface FakeDocumentSnapshot {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
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

function createFakeFirestore(
  initialDocuments: Record<string, Record<string, unknown>> = {},
  options: { rejectListDocuments?: boolean } = {},
) {
  const documents = new Map<string, Record<string, unknown>>([
    ...Object.entries(createActiveContentEntities()),
    ...Object.entries(initialDocuments),
  ]);
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
      return {
        doc(documentId) {
          return createDocumentReference(documents, `${path}/${documentId}`);
        },
        path,
        async listDocuments() {
          if (options.rejectListDocuments) {
            throw new Error('Unbounded listDocuments calls are not allowed in progress reads.');
          }

          const prefix = `${path}/`;

          return [...documents.keys()]
            .filter((documentPath) => {
              const suffix = documentPath.slice(prefix.length);

              return documentPath.startsWith(prefix) && suffix.length > 0 && !suffix.includes('/');
            })
            .map((documentPath) => createDocumentReference(documents, documentPath));
        },
        where(fieldPath, opStr, value) {
          if (opStr !== '==') {
            throw new Error(`Unsupported fake query operator: ${opStr}`);
          }

          function createQuery(limit?: number): FakeQuery {
            return {
              async get() {
                const prefix = `${path}/`;
                const matchingPaths = [...documents.entries()]
                  .filter(([documentPath, data]) => {
                    const suffix = documentPath.slice(prefix.length);

                    return (
                      documentPath.startsWith(prefix) &&
                      suffix.length > 0 &&
                      !suffix.includes('/') &&
                      data[fieldPath] === value
                    );
                  })
                  .map(([documentPath]) => documentPath)
                  .slice(0, limit);

                return {
                  docs: matchingPaths.map((documentPath) => ({
                    data: () => documents.get(documentPath) ?? {},
                    id: documentPath.slice(prefix.length),
                    ref: createDocumentReference(documents, documentPath),
                  })),
                };
              },
              limit(nextLimit) {
                return createQuery(nextLimit);
              },
            };
          }

          return createQuery();
        },
      };
    },
    doc(path: string): FakeDocumentReference {
      return createDocumentReference(documents, path);
    },
    async runTransaction<TResult>(callback: (transaction: FakeTransaction) => Promise<TResult>) {
      const transaction: FakeTransaction = {
        delete(reference) {
          documents.delete(reference.path);
        },
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
  } as unknown as Firestore;

  return { documents, firestore };
}

function createActiveContentEntities(): Record<string, Record<string, unknown>> {
  const entities: Record<string, Record<string, unknown>> = {};

  function addEntity(entityType: string, entityId: string): void {
    entities[`adminContentEntities/${entityType}:${entityId}`] = {
      currentContent: {
        emergencyBlocked: false,
        entityId,
        entityType,
        publishedRevisionId: `${entityType}-${entityId}-rev-r1`,
        status: 'published',
      },
      draftRevisionId: null,
      entityId,
      entityType,
      schemaVersion: 1,
    };
  }

  for (const course of getReleaseLearningCatalog().courses) {
    addEntity('course', course.courseId);

    for (const module of course.modules) {
      addEntity('module', module.moduleId);
      addEntity('quiz', module.moduleQuizId);

      if (module.demoId) {
        addEntity('demo', module.demoId);
      }

      for (const post of module.posts) {
        addEntity('post', post.postId);
        addEntity('quiz', post.postQuizId);
      }
    }
  }

  return entities;
}

function createDocumentReference(
  documents: Map<string, Record<string, unknown>>,
  path: string,
): FakeDocumentReference {
  return {
    path,
    async get() {
      return createSnapshot(documents.get(path));
    },
  };
}

function createSnapshot(data: Record<string, unknown> | undefined): FakeDocumentSnapshot {
  return {
    exists: data !== undefined,
    data: () => data,
  };
}

function expectStableContentAccessGrant(data: Record<string, unknown> | undefined) {
  expect(data).toBeDefined();

  for (const fieldName of revisionPinFieldNames) {
    expect(data).not.toHaveProperty(fieldName);
  }
}

function createOpenAttemptDocument(quizId: string) {
  const manifest = getQuizManifest(quizId);

  return {
    attemptNumber: 1,
    expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
    questionIds: manifest.questions.map((question) => question.questionId),
    quizId,
    quizRevisionId: manifest.quizRevisionId,
    schemaVersion: 1,
    status: 'in-progress',
  };
}

function createPassingAnswers(quizId: string): QuizAnswer[] {
  return getQuizManifest(quizId).questions.map((question) => ({
    questionId: question.questionId,
    value: question.correctAnswer,
  }));
}

describe('Firestore learning repository', () => {
  it('records pseudonymous auth lifecycle events with auth-time idempotency', async () => {
    const { documents, firestore } = createFakeFirestore();
    const repository = createFirestoreLearningRepository(firestore);

    await repository.bootstrapLearner({
      authTime: 1_754_880_000,
      displayName: 'Local Student',
      provider: 'password',
      uid: 'learner-01',
    });
    await repository.bootstrapLearner({
      authTime: 1_754_880_000,
      displayName: 'Local Student',
      provider: 'password',
      uid: 'learner-01',
    });
    await repository.bootstrapLearner({
      authTime: 1_754_880_001,
      displayName: 'Local Student',
      provider: 'password',
      uid: 'learner-01',
    });

    const events = [...documents.entries()]
      .filter(([path]) => path.startsWith('learningEvents/'))
      .map(([, data]) => data)
      .sort((left, right) => String(left.eventType).localeCompare(String(right.eventType)));

    expect(events).toHaveLength(3);
    expect(events.map((event) => event.eventType)).toEqual([
      'user_logged_in',
      'user_logged_in',
      'user_registered',
    ]);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'user_registered',
          payload: { provider: 'password' },
          schemaVersion: 1,
          uidHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
        expect.objectContaining({
          eventType: 'user_logged_in',
          payload: { provider: 'password' },
          schemaVersion: 1,
          uidHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      ]),
    );
    expect(JSON.stringify(events)).not.toMatch(/email|@example|displayName|learner-01/i);
  });

  it('bootstraps a learner profile idempotently without storing email fields', async () => {
    const { documents, firestore } = createFakeFirestore();
    const repository = createFirestoreLearningRepository(firestore);

    const firstResult = await repository.bootstrapLearner({
      uid: 'learner-01',
      displayName: '  Local Student  ',
    });
    const retryResult = await repository.bootstrapLearner({
      uid: 'learner-01',
      displayName: '  Local Student  ',
    });

    expect(firstResult).toEqual({
      statusCode: 201,
      data: {
        profile: {
          uid: 'learner-01',
          schemaVersion: 1,
          displayName: 'Local Student',
          avatarUrl: null,
          locale: 'vi',
          theme: 'system',
          status: 'active',
        },
      },
    });
    expect(retryResult).toEqual({
      statusCode: 200,
      data: {
        profile: {
          uid: 'learner-01',
          schemaVersion: 1,
          displayName: 'Local Student',
          avatarUrl: null,
          locale: 'vi',
          theme: 'system',
          status: 'active',
        },
      },
    });
    expect(documents.get('users/learner-01')).toMatchObject({
      schemaVersion: 1,
      displayName: 'Local Student',
      avatarUrl: null,
      locale: 'vi',
      theme: 'system',
      status: 'active',
    });
    expect(documents.get('users/learner-01')).not.toHaveProperty('email');
  });

  it('syncs a changed Firebase display name without copying Auth email into the profile', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01': {
        schemaVersion: 1,
        displayName: 'Local Student',
        avatarUrl: null,
        locale: 'vi',
        theme: 'system',
        status: 'active',
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    const result = await repository.bootstrapLearner({
      uid: 'learner-01',
      displayName: 'Updated Student',
    });

    expect(result).toEqual({
      statusCode: 200,
      data: {
        profile: expect.objectContaining({
          displayName: 'Updated Student',
          uid: 'learner-01',
        }),
      },
    });
    expect(documents.get('users/learner-01')).toMatchObject({
      displayName: 'Updated Student',
    });
    expect(documents.get('users/learner-01')).not.toHaveProperty('email');
  });

  it('updates learner locale and theme on the owner profile only', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01': {
        schemaVersion: 1,
        displayName: 'Local Student',
        avatarUrl: null,
        locale: 'vi',
        theme: 'system',
        status: 'active',
      },
      'users/learner-02': {
        schemaVersion: 1,
        displayName: 'Other Student',
        avatarUrl: null,
        locale: 'vi',
        theme: 'light',
        status: 'active',
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    const result = await repository.updateLearnerPreferences({
      uid: 'learner-01',
      displayName: 'Ignored Replacement',
      locale: 'en',
      theme: 'dark',
    });

    expect(result).toEqual({
      statusCode: 200,
      data: {
        profile: {
          uid: 'learner-01',
          schemaVersion: 1,
          displayName: 'Local Student',
          avatarUrl: null,
          locale: 'en',
          theme: 'dark',
          status: 'active',
        },
      },
    });
    expect(documents.get('users/learner-01')).toMatchObject({
      displayName: 'Local Student',
      locale: 'en',
      theme: 'dark',
      status: 'active',
    });
    expect(documents.get('users/learner-02')).toMatchObject({
      locale: 'vi',
      theme: 'light',
    });
  });

  it('creates a learner profile from preference sync without storing email fields', async () => {
    const { documents, firestore } = createFakeFirestore();
    const repository = createFirestoreLearningRepository(firestore);

    const result = await repository.updateLearnerPreferences({
      uid: 'learner-01',
      displayName: 'Local Student',
      locale: 'en',
      theme: 'system',
    });

    expect(result.data).toEqual({
      profile: {
        uid: 'learner-01',
        schemaVersion: 1,
        displayName: 'Local Student',
        avatarUrl: null,
        locale: 'en',
        theme: 'system',
        status: 'active',
      },
    });
    expect(documents.get('users/learner-01')).toMatchObject({
      schemaVersion: 1,
      displayName: 'Local Student',
      avatarUrl: null,
      locale: 'en',
      theme: 'system',
      status: 'active',
    });
    expect(documents.get('users/learner-01')).not.toHaveProperty('email');
  });

  it('anonymizes the learner profile and deletes only the owner learning records', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01': {
        schemaVersion: 1,
        displayName: 'Local Student',
        email: 'learner@example.test',
        avatarUrl: 'https://example.test/avatar.png',
        locale: 'en',
        theme: 'dark',
        status: 'active',
      },
      'users/learner-01/enrollments/course-deep-learning-basic': {
        courseId: 'course-deep-learning-basic',
        progressPercent: 33,
      },
      'users/learner-01/contentAccess/module_dl-m01-neuron-perceptron': {
        contentType: 'module',
      },
      'users/learner-01/demoCompletions/demo-perceptron-and-gate': {
        status: 'completed',
      },
      'users/learner-01/quizAttempts/attempt-01': {
        quizId: 'quiz-module-dl-m01',
      },
      'users/learner-01/quizProgress/quiz-module-dl-m01': {
        bestScore: 100,
      },
      'users/learner-01/moduleCompletions/dl-m01-neuron-perceptron': {
        status: 'completed',
      },
      'users/learner-01/moduleProgress/dl-m01-neuron-perceptron': {
        status: 'completed',
      },
      'users/learner-01/postCompletions/dl-p01-neuron-perceptron': {
        status: 'completed',
      },
      'users/learner-01/algorithmUnlocks/perceptron': {
        algorithmId: 'perceptron',
      },
      'users/learner-01/avatarUploadSessions/pending-avatar-01': {
        storagePath: 'user-avatars/learner-01/00000000-0000-4000-8000-000000000001',
      },
      'users/learner-01/idempotencyKeys/delete-key': {
        operation: 'course-enrollment',
      },
      'learningEvents/event-owner': {
        eventType: 'quiz_submitted',
        uidHash: createLearningLearnerHash('learner-01'),
      },
      'learningEvents/event-other': {
        eventType: 'quiz_submitted',
        uidHash: createLearningLearnerHash('learner-02'),
      },
      'users/learner-02': {
        schemaVersion: 1,
        displayName: 'Other Student',
        status: 'active',
      },
      'users/learner-02/enrollments/course-deep-learning-basic': {
        courseId: 'course-deep-learning-basic',
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    const result = await repository.deleteLearnerAccount({ uid: 'learner-01' });
    const retryResult = await repository.deleteLearnerAccount({ uid: 'learner-01' });

    expect(result).toEqual({ statusCode: 204, data: null });
    expect(retryResult).toEqual(result);
    expect(documents.get('users/learner-01')).toMatchObject({
      schemaVersion: 1,
      displayName: 'Deleted learner',
      avatarUrl: null,
      locale: 'vi',
      theme: 'system',
      status: 'anonymized',
    });
    expect(documents.get('users/learner-01')).not.toHaveProperty('email');
    expect(documents.get('users/learner-01')).not.toHaveProperty('uid');
    expect([...documents.keys()].filter((path) => path.startsWith('users/learner-01/'))).toEqual(
      [],
    );
    expect(documents.get('learningEvents/event-owner')).toBeUndefined();
    expect(documents.get('learningEvents/event-other')).toMatchObject({
      eventType: 'quiz_submitted',
      uidHash: createLearningLearnerHash('learner-02'),
    });
    expect(documents.get('users/learner-02')).toMatchObject({
      displayName: 'Other Student',
      status: 'active',
    });
    expect(documents.get('users/learner-02/enrollments/course-deep-learning-basic')).toMatchObject({
      courseId: 'course-deep-learning-basic',
    });
  });

  it('marks account deletion pending idempotently before cleanup and retains only the avatar pointer', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01': {
        avatarUrl:
          'https://storage.example.test/v0/b/local/o/user-avatars%2Flearner-01%2F00000000-0000-4000-8000-000000000001',
        displayName: 'Local Student',
        locale: 'en',
        schemaVersion: 1,
        status: 'active',
        theme: 'dark',
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    const firstResult = await repository.beginLearnerAccountDeletion({
      displayName: 'Ignored Replacement',
      uid: 'learner-01',
    });
    const retryResult = await repository.beginLearnerAccountDeletion({
      displayName: 'Ignored Replacement',
      uid: 'learner-01',
    });
    const accessState = await repository.getLearnerAccountStatus({ uid: 'learner-01' });

    expect(firstResult).toEqual({
      data: {
        avatarUrl:
          'https://storage.example.test/v0/b/local/o/user-avatars%2Flearner-01%2F00000000-0000-4000-8000-000000000001',
        status: 'deletion-pending',
      },
      statusCode: 200,
    });
    expect(retryResult).toEqual(firstResult);
    expect(accessState).toEqual({ data: { status: 'deletion-pending' }, statusCode: 200 });
    expect(documents.get('users/learner-01')).toMatchObject({
      avatarUrl:
        'https://storage.example.test/v0/b/local/o/user-avatars%2Flearner-01%2F00000000-0000-4000-8000-000000000001',
      displayName: 'Local Student',
      locale: 'en',
      status: 'deletion-pending',
      theme: 'dark',
    });
    expect(documents.get('users/learner-01')).not.toHaveProperty('email');
  });

  it('enrolls a learner idempotently and grants only the first module until its overview is viewed', async () => {
    const { documents, firestore } = createFakeFirestore();
    const repository = createFirestoreLearningRepository(firestore);
    const enrollmentInput = {
      uid: 'learner-01',
      displayName: 'Local Student',
      courseId: 'course-deep-learning-basic',
      idempotencyKey: 'enroll-course-key-01',
    };

    const firstResult = await repository.enrollLearner(enrollmentInput);
    const retryResult = await repository.enrollLearner(enrollmentInput);

    expect(firstResult).toEqual({
      statusCode: 201,
      data: {
        enrollment: {
          courseId: 'course-deep-learning-basic',
          status: 'in-progress',
          progressPercent: 0,
        },
        access: {
          moduleId: 'dl-m01-neuron-perceptron',
        },
        nextPath: '/learn/course-deep-learning-basic',
      },
    });
    expect(retryResult).toEqual(firstResult);
    expect(documents.get('users/learner-01')).toMatchObject({
      schemaVersion: 1,
      displayName: 'Local Student',
      avatarUrl: null,
      locale: 'vi',
      theme: 'system',
      status: 'active',
    });
    expect(documents.get('users/learner-01')).not.toHaveProperty('email');
    expect(documents.get('users/learner-01/enrollments/course-deep-learning-basic')).toMatchObject({
      schemaVersion: 1,
      status: 'in-progress',
      progressPercent: 0,
      courseRevisionId: 'course-deep-learning-basic-rev-r1',
    });
    expect(
      documents.get('users/learner-01/contentAccess/module_dl-m01-neuron-perceptron'),
    ).toMatchObject({
      schemaVersion: 1,
      contentType: 'module',
      entityId: 'dl-m01-neuron-perceptron',
      reason: 'course-enrollment',
      sourceProgressId: 'enrollments/course-deep-learning-basic',
    });
    expectStableContentAccessGrant(
      documents.get('users/learner-01/contentAccess/module_dl-m01-neuron-perceptron'),
    );
    expect(
      documents.get('users/learner-01/contentAccess/post_dl-p01-neuron-perceptron'),
    ).toBeUndefined();
  });

  it('enrolls a Classical ML learner into the locked first module only', async () => {
    const { documents, firestore } = createFakeFirestore();
    const repository = createFirestoreLearningRepository(firestore);

    const result = await repository.enrollLearner({
      courseId: 'course-classical-ml',
      displayName: 'Classical learner',
      idempotencyKey: 'enroll-classical-key',
      uid: 'learner-classical',
    });

    expect(result).toMatchObject({
      statusCode: 201,
      data: {
        access: {
          moduleId: 'cml-m01-foundations',
        },
        nextPath: '/learn/course-classical-ml',
      },
    });
    expect(
      documents.get('users/learner-classical/contentAccess/module_cml-m01-foundations'),
    ).toMatchObject({
      contentType: 'module',
      entityId: 'cml-m01-foundations',
    });
    expect(
      documents.get('users/learner-classical/contentAccess/post_cml-p01-problem-data-types'),
    ).toBeUndefined();
  });

  it('grants every catalog item and Playground algorithm only for the local Admin demo path', async () => {
    vi.stubEnv('FUNCTIONS_EMULATOR', 'true');
    vi.stubEnv('LOCAL_CLOUD_AUTH_DEMO', 'true');

    try {
      const { documents, firestore } = createFakeFirestore();
      const repository = createFirestoreLearningRepository(firestore);
      const catalog = getReleaseLearningCatalog();
      const modules = catalog.courses.flatMap((course) => course.modules);
      const expectedContentAccess = [
        ...modules.map((module) => `module:${module.moduleId}`),
        ...modules.flatMap((module) => module.posts.map((post) => `post:${post.postId}`)),
        ...modules.flatMap((module) => (module.demoId ? [`demo:${module.demoId}`] : [])),
      ];
      const expectedAlgorithmIds = [
        ...new Set(modules.flatMap((module) => module.unlockAlgorithmIds)),
      ];

      await repository.enrollLearner({
        allowLocalCloudAuthDemoEntitlements: true,
        courseId: 'course-deep-learning-basic',
        displayName: 'Demo learner',
        idempotencyKey: 'local-demo-unlock-all',
        uid: 'demo-learner',
      });
      const progress = await repository.getProgress({ uid: 'demo-learner' });

      expect(progress.data.courses.map((course) => course.courseId)).toEqual(
        catalog.courses.map((course) => course.courseId),
      );
      expect(
        new Set(progress.data.contentAccess.map((item) => `${item.contentType}:${item.entityId}`)),
      ).toEqual(new Set(expectedContentAccess));
      expect(new Set(progress.data.algorithmUnlocks.map((item) => item.algorithmId))).toEqual(
        new Set(expectedAlgorithmIds),
      );
      expect(
        [...documents.keys()].filter((path) => path.startsWith('users/demo-learner/enrollments/')),
      ).toHaveLength(catalog.courses.length);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('does not grant local cloud Auth demo entitlements to a learner', async () => {
    vi.stubEnv('FUNCTIONS_EMULATOR', 'true');
    vi.stubEnv('LOCAL_CLOUD_AUTH_DEMO', 'true');

    try {
      const { documents, firestore } = createFakeFirestore();
      const repository = createFirestoreLearningRepository(firestore);

      await repository.enrollLearner({
        allowLocalCloudAuthDemoEntitlements: false,
        courseId: 'course-deep-learning-basic',
        displayName: 'Regular learner',
        idempotencyKey: 'local-demo-learner',
        uid: 'regular-learner',
      });
      const progress = await repository.getProgress({ uid: 'regular-learner' });

      expect(progress.data.courses.map((course) => course.courseId)).toEqual([
        'course-deep-learning-basic',
      ]);
      expect(progress.data.contentAccess).toHaveLength(1);
      expect(progress.data.contentAccess[0]).toMatchObject({
        contentType: 'module',
        entityId: 'dl-m01-neuron-perceptron',
      });
      expect(progress.data.algorithmUnlocks).toEqual([]);
      expect(
        [...documents.keys()].filter((path) => path.startsWith('users/regular-learner/')),
      ).not.toContain('users/regular-learner/algorithmUnlocks/perceptron');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('records an accessible module overview before granting its first post', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01/contentAccess/module_dl-m01-neuron-perceptron': {
        contentType: 'module',
        entityId: 'dl-m01-neuron-perceptron',
        schemaVersion: 1,
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await expect(
      repository.createQuizAttempt({
        quizId: 'quiz-post-dl-p01',
        uid: 'learner-01',
      }),
    ).rejects.toMatchObject({
      code: 'CONTENT_ACCESS_REQUIRED',
      statusCode: 403,
    });

    await expect(
      repository.recordModuleOverview({
        moduleId: 'dl-m01-neuron-perceptron',
        uid: 'learner-01',
      }),
    ).resolves.toMatchObject({
      data: {
        moduleOverview: {
          moduleId: 'dl-m01-neuron-perceptron',
          nextPostId: 'dl-p01-neuron-perceptron',
          status: 'completed',
        },
      },
    });

    expect(documents.get('users/learner-01/moduleProgress/dl-m01-neuron-perceptron')).toMatchObject(
      {
        completedStepCount: 1,
        overviewViewed: true,
        requiredStepCount: 4,
        status: 'in-progress',
      },
    );
    expect(
      documents.get('users/learner-01/contentAccess/post_dl-p01-neuron-perceptron'),
    ).toMatchObject({
      contentType: 'post',
      entityId: 'dl-p01-neuron-perceptron',
      reason: 'module-overview',
    });
  });

  it('does not grant an emergency-blocked post from an otherwise accessible module overview', async () => {
    const { documents, firestore } = createFakeFirestore({
      'adminContentEntities/post:dl-p01-neuron-perceptron': {
        currentContent: {
          emergencyBlocked: true,
          entityId: 'dl-p01-neuron-perceptron',
          entityType: 'post',
          publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
          status: 'published',
        },
        draftRevisionId: null,
        entityId: 'dl-p01-neuron-perceptron',
        entityType: 'post',
        schemaVersion: 1,
      },
      'users/learner-01/contentAccess/module_dl-m01-neuron-perceptron': {
        contentType: 'module',
        entityId: 'dl-m01-neuron-perceptron',
        schemaVersion: 1,
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await expect(
      repository.recordModuleOverview({
        moduleId: 'dl-m01-neuron-perceptron',
        uid: 'learner-01',
      }),
    ).rejects.toMatchObject({
      code: 'CONTENT_EMERGENCY_BLOCKED',
      statusCode: 403,
    });
    expect(
      documents.get('users/learner-01/moduleProgress/dl-m01-neuron-perceptron'),
    ).toBeUndefined();
    expect(
      documents.get('users/learner-01/contentAccess/post_dl-p01-neuron-perceptron'),
    ).toBeUndefined();
  });

  it('rejects a new quiz attempt when the authoritative quiz entity is emergency blocked', async () => {
    const { documents, firestore } = createFakeFirestore({
      'adminContentEntities/quiz:quiz-post-dl-p01': {
        currentContent: {
          emergencyBlocked: true,
          entityId: 'quiz-post-dl-p01',
          entityType: 'quiz',
          publishedRevisionId: 'quiz-post-dl-p01-rev-r1',
          status: 'published',
        },
        draftRevisionId: null,
        entityId: 'quiz-post-dl-p01',
        entityType: 'quiz',
        schemaVersion: 1,
      },
      'users/learner-01/contentAccess/post_dl-p01-neuron-perceptron': {
        contentType: 'post',
        entityId: 'dl-p01-neuron-perceptron',
        schemaVersion: 1,
      },
      'users/learner-01/postViews/dl-p01-neuron-perceptron': {
        contentViewed: true,
        schemaVersion: 1,
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await expect(
      repository.createQuizAttempt({
        quizId: 'quiz-post-dl-p01',
        uid: 'learner-01',
      }),
    ).rejects.toMatchObject({
      code: 'CONTENT_EMERGENCY_BLOCKED',
      statusCode: 403,
    });
    expect(
      [...documents.keys()].some((path) => path.startsWith('users/learner-01/quizAttempts/')),
    ).toBe(false);
  });

  it('rejects enrollment when an idempotency key belongs to another request', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01/idempotencyKeys/enroll-conflict-key': {
        schemaVersion: 1,
        operation: 'course-enrollment',
        requestHash: 'different-request',
        responseData: {},
        statusCode: 201,
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await expect(
      repository.enrollLearner({
        uid: 'learner-01',
        displayName: 'Local Student',
        courseId: 'course-deep-learning-basic',
        idempotencyKey: 'enroll-conflict-key',
      }),
    ).rejects.toMatchObject({
      code: 'IDEMPOTENCY_CONFLICT',
      statusCode: 409,
    });
  });

  it('keeps the module quiz closed until the required post quiz is passed', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01/contentAccess/module_dl-m01-neuron-perceptron': {
        contentType: 'module',
        entityId: 'dl-m01-neuron-perceptron',
        schemaVersion: 1,
      },
      'users/learner-01/demoCompletions/demo-perceptron-and-gate': {
        demoId: 'demo-perceptron-and-gate',
        schemaVersion: 1,
        status: 'completed',
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await expect(
      repository.createQuizAttempt({
        quizId: 'quiz-module-dl-m01',
        uid: 'learner-01',
      }),
    ).rejects.toMatchObject({
      code: 'POST_COMPLETION_REQUIRED',
      statusCode: 403,
    });
  });

  it('repairs a stale module grant before opening a quiz with completed prerequisites', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01/demoCompletions/demo-perceptron-and-gate': {
        demoId: 'demo-perceptron-and-gate',
        schemaVersion: 1,
        status: 'completed',
      },
      'users/learner-01/postCompletions/dl-p01-neuron-perceptron': {
        postId: 'dl-p01-neuron-perceptron',
        schemaVersion: 1,
        status: 'completed',
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    const result = await repository.createQuizAttempt({
      quizId: 'quiz-module-dl-m01',
      uid: 'learner-01',
    });

    expect(result.statusCode).toBe(201);
    expect(
      documents.get('users/learner-01/contentAccess/module_dl-m01-neuron-perceptron'),
    ).toMatchObject({
      contentType: 'module',
      entityId: 'dl-m01-neuron-perceptron',
      reason: 'prerequisites-completed',
      sourceProgressId: 'demoCompletions/demo-perceptron-and-gate',
    });
    expectStableContentAccessGrant(
      documents.get('users/learner-01/contentAccess/module_dl-m01-neuron-perceptron'),
    );
  });

  it('merges required post block views, retains the reading position, and opens the post quiz only after content is viewed', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01/contentAccess/post_dl-p01-neuron-perceptron': {
        contentType: 'post',
        entityId: 'dl-p01-neuron-perceptron',
        schemaVersion: 1,
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await expect(
      repository.createQuizAttempt({
        quizId: 'quiz-post-dl-p01',
        uid: 'learner-01',
      }),
    ).rejects.toMatchObject({
      code: 'POST_CONTENT_VIEW_REQUIRED',
      statusCode: 403,
    });

    const firstView = await repository.recordPostView({
      postId: 'dl-p01-neuron-perceptron',
      readingPosition: 'weighted-sum',
      uid: 'learner-01',
      viewedItemIds: ['what-is-a-neuron', 'neuron-explanation', 'neuron-insight'],
    });

    expect(firstView.data.postView).toMatchObject({
      contentViewed: false,
      readingPosition: 'weighted-sum',
      postId: 'dl-p01-neuron-perceptron',
      started: true,
    });

    const secondView = await repository.recordPostView({
      postId: 'dl-p01-neuron-perceptron',
      readingPosition: 'and-linearly-separable',
      uid: 'learner-01',
      viewedItemIds: [
        'weighted-sum',
        'weight-explanation',
        'weighted-sum-formula',
        'try-it',
        'read-result',
        'xor-linear-limit',
        'xor-truth-table',
        'and-linearly-separable',
      ],
    });

    expect(secondView.data.postView).toMatchObject({
      contentViewed: true,
      readingPosition: 'and-linearly-separable',
      postId: 'dl-p01-neuron-perceptron',
      started: true,
    });
    expect(documents.get('users/learner-01/postViews/dl-p01-neuron-perceptron')).toMatchObject({
      contentViewed: true,
      readingPosition: 'and-linearly-separable',
      status: 'content-viewed',
      viewedItemIds: expect.arrayContaining(['what-is-a-neuron', 'and-linearly-separable']),
    });

    await expect(
      repository.createQuizAttempt({
        quizId: 'quiz-post-dl-p01',
        uid: 'learner-01',
      }),
    ).resolves.toMatchObject({ statusCode: 201 });
  });

  it('lets an existing enrollee keep recording progress after a planned course unpublish', async () => {
    const { documents, firestore } = createFakeFirestore({
      'adminContentEntities/course:course-deep-learning-basic': {
        currentContent: {
          emergencyBlocked: false,
          entityId: 'course-deep-learning-basic',
          entityType: 'course',
          publishedRevisionId: 'course-deep-learning-basic-rev-r1',
          status: 'unpublished',
        },
        draftRevisionId: null,
        entityId: 'course-deep-learning-basic',
        entityType: 'course',
        schemaVersion: 1,
      },
      'users/learner-01/contentAccess/post_dl-p01-neuron-perceptron': {
        contentType: 'post',
        entityId: 'dl-p01-neuron-perceptron',
        schemaVersion: 1,
      },
      'users/learner-01/enrollments/course-deep-learning-basic': {
        courseId: 'course-deep-learning-basic',
        progressPercent: 33,
        schemaVersion: 1,
        status: 'in-progress',
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await expect(
      repository.recordPostView({
        postId: 'dl-p01-neuron-perceptron',
        readingPosition: 'what-is-a-neuron',
        uid: 'learner-01',
        viewedItemIds: ['what-is-a-neuron'],
      }),
    ).resolves.toMatchObject({
      data: {
        postView: {
          postId: 'dl-p01-neuron-perceptron',
          started: true,
        },
      },
    });

    expect(documents.get('users/learner-01/enrollments/course-deep-learning-basic')).toMatchObject({
      courseId: 'course-deep-learning-basic',
      progressPercent: 33,
      status: 'in-progress',
    });
    expect(documents.get('users/learner-01/postViews/dl-p01-neuron-perceptron')).toMatchObject({
      postId: 'dl-p01-neuron-perceptron',
      started: true,
    });
  });

  it('records a started demo only after the backend grants demo access', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01/contentAccess/demo_demo-perceptron-and-gate': {
        contentType: 'demo',
        entityId: 'demo-perceptron-and-gate',
        schemaVersion: 1,
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await expect(
      repository.recordDemoView({
        demoId: 'demo-perceptron-and-gate',
        uid: 'learner-01',
        viewedStepIds: ['and-problem', 'and-data'],
      }),
    ).resolves.toMatchObject({
      data: {
        demoView: {
          demoId: 'demo-perceptron-and-gate',
          started: true,
          viewedStepIds: ['and-data', 'and-problem'],
        },
      },
    });

    expect(documents.get('users/learner-01/demoViews/demo-perceptron-and-gate')).toMatchObject({
      started: true,
      status: 'in-progress',
      viewedStepIds: ['and-data', 'and-problem'],
    });
  });

  it('confirms a passed and fully viewed post before persisting its completion', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01/contentAccess/post_dl-p01-neuron-perceptron': {
        contentType: 'post',
        entityId: 'dl-p01-neuron-perceptron',
        schemaVersion: 1,
      },
      'users/learner-01/postViews/dl-p01-neuron-perceptron': {
        contentViewed: true,
        schemaVersion: 1,
      },
      'users/learner-01/quizProgress/quiz-post-dl-p01': {
        passed: true,
        schemaVersion: 1,
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await expect(
      repository.completePost({
        idempotencyKey: 'post-completion-key-01',
        postId: 'dl-p01-neuron-perceptron',
        uid: 'learner-01',
      }),
    ).resolves.toMatchObject({
      data: {
        completion: {
          postId: 'dl-p01-neuron-perceptron',
          status: 'completed',
        },
      },
    });

    expect(
      documents.get('users/learner-01/postCompletions/dl-p01-neuron-perceptron'),
    ).toMatchObject({
      postId: 'dl-p01-neuron-perceptron',
      quizId: 'quiz-post-dl-p01',
      status: 'completed',
    });
    expect(
      documents.get('users/learner-01/contentAccess/demo_demo-perceptron-and-gate'),
    ).toMatchObject({
      contentType: 'demo',
      entityId: 'demo-perceptron-and-gate',
    });
  });

  it('rejects post completion and preserves downstream grants when the post is emergency blocked', async () => {
    const { documents, firestore } = createFakeFirestore({
      'adminContentEntities/post:dl-p01-neuron-perceptron': {
        currentContent: {
          emergencyBlocked: true,
          entityId: 'dl-p01-neuron-perceptron',
          entityType: 'post',
          publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
          status: 'published',
        },
        draftRevisionId: null,
        entityId: 'dl-p01-neuron-perceptron',
        entityType: 'post',
        schemaVersion: 1,
      },
      'users/learner-01/contentAccess/post_dl-p01-neuron-perceptron': {
        contentType: 'post',
        entityId: 'dl-p01-neuron-perceptron',
        schemaVersion: 1,
      },
      'users/learner-01/postViews/dl-p01-neuron-perceptron': {
        contentViewed: true,
        schemaVersion: 1,
      },
      'users/learner-01/quizProgress/quiz-post-dl-p01': {
        passed: true,
        schemaVersion: 1,
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await expect(
      repository.completePost({
        idempotencyKey: 'post-emergency-bypass-key',
        postId: 'dl-p01-neuron-perceptron',
        uid: 'learner-01',
      }),
    ).rejects.toMatchObject({
      code: 'CONTENT_EMERGENCY_BLOCKED',
      statusCode: 403,
    });
    expect(
      documents.get('users/learner-01/postCompletions/dl-p01-neuron-perceptron'),
    ).toBeUndefined();
    expect(
      documents.get('users/learner-01/contentAccess/demo_demo-perceptron-and-gate'),
    ).toBeUndefined();
  });

  it('completes the module, updates enrollment progress, and opens the next module after passing the module quiz', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01/enrollments/course-deep-learning-basic': {
        courseId: 'course-deep-learning-basic',
        progressPercent: 0,
        schemaVersion: 1,
        status: 'in-progress',
      },
      'users/learner-01/demoCompletions/demo-perceptron-and-gate': {
        demoId: 'demo-perceptron-and-gate',
        schemaVersion: 1,
        status: 'completed',
      },
      'users/learner-01/postCompletions/dl-p01-neuron-perceptron': {
        postId: 'dl-p01-neuron-perceptron',
        schemaVersion: 1,
        status: 'completed',
      },
      'users/learner-01/quizAttempts/attempt-module-quiz-01': {
        attemptNumber: 1,
        expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
        questionIds: [
          'q-dl-m01-boundary',
          'q-dl-m01-inputs',
          'q-dl-m01-xor-linearly-separable',
          'q-dl-m01-bias',
          'q-dl-m01-and-xor',
          'q-dl-m01-hidden-layer',
        ],
        quizId: 'quiz-module-dl-m01',
        quizRevisionId: 'quiz-module-dl-m01-rev-r1',
        schemaVersion: 1,
        status: 'in-progress',
      },
      'users/learner-01/quizProgress/quiz-module-dl-m01': {
        attemptCount: 1,
        bestScore: 0,
        passed: false,
        schemaVersion: 1,
        wrongCounts: {},
      },
    });
    const repository = createFirestoreLearningRepository(firestore);
    const moduleQuizPassInput = {
      attemptId: 'attempt-module-quiz-01',
      idempotencyKey: 'module-quiz-pass-key',
      uid: 'learner-01',
      answers: [
        { questionId: 'q-dl-m01-boundary', value: 'opt-boundary' },
        { questionId: 'q-dl-m01-inputs', value: ['opt-x1', 'opt-x2'] },
        { questionId: 'q-dl-m01-xor-linearly-separable', value: 'false' },
        { questionId: 'q-dl-m01-bias', value: 'opt-bias-shift' },
        {
          questionId: 'q-dl-m01-and-xor',
          value: ['opt-and-separable', 'opt-xor-not-separable'],
        },
        { questionId: 'q-dl-m01-hidden-layer', value: 'true' },
      ],
    };

    const result = await repository.submitQuizAttempt(moduleQuizPassInput);
    const retryResult = await repository.submitQuizAttempt(moduleQuizPassInput);

    expect(result.data).toMatchObject({
      passed: true,
      score: 100,
      newlyUnlocked: [{ id: 'perceptron', type: 'algorithm' }],
    });
    expect(retryResult.data).toEqual(result.data);
    expect(
      documents.get('users/learner-01/moduleCompletions/dl-m01-neuron-perceptron'),
    ).toMatchObject({
      courseId: 'course-deep-learning-basic',
      moduleId: 'dl-m01-neuron-perceptron',
      status: 'completed',
    });
    expect(documents.get('users/learner-01/enrollments/course-deep-learning-basic')).toMatchObject({
      progressPercent: 33,
      status: 'in-progress',
    });
    expect(documents.get('users/learner-01/algorithmUnlocks/perceptron')).toMatchObject({
      algorithmId: 'perceptron',
      moduleId: 'dl-m01-neuron-perceptron',
      reason: 'module-completed',
    });
    expect(documents.get('users/learner-01/contentAccess/module_dl-m02-mlp')).toMatchObject({
      contentType: 'module',
      entityId: 'dl-m02-mlp',
      reason: 'module-completed',
    });
    expectStableContentAccessGrant(
      documents.get('users/learner-01/contentAccess/module_dl-m02-mlp'),
    );
    expect(
      documents.get('users/learner-01/contentAccess/post_dl-p02-mlp-forward-activation'),
    ).toBeUndefined();
  });

  it('unlocks all seven submission algorithms through trusted module quiz completion', async () => {
    for (const unit of getSubmissionLearningUnits()) {
      const module = getReleaseModule(unit.moduleId);

      expect(module).not.toBeNull();

      const initialDocuments: Record<string, Record<string, unknown>> = {
        [`users/learner-${unit.algorithmId}/enrollments/${unit.courseId}`]: {
          courseId: unit.courseId,
          progressPercent: 0,
          schemaVersion: 1,
          status: 'in-progress',
        },
        [`users/learner-${unit.algorithmId}/quizAttempts/attempt-${unit.moduleQuizId}`]:
          createOpenAttemptDocument(unit.moduleQuizId),
        [`users/learner-${unit.algorithmId}/quizProgress/${unit.moduleQuizId}`]: {
          attemptCount: 1,
          bestScore: 0,
          passed: false,
          schemaVersion: 1,
          wrongCounts: {},
        },
      };

      for (const postId of unit.requiredPostIds) {
        initialDocuments[`users/learner-${unit.algorithmId}/postCompletions/${postId}`] = {
          postId,
          schemaVersion: 1,
          status: 'completed',
        };
      }

      if (module?.demoId) {
        initialDocuments[`users/learner-${unit.algorithmId}/demoCompletions/${module.demoId}`] = {
          demoId: module.demoId,
          schemaVersion: 1,
          status: 'completed',
        };
      }

      const { documents, firestore } = createFakeFirestore(initialDocuments);
      const repository = createFirestoreLearningRepository(firestore);

      const result = await repository.submitQuizAttempt({
        answers: createPassingAnswers(unit.moduleQuizId),
        attemptId: `attempt-${unit.moduleQuizId}`,
        idempotencyKey: `pass-${unit.moduleQuizId}`,
        uid: `learner-${unit.algorithmId}`,
      });

      expect(result.data).toMatchObject({
        passed: true,
        score: 100,
      });
      expect(result.data).toMatchObject({
        newlyUnlocked: unit.unlockAlgorithmIds.map((algorithmId) => ({
          id: algorithmId,
          type: 'algorithm',
        })),
      });

      for (const algorithmId of unit.unlockAlgorithmIds) {
        expect(
          documents.get(`users/learner-${unit.algorithmId}/algorithmUnlocks/${algorithmId}`),
        ).toMatchObject({
          algorithmId,
          moduleId: unit.moduleId,
          reason: 'module-completed',
        });
      }
    }
  });

  it('completes a module quiz without a demo when the module has no demo', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-classical/enrollments/course-classical-ml': {
        courseId: 'course-classical-ml',
        progressPercent: 0,
        schemaVersion: 1,
        status: 'in-progress',
      },
      'users/learner-classical/contentAccess/module_cml-m01-foundations': {
        contentType: 'module',
        entityId: 'cml-m01-foundations',
        schemaVersion: 1,
      },
      'users/learner-classical/postCompletions/cml-p01-problem-data-types': {
        postId: 'cml-p01-problem-data-types',
        schemaVersion: 1,
        status: 'completed',
      },
      'users/learner-classical/postCompletions/cml-p02-train-test-metrics': {
        postId: 'cml-p02-train-test-metrics',
        schemaVersion: 1,
        status: 'completed',
      },
      'users/learner-classical/quizAttempts/attempt-quiz-module-cml-m01':
        createOpenAttemptDocument('quiz-module-cml-m01'),
      'users/learner-classical/quizProgress/quiz-module-cml-m01': {
        attemptCount: 1,
        bestScore: 0,
        passed: false,
        schemaVersion: 1,
        wrongCounts: {},
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    const result = await repository.submitQuizAttempt({
      answers: createPassingAnswers('quiz-module-cml-m01'),
      attemptId: 'attempt-quiz-module-cml-m01',
      idempotencyKey: 'pass-quiz-module-cml-m01',
      uid: 'learner-classical',
    });

    expect(result.data).toMatchObject({ passed: true, score: 100 });
    expect(
      documents.get('users/learner-classical/moduleCompletions/cml-m01-foundations'),
    ).toMatchObject({
      moduleId: 'cml-m01-foundations',
      status: 'completed',
    });
  });

  it('rejects direct module quiz completion when required post and demo completion are missing', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01/quizAttempts/attempt-module-quiz-direct': {
        attemptNumber: 1,
        expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
        questionIds: [
          'q-dl-m01-boundary',
          'q-dl-m01-inputs',
          'q-dl-m01-xor-linearly-separable',
          'q-dl-m01-bias',
          'q-dl-m01-and-xor',
          'q-dl-m01-hidden-layer',
        ],
        quizId: 'quiz-module-dl-m01',
        quizRevisionId: 'quiz-module-dl-m01-rev-r1',
        schemaVersion: 1,
        status: 'in-progress',
      },
      'users/learner-01/quizProgress/quiz-module-dl-m01': {
        attemptCount: 1,
        bestScore: 0,
        passed: false,
        schemaVersion: 1,
        wrongCounts: {},
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await expect(
      repository.submitQuizAttempt({
        attemptId: 'attempt-module-quiz-direct',
        idempotencyKey: 'module-quiz-direct-bypass-key',
        uid: 'learner-01',
        answers: [
          { questionId: 'q-dl-m01-boundary', value: 'opt-boundary' },
          { questionId: 'q-dl-m01-inputs', value: ['opt-x1', 'opt-x2'] },
          { questionId: 'q-dl-m01-xor-linearly-separable', value: 'false' },
          { questionId: 'q-dl-m01-bias', value: 'opt-bias-shift' },
          {
            questionId: 'q-dl-m01-and-xor',
            value: ['opt-and-separable', 'opt-xor-not-separable'],
          },
          { questionId: 'q-dl-m01-hidden-layer', value: 'true' },
        ],
      }),
    ).rejects.toMatchObject({
      code: 'MODULE_COMPLETION_PREREQUISITES_REQUIRED',
      statusCode: 403,
    });
  });

  it('grants demo access after the required post quiz is passed', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01/quizAttempts/attempt-post-quiz-01': {
        attemptNumber: 1,
        expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
        questionIds: [
          'q-dl-p01-perceptron-role',
          'q-dl-p01-perceptron-parts',
          'q-dl-p01-and-linearly-separable',
        ],
        quizId: 'quiz-post-dl-p01',
        quizRevisionId: 'quiz-post-dl-p01-rev-r1',
        schemaVersion: 1,
        status: 'in-progress',
      },
      'users/learner-01/quizProgress/quiz-post-dl-p01': {
        attemptCount: 1,
        bestScore: 0,
        passed: false,
        schemaVersion: 1,
        wrongCounts: {},
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await repository.submitQuizAttempt({
      attemptId: 'attempt-post-quiz-01',
      idempotencyKey: 'post-quiz-pass-key',
      uid: 'learner-01',
      answers: [
        { questionId: 'q-dl-p01-perceptron-role', value: 'opt-linear-limit' },
        {
          questionId: 'q-dl-p01-perceptron-parts',
          value: ['opt-weighted-sum', 'opt-step-activation'],
        },
        { questionId: 'q-dl-p01-and-linearly-separable', value: 'true' },
      ],
    });

    expect(
      documents.get('users/learner-01/contentAccess/demo_demo-perceptron-and-gate'),
    ).toMatchObject({
      contentType: 'demo',
      entityId: 'demo-perceptron-and-gate',
      reason: 'post-completed',
    });
    expectStableContentAccessGrant(
      documents.get('users/learner-01/contentAccess/demo_demo-perceptron-and-gate'),
    );
  });

  it('opens the next post in a multi-post module before granting the fixed demo', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01/quizAttempts/attempt-cml-p03':
        createOpenAttemptDocument('quiz-post-cml-p03'),
      'users/learner-01/quizProgress/quiz-post-cml-p03': {
        attemptCount: 1,
        bestScore: 0,
        passed: false,
        schemaVersion: 1,
        wrongCounts: {},
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await repository.submitQuizAttempt({
      answers: createPassingAnswers('quiz-post-cml-p03'),
      attemptId: 'attempt-cml-p03',
      idempotencyKey: 'post-cml-p03-pass-key',
      uid: 'learner-01',
    });

    expect(
      documents.get('users/learner-01/contentAccess/post_cml-p04-polynomial-regression'),
    ).toMatchObject({
      contentType: 'post',
      entityId: 'cml-p04-polynomial-regression',
      reason: 'post-completed',
    });
    expect(
      documents.get('users/learner-01/contentAccess/demo_demo-linear-calibration'),
    ).toBeUndefined();
  });

  it('grants fixed demo access only after the last required module post is complete', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01/postCompletions/cml-p03-linear-regression': {
        postId: 'cml-p03-linear-regression',
        schemaVersion: 1,
        status: 'completed',
      },
      'users/learner-01/quizAttempts/attempt-cml-p04':
        createOpenAttemptDocument('quiz-post-cml-p04'),
      'users/learner-01/quizProgress/quiz-post-cml-p04': {
        attemptCount: 1,
        bestScore: 0,
        passed: false,
        schemaVersion: 1,
        wrongCounts: {},
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await repository.submitQuizAttempt({
      answers: createPassingAnswers('quiz-post-cml-p04'),
      attemptId: 'attempt-cml-p04',
      idempotencyKey: 'post-cml-p04-pass-key',
      uid: 'learner-01',
    });

    expect(
      documents.get('users/learner-01/contentAccess/demo_demo-linear-calibration'),
    ).toMatchObject({
      contentType: 'demo',
      entityId: 'demo-linear-calibration',
      reason: 'post-completed',
    });
    expectStableContentAccessGrant(
      documents.get('users/learner-01/contentAccess/demo_demo-linear-calibration'),
    );
  });

  it('rejects direct demo completion when the post completion has not granted demo access', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01/contentAccess/module_dl-m01-neuron-perceptron': {
        contentType: 'module',
        entityId: 'dl-m01-neuron-perceptron',
        schemaVersion: 1,
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await expect(
      repository.completeDemo({
        demoId: 'demo-perceptron-and-gate',
        idempotencyKey: 'demo-direct-bypass-key',
        moduleId: 'dl-m01-neuron-perceptron',
        requiredStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
        uid: 'learner-01',
        viewedStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
      }),
    ).rejects.toMatchObject({
      code: 'DEMO_ACCESS_REQUIRED',
      statusCode: 403,
    });
  });

  it('repairs missing module access when completing an already unlocked demo', async () => {
    const { documents, firestore } = createFakeFirestore({
      'users/learner-01/contentAccess/demo_demo-perceptron-and-gate': {
        contentType: 'demo',
        entityId: 'demo-perceptron-and-gate',
        schemaVersion: 1,
      },
      'users/learner-01/postCompletions/dl-p01-neuron-perceptron': {
        postId: 'dl-p01-neuron-perceptron',
        schemaVersion: 1,
        status: 'completed',
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    const result = await repository.completeDemo({
      demoId: 'demo-perceptron-and-gate',
      idempotencyKey: 'demo-repair-module-access-key',
      moduleId: 'dl-m01-neuron-perceptron',
      requiredStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
      uid: 'learner-01',
      viewedStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
    });

    expect(result.statusCode).toBe(200);
    expect(
      documents.get('users/learner-01/contentAccess/module_dl-m01-neuron-perceptron'),
    ).toMatchObject({
      contentType: 'module',
      entityId: 'dl-m01-neuron-perceptron',
      reason: 'demo-completed',
      sourceProgressId: 'demoCompletions/demo-perceptron-and-gate',
    });
    expectStableContentAccessGrant(
      documents.get('users/learner-01/contentAccess/module_dl-m01-neuron-perceptron'),
    );
  });

  it('rejects demo completion and preserves unlocks when the authoritative demo is emergency blocked', async () => {
    const { documents, firestore } = createFakeFirestore({
      'adminContentEntities/demo:demo-perceptron-and-gate': {
        currentContent: {
          emergencyBlocked: true,
          entityId: 'demo-perceptron-and-gate',
          entityType: 'demo',
          publishedRevisionId: 'demo-perceptron-and-gate-rev-r1',
          status: 'published',
        },
        draftRevisionId: null,
        entityId: 'demo-perceptron-and-gate',
        entityType: 'demo',
        schemaVersion: 1,
      },
      'users/learner-01/contentAccess/demo_demo-perceptron-and-gate': {
        contentType: 'demo',
        entityId: 'demo-perceptron-and-gate',
        schemaVersion: 1,
      },
      'users/learner-01/postCompletions/dl-p01-neuron-perceptron': {
        schemaVersion: 1,
        status: 'completed',
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    await expect(
      repository.completeDemo({
        demoId: 'demo-perceptron-and-gate',
        idempotencyKey: 'demo-emergency-bypass-key',
        moduleId: 'dl-m01-neuron-perceptron',
        requiredStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
        uid: 'learner-01',
        viewedStepIds: ['and-problem', 'and-data', 'and-boundary', 'and-result'],
      }),
    ).rejects.toMatchObject({
      code: 'CONTENT_EMERGENCY_BLOCKED',
      statusCode: 403,
    });
    expect(
      documents.get('users/learner-01/demoCompletions/demo-perceptron-and-gate'),
    ).toBeUndefined();
  });

  it('returns a backend-verified progress snapshot from stored progress documents', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01/algorithmUnlocks/perceptron': {
        algorithmId: 'perceptron',
        moduleId: 'dl-m01-neuron-perceptron',
        schemaVersion: 1,
      },
      'users/learner-01/contentAccess/demo_demo-perceptron-and-gate': {
        contentType: 'demo',
        entityId: 'demo-perceptron-and-gate',
        schemaVersion: 1,
      },
      'users/learner-01/contentAccess/module_dl-m01-neuron-perceptron': {
        contentType: 'module',
        entityId: 'dl-m01-neuron-perceptron',
        schemaVersion: 1,
      },
      'users/learner-01/contentAccess/post_dl-p01-neuron-perceptron': {
        contentType: 'post',
        entityId: 'dl-p01-neuron-perceptron',
        schemaVersion: 1,
      },
      'users/learner-01/demoCompletions/demo-perceptron-and-gate': {
        schemaVersion: 1,
        status: 'completed',
      },
      'users/learner-01/enrollments/course-deep-learning-basic': {
        progressPercent: 33,
        schemaVersion: 1,
        status: 'in-progress',
      },
      'users/learner-01/moduleCompletions/dl-m01-neuron-perceptron': {
        schemaVersion: 1,
        status: 'completed',
      },
      'users/learner-01/postCompletions/dl-p01-neuron-perceptron': {
        schemaVersion: 1,
        status: 'completed',
      },
      'users/learner-01/quizProgress/quiz-module-dl-m01': {
        attemptCount: 1,
        bestScore: 100,
        passed: true,
        schemaVersion: 1,
      },
      'users/learner-01/quizProgress/quiz-post-dl-p01': {
        attemptCount: 1,
        bestScore: 100,
        passed: true,
        schemaVersion: 1,
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    const result = await repository.getProgress({ uid: 'learner-01' });

    expect(result.data.enrollment).toEqual({
      courseId: 'course-deep-learning-basic',
      progressPercent: 33,
      status: 'in-progress',
    });
    expect(result.data.modules).toEqual([
      {
        completedStepCount: 4,
        moduleId: 'dl-m01-neuron-perceptron',
        overviewViewed: false,
        progressPercent: 100,
        requiredStepCount: 4,
        status: 'completed',
      },
    ]);
    expect(result.data.algorithmUnlocks).toEqual([
      {
        algorithmId: 'perceptron',
        moduleId: 'dl-m01-neuron-perceptron',
      },
    ]);
    expect(result.data.contentAccess).toEqual([
      {
        contentType: 'module',
        entityId: 'dl-m01-neuron-perceptron',
      },
      {
        contentType: 'post',
        entityId: 'dl-p01-neuron-perceptron',
      },
      {
        contentType: 'demo',
        entityId: 'demo-perceptron-and-gate',
      },
    ]);
  });

  it('returns stable access and algorithm unlocks for non-Perceptron learning units', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01/algorithmUnlocks/linear-regression': {
        algorithmId: 'linear-regression',
        moduleId: 'cml-m02-linear-polynomial',
        schemaVersion: 1,
      },
      'users/learner-01/contentAccess/demo_demo-linear-calibration': {
        contentType: 'demo',
        entityId: 'demo-linear-calibration',
        schemaVersion: 1,
      },
      'users/learner-01/contentAccess/module_cml-m02-linear-polynomial': {
        contentType: 'module',
        entityId: 'cml-m02-linear-polynomial',
        schemaVersion: 1,
      },
      'users/learner-01/contentAccess/post_cml-p03-linear-regression': {
        contentType: 'post',
        entityId: 'cml-p03-linear-regression',
        schemaVersion: 1,
      },
      'users/learner-01/demoCompletions/demo-linear-calibration': {
        schemaVersion: 1,
        status: 'completed',
      },
      'users/learner-01/enrollments/course-classical-ml': {
        courseId: 'course-classical-ml',
        progressPercent: 22,
        schemaVersion: 1,
        status: 'in-progress',
      },
      'users/learner-01/moduleCompletions/cml-m02-linear-polynomial': {
        schemaVersion: 1,
        status: 'completed',
      },
      'users/learner-01/postCompletions/cml-p03-linear-regression': {
        schemaVersion: 1,
        status: 'completed',
      },
      'users/learner-01/quizProgress/quiz-module-cml-m02': {
        attemptCount: 1,
        bestScore: 100,
        passed: true,
        schemaVersion: 1,
      },
      'users/learner-01/quizProgress/quiz-post-cml-p03': {
        attemptCount: 1,
        bestScore: 100,
        passed: true,
        schemaVersion: 1,
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    const result = await repository.getProgress({ uid: 'learner-01' });

    expect(result.data.enrollment).toEqual({
      courseId: 'course-classical-ml',
      progressPercent: 22,
      status: 'in-progress',
    });
    expect(result.data.algorithmUnlocks).toContainEqual({
      algorithmId: 'linear-regression',
      moduleId: 'cml-m02-linear-polynomial',
    });
    expect(result.data.contentAccess).toContainEqual({
      contentType: 'demo',
      entityId: 'demo-linear-calibration',
    });
    expect(result.data.contentAccess).toContainEqual({
      contentType: 'post',
      entityId: 'cml-p03-linear-regression',
    });
  });

  it('returns progress for every enrolled course instead of selecting the first enrollment', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01/enrollments/course-classical-ml': {
        courseId: 'course-classical-ml',
        progressPercent: 11,
        schemaVersion: 1,
        status: 'in-progress',
      },
      'users/learner-01/enrollments/course-deep-learning-basic': {
        courseId: 'course-deep-learning-basic',
        progressPercent: 33,
        schemaVersion: 1,
        status: 'in-progress',
      },
      'users/learner-01/moduleProgress/cml-m01-foundations': {
        courseId: 'course-classical-ml',
        moduleId: 'cml-m01-foundations',
        overviewViewed: true,
        schemaVersion: 1,
        status: 'in-progress',
      },
      'users/learner-01/postViews/cml-p01-problem-data-types': {
        contentViewed: true,
        postId: 'cml-p01-problem-data-types',
        schemaVersion: 1,
        started: true,
      },
      'users/learner-01/moduleProgress/dl-m01-neuron-perceptron': {
        courseId: 'course-deep-learning-basic',
        moduleId: 'dl-m01-neuron-perceptron',
        overviewViewed: true,
        schemaVersion: 1,
        status: 'in-progress',
      },
      'users/learner-01/postViews/dl-p01-neuron-perceptron': {
        contentViewed: true,
        postId: 'dl-p01-neuron-perceptron',
        schemaVersion: 1,
        started: true,
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    const result = await repository.getProgress({ uid: 'learner-01' });

    expect(result.data.courses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          courseId: 'course-classical-ml',
          progressPercent: 11,
          modules: expect.arrayContaining([
            expect.objectContaining({ moduleId: 'cml-m01-foundations', status: 'in-progress' }),
          ]),
          posts: expect.arrayContaining([
            expect.objectContaining({ postId: 'cml-p01-problem-data-types', started: true }),
          ]),
        }),
        expect.objectContaining({
          courseId: 'course-deep-learning-basic',
          progressPercent: 33,
          modules: expect.arrayContaining([
            expect.objectContaining({
              moduleId: 'dl-m01-neuron-perceptron',
              status: 'in-progress',
            }),
          ]),
          posts: expect.arrayContaining([
            expect.objectContaining({ postId: 'dl-p01-neuron-perceptron', started: true }),
          ]),
        }),
      ]),
    );
    expect(result.data.courses).toHaveLength(2);
  });

  it('reads progress from bounded stable release IDs instead of listing the owner collections', async () => {
    const { firestore } = createFakeFirestore(
      {
        'users/learner-01/enrollments/course-deep-learning-basic': {
          courseId: 'course-deep-learning-basic',
          progressPercent: 0,
          schemaVersion: 1,
          status: 'in-progress',
        },
      },
      { rejectListDocuments: true },
    );
    const repository = createFirestoreLearningRepository(firestore);

    const result = await repository.getProgress({ uid: 'learner-01' });

    expect(result.data.courses).toHaveLength(1);
    expect(result.data.courses[0]?.courseId).toBe('course-deep-learning-basic');
  });

  it('honors stored module completion state when rebuilding the course snapshot', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01/enrollments/course-deep-learning-basic': {
        courseId: 'course-deep-learning-basic',
        progressPercent: 0,
        schemaVersion: 1,
        status: 'in-progress',
      },
      'users/learner-01/moduleProgress/dl-m01-neuron-perceptron': {
        completedStepCount: 4,
        progressPercent: 100,
        requiredStepCount: 4,
        status: 'completed',
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    const result = await repository.getProgress({ uid: 'learner-01' });
    const course = result.data.courses.find(
      (candidate) => candidate.courseId === 'course-deep-learning-basic',
    );

    expect(course?.modules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          completedStepCount: 4,
          moduleId: 'dl-m01-neuron-perceptron',
          progressPercent: 100,
          status: 'completed',
        }),
      ]),
    );
  });

  it('does not expose revision-pinned content access documents in progress snapshots', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01/contentAccess/module_dl-m01-neuron-perceptron': {
        contentType: 'module',
        entityId: 'dl-m01-neuron-perceptron',
        publishedRevisionId: 'module-dl-m01-neuron-perceptron-rev-r1',
        schemaVersion: 1,
      },
      'users/learner-01/contentAccess/post_dl-p01-neuron-perceptron': {
        contentType: 'post',
        entityId: 'dl-p01-neuron-perceptron',
        revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        schemaVersion: 1,
      },
    });
    const repository = createFirestoreLearningRepository(firestore);

    const result = await repository.getProgress({ uid: 'learner-01' });

    expect(result.data.contentAccess).toEqual([]);
  });

  it('returns every catalog course with explicit missing module conditions', async () => {
    const { firestore } = createFakeFirestore();
    const repository = createFirestoreLearningRepository(firestore);

    const result = await repository.getProgress({ uid: 'learner-01' });
    const catalogCourse = result.data.courseCatalog?.find(
      (course) => course.courseId === 'course-deep-learning-basic',
    );
    const firstModule = catalogCourse?.modules[0];

    expect(result.data.courseCatalog).toHaveLength(getReleaseLearningCatalog().courses.length);
    expect(catalogCourse?.status).toBe('not-enrolled');
    expect(firstModule?.status).toBe('locked');
    expect(firstModule?.missingConditions).toEqual(
      expect.arrayContaining([
        'overview:dl-m01-neuron-perceptron',
        'post:dl-p01-neuron-perceptron',
        'demo:demo-perceptron-and-gate',
        'quiz:quiz-module-dl-m01',
      ]),
    );
  });
});
