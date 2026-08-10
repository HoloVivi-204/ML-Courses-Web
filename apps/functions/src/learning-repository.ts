import { randomUUID } from 'node:crypto';

import {
  FieldValue,
  getFirestore,
  Timestamp,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';

import { ApiError } from './api-error.js';
import { getDemoCompletionSeed } from './demo-manifest.js';
import { getFirebaseAdminApp } from './firebase-admin-app.js';
import { createLearningLearnerHash } from './learning-events.js';
import { setLearningEventInTransaction } from './learning-event-repository.js';
import {
  createFirestoreLearningContentAuthority,
  type LearningContentAuthority,
  type LearningContentEntityType,
} from './learning-content-authority.js';
import { getPostViewManifest } from './post-view-manifest.js';
import { getSubmissionPlaygroundPairManifests } from './playground-manifest.js';
import {
  createQuizAttemptPayload,
  getQuizManifest,
  gradeQuizSubmission,
  type QuizAnswer,
  type StoredQuestionWrongCounts,
} from './quiz-manifest.js';
import {
  getNextReleaseModule,
  getReleaseCourse,
  getReleaseLearningCatalog,
  getReleaseModule,
  getReleaseModuleByQuizId,
  getReleasePost,
  type ReleaseLearningCourse,
  type ReleaseLearningModule,
} from './release-learning-catalog.js';

export type LearnerLocalePreference = 'en' | 'vi';
export type LearnerThemePreference = 'dark' | 'light' | 'system';
export type LearnerAccountStatus = 'active' | 'anonymized' | 'deletion-pending';

export interface BootstrapLearnerInput {
  authTime?: number | undefined;
  displayName: string;
  locale?: LearnerLocalePreference | undefined;
  provider?: string | undefined;
  theme?: LearnerThemePreference | undefined;
  uid: string;
}

export interface BeginLearnerAccountDeletionInput {
  displayName: string;
  uid: string;
}

export interface LearnerAccountDeletionState {
  avatarUrl: string | null;
  status: LearnerAccountStatus;
}

export interface EnrollLearnerInput {
  courseId: string;
  displayName: string;
  idempotencyKey: string;
  uid: string;
}

export interface CompleteDemoInput {
  demoId: string;
  idempotencyKey: string;
  moduleId: string;
  requiredStepIds: readonly string[];
  uid: string;
  viewedStepIds: readonly string[];
}

export interface CompletePostInput {
  idempotencyKey: string;
  postId: string;
  uid: string;
}

export interface RecordDemoViewInput {
  demoId: string;
  uid: string;
  viewedStepIds: readonly string[];
}

export interface RecordModuleOverviewInput {
  moduleId: string;
  uid: string;
}

export interface RecordPostViewInput {
  postId: string;
  readingPosition: string;
  uid: string;
  viewedItemIds: readonly string[];
}

export interface CreateQuizAttemptInput {
  quizId: string;
  uid: string;
}

export interface GetProgressInput {
  uid: string;
}

export interface DeleteLearnerAccountInput {
  uid: string;
}

export interface SubmitQuizAttemptInput {
  answers: readonly QuizAnswer[];
  attemptId: string;
  idempotencyKey: string;
  uid: string;
}

export interface UpdateLearnerPreferencesInput {
  displayName: string;
  locale?: LearnerLocalePreference | undefined;
  theme?: LearnerThemePreference | undefined;
  uid: string;
}

export interface LearningModuleProgress {
  completedStepCount: number;
  missingConditions?: readonly string[];
  moduleId: string;
  overviewViewed: boolean;
  progressPercent: number;
  requiredStepCount: number;
  status: 'completed' | 'in-progress' | 'locked';
}

export interface LearningPostProgress {
  bestScore: number;
  completed: boolean;
  contentViewed: boolean;
  postId: string;
  quizId: string;
  quizPassed: boolean;
  readingPosition: string | null;
  started: boolean;
  viewedItemIds: readonly string[];
}

export interface LearningQuizProgress {
  attemptCount: number;
  bestScore: number;
  passed: boolean;
  quizId: string;
  quizKind: 'module' | 'post';
}

export interface LearningDemoProgress {
  completed: boolean;
  demoId: string;
  started: boolean;
}

export interface LearningCourseProgress {
  courseId: string;
  demos: ReadonlyArray<LearningDemoProgress>;
  modules: ReadonlyArray<LearningModuleProgress>;
  posts: ReadonlyArray<LearningPostProgress>;
  progressPercent: number;
  quizzes: ReadonlyArray<LearningQuizProgress>;
  status: 'completed' | 'in-progress' | 'not-enrolled';
}

export interface LearningPlaygroundActivity {
  algorithmId: string;
  failedRunCount: number;
  runCount: number;
  scenarioId: string;
}

export interface LearningProgressSnapshot {
  courseCatalog?: ReadonlyArray<LearningCourseProgress>;
  courses: ReadonlyArray<LearningCourseProgress>;
  algorithmUnlocks: ReadonlyArray<{
    algorithmId: string;
    moduleId: string;
  }>;
  contentAccess: ReadonlyArray<{
    contentType: 'demo' | 'module' | 'post';
    entityId: string;
  }>;
  demos: ReadonlyArray<LearningDemoProgress>;
  enrollment: {
    courseId: string;
    progressPercent: number;
    status: 'completed' | 'in-progress' | 'not-enrolled';
  };
  modules: ReadonlyArray<LearningModuleProgress>;
  posts: ReadonlyArray<LearningPostProgress>;
  playgroundActivity?: ReadonlyArray<LearningPlaygroundActivity>;
  quizzes: ReadonlyArray<LearningQuizProgress>;
}

export interface LearningRepository {
  beginLearnerAccountDeletion(input: BeginLearnerAccountDeletionInput): Promise<{
    data: LearnerAccountDeletionState;
    statusCode: 200;
  }>;
  bootstrapLearner(input: BootstrapLearnerInput): Promise<{
    data: unknown;
    statusCode: 200 | 201;
  }>;
  completeDemo(input: CompleteDemoInput): Promise<{
    data: unknown;
    statusCode: 200;
  }>;
  completePost(input: CompletePostInput): Promise<{
    data: PostCompletionResponseData;
    statusCode: 200;
  }>;
  recordDemoView(input: RecordDemoViewInput): Promise<{
    data: DemoViewResponseData;
    statusCode: 200;
  }>;
  recordModuleOverview(input: RecordModuleOverviewInput): Promise<{
    data: ModuleOverviewResponseData;
    statusCode: 200;
  }>;
  recordPostView(input: RecordPostViewInput): Promise<{
    data: PostViewResponseData;
    statusCode: 200;
  }>;
  createQuizAttempt(input: CreateQuizAttemptInput): Promise<{
    data: unknown;
    statusCode: 201;
  }>;
  deleteLearnerAccount(input: DeleteLearnerAccountInput): Promise<{
    data: null;
    statusCode: 204;
  }>;
  enrollLearner(input: EnrollLearnerInput): Promise<{
    data: unknown;
    statusCode: 200 | 201;
  }>;
  getProgress(input: GetProgressInput): Promise<{
    data: LearningProgressSnapshot;
    statusCode: 200;
  }>;
  getLearnerAccountStatus(input: { uid: string }): Promise<{
    data: { status: LearnerAccountStatus };
    statusCode: 200;
  }>;
  submitQuizAttempt(input: SubmitQuizAttemptInput): Promise<{
    data: unknown;
    statusCode: 200;
  }>;
  updateLearnerPreferences(input: UpdateLearnerPreferencesInput): Promise<{
    data: unknown;
    statusCode: 200;
  }>;
}

export interface FirestoreLearningRepositoryOptions {
  contentAuthority?: LearningContentAuthority | undefined;
}

interface EnrollmentSeed {
  courseId: string;
  courseRevisionId: string;
  firstModuleId: string;
}

interface ModuleCompletionSeed {
  completedModuleCount: number;
  courseId: string;
  moduleId: string;
  moduleRevisionId: string;
  moduleQuizId: string;
  nextModuleId: string | null;
  requiredModuleCount: number;
  requiredStepCount: number;
  requiredPostIds: readonly string[];
  unlockAlgorithmIds: readonly string[];
}

interface DemoAccessSeed {
  demoId: string;
  moduleId: string;
  requiredPostIds: readonly string[];
}

interface LearnerProfilePayload {
  avatarUrl: string | null;
  createdAt?: string | null | undefined;
  displayName: string;
  locale: LearnerLocalePreference;
  schemaVersion: 1;
  status: LearnerAccountStatus;
  theme: LearnerThemePreference;
  uid: string;
}

interface EnrollmentResponseData {
  access: {
    moduleId: string;
  };
  enrollment: {
    courseId: string;
    progressPercent: number;
    status: 'in-progress';
  };
  nextPath: string;
}

interface ModuleOverviewResponseData {
  moduleOverview: {
    moduleId: string;
    nextPostId: string;
    status: 'completed';
  };
}

interface DemoViewResponseData {
  demoView: {
    demoId: string;
    started: true;
    viewedStepIds: readonly string[];
  };
}

interface PostCompletionResponseData {
  completion: {
    postId: string;
    status: 'completed';
  };
}

interface DemoCompletionResponseData {
  completion: {
    demoId: string;
    status: 'completed';
  };
  event: {
    demoId: string;
    requiredStepIds: readonly string[];
    type: 'demo_completed';
    viewedStepIds: readonly string[];
  };
}

interface PostViewResponseData {
  postView: {
    contentViewed: boolean;
    postId: string;
    readingPosition: string;
    started: true;
    viewedItemIds: readonly string[];
  };
}

interface QuizSubmissionResponseData {
  bestScore: number;
  feedback: readonly unknown[];
  newlyUnlocked: ReadonlyArray<{ id: string; type: 'algorithm' | 'module' | 'post' }>;
  passed: boolean;
  score: number;
}

interface StoredIdempotencyRecord {
  requestHash?: unknown;
  responseData?: unknown;
  statusCode?: unknown;
}

interface StoredQuizAttempt {
  attemptNumber?: unknown;
  expiresAt?: unknown;
  questionIds?: unknown;
  quizId?: unknown;
  quizRevisionId?: unknown;
  status?: unknown;
}

interface StoredQuizProgress {
  attemptCount?: unknown;
  bestScore?: unknown;
  passed?: unknown;
  wrongCounts?: unknown;
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1_000;
const QUIZ_ATTEMPT_TTL_MS = 2 * 60 * 60 * 1_000;
const FIRESTORE_BATCH_DELETE_LIMIT = 450;
const LEARNER_ACCOUNT_SUBCOLLECTIONS = [
  'algorithmUnlocks',
  'avatarUploadSessions',
  'contentAccess',
  'demoCompletions',
  'demoViews',
  'enrollments',
  'idempotencyKeys',
  'moduleCompletions',
  'moduleProgress',
  'postCompletions',
  'postViews',
  'quizAttempts',
  'quizProgress',
] as const;
function getEnrollmentSeed(courseId: string): EnrollmentSeed {
  const course = getReleaseCourse(courseId);
  const firstModule = course?.modules[0];
  const firstPost = firstModule?.posts[0];

  if (!course || !firstModule || !firstPost) {
    throw new ApiError(404, 'COURSE_NOT_FOUND', 'The requested course was not found.');
  }

  return {
    courseId: course.courseId,
    courseRevisionId: course.courseRevisionId,
    firstModuleId: firstModule.moduleId,
  };
}

function createModuleCompletionSeed(module: ReleaseLearningModule): ModuleCompletionSeed {
  const course = getReleaseCourse(module.courseId);
  const nextModule = getNextReleaseModule(module.moduleId);

  return {
    completedModuleCount: module.order,
    courseId: module.courseId,
    moduleId: module.moduleId,
    moduleRevisionId: `${module.moduleId}-rev-r1`,
    moduleQuizId: module.moduleQuizId,
    nextModuleId: nextModule?.moduleId ?? null,
    requiredModuleCount: course?.modules.length ?? 1,
    requiredStepCount: module.posts.length + (module.demoId ? 1 : 0) + 2,
    requiredPostIds: module.posts.map((post) => post.postId),
    unlockAlgorithmIds: module.unlockAlgorithmIds,
  };
}

function getModuleCompletionSeedByModuleId(moduleId: string): ModuleCompletionSeed | null {
  const module = getReleaseModule(moduleId);

  return module ? createModuleCompletionSeed(module) : null;
}

function getModuleCompletionSeedByQuizId(quizId: string): ModuleCompletionSeed | null {
  const module = getReleaseModuleByQuizId(quizId);

  return module ? createModuleCompletionSeed(module) : null;
}

function getDemoAccessSeedByPostId(postId: string): DemoAccessSeed | null {
  for (const module of getReleaseLearningCatalog().courses.flatMap((course) => course.modules)) {
    const lastPostId = module.posts.at(-1)?.postId;

    if (module.demoId && lastPostId === postId) {
      return {
        demoId: module.demoId,
        moduleId: module.moduleId,
        requiredPostIds: module.posts.map((post) => post.postId),
      };
    }
  }

  return null;
}

function getDemoAccessSeedByDemoId(demoId: string): DemoAccessSeed | null {
  for (const module of getReleaseLearningCatalog().courses.flatMap((course) => course.modules)) {
    if (module.demoId === demoId) {
      return {
        demoId: module.demoId,
        moduleId: module.moduleId,
        requiredPostIds: module.posts.map((post) => post.postId),
      };
    }
  }

  return null;
}

async function assertCurrentLearningContentEntities(input: {
  allowUnpublishedCourseForUid?: string | undefined;
  authority: LearningContentAuthority;
  entities: ReadonlyArray<{ entityId: string; entityType: LearningContentEntityType }>;
  firestore: Firestore;
  transaction: Transaction;
}): Promise<void> {
  const entities = [
    ...new Map(
      input.entities.map((entity) => [`${entity.entityType}:${entity.entityId}`, entity]),
    ).values(),
  ];

  await Promise.all(
    entities.map(async ({ entityId, entityType }) => {
      try {
        await input.authority.assertCurrentPublishedEntity({
          entityId,
          entityType,
          transaction: input.transaction,
        });
      } catch (error) {
        if (
          entityType !== 'course' ||
          input.allowUnpublishedCourseForUid === undefined ||
          !(error instanceof ApiError) ||
          error.code !== 'CONTENT_NOT_PUBLISHED'
        ) {
          throw error;
        }

        const enrollmentSnapshot = await input.transaction.get(
          input.firestore.doc(
            `users/${input.allowUnpublishedCourseForUid}/enrollments/${entityId}`,
          ),
        );

        if (!isContinuingCourseEnrollment(enrollmentSnapshot, entityId)) {
          throw error;
        }

        await input.authority.assertCurrentPublishedEntity({
          allowUnpublishedCourse: true,
          entityId,
          entityType,
          transaction: input.transaction,
        });
      }
    }),
  );
}

async function assertQuizAttemptContentIsActive(input: {
  authority: LearningContentAuthority;
  firestore: Firestore;
  manifest: ReturnType<typeof getQuizManifest>;
  transaction: Transaction;
  uid: string;
}): Promise<void> {
  const entities: Array<{ entityId: string; entityType: LearningContentEntityType }> = [
    { entityId: input.manifest.quizId, entityType: 'quiz' },
    { entityId: input.manifest.moduleId, entityType: 'module' },
  ];

  if (input.manifest.postId) {
    entities.push({ entityId: input.manifest.postId, entityType: 'post' });
  }

  if (input.manifest.demoId) {
    entities.push({ entityId: input.manifest.demoId, entityType: 'demo' });
  }

  if (input.manifest.quizKind === 'module') {
    for (const postId of getRequiredPostCompletionIdsForModule(input.manifest.moduleId)) {
      entities.push({ entityId: postId, entityType: 'post' });
    }
  }

  const module = getReleaseModule(input.manifest.moduleId);

  if (module) {
    entities.push({ entityId: module.courseId, entityType: 'course' });
  }

  await assertCurrentLearningContentEntities({
    allowUnpublishedCourseForUid: input.uid,
    authority: input.authority,
    entities,
    firestore: input.firestore,
    transaction: input.transaction,
  });
}

function isContinuingCourseEnrollment(
  snapshot: { data(): unknown; exists: boolean },
  courseId: string,
): boolean {
  const data = snapshot.data();

  return (
    snapshot.exists &&
    isRecord(data) &&
    data.schemaVersion === 1 &&
    data.courseId === courseId &&
    (data.status === 'in-progress' || data.status === 'completed')
  );
}

function normalizeDisplayName(displayName: string): string {
  const trimmed = displayName.trim();

  return trimmed || 'Learner';
}

function createProfilePayload(input: BootstrapLearnerInput): LearnerProfilePayload {
  return {
    uid: input.uid,
    schemaVersion: 1,
    displayName: normalizeDisplayName(input.displayName),
    avatarUrl: null,
    locale: input.locale ?? 'vi',
    theme: input.theme ?? 'system',
    status: 'active',
  };
}

function createAnonymizedProfilePayload(): Omit<LearnerProfilePayload, 'uid'> {
  return {
    schemaVersion: 1,
    displayName: 'Deleted learner',
    avatarUrl: null,
    locale: 'vi',
    theme: 'system',
    status: 'anonymized',
  };
}

async function listLearnerSubcollectionDocumentRefs(
  firestore: Firestore,
  uid: string,
): Promise<FirebaseFirestore.DocumentReference[]> {
  const documentRefsByCollection = await Promise.all(
    LEARNER_ACCOUNT_SUBCOLLECTIONS.map((collectionName) =>
      firestore.collection(`users/${uid}/${collectionName}`).listDocuments(),
    ),
  );

  return documentRefsByCollection.flat();
}

async function listLearnerEventDocumentRefs(
  firestore: Firestore,
  uid: string,
): Promise<FirebaseFirestore.DocumentReference[]> {
  const collection = firestore.collection('learningEvents') as unknown as {
    where?: (
      fieldPath: string,
      opStr: '==',
      value: string,
    ) => {
      get(): Promise<{ docs: Array<{ ref: FirebaseFirestore.DocumentReference }> }>;
    };
  };

  if (typeof collection.where !== 'function') {
    return [];
  }

  const snapshot = await collection.where('uidHash', '==', createLearningLearnerHash(uid)).get();

  return snapshot.docs.map((document) => document.ref);
}

async function deleteDocumentsInBatches(
  firestore: Firestore,
  documentRefs: readonly FirebaseFirestore.DocumentReference[],
): Promise<void> {
  for (let index = 0; index < documentRefs.length; index += FIRESTORE_BATCH_DELETE_LIMIT) {
    const batch = firestore.batch();

    for (const reference of documentRefs.slice(index, index + FIRESTORE_BATCH_DELETE_LIMIT)) {
      batch.delete(reference);
    }

    await batch.commit();
  }
}

function toProfileResponse(
  uid: string,
  data: FirebaseFirestore.DocumentData,
): LearnerProfilePayload {
  const createdAt = getTimestampIso(data.createdAt);

  return {
    uid,
    schemaVersion: 1,
    displayName: typeof data.displayName === 'string' ? data.displayName : 'Learner',
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : null,
    locale: data.locale === 'en' ? 'en' : 'vi',
    theme: data.theme === 'light' || data.theme === 'dark' ? data.theme : 'system',
    status:
      data.status === 'deletion-pending' || data.status === 'anonymized' ? data.status : 'active',
    ...(createdAt ? { createdAt } : {}),
  };
}

function createEnrollmentResponseData(seed: EnrollmentSeed): EnrollmentResponseData {
  return {
    enrollment: {
      courseId: seed.courseId,
      status: 'in-progress',
      progressPercent: 0,
    },
    access: {
      moduleId: seed.firstModuleId,
    },
    nextPath: `/learn/${seed.courseId}`,
  };
}

function createModuleOverviewResponseData(
  module: ReleaseLearningModule,
): ModuleOverviewResponseData {
  const nextPostId = module.posts[0]?.postId;

  if (!nextPostId) {
    throw new ApiError(409, 'MODULE_POST_REQUIRED', 'A module overview requires a first post.');
  }

  return {
    moduleOverview: {
      moduleId: module.moduleId,
      nextPostId,
      status: 'completed',
    },
  };
}

function createDemoViewResponseData(input: RecordDemoViewInput): DemoViewResponseData {
  return {
    demoView: {
      demoId: input.demoId,
      started: true,
      viewedStepIds: input.viewedStepIds,
    },
  };
}

function createPostCompletionResponseData(postId: string): PostCompletionResponseData {
  return {
    completion: {
      postId,
      status: 'completed',
    },
  };
}

function createEnrollmentRequestHash(input: EnrollLearnerInput): string {
  return JSON.stringify({
    operation: 'course-enrollment',
    uid: input.uid,
    courseId: input.courseId,
  });
}

function createDemoCompletionResponseData(input: CompleteDemoInput): DemoCompletionResponseData {
  return {
    completion: {
      demoId: input.demoId,
      status: 'completed',
    },
    event: {
      type: 'demo_completed',
      demoId: input.demoId,
      requiredStepIds: input.requiredStepIds,
      viewedStepIds: input.viewedStepIds,
    },
  };
}

function createPostViewResponseData(input: {
  contentViewed: boolean;
  postId: string;
  readingPosition: string;
  viewedItemIds: readonly string[];
}): PostViewResponseData {
  return {
    postView: {
      contentViewed: input.contentViewed,
      postId: input.postId,
      readingPosition: input.readingPosition,
      started: true,
      viewedItemIds: input.viewedItemIds,
    },
  };
}

function createDemoCompletionRequestHash(input: CompleteDemoInput): string {
  return JSON.stringify({
    operation: 'demo-completion',
    uid: input.uid,
    demoId: input.demoId,
    viewedStepIds: [...input.viewedStepIds].sort(),
  });
}

function createPostCompletionRequestHash(input: CompletePostInput): string {
  return JSON.stringify({
    operation: 'post-completion',
    postId: input.postId,
    uid: input.uid,
  });
}

function createQuizSubmissionRequestHash(input: SubmitQuizAttemptInput): string {
  return JSON.stringify({
    operation: 'quiz-submission',
    uid: input.uid,
    attemptId: input.attemptId,
    answers: input.answers
      .map((answer) => ({
        questionId: answer.questionId,
        value: Array.isArray(answer.value) ? [...answer.value].sort() : answer.value,
      }))
      .sort((leftAnswer, rightAnswer) =>
        leftAnswer.questionId.localeCompare(rightAnswer.questionId),
      ),
  });
}

function isStoredIdempotencyRecord(data: unknown): data is StoredIdempotencyRecord {
  return typeof data === 'object' && data !== null;
}

function isStoredQuizAttempt(data: unknown): data is StoredQuizAttempt {
  return typeof data === 'object' && data !== null;
}

function isStoredQuizProgress(data: unknown): data is StoredQuizProgress {
  return typeof data === 'object' && data !== null;
}

function getStoredAttemptCount(data: unknown): number {
  if (!isStoredQuizProgress(data) || typeof data.attemptCount !== 'number') {
    return 0;
  }

  return Math.max(0, Math.floor(data.attemptCount));
}

function getStoredBestScore(data: unknown): number {
  if (!isStoredQuizProgress(data) || typeof data.bestScore !== 'number') {
    return 0;
  }

  return Math.max(0, data.bestScore);
}

function getStoredWrongCounts(data: unknown): StoredQuestionWrongCounts {
  if (!isStoredQuizProgress(data) || !isRecord(data.wrongCounts)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(data.wrongCounts)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
      .map(([questionId, wrongCount]) => [questionId, Math.max(0, Math.floor(wrongCount))]),
  );
}

function getStoredQuestionIds(data: StoredQuizAttempt): string[] {
  if (
    !Array.isArray(data.questionIds) ||
    data.questionIds.some((value) => typeof value !== 'string')
  ) {
    throw new ApiError(409, 'QUIZ_ATTEMPT_INVALID', 'Quiz attempt question order is invalid.');
  }

  return data.questionIds;
}

function getTimestampMillis(value: unknown): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  ) {
    return value.toMillis();
  }

  return null;
}

