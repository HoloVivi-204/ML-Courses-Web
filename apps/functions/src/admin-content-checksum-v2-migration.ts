import { createHash } from 'node:crypto';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import {
  createAdminContentDraftChecksum,
  createLegacyAdminContentDraftChecksum,
} from './admin-content-evidence.js';
import { parseStoredAdminContentRevisionValue } from './admin-content-revision-storage.js';

export const ADMIN_CONTENT_CHECKSUM_V2_MIGRATION_ID = 'r1-admin-content-checksum-v2';

export const adminContentChecksumV2MigrationClassifications = [
  'DRAFT_V1_SAVE_REQUIRED',
  'DRAFT_V2_CURRENT',
  'PUBLISHED_V1_PRESERVED',
  'PUBLISHED_V2_PRESERVED',
] as const;

export type AdminContentChecksumV2MigrationClassification =
  (typeof adminContentChecksumV2MigrationClassifications)[number];

export interface AdminContentChecksumV2MigrationRecord {
  data: unknown;
  documentId: string;
}

export type AdminContentChecksumV2MigrationFailureCode =
  'DRAFT_CHECKSUM_MISMATCH' | 'INVALID_STORED_REVISION';

export interface AdminContentChecksumV2MigrationFailure {
  code: AdminContentChecksumV2MigrationFailureCode;
  documentId: string;
}

export type AdminContentChecksumV2MigrationBatchOutcome =
  | {
      classification: AdminContentChecksumV2MigrationClassification;
      documentId: string;
      status: 'succeeded';
    }
  | {
      documentId: string;
      failureCode: AdminContentChecksumV2MigrationFailureCode;
      status: 'failed';
    };

type AdminContentChecksumV2MigrationClassCounts = Record<
  AdminContentChecksumV2MigrationClassification,
  number
>;

export interface AdminContentChecksumV2MigrationCheckpoint {
  classCounts: AdminContentChecksumV2MigrationClassCounts;
  completed: boolean;
  failed: number;
  failures: readonly AdminContentChecksumV2MigrationFailure[];
  inputFingerprint: string;
  lastDocumentId: string | null;
  migrationId: typeof ADMIN_CONTENT_CHECKSUM_V2_MIGRATION_ID;
  scanned: number;
  schemaVersion: 1;
  succeeded: number;
}

export interface AdminContentChecksumV2MigrationDryRunReport {
  batchOutcomes: readonly AdminContentChecksumV2MigrationBatchOutcome[];
  checkpoint: AdminContentChecksumV2MigrationCheckpoint;
  dryRun: true;
  inputFingerprint: string;
  isValid: boolean;
  migrationId: typeof ADMIN_CONTENT_CHECKSUM_V2_MIGRATION_ID;
  writes: readonly [];
}

export class AdminContentChecksumV2MigrationValidationError extends Error {
  constructor(message = 'Admin content checksum-v2 migration input is invalid.') {
    super(message);
    this.name = 'AdminContentChecksumV2MigrationValidationError';
  }
}

export interface AdminContentChecksumV2MigrationArguments {
  checkpointPath?: string;
  dryRun: true;
  inputPath: string;
  maxDocuments?: number;
  resumeFromPath?: string;
}

export interface AdminContentChecksumV2MigrationPathFileSystem {
  exists(pathValue: string): boolean;
  realpath(pathValue: string): string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const expectedKeys = new Set(keys);
  const actualKeys = Object.keys(value);

