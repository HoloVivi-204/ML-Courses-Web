import { randomUUID } from 'node:crypto';

import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import helmet from 'helmet';

import {
  createStaticAdminContentRepository,
  isAdminContentPublicationScope,
  type AdminContentDraftPatch,
  type AdminContentMetadata,
  type AdminContentPublicationScope,
  type AdminContentRepository,
  type LocalizedText,
} from './admin-content-repository.js';
import {
  createDefaultAdminReportRepository,
  type AdminReportRepository,
} from './admin-report-repository.js';
import { getAppCheckRuntimeConfig } from './api-security-config.js';
import { ApiError } from './api-error.js';
import { assertRequiredDemoStepsViewed } from './demo-manifest.js';
import { getFirebaseAdminApp } from './firebase-admin-app.js';
import { hasLocalCloudAuthDemoAdminRole } from './local-cloud-auth-demo.js';
import {
  createDefaultLearningContentRepository,
  type LearningContentRepository,
} from './learning-content-repository.js';
import { createFirestoreAdminContentRepository } from './firestore-admin-content-repository.js';
import {
  createDefaultLearningRepository,
  type LearnerLocalePreference,
  type LearnerThemePreference,
  type LearningRepository,
} from './learning-repository.js';
import {
  createDefaultPlaygroundRepository,
  type PlaygroundRepository,
  type UpdatePlaygroundConfigInput,
} from './playground-repository.js';
import type { QuizAnswer, QuizAnswerValue } from './quiz-manifest.js';
import {
  createFirestoreRateLimiter,
  createNoopRateLimiter,
  getApiRateLimitPolicies,
  type RateLimitPolicy,
  type RateLimiter,
} from './rate-limiter.js';
import { getRuntimeFeatureManifest } from './runtime-config.js';

export interface VerifiedAuthUser {
  authTime?: number | undefined;
  displayName: string;
  email?: string | undefined;
  role?: 'admin' | undefined;
  uid: string;
}

interface ApiErrorBody {
  code: string;
  details: readonly unknown[];
  message: string;
}

export interface ApiAppOptions {
  adminContentRepository?: AdminContentRepository | undefined;
  adminReportRepository?: AdminReportRepository | undefined;
  appCheckEnforcement?: 'disabled' | 'enforced' | undefined;
  deleteAuthUser?: ((uid: string) => Promise<void>) | undefined;
  learningContentRepository?: LearningContentRepository | undefined;
  learningRepository?: LearningRepository | undefined;
  playgroundRepository?: PlaygroundRepository | undefined;
  rateLimiter?: RateLimiter | undefined;
  verifyAppCheckToken?: ((appCheckToken: string) => Promise<void>) | undefined;
  verifyAuthToken?: ((idToken: string) => Promise<VerifiedAuthUser>) | undefined;
}

const RECENT_AUTHENTICATION_WINDOW_SECONDS = 5 * 60;

function getRequestId(response: Response): string {
  return String(response.locals.requestId);
}

function getAuthUser(response: Response): VerifiedAuthUser {
  const authUser = response.locals.authUser as VerifiedAuthUser | undefined;

  if (!authUser) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }

  return authUser;
}

function requireAdminUser(response: Response): VerifiedAuthUser {
  const authUser = getAuthUser(response);

  if (authUser.role !== 'admin') {
    throw new ApiError(403, 'ADMIN_FORBIDDEN', 'Admin access is required.');
  }

  return authUser;
}

function addRequestContext(_request: Request, response: Response, next: NextFunction): void {
  const requestId = randomUUID();

  response.locals.requestId = requestId;
  response.setHeader('x-request-id', requestId);
  next();
}

function sendError(response: Response, statusCode: number, error: ApiErrorBody): void {
  response.status(statusCode).json({
    success: false,
    error,
    requestId: getRequestId(response),
  });
}

function sendSuccess(response: Response, statusCode: number, data: unknown): void {
  response.status(statusCode).json({
    success: true,
    data,
    requestId: getRequestId(response),
  });
}

function sendLearningContentSuccess(response: Response, data: unknown): void {
  response.setHeader('cache-control', 'private, no-store');
  sendSuccess(response, 200, data);
}

function sendNoContent(response: Response): void {
  response.status(204).send();
}

function isInvalidJsonError(error: unknown): boolean {
  return error instanceof SyntaxError && 'body' in error;
}

function getBearerToken(request: Request): string {
  const authorization = request.get('authorization') ?? '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }

  return token;
}

function getAppCheckToken(request: Request): string {
  const appCheckToken = request.get('x-firebase-appcheck')?.trim() ?? '';

  if (!appCheckToken) {
    throw new ApiError(401, 'APP_CHECK_REQUIRED', 'A valid App Check token is required.');
  }

  return appCheckToken;
}

function getIdempotencyKey(request: Request): string {
  const idempotencyKey = request.get('idempotency-key')?.trim() ?? '';

  if (!idempotencyKey) {
    throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required.');
  }

  return idempotencyKey;
}

function getRouteParam(request: Request, name: string): string {
  const value = request.params[name];

  if (typeof value !== 'string' || !value) {
    throw new ApiError(400, 'INVALID_ROUTE_PARAMETER', `Route parameter ${name} is required.`);
  }

  return value;
}

