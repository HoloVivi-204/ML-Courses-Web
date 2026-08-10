import { createHash } from 'node:crypto';

import { ApiError } from './api-error.js';

export const LEARNING_EVENT_TYPES = [
  'user_registered',
  'user_logged_in',
  'course_enrolled',
  'course_started',
  'module_overview_viewed',
  'module_started',
  'post_started',
  'post_content_viewed',
  'post_quiz_submitted',
  'post_completed',
  'demo_started',
  'demo_completed',
  'module_quiz_submitted',
  'module_completed',
  'algorithm_unlocked',
  'playground_opened',
  'playground_dataset_dragged',
  'playground_dataset_selected',
  'playground_run_started',
  'playground_run_completed',
  'playground_run_cancelled',
  'playground_run_failed',
  'course_completed',
  'external_resource_opened',
] as const;

export type LearningEventType = (typeof LEARNING_EVENT_TYPES)[number];
export type LearningEventVerificationLevel = 'server-verified' | 'client-computed';
export type LearningEventPayloadValue = boolean | number | string | null;
export type LearningEventPayload = Readonly<Record<string, LearningEventPayloadValue>>;

const LEARNING_EVENT_TTL_MILLISECONDS = 180 * 24 * 60 * 60 * 1_000;
const CLIENT_EVENT_TYPES = new Set<LearningEventType>([
  'playground_opened',
  'playground_dataset_dragged',
  'playground_dataset_selected',
  'playground_run_cancelled',
  'playground_run_failed',
]);

const EVENT_PAYLOAD_FIELDS: Readonly<Record<LearningEventType, readonly string[]>> = {
  algorithm_unlocked: ['algorithmId', 'moduleId'],
  course_completed: ['courseId'],
  course_enrolled: ['courseId'],
  course_started: ['courseId'],
  demo_completed: ['demoId', 'moduleId'],
  demo_started: ['demoId', 'moduleId'],
  external_resource_opened: ['postId', 'resourceType', 'sourceId'],
  module_completed: ['courseId', 'moduleId'],
  module_overview_viewed: ['courseId', 'moduleId'],
  module_quiz_submitted: ['attemptNo', 'passed', 'quizId', 'quizRevisionId', 'score'],
  module_started: ['courseId', 'moduleId'],
  post_completed: ['courseId', 'moduleId', 'postId'],
  post_content_viewed: ['postId', 'viewedBlockCount'],
  post_quiz_submitted: ['attemptNo', 'passed', 'postId', 'quizId', 'quizRevisionId', 'score'],
  post_started: ['courseId', 'postId', 'revisionId'],
  playground_dataset_dragged: ['datasetVersionId', 'scenarioId'],
  playground_dataset_selected: ['datasetVersionId', 'scenarioId'],
  playground_opened: ['scenarioId'],
  playground_run_cancelled: ['algorithmId', 'cancellationMode', 'runId', 'scenarioId'],
  playground_run_completed: ['algorithmId', 'durationMs', 'runId', 'scenarioId'],
  playground_run_failed: ['algorithmId', 'normalizedErrorCode', 'runId', 'scenarioId'],
  playground_run_started: ['algorithmId', 'runId', 'scenarioId'],
  user_logged_in: ['provider'],
  user_registered: ['provider'],
};

const REQUIRED_EVENT_PAYLOAD_FIELDS: Readonly<
  Partial<Record<LearningEventType, readonly string[]>>
> = {
  algorithm_unlocked: ['algorithmId', 'moduleId'],
  course_completed: ['courseId'],
  course_enrolled: ['courseId'],
  course_started: ['courseId'],
  demo_completed: ['demoId'],
  demo_started: ['demoId'],
  module_completed: ['moduleId'],
  module_overview_viewed: ['moduleId'],
  module_quiz_submitted: ['attemptNo', 'passed', 'quizId', 'score'],
  module_started: ['moduleId'],
  post_completed: ['postId'],
  post_content_viewed: ['postId', 'viewedBlockCount'],
  post_quiz_submitted: ['attemptNo', 'passed', 'postId', 'quizId', 'score'],
  post_started: ['postId'],
  playground_dataset_dragged: ['datasetVersionId', 'scenarioId'],
  playground_dataset_selected: ['datasetVersionId', 'scenarioId'],
  playground_opened: ['scenarioId'],
  playground_run_cancelled: ['algorithmId', 'cancellationMode', 'scenarioId'],
  playground_run_completed: ['algorithmId', 'runId', 'scenarioId'],
  playground_run_failed: ['algorithmId', 'normalizedErrorCode', 'scenarioId'],
  playground_run_started: ['algorithmId', 'runId', 'scenarioId'],
};

export interface CreateLearningEventIdInput {
  dedupeKey: string;
  uid: string;
}

