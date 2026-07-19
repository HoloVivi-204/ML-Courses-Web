import { randomUUID } from 'node:crypto';

import { FieldValue, getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';

import { ApiError } from './api-error.js';
import { getFirebaseAdminApp } from './firebase-admin-app.js';
import {
  createQuizAttemptPayload,
  getQuizManifest,
  gradeQuizSubmission,
  type QuizAnswer,
  type StoredQuestionWrongCounts,
} from './quiz-manifest.js';

export interface BootstrapLearnerInput {
  displayName: string;
  uid: string;
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

export interface CreateQuizAttemptInput {
  quizId: string;
  uid: string;
}

export interface SubmitQuizAttemptInput {
  answers: readonly QuizAnswer[];
  attemptId: string;
  idempotencyKey: string;
  uid: string;
}

export interface LearningRepository {
  bootstrapLearner(input: BootstrapLearnerInput): Promise<{
    data: unknown;
    statusCode: 200 | 201;
  }>;
  completeDemo(input: CompleteDemoInput): Promise<{
    data: unknown;
    statusCode: 200;
  }>;
  createQuizAttempt(input: CreateQuizAttemptInput): Promise<{
    data: unknown;
    statusCode: 201;
  }>;
  enrollLearner(input: EnrollLearnerInput): Promise<{
    data: unknown;
    statusCode: 200 | 201;
  }>;
  submitQuizAttempt(input: SubmitQuizAttemptInput): Promise<{
    data: unknown;
    statusCode: 200;
  }>;
}

interface EnrollmentSeed {
  courseId: string;
  courseRevisionId: string;
  firstModuleId: string;
  firstPostId: string;
  nextPath: string;
}

interface LearnerProfilePayload {
  avatarUrl: string | null;
  displayName: string;
  locale: 'en' | 'vi';
  schemaVersion: 1;
  status: 'active' | 'anonymized' | 'deletion-pending';
  theme: 'dark' | 'light' | 'system';
  uid: string;
}

interface EnrollmentResponseData {
  access: {
    moduleId: string;
    postId: string;
  };
  enrollment: {
    courseId: string;
    progressPercent: number;
    status: 'in-progress';
  };
  nextPath: string;
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
const releaseOneEnrollmentSeeds: Readonly<Record<string, EnrollmentSeed>> = {
  'course-deep-learning-basic': {
    courseId: 'course-deep-learning-basic',
    courseRevisionId: 'course-deep-learning-basic-rev-r1',
    firstModuleId: 'dl-m01-neuron-perceptron',
    firstPostId: 'dl-p01-neuron-perceptron',
    nextPath: '/learn/course-deep-learning-basic/posts/dl-p01-neuron-perceptron',
  },
};

function getEnrollmentSeed(courseId: string): EnrollmentSeed {
  const seed = releaseOneEnrollmentSeeds[courseId];

  if (!seed) {
    throw new ApiError(404, 'COURSE_NOT_FOUND', 'The requested course was not found.');
  }

  return seed;
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
    locale: 'vi',
    theme: 'system',
    status: 'active',
  };
}

function toProfileResponse(
  uid: string,
  data: FirebaseFirestore.DocumentData,
): LearnerProfilePayload {
  return {
    uid,
    schemaVersion: 1,
    displayName: typeof data.displayName === 'string' ? data.displayName : 'Learner',
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : null,
    locale: data.locale === 'en' ? 'en' : 'vi',
    theme: data.theme === 'light' || data.theme === 'dark' ? data.theme : 'system',
    status:
      data.status === 'deletion-pending' || data.status === 'anonymized' ? data.status : 'active',
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
      postId: seed.firstPostId,
    },
    nextPath: seed.nextPath,
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

function createDemoCompletionRequestHash(input: CompleteDemoInput): string {
  return JSON.stringify({
    operation: 'demo-completion',
    uid: input.uid,
    demoId: input.demoId,
    viewedStepIds: [...input.viewedStepIds].sort(),
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

export function createFirestoreLearningRepository(firestore: Firestore): LearningRepository {
  return {
    async bootstrapLearner(input) {
      return firestore.runTransaction(async (transaction) => {
        const profileRef = firestore.doc(`users/${input.uid}`);
        const profileSnapshot = await transaction.get(profileRef);

        if (profileSnapshot.exists) {
          return {
            statusCode: 200,
            data: {
              profile: toProfileResponse(input.uid, profileSnapshot.data() ?? {}),
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

        return {
          statusCode: 201,
          data: { profile },
        };
      });
    },
    async completeDemo(input) {
      const requestHash = createDemoCompletionRequestHash(input);

      return firestore.runTransaction(async (transaction) => {
        const accessRef = firestore.doc(
          `users/${input.uid}/contentAccess/module_${input.moduleId}`,
        );
        const completionRef = firestore.doc(`users/${input.uid}/demoCompletions/${input.demoId}`);
        const idempotencyRef = firestore.doc(
          `users/${input.uid}/idempotencyKeys/${input.idempotencyKey}`,
        );
        const [accessSnapshot, idempotencySnapshot] = await Promise.all([
          transaction.get(accessRef),
          transaction.get(idempotencyRef),
        ]);

        if (!accessSnapshot.exists) {
          throw new ApiError(403, 'CONTENT_ACCESS_REQUIRED', 'Demo access is required.');
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

        return { statusCode: 200 as const, data: responseData };
      });
    },
    async createQuizAttempt(input) {
      const manifest = getQuizManifest(input.quizId);
      const attemptId = `attempt_${randomUUID()}`;
      const expiresAt = Timestamp.fromMillis(Date.now() + QUIZ_ATTEMPT_TTL_MS);
      const expiresAtIso = expiresAt.toDate().toISOString();

      return firestore.runTransaction(async (transaction) => {
        const accessRef =
          manifest.quizKind === 'post' && manifest.postId
            ? firestore.doc(`users/${input.uid}/contentAccess/post_${manifest.postId}`)
            : firestore.doc(`users/${input.uid}/contentAccess/module_${manifest.moduleId}`);
        const progressRef = firestore.doc(`users/${input.uid}/quizProgress/${input.quizId}`);
        const attemptRef = firestore.doc(`users/${input.uid}/quizAttempts/${attemptId}`);
        const demoCompletionRef = manifest.demoId
          ? firestore.doc(`users/${input.uid}/demoCompletions/${manifest.demoId}`)
          : null;
        const [accessSnapshot, progressSnapshot, demoCompletionSnapshot] = await Promise.all([
          transaction.get(accessRef),
          transaction.get(progressRef),
          demoCompletionRef ? transaction.get(demoCompletionRef) : Promise.resolve(null),
        ]);

        if (!accessSnapshot.exists) {
          throw new ApiError(403, 'CONTENT_ACCESS_REQUIRED', 'Quiz access is required.');
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
    async enrollLearner(input) {
      const seed = getEnrollmentSeed(input.courseId);
      const requestHash = createEnrollmentRequestHash(input);

      return firestore.runTransaction(async (transaction) => {
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
          transaction.set(
            firestore.doc(`users/${input.uid}/contentAccess/post_${seed.firstPostId}`),
            {
              schemaVersion: 1,
              contentType: 'post',
              entityId: seed.firstPostId,
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

        return { statusCode, data: responseData };
      });
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

        const progressRef = firestore.doc(`users/${input.uid}/quizProgress/${manifest.quizId}`);
        const progressSnapshot = await transaction.get(progressRef);
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
          for (const unlocked of grade.newlyUnlocked) {
            if (unlocked.type === 'post') {
              transaction.set(
                firestore.doc(`users/${input.uid}/postCompletions/${unlocked.id}`),
                {
                  schemaVersion: 1,
                  completedAt: FieldValue.serverTimestamp(),
                  quizId: manifest.quizId,
                  status: 'completed',
                  updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true },
              );
            }

            if (unlocked.type === 'algorithm') {
              transaction.set(
                firestore.doc(`users/${input.uid}/algorithmUnlocks/${unlocked.id}`),
                {
                  schemaVersion: 1,
                  algorithmId: unlocked.id,
                  grantedAt: FieldValue.serverTimestamp(),
                  quizId: manifest.quizId,
                  reason: 'module-quiz-passed',
                },
                { merge: true },
              );
            }
          }
        }

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
