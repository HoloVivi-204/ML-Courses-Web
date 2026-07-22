import { describe, expect, it } from 'vitest';

import { createFirestoreAdminReportRepository } from './admin-report-repository.js';

interface FakeDocumentSnapshot {
  data(): FirebaseFirestore.DocumentData | undefined;
}

interface FakeDocumentReference {
  get(): Promise<FakeDocumentSnapshot>;
  path: string;
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
        };
      },
    } as FirebaseFirestore.Firestore,
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
});