export interface CreateLearningEventDocumentInput {
  eventId: string;
  eventType: LearningEventType;
  now: Date;
  payload: LearningEventPayload;
  uid: string;
  verificationLevel: LearningEventVerificationLevel;
  serverTimestamp?: unknown;
}

export interface LearningEventDocument {
  createdAt: unknown;
  eventId: string;
  eventType: LearningEventType;
  expireAt: Date;
  occurredAt: unknown;
  payload: LearningEventPayload;
  schemaVersion: 1;
  uidHash: string;
  verificationLevel: LearningEventVerificationLevel;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertEventType(value: string): asserts value is LearningEventType {
  if (!LEARNING_EVENT_TYPES.includes(value as LearningEventType)) {
    throw new ApiError(
      400,
      'LEARNING_EVENT_TYPE_INVALID',
      'The learning event type is not supported.',
    );
  }
}

function normalizeValue(value: unknown, fieldName: string): LearningEventPayloadValue {
  if (typeof value === 'string') {
    const normalized = value.trim();

    if (!normalized || normalized.length > 160) {
      throw new ApiError(400, 'LEARNING_EVENT_PAYLOAD_INVALID', `${fieldName} is invalid.`);
    }

    return normalized;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      throw new ApiError(400, 'LEARNING_EVENT_PAYLOAD_INVALID', `${fieldName} is invalid.`);
    }

    return value;
  }

  if (typeof value === 'boolean' || value === null) {
    return value;
  }

  throw new ApiError(400, 'LEARNING_EVENT_PAYLOAD_INVALID', `${fieldName} is invalid.`);
}

function assertRequiredPayloadFields(
  eventType: LearningEventType,
  payload: Record<string, unknown>,
): void {
  for (const field of REQUIRED_EVENT_PAYLOAD_FIELDS[eventType] ?? []) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      throw new ApiError(
        400,
        'LEARNING_EVENT_PAYLOAD_INVALID',
        `${field} is required for ${eventType}.`,
      );
    }
  }
}

export function isClientLearningEventType(eventType: LearningEventType): boolean {
  return CLIENT_EVENT_TYPES.has(eventType);
}

export function normalizeLearningEventPayload(
  eventTypeInput: string,
  payloadInput: unknown,
): LearningEventPayload {
  assertEventType(eventTypeInput);

  if (!isRecord(payloadInput)) {
    throw new ApiError(400, 'LEARNING_EVENT_PAYLOAD_INVALID', 'Event payload must be an object.');
  }

  assertRequiredPayloadFields(eventTypeInput, payloadInput);
  const allowedFields = EVENT_PAYLOAD_FIELDS[eventTypeInput];
  const unsupportedFields = Object.keys(payloadInput).filter(
    (field) => !allowedFields.includes(field),
  );

  if (unsupportedFields.length > 0) {
    throw new ApiError(
      400,
      'LEARNING_EVENT_PAYLOAD_INVALID',
      `Event payload fields are not allowed: ${unsupportedFields.join(', ')}.`,
    );
  }

  const normalizedPayload: Record<string, LearningEventPayloadValue> = {};

  for (const field of allowedFields) {
    if (payloadInput[field] !== undefined) {
      normalizedPayload[field] = normalizeValue(payloadInput[field], field);
    }
  }

  return normalizedPayload;
}

export function createLearningEventId(input: CreateLearningEventIdInput): string {
  return createHash('sha256')
    .update('learning-event:')
    .update(input.uid)
    .update(':')
    .update(input.dedupeKey)
    .digest('hex');
}

export function createLearningLearnerHash(uid: string): string {
  return createHash('sha256').update('learning-learner:').update(uid).digest('hex');
}

export function createLearningEventDocument(
  input: CreateLearningEventDocumentInput,
): LearningEventDocument {
  if (!input.uid.trim()) {
    throw new ApiError(500, 'LEARNING_EVENT_ACTOR_INVALID', 'A learning event actor is required.');
  }

  const nowMillis = input.now.getTime();

  if (!Number.isFinite(nowMillis)) {
    throw new ApiError(
      500,
      'LEARNING_EVENT_TIME_INVALID',
      'A valid learning event time is required.',
    );
  }

  const serverTimestamp = input.serverTimestamp ?? { __type: 'serverTimestamp' };

  return {
    createdAt: serverTimestamp,
    eventId: input.eventId,
    eventType: input.eventType,
    expireAt: new Date(nowMillis + LEARNING_EVENT_TTL_MILLISECONDS),
    occurredAt: serverTimestamp,
    payload: normalizeLearningEventPayload(input.eventType, input.payload),
    schemaVersion: 1,
    uidHash: createLearningLearnerHash(input.uid),
    verificationLevel: input.verificationLevel,
  };
}

export function getLearningEventTtlMilliseconds(): number {
  return LEARNING_EVENT_TTL_MILLISECONDS;
}
