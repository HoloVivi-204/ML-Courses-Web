import { describe, expect, it } from 'vitest';

import { createReleaseOneFirestoreAdminContentSeed } from './admin-content-emulator-seed.js';
import {
  createReleaseOneContentMigrationDryRun,
  RELEASE_ONE_CONTENT_MIGRATION_ID,
} from './release-one-content-migration.js';

describe('Release 1 published learner-content migration', () => {
  it('creates an idempotent dry-run plan with deterministic checkpoint counts', () => {
    const seed = createReleaseOneFirestoreAdminContentSeed();
    const firstRun = createReleaseOneContentMigrationDryRun({ content: seed });
    const repeatedRun = createReleaseOneContentMigrationDryRun({ content: seed });

    expect(firstRun).toMatchObject({
      checkpoint: {
        documentsFailed: 0,
        documentsSucceeded: firstRun.contentDocumentCount,
        migrationId: RELEASE_ONE_CONTENT_MIGRATION_ID,
      },
      entityCount: seed.length,
      errors: [],
      isValid: true,
      revisionCount: seed.length,
    });
    expect(firstRun.checkpoint.lastDocumentId).toBeTruthy();
    expect(firstRun.writes.map((write) => write.documentId)).toEqual(
      repeatedRun.writes.map((write) => write.documentId),
    );
  });
});