function getTimestampIso(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  const millis = getTimestampMillis(value);

  return millis === null ? null : new Date(millis).toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function createQuizSubmissionResponseData(input: {
  bestScore: number;
  feedback: readonly unknown[];
  newlyUnlocked: ReadonlyArray<{ id: string; type: 'algorithm' | 'module' | 'post' }>;
  passed: boolean;
  score: number;
}): QuizSubmissionResponseData {
  return {
    bestScore: input.bestScore,
    feedback: input.feedback,
    newlyUnlocked: input.newlyUnlocked,
    passed: input.passed,
    score: input.score,
  };
}

function getBooleanField(data: FirebaseFirestore.DocumentData | undefined, fieldName: string) {
  return data?.[fieldName] === true;
}

function getNumberField(data: FirebaseFirestore.DocumentData | undefined, fieldName: string) {
  const value = data?.[fieldName];

  return typeof value === 'number' ? value : 0;
}

function getStatusField(data: FirebaseFirestore.DocumentData | undefined) {
  const status = data?.status;

  return status === 'completed' || status === 'in-progress' ? status : null;
}

function getStringArrayField(data: FirebaseFirestore.DocumentData | undefined, fieldName: string) {
  const value = data?.[fieldName];

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    return [];
  }

  return [...new Set(value)].sort((leftItem, rightItem) => leftItem.localeCompare(rightItem));
}

