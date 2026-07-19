import { FieldValue, getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';

import { ApiError } from './api-error.js';
import { getFirebaseAdminApp } from './firebase-admin-app.js';

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

export interface LearningRepository {
  bootstrapLearner(input: BootstrapLearnerInput): Promise<{
    data: unknown;
    statusCode: 200 | 201;
  }>;
  enrollLearner(input: EnrollLearnerInput): Promise<{
    data: unknown;
    statusCode: 200 | 201;
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

interface StoredIdempotencyRecord {
  requestHash?: unknown;
  responseData?: unknown;
  statusCode?: unknown;
}

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1_000;
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

function isStoredIdempotencyRecord(data: unknown): data is StoredIdempotencyRecord {
  return typeof data === 'object' && data !== null;
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
  };
}

export function createDefaultLearningRepository(): LearningRepository {
  return createFirestoreLearningRepository(getFirestore(getFirebaseAdminApp()));
}
