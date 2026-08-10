import { describe, expect, it } from 'vitest';

import { createFirestoreAdminReportRepository } from './admin-report-repository.js';

interface FakeDocumentSnapshot {
  data(): FirebaseFirestore.DocumentData | undefined;
}

interface FakeDocumentReference {
  get(): Promise<FakeDocumentSnapshot>;
  path: string;
  set(data: Record<string, unknown>): Promise<void>;
}

interface FakeCollectionReference {
  get(): Promise<{ docs: Array<{ data(): Record<string, unknown> | undefined; id: string }> }>;
}

function createSnapshot(documentData: Record<string, unknown> | undefined): FakeDocumentSnapshot {
  return {
    data() {
      return documentData;
    },
  };
}

function createFakeFirestore(initialDocuments: Record<string, Record<string, unknown>> = {}) {
  const documents = new Map(Object.entries(initialDocuments));

  return {
    firestore: {
      doc(path: string): FakeDocumentReference {
        return {
          path,
          async get() {
            return createSnapshot(documents.get(path));
          },
          async set(data) {
            documents.set(path, data);
          },
        };
      },
      collection(path: string): FakeCollectionReference {
        const prefix = `${path}/`;

        return {
          async get() {
            return {
              docs: [...documents.entries()]
                .filter(([documentPath]) => {
                  const suffix = documentPath.slice(prefix.length);

                  return (
                    documentPath.startsWith(prefix) && suffix.length > 0 && !suffix.includes('/')
                  );
                })
                .map(([documentPath, data]) => ({
                  data: () => data,
                  id: documentPath.slice(prefix.length),
                })),
            };
          },
        };
      },
    } as unknown as FirebaseFirestore.Firestore,
  };
}

