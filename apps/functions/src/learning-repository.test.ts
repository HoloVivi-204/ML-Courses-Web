import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';

import { createFirestoreLearningRepository } from './learning-repository.js';

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
      return {
        path,
        async get() {
          return createSnapshot(documents.get(path));
        },
      };
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

function expectStableContentAccessGrant(data: Record<string, unknown> | undefined) {
  expect(data).toBeDefined();

  for (const fieldName of revisionPinFieldNames) {
    expect(data).not.toHaveProperty(fieldName);
  }
}

describe('Firestore learning repository', () => {
  it('bootstraps a learner profile idempotently without storing email fields', async () => {
    const { documents, firestore } = createFakeFirestore();
    const repository = createFirestoreLearningRepository(firestore);

    const firstResult = await repository.bootstrapLearner({
      uid: 'learner-01',
      displayName: '  Local Student  ',
    });
    const retryResult = await repository.bootstrapLearner({
      uid: 'learner-01',
      displayName: 'Changed Name',
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

  it('enrolls a learner idempotently and grants stable first module access', async () => {
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
          postId: 'dl-p01-neuron-perceptron',
        },
        nextPath: '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
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
    ).toMatchObject({
      schemaVersion: 1,
      contentType: 'post',
      entityId: 'dl-p01-neuron-perceptron',
      reason: 'course-enrollment',
      sourceProgressId: 'enrollments/course-deep-learning-basic',
    });
    expectStableContentAccessGrant(
      documents.get('users/learner-01/contentAccess/post_dl-p01-neuron-perceptron'),
    );
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

    const result = await repository.submitQuizAttempt({
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
    });

    expect(result.data).toMatchObject({
      passed: true,
      score: 100,
      newlyUnlocked: [{ id: 'perceptron', type: 'algorithm' }],
    });
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
    ).toMatchObject({
      contentType: 'post',
      entityId: 'dl-p02-mlp-forward-activation',
      reason: 'module-completed',
    });
    expectStableContentAccessGrant(
      documents.get('users/learner-01/contentAccess/post_dl-p02-mlp-forward-activation'),
    );
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
        completedStepCount: 3,
        moduleId: 'dl-m01-neuron-perceptron',
        progressPercent: 100,
        requiredStepCount: 3,
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
});