function getStringQueryField(request: Request, name: string): string {
  const value = request.query[name];

  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'INVALID_QUERY_PARAMETER', `${name} query parameter is required.`);
  }

  return value.trim();
}

function getOptionalStringQueryField(request: Request, name: string): string | undefined {
  const value = request.query[name];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'INVALID_QUERY_PARAMETER', `${name} query parameter must be a string.`);
  }

  return value.trim();
}

function getOptionalIntegerQueryField(request: Request, name: string): number | undefined {
  const value = request.query[name];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
    throw new ApiError(
      400,
      'INVALID_QUERY_PARAMETER',
      `${name} query parameter must be an integer.`,
    );
  }

  const parsedValue = Number(value.trim());

  if (!Number.isSafeInteger(parsedValue)) {
    throw new ApiError(400, 'INVALID_QUERY_PARAMETER', `${name} query parameter is out of range.`);
  }

  return parsedValue;
}

function assertNoClientContentRevisionSelection(request: Request): void {
  if (request.query.revisionId !== undefined) {
    throw new ApiError(
      400,
      'CONTENT_REVISION_SELECTION_FORBIDDEN',
      'Content revisions are selected by the server.',
    );
  }
}

function getStringArrayBodyField(request: Request, name: string): string[] {
  const value = (request.body as Record<string, unknown> | undefined)?.[name];

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new ApiError(400, 'INVALID_REQUEST_BODY', `${name} must be a non-empty string array.`);
  }

  return [...new Set(value.map((item) => item.trim()))];
}

function getObjectBody(request: Request): Record<string, unknown> {
  const body = request.body;

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError(400, 'INVALID_REQUEST_BODY', 'Request body must be an object.');
  }

  return body as Record<string, unknown>;
}

function getStringBodyField(request: Request, name: string): string {
  const value = getObjectBody(request)[name];

  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'INVALID_REQUEST_BODY', `${name} must be a non-empty string.`);
  }

  return value.trim();
}

function getOptionalStringBodyField(request: Request, name: string): string | undefined {
  const value = getObjectBody(request)[name];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'INVALID_REQUEST_BODY', `${name} must be a non-empty string.`);
  }

  return value.trim();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertBodyFieldsAllowlisted(
  body: Record<string, unknown>,
  allowedFields: readonly string[],
): void {
  const unsupportedFields = Object.keys(body).filter((field) => !allowedFields.includes(field));

  if (unsupportedFields.length > 0) {
    throw new ApiError(
      400,
      'INVALID_REQUEST_BODY',
      `Unsupported request body fields: ${unsupportedFields.join(', ')}.`,
    );
  }
}

function getPositiveIntegerBodyField(body: Record<string, unknown>, name: string): number {
  const value = body[name];

  if (!Number.isInteger(value) || typeof value !== 'number' || value < 1) {
    throw new ApiError(400, 'INVALID_REQUEST_BODY', `${name} must be a positive integer.`);
  }

  return value;
}

function getTrimmedStringValue(value: unknown, name: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'INVALID_REQUEST_BODY', `${name} must be a non-empty string.`);
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length > maxLength) {
    throw new ApiError(
      400,
      'INVALID_REQUEST_BODY',
      `${name} must be ${maxLength} characters or fewer.`,
    );
  }

  return trimmedValue;
}

function getLocalizedTextValue(value: unknown, name: string, maxLength: number): LocalizedText {
  if (!isPlainObject(value)) {
    throw new ApiError(400, 'INVALID_REQUEST_BODY', `${name} must be an object.`);
  }

  assertBodyFieldsAllowlisted(value, ['en', 'vi']);

  return {
    en: getTrimmedStringValue(value.en, `${name}.en`, maxLength),
    vi: getTrimmedStringValue(value.vi, `${name}.vi`, maxLength),
  };
}

function getOptionalLocalizedTextBodyField(
  body: Record<string, unknown>,
  name: string,
  maxLength: number,
): LocalizedText | undefined {
  const value = body[name];

  if (value === undefined) {
    return undefined;
  }

  return getLocalizedTextValue(value, name, maxLength);
}

function getOptionalExternalLinkUrlValue(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ApiError(
      400,
      'INVALID_REQUEST_BODY',
      'metadata.externalLinkUrl must be an HTTP(S) URL or null.',
    );
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.length > 2048) {
    throw new ApiError(
      400,
      'INVALID_REQUEST_BODY',
      'metadata.externalLinkUrl must be 2048 characters or fewer.',
    );
  }

  try {
    const url = new URL(trimmedValue);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('Unsupported URL protocol.');
    }

    return url.toString();
  } catch {
    throw new ApiError(
      400,
      'INVALID_REQUEST_BODY',
      'metadata.externalLinkUrl must be an HTTP(S) URL or null.',
    );
  }
}

function getOptionalAdminContentMetadataBodyField(
  body: Record<string, unknown>,
): AdminContentMetadata | undefined {
  const value = body.metadata;

  if (value === undefined) {
    return undefined;
  }

  if (!isPlainObject(value)) {
    throw new ApiError(400, 'INVALID_REQUEST_BODY', 'metadata must be an object.');
  }

  assertBodyFieldsAllowlisted(value, ['attribution', 'externalLinkUrl']);

  return {
    attribution: getLocalizedTextValue(value.attribution, 'metadata.attribution', 600),
    externalLinkUrl: getOptionalExternalLinkUrlValue(value.externalLinkUrl),
  };
}

