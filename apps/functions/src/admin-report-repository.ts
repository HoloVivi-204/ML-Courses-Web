import { getFirestore, type Firestore } from 'firebase-admin/firestore';

import { getFirebaseAdminApp } from './firebase-admin-app.js';

const SUMMARY_METRIC_DOCUMENT_PATH = 'dailyMetrics/latest_global';

export interface AdminReportSummary {
  contentLifecycle: {
    draftCount: number;
    publishedCount: number;
    unpublishedCount: number;
    validationPendingCount: number;
  };
  generatedAt: string;
  learningVerified: {
    algorithmUnlocks: ReadonlyArray<{
      algorithmId: string;
      unlockedLearnerCount: number;
    }>;
    courseProgress: ReadonlyArray<{
      averageProgressPercent: number;
      completedCount: number;
      courseId: string;
      enrolledCount: number;
      startedCount: number;
    }>;
    learnerCount: number;
    moduleProgress: ReadonlyArray<{
      completedCount: number;
      completionRate: number;
      moduleId: string;
      startedCount: number;
    }>;
    postProgress: ReadonlyArray<{
      completedCount: number;
      completionRate: number;
      postId: string;
      startedCount: number;
    }>;
    quizSummary: {
      averageScorePercent: number;
      commonWrongQuestions: ReadonlyArray<{
        questionId: string;
        quizId: string;
        wrongCount: number;
      }>;
      passedAttemptCount: number;
      totalAttemptCount: number;
    };
    verificationLevel: 'server-verified';
  };
  playgroundClientReported: {
    errorRate: number;
    failedRunCount: number;
    runCount: number;
    scenarioActivity: ReadonlyArray<{
      algorithmId: string;
      failedRunCount: number;
      runCount: number;
      scenarioId: string;
    }>;
    verificationLevel: 'client-computed';
  };
}

export interface GetAdminReportSummaryInput {
  actorUid: string;
}

