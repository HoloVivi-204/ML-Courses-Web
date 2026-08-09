import {
  createPublishedLearnerContentDocuments,
  type PublishedLearnerContentDocumentWrite,
} from './published-learner-content.js';
import type { FirestoreAdminContentSeed } from './firestore-admin-content-repository.js';

export const RELEASE_ONE_CONTENT_MIGRATION_ID = 'r1-published-learner-content-v1';

export interface ReleaseOneContentMigrationCheckpoint {
  documentsFailed: number;
  documentsSucceeded: number;
  lastDocumentId: string | null;
  migrationId: typeof RELEASE_ONE_CONTENT_MIGRATION_ID;
}

export interface ReleaseOneContentMigrationDryRunReport {
  checkpoint: ReleaseOneContentMigrationCheckpoint;
  contentDocumentCount: number;
  entityCount: number;
  errors: readonly string[];
  isValid: boolean;
  revisionCount: number;
  writes: readonly PublishedLearnerContentDocumentWrite[];
}

function findDuplicateDocumentIds(
  writes: readonly PublishedLearnerContentDocumentWrite[],
): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const write of writes) {
    if (seen.has(write.documentId)) {
      duplicates.add(write.documentId);
    }

    seen.add(write.documentId);
  }

  return [...duplicates].sort();
}

export function createReleaseOneContentMigrationDryRun(input: {
  content: readonly FirestoreAdminContentSeed[];
}): ReleaseOneContentMigrationDryRunReport {
  const writes = input.content
    .flatMap((record) =>
      createPublishedLearnerContentDocuments({
        content: record.content,
        learnerContent: record.learnerContent ?? null,
      }),
    )
    .sort((left, right) => left.documentId.localeCompare(right.documentId));
  const duplicateDocumentIds = findDuplicateDocumentIds(writes);
  const errors = duplicateDocumentIds.map(
    (documentId) => `Duplicate deterministic learner-content document ID: ${documentId}`,
  );
  const isValid = errors.length === 0;

  return {
    checkpoint: {
      documentsFailed: errors.length,
      documentsSucceeded: isValid ? writes.length : 0,
      lastDocumentId: isValid && writes.length > 0 ? writes[writes.length - 1]!.documentId : null,
      migrationId: RELEASE_ONE_CONTENT_MIGRATION_ID,
    },
    contentDocumentCount: writes.length,
    entityCount: input.content.length,
    errors,
    isValid,
    revisionCount: input.content.length,
    writes,
  };
}