function getAdminContentDraftPatchBody(request: Request): {
  patch: AdminContentDraftPatch;
  revisionVersion: number;
} {
  const body = getObjectBody(request);
  assertBodyFieldsAllowlisted(body, ['revisionVersion', 'title', 'preview', 'metadata']);

  const title = getOptionalLocalizedTextBodyField(body, 'title', 160);
  const preview = getOptionalLocalizedTextBodyField(body, 'preview', 600);
  const metadata = getOptionalAdminContentMetadataBodyField(body);
  const patch: AdminContentDraftPatch = {};

  if (title !== undefined) {
    patch.title = title;
  }

  if (preview !== undefined) {
    patch.preview = preview;
  }

  if (metadata !== undefined) {
    patch.metadata = metadata;
  }

  return {
    patch,
    revisionVersion: getPositiveIntegerBodyField(body, 'revisionVersion'),
  };
}

function getAdminContentLifecycleReasonBody(request: Request): string {
  const body = getObjectBody(request);

  assertBodyFieldsAllowlisted(body, ['reason']);

  return getTrimmedStringValue(body.reason, 'reason', 240);
}

function getAdminContentPublishBody(request: Request): {
  publicationScope: AdminContentPublicationScope;
  reason: string;
} {
  const body = getObjectBody(request);

  assertBodyFieldsAllowlisted(body, ['publicationScope', 'reason']);
  const publicationScope = body.publicationScope;

  if (publicationScope === undefined) {
    return {
      publicationScope: 'publish-quality',
      reason: getTrimmedStringValue(body.reason, 'reason', 240),
    };
  }

  if (typeof publicationScope !== 'string' || !isAdminContentPublicationScope(publicationScope)) {
    throw new ApiError(
      400,
      'ADMIN_CONTENT_PUBLICATION_SCOPE_INVALID',
      'publicationScope must be emulator-demo or publish-quality.',
    );
  }

  return {
    publicationScope,
    reason: getTrimmedStringValue(body.reason, 'reason', 240),
  };
}

function getOptionalObjectBody(request: Request): Record<string, unknown> {
  if (request.body === undefined) {
    return {};
  }

  return getObjectBody(request);
}

function assertNoAccountDeletionBody(request: Request): void {
  assertBodyFieldsAllowlisted(getOptionalObjectBody(request), []);
}

function getOptionalLearnerLocalePreference(
  body: Record<string, unknown>,
): LearnerLocalePreference | undefined {
  const value = body.locale;

  if (value === undefined) {
    return undefined;
  }

  if (value !== 'en' && value !== 'vi') {
    throw new ApiError(400, 'INVALID_REQUEST_BODY', 'locale must be either en or vi.');
  }

  return value;
}

function getOptionalLearnerThemePreference(
  body: Record<string, unknown>,
): LearnerThemePreference | undefined {
  const value = body.theme;

  if (value === undefined) {
    return undefined;
  }

  if (value !== 'dark' && value !== 'light' && value !== 'system') {
    throw new ApiError(400, 'INVALID_REQUEST_BODY', 'theme must be dark, light, or system.');
  }

  return value;
}

function getOptionalLearnerPreferencesBody(request: Request): {
  locale?: LearnerLocalePreference | undefined;
  theme?: LearnerThemePreference | undefined;
} {
  const body = getOptionalObjectBody(request);

  assertBodyFieldsAllowlisted(body, ['locale', 'theme']);

  return {
    locale: getOptionalLearnerLocalePreference(body),
    theme: getOptionalLearnerThemePreference(body),
  };
}

function getLearnerPreferencesPatchBody(request: Request): {
  locale?: LearnerLocalePreference | undefined;
  theme?: LearnerThemePreference | undefined;
} {
  const preferences = getOptionalLearnerPreferencesBody(request);

  if (preferences.locale === undefined && preferences.theme === undefined) {
    throw new ApiError(
      400,
      'INVALID_REQUEST_BODY',
      'At least one learner preference must be provided.',
    );
  }

  return preferences;
}

function getBodyField(request: Request, name: string): unknown {
  const body = getObjectBody(request);

  if (!(name in body)) {
    throw new ApiError(400, 'INVALID_REQUEST_BODY', `${name} is required.`);
  }

  return body[name];
}

function getDeviceProfileBodyField(request: Request): 'desktop' | 'mobile' {
  const value = getObjectBody(request).deviceProfile;

  return value === 'mobile' ? 'mobile' : 'desktop';
}

function getQuizAnswersBodyField(request: Request): QuizAnswer[] {
  const value = (request.body as Record<string, unknown> | undefined)?.answers;

  if (!Array.isArray(value)) {
    throw new ApiError(400, 'INVALID_REQUEST_BODY', 'answers must be an array.');
  }

  return value.map((item) => {
    if (!isQuizAnswerBodyItem(item)) {
      throw new ApiError(
        400,
        'INVALID_REQUEST_BODY',
        'Each answer must contain a questionId and a string or string[] value.',
      );
    }

    return {
      questionId: item.questionId.trim(),
      value: normalizeQuizAnswerValue(item.value),
    };
  });
}

