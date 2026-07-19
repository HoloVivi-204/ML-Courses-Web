import { randomUUID } from 'node:crypto';

import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { getAuth } from 'firebase-admin/auth';
import helmet from 'helmet';

import { ApiError } from './api-error.js';
import { assertRequiredDemoStepsViewed } from './demo-manifest.js';
import { getFirebaseAdminApp } from './firebase-admin-app.js';
import { createDefaultLearningRepository, type LearningRepository } from './learning-repository.js';
import type { QuizAnswer, QuizAnswerValue } from './quiz-manifest.js';

export interface VerifiedAuthUser {
  displayName: string;
  email?: string | undefined;
  uid: string;
}

interface ApiErrorBody {
  code: string;
  details: readonly unknown[];
  message: string;
}

export interface ApiAppOptions {
  learningRepository?: LearningRepository | undefined;
  verifyAuthToken?: ((idToken: string) => Promise<VerifiedAuthUser>) | undefined;
}

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

function getStringArrayBodyField(request: Request, name: string): string[] {
  const value = (request.body as Record<string, unknown> | undefined)?.[name];

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new ApiError(400, 'INVALID_REQUEST_BODY', `${name} must be a non-empty string array.`);
  }

  return [...new Set(value.map((item) => item.trim()))];
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

async function defaultVerifyAuthToken(idToken: string): Promise<VerifiedAuthUser> {
  const decodedToken = await getAuth(getFirebaseAdminApp()).verifyIdToken(idToken);

  return {
    uid: decodedToken.uid,
    displayName: typeof decodedToken.name === 'string' ? decodedToken.name : 'Learner',
    email: typeof decodedToken.email === 'string' ? decodedToken.email : undefined,
  };
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
  let learningRepository = options.learningRepository;
  const requireAuth = createAuthMiddleware(options.verifyAuthToken ?? defaultVerifyAuthToken);

  function getLearningRepository(): LearningRepository {
    learningRepository ??= createDefaultLearningRepository();

    return learningRepository;
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

  app.post('/api/v1/users/me/bootstrap', requireAuth, async (_request, response, next) => {
    try {
      const authUser = getAuthUser(response);
      const result = await getLearningRepository().bootstrapLearner({
        uid: authUser.uid,
        displayName: authUser.displayName || 'Learner',
      });

      sendSuccess(response, result.statusCode, result.data);
    } catch (error) {
      next(error);
    }
  });

  app.post(
    '/api/v1/courses/:courseId/enrollments',
    requireAuth,
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

  app.post('/api/v1/demos/:demoId/completions', requireAuth, async (request, response, next) => {
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
  });

  app.post('/api/v1/quizzes/:quizId/attempts', requireAuth, async (request, response, next) => {
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
  });

  app.post(
    '/api/v1/quiz-attempts/:attemptId/submissions',
    requireAuth,
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
