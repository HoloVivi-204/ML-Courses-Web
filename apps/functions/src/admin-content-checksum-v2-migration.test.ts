import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase-admin/firestore', () => {
  throw new Error('The checksum-v2 migration planner loaded firebase-admin.');
});
vi.mock('firebase-admin', () => {
  throw new Error('The checksum-v2 migration planner loaded firebase-admin.');
});

import {
  createAdminContentDraftChecksum,
  createLegacyAdminContentDraftChecksum,
} from './admin-content-evidence.js';
import {
  ADMIN_CONTENT_CHECKSUM_V2_MIGRATION_ID,
  type AdminContentChecksumV2MigrationRecord,
  assertAdminContentChecksumV2MigrationReportInvariants,
  createAdminContentChecksumV2MigrationDryRun,
  parseAdminContentChecksumV2MigrationArguments,
  parseAdminContentChecksumV2MigrationCheckpoint,
  parseAdminContentChecksumV2MigrationInput,
  resolveAdminContentChecksumV2MigrationPath,
} from './admin-content-checksum-v2-migration.js';
import type { AdminContentDraft, AdminContentSummary } from './admin-content-repository.js';
import {
  type StoredAdminContentDraftRevisionV2,
  type StoredAdminContentPublishedRevisionV1,
  serializeStoredAdminContentDraftRevisionV1,
  serializeStoredAdminContentDraftRevisionV2,
  serializeStoredAdminContentPublishedRevisionV1,
  serializeStoredAdminContentPublishedRevisionV2,
} from './admin-content-revision-storage.js';

const draftFixture: AdminContentDraft = {
  baseRevisionId: 'course-classical-ml-rev-r1',
  courseId: 'course-classical-ml',
  draftRevisionId: 'draft-course-course-classical-ml-rev-d1',
  entityId: 'course-classical-ml',
  entityType: 'course',
  localeAvailability: ['en', 'vi'],
  metadata: {
    attribution: { en: 'Source attribution', vi: 'Nguon tham khao' },
    externalLinkUrl: 'https://example.test/source',
  },
  preview: { en: 'Preview', vi: 'Tom tat' },
  revisionVersion: 1,
  sourceReview: {
    attribution: { en: 'Source attribution', vi: 'Nguon tham khao' },
    license: { name: 'MIT', url: 'https://example.test/license' },
    sourceId: 'source-example',
    title: 'Example source',
  },
  sourceStatus: 'seeded',
  status: 'draft',
  title: { en: 'Classical ML', vi: 'Hoc may co dien' },
  trialPostId: 'cml-p01-problem-data-types',
  validationStatus: 'not-run',
};

const publishedFixture: AdminContentSummary = {
  courseId: draftFixture.courseId,
  draftRevisionId: null,
  emergencyBlocked: false,
  entityId: draftFixture.entityId,
  entityType: draftFixture.entityType,
  localeAvailability: ['en', 'vi'],
  preview: draftFixture.preview,
  publicationScope: 'publish-quality',
  previousPublishedRevisionId: draftFixture.baseRevisionId,
  publishedRevisionId: draftFixture.draftRevisionId,
  sourceReview: draftFixture.sourceReview,
  sourceStatus: 'seeded',
  status: 'published',
  title: draftFixture.title,
  trialPostId: draftFixture.trialPostId,
  validationStatus: 'valid',
};

const storedRevisionFields = {
  createdAt: '2026-08-12T00:00:00.000Z',
  entityKey: 'course:course-classical-ml',
  learnerContent: null,
};

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const cliPath = resolve(repoRoot, 'tools/migrations/20260812-admin-content-checksum-v2.mjs');
const runtimeDirectory = resolve(repoRoot, '.runtime/checksum-v2-migration-test');
const runtimeAliasDirectory = resolve(repoRoot, '.runtime/checksum-v2-migration-test-alias');
const externalRuntimeDirectories: string[] = [];