function getStringField(data: FirebaseFirestore.DocumentData | undefined, fieldName: string) {
  const value = data?.[fieldName];

  return typeof value === 'string' && value.trim() ? value : null;
}

type StableContentAccessItem = LearningProgressSnapshot['contentAccess'][number];

function hasRevisionPinField(data: FirebaseFirestore.DocumentData): boolean {
  return Object.keys(data).some(
    (fieldName) => fieldName === 'revisionId' || fieldName.endsWith('RevisionId'),
  );
}

function toStableContentAccessItem(
  data: FirebaseFirestore.DocumentData,
): StableContentAccessItem | null {
  if (hasRevisionPinField(data)) {
    return null;
  }

  if (data.contentType !== 'demo' && data.contentType !== 'module' && data.contentType !== 'post') {
    return null;
  }

  if (typeof data.entityId !== 'string' || !data.entityId.trim()) {
    return null;
  }

  return {
    contentType: data.contentType,
    entityId: data.entityId.trim(),
  };
}

function getRequiredPostCompletionIdsForModule(moduleId: string): readonly string[] {
  return getModuleCompletionSeedByModuleId(moduleId)?.requiredPostIds ?? [];
}

function getNextPostIdInModule(moduleId: string, postId: string): string | null {
  const module = getReleaseModule(moduleId);
  const currentPostIndex = module?.posts.findIndex((post) => post.postId === postId) ?? -1;

  if (!module || currentPostIndex < 0) {
    return null;
  }

  return module.posts[currentPostIndex + 1]?.postId ?? null;
}

function getModuleIdForPost(postId: string): string | null {
  for (const module of getReleaseLearningCatalog().courses.flatMap((course) => course.modules)) {
    if (module.posts.some((post) => post.postId === postId)) {
      return module.moduleId;
    }
  }

  return null;
}

function areAllOtherRequiredPostsComplete(input: {
  completedPostId: string;
  requiredPostIds: readonly string[];
  snapshots: readonly FirebaseFirestore.DocumentSnapshot[];
}) {
  const otherRequiredPostIds = input.requiredPostIds.filter(
    (postId) => postId !== input.completedPostId,
  );

  return (
    otherRequiredPostIds.length === input.snapshots.length &&
    input.snapshots.every((snapshot) => snapshot.exists)
  );
}

interface UserSubcollectionDocumentData {
  data: FirebaseFirestore.DocumentData;
  id: string;
}

const LEARNER_ACTIVITY_EVENT_LIMIT = 200;
const LEARNER_ACTIVITY_RUN_LIMIT = 50;

async function readLearnerLearningEvents(
  firestore: Firestore,
  uid: string,
): Promise<UserSubcollectionDocumentData[]> {
  const collection = firestore.collection('learningEvents') as unknown as {
    where?: (
      fieldPath: string,
      opStr: '==',
      value: string,
    ) => {
      get(): Promise<{ docs: Array<{ data(): FirebaseFirestore.DocumentData; id: string }> }>;
      limit?(limit: number): {
        get(): Promise<{ docs: Array<{ data(): FirebaseFirestore.DocumentData; id: string }> }>;
      };
    };
  };

  if (typeof collection.where !== 'function') {
    return [];
  }

  const filteredCollection = collection.where('uidHash', '==', createLearningLearnerHash(uid));
  const snapshot = filteredCollection.limit
    ? await filteredCollection.limit(LEARNER_ACTIVITY_EVENT_LIMIT).get()
    : await filteredCollection.get();

  return snapshot.docs.map((document) => ({ data: document.data(), id: document.id }));
}

async function readLearnerPlaygroundRuns(
  firestore: Firestore,
  uid: string,
): Promise<UserSubcollectionDocumentData[]> {
  const collection = firestore.collection(`users/${uid}/playgroundRuns`) as unknown as {
    limit?: (limit: number) => {
      get(): Promise<{ docs: Array<{ data(): FirebaseFirestore.DocumentData; id: string }> }>;
    };
    orderBy?: (
      fieldPath: string,
      direction?: 'asc' | 'desc',
    ) => {
      limit(limit: number): {
        get(): Promise<{ docs: Array<{ data(): FirebaseFirestore.DocumentData; id: string }> }>;
      };
    };
  };

  if (typeof collection.orderBy !== 'function') {
    return [];
  }

  const snapshot = await collection
    .orderBy('createdAt', 'desc')
    .limit(LEARNER_ACTIVITY_RUN_LIMIT)
    .get();

  return snapshot.docs.map((document) => ({ data: document.data(), id: document.id }));
}

function createPlaygroundActivity(input: {
  learningEvents: readonly UserSubcollectionDocumentData[];
  playgroundRuns: readonly UserSubcollectionDocumentData[];
}): readonly LearningPlaygroundActivity[] {
  const runStates = new Map<string, Map<string, 'completed' | 'failed'>>();

  function setRunState(inputState: {
    algorithmId: string;
    runId: string;
    scenarioId: string;
    status: 'completed' | 'failed';
  }): void {
    const pairKey = `${inputState.scenarioId}:${inputState.algorithmId}`;
    const pairRuns = runStates.get(pairKey) ?? new Map<string, 'completed' | 'failed'>();

    pairRuns.set(inputState.runId, inputState.status);
    runStates.set(pairKey, pairRuns);
  }

  for (const event of input.learningEvents) {
    if (
      event.data.verificationLevel !== 'client-computed' ||
      (event.data.eventType !== 'playground_run_completed' &&
        event.data.eventType !== 'playground_run_failed')
    ) {
      continue;
    }

    const payload = event.data.payload;

    if (
      typeof payload !== 'object' ||
      payload === null ||
      Array.isArray(payload) ||
      typeof payload.algorithmId !== 'string' ||
      typeof payload.runId !== 'string' ||
      typeof payload.scenarioId !== 'string'
    ) {
      continue;
    }

    setRunState({
      algorithmId: payload.algorithmId,
      runId: payload.runId,
      scenarioId: payload.scenarioId,
      status: event.data.eventType === 'playground_run_failed' ? 'failed' : 'completed',
    });
  }

  for (const run of input.playgroundRuns) {
    if (
      run.data.verificationLevel !== 'client-computed' ||
      typeof run.data.algorithmId !== 'string' ||
      typeof run.data.runId !== 'string' ||
      typeof run.data.scenarioId !== 'string'
    ) {
      continue;
    }

    setRunState({
      algorithmId: run.data.algorithmId,
      runId: run.data.runId,
      scenarioId: run.data.scenarioId,
      status: 'completed',
    });
  }

  return getSubmissionPlaygroundPairManifests().map((manifest) => {
    const pairRuns = runStates.get(`${manifest.scenarioId}:${manifest.algorithmId}`) ?? new Map();
    const failedRunCount = [...pairRuns.values()].filter((status) => status === 'failed').length;

    return {
      algorithmId: manifest.algorithmId,
      failedRunCount,
      runCount: pairRuns.size,
      scenarioId: manifest.scenarioId,
    };
  });
}

async function readUserSubcollectionData(
  firestore: Firestore,
  uid: string,
  collectionName: string,
  documentIds: readonly string[],
): Promise<UserSubcollectionDocumentData[]> {
  const snapshots = await Promise.all(
    documentIds.map(async (documentId) => {
      const snapshot = await firestore.doc(`users/${uid}/${collectionName}/${documentId}`).get();

      return {
        data: snapshot.data(),
        id: documentId,
      };
    }),
  );

  return snapshots.filter(
    (snapshot): snapshot is UserSubcollectionDocumentData => snapshot.data !== undefined,
  );
}

function getKnownProgressDocumentIds() {
  const catalog = getReleaseLearningCatalog();
  const courses = catalog.courses;
  const modules = courses.flatMap((course) => course.modules);
  const posts = modules.flatMap((module) => module.posts);
  const demos = modules.flatMap((module) => (module.demoId ? [module.demoId] : []));
  const quizIds = modules.flatMap((module) => [
    module.moduleQuizId,
    ...module.posts.map((post) => post.postQuizId),
  ]);
  const algorithmIds = modules.flatMap((module) => module.unlockAlgorithmIds);

  return {
    algorithmUnlocks: [...new Set(algorithmIds)],
    contentAccess: [
      ...modules.map((module) => `module_${module.moduleId}`),
      ...posts.map((post) => `post_${post.postId}`),
      ...demos.map((demoId) => `demo_${demoId}`),
    ],
    demoCompletions: [...new Set(demos)],
    demoViews: [...new Set(demos)],
    enrollments: courses.map((course) => course.courseId),
    moduleCompletions: modules.map((module) => module.moduleId),
    moduleProgress: modules.map((module) => module.moduleId),
    postCompletions: posts.map((post) => post.postId),
    postViews: posts.map((post) => post.postId),
    quizProgress: [...new Set(quizIds)],
  };
}

function toAlgorithmUnlockItem(data: FirebaseFirestore.DocumentData) {
  if (typeof data.algorithmId !== 'string' || typeof data.moduleId !== 'string') {
    return null;
  }

  return {
    algorithmId: data.algorithmId,
    moduleId: data.moduleId,
  };
}

function toQuizProgressItem(id: string, data: FirebaseFirestore.DocumentData) {
  try {
    const manifest = getQuizManifest(id);

    return {
      attemptCount: getNumberField(data, 'attemptCount'),
      bestScore: getNumberField(data, 'bestScore'),
      passed: getBooleanField(data, 'passed'),
      quizId: id,
      quizKind: manifest.quizKind,
    };
  } catch {
    return null;
  }
}

function sortStableContentAccessItems(
  items: readonly StableContentAccessItem[],
): StableContentAccessItem[] {
  const contentTypeOrder: Record<StableContentAccessItem['contentType'], number> = {
    module: 0,
    post: 1,
    demo: 2,
  };

  return [...items].sort((leftItem, rightItem) => {
    const typeOrder =
      contentTypeOrder[leftItem.contentType] - contentTypeOrder[rightItem.contentType];

    if (typeOrder !== 0) {
      return typeOrder;
    }

    return leftItem.entityId.localeCompare(rightItem.entityId);
  });
}

