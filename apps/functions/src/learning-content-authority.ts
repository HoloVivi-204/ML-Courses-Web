import type { Firestore, Transaction } from 'firebase-admin/firestore';

import { ApiError } from './api-error.js';

const ADMIN_CONTENT_ENTITIES_COLLECTION = 'adminContentEntities';

export const learningContentEntityTypes = ['course', 'module', 'post', 'demo', 'quiz'] as const;

export type LearningContentEntityType = (typeof learningContentEntityTypes)[number];

export interface CurrentPublishedLearningContentEntity {
  entityId: string;
  entityType: LearningContentEntityType;
  publishedRevisionId: string;
}

export interface LearningContentAuthority {
  assertCurrentPublishedEntity(input: {
    entityId: string;
    entityType: LearningContentEntityType;
    transaction?: Transaction | undefined;
  }): Promise<CurrentPublishedLearningContentEntity>;
  getCurrentPublishedEntity(input: {
    entityId: string;
    entityType: LearningContentEntityType;
    transaction?: Transaction | undefined;
  }): Promise<CurrentPublishedLearningContentEntity | null>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createDataIntegrityError(): ApiError {
  return new ApiError(
    500,
    'LEARNER_CONTENT_DATA_INTEGRITY_ERROR',
    'Published learner content data is invalid.',
  );
}

function getEntityDocumentId(entityType: LearningContentEntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

function parseCurrentPublishedEntity(input: {
  entityData: unknown;
  entityId: string;
  entityType: LearningContentEntityType;
}): CurrentPublishedLearningContentEntity | null {
  if (!isRecord(input.entityData) || input.entityData.schemaVersion !== 1) {
    throw createDataIntegrityError();
  }

  if (
    input.entityData.entityId !== input.entityId ||
    input.entityData.entityType !== input.entityType ||
    !isRecord(input.entityData.currentContent)
  ) {
    throw createDataIntegrityError();
  }

  const currentContent = input.entityData.currentContent;

  if (
    currentContent.entityId !== input.entityId ||
    currentContent.entityType !== input.entityType ||
    typeof currentContent.emergencyBlocked !== 'boolean'
  ) {
    throw createDataIntegrityError();
  }

  if (currentContent.emergencyBlocked) {
    throw new ApiError(
      403,
      'CONTENT_EMERGENCY_BLOCKED',
      'This learning content is unavailable because it was withdrawn.',
    );
  }

  if (currentContent.status === 'unpublished') {
    return null;
  }

  if (
    currentContent.status !== 'published' ||
    typeof currentContent.publishedRevisionId !== 'string' ||
    currentContent.publishedRevisionId.trim().length === 0
  ) {
    throw createDataIntegrityError();
  }

  return {
    entityId: input.entityId,
    entityType: input.entityType,
    publishedRevisionId: currentContent.publishedRevisionId,
  };
}

export function createFirestoreLearningContentAuthority(
  firestore: Firestore,
): LearningContentAuthority {
  async function getCurrentPublishedEntity(input: {
    entityId: string;
    entityType: LearningContentEntityType;
    transaction?: Transaction | undefined;
  }): Promise<CurrentPublishedLearningContentEntity | null> {
    const reference = firestore
      .collection(ADMIN_CONTENT_ENTITIES_COLLECTION)
      .doc(getEntityDocumentId(input.entityType, input.entityId));
    const snapshot = input.transaction
      ? await input.transaction.get(reference)
      : await reference.get();

    if (!snapshot.exists) {
      return null;
    }

    return parseCurrentPublishedEntity({
      entityData: snapshot.data(),
      entityId: input.entityId,
      entityType: input.entityType,
    });
  }

  return {
    async assertCurrentPublishedEntity(input) {
      const currentEntity = await getCurrentPublishedEntity(input);

      if (currentEntity === null) {
        throw new ApiError(
          403,
          'CONTENT_NOT_PUBLISHED',
          'This learning content is not currently published.',
        );
      }

      return currentEntity;
    },
    getCurrentPublishedEntity,
  };
}