afterEach(() => {
  rmSync(runtimeAliasDirectory, { force: true, recursive: true });
  rmSync(runtimeDirectory, { force: true, recursive: true });
  for (const directory of externalRuntimeDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function createValidMixedRecords(): AdminContentChecksumV2MigrationRecord[] {
  const legacyChecksum = createLegacyAdminContentDraftChecksum(draftFixture);
  const currentChecksum = createAdminContentDraftChecksum(draftFixture);

  return [
    {
      documentId: 'revision-published-v2',
      data: serializeStoredAdminContentPublishedRevisionV2({
        ...storedRevisionFields,
        publishedAt: '2026-08-12T01:00:00.000Z',
        publishedContent: publishedFixture,
        sourceDraftEvidenceChecksum: 'b'.repeat(64),
      }),
    },
    {
      documentId: 'revision-draft-v1',
      data: serializeStoredAdminContentDraftRevisionV1({
        ...storedRevisionFields,
        contentChecksum: legacyChecksum,
        draft: draftFixture,
        updatedAt: '2026-08-12T00:30:00.000Z',
      }),
    },
    {
      documentId: 'revision-published-v1',
      data: serializeStoredAdminContentPublishedRevisionV1({
        ...storedRevisionFields,
        contentChecksum: 'a'.repeat(64),
        publishedAt: '2026-08-11T01:00:00.000Z',
        publishedContent: publishedFixture,
      }),
    },
    {
      documentId: 'revision-draft-v2',
      data: serializeStoredAdminContentDraftRevisionV2({
        ...storedRevisionFields,
        contentChecksum: currentChecksum,
        draft: draftFixture,
        updatedAt: '2026-08-12T00:30:00.000Z',
      }),
    },
  ];
}

function runMigrationCli(argumentsList: readonly string[]) {
  return spawnSync(process.execPath, [cliPath, ...argumentsList], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
    timeout: 10_000,
    windowsHide: true,
  });
}

function reverseObjectKeyOrder(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reverseObjectKeyOrder);
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, nestedValue]) => [key, reverseObjectKeyOrder(nestedValue)]),
  );
}