function createCourseProgressSummary(input: {
  contentAccessKeys: ReadonlySet<string>;
  course: ReleaseLearningCourse;
  demoCompletions: ReadonlySet<string>;
  demoViewsById: ReadonlyMap<string, FirebaseFirestore.DocumentData>;
  enrollment: { courseId: string; data: FirebaseFirestore.DocumentData };
  moduleCompletions: ReadonlySet<string>;
  moduleProgressById: ReadonlyMap<string, FirebaseFirestore.DocumentData>;
  postCompletions: ReadonlySet<string>;
  postViewsById: ReadonlyMap<string, FirebaseFirestore.DocumentData>;
  quizProgress: readonly UserSubcollectionDocumentData[];
  quizProgressById: ReadonlyMap<string, FirebaseFirestore.DocumentData>;
  isEnrolled?: boolean;
  includeMissingConditions?: boolean;
}): LearningCourseProgress {
  const modules = input.course.modules.map((module) => {
    const completedPostCount = module.posts.filter((post) => {
      const quizProgress = input.quizProgressById.get(post.postQuizId);

      return input.postCompletions.has(post.postId) || getBooleanField(quizProgress, 'passed');
    }).length;
    const demoCompleted = module.demoId ? input.demoCompletions.has(module.demoId) : false;
    const moduleQuizProgress = input.quizProgressById.get(module.moduleQuizId);
    const moduleProgress = input.moduleProgressById.get(module.moduleId);
    const overviewViewed = getBooleanField(moduleProgress, 'overviewViewed');
    const requiredStepCount = module.posts.length + (module.demoId ? 1 : 0) + 2;
    const derivedCompletedStepCount =
      (overviewViewed ? 1 : 0) +
      completedPostCount +
      (demoCompleted ? 1 : 0) +
      (getBooleanField(moduleQuizProgress, 'passed') ? 1 : 0);
    const storedCompletedStepCount = Math.min(
      requiredStepCount,
      Math.max(0, getNumberField(moduleProgress, 'completedStepCount')),
    );
    const moduleCompleted =
      input.moduleCompletions.has(module.moduleId) ||
      getStatusField(moduleProgress) === 'completed' ||
      Math.max(derivedCompletedStepCount, storedCompletedStepCount) >= requiredStepCount;
    const completedStepCount = moduleCompleted
      ? requiredStepCount
      : Math.max(derivedCompletedStepCount, storedCompletedStepCount);
    const hasModuleActivity =
      input.contentAccessKeys.has(`module:${module.moduleId}`) ||
      input.moduleCompletions.has(module.moduleId) ||
      input.moduleProgressById.has(module.moduleId) ||
      module.posts.some(
        (post) =>
          input.contentAccessKeys.has(`post:${post.postId}`) ||
          input.postCompletions.has(post.postId) ||
          input.postViewsById.has(post.postId) ||
          input.quizProgressById.has(post.postQuizId),
      ) ||
      (module.demoId !== null &&
        (input.contentAccessKeys.has(`demo:${module.demoId}`) ||
          input.demoCompletions.has(module.demoId) ||
          input.demoViewsById.has(module.demoId))) ||
      input.quizProgressById.has(module.moduleQuizId);

    const missingConditions = [
      ...(overviewViewed ? [] : [`overview:${module.moduleId}`]),
      ...module.posts
        .filter((post) => {
          const quizProgress = input.quizProgressById.get(post.postQuizId);

          return (
            !input.postCompletions.has(post.postId) && !getBooleanField(quizProgress, 'passed')
          );
        })
        .map((post) => `post:${post.postId}`),
      ...(demoCompleted || module.demoId === null ? [] : [`demo:${module.demoId}`]),
      ...(getBooleanField(moduleQuizProgress, 'passed') ? [] : [`quiz:${module.moduleQuizId}`]),
      ...module.prerequisiteModuleIds
        .filter((moduleId) => !input.moduleCompletions.has(moduleId))
        .map((moduleId) => `module:${moduleId}`),
    ];

    return {
      completedStepCount,
      ...(input.includeMissingConditions ? { missingConditions } : {}),
      moduleId: module.moduleId,
      overviewViewed,
      progressPercent: moduleCompleted
        ? 100
        : Math.round((completedStepCount / requiredStepCount) * 100),
      requiredStepCount,
      status: moduleCompleted
        ? ('completed' as const)
        : hasModuleActivity
          ? ('in-progress' as const)
          : ('locked' as const),
    };
  });
  const completedModuleCount = modules.filter((module) => module.status === 'completed').length;
  const computedProgressPercent =
    input.course.modules.length > 0
      ? Math.round((completedModuleCount / input.course.modules.length) * 100)
      : 0;
  const progressPercent = Math.max(
    getNumberField(input.enrollment.data, 'progressPercent'),
    computedProgressPercent,
  );
  const quizIds = new Set(
    input.course.modules.flatMap((module) => [
      module.moduleQuizId,
      ...module.posts.map((post) => post.postQuizId),
    ]),
  );

  return {
    courseId: input.course.courseId,
    demos: input.course.modules
      .filter((module) => module.demoId !== null)
      .map((module) => ({
        completed: input.demoCompletions.has(module.demoId!),
        demoId: module.demoId!,
        started: getBooleanField(input.demoViewsById.get(module.demoId!), 'started'),
      })),
    modules,
    posts: input.course.modules.flatMap((module) =>
      module.posts.map((post) => {
        const quizProgress = input.quizProgressById.get(post.postQuizId);
        const quizPassed = getBooleanField(quizProgress, 'passed');
        const postView = input.postViewsById.get(post.postId);

        return {
          bestScore: getNumberField(quizProgress, 'bestScore'),
          completed: input.postCompletions.has(post.postId) || quizPassed,
          contentViewed: getBooleanField(postView, 'contentViewed'),
          postId: post.postId,
          quizId: post.postQuizId,
          quizPassed,
          readingPosition: getStringField(postView, 'readingPosition'),
          started: getBooleanField(postView, 'started'),
          viewedItemIds: getStringArrayField(postView, 'viewedItemIds'),
        };
      }),
    ),
    progressPercent,
    quizzes: input.quizProgress
      .filter((item) => quizIds.has(item.id))
      .map((item) => toQuizProgressItem(item.id, item.data))
      .filter((item): item is LearningCourseProgress['quizzes'][number] => item !== null),
    status:
      progressPercent >= 100
        ? 'completed'
        : input.isEnrolled === false
          ? 'not-enrolled'
          : (getStatusField(input.enrollment.data) ?? 'in-progress'),
  };
}

function createLearningProgressSnapshot(input: {
  algorithmUnlocks: readonly UserSubcollectionDocumentData[];
  contentAccess: readonly UserSubcollectionDocumentData[];
  demoCompletions: readonly UserSubcollectionDocumentData[];
  demoViews: readonly UserSubcollectionDocumentData[];
  enrollments: readonly UserSubcollectionDocumentData[];
  moduleCompletions: readonly UserSubcollectionDocumentData[];
  moduleProgress: readonly UserSubcollectionDocumentData[];
  postCompletions: readonly UserSubcollectionDocumentData[];
  postViews: readonly UserSubcollectionDocumentData[];
  playgroundActivity?: readonly LearningPlaygroundActivity[];
  quizProgress: readonly UserSubcollectionDocumentData[];
}): LearningProgressSnapshot {
  const catalog = getReleaseLearningCatalog();
  const courseOrder = new Map(
    catalog.courses.map((course, index) => [course.courseId, index] as const),
  );
  const enrollmentItems = input.enrollments
    .map((item) => ({
      courseId: typeof item.data.courseId === 'string' ? item.data.courseId : item.id,
      data: item.data,
    }))
    .sort(
      (leftItem, rightItem) =>
        (courseOrder.get(leftItem.courseId) ?? Number.MAX_SAFE_INTEGER) -
        (courseOrder.get(rightItem.courseId) ?? Number.MAX_SAFE_INTEGER),
    );
  const selectedEnrollment = enrollmentItems[0];
  const selectedCourseId = selectedEnrollment?.courseId ?? 'course-deep-learning-basic';
  const selectedCourse = getReleaseCourse(selectedCourseId);
  const contentAccess = sortStableContentAccessItems(
    input.contentAccess
      .map((item) => toStableContentAccessItem(item.data))
      .filter((item): item is StableContentAccessItem => item !== null),
  );
  const contentAccessKeys = new Set(
    contentAccess.map((item) => `${item.contentType}:${item.entityId}`),
  );
  const moduleCompletionIds = new Set(input.moduleCompletions.map((item) => item.id));
  const postCompletionIds = new Set(input.postCompletions.map((item) => item.id));
  const postViewsById = new Map(input.postViews.map((item) => [item.id, item.data]));
  const demoCompletionIds = new Set(input.demoCompletions.map((item) => item.id));
  const demoViewsById = new Map(input.demoViews.map((item) => [item.id, item.data]));
  const moduleProgressById = new Map(input.moduleProgress.map((item) => [item.id, item.data]));
  const quizProgressById = new Map(input.quizProgress.map((item) => [item.id, item.data]));
  const visibleModules =
    selectedCourse?.modules.filter((module) => {
      const hasModuleProgress =
        contentAccessKeys.has(`module:${module.moduleId}`) ||
        moduleCompletionIds.has(module.moduleId) ||
        quizProgressById.has(module.moduleQuizId);
      const hasPostProgress = module.posts.some(
        (post) =>
          contentAccessKeys.has(`post:${post.postId}`) ||
          postCompletionIds.has(post.postId) ||
          postViewsById.has(post.postId) ||
          quizProgressById.has(post.postQuizId),
      );
      const hasDemoProgress =
        module.demoId !== null &&
        (contentAccessKeys.has(`demo:${module.demoId}`) ||
          demoCompletionIds.has(module.demoId) ||
          demoViewsById.has(module.demoId));
      const hasOverviewProgress = moduleProgressById.has(module.moduleId);

      return hasModuleProgress || hasPostProgress || hasDemoProgress || hasOverviewProgress;
    }) ?? [];
  const completedModuleCount = selectedCourse
    ? selectedCourse.modules.filter((module) => moduleCompletionIds.has(module.moduleId)).length
    : 0;
  const computedEnrollmentProgressPercent =
    selectedCourse && selectedCourse.modules.length > 0
      ? Math.round((completedModuleCount / selectedCourse.modules.length) * 100)
      : 0;
  const storedEnrollmentProgressPercent = getNumberField(
    selectedEnrollment?.data,
    'progressPercent',
  );
  const enrollmentProgressPercent = Math.max(
    storedEnrollmentProgressPercent,
    computedEnrollmentProgressPercent,
  );
  const courses = enrollmentItems
    .map((enrollment) => {
      const course = getReleaseCourse(enrollment.courseId);

      return course
        ? createCourseProgressSummary({
            contentAccessKeys,
            course,
            demoCompletions: demoCompletionIds,
            demoViewsById,
            enrollment,
            moduleCompletions: moduleCompletionIds,
            moduleProgressById,
            postCompletions: postCompletionIds,
            postViewsById,
            quizProgress: input.quizProgress,
            quizProgressById,
            isEnrolled: true,
          })
        : null;
    })
    .filter((course): course is LearningCourseProgress => course !== null);
  const courseCatalog = catalog.courses.map((course) =>
    createCourseProgressSummary({
      contentAccessKeys,
      course,
      demoCompletions: demoCompletionIds,
      demoViewsById,
      enrollment: { courseId: course.courseId, data: {} },
      includeMissingConditions: true,
      isEnrolled: false,
      moduleCompletions: moduleCompletionIds,
      moduleProgressById,
      postCompletions: postCompletionIds,
      postViewsById,
      quizProgress: input.quizProgress,
      quizProgressById,
    }),
  );

  return {
    courseCatalog,
    courses,
    algorithmUnlocks: input.algorithmUnlocks
      .map((item) => toAlgorithmUnlockItem(item.data))
      .filter((item): item is LearningProgressSnapshot['algorithmUnlocks'][number] => item !== null)
      .sort((leftItem, rightItem) => leftItem.algorithmId.localeCompare(rightItem.algorithmId)),
    contentAccess,
    demos: visibleModules
      .filter((module) => module.demoId !== null)
      .map((module) => ({
        completed: module.demoId ? demoCompletionIds.has(module.demoId) : false,
        demoId: module.demoId!,
        started: module.demoId
          ? getBooleanField(demoViewsById.get(module.demoId), 'started')
          : false,
      })),
    enrollment: {
      courseId: selectedCourseId,
      progressPercent: enrollmentProgressPercent,
      status:
        enrollmentProgressPercent >= 100
          ? 'completed'
          : (getStatusField(selectedEnrollment?.data) ??
            (selectedEnrollment ? 'in-progress' : 'not-enrolled')),
    },
    modules: visibleModules.map((module) => {
      const completedPostCount = module.posts.filter((post) => {
        const quizProgress = quizProgressById.get(post.postQuizId);

        return postCompletionIds.has(post.postId) || getBooleanField(quizProgress, 'passed');
      }).length;
      const demoCompleted = module.demoId ? demoCompletionIds.has(module.demoId) : false;
      const moduleQuizProgress = quizProgressById.get(module.moduleQuizId);
      const moduleQuizPassed = getBooleanField(moduleQuizProgress, 'passed');
      const moduleProgress = moduleProgressById.get(module.moduleId);
      const overviewViewed = getBooleanField(moduleProgress, 'overviewViewed');
      const requiredStepCount = module.posts.length + (module.demoId ? 1 : 0) + 2;
      const derivedCompletedStepCount =
        (overviewViewed ? 1 : 0) +
        completedPostCount +
        (demoCompleted ? 1 : 0) +
        (moduleQuizPassed ? 1 : 0);
      const moduleCompleted =
        moduleCompletionIds.has(module.moduleId) || derivedCompletedStepCount >= requiredStepCount;
      const completedStepCount = moduleCompleted ? requiredStepCount : derivedCompletedStepCount;

      return {
        completedStepCount,
        moduleId: module.moduleId,
        overviewViewed,
        progressPercent: moduleCompleted
          ? 100
          : Math.round((completedStepCount / requiredStepCount) * 100),
        requiredStepCount,
        status: moduleCompleted
          ? ('completed' as const)
          : contentAccessKeys.has(`module:${module.moduleId}`)
            ? ('in-progress' as const)
            : ('locked' as const),
      };
    }),
    posts: visibleModules.flatMap((module) =>
      module.posts
        .filter((post) => {
          return (
            contentAccessKeys.has(`post:${post.postId}`) ||
            postCompletionIds.has(post.postId) ||
            quizProgressById.has(post.postQuizId)
          );
        })
        .map((post) => {
          const quizProgress = quizProgressById.get(post.postQuizId);
          const quizPassed = getBooleanField(quizProgress, 'passed');
          const postView = postViewsById.get(post.postId);

          return {
            bestScore: getNumberField(quizProgress, 'bestScore'),
            completed: postCompletionIds.has(post.postId) || quizPassed,
            contentViewed: getBooleanField(postView, 'contentViewed'),
            postId: post.postId,
            quizId: post.postQuizId,
            quizPassed,
            readingPosition: getStringField(postView, 'readingPosition'),
            started: getBooleanField(postView, 'started'),
            viewedItemIds: getStringArrayField(postView, 'viewedItemIds'),
          };
        }),
    ),
    ...(input.playgroundActivity ? { playgroundActivity: input.playgroundActivity } : {}),
    quizzes: input.quizProgress
      .map((item) => toQuizProgressItem(item.id, item.data))
      .filter((item): item is LearningProgressSnapshot['quizzes'][number] => item !== null),
  };
}

