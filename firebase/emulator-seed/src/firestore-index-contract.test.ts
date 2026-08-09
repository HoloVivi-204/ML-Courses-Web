import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  RELEASE_ONE_REQUIRED_FIRESTORE_INDEXES,
  validateFirestoreIndexMigrationDryRun,
} from './firestore-index-contract.js';

function readReleaseOneIndexConfiguration(): unknown {
  return JSON.parse(
    readFileSync(new URL('../../firestore.indexes.json', import.meta.url), 'utf8'),
  ) as unknown;
}

describe('Release 1 Firestore index migration dry-run', () => {
  it('accepts exactly the six TDD baseline composite indexes while pinning remains disabled', () => {
    const report = validateFirestoreIndexMigrationDryRun({
      configuration: readReleaseOneIndexConfiguration(),
      pinRunsEnabled: false,
    });

    expect(RELEASE_ONE_REQUIRED_FIRESTORE_INDEXES).toHaveLength(6);
    expect(report).toEqual({
      actualIndexCount: 6,
      expectedIndexCount: 6,
      isValid: true,
      missing: [],
      unexpected: [],
    });
  });

  it('reports an optional pin index as missing unless its runtime flag and index are added together', () => {
    const report = validateFirestoreIndexMigrationDryRun({
      configuration: readReleaseOneIndexConfiguration(),
      pinRunsEnabled: true,
    });

    expect(report.isValid).toBe(false);
    expect(report.missing).toEqual([
      'playgroundRuns|COLLECTION|scenarioId:ASCENDING,isPinned:ASCENDING,createdAt:DESCENDING',
    ]);
  });
});
