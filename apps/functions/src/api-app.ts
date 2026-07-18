import { randomUUID } from 'node:crypto';

import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import helmet from 'helmet';

interface ApiErrorBody {
  code: string;
  details: readonly unknown[];
  message: string;
}

function getRequestId(response: Response): string {
  return String(response.locals.requestId);
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

function isInvalidJsonError(error: unknown): boolean {
  return error instanceof SyntaxError && 'body' in error;
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

export function createApiApp(): express.Express {
  const app = express();

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
