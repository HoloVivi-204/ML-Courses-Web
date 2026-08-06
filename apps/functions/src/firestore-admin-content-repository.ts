import { createHash, randomUUID } from 'node:crypto';

import {
  getFirestore,
  type DocumentSnapshot,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';

import {
  assertPublishEvidenceIsComplete,
  createAdminContentDraftChecksum,
  requiredAdminContentEvidenceKinds,
  type AdminContentExternalEvidence,
} from './admin-content-evidence.js';
import {
  applyAdminDraftToPublishedLearnerContent,
  type PublishedLearnerContent,
} from './learning-content-repository.js';
import {
  applyDraftPatch,
  createAdminContentLifecycleEvent,
  createDraftFromPublished,
  createPublishRequestHash,
  createPublishedContentFromDraft,
  createValidationResult,
  getAdminContentIdempotencyRecordKey,
  getAdminContentKey,
  hasDraftPatchValue,
  isAdminContentEntityType,
  isAdminContentPublicationScope,
  type AdminContentDraft,
  type AdminContentEntityType,
  type AdminContentLifecycleEvent,
  type AdminContentPublicationScope,
  type AdminContentRepository,
  type AdminContentSummary,
  type PublishAdminContentRevisionResult,
} from './admin-content-repository.js';
import { ApiError } from './api-error.js';
import { getFirebaseAdminApp } from './firebase-admin-app.js';

const ADMIN_CONTENT_ENTITIES_COLLECTION = 'adminContentEntities';
const ADMIN_CONTENT_IDEMPOTENCY_COLLECTION = 'adminContentPublishIdempotency';
const ADMIN_CONTENT_LIFECYCLE_EVENTS_COLLECTION = 'adminContentLifecycleEvents';
const ADMIN_CONTENT_REVISIONS_COLLECTION = 'adminContentRevisions';
const IDEMPOTENCY_RECORD_TTL_MILLISECONDS = 24 * 60 * 60 * 1000;

interface StoredAdminContentEntity {
  currentContent: AdminContentSummary;
  draftRevisionId: string | null;
  entityId: string;
  entityType: AdminContentEntityType;
  lastLifecycleEvent?: AdminContentLifecycleEvent | undefined;
  schemaVersion: 1;
  updatedAt: string;
}

interface StoredDraftRevision {
  contentChecksum: string;
  createdAt: string;
  draft: AdminContentDraft;
  entityKey: string;
  learnerContent: PublishedLearnerContent | null;
  schemaVersion: 1;
  state: 'draft';
  updatedAt: string;
}

interface StoredPublishedRevision {
  contentChecksum: string;
  createdAt: string;
  entityKey: string;
  learnerContent: PublishedLearnerContent | null;
  publishedAt: string;
  publishedContent: AdminContentSummary;
  schemaVersion: 1;
  state: 'published';
}

interface StoredPublishIdempotencyRecord {
  actorUid: string;
  expireAt: Date;
  requestHash: string;
  result: PublishAdminContentRevisionResult;
  schemaVersion: 1;
}

export interface FirestoreAdminContentRepositoryOptions {
  firestore?: Firestore | undefined;
  now?: (() => Date) | undefined;
  verifyPublishEvidence?:
    | ((input: {
        artifactId: string;
        contentChecksum: string;
        evidence: readonly AdminContentExternalEvidence[];
      }) => void | Promise<void>)
    | undefined;
  isEmulator?: (() => boolean) | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createDataIntegrityError(): ApiError {
  return new ApiError(
    500,
    'ADMIN_CONTENT_DATA_INTEGRITY_ERROR',
    'Persisted admin content data is invalid.',
  );
}

function getEntityDocumentId(entityType: AdminContentEntityType, entityId: string): string {
  return getAdminContentKey(entityType, entityId);
}

function getIdempotencyDocumentId(actorUid: string, idempotencyKey: string): string {
  return createHash('sha256')
    .update(getAdminContentIdempotencyRecordKey({ actorUid, idempotencyKey }))
    .digest('hex');
}

function withDraftRevision(
  content: AdminContentSummary,
  draftRevisionId: string | null,
): AdminContentSummary {
  return { ...content, draftRevisionId };
}

function readStoredEntity(snapshot: DocumentSnapshot): StoredAdminContentEntity {
  const value = snapshot.data();

  if (
    !snapshot.exists ||
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isRecord(value.currentContent) ||
    typeof value.entityId !== 'string' ||
    !isAdminContentEntityType(String(value.entityType)) ||
    (value.draftRevisionId !== null && typeof value.draftRevisionId !== 'string')
  ) {
    throw createDataIntegrityError();
  }

  return value as unknown as StoredAdminContentEntity;
}

function readStoredDraftRevision(snapshot: DocumentSnapshot): StoredDraftRevision {
  const value = snapshot.data();

  if (
    !snapshot.exists ||
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.state !== 'draft' ||
    !isRecord(value.draft) ||
    typeof value.contentChecksum !== 'string' ||
    typeof value.entityKey !== 'string'
  ) {
    throw new ApiError(
      404,
      'ADMIN_CONTENT_DRAFT_NOT_FOUND',
      'The requested draft revision was not found.',
    );
  }

  return {
    ...(value as unknown as StoredDraftRevision),
    learnerContent:
      (value as { learnerContent?: PublishedLearnerContent | undefined }).learnerContent ?? null,
  };
}

function readStoredPublishedRevision(snapshot: DocumentSnapshot): StoredPublishedRevision {
  const value = snapshot.data();

  if (
    !snapshot.exists ||
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.state !== 'published' ||
    !isRecord(value.publishedContent) ||
    typeof value.entityKey !== 'string'
  ) {
    throw new ApiError(
      404,
      'ADMIN_CONTENT_REVISION_NOT_FOUND',
      'The requested published revision was not found.',
    );
  }

  return {
    ...(value as unknown as StoredPublishedRevision),
    learnerContent:
      (value as { learnerContent?: PublishedLearnerContent | undefined }).learnerContent ?? null,
  };
}

function readStoredIdempotencyRecord(snapshot: DocumentSnapshot): StoredPublishIdempotencyRecord {
  const value = snapshot.data();

  if (!snapshot.exists || !isRecord(value) || value.schemaVersion !== 1) {
    throw createDataIntegrityError();
  }

  return value as unknown as StoredPublishIdempotencyRecord;
}

function assertActorUid(actorUid: string): void {
  if (!actorUid) {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }
}

function assertIdempotencyKey(idempotencyKey: string): void {
  if (!idempotencyKey) {
    throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required.');
  }
}

function getPublicationScope(value: string | undefined): AdminContentPublicationScope {
  if (value === undefined) {
    return 'publish-quality';
  }

  if (!isAdminContentPublicationScope(value)) {
    throw new ApiError(
      400,
      'ADMIN_CONTENT_PUBLICATION_SCOPE_INVALID',
      'The requested publication scope is not supported.',
    );
  }

  return value;
}

function createDraftRevisionId(entityType: AdminContentEntityType, entityId: string): string {
  return `draft-${entityType}-${entityId}-${randomUUID()}`;
}

function createPublishCandidateContent(input: {
  currentContent: readonly AdminContentSummary[];
  draft: AdminContentDraft;
  publishedContent: AdminContentSummary;
}): readonly AdminContentSummary[] {
  const draftContentKey = getAdminContentKey(input.draft.entityType, input.draft.entityId);
  const replacement = createPublishedContentFromDraft({
    draft: input.draft,
    previousPublishedRevisionId: input.publishedContent.publishedRevisionId,
  });

  return input.currentContent.map((content) =>
    getAdminContentKey(content.entityType, content.entityId) === draftContentKey
      ? replacement
      : content,
  );
}

function getCurrentContentFromSnapshots(
  snapshots: readonly DocumentSnapshot[],
): readonly AdminContentSummary[] {
  return snapshots.map((snapshot) => readStoredEntity(snapshot).currentContent);
}

function getEvidenceDocumentPath(revisionId: string, kind: string): string {
  return `${ADMIN_CONTENT_REVISIONS_COLLECTION}/${revisionId}/externalEvidence/${kind}`;
}

async function readPublishEvidence(
  transaction: Transaction,
  firestore: Firestore,
  revisionId: string,
): Promise<readonly AdminContentExternalEvidence[]> {
  const snapshots = await Promise.all(
    requiredAdminContentEvidenceKinds.map((kind) =>
      transaction.get(firestore.doc(getEvidenceDocumentPath(revisionId, kind))),
    ),
  );

  return snapshots.flatMap((snapshot) => {
    const evidence = snapshot.data();

    return isRecord(evidence) ? [evidence as unknown as AdminContentExternalEvidence] : [];
  });
}

export function createFirestoreAdminContentRepository(
  options: FirestoreAdminContentRepositoryOptions = {},
): AdminContentRepository {
  const firestore = options.firestore ?? getFirestore(getFirebaseAdminApp());
  const now = options.now ?? (() => new Date());
  const verifyPublishEvidence = options.verifyPublishEvidence ?? assertPublishEvidenceIsComplete;
  const isEmulator = options.isEmulator ?? (() => Boolean(process.env.FIRESTORE_EMULATOR_HOST));
  const entities = firestore.collection(ADMIN_CONTENT_ENTITIES_COLLECTION);
  const revisions = firestore.collection(ADMIN_CONTENT_REVISIONS_COLLECTION);
  const lifecycleEvents = firestore.collection(ADMIN_CONTENT_LIFECYCLE_EVENTS_COLLECTION);
  const idempotencyRecords = firestore.collection(ADMIN_CONTENT_IDEMPOTENCY_COLLECTION);

  return {
    async createDraft(input) {
      assertActorUid(input.createdByUid);

      if (!isAdminContentEntityType(input.entityType)) {
        throw new ApiError(
          400,
          'ADMIN_CONTENT_ENTITY_TYPE_INVALID',
          'The requested admin content entity type is not supported.',
        );
      }

      const entityReference = entities.doc(getEntityDocumentId(input.entityType, input.entityId));
      const draftRevisionId = createDraftRevisionId(input.entityType, input.entityId);
      const draftReference = revisions.doc(draftRevisionId);
      const currentTime = now().toISOString();

      return firestore.runTransaction(async (transaction) => {
        const entity = readStoredEntity(await transaction.get(entityReference));

        if (entity.draftRevisionId !== null) {
          throw new ApiError(
            409,
            'ADMIN_CONTENT_DRAFT_ALREADY_EXISTS',
            'This content item already has a draft.',
          );
        }

        const currentRevision = readStoredPublishedRevision(
          await transaction.get(revisions.doc(entity.currentContent.publishedRevisionId)),
        );

        if (
          currentRevision.entityKey !==
          getAdminContentKey(entity.currentContent.entityType, entity.currentContent.entityId)
        ) {
          throw createDataIntegrityError();
        }

        const draft = {
          ...createDraftFromPublished(entity.currentContent),
          draftRevisionId,
        } satisfies AdminContentDraft;
        const contentChecksum = createAdminContentDraftChecksum(draft);
        const storedDraft: StoredDraftRevision = {
          contentChecksum,
          createdAt: currentTime,
          draft,
          entityKey: getAdminContentKey(draft.entityType, draft.entityId),
          learnerContent: currentRevision.learnerContent,
          schemaVersion: 1,
          state: 'draft',
          updatedAt: currentTime,
        };

        transaction.create(draftReference, storedDraft);
        transaction.update(entityReference, {
          draftRevisionId,
          updatedAt: currentTime,
        });

        return {
          statusCode: 201,
          data: {
            draft,
            published: withDraftRevision(entity.currentContent, draftRevisionId),
          },
        } as const;
      });
    },
    async listContent(input) {
      if (input.entityType !== undefined && !isAdminContentEntityType(input.entityType)) {
        throw new ApiError(
          400,
          'ADMIN_CONTENT_ENTITY_TYPE_INVALID',
          'The requested admin content entity type is not supported.',
        );
      }

      const snapshot = await entities.get();
      const content = snapshot.docs
        .map((document) => readStoredEntity(document))
        .filter((entity) => {
          const currentContent = entity.currentContent;

          return (
            (input.entityType === undefined || currentContent.entityType === input.entityType) &&
            (input.courseId === undefined || currentContent.courseId === input.courseId) &&
            (input.moduleId === undefined || currentContent.moduleId === input.moduleId)
          );
        })
        .map((entity) => withDraftRevision(entity.currentContent, entity.draftRevisionId));

      return { statusCode: 200, data: { content } } as const;
    },
    async updateDraft(input) {
      assertActorUid(input.actorUid);

      if (!hasDraftPatchValue(input.patch)) {
        throw new ApiError(
          400,
          'ADMIN_CONTENT_DRAFT_PATCH_EMPTY',
          'At least one allowlisted draft field is required.',
        );
      }

      const revisionReference = revisions.doc(input.revisionId);

      return firestore.runTransaction(async (transaction) => {
        const existingDraft = readStoredDraftRevision(await transaction.get(revisionReference));

        if (existingDraft.draft.revisionVersion !== input.revisionVersion) {
          throw new ApiError(
            409,
            'ADMIN_CONTENT_DRAFT_VERSION_CONFLICT',
            'The draft has changed. Reload it before saving again.',
          );
        }

        const draft = applyDraftPatch(existingDraft.draft, input.patch);
        const updatedAt = now().toISOString();

        transaction.set(revisionReference, {
          ...existingDraft,
          contentChecksum: createAdminContentDraftChecksum(draft),
          draft,
          updatedAt,
        } satisfies StoredDraftRevision);

        return { statusCode: 200, data: { draft } } as const;
      });
    },
    async validateDraft(input) {
      assertActorUid(input.actorUid);

      const revisionReference = revisions.doc(input.revisionId);

      return firestore.runTransaction(async (transaction) => {
        const storedDraft = readStoredDraftRevision(await transaction.get(revisionReference));
        const entityReference = entities.doc(
          getEntityDocumentId(storedDraft.draft.entityType, storedDraft.draft.entityId),
        );
        const entity = readStoredEntity(await transaction.get(entityReference));
        const entitySnapshots = await transaction.get(entities);
        const validation = createValidationResult({
          draft: storedDraft.draft,
          publishCandidateContent: createPublishCandidateContent({
            currentContent: getCurrentContentFromSnapshots(entitySnapshots.docs),
            draft: storedDraft.draft,
            publishedContent: entity.currentContent,
          }),
        });
        const draft = { ...storedDraft.draft, validationStatus: 'valid' } as AdminContentDraft;
        const updatedAt = now().toISOString();

        transaction.set(revisionReference, {
          ...storedDraft,
          contentChecksum: createAdminContentDraftChecksum(draft),
          draft,
          updatedAt,
        } satisfies StoredDraftRevision);

        return {
          statusCode: 200,
          data: { draft, validation },
        } as const;
      });
    },
    async publishRevision(input) {
      assertActorUid(input.actorUid);
      assertIdempotencyKey(input.idempotencyKey);

      const publicationScope = getPublicationScope(input.publicationScope);

      if (publicationScope === 'emulator-demo' && !isEmulator()) {
        throw new ApiError(
          403,
          'ADMIN_CONTENT_EMULATOR_PUBLISH_ONLY',
          'Emulator demo publication is only available in the Firestore Emulator Suite.',
        );
      }

      const requestHash = createPublishRequestHash(input);
      const idempotencyReference = idempotencyRecords.doc(
        getIdempotencyDocumentId(input.actorUid, input.idempotencyKey),
      );
      const revisionReference = revisions.doc(input.revisionId);
      const eventReference = lifecycleEvents.doc();
      const currentTime = now();
      const createdAt = currentTime.toISOString();

      return firestore.runTransaction(async (transaction) => {
        const idempotencySnapshot = await transaction.get(idempotencyReference);

        if (idempotencySnapshot.exists) {
          const record = readStoredIdempotencyRecord(idempotencySnapshot);

          if (record.requestHash !== requestHash) {
            throw new ApiError(
              409,
              'IDEMPOTENCY_CONFLICT',
              'This Idempotency-Key was used for a different request.',
            );
          }

          return record.result;
        }

        const storedDraft = readStoredDraftRevision(await transaction.get(revisionReference));

        if (storedDraft.draft.validationStatus !== 'valid') {
          throw new ApiError(
            422,
            'ADMIN_CONTENT_VALIDATION_REQUIRED',
            'Draft validation must pass before publish.',
          );
        }

        const entityReference = entities.doc(
          getEntityDocumentId(storedDraft.draft.entityType, storedDraft.draft.entityId),
        );
        const entity = readStoredEntity(await transaction.get(entityReference));

        if (entity.currentContent.publishedRevisionId !== storedDraft.draft.baseRevisionId) {
          throw new ApiError(
            409,
            'ADMIN_CONTENT_DRAFT_STALE',
            'The current published revision changed. Create a new draft before publishing.',
          );
        }
        if (publicationScope === 'publish-quality') {
          const evidence = await readPublishEvidence(transaction, firestore, input.revisionId);

          await verifyPublishEvidence({
            artifactId: storedDraft.draft.entityId,
            contentChecksum: storedDraft.contentChecksum,
            evidence,
          });
        }

        const content = createPublishedContentFromDraft({
          draft: storedDraft.draft,
          publicationScope,
          previousPublishedRevisionId: entity.currentContent.publishedRevisionId,
        });
        const lifecycleEvent = createAdminContentLifecycleEvent({
          actorUid: input.actorUid,
          createdAt,
          entityId: content.entityId,
          entityType: content.entityType,
          fromRevisionId: entity.currentContent.publishedRevisionId,
          reason: input.reason,
          requestId: input.requestId,
          toRevisionId: content.publishedRevisionId,
          type: 'published',
          publicationScope,
        });
        const result: PublishAdminContentRevisionResult = {
          statusCode: 200,
          data: { content, lifecycleEvent },
        };
        const publishedRevision: StoredPublishedRevision = {
          contentChecksum: storedDraft.contentChecksum,
          createdAt: storedDraft.createdAt,
          entityKey: storedDraft.entityKey,
          learnerContent: applyAdminDraftToPublishedLearnerContent({
            draft: storedDraft.draft,
            learnerContent: storedDraft.learnerContent,
          }),
          publishedAt: createdAt,
          publishedContent: content,
          schemaVersion: 1,
          state: 'published',
        };
        const idempotencyRecord: StoredPublishIdempotencyRecord = {
          actorUid: input.actorUid,
          expireAt: new Date(currentTime.getTime() + IDEMPOTENCY_RECORD_TTL_MILLISECONDS),
          requestHash,
          result,
          schemaVersion: 1,
        };

        transaction.set(revisionReference, publishedRevision);
        transaction.set(entityReference, {
          ...entity,
          currentContent: content,
          draftRevisionId: null,
          lastLifecycleEvent: lifecycleEvent,
          updatedAt: createdAt,
        } satisfies StoredAdminContentEntity);
        transaction.create(idempotencyReference, idempotencyRecord);
        transaction.create(eventReference, { ...lifecycleEvent, schemaVersion: 1 });

        return result;
      });
    },
    async rollbackRevision(input) {
      assertActorUid(input.actorUid);

      const revisionReference = revisions.doc(input.revisionId);
      const eventReference = lifecycleEvents.doc();
      const createdAt = now().toISOString();

      return firestore.runTransaction(async (transaction) => {
        const targetRevision = readStoredPublishedRevision(
          await transaction.get(revisionReference),
        );
        const entityReference = entities.doc(targetRevision.entityKey);
        const entity = readStoredEntity(await transaction.get(entityReference));

        if (
          entity.currentContent.publishedRevisionId ===
          targetRevision.publishedContent.publishedRevisionId
        ) {
          throw new ApiError(
            409,
            'ADMIN_CONTENT_ROLLBACK_NOT_REQUIRED',
            'The requested revision is already the current published revision.',
          );
        }

        const content: AdminContentSummary = {
          ...targetRevision.publishedContent,
          draftRevisionId: null,
          previousPublishedRevisionId: entity.currentContent.publishedRevisionId,
          status: 'published',
        };
        const lifecycleEvent = createAdminContentLifecycleEvent({
          actorUid: input.actorUid,
          createdAt,
          entityId: content.entityId,
          entityType: content.entityType,
          fromRevisionId: entity.currentContent.publishedRevisionId,
          reason: input.reason,
          requestId: input.requestId,
          toRevisionId: content.publishedRevisionId,
          type: 'rolled-back',
          publicationScope: content.publicationScope,
        });

        transaction.set(entityReference, {
          ...entity,
          currentContent: content,
          lastLifecycleEvent: lifecycleEvent,
          updatedAt: createdAt,
        } satisfies StoredAdminContentEntity);
        transaction.create(eventReference, { ...lifecycleEvent, schemaVersion: 1 });

        return { statusCode: 200, data: { content, lifecycleEvent } } as const;
      });
    },
    async unpublishEntity(input) {
      assertActorUid(input.actorUid);

      const entityMatches = await entities.where('entityId', '==', input.entityId).get();

      if (entityMatches.empty) {
        throw new ApiError(
          404,
          'ADMIN_CONTENT_NOT_FOUND',
          'The requested admin content item was not found.',
        );
      }

      if (entityMatches.size !== 1) {
        throw createDataIntegrityError();
      }

      const entityReference = entityMatches.docs[0]?.ref;

      if (!entityReference) {
        throw createDataIntegrityError();
      }

      const eventReference = lifecycleEvents.doc();
      const createdAt = now().toISOString();

      return firestore.runTransaction(async (transaction) => {
        const entity = readStoredEntity(await transaction.get(entityReference));

        if (entity.currentContent.entityType !== 'course') {
          throw new ApiError(
            409,
            'ADMIN_CONTENT_UNPUBLISH_SCOPE_UNSUPPORTED',
            'Release 1 only supports planned course unpublish from this endpoint.',
          );
        }

        if (
          entity.currentContent.status === 'unpublished' &&
          entity.lastLifecycleEvent?.type === 'unpublished'
        ) {
          return {
            statusCode: 200,
            data: {
              content: entity.currentContent,
              lifecycleEvent: entity.lastLifecycleEvent,
            },
          } as const;
        }

        const content: AdminContentSummary = {
          ...entity.currentContent,
          status: 'unpublished',
        };
        const lifecycleEvent = createAdminContentLifecycleEvent({
          actorUid: input.actorUid,
          createdAt,
          entityId: content.entityId,
          entityType: content.entityType,
          fromRevisionId: content.publishedRevisionId,
          reason: input.reason,
          requestId: input.requestId,
          toRevisionId: null,
          type: 'unpublished',
          publicationScope: content.publicationScope,
        });

        transaction.set(entityReference, {
          ...entity,
          currentContent: content,
          lastLifecycleEvent: lifecycleEvent,
          updatedAt: createdAt,
        } satisfies StoredAdminContentEntity);
        transaction.create(eventReference, { ...lifecycleEvent, schemaVersion: 1 });

        return { statusCode: 200, data: { content, lifecycleEvent } } as const;
      });
    },
  };
}

export interface FirestoreAdminContentSeed {
  content: AdminContentSummary;
  learnerContent?: PublishedLearnerContent | undefined;
}

function normalizeSeedRecord(
  record: AdminContentSummary | FirestoreAdminContentSeed,
): FirestoreAdminContentSeed {
  return 'content' in record ? record : { content: record };
}

export async function seedFirestoreAdminContentForEmulator(input: {
  content: readonly (AdminContentSummary | FirestoreAdminContentSeed)[];
  firestore: Firestore;
}): Promise<void> {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Firestore Admin content seed is restricted to the Emulator Suite.');
  }

  const batch = input.firestore.batch();
  const seededAt = new Date().toISOString();

  for (const record of input.content) {
    const { content, learnerContent } = normalizeSeedRecord(record);
    const entityReference = input.firestore
      .collection(ADMIN_CONTENT_ENTITIES_COLLECTION)
      .doc(getEntityDocumentId(content.entityType, content.entityId));
    const revisionReference = input.firestore
      .collection(ADMIN_CONTENT_REVISIONS_COLLECTION)
      .doc(content.publishedRevisionId);
    const entity: StoredAdminContentEntity = {
      currentContent: withDraftRevision(content, null),
      draftRevisionId: null,
      entityId: content.entityId,
      entityType: content.entityType,
      schemaVersion: 1,
      updatedAt: seededAt,
    };
    const revision: StoredPublishedRevision = {
      contentChecksum: createHash('sha256').update(content.publishedRevisionId).digest('hex'),
      createdAt: seededAt,
      entityKey: getAdminContentKey(content.entityType, content.entityId),
      learnerContent: learnerContent ?? null,
      publishedAt: seededAt,
      publishedContent: withDraftRevision(content, null),
      schemaVersion: 1,
      state: 'published',
    };

    batch.set(entityReference, entity);
    batch.set(revisionReference, revision);
  }

  await batch.commit();
}
