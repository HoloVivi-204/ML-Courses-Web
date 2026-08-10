import {
  FieldValue,
  getFirestore,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';

import { ApiError } from './api-error.js';
import {
  createLearningEventDocument,
  createLearningEventId,
  isClientLearningEventType,
  normalizeLearningEventPayload,
  type LearningEventDocument,
  type LearningEventPayload,
  type LearningEventType,
  type LearningEventVerificationLevel,
} from './learning-events.js';
import { getFirebaseAdminApp } from './firebase-admin-app.js';

const LEARNING_EVENTS_COLLECTION = 'learningEvents';

export interface RecordLearningEventInput {
  dedupeKey: string;
  eventType: LearningEventType;
  payload: unknown;
  uid: string;
  verificationLevel?: LearningEventVerificationLevel | undefined;
}

export interface LearningEventResponse {
  accepted: true;
  eventId: string;
  verificationLevel: LearningEventVerificationLevel;
}

export interface LearningEventRepository {
  record(input: RecordLearningEventInput): Promise<{
    data: LearningEventResponse;
    statusCode: 200 | 201;
  }>;
}

export interface FirestoreLearningEventRepositoryOptions {
  now?: (() => Date) | undefined;
}

interface StoredLearningEvent extends LearningEventDocument {
  requestHash: string;
}

interface LearningEventWriteInput {
  dedupeKey: string;
  eventType: LearningEventType;
  now: Date;
  payload: LearningEventPayload;
  uid: string;
  verificationLevel: LearningEventVerificationLevel;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }

  if (typeof value === 'object' && value !== null) {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function createRequestHash(input: {
  eventType: LearningEventType;
  payload: LearningEventPayload;
  verificationLevel: LearningEventVerificationLevel;
}): string {
  return createHash('sha256')
    .update(
      canonicalize({
        eventType: input.eventType,
        payload: input.payload,
        verificationLevel: input.verificationLevel,
      }),
    )
    .digest('hex');
}

function createStoredLearningEvent(input: LearningEventWriteInput): StoredLearningEvent {
  const eventId = createLearningEventId({ dedupeKey: input.dedupeKey, uid: input.uid });

  return {
    ...createLearningEventDocument({
      eventId,
      eventType: input.eventType,
      now: input.now,
      payload: input.payload,
      serverTimestamp: FieldValue.serverTimestamp(),
      uid: input.uid,
      verificationLevel: input.verificationLevel,
    }),
    requestHash: createRequestHash({
      eventType: input.eventType,
      payload: input.payload,
      verificationLevel: input.verificationLevel,
    }),
  };
}

function toEventResponse(event: Pick<StoredLearningEvent, 'eventId' | 'verificationLevel'>): {
  data: LearningEventResponse;
  statusCode: 200 | 201;
} {
  return {
    data: {
      accepted: true,
      eventId: event.eventId,
      verificationLevel: event.verificationLevel,
    },
    statusCode: 201,
  };
}

function assertClientEvent(input: RecordLearningEventInput): void {
  if (!isClientLearningEventType(input.eventType)) {
    throw new ApiError(
      403,
      'LEARNING_EVENT_SERVER_ONLY',
      'This learning event is emitted by the trusted server.',
    );
  }

  if (input.verificationLevel !== undefined && input.verificationLevel !== 'client-computed') {
    throw new ApiError(
      400,
      'LEARNING_EVENT_VERIFICATION_INVALID',
      'Client learning events must be client-computed.',
    );
  }
}

export function setLearningEventInTransaction(
  transaction: Transaction,
  firestore: Firestore,
  input: LearningEventWriteInput,
): string {
  const storedEvent = createStoredLearningEvent(input);

  transaction.set(
    firestore.doc(`${LEARNING_EVENTS_COLLECTION}/${storedEvent.eventId}`),
    storedEvent,
    {
      merge: true,
    },
  );

  return storedEvent.eventId;
}

export function createFirestoreLearningEventRepository(
  firestore: Firestore,
  options: FirestoreLearningEventRepositoryOptions = {},
): LearningEventRepository {
  const now = options.now ?? (() => new Date());

  return {
    async record(input) {
      assertClientEvent(input);
      const payload = normalizeLearningEventPayload(input.eventType, input.payload);
      const verificationLevel = 'client-computed' as const;
      const storedEvent = createStoredLearningEvent({
        dedupeKey: input.dedupeKey,
        eventType: input.eventType,
        now: now(),
        payload,
        uid: input.uid,
        verificationLevel,
      });
      const eventReference = firestore.doc(`${LEARNING_EVENTS_COLLECTION}/${storedEvent.eventId}`);

      return firestore.runTransaction(async (transaction) => {
        const existingSnapshot = await transaction.get(eventReference);

        if (existingSnapshot.exists) {
          const existing = existingSnapshot.data() as Partial<StoredLearningEvent> | undefined;

          if (existing?.requestHash !== storedEvent.requestHash) {
            throw new ApiError(
              409,
              'IDEMPOTENCY_CONFLICT',
              'This Idempotency-Key was used for a different learning event.',
            );
          }

          return {
            data: {
              accepted: true,
              eventId: storedEvent.eventId,
              verificationLevel: existing.verificationLevel ?? verificationLevel,
            },
            statusCode: 200 as const,
          };
        }

        transaction.create(eventReference, storedEvent);

        return toEventResponse(storedEvent);
      });
    },
  };
}

export function createDefaultLearningEventRepository(): LearningEventRepository {
  return createFirestoreLearningEventRepository(getFirestore(getFirebaseAdminApp()));
}
