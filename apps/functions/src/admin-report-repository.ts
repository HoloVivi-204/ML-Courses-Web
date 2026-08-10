import { FieldPath, getFirestore, type Firestore, type Query } from 'firebase-admin/firestore';

import { getFirebaseAdminApp } from './firebase-admin-app.js';
import {
  getReleaseLearningCatalog,
  type ReleaseLearningCourse,
  type ReleaseLearningModule,
} from './release-learning-catalog.js';
import { getSubmissionPlaygroundPairManifests } from './playground-manifest.js';

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
      completionRate: number;
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
      passRate: number;
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

export interface FirestoreAdminReportRepositoryOptions {
  aggregateOnRead?: boolean | undefined;
  now?: (() => Date) | undefined;
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
    completionRate: getNumberField(value, 'completionRate'),
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

interface ReportDocument {
  data: Record<string, unknown>;
  id: string;
}

const REPORT_QUERY_PAGE_SIZE = 100;

function toReportDocuments(
  documents: readonly { data(): unknown; id: string }[],
): ReportDocument[] {
  return filterPresent(
    documents.map((document) => {
      const data = document.data();

      return isRecord(data) ? { data, id: document.id } : null;
    }),
  );
}

async function readCollectionDocuments(
  firestore: Firestore,
  collectionPath: string,
): Promise<ReportDocument[]> {
  const collection = firestore.collection(collectionPath);
  const collectionWithPaging = collection as unknown as {
    limit?: (limit: number) => Query;
    orderBy?: (fieldPath: unknown, direction?: 'asc' | 'desc') => Query;
  };

  if (
    typeof collectionWithPaging.limit !== 'function' ||
    typeof collectionWithPaging.orderBy !== 'function'
  ) {
    const snapshot = await collection.get();

    return toReportDocuments(snapshot.docs);
  }

  const orderedCollection = collectionWithPaging.orderBy(FieldPath.documentId(), 'asc');
  const documents: ReportDocument[] = [];
  let query: Query = orderedCollection.limit(REPORT_QUERY_PAGE_SIZE);
  let lastDocumentId: string | null = null;

  while (true) {
    const snapshot = await query.get();
    documents.push(...toReportDocuments(snapshot.docs));

    if (snapshot.docs.length < REPORT_QUERY_PAGE_SIZE) {
      return documents;
    }

    const lastDocument = snapshot.docs.at(-1);

    if (!lastDocument || lastDocument.id === lastDocumentId) {
      return documents;
    }

    lastDocumentId = lastDocument.id;
    query = orderedCollection.startAfter(lastDocument.id).limit(REPORT_QUERY_PAGE_SIZE);
  }
}

interface LearnerReportState {
  algorithmUnlocks: ReadonlyMap<string, Record<string, unknown>>;
  demoCompletions: ReadonlySet<string>;
  demoViews: ReadonlyMap<string, Record<string, unknown>>;
  enrollments: ReadonlyMap<string, Record<string, unknown>>;
  moduleCompletions: ReadonlyMap<string, Record<string, unknown>>;
  moduleProgress: ReadonlyMap<string, Record<string, unknown>>;
  postCompletions: ReadonlySet<string>;
  postViews: ReadonlyMap<string, Record<string, unknown>>;
  playgroundRuns: readonly ReportDocument[];
  quizProgress: ReadonlyMap<string, Record<string, unknown>>;
}

function getBooleanField(record: Record<string, unknown> | undefined, field: string): boolean {
  return record?.[field] === true;
}

function getFiniteNumberField(
  record: Record<string, unknown> | undefined,
  field: string,
): number | null {
  const value = record?.[field];

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getRecordMap(documents: readonly ReportDocument[]): Map<string, Record<string, unknown>> {
  return new Map(documents.map((document) => [document.id, document.data]));
}

function getIdSet(documents: readonly ReportDocument[]): Set<string> {
  return new Set(documents.map((document) => document.id));
}

async function readKnownLearnerDocuments(
  firestore: Firestore,
  uid: string,
  collectionName: string,
  documentIds: readonly string[],
): Promise<ReportDocument[]> {
  const documents = await Promise.all(
    documentIds.map(async (documentId) => {
      const snapshot = await firestore.doc(`users/${uid}/${collectionName}/${documentId}`).get();
      const data = snapshot.data();

      return isRecord(data) ? { data, id: documentId } : null;
    }),
  );

  return filterPresent(documents);
}

async function readLearnerCollection(
  firestore: Firestore,
  uid: string,
  collectionName: string,
): Promise<ReportDocument[]> {
  return readCollectionDocuments(firestore, `users/${uid}/${collectionName}`);
}

async function readLearnerReportState(
  firestore: Firestore,
  uid: string,
  catalog: ReturnType<typeof getReleaseLearningCatalog>,
): Promise<LearnerReportState> {
  const modules = catalog.courses.flatMap((course) => course.modules);
  const posts = modules.flatMap((module) => module.posts);
  const demos = modules.flatMap((module) => (module.demoId ? [module.demoId] : []));
  const quizIds = modules.flatMap((module) => [
    module.moduleQuizId,
    ...module.posts.map((post) => post.postQuizId),
  ]);
  const algorithmIds = [...new Set(modules.flatMap((module) => module.unlockAlgorithmIds))];

  const [
    algorithmUnlocks,
    demoCompletions,
    demoViews,
    enrollments,
    moduleCompletions,
    moduleProgress,
    postCompletions,
    postViews,
    playgroundRuns,
    quizProgress,
  ] = await Promise.all([
    readKnownLearnerDocuments(firestore, uid, 'algorithmUnlocks', algorithmIds),
    readKnownLearnerDocuments(firestore, uid, 'demoCompletions', demos),
    readKnownLearnerDocuments(firestore, uid, 'demoViews', demos),
    readKnownLearnerDocuments(
      firestore,
      uid,
      'enrollments',
      catalog.courses.map((course) => course.courseId),
    ),
    readKnownLearnerDocuments(
      firestore,
      uid,
      'moduleCompletions',
      modules.map((module) => module.moduleId),
    ),
    readKnownLearnerDocuments(
      firestore,
      uid,
      'moduleProgress',
      modules.map((module) => module.moduleId),
    ),
    readKnownLearnerDocuments(
      firestore,
      uid,
      'postCompletions',
      posts.map((post) => post.postId),
    ),
    readKnownLearnerDocuments(
      firestore,
      uid,
      'postViews',
      posts.map((post) => post.postId),
    ),
    readLearnerCollection(firestore, uid, 'playgroundRuns'),
    readKnownLearnerDocuments(firestore, uid, 'quizProgress', [...new Set(quizIds)]),
  ]);

  return {
    algorithmUnlocks: getRecordMap(algorithmUnlocks),
    demoCompletions: getIdSet(demoCompletions),
    demoViews: getRecordMap(demoViews),
    enrollments: getRecordMap(enrollments),
    moduleCompletions: getRecordMap(moduleCompletions),
    moduleProgress: getRecordMap(moduleProgress),
    postCompletions: getIdSet(postCompletions),
    postViews: getRecordMap(postViews),
    playgroundRuns,
    quizProgress: getRecordMap(quizProgress),
  };
}

function isModuleStarted(module: ReleaseLearningModule, state: LearnerReportState): boolean {
  return (
    state.moduleProgress.has(module.moduleId) ||
    state.moduleCompletions.has(module.moduleId) ||
    state.quizProgress.has(module.moduleQuizId) ||
    module.posts.some(
      (post) =>
        state.postViews.has(post.postId) ||
        state.postCompletions.has(post.postId) ||
        state.quizProgress.has(post.postQuizId),
    ) ||
    (module.demoId !== null &&
      (state.demoCompletions.has(module.demoId) || state.demoViews.has(module.demoId)))
  );
}

function isPostCompleted(postId: string, postQuizId: string, state: LearnerReportState): boolean {
  return (
    state.postCompletions.has(postId) ||
    getBooleanField(state.quizProgress.get(postQuizId), 'passed')
  );
}

function isModuleCompleted(module: ReleaseLearningModule, state: LearnerReportState): boolean {
  const moduleProgress = state.moduleProgress.get(module.moduleId);
  const requiredStepCount =
    getFiniteNumberField(moduleProgress, 'requiredStepCount') ??
    module.posts.length + (module.demoId ? 1 : 0) + 2;
  const completedStepCount = getFiniteNumberField(moduleProgress, 'completedStepCount') ?? 0;
  const allPostsCompleted = module.posts.every((post) =>
    isPostCompleted(post.postId, post.postQuizId, state),
  );
  const demoCompleted = module.demoId === null || state.demoCompletions.has(module.demoId);
  const moduleQuizPassed = getBooleanField(state.quizProgress.get(module.moduleQuizId), 'passed');

  return (
    state.moduleCompletions.get(module.moduleId)?.status === 'completed' ||
    moduleProgress?.status === 'completed' ||
    completedStepCount >= requiredStepCount ||
    (allPostsCompleted && demoCompleted && moduleQuizPassed)
  );
}

function getCourseProgressPercent(
  course: ReleaseLearningCourse,
  state: LearnerReportState,
): number {
  const storedProgress = getFiniteNumberField(
    state.enrollments.get(course.courseId),
    'progressPercent',
  );
  const completedModuleCount = course.modules.filter((module) =>
    isModuleCompleted(module, state),
  ).length;

  const computedProgress =
    course.modules.length === 0
      ? 0
      : Math.round((completedModuleCount / course.modules.length) * 100);

  return Math.max(storedProgress ?? 0, computedProgress);
}

function createFirestoreReportAggregate(input: {
  contentEntities: readonly ReportDocument[];
  learningEvents: readonly ReportDocument[];
  learnerStates: readonly LearnerReportState[];
  now: () => Date;
}): Record<string, unknown> {
  const catalog = getReleaseLearningCatalog();
  const modules = catalog.courses.flatMap((course) => course.modules);
  const posts = modules.flatMap((module) => module.posts);
  const activeLearnerCount = input.learnerStates.length;
  const courseProgress = catalog.courses.map((course) => {
    const enrolledStates = input.learnerStates.filter((state) =>
      state.enrollments.has(course.courseId),
    );
    const startedStates = input.learnerStates.filter(
      (state) =>
        state.enrollments.has(course.courseId) ||
        course.modules.some((module) => isModuleStarted(module, state)),
    );
    const completedStates = enrolledStates.filter(
      (state) =>
        state.enrollments.get(course.courseId)?.status === 'completed' ||
        (course.modules.length > 0 &&
          course.modules.every((module) => isModuleCompleted(module, state))),
    );
    const progressValues = enrolledStates.map((state) => getCourseProgressPercent(course, state));

    return {
      averageProgressPercent:
        progressValues.length > 0
          ? Math.round(
              progressValues.reduce((total, value) => total + value, 0) / progressValues.length,
            )
          : 0,
      completedCount: completedStates.length,
      completionRate:
        enrolledStates.length > 0 ? completedStates.length / enrolledStates.length : 0,
      courseId: course.courseId,
      enrolledCount: enrolledStates.length,
      startedCount: startedStates.length,
    };
  });
  const moduleProgress = modules.map((module) => {
    const startedCount = input.learnerStates.filter((state) =>
      isModuleStarted(module, state),
    ).length;
    const completedCount = input.learnerStates.filter((state) =>
      isModuleCompleted(module, state),
    ).length;

    return {
      completedCount,
      completionRate: startedCount > 0 ? completedCount / startedCount : 0,
      moduleId: module.moduleId,
      startedCount,
    };
  });
  const postProgress = posts.map((post) => {
    const module = modules.find((candidate) =>
      candidate.posts.some((candidatePost) => candidatePost.postId === post.postId),
    );
    const startedCount = input.learnerStates.filter(
      (state) =>
        state.postViews.has(post.postId) ||
        state.postCompletions.has(post.postId) ||
        state.quizProgress.has(post.postQuizId),
    ).length;
    const completedCount = input.learnerStates.filter((state) =>
      isPostCompleted(post.postId, post.postQuizId, state),
    ).length;

    return {
      completedCount,
      completionRate: startedCount > 0 ? completedCount / startedCount : 0,
      postId: post.postId,
      startedCount,
      moduleId: module?.moduleId ?? '',
    };
  });

  const quizEntries = input.learnerStates.flatMap((state) =>
    [...state.quizProgress.entries()].map(([quizId, data]) => ({ data, quizId })),
  );
  const wrongCounts = new Map<string, { quizId: string; questionId: string; wrongCount: number }>();

  for (const { data, quizId } of quizEntries) {
    const storedWrongCounts = isRecord(data.wrongCounts) ? data.wrongCounts : {};

    for (const [questionId, wrongCount] of Object.entries(storedWrongCounts)) {
      if (typeof wrongCount !== 'number' || !Number.isFinite(wrongCount) || wrongCount <= 0) {
        continue;
      }

      const key = `${quizId}:${questionId}`;
      const current = wrongCounts.get(key);
      wrongCounts.set(key, {
        questionId,
        quizId,
        wrongCount: (current?.wrongCount ?? 0) + Math.floor(wrongCount),
      });
    }
  }

  const scoreEntries = quizEntries
    .map(({ data }) => getFiniteNumberField(data, 'bestScore'))
    .filter((score): score is number => score !== null);
  const storedTotalAttemptCount = quizEntries.reduce(
    (total, { data }) => total + (getFiniteNumberField(data, 'attemptCount') ?? 0),
    0,
  );
  const storedPassedAttemptCount = quizEntries.filter(({ data }) =>
    getBooleanField(data, 'passed'),
  ).length;
  const quizSubmissionEvents = input.learningEvents.filter(
    (event) =>
      event.data.verificationLevel === 'server-verified' &&
      (event.data.eventType === 'module_quiz_submitted' ||
        event.data.eventType === 'post_quiz_submitted'),
  );
  const totalAttemptCount =
    quizSubmissionEvents.length > 0 ? quizSubmissionEvents.length : storedTotalAttemptCount;
  const passedAttemptCount =
    quizSubmissionEvents.length > 0
      ? quizSubmissionEvents.filter((event) =>
          getBooleanField(getRecordField(event.data, 'payload'), 'passed'),
        ).length
      : storedPassedAttemptCount;
  const algorithmUnlocks = [...new Set(modules.flatMap((module) => module.unlockAlgorithmIds))]
    .map((algorithmId) => ({
      algorithmId,
      unlockedLearnerCount: input.learnerStates.filter((state) =>
        state.algorithmUnlocks.has(algorithmId),
      ).length,
    }))
    .filter((item) => item.unlockedLearnerCount > 0);
  const scenarioActivityMap = new Map<
    string,
    { algorithmId: string; failedRunCount: number; runCount: number; scenarioId: string }
  >();

  for (const manifest of getSubmissionPlaygroundPairManifests()) {
    scenarioActivityMap.set(`${manifest.scenarioId}:${manifest.algorithmId}`, {
      algorithmId: manifest.algorithmId,
      failedRunCount: 0,
      runCount: 0,
      scenarioId: manifest.scenarioId,
    });
  }

  for (const state of input.learnerStates) {
    for (const run of state.playgroundRuns) {
      if (
        run.data.verificationLevel !== 'client-computed' ||
        typeof run.data.scenarioId !== 'string' ||
        typeof run.data.algorithmId !== 'string'
      ) {
        continue;
      }

      const key = `${run.data.scenarioId}:${run.data.algorithmId}`;
      const current = scenarioActivityMap.get(key);

      if (!current) {
        continue;
      }

      current.runCount += 1;
      scenarioActivityMap.set(key, current);
    }
  }

  for (const event of input.learningEvents) {
    if (
      event.data.eventType !== 'playground_run_failed' ||
      event.data.verificationLevel !== 'client-computed'
    ) {
      continue;
    }

    const payload = getRecordField(event.data, 'payload');
    const scenarioId = getStringField(payload, 'scenarioId');
    const algorithmId = getStringField(payload, 'algorithmId');
    const current = scenarioActivityMap.get(`${scenarioId}:${algorithmId}`);

    if (!current) {
      continue;
    }

    current.failedRunCount += 1;
    current.runCount += 1;
  }

  const runCount = [...scenarioActivityMap.values()].reduce(
    (total, item) => total + item.runCount,
    0,
  );
  const failedRunCount = [...scenarioActivityMap.values()].reduce(
    (total, item) => total + item.failedRunCount,
    0,
  );

  const contentLifecycle = input.contentEntities.reduce(
    (counts, document) => {
      const currentContent = getRecordField(document.data, 'currentContent');
      const status = getStringField(currentContent, 'status');
      const validationStatus = getStringField(currentContent, 'validationStatus');

      if (status === 'published') {
        counts.publishedCount += 1;
      } else if (status === 'unpublished') {
        counts.unpublishedCount += 1;
      }

      if (typeof document.data.draftRevisionId === 'string' && document.data.draftRevisionId) {
        counts.draftCount += 1;
      }

      if (validationStatus === 'not-run') {
        counts.validationPendingCount += 1;
      }

      return counts;
    },
    { draftCount: 0, publishedCount: 0, unpublishedCount: 0, validationPendingCount: 0 },
  );

  return {
    contentLifecycle,
    generatedAt: input.now().toISOString(),
    learningVerified: {
      algorithmUnlocks,
      courseProgress,
      learnerCount: activeLearnerCount,
      moduleProgress,
      postProgress,
      quizSummary: {
        averageScorePercent:
          scoreEntries.length > 0
            ? Math.round(
                scoreEntries.reduce((total, score) => total + score, 0) / scoreEntries.length,
              )
            : 0,
        commonWrongQuestions: [...wrongCounts.values()]
          .sort(
            (left, right) =>
              right.wrongCount - left.wrongCount ||
              left.quizId.localeCompare(right.quizId) ||
              left.questionId.localeCompare(right.questionId),
          )
          .slice(0, 20),
        passedAttemptCount,
        passRate: totalAttemptCount > 0 ? passedAttemptCount / totalAttemptCount : 0,
        totalAttemptCount,
      },
      verificationLevel: 'server-verified',
    },
    playgroundClientReported: {
      errorRate: runCount > 0 ? failedRunCount / runCount : 0,
      failedRunCount,
      runCount,
      scenarioActivity: [...scenarioActivityMap.values()].sort(
        (left, right) =>
          left.scenarioId.localeCompare(right.scenarioId) ||
          left.algorithmId.localeCompare(right.algorithmId),
      ),
      verificationLevel: 'client-computed',
    },
  };
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
        passRate: getNumberField(quizSummary, 'passRate'),
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

export function createFirestoreAdminReportRepository(
  firestore: Firestore,
  options: FirestoreAdminReportRepositoryOptions = {},
): AdminReportRepository {
  const now = options.now ?? (() => new Date());

  return {
    async getSummary() {
      if (options.aggregateOnRead === true) {
        const summary = await runLocalAnalyticsAggregation(firestore, { now });

        return {
          statusCode: 200 as const,
          data: summary,
        };
      }

      const summarySnapshot = await firestore.doc(SUMMARY_METRIC_DOCUMENT_PATH).get();

      return {
        statusCode: 200 as const,
        data: toAdminReportSummary(summarySnapshot.data()),
      };
    },
  };
}

export async function runLocalAnalyticsAggregation(
  firestore: Firestore,
  options: { now?: (() => Date) | undefined } = {},
): Promise<AdminReportSummary> {
  const now = options.now ?? (() => new Date());
  const [userDocuments, contentEntities, learningEvents] = await Promise.all([
    readCollectionDocuments(firestore, 'users'),
    readCollectionDocuments(firestore, 'adminContentEntities'),
    readCollectionDocuments(firestore, 'learningEvents'),
  ]);
  const catalog = getReleaseLearningCatalog();
  const learnerStates = await Promise.all(
    userDocuments.flatMap((document) => {
      if (document.data.status === 'anonymized' || document.data.status === 'deletion-pending') {
        return [];
      }

      return [readLearnerReportState(firestore, document.id, catalog)];
    }),
  );
  const aggregate = createFirestoreReportAggregate({
    contentEntities,
    learningEvents,
    learnerStates,
    now,
  });

  await firestore.doc(SUMMARY_METRIC_DOCUMENT_PATH).set(aggregate);

  return toAdminReportSummary(aggregate);
}

export function createDefaultAdminReportRepository(): AdminReportRepository {
  return createFirestoreAdminReportRepository(getFirestore(getFirebaseAdminApp()));
}