export function createFirestoreLearningRepository(
  firestore: Firestore,
  options: FirestoreLearningRepositoryOptions = {},
): LearningRepository {
  const contentAuthority =
    options.contentAuthority ?? createFirestoreLearningContentAuthority(firestore);

  return {
    async beginLearnerAccountDeletion(input) {
      return firestore.runTransaction(async (transaction) => {
        const profileRef = firestore.doc(`users/${input.uid}`);
        const profileSnapshot = await transaction.get(profileRef);
        const currentProfile = profileSnapshot.exists
          ? toProfileResponse(input.uid, profileSnapshot.data() ?? {})
          : createProfilePayload(input);
        const status: LearnerAccountStatus =
          currentProfile.status === 'anonymized' ? 'anonymized' : 'deletion-pending';

        if (!profileSnapshot.exists || currentProfile.status === 'active') {
          transaction.set(
            profileRef,
            {
              ...(profileSnapshot.exists
                ? {}
                : {
                    schemaVersion: currentProfile.schemaVersion,
                    displayName: currentProfile.displayName,
                    avatarUrl: currentProfile.avatarUrl,
                    locale: currentProfile.locale,
                    theme: currentProfile.theme,
                    createdAt: FieldValue.serverTimestamp(),
                  }),
              status,
              deletionRequestedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }

        return {
          data: {
            avatarUrl: currentProfile.avatarUrl,
            status,
          },
          statusCode: 200 as const,
        };
      });
    },
    async bootstrapLearner(input) {
      return firestore.runTransaction(async (transaction) => {
        const profileRef = firestore.doc(`users/${input.uid}`);
        const profileSnapshot = await transaction.get(profileRef);
        const provider = input.provider?.trim() || 'unknown';
        const loginDedupeKey =
          typeof input.authTime === 'number' && Number.isFinite(input.authTime)
            ? `user-logged-in:${Math.floor(input.authTime)}`
            : 'user-logged-in:bootstrap';

        setLearningEventInTransaction(transaction, firestore, {
          dedupeKey: loginDedupeKey,
          eventType: 'user_logged_in',
          now: new Date(),
          payload: { provider },
          uid: input.uid,
          verificationLevel: 'server-verified',
        });

        if (profileSnapshot.exists) {
          const existingProfile = toProfileResponse(input.uid, profileSnapshot.data() ?? {});
          const displayName = normalizeDisplayName(input.displayName);
          const profile =
            existingProfile.status === 'active' && existingProfile.displayName !== displayName
              ? { ...existingProfile, displayName }
              : existingProfile;

          if (profile.displayName !== existingProfile.displayName) {
            transaction.set(
              profileRef,
              {
                displayName: profile.displayName,
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
          }

          return {
            statusCode: 200,
            data: {
              profile,
            },
          };
        }

        const profile = createProfilePayload(input);
        transaction.set(profileRef, {
          schemaVersion: profile.schemaVersion,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          locale: profile.locale,
          theme: profile.theme,
          status: profile.status,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        setLearningEventInTransaction(transaction, firestore, {
          dedupeKey: 'user-registered',
          eventType: 'user_registered',
          now: new Date(),
          payload: { provider },
          uid: input.uid,
          verificationLevel: 'server-verified',
        });

        return {
          statusCode: 201,
          data: { profile },
        };
      });
    },
    async updateLearnerPreferences(input) {
      return firestore.runTransaction(async (transaction) => {
        const profileRef = firestore.doc(`users/${input.uid}`);
        const profileSnapshot = await transaction.get(profileRef);
        const currentProfile = profileSnapshot.exists
          ? toProfileResponse(input.uid, profileSnapshot.data() ?? {})
          : createProfilePayload(input);
        const profile: LearnerProfilePayload = {
          ...currentProfile,
          locale: input.locale ?? currentProfile.locale,
          theme: input.theme ?? currentProfile.theme,
        };

        transaction.set(
          profileRef,
          {
            ...(profileSnapshot.exists
              ? {}
              : {
                  schemaVersion: profile.schemaVersion,
                  displayName: profile.displayName,
                  avatarUrl: profile.avatarUrl,
                  status: profile.status,
                  createdAt: FieldValue.serverTimestamp(),
                }),
            locale: profile.locale,
            theme: profile.theme,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        return {
          statusCode: 200 as const,
          data: { profile },
        };
      });
    },
    async completeDemo(input) {
      const requestHash = createDemoCompletionRequestHash(input);
      const demoAccessSeed = getDemoAccessSeedByDemoId(input.demoId);
      const demoModule = demoAccessSeed ? getReleaseModule(demoAccessSeed.moduleId) : null;

      return firestore.runTransaction(async (transaction) => {
        await assertCurrentLearningContentEntities({
          allowUnpublishedCourseForUid: input.uid,
          authority: contentAuthority,
          entities: [
            { entityId: input.demoId, entityType: 'demo' },
            ...(demoModule
              ? [{ entityId: demoModule.courseId, entityType: 'course' as const }]
              : []),
            ...(demoAccessSeed
              ? [
                  { entityId: demoAccessSeed.moduleId, entityType: 'module' as const },
                  ...demoAccessSeed.requiredPostIds.map((entityId) => ({
                    entityId,
                    entityType: 'post' as const,
                  })),
                ]
              : []),
          ],
          firestore,
          transaction,
        });

        const accessRef = firestore.doc(`users/${input.uid}/contentAccess/demo_${input.demoId}`);
        const completionRef = firestore.doc(`users/${input.uid}/demoCompletions/${input.demoId}`);
        const idempotencyRef = firestore.doc(
          `users/${input.uid}/idempotencyKeys/${input.idempotencyKey}`,
        );
        const requiredPostCompletionRefs =
          demoAccessSeed?.requiredPostIds.map((postId) =>
            firestore.doc(`users/${input.uid}/postCompletions/${postId}`),
          ) ?? [];
        const [accessSnapshot, idempotencySnapshot, ...requiredPostCompletionSnapshots] =
          await Promise.all([
            transaction.get(accessRef),
            transaction.get(idempotencyRef),
            ...requiredPostCompletionRefs.map((reference) => transaction.get(reference)),
          ]);

        if (!accessSnapshot.exists) {
          throw new ApiError(403, 'DEMO_ACCESS_REQUIRED', 'Demo access is required.');
        }

        if (requiredPostCompletionSnapshots.some((snapshot) => !snapshot.exists)) {
          throw new ApiError(
            403,
            'POST_COMPLETION_REQUIRED',
            'Post completion is required before this demo.',
          );
        }

        if (idempotencySnapshot.exists) {
          const record = idempotencySnapshot.data();

          if (!isStoredIdempotencyRecord(record) || record.requestHash !== requestHash) {
            throw new ApiError(
              409,
              'IDEMPOTENCY_CONFLICT',
              'This Idempotency-Key was used for a different request.',
            );
          }

          return {
            statusCode: 200 as const,
            data: record.responseData ?? createDemoCompletionResponseData(input),
          };
        }

        const responseData = createDemoCompletionResponseData(input);

        transaction.set(
          completionRef,
          {
            schemaVersion: 1,
            status: 'completed',
            requiredStepIds: input.requiredStepIds,
            viewedStepIds: input.viewedStepIds,
            completedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        transaction.set(idempotencyRef, {
          schemaVersion: 1,
          operation: 'demo-completion',
          requestHash,
          responseData,
          statusCode: 200,
          createdAt: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromMillis(Date.now() + IDEMPOTENCY_TTL_MS),
        });
        setLearningEventInTransaction(transaction, firestore, {
          dedupeKey: `demo-completed:${input.demoId}`,
          eventType: 'demo_completed',
          now: new Date(),
          payload: {
            demoId: input.demoId,
            moduleId: input.moduleId,
          },
          uid: input.uid,
          verificationLevel: 'server-verified',
        });

        return { statusCode: 200 as const, data: responseData };
      });
    },
    async recordDemoView(input) {
      const demoSeed = getDemoCompletionSeed(input.demoId);
      const demoAccessSeed = getDemoAccessSeedByDemoId(input.demoId);
      const demoModule = demoAccessSeed ? getReleaseModule(demoAccessSeed.moduleId) : null;
      const requestedViewedStepIds = [...new Set(input.viewedStepIds)].sort((leftItem, rightItem) =>
        leftItem.localeCompare(rightItem),
      );
      const allowedStepIds = new Set(demoSeed.requiredStepIds);

      if (
        requestedViewedStepIds.length === 0 ||
        requestedViewedStepIds.some((stepId) => !allowedStepIds.has(stepId))
      ) {
        throw new ApiError(
          422,
          'DEMO_VIEW_STEP_INVALID',
          'Demo view data must reference required steps in the current demo.',
        );
      }

      return firestore.runTransaction(async (transaction) => {
        await assertCurrentLearningContentEntities({
          allowUnpublishedCourseForUid: input.uid,
          authority: contentAuthority,
          entities: [
            { entityId: input.demoId, entityType: 'demo' },
            ...(demoModule
              ? [{ entityId: demoModule.courseId, entityType: 'course' as const }]
              : []),
            ...(demoAccessSeed
              ? [{ entityId: demoAccessSeed.moduleId, entityType: 'module' as const }]
              : []),
          ],
          firestore,
          transaction,
        });

        const accessRef = firestore.doc(`users/${input.uid}/contentAccess/demo_${input.demoId}`);
        const demoViewRef = firestore.doc(`users/${input.uid}/demoViews/${input.demoId}`);
        const [accessSnapshot, demoViewSnapshot] = await Promise.all([
          transaction.get(accessRef),
          transaction.get(demoViewRef),
        ]);

        if (!accessSnapshot.exists) {
          throw new ApiError(403, 'DEMO_ACCESS_REQUIRED', 'Demo access is required.');
        }

        const viewedStepIds = [
          ...new Set([
            ...getStringArrayField(demoViewSnapshot.data(), 'viewedStepIds'),
            ...requestedViewedStepIds,
          ]),
        ].sort((leftItem, rightItem) => leftItem.localeCompare(rightItem));
        const responseData = createDemoViewResponseData({
          ...input,
          viewedStepIds,
        });

        transaction.set(
          demoViewRef,
          {
            schemaVersion: 1,
            demoId: input.demoId,
            requiredStepIds: demoSeed.requiredStepIds,
            started: true,
            status: 'in-progress',
            viewedStepIds,
            ...(demoViewSnapshot.exists ? {} : { startedAt: FieldValue.serverTimestamp() }),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        setLearningEventInTransaction(transaction, firestore, {
          dedupeKey: `demo-started:${input.demoId}`,
          eventType: 'demo_started',
          now: new Date(),
          payload: {
            demoId: input.demoId,
            ...(demoAccessSeed?.moduleId ? { moduleId: demoAccessSeed.moduleId } : {}),
          },
          uid: input.uid,
          verificationLevel: 'server-verified',
        });

        return { statusCode: 200 as const, data: responseData };
      });
    },
    async recordModuleOverview(input) {
      const module = getReleaseModule(input.moduleId);

      if (!module) {
        throw new ApiError(404, 'MODULE_NOT_FOUND', 'The requested module was not found.');
      }

      const responseData = createModuleOverviewResponseData(module);

      return firestore.runTransaction(async (transaction) => {
        await assertCurrentLearningContentEntities({
          allowUnpublishedCourseForUid: input.uid,
          authority: contentAuthority,
          entities: [
            { entityId: module.courseId, entityType: 'course' },
            { entityId: input.moduleId, entityType: 'module' },
            { entityId: responseData.moduleOverview.nextPostId, entityType: 'post' },
          ],
          firestore,
          transaction,
        });

        const accessRef = firestore.doc(
          `users/${input.uid}/contentAccess/module_${input.moduleId}`,
        );
        const moduleProgressRef = firestore.doc(
          `users/${input.uid}/moduleProgress/${input.moduleId}`,
        );
        const postAccessRef = firestore.doc(
          `users/${input.uid}/contentAccess/post_${responseData.moduleOverview.nextPostId}`,
        );
        const [accessSnapshot, moduleProgressSnapshot] = await Promise.all([
          transaction.get(accessRef),
          transaction.get(moduleProgressRef),
        ]);

        if (!accessSnapshot.exists) {
          throw new ApiError(403, 'MODULE_ACCESS_REQUIRED', 'Module access is required.');
        }

        const moduleSeed = createModuleCompletionSeed(module);
        const existingCompletedStepCount = getNumberField(
          moduleProgressSnapshot.data(),
          'completedStepCount',
        );
        const isCompleted = getStatusField(moduleProgressSnapshot.data()) === 'completed';
        const completedStepCount = isCompleted
          ? moduleSeed.requiredStepCount
          : Math.max(1, existingCompletedStepCount);

        transaction.set(
          moduleProgressRef,
          {
            schemaVersion: 1,
            courseId: module.courseId,
            moduleId: module.moduleId,
            overviewViewed: true,
            ...(getBooleanField(moduleProgressSnapshot.data(), 'overviewViewed')
              ? {}
              : { overviewViewedAt: FieldValue.serverTimestamp() }),
            ...(moduleProgressSnapshot.exists ? {} : { startedAt: FieldValue.serverTimestamp() }),
            completedStepCount,
            progressPercent: isCompleted
              ? 100
              : Math.round((completedStepCount / moduleSeed.requiredStepCount) * 100),
            requiredStepCount: moduleSeed.requiredStepCount,
            status: isCompleted ? 'completed' : 'in-progress',
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        transaction.set(
          postAccessRef,
          {
            schemaVersion: 1,
            contentType: 'post',
            entityId: responseData.moduleOverview.nextPostId,
            grantedAt: FieldValue.serverTimestamp(),
            reason: 'module-overview',
            sourceProgressId: `moduleProgress/${module.moduleId}`,
          },
          { merge: true },
        );
        setLearningEventInTransaction(transaction, firestore, {
          dedupeKey: `module-overview-viewed:${input.moduleId}`,
          eventType: 'module_overview_viewed',
          now: new Date(),
          payload: {
            courseId: module.courseId,
            moduleId: input.moduleId,
          },
          uid: input.uid,
          verificationLevel: 'server-verified',
        });
        setLearningEventInTransaction(transaction, firestore, {
          dedupeKey: `module-started:${input.moduleId}`,
          eventType: 'module_started',
          now: new Date(),
          payload: {
            courseId: module.courseId,
            moduleId: input.moduleId,
          },
          uid: input.uid,
          verificationLevel: 'server-verified',
        });

        return { statusCode: 200 as const, data: responseData };
      });
    },
    async recordPostView(input) {
      const manifest = getPostViewManifest(input.postId);

      if (!manifest) {
        throw new ApiError(404, 'POST_NOT_FOUND', 'The requested post was not found.');
      }

      const moduleId = getModuleIdForPost(input.postId);
      const module = moduleId ? getReleaseModule(moduleId) : null;
      const requestedViewedItemIds = [...new Set(input.viewedItemIds)].sort((leftItem, rightItem) =>
        leftItem.localeCompare(rightItem),
      );
      const allowedBlockIds = new Set(manifest.requiredBlockIds);

      if (
        !allowedBlockIds.has(input.readingPosition) ||
        requestedViewedItemIds.some((itemId) => !allowedBlockIds.has(itemId))
      ) {
        throw new ApiError(
          422,
          'POST_VIEW_BLOCK_INVALID',
          'Post view data must reference required blocks in the current post.',
        );
      }

      return firestore.runTransaction(async (transaction) => {
        await assertCurrentLearningContentEntities({
          allowUnpublishedCourseForUid: input.uid,
          authority: contentAuthority,
          entities: [
            { entityId: input.postId, entityType: 'post' },
            ...(module ? [{ entityId: module.courseId, entityType: 'course' as const }] : []),
            ...(moduleId ? [{ entityId: moduleId, entityType: 'module' as const }] : []),
          ],
          firestore,
          transaction,
        });

        const accessRef = firestore.doc(`users/${input.uid}/contentAccess/post_${input.postId}`);
        const postViewRef = firestore.doc(`users/${input.uid}/postViews/${input.postId}`);
        const [accessSnapshot, postViewSnapshot] = await Promise.all([
          transaction.get(accessRef),
          transaction.get(postViewRef),
        ]);

        if (!accessSnapshot.exists) {
          throw new ApiError(403, 'POST_ACCESS_REQUIRED', 'Post access is required.');
        }

        const viewedItemIds = [
          ...new Set([
            ...getStringArrayField(postViewSnapshot.data(), 'viewedItemIds'),
            ...requestedViewedItemIds,
          ]),
        ].sort((leftItem, rightItem) => leftItem.localeCompare(rightItem));
        const contentViewed = manifest.requiredBlockIds.every((blockId) =>
          viewedItemIds.includes(blockId),
        );
        const previousContentViewed = getBooleanField(postViewSnapshot.data(), 'contentViewed');
        const responseData = createPostViewResponseData({
          contentViewed,
          postId: input.postId,
          readingPosition: input.readingPosition,
          viewedItemIds,
        });

        transaction.set(
          postViewRef,
          {
            schemaVersion: 1,
            postId: input.postId,
            requiredBlockIds: manifest.requiredBlockIds,
            readingPosition: input.readingPosition,
            started: true,
            contentViewed,
            status: contentViewed ? 'content-viewed' : 'in-progress',
            viewedItemIds,
            ...(postViewSnapshot.exists ? {} : { startedAt: FieldValue.serverTimestamp() }),
            ...(contentViewed && !previousContentViewed
              ? { contentViewedAt: FieldValue.serverTimestamp() }
              : {}),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        setLearningEventInTransaction(transaction, firestore, {
          dedupeKey: `post-started:${input.postId}`,
          eventType: 'post_started',
          now: new Date(),
          payload: {
            ...(module ? { courseId: module.courseId } : {}),
            postId: input.postId,
            revisionId: `post-${input.postId}-rev-r1`,
          },
          uid: input.uid,
          verificationLevel: 'server-verified',
        });
        if (contentViewed && !previousContentViewed) {
          setLearningEventInTransaction(transaction, firestore, {
            dedupeKey: `post-content-viewed:${input.postId}`,
            eventType: 'post_content_viewed',
            now: new Date(),
            payload: {
              postId: input.postId,
              viewedBlockCount: viewedItemIds.length,
            },
            uid: input.uid,
            verificationLevel: 'server-verified',
          });
        }

        return { statusCode: 200 as const, data: responseData };
      });
    },
    async completePost(input) {
      const post = getReleasePost(input.postId);

      if (!post) {
        throw new ApiError(404, 'POST_NOT_FOUND', 'The requested post was not found.');
      }

      const moduleId = getModuleIdForPost(post.postId);

      if (!moduleId) {
        throw new ApiError(409, 'POST_MODULE_REQUIRED', 'The requested post is missing a module.');
      }

      const module = getReleaseModule(moduleId);
      const requestHash = createPostCompletionRequestHash(input);
      const nextPostId = getNextPostIdInModule(moduleId, post.postId);
      const demoAccessSeed = getDemoAccessSeedByPostId(post.postId);
      const siblingCompletionRefs =
        demoAccessSeed?.requiredPostIds
          .filter((postId) => postId !== post.postId)
          .map((postId) => firestore.doc(`users/${input.uid}/postCompletions/${postId}`)) ?? [];

      return firestore.runTransaction(async (transaction) => {
        await assertCurrentLearningContentEntities({
          allowUnpublishedCourseForUid: input.uid,
          authority: contentAuthority,
          entities: [
            { entityId: post.postId, entityType: 'post' },
            ...(module ? [{ entityId: module.courseId, entityType: 'course' as const }] : []),
            { entityId: moduleId, entityType: 'module' },
            { entityId: post.postQuizId, entityType: 'quiz' },
          ],
          firestore,
          transaction,
        });

        const accessRef = firestore.doc(`users/${input.uid}/contentAccess/post_${input.postId}`);
        const postViewRef = firestore.doc(`users/${input.uid}/postViews/${input.postId}`);
        const quizProgressRef = firestore.doc(`users/${input.uid}/quizProgress/${post.postQuizId}`);
        const completionRef = firestore.doc(`users/${input.uid}/postCompletions/${input.postId}`);
        const idempotencyRef = firestore.doc(
          `users/${input.uid}/idempotencyKeys/${input.idempotencyKey}`,
        );
        const [
          accessSnapshot,
          postViewSnapshot,
          quizProgressSnapshot,
          idempotencySnapshot,
          ...siblingCompletionSnapshots
        ] = await Promise.all([
          transaction.get(accessRef),
          transaction.get(postViewRef),
          transaction.get(quizProgressRef),
          transaction.get(idempotencyRef),
          ...siblingCompletionRefs.map((reference) => transaction.get(reference)),
        ]);

        if (!accessSnapshot.exists) {
          throw new ApiError(403, 'POST_ACCESS_REQUIRED', 'Post access is required.');
        }

        if (!getBooleanField(postViewSnapshot.data(), 'contentViewed')) {
          throw new ApiError(
            403,
            'POST_CONTENT_VIEW_REQUIRED',
            'All required post blocks must be viewed before completion.',
          );
        }

        if (!getBooleanField(quizProgressSnapshot.data(), 'passed')) {
          throw new ApiError(
            403,
            'POST_QUIZ_PASS_REQUIRED',
            'A passed post quiz is required before completion.',
          );
        }

        if (idempotencySnapshot.exists) {
          const record = idempotencySnapshot.data();

          if (!isStoredIdempotencyRecord(record) || record.requestHash !== requestHash) {
            throw new ApiError(
              409,
              'IDEMPOTENCY_CONFLICT',
              'This Idempotency-Key was used for a different request.',
            );
          }

          return {
            statusCode: 200 as const,
            data:
              (record.responseData as PostCompletionResponseData | undefined) ??
              createPostCompletionResponseData(input.postId),
          };
        }

        const shouldGrantDemo =
          demoAccessSeed !== null &&
          areAllOtherRequiredPostsComplete({
            completedPostId: input.postId,
            requiredPostIds: demoAccessSeed.requiredPostIds,
            snapshots: siblingCompletionSnapshots,
          });

        await assertCurrentLearningContentEntities({
          authority: contentAuthority,
          entities: [
            ...(nextPostId ? [{ entityId: nextPostId, entityType: 'post' as const }] : []),
            ...(shouldGrantDemo && demoAccessSeed
              ? [{ entityId: demoAccessSeed.demoId, entityType: 'demo' as const }]
              : []),
          ],
          firestore,
          transaction,
        });

        const responseData = createPostCompletionResponseData(input.postId);

        transaction.set(
          completionRef,
          {
            schemaVersion: 1,
            completedAt: FieldValue.serverTimestamp(),
            postId: input.postId,
            quizId: post.postQuizId,
            status: 'completed',
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        if (nextPostId) {
          transaction.set(
            firestore.doc(`users/${input.uid}/contentAccess/post_${nextPostId}`),
            {
              schemaVersion: 1,
              contentType: 'post',
              entityId: nextPostId,
              grantedAt: FieldValue.serverTimestamp(),
              reason: 'post-completed',
              sourceProgressId: `postCompletions/${input.postId}`,
            },
            { merge: true },
          );
        }

        if (shouldGrantDemo && demoAccessSeed) {
          transaction.set(
            firestore.doc(`users/${input.uid}/contentAccess/demo_${demoAccessSeed.demoId}`),
            {
              schemaVersion: 1,
              contentType: 'demo',
              entityId: demoAccessSeed.demoId,
              grantedAt: FieldValue.serverTimestamp(),
              reason: 'post-completed',
              sourceProgressId: `postCompletions/${input.postId}`,
            },
            { merge: true },
          );
        }

        transaction.set(idempotencyRef, {
          schemaVersion: 1,
          operation: 'post-completion',
          requestHash,
          responseData,
          statusCode: 200,
          createdAt: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromMillis(Date.now() + IDEMPOTENCY_TTL_MS),
        });
        setLearningEventInTransaction(transaction, firestore, {
          dedupeKey: `post-completed:${input.postId}`,
          eventType: 'post_completed',
          now: new Date(),
          payload: {
            ...(module?.courseId ? { courseId: module.courseId } : {}),
            moduleId,
            postId: input.postId,
          },
          uid: input.uid,
          verificationLevel: 'server-verified',
        });

        return { statusCode: 200 as const, data: responseData };
      });
    },
    async createQuizAttempt(input) {
      const manifest = getQuizManifest(input.quizId);
      const attemptId = `attempt_${randomUUID()}`;
      const expiresAt = Timestamp.fromMillis(Date.now() + QUIZ_ATTEMPT_TTL_MS);
      const expiresAtIso = expiresAt.toDate().toISOString();

      return firestore.runTransaction(async (transaction) => {
        await assertQuizAttemptContentIsActive({
          authority: contentAuthority,
          firestore,
          manifest,
          transaction,
          uid: input.uid,
        });

        const accessRef =
          manifest.quizKind === 'post' && manifest.postId
            ? firestore.doc(`users/${input.uid}/contentAccess/post_${manifest.postId}`)
            : firestore.doc(`users/${input.uid}/contentAccess/module_${manifest.moduleId}`);
        const postViewRef =
          manifest.quizKind === 'post' && manifest.postId
            ? firestore.doc(`users/${input.uid}/postViews/${manifest.postId}`)
            : null;
        const progressRef = firestore.doc(`users/${input.uid}/quizProgress/${input.quizId}`);
        const attemptRef = firestore.doc(`users/${input.uid}/quizAttempts/${attemptId}`);
        const demoCompletionRef = manifest.demoId
          ? firestore.doc(`users/${input.uid}/demoCompletions/${manifest.demoId}`)
          : null;
        const requiredPostCompletionRefs =
          manifest.quizKind === 'module'
            ? getRequiredPostCompletionIdsForModule(manifest.moduleId).map((postId) =>
                firestore.doc(`users/${input.uid}/postCompletions/${postId}`),
              )
            : [];
        const [
          accessSnapshot,
          progressSnapshot,
          postViewSnapshot,
          demoCompletionSnapshot,
          ...requiredPostCompletionSnapshots
        ] = await Promise.all([
          transaction.get(accessRef),
          transaction.get(progressRef),
          postViewRef ? transaction.get(postViewRef) : Promise.resolve(null),
          demoCompletionRef ? transaction.get(demoCompletionRef) : Promise.resolve(null),
          ...requiredPostCompletionRefs.map((reference) => transaction.get(reference)),
        ]);

        if (!accessSnapshot.exists) {
          throw new ApiError(403, 'CONTENT_ACCESS_REQUIRED', 'Quiz access is required.');
        }

        if (postViewRef && !getBooleanField(postViewSnapshot?.data(), 'contentViewed')) {
          throw new ApiError(
            403,
            'POST_CONTENT_VIEW_REQUIRED',
            'All required post blocks must be viewed before starting this quiz.',
          );
        }

        if (requiredPostCompletionSnapshots.some((snapshot) => !snapshot.exists)) {
          throw new ApiError(
            403,
            'POST_COMPLETION_REQUIRED',
            'Post completion is required before this quiz.',
          );
        }

        if (demoCompletionRef && !demoCompletionSnapshot?.exists) {
          throw new ApiError(
            403,
            'DEMO_COMPLETION_REQUIRED',
            'Demo completion is required before this quiz.',
          );
        }

        const attemptNumber = getStoredAttemptCount(progressSnapshot.data()) + 1;
        const shuffleSeed =
          attemptNumber === 1 ? null : `${input.uid}:${manifest.quizId}:${attemptNumber}`;
        const responseData = createQuizAttemptPayload({
          attemptId,
          attemptNumber,
          expiresAtIso,
          quizId: input.quizId,
          shuffleSeed,
        });

        transaction.set(attemptRef, {
          schemaVersion: 1,
          attemptNumber,
          createdAt: FieldValue.serverTimestamp(),
          expiresAt,
          optionOrderByQuestionId: Object.fromEntries(
            responseData.questions.map((question) => [
              question.questionId,
              question.options.map((option) => option.optionId),
            ]),
          ),
          questionIds: responseData.questions.map((question) => question.questionId),
          quizId: input.quizId,
          quizKind: manifest.quizKind,
          quizRevisionId: manifest.quizRevisionId,
          shuffleSeed,
          status: 'in-progress',
          submittedAt: null,
        });
        transaction.set(
          progressRef,
          {
            schemaVersion: 1,
            attemptCount: attemptNumber,
            bestScore: getStoredBestScore(progressSnapshot.data()),
            passed: isStoredQuizProgress(progressSnapshot.data())
              ? progressSnapshot.data()?.passed === true
              : false,
            updatedAt: FieldValue.serverTimestamp(),
            wrongCounts: getStoredWrongCounts(progressSnapshot.data()),
          },
          { merge: true },
        );

        return { statusCode: 201 as const, data: responseData };
      });
    },
    async deleteLearnerAccount(input) {
      const [ownedDocumentRefs, eventDocumentRefs] = await Promise.all([
        listLearnerSubcollectionDocumentRefs(firestore, input.uid),
        listLearnerEventDocumentRefs(firestore, input.uid),
      ]);

      await deleteDocumentsInBatches(firestore, [...ownedDocumentRefs, ...eventDocumentRefs]);
      await firestore.runTransaction(async (transaction) => {
        transaction.set(firestore.doc(`users/${input.uid}`), {
          ...createAnonymizedProfilePayload(),
          anonymizedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      return {
        statusCode: 204 as const,
        data: null,
      };
    },
    async enrollLearner(input) {
      const seed = getEnrollmentSeed(input.courseId);
      const requestHash = createEnrollmentRequestHash(input);

      return firestore.runTransaction(async (transaction) => {
        await assertCurrentLearningContentEntities({
          authority: contentAuthority,
          entities: [
            { entityId: seed.courseId, entityType: 'course' },
            { entityId: seed.firstModuleId, entityType: 'module' },
          ],
          firestore,
          transaction,
        });

        const profileRef = firestore.doc(`users/${input.uid}`);
        const enrollmentRef = firestore.doc(`users/${input.uid}/enrollments/${input.courseId}`);
        const idempotencyRef = firestore.doc(
          `users/${input.uid}/idempotencyKeys/${input.idempotencyKey}`,
        );
        const [idempotencySnapshot, profileSnapshot, enrollmentSnapshot] = await Promise.all([
          transaction.get(idempotencyRef),
          transaction.get(profileRef),
          transaction.get(enrollmentRef),
        ]);

        if (idempotencySnapshot.exists) {
          const record = idempotencySnapshot.data();

          if (!isStoredIdempotencyRecord(record) || record.requestHash !== requestHash) {
            throw new ApiError(
              409,
              'IDEMPOTENCY_CONFLICT',
              'This Idempotency-Key was used for a different request.',
            );
          }

          return {
            statusCode: record.statusCode === 200 ? 200 : 201,
            data: record.responseData ?? createEnrollmentResponseData(seed),
          };
        }

        if (!profileSnapshot.exists) {
          const profile = createProfilePayload({
            uid: input.uid,
            displayName: input.displayName,
          });

          transaction.set(profileRef, {
            schemaVersion: profile.schemaVersion,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
            locale: profile.locale,
            theme: profile.theme,
            status: profile.status,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        const responseData = createEnrollmentResponseData(seed);
        const statusCode = enrollmentSnapshot.exists ? 200 : 201;

        if (!enrollmentSnapshot.exists) {
          transaction.set(enrollmentRef, {
            schemaVersion: 1,
            status: 'in-progress',
            startedAt: FieldValue.serverTimestamp(),
            completedAt: null,
            progressPercent: 0,
            courseRevisionId: seed.courseRevisionId,
            updatedAt: FieldValue.serverTimestamp(),
          });
          transaction.set(
            firestore.doc(`users/${input.uid}/contentAccess/module_${seed.firstModuleId}`),
            {
              schemaVersion: 1,
              contentType: 'module',
              entityId: seed.firstModuleId,
              grantedAt: FieldValue.serverTimestamp(),
              reason: 'course-enrollment',
              sourceProgressId: `enrollments/${input.courseId}`,
            },
          );
        }

        transaction.set(idempotencyRef, {
          schemaVersion: 1,
          operation: 'course-enrollment',
          requestHash,
          responseData,
          statusCode,
          createdAt: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromMillis(Date.now() + IDEMPOTENCY_TTL_MS),
        });
        if (!enrollmentSnapshot.exists) {
          setLearningEventInTransaction(transaction, firestore, {
            dedupeKey: `course-enrolled:${input.courseId}`,
            eventType: 'course_enrolled',
            now: new Date(),
            payload: { courseId: input.courseId },
            uid: input.uid,
            verificationLevel: 'server-verified',
          });
          setLearningEventInTransaction(transaction, firestore, {
            dedupeKey: `course-started:${input.courseId}`,
            eventType: 'course_started',
            now: new Date(),
            payload: { courseId: input.courseId },
            uid: input.uid,
            verificationLevel: 'server-verified',
          });
        }

        return { statusCode, data: responseData };
      });
    },
    async getProgress(input) {
      const knownDocumentIds = getKnownProgressDocumentIds();
      const [
        algorithmUnlocks,
        contentAccess,
        demoCompletions,
        demoViews,
        enrollments,
        moduleCompletions,
        moduleProgress,
        postCompletions,
        postViews,
        quizProgress,
        learningEvents,
        playgroundRuns,
      ] = await Promise.all([
        readUserSubcollectionData(
          firestore,
          input.uid,
          'algorithmUnlocks',
          knownDocumentIds.algorithmUnlocks,
        ),
        readUserSubcollectionData(
          firestore,
          input.uid,
          'contentAccess',
          knownDocumentIds.contentAccess,
        ),
        readUserSubcollectionData(
          firestore,
          input.uid,
          'demoCompletions',
          knownDocumentIds.demoCompletions,
        ),
        readUserSubcollectionData(firestore, input.uid, 'demoViews', knownDocumentIds.demoViews),
        readUserSubcollectionData(
          firestore,
          input.uid,
          'enrollments',
          knownDocumentIds.enrollments,
        ),
        readUserSubcollectionData(
          firestore,
          input.uid,
          'moduleCompletions',
          knownDocumentIds.moduleCompletions,
        ),
        readUserSubcollectionData(
          firestore,
          input.uid,
          'moduleProgress',
          knownDocumentIds.moduleProgress,
        ),
        readUserSubcollectionData(
          firestore,
          input.uid,
          'postCompletions',
          knownDocumentIds.postCompletions,
        ),
        readUserSubcollectionData(firestore, input.uid, 'postViews', knownDocumentIds.postViews),
        readUserSubcollectionData(
          firestore,
          input.uid,
          'quizProgress',
          knownDocumentIds.quizProgress,
        ),
        readLearnerLearningEvents(firestore, input.uid),
        readLearnerPlaygroundRuns(firestore, input.uid),
      ]);

      return {
        statusCode: 200 as const,
        data: createLearningProgressSnapshot({
          algorithmUnlocks,
          contentAccess,
          demoCompletions,
          demoViews,
          enrollments,
          moduleCompletions,
          moduleProgress,
          postCompletions,
          postViews,
          playgroundActivity: createPlaygroundActivity({ learningEvents, playgroundRuns }),
          quizProgress,
        }),
      };
    },
    async getLearnerAccountStatus(input) {
      const profileSnapshot = await firestore.doc(`users/${input.uid}`).get();
      const status = profileSnapshot.exists
        ? toProfileResponse(input.uid, profileSnapshot.data() ?? {}).status
        : 'active';

      return {
        data: { status },
        statusCode: 200 as const,
      };
    },
    async submitQuizAttempt(input) {
      const requestHash = createQuizSubmissionRequestHash(input);

      return firestore.runTransaction(async (transaction) => {
        const attemptRef = firestore.doc(`users/${input.uid}/quizAttempts/${input.attemptId}`);
        const idempotencyRef = firestore.doc(
          `users/${input.uid}/idempotencyKeys/${input.idempotencyKey}`,
        );
        const [attemptSnapshot, idempotencySnapshot] = await Promise.all([
          transaction.get(attemptRef),
          transaction.get(idempotencyRef),
        ]);

        if (idempotencySnapshot.exists) {
          const record = idempotencySnapshot.data();

          if (!isStoredIdempotencyRecord(record) || record.requestHash !== requestHash) {
            throw new ApiError(
              409,
              'IDEMPOTENCY_CONFLICT',
              'This Idempotency-Key was used for a different request.',
            );
          }

          return {
            statusCode: 200 as const,
            data: record.responseData,
          };
        }

        if (!attemptSnapshot.exists) {
          throw new ApiError(404, 'QUIZ_ATTEMPT_NOT_FOUND', 'Quiz attempt was not found.');
        }

        const attemptData = attemptSnapshot.data();

        if (!isStoredQuizAttempt(attemptData) || typeof attemptData.quizId !== 'string') {
          throw new ApiError(409, 'QUIZ_ATTEMPT_INVALID', 'Quiz attempt is invalid.');
        }

        const manifest = getQuizManifest(attemptData.quizId);

        await assertQuizAttemptContentIsActive({
          authority: contentAuthority,
          firestore,
          manifest,
          transaction,
          uid: input.uid,
        });

        if (attemptData.quizRevisionId !== manifest.quizRevisionId) {
          throw new ApiError(409, 'QUIZ_REVISION_MISMATCH', 'Quiz attempt revision is stale.');
        }

        if (attemptData.status !== 'in-progress') {
          throw new ApiError(409, 'QUIZ_ATTEMPT_ALREADY_SUBMITTED', 'Quiz attempt is closed.');
        }

        const expiresAtMillis = getTimestampMillis(attemptData.expiresAt);

        if (expiresAtMillis !== null && expiresAtMillis < Date.now()) {
          throw new ApiError(409, 'QUIZ_ATTEMPT_EXPIRED', 'Quiz attempt has expired.');
        }

        const moduleSeed = getModuleCompletionSeedByQuizId(manifest.quizId);
        const progressRef = firestore.doc(`users/${input.uid}/quizProgress/${manifest.quizId}`);
        const moduleCompletionRef = moduleSeed
          ? firestore.doc(`users/${input.uid}/moduleCompletions/${moduleSeed.moduleId}`)
          : null;
        const enrollmentRef = moduleSeed
          ? firestore.doc(`users/${input.uid}/enrollments/${moduleSeed.courseId}`)
          : null;
        const moduleDemoCompletionRef =
          moduleSeed && manifest.demoId
            ? firestore.doc(`users/${input.uid}/demoCompletions/${manifest.demoId}`)
            : null;
        const moduleRequiredPostCompletionRefs = moduleSeed
          ? moduleSeed.requiredPostIds.map((postId) =>
              firestore.doc(`users/${input.uid}/postCompletions/${postId}`),
            )
          : [];
        const nextPostId =
          manifest.quizKind === 'post' && manifest.postId
            ? getNextPostIdInModule(manifest.moduleId, manifest.postId)
            : null;
        const postDemoAccessSeed =
          manifest.quizKind === 'post' && manifest.postId
            ? getDemoAccessSeedByPostId(manifest.postId)
            : null;
        const postDemoSiblingCompletionRefs =
          postDemoAccessSeed && manifest.postId
            ? postDemoAccessSeed.requiredPostIds
                .filter((postId) => postId !== manifest.postId)
                .map((postId) => firestore.doc(`users/${input.uid}/postCompletions/${postId}`))
            : [];
        const [
          progressSnapshot,
          enrollmentSnapshot,
          moduleDemoCompletionSnapshot,
          ...completionSnapshots
        ] = await Promise.all([
          transaction.get(progressRef),
          enrollmentRef ? transaction.get(enrollmentRef) : Promise.resolve(null),
          moduleDemoCompletionRef
            ? transaction.get(moduleDemoCompletionRef)
            : Promise.resolve(null),
          ...moduleRequiredPostCompletionRefs.map((reference) => transaction.get(reference)),
          ...postDemoSiblingCompletionRefs.map((reference) => transaction.get(reference)),
        ]);
        const moduleRequiredPostCompletionSnapshots = completionSnapshots.slice(
          0,
          moduleRequiredPostCompletionRefs.length,
        );
        const postDemoSiblingCompletionSnapshots = completionSnapshots.slice(
          moduleRequiredPostCompletionRefs.length,
        );
        const previousProgress = progressSnapshot.data();
        const grade = gradeQuizSubmission({
          answers: input.answers,
          previousWrongCounts: getStoredWrongCounts(previousProgress),
          questionIds: getStoredQuestionIds(attemptData),
          quizId: manifest.quizId,
        });
        const bestScore = Math.max(getStoredBestScore(previousProgress), grade.score);
        const hasAlreadyPassed =
          isStoredQuizProgress(previousProgress) && previousProgress.passed === true;
        const responseData = createQuizSubmissionResponseData({
          bestScore,
          feedback: grade.feedback,
          newlyUnlocked: grade.newlyUnlocked,
          passed: grade.passed,
          score: grade.score,
        });

        if (
          grade.passed &&
          moduleSeed &&
          (moduleRequiredPostCompletionSnapshots.some((snapshot) => !snapshot.exists) ||
            (moduleDemoCompletionRef !== null && !moduleDemoCompletionSnapshot?.exists))
        ) {
          throw new ApiError(
            403,
            'MODULE_COMPLETION_PREREQUISITES_REQUIRED',
            'Post and demo completion are required before completing this module.',
          );
        }

        const hasNewlyPassedPost =
          grade.passed && grade.newlyUnlocked.some((unlocked) => unlocked.type === 'post');
        const shouldGrantPostDemo =
          hasNewlyPassedPost &&
          postDemoAccessSeed !== null &&
          areAllOtherRequiredPostsComplete({
            completedPostId: manifest.postId ?? '',
            requiredPostIds: postDemoAccessSeed.requiredPostIds,
            snapshots: postDemoSiblingCompletionSnapshots,
          });

        await assertCurrentLearningContentEntities({
          authority: contentAuthority,
          entities: [
            ...(grade.passed && moduleSeed?.nextModuleId
              ? [{ entityId: moduleSeed.nextModuleId, entityType: 'module' as const }]
              : []),
            ...(hasNewlyPassedPost && nextPostId
              ? [{ entityId: nextPostId, entityType: 'post' as const }]
              : []),
            ...(shouldGrantPostDemo && postDemoAccessSeed
              ? [{ entityId: postDemoAccessSeed.demoId, entityType: 'demo' as const }]
              : []),
          ],
          firestore,
          transaction,
        });

        transaction.set(
          attemptRef,
          {
            answers: input.answers.map((answer) => ({
              questionId: answer.questionId,
              value: Array.isArray(answer.value) ? [...answer.value] : answer.value,
            })),
            bestScore,
            passed: grade.passed,
            score: grade.score,
            status: 'submitted',
            submittedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        transaction.set(
          progressRef,
          {
            schemaVersion: 1,
            bestScore,
            passed: hasAlreadyPassed || grade.passed,
            ...(grade.passed && !hasAlreadyPassed
              ? { passedAt: FieldValue.serverTimestamp() }
              : {}),
            updatedAt: FieldValue.serverTimestamp(),
            wrongCounts: grade.nextWrongCounts,
          },
          { merge: true },
        );

        if (grade.passed) {
          if (moduleSeed && moduleCompletionRef && enrollmentRef) {
            const enrollmentProgressPercent = Math.round(
              (moduleSeed.completedModuleCount / moduleSeed.requiredModuleCount) * 100,
            );

            transaction.set(
              moduleCompletionRef,
              {
                schemaVersion: 1,
                courseId: moduleSeed.courseId,
                moduleId: moduleSeed.moduleId,
                moduleQuizId: moduleSeed.moduleQuizId,
                moduleRevisionId: moduleSeed.moduleRevisionId,
                status: 'completed',
                completedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
            transaction.set(
              firestore.doc(`users/${input.uid}/moduleProgress/${moduleSeed.moduleId}`),
              {
                schemaVersion: 1,
                courseId: moduleSeed.courseId,
                moduleId: moduleSeed.moduleId,
                completedStepCount: moduleSeed.requiredStepCount,
                progressPercent: 100,
                requiredStepCount: moduleSeed.requiredStepCount,
                status: 'completed',
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
            transaction.set(
              enrollmentRef,
              {
                schemaVersion: 1,
                courseId: moduleSeed.courseId,
                progressPercent: enrollmentProgressPercent,
                status: enrollmentProgressPercent >= 100 ? 'completed' : 'in-progress',
                ...(enrollmentProgressPercent >= 100 && enrollmentSnapshot?.exists
                  ? { completedAt: FieldValue.serverTimestamp() }
                  : {}),
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true },
            );

            setLearningEventInTransaction(transaction, firestore, {
              dedupeKey: `module-completed:${moduleSeed.moduleId}`,
              eventType: 'module_completed',
              now: new Date(),
              payload: {
                courseId: moduleSeed.courseId,
                moduleId: moduleSeed.moduleId,
              },
              uid: input.uid,
              verificationLevel: 'server-verified',
            });

            if (enrollmentProgressPercent >= 100) {
              setLearningEventInTransaction(transaction, firestore, {
                dedupeKey: `course-completed:${moduleSeed.courseId}`,
                eventType: 'course_completed',
                now: new Date(),
                payload: { courseId: moduleSeed.courseId },
                uid: input.uid,
                verificationLevel: 'server-verified',
              });
            }

            if (moduleSeed.nextModuleId) {
              transaction.set(
                firestore.doc(`users/${input.uid}/contentAccess/module_${moduleSeed.nextModuleId}`),
                {
                  schemaVersion: 1,
                  contentType: 'module',
                  entityId: moduleSeed.nextModuleId,
                  grantedAt: FieldValue.serverTimestamp(),
                  reason: 'module-completed',
                  sourceProgressId: `moduleCompletions/${moduleSeed.moduleId}`,
                },
                { merge: true },
              );
            }
          }

          for (const unlocked of grade.newlyUnlocked) {
            if (unlocked.type === 'post') {
              const demoAccessSeed = getDemoAccessSeedByPostId(unlocked.id);

              transaction.set(
                firestore.doc(`users/${input.uid}/postCompletions/${unlocked.id}`),
                {
                  schemaVersion: 1,
                  completedAt: FieldValue.serverTimestamp(),
                  postId: unlocked.id,
                  quizId: manifest.quizId,
                  status: 'completed',
                  updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true },
              );

              if (nextPostId) {
                transaction.set(
                  firestore.doc(`users/${input.uid}/contentAccess/post_${nextPostId}`),
                  {
                    schemaVersion: 1,
                    contentType: 'post',
                    entityId: nextPostId,
                    grantedAt: FieldValue.serverTimestamp(),
                    reason: 'post-completed',
                    sourceProgressId: `postCompletions/${unlocked.id}`,
                  },
                  { merge: true },
                );
              }

              if (shouldGrantPostDemo && demoAccessSeed) {
                transaction.set(
                  firestore.doc(`users/${input.uid}/contentAccess/demo_${demoAccessSeed.demoId}`),
                  {
                    schemaVersion: 1,
                    contentType: 'demo',
                    entityId: demoAccessSeed.demoId,
                    grantedAt: FieldValue.serverTimestamp(),
                    reason: 'post-completed',
                    sourceProgressId: `postCompletions/${unlocked.id}`,
                  },
                  { merge: true },
                );
              }

              setLearningEventInTransaction(transaction, firestore, {
                dedupeKey: `post-completed:${unlocked.id}`,
                eventType: 'post_completed',
                now: new Date(),
                payload: {
                  ...(moduleSeed ? { courseId: moduleSeed.courseId } : {}),
                  moduleId: manifest.moduleId,
                  postId: unlocked.id,
                },
                uid: input.uid,
                verificationLevel: 'server-verified',
              });
            }

            if (unlocked.type === 'algorithm') {
              transaction.set(
                firestore.doc(`users/${input.uid}/algorithmUnlocks/${unlocked.id}`),
                {
                  schemaVersion: 1,
                  algorithmId: unlocked.id,
                  moduleId: moduleSeed?.moduleId ?? manifest.moduleId,
                  moduleRevisionId: moduleSeed?.moduleRevisionId ?? `${manifest.moduleId}-rev-r1`,
                  grantedAt: FieldValue.serverTimestamp(),
                  quizId: manifest.quizId,
                  reason: moduleSeed ? 'module-completed' : 'module-quiz-passed',
                  sourceModuleId: moduleSeed?.moduleId ?? manifest.moduleId,
                  unlockedAt: FieldValue.serverTimestamp(),
                },
                { merge: true },
              );
              setLearningEventInTransaction(transaction, firestore, {
                dedupeKey: `algorithm-unlocked:${unlocked.id}`,
                eventType: 'algorithm_unlocked',
                now: new Date(),
                payload: {
                  algorithmId: unlocked.id,
                  moduleId: moduleSeed?.moduleId ?? manifest.moduleId,
                },
                uid: input.uid,
                verificationLevel: 'server-verified',
              });
            }
          }
        }

        setLearningEventInTransaction(transaction, firestore, {
          dedupeKey: `quiz-submitted:${input.attemptId}`,
          eventType:
            manifest.quizKind === 'module' ? 'module_quiz_submitted' : 'post_quiz_submitted',
          now: new Date(),
          payload: {
            attemptNo: getNumberField(attemptData, 'attemptNumber'),
            passed: grade.passed,
            ...(manifest.postId ? { postId: manifest.postId } : {}),
            quizId: manifest.quizId,
            quizRevisionId: manifest.quizRevisionId,
            score: grade.score,
          },
          uid: input.uid,
          verificationLevel: 'server-verified',
        });

        transaction.set(idempotencyRef, {
          schemaVersion: 1,
          operation: 'quiz-submission',
          requestHash,
          responseData,
          statusCode: 200,
          createdAt: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromMillis(Date.now() + IDEMPOTENCY_TTL_MS),
        });

        return { statusCode: 200 as const, data: responseData };
      });
    },
  };
}

export function createDefaultLearningRepository(): LearningRepository {
  return createFirestoreLearningRepository(getFirestore(getFirebaseAdminApp()));
}