export interface AdminReportRepository {
  getSummary(input: GetAdminReportSummaryInput): Promise<{
    data: AdminReportSummary;
    statusCode: 200;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRecordField(record: Record<string, unknown>, field: string): Record<string, unknown> {
  const value = record[field];

  return isRecord(value) ? value : {};
}

function getArrayField(record: Record<string, unknown>, field: string): readonly unknown[] {
  const value = record[field];

  return Array.isArray(value) ? value : [];
}

function getStringField(record: Record<string, unknown>, field: string): string {
  const value = record[field];

  return typeof value === 'string' ? value : '';
}

function getNumberField(record: Record<string, unknown>, field: string): number {
  const value = record[field];

  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getTimestampIsoString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (
    isRecord(value) &&
    'toDate' in value &&
    typeof value.toDate === 'function' &&
    value.toDate.length === 0
  ) {
    const date = value.toDate() as unknown;

    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
  }

  return null;
}

function toCourseProgressSummary(
  value: unknown,
): AdminReportSummary['learningVerified']['courseProgress'][number] | null {
  if (!isRecord(value)) {
    return null;
  }

  const courseId = getStringField(value, 'courseId');

  if (!courseId) {
    return null;
  }

  return {
    courseId,
    enrolledCount: getNumberField(value, 'enrolledCount'),
    startedCount: getNumberField(value, 'startedCount'),
    completedCount: getNumberField(value, 'completedCount'),
    averageProgressPercent: getNumberField(value, 'averageProgressPercent'),
  };
}

function toModuleProgressSummary(
  value: unknown,
): AdminReportSummary['learningVerified']['moduleProgress'][number] | null {
  if (!isRecord(value)) {
    return null;
  }

  const moduleId = getStringField(value, 'moduleId');

  if (!moduleId) {
    return null;
  }

  return {
    moduleId,
    startedCount: getNumberField(value, 'startedCount'),
    completedCount: getNumberField(value, 'completedCount'),
    completionRate: getNumberField(value, 'completionRate'),
  };
}

function toPostProgressSummary(
  value: unknown,
): AdminReportSummary['learningVerified']['postProgress'][number] | null {
  if (!isRecord(value)) {
    return null;
  }

  const postId = getStringField(value, 'postId');

  if (!postId) {
    return null;
  }

  return {
    postId,
    startedCount: getNumberField(value, 'startedCount'),
    completedCount: getNumberField(value, 'completedCount'),
    completionRate: getNumberField(value, 'completionRate'),
  };
}

function toWrongQuestionSummary(
  value: unknown,
): AdminReportSummary['learningVerified']['quizSummary']['commonWrongQuestions'][number] | null {
  if (!isRecord(value)) {
    return null;
  }

  const quizId = getStringField(value, 'quizId');
  const questionId = getStringField(value, 'questionId');

  if (!quizId || !questionId) {
    return null;
  }

  return {
    quizId,
    questionId,
    wrongCount: getNumberField(value, 'wrongCount'),
  };
}

function toAlgorithmUnlockSummary(
  value: unknown,
): AdminReportSummary['learningVerified']['algorithmUnlocks'][number] | null {
  if (!isRecord(value)) {
    return null;
  }

  const algorithmId = getStringField(value, 'algorithmId');

  if (!algorithmId) {
    return null;
  }

  return {
    algorithmId,
    unlockedLearnerCount: getNumberField(value, 'unlockedLearnerCount'),
  };
}

function toScenarioActivitySummary(
  value: unknown,
): AdminReportSummary['playgroundClientReported']['scenarioActivity'][number] | null {
  if (!isRecord(value)) {
    return null;
  }

  const scenarioId = getStringField(value, 'scenarioId');
  const algorithmId = getStringField(value, 'algorithmId');

  if (!scenarioId || !algorithmId) {
    return null;
  }

  return {
    scenarioId,
    algorithmId,
    runCount: getNumberField(value, 'runCount'),
    failedRunCount: getNumberField(value, 'failedRunCount'),
  };
}

function filterPresent<TValue>(values: readonly (TValue | null)[]): TValue[] {
  return values.filter((value): value is TValue => value !== null);
}

function toAdminReportSummary(
  aggregateDocument: FirebaseFirestore.DocumentData | undefined,
): AdminReportSummary {
  const aggregate = aggregateDocument ?? {};
  const learningVerified = getRecordField(aggregate, 'learningVerified');
  const quizSummary = getRecordField(learningVerified, 'quizSummary');
  const playgroundClientReported = getRecordField(aggregate, 'playgroundClientReported');
  const contentLifecycle = getRecordField(aggregate, 'contentLifecycle');

  return {
    generatedAt: getTimestampIsoString(aggregate.generatedAt) ?? new Date().toISOString(),
    learningVerified: {
      verificationLevel: 'server-verified',
      learnerCount: getNumberField(learningVerified, 'learnerCount'),
      courseProgress: filterPresent(
        getArrayField(learningVerified, 'courseProgress').map(toCourseProgressSummary),
      ),
      moduleProgress: filterPresent(
        getArrayField(learningVerified, 'moduleProgress').map(toModuleProgressSummary),
      ),
      postProgress: filterPresent(
        getArrayField(learningVerified, 'postProgress').map(toPostProgressSummary),
      ),
      quizSummary: {
        averageScorePercent: getNumberField(quizSummary, 'averageScorePercent'),
        passedAttemptCount: getNumberField(quizSummary, 'passedAttemptCount'),
        totalAttemptCount: getNumberField(quizSummary, 'totalAttemptCount'),
        commonWrongQuestions: filterPresent(
          getArrayField(quizSummary, 'commonWrongQuestions').map(toWrongQuestionSummary),
        ),
      },
      algorithmUnlocks: filterPresent(
        getArrayField(learningVerified, 'algorithmUnlocks').map(toAlgorithmUnlockSummary),
      ),
    },
    playgroundClientReported: {
      verificationLevel: 'client-computed',
      runCount: getNumberField(playgroundClientReported, 'runCount'),
      failedRunCount: getNumberField(playgroundClientReported, 'failedRunCount'),
      errorRate: getNumberField(playgroundClientReported, 'errorRate'),
      scenarioActivity: filterPresent(
        getArrayField(playgroundClientReported, 'scenarioActivity').map(toScenarioActivitySummary),
      ),
    },
    contentLifecycle: {
      publishedCount: getNumberField(contentLifecycle, 'publishedCount'),
      draftCount: getNumberField(contentLifecycle, 'draftCount'),
      validationPendingCount: getNumberField(contentLifecycle, 'validationPendingCount'),
      unpublishedCount: getNumberField(contentLifecycle, 'unpublishedCount'),
    },
  };
}

export function createFirestoreAdminReportRepository(firestore: Firestore): AdminReportRepository {
  return {
    async getSummary() {
      const summarySnapshot = await firestore.doc(SUMMARY_METRIC_DOCUMENT_PATH).get();

      return {
        statusCode: 200 as const,
        data: toAdminReportSummary(summarySnapshot.data()),
      };
    },
  };
}

export function createDefaultAdminReportRepository(): AdminReportRepository {
  return createFirestoreAdminReportRepository(getFirestore(getFirebaseAdminApp()));
}