  return (
    actualKeys.length === expectedKeys.size && actualKeys.every((key) => expectedKeys.has(key))
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isSha256Fingerprint(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

export function parseAdminContentChecksumV2MigrationArguments(
  argumentsList: readonly string[],
): AdminContentChecksumV2MigrationArguments {
  const parsed: {
    checkpointPath?: string;
    dryRun?: true;
    inputPath?: string;
    maxDocuments?: number;
    resumeFromPath?: string;
  } = {};
  const valueFlags = new Set(['--input', '--max-documents', '--resume-from', '--checkpoint']);

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--dry-run') {
      if (parsed.dryRun) {
        throw new AdminContentChecksumV2MigrationValidationError(
          'The checksum-v2 migration CLI received a duplicate --dry-run flag.',
        );
      }
      parsed.dryRun = true;
      continue;
    }

    if (!argument || !valueFlags.has(argument)) {
      throw new AdminContentChecksumV2MigrationValidationError(
        `Unknown checksum-v2 migration argument: ${argument ?? ''}`,
      );
    }

    const value = argumentsList[index + 1];
    if (!value || value.startsWith('--')) {
      throw new AdminContentChecksumV2MigrationValidationError(`${argument} requires a value.`);
    }
    index += 1;

    if (argument === '--max-documents') {
      const maxDocuments = Number(value);
      if (!Number.isSafeInteger(maxDocuments) || maxDocuments <= 0) {
        throw new AdminContentChecksumV2MigrationValidationError(
          '--max-documents must be a positive integer.',
        );
      }
      if (parsed.maxDocuments !== undefined) {
        throw new AdminContentChecksumV2MigrationValidationError(
          'The checksum-v2 migration CLI received duplicate arguments.',
        );
      }
      parsed.maxDocuments = maxDocuments;
      continue;
    }

    const destinationKey =
      argument === '--input'
        ? 'inputPath'
        : argument === '--resume-from'
          ? 'resumeFromPath'
          : 'checkpointPath';
    if (parsed[destinationKey] !== undefined) {
      throw new AdminContentChecksumV2MigrationValidationError(
        'The checksum-v2 migration CLI received duplicate arguments.',
      );
    }
    parsed[destinationKey] = value;
  }

  if (!parsed.dryRun || !parsed.inputPath) {
    throw new AdminContentChecksumV2MigrationValidationError(
      'The checksum-v2 migration CLI requires --dry-run and --input.',
    );
  }

  return {
    ...(parsed.checkpointPath === undefined ? {} : { checkpointPath: parsed.checkpointPath }),
    dryRun: true,
    inputPath: parsed.inputPath,
    ...(parsed.maxDocuments === undefined ? {} : { maxDocuments: parsed.maxDocuments }),
    ...(parsed.resumeFromPath === undefined ? {} : { resumeFromPath: parsed.resumeFromPath }),
  };
}

function assertMigrationPathIsInsideRepository(repoRoot: string, pathValue: string): void {
  const relativePath = relative(repoRoot, pathValue);
  if (
    relativePath === '' ||
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new AdminContentChecksumV2MigrationValidationError(
      'The local migration path must stay inside the repository.',
    );
  }
}

function canonicalizeMigrationPath(
  pathValue: string,
  pathFileSystem: AdminContentChecksumV2MigrationPathFileSystem,
): string {
  const missingPathSegments: string[] = [];
  let existingPath = pathValue;

  try {
    while (!pathFileSystem.exists(existingPath)) {
      const parentPath = dirname(existingPath);
      if (parentPath === existingPath) {
        throw new AdminContentChecksumV2MigrationValidationError();
      }
      missingPathSegments.unshift(basename(existingPath));
      existingPath = parentPath;
    }

    return resolve(pathFileSystem.realpath(existingPath), ...missingPathSegments);
  } catch {
    throw new AdminContentChecksumV2MigrationValidationError(
      'The local migration path must stay inside the repository.',
    );
  }
}

export function resolveAdminContentChecksumV2MigrationPath(input: {
  pathFileSystem?: AdminContentChecksumV2MigrationPathFileSystem;
  pathValue: string;
  repoRoot: string;
}): string {
  if (input.pathValue.trim().length === 0) {
    throw new AdminContentChecksumV2MigrationValidationError(
      'The local migration path must stay inside the repository.',
    );
  }

  const resolvedRepoRoot = resolve(input.repoRoot);
  const resolvedPath = resolve(resolvedRepoRoot, input.pathValue);
  assertMigrationPathIsInsideRepository(resolvedRepoRoot, resolvedPath);

  if (!input.pathFileSystem) {
    return resolvedPath;
  }

  const canonicalRepoRoot = canonicalizeMigrationPath(resolvedRepoRoot, input.pathFileSystem);
  const canonicalPath = canonicalizeMigrationPath(resolvedPath, input.pathFileSystem);
  assertMigrationPathIsInsideRepository(canonicalRepoRoot, canonicalPath);
  return canonicalPath;
}

function canonicalizeJson(value: unknown, ancestors = new Set<object>()): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      throw new AdminContentChecksumV2MigrationValidationError();
    }

    const nextAncestors = new Set(ancestors).add(value);
    return `[${value.map((item) => canonicalizeJson(item, nextAncestors)).join(',')}]`;
  }

  if (isRecord(value)) {
    if (ancestors.has(value)) {
      throw new AdminContentChecksumV2MigrationValidationError();
    }

    const nextAncestors = new Set(ancestors).add(value);
    const properties = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key], nextAncestors)}`);
    return `{${properties.join(',')}}`;
  }

  throw new AdminContentChecksumV2MigrationValidationError();
}

function normalizeRecords(
  records: readonly AdminContentChecksumV2MigrationRecord[],
): readonly AdminContentChecksumV2MigrationRecord[] {
  const normalizedRecords = records.map((record) => {
    if (
      !isRecord(record) ||
      Object.keys(record).sort().join(',') !== 'data,documentId' ||
      typeof record.documentId !== 'string' ||
      record.documentId.trim().length === 0 ||
      record.documentId !== record.documentId.trim()
    ) {
      throw new AdminContentChecksumV2MigrationValidationError();
    }

    return { data: record.data, documentId: record.documentId };
  });
  normalizedRecords.sort((left, right) =>
    left.documentId < right.documentId ? -1 : left.documentId > right.documentId ? 1 : 0,
  );

  if (
    normalizedRecords.some(
      (record, index) =>
        index > 0 && record.documentId === normalizedRecords[index - 1]?.documentId,
    )
  ) {
    throw new AdminContentChecksumV2MigrationValidationError(
      'Admin content checksum-v2 migration document IDs must be unique.',
    );
  }

  return normalizedRecords;
}

export function parseAdminContentChecksumV2MigrationInput(
  value: unknown,
): readonly AdminContentChecksumV2MigrationRecord[] {
  if (!isRecord(value) || !hasExactKeys(value, ['records']) || !Array.isArray(value.records)) {
    throw new AdminContentChecksumV2MigrationValidationError(
      'The checksum-v2 migration input must contain exactly a records array.',
    );
  }

  return normalizeRecords(value.records as AdminContentChecksumV2MigrationRecord[]);
}

function createInputFingerprint(records: readonly AdminContentChecksumV2MigrationRecord[]): string {
  return createHash('sha256').update(canonicalizeJson(records)).digest('hex');
}

function createEmptyClassCounts(): AdminContentChecksumV2MigrationClassCounts {
  return {
    DRAFT_V1_SAVE_REQUIRED: 0,
    DRAFT_V2_CURRENT: 0,
    PUBLISHED_V1_PRESERVED: 0,
    PUBLISHED_V2_PRESERVED: 0,
  };
}

function parseClassCounts(value: unknown): AdminContentChecksumV2MigrationClassCounts {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, adminContentChecksumV2MigrationClassifications) ||
    !adminContentChecksumV2MigrationClassifications.every((key) => isNonNegativeInteger(value[key]))
  ) {
    throw new AdminContentChecksumV2MigrationValidationError(
      'Admin content checksum-v2 migration checkpoint is invalid.',
    );
  }

  return {
    DRAFT_V1_SAVE_REQUIRED: value.DRAFT_V1_SAVE_REQUIRED as number,
    DRAFT_V2_CURRENT: value.DRAFT_V2_CURRENT as number,
    PUBLISHED_V1_PRESERVED: value.PUBLISHED_V1_PRESERVED as number,
    PUBLISHED_V2_PRESERVED: value.PUBLISHED_V2_PRESERVED as number,
  };
}

function isFailureCode(value: unknown): value is AdminContentChecksumV2MigrationFailureCode {
  return value === 'DRAFT_CHECKSUM_MISMATCH' || value === 'INVALID_STORED_REVISION';
}

function parseFailures(value: unknown): readonly AdminContentChecksumV2MigrationFailure[] {
  if (!Array.isArray(value)) {
    throw new AdminContentChecksumV2MigrationValidationError(
      'Admin content checksum-v2 migration checkpoint is invalid.',
    );
  }

  return value.map((failure) => {
    if (
      !isRecord(failure) ||
      !hasExactKeys(failure, ['code', 'documentId']) ||
      !isFailureCode(failure.code) ||
      typeof failure.documentId !== 'string'
    ) {
      throw new AdminContentChecksumV2MigrationValidationError(
        'Admin content checksum-v2 migration checkpoint is invalid.',
      );
    }

    return { code: failure.code, documentId: failure.documentId };
  });
}

export function parseAdminContentChecksumV2MigrationCheckpoint(input: {
  checkpoint: unknown;
  documentIds: readonly string[];
  inputFingerprint: string;
}): AdminContentChecksumV2MigrationCheckpoint {
  const { checkpoint } = input;
  if (
    !isRecord(checkpoint) ||
    !hasExactKeys(checkpoint, [
      'classCounts',
      'completed',
      'failed',
      'failures',
      'inputFingerprint',
      'lastDocumentId',
      'migrationId',
      'scanned',
      'schemaVersion',
      'succeeded',
    ]) ||
    checkpoint.schemaVersion !== 1 ||
    checkpoint.migrationId !== ADMIN_CONTENT_CHECKSUM_V2_MIGRATION_ID ||
    !isSha256Fingerprint(checkpoint.inputFingerprint) ||
    checkpoint.inputFingerprint !== input.inputFingerprint ||
    (checkpoint.lastDocumentId !== null && typeof checkpoint.lastDocumentId !== 'string') ||
    !isNonNegativeInteger(checkpoint.scanned) ||
    !isNonNegativeInteger(checkpoint.succeeded) ||
    !isNonNegativeInteger(checkpoint.failed) ||
    typeof checkpoint.completed !== 'boolean'
  ) {
    throw new AdminContentChecksumV2MigrationValidationError(
      'Admin content checksum-v2 migration checkpoint is stale or invalid.',
    );
  }

  const classCounts = parseClassCounts(checkpoint.classCounts);
  const failures = parseFailures(checkpoint.failures);
  const classCountTotal = Object.values(classCounts).reduce((sum, count) => sum + count, 0);
  const expectedLastDocumentId =
    checkpoint.scanned === 0 ? null : (input.documentIds[checkpoint.scanned - 1] ?? null);
  const processedDocumentIds = new Set(input.documentIds.slice(0, checkpoint.scanned));
  const failureDocumentIds = failures.map((failure) => failure.documentId);
  const failureIdsAreUnique = new Set(failureDocumentIds).size === failureDocumentIds.length;

  if (
    checkpoint.scanned > input.documentIds.length ||
    checkpoint.succeeded + checkpoint.failed !== checkpoint.scanned ||
    classCountTotal !== checkpoint.succeeded ||
    failures.length !== checkpoint.failed ||
    !failureIdsAreUnique ||
    failureDocumentIds.some((documentId) => !processedDocumentIds.has(documentId)) ||
    checkpoint.lastDocumentId !== expectedLastDocumentId ||
    checkpoint.completed !== (checkpoint.scanned === input.documentIds.length)
  ) {
    throw new AdminContentChecksumV2MigrationValidationError(
      'Admin content checksum-v2 migration checkpoint is stale or invalid.',
    );
  }

  return {
    classCounts,
    completed: checkpoint.completed,
    failed: checkpoint.failed,
    failures,
    inputFingerprint: checkpoint.inputFingerprint,
    lastDocumentId: checkpoint.lastDocumentId,
    migrationId: ADMIN_CONTENT_CHECKSUM_V2_MIGRATION_ID,
    scanned: checkpoint.scanned,
    schemaVersion: 1,
    succeeded: checkpoint.succeeded,
  };
}

function classifyRecord(
  data: unknown,
):
  | { classification: AdminContentChecksumV2MigrationClassification }
  | { failureCode: AdminContentChecksumV2MigrationFailureCode } {
  try {
    const revision = parseStoredAdminContentRevisionValue(data);

    if (revision.state === 'published') {
      return {
        classification:
          revision.schemaVersion === 1 ? 'PUBLISHED_V1_PRESERVED' : 'PUBLISHED_V2_PRESERVED',
      };
    }

    const expectedChecksum =
      revision.schemaVersion === 1
        ? createLegacyAdminContentDraftChecksum(revision.draft)
        : createAdminContentDraftChecksum(revision.draft);

    if (revision.contentChecksum !== expectedChecksum) {
      return { failureCode: 'DRAFT_CHECKSUM_MISMATCH' };
    }

    return {
      classification: revision.schemaVersion === 1 ? 'DRAFT_V1_SAVE_REQUIRED' : 'DRAFT_V2_CURRENT',
    };
  } catch {
    return { failureCode: 'INVALID_STORED_REVISION' };
  }
}

function assertCheckpointMatchesProcessedRecords(
  checkpoint: AdminContentChecksumV2MigrationCheckpoint,
  records: readonly AdminContentChecksumV2MigrationRecord[],
): void {
  const expectedClassCounts = createEmptyClassCounts();
  const expectedFailures: AdminContentChecksumV2MigrationFailure[] = [];

  for (const record of records.slice(0, checkpoint.scanned)) {
    const outcome = classifyRecord(record.data);
    if ('classification' in outcome) {
      expectedClassCounts[outcome.classification] += 1;
    } else {
      expectedFailures.push({ code: outcome.failureCode, documentId: record.documentId });
    }
  }

  if (
    canonicalizeJson(checkpoint.classCounts) !== canonicalizeJson(expectedClassCounts) ||
    canonicalizeJson(checkpoint.failures) !== canonicalizeJson(expectedFailures)
  ) {
    throw new AdminContentChecksumV2MigrationValidationError(
      'Admin content checksum-v2 migration checkpoint is stale or invalid.',
    );
  }
}

function isClassification(value: unknown): value is AdminContentChecksumV2MigrationClassification {
  return (adminContentChecksumV2MigrationClassifications as readonly unknown[]).includes(value);
}

function isBatchOutcome(value: unknown): value is AdminContentChecksumV2MigrationBatchOutcome {
  if (!isRecord(value) || typeof value.documentId !== 'string') {
    return false;
  }

  if (value.status === 'succeeded') {
    return (
      hasExactKeys(value, ['classification', 'documentId', 'status']) &&
      isClassification(value.classification)
    );
  }

  return (
    value.status === 'failed' &&
    hasExactKeys(value, ['documentId', 'failureCode', 'status']) &&
    isFailureCode(value.failureCode)
  );
}

export function assertAdminContentChecksumV2MigrationReportInvariants(
  report: AdminContentChecksumV2MigrationDryRunReport,
): void {
  if (
    !isRecord(report) ||
    !hasExactKeys(report, [
      'batchOutcomes',
      'checkpoint',
      'dryRun',
      'inputFingerprint',
      'isValid',
      'migrationId',
      'writes',
    ]) ||
    report.migrationId !== ADMIN_CONTENT_CHECKSUM_V2_MIGRATION_ID ||
    report.dryRun !== true ||
    !isSha256Fingerprint(report.inputFingerprint) ||
    typeof report.isValid !== 'boolean' ||
    !Array.isArray(report.writes) ||
    report.writes.length !== 0 ||
    !Array.isArray(report.batchOutcomes) ||
    !report.batchOutcomes.every(isBatchOutcome) ||
    !isRecord(report.checkpoint)
  ) {
    throw new AdminContentChecksumV2MigrationValidationError(
      'Admin content checksum-v2 migration report invariants failed.',
    );
  }

  const checkpoint = report.checkpoint;
  const classCounts = parseClassCounts(checkpoint.classCounts);
  const failures = parseFailures(checkpoint.failures);
  const classCountTotal = Object.values(classCounts).reduce((sum, count) => sum + count, 0);
  if (
    !hasExactKeys(checkpoint, [
      'classCounts',
      'completed',
      'failed',
      'failures',
      'inputFingerprint',
      'lastDocumentId',
      'migrationId',
      'scanned',
      'schemaVersion',
      'succeeded',
    ]) ||
    checkpoint.schemaVersion !== 1 ||
    checkpoint.migrationId !== ADMIN_CONTENT_CHECKSUM_V2_MIGRATION_ID ||
    checkpoint.inputFingerprint !== report.inputFingerprint ||
    (checkpoint.lastDocumentId !== null && typeof checkpoint.lastDocumentId !== 'string') ||
    !isNonNegativeInteger(checkpoint.scanned) ||
    !isNonNegativeInteger(checkpoint.succeeded) ||
    !isNonNegativeInteger(checkpoint.failed) ||
    typeof checkpoint.completed !== 'boolean' ||
    checkpoint.succeeded + checkpoint.failed !== checkpoint.scanned ||
    classCountTotal !== checkpoint.succeeded ||
    failures.length !== checkpoint.failed ||
    report.isValid !== (checkpoint.failed === 0)
  ) {
    throw new AdminContentChecksumV2MigrationValidationError(
      'Admin content checksum-v2 migration report invariants failed.',
    );
  }
}

export function createAdminContentChecksumV2MigrationDryRun(input: {
  checkpoint?: unknown;
  maxDocuments?: number;
  records: readonly AdminContentChecksumV2MigrationRecord[];
}): AdminContentChecksumV2MigrationDryRunReport {
  const records = normalizeRecords(input.records);
  const inputFingerprint = createInputFingerprint(records);
  const documentIds = records.map((record) => record.documentId);

  if (
    input.maxDocuments !== undefined &&
    (!Number.isSafeInteger(input.maxDocuments) || input.maxDocuments <= 0)
  ) {
    throw new AdminContentChecksumV2MigrationValidationError(
      'Admin content checksum-v2 migration maxDocuments must be a positive integer.',
    );
  }

  const previousCheckpoint: AdminContentChecksumV2MigrationCheckpoint =
    input.checkpoint === undefined
      ? {
          classCounts: createEmptyClassCounts(),
          completed: records.length === 0,
          failed: 0,
          failures: [] as readonly AdminContentChecksumV2MigrationFailure[],
          inputFingerprint,
          lastDocumentId: null,
          migrationId: ADMIN_CONTENT_CHECKSUM_V2_MIGRATION_ID,
          scanned: 0,
          schemaVersion: 1 as const,
          succeeded: 0,
        }
      : parseAdminContentChecksumV2MigrationCheckpoint({
          checkpoint: input.checkpoint,
          documentIds,
          inputFingerprint,
        });
  assertCheckpointMatchesProcessedRecords(previousCheckpoint, records);
  const remainingRecords = records.slice(previousCheckpoint.scanned);
  const batchRecords =
    input.maxDocuments === undefined
      ? remainingRecords
      : remainingRecords.slice(0, input.maxDocuments);
  const classCounts = { ...previousCheckpoint.classCounts };
  const failures = [...previousCheckpoint.failures];
  const batchOutcomes = batchRecords.map<AdminContentChecksumV2MigrationBatchOutcome>((record) => {
    const result = classifyRecord(record.data);

    if ('classification' in result) {
      classCounts[result.classification] += 1;
      return {
        classification: result.classification,
        documentId: record.documentId,
        status: 'succeeded',
      };
    }

    failures.push({ code: result.failureCode, documentId: record.documentId });
    return {
      documentId: record.documentId,
      failureCode: result.failureCode,
      status: 'failed',
    };
  });
  const succeeded = Object.values(classCounts).reduce((sum, count) => sum + count, 0);
  const scanned = previousCheckpoint.scanned + batchRecords.length;
  const checkpoint: AdminContentChecksumV2MigrationCheckpoint = {
    classCounts,
    completed: scanned === records.length,
    failed: failures.length,
    failures,
    inputFingerprint,
    lastDocumentId: scanned === 0 ? null : (records[scanned - 1]?.documentId ?? null),
    migrationId: ADMIN_CONTENT_CHECKSUM_V2_MIGRATION_ID,
    scanned,
    schemaVersion: 1,
    succeeded,
  };

  const report: AdminContentChecksumV2MigrationDryRunReport = {
    batchOutcomes,
    checkpoint,
    dryRun: true,
    inputFingerprint,
    isValid: failures.length === 0,
    migrationId: ADMIN_CONTENT_CHECKSUM_V2_MIGRATION_ID,
    writes: [],
  };
  assertAdminContentChecksumV2MigrationReportInvariants(report);
  return report;
}