function getPostViewBody(request: Request): {
  readingPosition: string;
  viewedItemIds: string[];
} {
  const body = getObjectBody(request);
  assertBodyFieldsAllowlisted(body, ['readingPosition', 'viewedItemIds']);
  const viewedItemIds = getStringArrayBodyField(request, 'viewedItemIds');

  if (viewedItemIds.length > 80 || viewedItemIds.some((item) => item.length > 160)) {
    throw new ApiError(
      400,
      'INVALID_REQUEST_BODY',
      'viewedItemIds must contain at most 80 identifiers of 160 characters or fewer.',
    );
  }

  return {
    readingPosition: getTrimmedStringValue(body.readingPosition, 'readingPosition', 160),
    viewedItemIds,
  };
}

function getDemoViewBody(request: Request): string[] {
  const body = getObjectBody(request);
  assertBodyFieldsAllowlisted(body, ['viewedStepIds']);
  const viewedStepIds = getStringArrayBodyField(request, 'viewedStepIds');

  if (viewedStepIds.length > 20 || viewedStepIds.some((item) => item.length > 160)) {
    throw new ApiError(
      400,
      'INVALID_REQUEST_BODY',
      'viewedStepIds must contain at most 20 identifiers of 160 characters or fewer.',
    );
  }

  return viewedStepIds;
}

function isQuizAnswerBodyItem(
  value: unknown,
): value is { questionId: string; value: QuizAnswerValue } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'questionId' in value &&
    'value' in value &&
    typeof value.questionId === 'string' &&
    value.questionId.trim().length > 0 &&
    isQuizAnswerValue(value.value)
  );
}

function isQuizAnswerValue(value: unknown): value is QuizAnswerValue {
  return (
    (typeof value === 'string' && value.trim().length > 0) ||
    (Array.isArray(value) &&
      value.length > 0 &&
      value.every((item) => typeof item === 'string' && item.trim().length > 0))
  );
}

function normalizeQuizAnswerValue(value: QuizAnswerValue): QuizAnswerValue {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => item.trim()))];
  }

  return value;
}

function createAuthMiddleware(
  verifyAuthToken: (idToken: string) => Promise<VerifiedAuthUser>,
): express.RequestHandler {
  return async (request, response, next) => {
    try {
      response.locals.authUser = await verifyAuthToken(getBearerToken(request));
      next();
    } catch (error) {
      next(
        error instanceof ApiError
          ? error
          : new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.'),
      );
    }
  };
}

function createAppCheckMiddleware(
  isEnforced: boolean,
  verifyAppCheckToken: (appCheckToken: string) => Promise<void>,
): express.RequestHandler {
  if (!isEnforced) {
    return (_request, _response, next) => next();
  }

  return async (request, _response, next) => {
    try {
      await verifyAppCheckToken(getAppCheckToken(request));
      next();
    } catch (error) {
      next(
        error instanceof ApiError
          ? error
          : new ApiError(401, 'APP_CHECK_INVALID', 'A valid App Check token is required.'),
      );
    }
  };
}

function createRateLimitMiddleware(
  rateLimiter: RateLimiter,
  policy: RateLimitPolicy,
  scope: string,
): express.RequestHandler {
  return async (_request, response, next) => {
    try {
      const decision = await rateLimiter.consume({
        identity: getAuthUser(response).uid,
        policy,
        scope,
      });

      if (!decision.allowed) {
        response.setHeader('retry-after', String(decision.retryAfterSeconds));
        throw new ApiError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.');
      }

      next();
    } catch (error) {
      next(
        error instanceof ApiError
          ? error
          : new ApiError(
              503,
              'RATE_LIMIT_UNAVAILABLE',
              'Request protection is temporarily unavailable.',
            ),
      );
    }
  };
}

async function defaultVerifyAuthToken(idToken: string): Promise<VerifiedAuthUser> {
  const decodedToken = await getAuth(getFirebaseAdminApp()).verifyIdToken(idToken);
  const email = typeof decodedToken.email === 'string' ? decodedToken.email : undefined;

  return {
    uid: decodedToken.uid,
    authTime:
      typeof decodedToken.auth_time === 'number' && Number.isFinite(decodedToken.auth_time)
        ? decodedToken.auth_time
        : undefined,
    displayName: typeof decodedToken.name === 'string' ? decodedToken.name : 'Learner',
    email,
    role:
      decodedToken.role === 'admin' || hasLocalCloudAuthDemoAdminRole(email) ? 'admin' : undefined,
  };
}

async function defaultVerifyAppCheckToken(appCheckToken: string): Promise<void> {
  await getAppCheck(getFirebaseAdminApp()).verifyToken(appCheckToken);
}

function isTestRuntime(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST !== undefined;
}

async function defaultDeleteAuthUser(uid: string): Promise<void> {
  await getAuth(getFirebaseAdminApp()).deleteUser(uid);
}

