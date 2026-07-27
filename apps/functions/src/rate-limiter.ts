import { createHash } from 'node:crypto';

import { getFirestore, type Firestore } from 'firebase-admin/firestore';

import { getFirebaseAdminApp } from './firebase-admin-app.js';

const RATE_LIMIT_BUCKET_COLLECTION = 'apiRateLimitBuckets';
const DEFAULT_WINDOW_SECONDS = 60;

export interface RateLimitPolicy {
  maxRequests: number;
  windowSeconds: number;
}

export interface ApiRateLimitPolicies {
  accountDeletion: RateLimitPolicy;
  adminMutation: RateLimitPolicy;
  completion: RateLimitPolicy;
  enrollment: RateLimitPolicy;
  playgroundConfig: RateLimitPolicy;
  playgroundRun: RateLimitPolicy;
  playgroundSession: RateLimitPolicy;
  quizAttempt: RateLimitPolicy;
  quizSubmission: RateLimitPolicy;
}

export interface RateLimitRequest {
  identity: string;
  policy: RateLimitPolicy;
  scope: string;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  consume(input: RateLimitRequest): Promise<RateLimitDecision>;
}

function getPositiveInteger(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
): number {
  const value = environment[name];

  if (value === undefined || value === '') {
    return fallback;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsedValue;
}

function createPolicy(
  environment: NodeJS.ProcessEnv,
  maxRequestsName: string,
  fallbackMaxRequests: number,
  windowSeconds: number,
): RateLimitPolicy {
  return {
    maxRequests: getPositiveInteger(environment, maxRequestsName, fallbackMaxRequests),
    windowSeconds,
  };
}

export function getApiRateLimitPolicies(
  environment: NodeJS.ProcessEnv = process.env,
): ApiRateLimitPolicies {
  const windowSeconds = getPositiveInteger(
    environment,
    'API_RATE_LIMIT_WINDOW_SECONDS',
    DEFAULT_WINDOW_SECONDS,
  );

  return {
    accountDeletion: createPolicy(
      environment,
      'API_RATE_LIMIT_ACCOUNT_DELETION_MAX',
      3,
      windowSeconds,
    ),
    adminMutation: createPolicy(
      environment,
      'API_RATE_LIMIT_ADMIN_MUTATION_MAX',
      10,
      windowSeconds,
    ),
    completion: createPolicy(environment, 'API_RATE_LIMIT_COMPLETION_MAX', 20, windowSeconds),
    enrollment: createPolicy(environment, 'API_RATE_LIMIT_ENROLLMENT_MAX', 10, windowSeconds),
    playgroundConfig: createPolicy(
      environment,
      'API_RATE_LIMIT_PLAYGROUND_CONFIG_MAX',
      20,
      windowSeconds,
    ),
    playgroundRun: createPolicy(
      environment,
      'API_RATE_LIMIT_PLAYGROUND_RUN_MAX',
      10,
      windowSeconds,
    ),
    playgroundSession: createPolicy(
      environment,
      'API_RATE_LIMIT_PLAYGROUND_SESSION_MAX',
      10,
      windowSeconds,
    ),
    quizAttempt: createPolicy(environment, 'API_RATE_LIMIT_QUIZ_ATTEMPT_MAX', 10, windowSeconds),
    quizSubmission: createPolicy(
      environment,
      'API_RATE_LIMIT_QUIZ_SUBMISSION_MAX',
      5,
      windowSeconds,
    ),
  };
}

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function createRateLimitBucketId(
  identity: string,
  scope: string,
  windowStartedAtMillis: number,
): string {
  return hashValue(`${scope}:${hashValue(identity)}:${windowStartedAtMillis}`);
}

export function createNoopRateLimiter(): RateLimiter {
  return {
    async consume() {
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

export function createFirestoreRateLimiter(
  firestore: Firestore = getFirestore(getFirebaseAdminApp()),
  now: () => number = Date.now,
): RateLimiter {
  return {
    async consume({ identity, policy, scope }) {
      const nowMillis = now();
      const windowMillis = policy.windowSeconds * 1000;
      const windowStartedAtMillis = nowMillis - (nowMillis % windowMillis);
      const windowExpiresAtMillis = windowStartedAtMillis + windowMillis;
      const retryAfterSeconds = Math.max(1, Math.ceil((windowExpiresAtMillis - nowMillis) / 1000));
      const bucketReference = firestore
        .collection(RATE_LIMIT_BUCKET_COLLECTION)
        .doc(createRateLimitBucketId(identity, scope, windowStartedAtMillis));

      return firestore.runTransaction(async (transaction) => {
        const bucketSnapshot = await transaction.get(bucketReference);
        const bucket = bucketSnapshot.data();
        const count = typeof bucket?.count === 'number' ? bucket.count : 0;

        if (count >= policy.maxRequests) {
          return { allowed: false, retryAfterSeconds };
        }

        transaction.set(
          bucketReference,
          {
            count: count + 1,
            expireAt: new Date(windowExpiresAtMillis),
            identityHash: hashValue(identity),
            scope,
            windowStartedAt: new Date(windowStartedAtMillis),
          },
          { merge: true },
        );

        return { allowed: true, retryAfterSeconds: 0 };
      });
    },
  };
}