describe('Admin content checksum-v2 migration preflight', () => {
  it('classifies one valid record from each stored revision class without writes', () => {
    const report = createAdminContentChecksumV2MigrationDryRun({
      records: createValidMixedRecords(),
    });

    expect(report).toMatchObject({
      migrationId: ADMIN_CONTENT_CHECKSUM_V2_MIGRATION_ID,
      dryRun: true,
      isValid: true,
      checkpoint: {
        schemaVersion: 1,
        migrationId: ADMIN_CONTENT_CHECKSUM_V2_MIGRATION_ID,
        scanned: 4,
        succeeded: 4,
        failed: 0,
        classCounts: {
          DRAFT_V1_SAVE_REQUIRED: 1,
          DRAFT_V2_CURRENT: 1,
          PUBLISHED_V1_PRESERVED: 1,
          PUBLISHED_V2_PRESERVED: 1,
        },
        failures: [],
        completed: true,
      },
      writes: [],
    });
    expect(report.checkpoint.succeeded + report.checkpoint.failed).toBe(report.checkpoint.scanned);
    expect(
      Object.values(report.checkpoint.classCounts).reduce((sum, count) => sum + count, 0),
    ).toBe(report.checkpoint.succeeded);
    expect(report.batchOutcomes.map((outcome) => outcome.documentId)).toEqual([
      'revision-draft-v1',
      'revision-draft-v2',
      'revision-published-v1',
      'revision-published-v2',
    ]);
  });

  it('produces the same checkpoint through canonical full and chunked resume runs', () => {
    const records = createValidMixedRecords();
    const fullReport = createAdminContentChecksumV2MigrationDryRun({ records });
    const reorderedReport = createAdminContentChecksumV2MigrationDryRun({
      records: [...records]
        .reverse()
        .map((record) => ({ ...record, data: reverseObjectKeyOrder(record.data) })),
    });
    const firstChunk = createAdminContentChecksumV2MigrationDryRun({
      records,
      maxDocuments: 2,
    });
    const finalChunk = createAdminContentChecksumV2MigrationDryRun({
      records,
      checkpoint: firstChunk.checkpoint,
      maxDocuments: 2,
    });
    const completedResume = createAdminContentChecksumV2MigrationDryRun({
      records,
      checkpoint: finalChunk.checkpoint,
      maxDocuments: 1,
    });

    expect(reorderedReport).toEqual(fullReport);
    expect(firstChunk.checkpoint).toMatchObject({
      completed: false,
      lastDocumentId: 'revision-draft-v2',
      scanned: 2,
      succeeded: 2,
    });
    expect(finalChunk.checkpoint).toEqual(fullReport.checkpoint);
    expect(completedResume).toEqual({
      batchOutcomes: [],
      checkpoint: fullReport.checkpoint,
      dryRun: true,
      inputFingerprint: fullReport.inputFingerprint,
      isValid: true,
      migrationId: ADMIN_CONTENT_CHECKSUM_V2_MIGRATION_ID,
      writes: [],
    });

    const changedRecords = createValidMixedRecords();
    const publishedV1 = changedRecords.find(
      (record) => record.documentId === 'revision-published-v1',
    );
    if (!publishedV1 || typeof publishedV1.data !== 'object' || publishedV1.data === null) {
      throw new Error('Expected a published-v1 fixture.');
    }
    const publishedV1Data = publishedV1.data as StoredAdminContentPublishedRevisionV1;
    const changedPublishedContent = {
      ...publishedV1Data.publishedContent,
      title: { en: 'Changed title', vi: 'Tieu de da doi' },
    };
    publishedV1.data = { ...publishedV1Data, publishedContent: changedPublishedContent };

    expect(
      createAdminContentChecksumV2MigrationDryRun({ records: changedRecords }).inputFingerprint,
    ).not.toBe(fullReport.inputFingerprint);
    expect(() =>
      createAdminContentChecksumV2MigrationDryRun({
        records: changedRecords,
        checkpoint: firstChunk.checkpoint,
      }),
    ).toThrow('stale or invalid');

    const legacyShapeRecords = createValidMixedRecords();
    const legacyDraftRecord = legacyShapeRecords.find(
      (record) => record.documentId === 'revision-draft-v1',
    );
    if (!legacyDraftRecord || typeof legacyDraftRecord.data !== 'object') {
      throw new Error('Expected a draft-v1 fixture.');
    }
    const legacyWithoutLearnerContent = { ...legacyDraftRecord.data } as Record<string, unknown>;
    delete legacyWithoutLearnerContent.learnerContent;
    legacyDraftRecord.data = legacyWithoutLearnerContent;
    const legacyShapeReport = createAdminContentChecksumV2MigrationDryRun({
      records: legacyShapeRecords,
    });
    expect(legacyShapeReport.isValid).toBe(true);
    expect(legacyShapeReport.inputFingerprint).not.toBe(fullReport.inputFingerprint);
  });

  it('fails closed with sanitized outcomes for corrupt and unknown records', () => {
    const rawSentinel = 'RAW_CONTENT_DO_NOT_LEAK';
    const validDraftV2 = createValidMixedRecords().find(
      (record) => record.documentId === 'revision-draft-v2',
    );
    if (!validDraftV2 || typeof validDraftV2.data !== 'object' || validDraftV2.data === null) {
      throw new Error('Expected a draft-v2 fixture.');
    }
    const validDraftV2Data = validDraftV2.data as StoredAdminContentDraftRevisionV2;
    const corruptedDraft = {
      ...validDraftV2Data,
      draft: {
        ...validDraftV2Data.draft,
        title: { en: rawSentinel, vi: 'Du lieu hong' },
      },
    };
    const validDraftV1 = createValidMixedRecords().find(
      (record) => record.documentId === 'revision-draft-v1',
    );
    if (!validDraftV1 || typeof validDraftV1.data !== 'object' || validDraftV1.data === null) {
      throw new Error('Expected a draft-v1 fixture.');
    }
    const corruptedLegacyDraft = {
      ...validDraftV1.data,
      contentChecksum: '0'.repeat(64),
    };
    const publishedV2 = createValidMixedRecords().find(
      (record) => record.documentId === 'revision-published-v2',
    );
    if (!publishedV2 || typeof publishedV2.data !== 'object' || publishedV2.data === null) {
      throw new Error('Expected a published-v2 fixture.');
    }
    const report = createAdminContentChecksumV2MigrationDryRun({
      records: [
        { documentId: 'corrupt-draft', data: corruptedDraft },
        { documentId: 'corrupt-legacy-draft', data: corruptedLegacyDraft },
        {
          documentId: 'malformed-published-v2',
          data: {
            createdAt: '2026-08-12T00:00:00.000Z',
            entityKey: 'course:course-classical-ml',
            learnerContent: null,
            publishedAt: '2026-08-12T01:00:00.000Z',
            publishedContent: publishedFixture,
            schemaVersion: 2,
            sourceDraftEvidenceChecksum: 'f'.repeat(64),
            sourceDraftEvidenceChecksumVersion: 1,
            state: 'published',
          },
        },
        {
          documentId: 'published-v2-with-content-checksum',
          data: { ...publishedV2.data, contentChecksum: 'c'.repeat(64) },
        },
        {
          documentId: 'published-v2-with-content-checksum-version',
          data: { ...publishedV2.data, contentChecksumVersion: 2 },
        },
        {
          documentId: 'unknown-union',
          data: { rawSentinel, schemaVersion: 3, state: 'archived' },
        },
      ],
    });

    expect(report).toMatchObject({
      isValid: false,
      checkpoint: {
        scanned: 6,
        succeeded: 0,
        failed: 6,
        failures: [
          { code: 'DRAFT_CHECKSUM_MISMATCH', documentId: 'corrupt-draft' },
          { code: 'DRAFT_CHECKSUM_MISMATCH', documentId: 'corrupt-legacy-draft' },
          { code: 'INVALID_STORED_REVISION', documentId: 'malformed-published-v2' },
          {
            code: 'INVALID_STORED_REVISION',
            documentId: 'published-v2-with-content-checksum',
          },
          {
            code: 'INVALID_STORED_REVISION',
            documentId: 'published-v2-with-content-checksum-version',
          },
          { code: 'INVALID_STORED_REVISION', documentId: 'unknown-union' },
        ],
      },
      writes: [],
    });
    expect(JSON.stringify(report)).not.toContain(rawSentinel);
    expect(JSON.stringify(report)).not.toContain(validDraftV2Data.contentChecksum);
    expect(JSON.stringify(report)).not.toContain(
      createAdminContentDraftChecksum(corruptedDraft.draft),
    );
  });

  it('rejects duplicate IDs and stale or malformed checkpoints before progress', () => {
    const records = createValidMixedRecords();
    expect(() =>
      createAdminContentChecksumV2MigrationDryRun({
        records: [records[0]!, { ...records[1]!, documentId: records[0]!.documentId }],
      }),
    ).toThrow('document IDs must be unique');

    const firstChunk = createAdminContentChecksumV2MigrationDryRun({
      records,
      maxDocuments: 1,
    });
    expect(() =>
      createAdminContentChecksumV2MigrationDryRun({
        records,
        checkpoint: { ...firstChunk.checkpoint, migrationId: 'stale-migration' },
      }),
    ).toThrow('stale or invalid');
    expect(() =>
      createAdminContentChecksumV2MigrationDryRun({
        records,
        checkpoint: { ...firstChunk.checkpoint, schemaVersion: 2 },
      }),
    ).toThrow('stale or invalid');
    expect(() =>
      parseAdminContentChecksumV2MigrationCheckpoint({
        checkpoint: {
          ...firstChunk.checkpoint,
          scanned: 2,
          succeeded: 2,
          lastDocumentId: records[0]!.documentId,
        },
        documentIds: [...records]
          .sort((left, right) => left.documentId.localeCompare(right.documentId))
          .map((record) => record.documentId),
        inputFingerprint: firstChunk.inputFingerprint,
      }),
    ).toThrow('stale or invalid');

    const forgedClassCounts = {
      ...firstChunk.checkpoint.classCounts,
      DRAFT_V1_SAVE_REQUIRED: 0,
      PUBLISHED_V1_PRESERVED: 1,
    };
    expect(() =>
      createAdminContentChecksumV2MigrationDryRun({
        records,
        checkpoint: { ...firstChunk.checkpoint, classCounts: forgedClassCounts },
      }),
    ).toThrow('stale or invalid');
  });

  it('keeps exact input and report invariants in pure helpers', () => {
    const records = createValidMixedRecords();
    expect(parseAdminContentChecksumV2MigrationInput({ records })).toHaveLength(4);
    expect(() => parseAdminContentChecksumV2MigrationInput({ records, unexpected: true })).toThrow(
      'input must contain exactly',
    );

    const report = createAdminContentChecksumV2MigrationDryRun({ records });
    expect(() => assertAdminContentChecksumV2MigrationReportInvariants(report)).not.toThrow();
    expect(() =>
      assertAdminContentChecksumV2MigrationReportInvariants({
        ...report,
        writes: [{ documentId: 'forbidden-write' }],
      } as never),
    ).toThrow('report invariants');
  });

  it('parses only the exact dry-run CLI contract and confines paths to the repository', () => {
    expect(
      parseAdminContentChecksumV2MigrationArguments([
        '--dry-run',
        '--input',
        'tools/migrations/input.json',
        '--max-documents',
        '2',
        '--resume-from',
        '.runtime/resume.json',
        '--checkpoint',
        '.runtime/checkpoint.json',
      ]),
    ).toEqual({
      checkpointPath: '.runtime/checkpoint.json',
      dryRun: true,
      inputPath: 'tools/migrations/input.json',
      maxDocuments: 2,
      resumeFromPath: '.runtime/resume.json',
    });

    for (const argumentsFixture of [
      ['--input', 'tools/migrations/input.json'],
      ['--dry-run', '--input', 'tools/migrations/input.json', '--write'],
      ['--dry-run', '--input', 'tools/migrations/input.json', '--project', 'production'],
      ['--dry-run', '--input', 'tools/migrations/input.json', '--unknown'],
      ['--dry-run', '--input', 'tools/migrations/input.json', '--max-documents', '0'],
    ]) {
      expect(() => parseAdminContentChecksumV2MigrationArguments(argumentsFixture)).toThrow();
    }

    const pathFileSystem = { exists: existsSync, realpath: realpathSync.native };
    expect(
      resolveAdminContentChecksumV2MigrationPath({
        pathValue: '.runtime/checkpoint.json',
        repoRoot,
        pathFileSystem,
      }),
    ).toBe(resolve(repoRoot, '.runtime/checkpoint.json'));
    const canonicalFixturePath = realpathSync.native(
      resolve(repoRoot, 'tools/migrations/fixtures/20260812-admin-content-checksum-v2.json'),
    );
    expect(
      resolveAdminContentChecksumV2MigrationPath({
        pathValue:
          process.platform === 'win32'
            ? 'TOOLS\\MIGRATIONS/fixtures\\20260812-ADMIN-CONTENT-CHECKSUM-V2.JSON'
            : 'tools/migrations/fixtures/../fixtures/20260812-admin-content-checksum-v2.json',
        repoRoot,
        pathFileSystem,
      }),
    ).toBe(canonicalFixturePath);
    expect(() =>
      resolveAdminContentChecksumV2MigrationPath({
        pathValue: '../escaped.json',
        repoRoot,
        pathFileSystem,
      }),
    ).toThrow('stay inside the repository');
    expect(() =>
      resolveAdminContentChecksumV2MigrationPath({
        pathValue: resolve(repoRoot, '..', 'absolute-escaped.json'),
        repoRoot,
        pathFileSystem,
      }),
    ).toThrow('stay inside the repository');
  });

  it('canonicalizes filesystem aliases before containment and checkpoint overwrite checks', () => {
    mkdirSync(runtimeDirectory, { recursive: true });
    const inputPath = resolve(runtimeDirectory, 'input.json');
    const checkpointPath = resolve(runtimeDirectory, 'checkpoint.json');
    writeFileSync(inputPath, `${JSON.stringify({ records: createValidMixedRecords() })}\n`, 'utf8');

    const firstRun = runMigrationCli([
      '--dry-run',
      '--input',
      inputPath,
      '--max-documents',
      '2',
      '--checkpoint',
      checkpointPath,
    ]);
    expect(firstRun.status, firstRun.stderr).toBe(0);

    symlinkSync(
      runtimeDirectory,
      runtimeAliasDirectory,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const aliasedCheckpointPath = resolve(runtimeAliasDirectory, 'checkpoint.json');
    const aliasResume = runMigrationCli([
      '--dry-run',
      '--input',
      inputPath,
      '--resume-from',
      checkpointPath,
      '--checkpoint',
      aliasedCheckpointPath,
    ]);
    expect(aliasResume.status, aliasResume.stderr).toBe(0);
    expect(JSON.parse(readFileSync(checkpointPath, 'utf8'))).toMatchObject({
      completed: true,
      scanned: 4,
    });

    const externalDirectory = mkdtempSync(join(tmpdir(), 'checksum-v2-migration-outside-'));
    externalRuntimeDirectories.push(externalDirectory);
    const outsideAliasDirectory = resolve(runtimeDirectory, 'outside-alias');
    symlinkSync(
      externalDirectory,
      outsideAliasDirectory,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const outsideInputPath = resolve(outsideAliasDirectory, 'input.json');
    writeFileSync(
      resolve(externalDirectory, 'input.json'),
      `${JSON.stringify({ records: createValidMixedRecords() })}\n`,
      'utf8',
    );
    const escapedInputRun = runMigrationCli(['--dry-run', '--input', outsideInputPath]);
    expect(escapedInputRun.status).not.toBe(0);
    expect(escapedInputRun.stderr).toContain('stay inside the repository');

    const outsideCheckpointPath = resolve(outsideAliasDirectory, 'new-checkpoint.json');
    const escapedCheckpointRun = runMigrationCli([
      '--dry-run',
      '--input',
      inputPath,
      '--checkpoint',
      outsideCheckpointPath,
    ]);
    expect(escapedCheckpointRun.status).not.toBe(0);
    expect(escapedCheckpointRun.stderr).toContain('stay inside the repository');
    expect(existsSync(resolve(externalDirectory, 'new-checkpoint.json'))).toBe(false);
  });

  it('runs the thin CLI, resumes atomically, and rejects stale state before overwrite', () => {
    mkdirSync(runtimeDirectory, { recursive: true });
    const inputPath = resolve(runtimeDirectory, 'input.json');
    const checkpointPath = resolve(runtimeDirectory, 'checkpoint.json');
    writeFileSync(inputPath, `${JSON.stringify({ records: createValidMixedRecords() })}\n`, 'utf8');

    const firstRun = runMigrationCli([
      '--dry-run',
      '--input',
      inputPath,
      '--max-documents',
      '2',
      '--checkpoint',
      checkpointPath,
    ]);
    expect(firstRun.status, firstRun.stderr).toBe(0);
    const firstCheckpoint = JSON.parse(readFileSync(checkpointPath, 'utf8')) as {
      completed: boolean;
      scanned: number;
    };
    expect(firstCheckpoint).toMatchObject({ completed: false, scanned: 2 });
    expect(readdirSync(runtimeDirectory).some((pathValue) => pathValue.endsWith('.tmp'))).toBe(
      false,
    );

    const finalRun = runMigrationCli([
      '--dry-run',
      '--input',
      inputPath,
      '--resume-from',
      checkpointPath,
      '--checkpoint',
      checkpointPath,
    ]);
    expect(finalRun.status, finalRun.stderr).toBe(0);
    expect(JSON.parse(readFileSync(checkpointPath, 'utf8'))).toMatchObject({
      completed: true,
      scanned: 4,
      succeeded: 4,
      failed: 0,
    });

    const preservedCheckpointTime = new Date('2020-01-02T03:04:05.000Z');
    utimesSync(checkpointPath, preservedCheckpointTime, preservedCheckpointTime);
    const completedCheckpointBytes = readFileSync(checkpointPath, 'utf8');
    const completedCheckpointMtimeMs = statSync(checkpointPath).mtimeMs;
    const completedResume = runMigrationCli([
      '--dry-run',
      '--input',
      inputPath,
      '--resume-from',
      checkpointPath,
      '--checkpoint',
      checkpointPath,
    ]);
    expect(completedResume.status, completedResume.stderr).toBe(0);
    expect(JSON.parse(completedResume.stdout)).toMatchObject({ batchOutcomes: [], writes: [] });
    expect(readFileSync(checkpointPath, 'utf8')).toBe(completedCheckpointBytes);
    expect(statSync(checkpointPath).mtimeMs).toBe(completedCheckpointMtimeMs);

    const staleCheckpoint = { ...firstCheckpoint, migrationId: 'stale-migration' };
    writeFileSync(checkpointPath, `${JSON.stringify(staleCheckpoint)}\n`, 'utf8');
    const beforeFailure = readFileSync(checkpointPath, 'utf8');
    const staleRun = runMigrationCli([
      '--dry-run',
      '--input',
      inputPath,
      '--resume-from',
      checkpointPath,
      '--checkpoint',
      checkpointPath,
    ]);
    expect(staleRun.status).not.toBe(0);
    expect(readFileSync(checkpointPath, 'utf8')).toBe(beforeFailure);

    writeFileSync(checkpointPath, completedCheckpointBytes, 'utf8');
    const disallowedOutputPath = resolve(dirname(checkpointPath), 'different-output.json');
    const existingOutputBytes = 'DO_NOT_OVERWRITE\n';
    writeFileSync(disallowedOutputPath, existingOutputBytes, 'utf8');
    const overwriteRun = runMigrationCli([
      '--dry-run',
      '--input',
      inputPath,
      '--resume-from',
      checkpointPath,
      '--checkpoint',
      disallowedOutputPath,
    ]);
    expect(overwriteRun.status).not.toBe(0);
    expect(readFileSync(disallowedOutputPath, 'utf8')).toBe(existingOutputBytes);
  });

  it('makes malformed, duplicate, corrupt, unsafe, and write-capable CLI inputs fail closed', () => {
    mkdirSync(runtimeDirectory, { recursive: true });
    const inputPath = resolve(runtimeDirectory, 'input.json');
    const checkpointPath = resolve(runtimeDirectory, 'checkpoint.json');

    for (const forbiddenArguments of [
      ['--input', inputPath],
      ['--dry-run', '--input', inputPath, '--write'],
      ['--dry-run', '--input', inputPath, '--project', 'production'],
      ['--dry-run', '--input', inputPath, '--unknown'],
    ]) {
      const result = runMigrationCli(forbiddenArguments);
      expect(result.status).not.toBe(0);
    }
    expect(existsSync(checkpointPath)).toBe(false);

    const rawSentinel = 'RAW_CONTENT_DO_NOT_LEAK';
    writeFileSync(inputPath, `{${rawSentinel}}`, 'utf8');
    const malformedRun = runMigrationCli([
      '--dry-run',
      '--input',
      inputPath,
      '--checkpoint',
      checkpointPath,
    ]);
    expect(malformedRun.status).not.toBe(0);
    expect(malformedRun.stdout + malformedRun.stderr).not.toContain(rawSentinel);
    expect(existsSync(checkpointPath)).toBe(false);

    const duplicateRecords = createValidMixedRecords();
    duplicateRecords[1] = { ...duplicateRecords[1]!, documentId: duplicateRecords[0]!.documentId };
    writeFileSync(inputPath, JSON.stringify({ records: duplicateRecords }), 'utf8');
    const duplicateRun = runMigrationCli([
      '--dry-run',
      '--input',
      inputPath,
      '--checkpoint',
      checkpointPath,
    ]);
    expect(duplicateRun.status).not.toBe(0);
    expect(existsSync(checkpointPath)).toBe(false);

    const corruptRecord = createValidMixedRecords().find(
      (record) => record.documentId === 'revision-draft-v2',
    );
    if (!corruptRecord) {
      throw new Error('Expected a draft-v2 fixture.');
    }
    const corruptData = corruptRecord.data as StoredAdminContentDraftRevisionV2;
    writeFileSync(
      inputPath,
      JSON.stringify({
        records: [
          {
            documentId: 'corrupt-draft',
            data: {
              ...corruptData,
              draft: {
                ...corruptData.draft,
                title: { en: rawSentinel, vi: 'Du lieu hong' },
              },
            },
          },
        ],
      }),
      'utf8',
    );
    const corruptRun = runMigrationCli(['--dry-run', '--input', inputPath]);
    expect(corruptRun.status).not.toBe(0);
    expect(corruptRun.stdout + corruptRun.stderr).not.toContain(rawSentinel);
    expect(JSON.parse(corruptRun.stdout)).toMatchObject({ isValid: false, writes: [] });

    const escapedInputPath = resolve(repoRoot, '..', 'checksum-v2-escaped-input.json');
    const escapedRun = runMigrationCli(['--dry-run', '--input', escapedInputPath]);
    expect(escapedRun.status).not.toBe(0);
    expect(escapedRun.stderr).toContain('stay inside the repository');
  });
});