function requireRecentAuthentication(authUser: VerifiedAuthUser): void {
  const authTime = authUser.authTime;
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (
    typeof authTime !== 'number' ||
    !Number.isFinite(authTime) ||
    authTime > nowSeconds + 30 ||
    nowSeconds - authTime > RECENT_AUTHENTICATION_WINDOW_SECONDS
  ) {
    throw new ApiError(
      401,
      'RECENT_SIGN_IN_REQUIRED',
      'Recent authentication is required before deleting this account.',
    );
  }
}

function isAuthUserNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'auth/user-not-found'
  );
}

async function deleteAuthUserIdempotently(
  deleteAuthUser: (uid: string) => Promise<void>,
  uid: string,
): Promise<void> {
  try {
    await deleteAuthUser(uid);
  } catch (error) {
    if (!isAuthUserNotFoundError(error)) {
      throw error;
    }
  }
}

const handleApiError: ErrorRequestHandler = (error, request, response, next) => {
  void next;

  if (isInvalidJsonError(error)) {
    sendError(response, 400, {
      code: 'INVALID_JSON',
      message: 'The request body must contain valid JSON.',
      details: [],
    });
    return;
  }

  if (error instanceof ApiError) {
    sendError(response, error.statusCode, {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return;
  }

  console.error(
    JSON.stringify({
      severity: 'ERROR',
      service: 'api',
      requestId: getRequestId(response),
      method: request.method,
      route: request.path,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }),
  );
  sendError(response, 500, {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
    details: [],
  });
};

export function createApiApp(options: ApiAppOptions = {}): express.Express {
  const app = express();
  let adminContentRepository = options.adminContentRepository;
  let adminReportRepository = options.adminReportRepository;
  let learningContentRepository = options.learningContentRepository;
  let learningRepository = options.learningRepository;
  let playgroundRepository = options.playgroundRepository;
  const deleteAuthUser = options.deleteAuthUser ?? defaultDeleteAuthUser;
  const appCheckEnforcement =
    options.appCheckEnforcement ??
    (isTestRuntime()
      ? 'disabled'
      : getAppCheckRuntimeConfig().isEnforced
        ? 'enforced'
        : 'disabled');
  const requireAppCheck = createAppCheckMiddleware(
    appCheckEnforcement === 'enforced',
    options.verifyAppCheckToken ?? defaultVerifyAppCheckToken,
  );
  const requireAuth = createAuthMiddleware(options.verifyAuthToken ?? defaultVerifyAuthToken);
  const rateLimitPolicies = getApiRateLimitPolicies();
  const rateLimiter =
    options.rateLimiter ??
    (isTestRuntime() ? createNoopRateLimiter() : createFirestoreRateLimiter());
  const requireAccountDeletionRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.accountDeletion,
    'account-deletion',
  );
  const requireAdminMutationRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.adminMutation,
    'admin-draft-create',
  );
  const requireAdminRevisionUpdateRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.adminMutation,
    'admin-revision-update',
  );
  const requireAdminRevisionValidationRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.adminMutation,
    'admin-revision-validation',
  );
  const requireAdminPublishRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.adminMutation,
    'admin-publish',
  );
  const requireAdminRollbackRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.adminMutation,
    'admin-rollback',
  );
  const requireAdminUnpublishRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.adminMutation,
    'admin-unpublish',
  );
  const requireDemoCompletionRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.completion,
    'demo-completion',
  );
  const requirePostCompletionRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.completion,
    'post-completion',
  );
  const requireEnrollmentRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.enrollment,
    'enrollment',
  );
  const requirePlaygroundConfigRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.playgroundConfig,
    'playground-config-create',
  );
  const requirePlaygroundConfigUpdateRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.playgroundConfig,
    'playground-config-update',
  );
  const requirePlaygroundConfigDeleteRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.playgroundConfig,
    'playground-config-delete',
  );
  const requirePlaygroundRunRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.playgroundRun,
    'playground-run-save',
  );
  const requirePlaygroundRunDeleteRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.playgroundRun,
    'playground-run-delete',
  );
  const requirePlaygroundSessionRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.playgroundSession,
    'playground-session-create',
  );
  const requirePlaygroundSessionCancellationRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.playgroundSession,
    'playground-session-cancellation',
  );
  const requireQuizAttemptRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.quizAttempt,
    'quiz-attempt',
  );
  const requireQuizSubmissionRateLimit = createRateLimitMiddleware(
    rateLimiter,
    rateLimitPolicies.quizSubmission,
    'quiz-submission',
  );

  function getAdminContentRepository(): AdminContentRepository {
    adminContentRepository ??= isTestRuntime()
      ? createStaticAdminContentRepository()
      : createFirestoreAdminContentRepository();

    return adminContentRepository;
  }

  function getAdminReportRepository(): AdminReportRepository {
    adminReportRepository ??= createDefaultAdminReportRepository();

    return adminReportRepository;
  }

  function getLearningRepository(): LearningRepository {
    learningRepository ??= createDefaultLearningRepository();

    return learningRepository;
  }

  function getLearningContentRepository(): LearningContentRepository {
    learningContentRepository ??= createDefaultLearningContentRepository();

    return learningContentRepository;
  }

  function getPlaygroundRepository(): PlaygroundRepository {
    playgroundRepository ??= createDefaultPlaygroundRepository();

    return playgroundRepository;
  }

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(addRequestContext);
  app.use(express.json({ limit: '256kb', strict: true }));

  /** Returns process availability without requiring authentication or App Check. */
  app.get('/api/v1/health', (_request, response) => {
    response.status(200).json({
      success: true,
      data: {
        service: 'api',
        status: 'ok',
      },
      requestId: getRequestId(response),
    });
  });

  app.use('/api/v1', requireAppCheck);

  /** Returns Release 1 runtime feature flags after App Check verification. */
  app.get('/api/v1/system/features', (_request, response) => {
    sendSuccess(response, 200, getRuntimeFeatureManifest());
  });

  app.post('/api/v1/users/me/bootstrap', requireAuth, async (request, response, next) => {
    try {
      const authUser = getAuthUser(response);
      const preferences = getOptionalLearnerPreferencesBody(request);
      const result = await getLearningRepository().bootstrapLearner({
        uid: authUser.uid,
        displayName: authUser.displayName || 'Learner',
        locale: preferences.locale,
        theme: preferences.theme,
      });

      sendSuccess(response, result.statusCode, result.data);
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/v1/users/me/preferences', requireAuth, async (request, response, next) => {
    try {
      const authUser = getAuthUser(response);
      const preferences = getLearnerPreferencesPatchBody(request);
      const result = await getLearningRepository().updateLearnerPreferences({
        uid: authUser.uid,
        displayName: authUser.displayName || 'Learner',
        locale: preferences.locale,
        theme: preferences.theme,
      });

      sendSuccess(response, result.statusCode, result.data);
    } catch (error) {
      next(error);
    }
  });

  app.delete(
    '/api/v1/users/me',
    requireAuth,
    requireAccountDeletionRateLimit,
    async (request, response, next) => {
      try {
        assertNoAccountDeletionBody(request);

        const authUser = getAuthUser(response);
        requireRecentAuthentication(authUser);
        await getLearningRepository().deleteLearnerAccount({ uid: authUser.uid });
        await getPlaygroundRepository().deleteLearnerPlaygroundData({ uid: authUser.uid });
        await deleteAuthUserIdempotently(deleteAuthUser, authUser.uid);

        sendNoContent(response);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    '/api/v1/courses/:courseId/enrollments',
    requireAuth,
    requireEnrollmentRateLimit,
    async (request, response, next) => {
      try {
        const authUser = getAuthUser(response);
        const result = await getLearningRepository().enrollLearner({
          courseId: getRouteParam(request, 'courseId'),
          displayName: authUser.displayName,
          idempotencyKey: getIdempotencyKey(request),
          uid: authUser.uid,
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get('/api/v1/posts/:postId/trial-content', async (request, response, next) => {
    try {
      assertNoClientContentRevisionSelection(request);
      const result = await getLearningContentRepository().getTrialPostContent({
        postId: getRouteParam(request, 'postId'),
      });

      sendLearningContentSuccess(response, result.data);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/v1/posts/:postId/content', requireAuth, async (request, response, next) => {
    try {
      assertNoClientContentRevisionSelection(request);
      const authUser = getAuthUser(response);
      const result = await getLearningContentRepository().getFullPostContent({
        postId: getRouteParam(request, 'postId'),
        uid: authUser.uid,
      });

      sendLearningContentSuccess(response, result.data);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/v1/demos/:demoId/content', requireAuth, async (request, response, next) => {
    try {
      assertNoClientContentRevisionSelection(request);
      const authUser = getAuthUser(response);
      const result = await getLearningContentRepository().getDemoContent({
        demoId: getRouteParam(request, 'demoId'),
        uid: authUser.uid,
      });

      sendLearningContentSuccess(response, result.data);
    } catch (error) {
      next(error);
    }
  });

  app.post(
    '/api/v1/demos/:demoId/completions',
    requireAuth,
    requireDemoCompletionRateLimit,
    async (request, response, next) => {
      try {
        const authUser = getAuthUser(response);
        const demoId = getRouteParam(request, 'demoId');
        const viewedStepIds = getStringArrayBodyField(request, 'viewedStepIds');
        const seed = assertRequiredDemoStepsViewed(demoId, viewedStepIds);
        const result = await getLearningRepository().completeDemo({
          demoId,
          idempotencyKey: getIdempotencyKey(request),
          moduleId: seed.moduleId,
          requiredStepIds: seed.requiredStepIds,
          uid: authUser.uid,
          viewedStepIds,
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post('/api/v1/demos/:demoId/views', requireAuth, async (request, response, next) => {
    try {
      const authUser = getAuthUser(response);
      const result = await getLearningRepository().recordDemoView({
        demoId: getRouteParam(request, 'demoId'),
        uid: authUser.uid,
        viewedStepIds: getDemoViewBody(request),
      });

      sendSuccess(response, result.statusCode, result.data);
    } catch (error) {
      next(error);
    }
  });

  app.post(
    '/api/v1/module-overviews/:moduleId/views',
    requireAuth,
    async (request, response, next) => {
      try {
        const authUser = getAuthUser(response);
        const result = await getLearningRepository().recordModuleOverview({
          moduleId: getRouteParam(request, 'moduleId'),
          uid: authUser.uid,
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post('/api/v1/posts/:postId/views', requireAuth, async (request, response, next) => {
    try {
      const authUser = getAuthUser(response);
      const postView = getPostViewBody(request);
      const result = await getLearningRepository().recordPostView({
        postId: getRouteParam(request, 'postId'),
        readingPosition: postView.readingPosition,
        uid: authUser.uid,
        viewedItemIds: postView.viewedItemIds,
      });

      sendSuccess(response, result.statusCode, result.data);
    } catch (error) {
      next(error);
    }
  });

  app.post(
    '/api/v1/posts/:postId/completions',
    requireAuth,
    requirePostCompletionRateLimit,
    async (request, response, next) => {
      try {
        const authUser = getAuthUser(response);
        const result = await getLearningRepository().completePost({
          idempotencyKey: getIdempotencyKey(request),
          postId: getRouteParam(request, 'postId'),
          uid: authUser.uid,
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    '/api/v1/quizzes/:quizId/attempts',
    requireAuth,
    requireQuizAttemptRateLimit,
    async (request, response, next) => {
      try {
        const authUser = getAuthUser(response);
        const result = await getLearningRepository().createQuizAttempt({
          quizId: getRouteParam(request, 'quizId'),
          uid: authUser.uid,
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    '/api/v1/quiz-attempts/:attemptId/submissions',
    requireAuth,
    requireQuizSubmissionRateLimit,
    async (request, response, next) => {
      try {
        const authUser = getAuthUser(response);
        const result = await getLearningRepository().submitQuizAttempt({
          answers: getQuizAnswersBodyField(request),
          attemptId: getRouteParam(request, 'attemptId'),
          idempotencyKey: getIdempotencyKey(request),
          uid: authUser.uid,
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get('/api/v1/users/me/progress', requireAuth, async (_request, response, next) => {
    try {
      const authUser = getAuthUser(response);
      const result = await getLearningRepository().getProgress({
        uid: authUser.uid,
      });

      sendSuccess(response, result.statusCode, result.data);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/v1/admin/access', requireAuth, (_request, response, next) => {
    try {
      sendSuccess(response, 200, {
        isAdmin: getAuthUser(response).role === 'admin',
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/v1/admin/content', requireAuth, async (request, response, next) => {
    try {
      requireAdminUser(response);

      const result = await getAdminContentRepository().listContent({
        entityType: getOptionalStringQueryField(request, 'entityType'),
        courseId: getOptionalStringQueryField(request, 'courseId'),
        moduleId: getOptionalStringQueryField(request, 'moduleId'),
      });

      sendSuccess(response, result.statusCode, result.data);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/v1/admin/reports/summary', requireAuth, async (_request, response, next) => {
    try {
      const adminUser = requireAdminUser(response);
      const result = await getAdminReportRepository().getSummary({
        actorUid: adminUser.uid,
      });

      sendSuccess(response, result.statusCode, result.data);
    } catch (error) {
      next(error);
    }
  });

  app.post(
    '/api/v1/admin/content/:entityType/:entityId/drafts',
    requireAuth,
    requireAdminMutationRateLimit,
    async (request, response, next) => {
      try {
        const adminUser = requireAdminUser(response);
        const result = await getAdminContentRepository().createDraft({
          createdByUid: adminUser.uid,
          entityId: getRouteParam(request, 'entityId'),
          entityType: getRouteParam(request, 'entityType'),
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.patch(
    '/api/v1/admin/revisions/:revisionId',
    requireAuth,
    requireAdminRevisionUpdateRateLimit,
    async (request, response, next) => {
      try {
        const adminUser = requireAdminUser(response);
        const updateBody = getAdminContentDraftPatchBody(request);
        const result = await getAdminContentRepository().updateDraft({
          actorUid: adminUser.uid,
          patch: updateBody.patch,
          revisionId: getRouteParam(request, 'revisionId'),
          revisionVersion: updateBody.revisionVersion,
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    '/api/v1/admin/revisions/:revisionId/validate',
    requireAuth,
    requireAdminRevisionValidationRateLimit,
    async (request, response, next) => {
      try {
        const adminUser = requireAdminUser(response);
        const result = await getAdminContentRepository().validateDraft({
          actorUid: adminUser.uid,
          revisionId: getRouteParam(request, 'revisionId'),
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    '/api/v1/admin/revisions/:revisionId/publish',
    requireAuth,
    requireAdminPublishRateLimit,
    async (request, response, next) => {
      try {
        const adminUser = requireAdminUser(response);
        const publishBody = getAdminContentPublishBody(request);
        const result = await getAdminContentRepository().publishRevision({
          actorUid: adminUser.uid,
          idempotencyKey: getIdempotencyKey(request),
          publicationScope: publishBody.publicationScope,
          reason: publishBody.reason,
          revisionId: getRouteParam(request, 'revisionId'),
          requestId: getRequestId(response),
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    '/api/v1/admin/revisions/:revisionId/rollback',
    requireAuth,
    requireAdminRollbackRateLimit,
    async (request, response, next) => {
      try {
        const adminUser = requireAdminUser(response);
        const result = await getAdminContentRepository().rollbackRevision({
          actorUid: adminUser.uid,
          reason: getAdminContentLifecycleReasonBody(request),
          revisionId: getRouteParam(request, 'revisionId'),
          requestId: getRequestId(response),
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    '/api/v1/admin/entities/:entityId/unpublish',
    requireAuth,
    requireAdminUnpublishRateLimit,
    async (request, response, next) => {
      try {
        const adminUser = requireAdminUser(response);
        const result = await getAdminContentRepository().unpublishEntity({
          actorUid: adminUser.uid,
          entityId: getRouteParam(request, 'entityId'),
          reason: getAdminContentLifecycleReasonBody(request),
          requestId: getRequestId(response),
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    '/api/v1/playground-run-sessions',
    requireAuth,
    requirePlaygroundSessionRateLimit,
    async (request, response, next) => {
      try {
        const authUser = getAuthUser(response);
        const body = getObjectBody(request);
        const result = await getPlaygroundRepository().createRunSession({
          uid: authUser.uid,
          scenarioId: getStringBodyField(request, 'scenarioId'),
          algorithmId: getStringBodyField(request, 'algorithmId'),
          datasetVersionId: getStringBodyField(request, 'datasetVersionId'),
          config: body.config,
          deviceProfile: getDeviceProfileBodyField(request),
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    '/api/v1/playground-run-sessions/:sessionId/cancellations',
    requireAuth,
    requirePlaygroundSessionCancellationRateLimit,
    async (request, response, next) => {
      try {
        const authUser = getAuthUser(response);
        const result = await getPlaygroundRepository().cancelRunSession({
          uid: authUser.uid,
          sessionId: getRouteParam(request, 'sessionId'),
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    '/api/v1/playground-runs',
    requireAuth,
    requirePlaygroundRunRateLimit,
    async (request, response, next) => {
      try {
        const authUser = getAuthUser(response);
        const result = await getPlaygroundRepository().saveRun({
          uid: authUser.uid,
          idempotencyKey: getIdempotencyKey(request),
          sessionId: getStringBodyField(request, 'sessionId'),
          result: getBodyField(request, 'result'),
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get('/api/v1/playground-runs', requireAuth, async (request, response, next) => {
    try {
      const authUser = getAuthUser(response);
      const result = await getPlaygroundRepository().listRuns({
        cursor: getOptionalStringQueryField(request, 'cursor'),
        limit: getOptionalIntegerQueryField(request, 'limit'),
        scenarioId: getOptionalStringQueryField(request, 'scenarioId'),
        uid: authUser.uid,
      });

      sendSuccess(response, result.statusCode, result.data);
    } catch (error) {
      next(error);
    }
  });

  app.delete(
    '/api/v1/playground-runs/:runId',
    requireAuth,
    requirePlaygroundRunDeleteRateLimit,
    async (request, response, next) => {
      try {
        const authUser = getAuthUser(response);

        await getPlaygroundRepository().deleteRun({
          uid: authUser.uid,
          runId: getRouteParam(request, 'runId'),
        });

        sendNoContent(response);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    '/api/v1/playground-configs',
    requireAuth,
    requirePlaygroundConfigRateLimit,
    async (request, response, next) => {
      try {
        const authUser = getAuthUser(response);
        const body = getObjectBody(request);
        const result = await getPlaygroundRepository().createConfig({
          uid: authUser.uid,
          name: getStringBodyField(request, 'name'),
          scenarioId: getStringBodyField(request, 'scenarioId'),
          algorithmId: getStringBodyField(request, 'algorithmId'),
          datasetVersionId: getStringBodyField(request, 'datasetVersionId'),
          config: body.config,
        });

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get('/api/v1/playground-configs', requireAuth, async (request, response, next) => {
    try {
      const authUser = getAuthUser(response);
      const result = await getPlaygroundRepository().listConfigs({
        uid: authUser.uid,
        scenarioId: getStringQueryField(request, 'scenarioId'),
      });

      sendSuccess(response, result.statusCode, result.data);
    } catch (error) {
      next(error);
    }
  });

  app.patch(
    '/api/v1/playground-configs/:configId',
    requireAuth,
    requirePlaygroundConfigUpdateRateLimit,
    async (request, response, next) => {
      try {
        const authUser = getAuthUser(response);
        const body = getObjectBody(request);
        const input: UpdatePlaygroundConfigInput = {
          uid: authUser.uid,
          configId: getRouteParam(request, 'configId'),
        };
        const name = getOptionalStringBodyField(request, 'name');

        if (name !== undefined) {
          input.name = name;
        }

        if ('config' in body) {
          input.config = body.config;
        }

        const result = await getPlaygroundRepository().updateConfig(input);

        sendSuccess(response, result.statusCode, result.data);
      } catch (error) {
        next(error);
      }
    },
  );

  app.delete(
    '/api/v1/playground-configs/:configId',
    requireAuth,
    requirePlaygroundConfigDeleteRateLimit,
    async (request, response, next) => {
      try {
        const authUser = getAuthUser(response);

        await getPlaygroundRepository().deleteConfig({
          uid: authUser.uid,
          configId: getRouteParam(request, 'configId'),
        });

        sendNoContent(response);
      } catch (error) {
        next(error);
      }
    },
  );

  app.use((_request, response) => {
    sendError(response, 404, {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
      details: [],
    });
  });

  app.use(handleApiError);

  return app;
}