describe('admin report repository', () => {
  it('returns the daily aggregate summary without echoing PII or raw metric fields', async () => {
    const { firestore } = createFakeFirestore({
      'dailyMetrics/latest_global': {
        generatedAt: '2026-07-23T01:00:00.000Z',
        email: 'student@example.test',
        learningVerified: {
          verificationLevel: 'client-computed',
          learnerCount: 4,
          courseProgress: [
            {
              courseId: 'course-deep-learning-basic',
              enrolledCount: 3,
              startedCount: 2,
              completedCount: 1,
              completionRate: 1 / 3,
              averageProgressPercent: 42,
              email: 'nested@example.test',
            },
          ],
          moduleProgress: [
            {
              moduleId: 'dl-m01-neuron-perceptron',
              startedCount: 2,
              completedCount: 1,
              completionRate: 0.5,
            },
          ],
          postProgress: [
            {
              postId: 'dl-p01-neuron-perceptron',
              startedCount: 3,
              completedCount: 2,
              completionRate: 0.67,
            },
          ],
          quizSummary: {
            averageScorePercent: 81,
            passedAttemptCount: 5,
            passRate: 5 / 6,
            totalAttemptCount: 6,
            commonWrongQuestions: [
              {
                quizId: 'quiz-module-dl-m01',
                questionId: 'q-dl-m01-xor-limit',
                wrongCount: 3,
                rawAnswer: 'secret',
              },
            ],
          },
          algorithmUnlocks: [
            {
              algorithmId: 'perceptron',
              unlockedLearnerCount: 2,
            },
          ],
        },
        playgroundClientReported: {
          verificationLevel: 'server-verified',
          runCount: 9,
          failedRunCount: 1,
          errorRate: 0.11,
          scenarioActivity: [
            {
              scenarioId: 'pg-xor',
              algorithmId: 'perceptron',
              runCount: 9,
              failedRunCount: 1,
            },
          ],
        },
        contentLifecycle: {
          publishedCount: 8,
          draftCount: 1,
          validationPendingCount: 1,
          unpublishedCount: 0,
        },
      },
    });
    const repository = createFirestoreAdminReportRepository(firestore);

    const result = await repository.getSummary({ actorUid: 'admin-01' });

    expect(result.data).toEqual({
      generatedAt: '2026-07-23T01:00:00.000Z',
      learningVerified: {
        verificationLevel: 'server-verified',
        learnerCount: 4,
        courseProgress: [
          {
            courseId: 'course-deep-learning-basic',
            enrolledCount: 3,
            startedCount: 2,
            completedCount: 1,
            completionRate: 1 / 3,
            averageProgressPercent: 42,
          },
        ],
        moduleProgress: [
          {
            moduleId: 'dl-m01-neuron-perceptron',
            startedCount: 2,
            completedCount: 1,
            completionRate: 0.5,
          },
        ],
        postProgress: [
          {
            postId: 'dl-p01-neuron-perceptron',
            startedCount: 3,
            completedCount: 2,
            completionRate: 0.67,
          },
        ],
        quizSummary: {
          averageScorePercent: 81,
          passedAttemptCount: 5,
          passRate: 5 / 6,
          totalAttemptCount: 6,
          commonWrongQuestions: [
            {
              quizId: 'quiz-module-dl-m01',
              questionId: 'q-dl-m01-xor-limit',
              wrongCount: 3,
            },
          ],
        },
        algorithmUnlocks: [
          {
            algorithmId: 'perceptron',
            unlockedLearnerCount: 2,
          },
        ],
      },
      playgroundClientReported: {
        verificationLevel: 'client-computed',
        runCount: 9,
        failedRunCount: 1,
        errorRate: 0.11,
        scenarioActivity: [
          {
            scenarioId: 'pg-xor',
            algorithmId: 'perceptron',
            runCount: 9,
            failedRunCount: 1,
          },
        ],
      },
      contentLifecycle: {
        publishedCount: 8,
        draftCount: 1,
        validationPendingCount: 1,
        unpublishedCount: 0,
      },
    });
    expect(JSON.stringify(result.data)).not.toMatch(/email|@example|rawAnswer|secret/i);
  });

  it('returns a zero-safe summary when no aggregate document exists yet', async () => {
    const { firestore } = createFakeFirestore();
    const repository = createFirestoreAdminReportRepository(firestore);

    const result = await repository.getSummary({ actorUid: 'admin-01' });

    expect(result.data.learningVerified).toMatchObject({
      verificationLevel: 'server-verified',
      learnerCount: 0,
      courseProgress: [],
    });
    expect(result.data.playgroundClientReported).toMatchObject({
      verificationLevel: 'client-computed',
      runCount: 0,
      scenarioActivity: [],
    });
    expect(result.data.contentLifecycle).toEqual({
      publishedCount: 0,
      draftCount: 0,
      validationPendingCount: 0,
      unpublishedCount: 0,
    });
  });

  it('aggregates empty, small, and multiple learner state from emulator documents', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01': {
        email: 'learner-01@example.test',
        status: 'active',
      },
      'users/learner-01/algorithmUnlocks/perceptron': {
        algorithmId: 'perceptron',
      },
      'users/learner-01/enrollments/course-deep-learning-basic': {
        progressPercent: 100,
        status: 'completed',
      },
      'users/learner-01/moduleCompletions/dl-m01-neuron-perceptron': {
        status: 'completed',
      },
      'users/learner-01/moduleProgress/dl-m01-neuron-perceptron': {
        completedStepCount: 4,
        progressPercent: 100,
        requiredStepCount: 4,
        status: 'completed',
      },
      'users/learner-01/postCompletions/dl-p01-neuron-perceptron': {
        status: 'completed',
      },
      'users/learner-01/quizProgress/quiz-module-dl-m01': {
        attemptCount: 2,
        bestScore: 100,
        passed: true,
        wrongCounts: { 'q-dl-m01-xor-limit': 2 },
      },
      'users/learner-01/quizProgress/quiz-post-dl-p01': {
        attemptCount: 1,
        bestScore: 80,
        passed: false,
      },
      'users/learner-01/playgroundRuns/run-01': {
        algorithmId: 'perceptron',
        runId: 'run-01',
        scenarioId: 'pg-xor',
        verificationLevel: 'client-computed',
      },
      'users/learner-02': {
        status: 'active',
      },
      'users/learner-02/enrollments/course-classical-ml': {
        progressPercent: 20,
        status: 'in-progress',
      },
      'adminContentEntities/course:published': {
        currentContent: { status: 'published', validationStatus: 'valid' },
        draftRevisionId: null,
      },
      'adminContentEntities/post:unpublished': {
        currentContent: { status: 'unpublished', validationStatus: 'not-run' },
        draftRevisionId: 'draft-post-unpublished',
      },
    });
    const repository = createFirestoreAdminReportRepository(firestore, {
      aggregateOnRead: true,
      now: () => new Date('2026-07-23T02:00:00.000Z'),
    });

    const result = await repository.getSummary({ actorUid: 'admin-01' });

    expect(result.data).toMatchObject({
      generatedAt: '2026-07-23T02:00:00.000Z',
      learningVerified: {
        learnerCount: 2,
        courseProgress: [
          {
            averageProgressPercent: 20,
            completedCount: 0,
            completionRate: 0,
            courseId: 'course-classical-ml',
            enrolledCount: 1,
            startedCount: 1,
          },
          {
            averageProgressPercent: 100,
            completedCount: 1,
            completionRate: 1,
            courseId: 'course-deep-learning-basic',
            enrolledCount: 1,
            startedCount: 1,
          },
        ],
        moduleProgress: expect.arrayContaining([
          expect.objectContaining({
            completedCount: 1,
            completionRate: 1,
            moduleId: 'dl-m01-neuron-perceptron',
            startedCount: 1,
          }),
        ]),
        postProgress: expect.arrayContaining([
          expect.objectContaining({
            completedCount: 1,
            completionRate: 1,
            postId: 'dl-p01-neuron-perceptron',
            startedCount: 1,
          }),
        ]),
        quizSummary: {
          averageScorePercent: 90,
          commonWrongQuestions: [
            { questionId: 'q-dl-m01-xor-limit', quizId: 'quiz-module-dl-m01', wrongCount: 2 },
          ],
          passedAttemptCount: 1,
          passRate: 1 / 3,
          totalAttemptCount: 3,
        },
      },
      playgroundClientReported: {
        errorRate: 0,
        failedRunCount: 0,
        runCount: 1,
        scenarioActivity: expect.arrayContaining([
          { algorithmId: 'perceptron', failedRunCount: 0, runCount: 1, scenarioId: 'pg-xor' },
        ]),
      },
      contentLifecycle: {
        draftCount: 1,
        publishedCount: 1,
        unpublishedCount: 1,
        validationPendingCount: 1,
      },
    });
    expect(JSON.stringify(result.data)).not.toMatch(/email|@example|answers|rawAnswer/i);
  });

  it('derives course, quiz, and playground rates from learner state and learning events', async () => {
    const { firestore } = createFakeFirestore({
      'users/learner-01': { status: 'active' },
      'users/learner-01/enrollments/course-deep-learning-basic': {
        progressPercent: 100,
        status: 'completed',
      },
      'users/learner-01/quizProgress/quiz-module-dl-m01': {
        attemptCount: 2,
        bestScore: 100,
        passed: true,
      },
      'users/learner-01/playgroundRuns/run-success': {
        algorithmId: 'perceptron',
        runId: 'run-success',
        scenarioId: 'pg-xor',
        verificationLevel: 'client-computed',
      },
      'users/learner-02': { status: 'active' },
      'users/learner-02/enrollments/course-deep-learning-basic': {
        progressPercent: 25,
        status: 'in-progress',
      },
      'users/learner-02/quizProgress/quiz-module-dl-m01': {
        attemptCount: 1,
        bestScore: 40,
        passed: false,
      },
      'learningEvents/playground-failure-01': {
        eventType: 'playground_run_failed',
        payload: {
          algorithmId: 'perceptron',
          normalizedErrorCode: 'PLAYGROUND_RUN_FAILED',
          runId: 'run-failed',
          scenarioId: 'pg-xor',
        },
        verificationLevel: 'client-computed',
      },
    });
    const repository = createFirestoreAdminReportRepository(firestore, {
      aggregateOnRead: true,
      now: () => new Date('2026-07-23T03:00:00.000Z'),
    });

    const result = await repository.getSummary({ actorUid: 'admin-01' });

    expect(result.data.learningVerified.courseProgress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          completedCount: 1,
          completionRate: 0.5,
          courseId: 'course-deep-learning-basic',
          enrolledCount: 2,
        }),
      ]),
    );
    expect(result.data.learningVerified.quizSummary).toMatchObject({
      passRate: 1 / 3,
      passedAttemptCount: 1,
      totalAttemptCount: 3,
    });
    expect(result.data.playgroundClientReported).toMatchObject({
      errorRate: 0.5,
      failedRunCount: 1,
      runCount: 2,
    });
    expect(result.data.playgroundClientReported.scenarioActivity).toEqual(
      expect.arrayContaining([
        {
          algorithmId: 'perceptron',
          failedRunCount: 1,
          runCount: 2,
          scenarioId: 'pg-xor',
        },
      ]),
    );
  });
});
