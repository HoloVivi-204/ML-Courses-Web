import type { AdminContentDraft, AdminContentSummary } from './admin-content-repository.js';
import type { PublishedLearnerContent } from './learning-content-repository.js';

export interface StoredAdminContentDraftRevisionV2 {
  contentChecksum: string;
  contentChecksumVersion: 2;
  createdAt: string;
  draft: AdminContentDraft;
  entityKey: string;
  learnerContent: PublishedLearnerContent | null;
  schemaVersion: 2;
  state: 'draft';
  updatedAt: string;
}

export interface StoredAdminContentDraftRevisionV1 {
  contentChecksum: string;
  createdAt: string;
  draft: AdminContentDraft;
  entityKey: string;
  learnerContent: PublishedLearnerContent | null;
  schemaVersion: 1;
  state: 'draft';
  updatedAt: string;
}

export interface StoredAdminContentDraftRevisionInput {
  contentChecksum: string;
  createdAt: string;
  draft: AdminContentDraft;
  entityKey: string;
  learnerContent: PublishedLearnerContent | null;
  updatedAt: string;
}

export type StoredAdminContentDraftRevisionV2Input = StoredAdminContentDraftRevisionInput;

export interface StoredAdminContentPublishedRevisionV1 {
  contentChecksum: string;
  createdAt: string;
  entityKey: string;
  learnerContent: PublishedLearnerContent | null;
  publishedAt: string;
  publishedContent: AdminContentSummary;
  schemaVersion: 1;
  state: 'published';
}

export interface StoredAdminContentPublishedRevisionV2 {
  createdAt: string;
  entityKey: string;
  learnerContent: PublishedLearnerContent | null;
  publishedAt: string;
  publishedContent: AdminContentSummary;
  schemaVersion: 2;
  sourceDraftEvidenceChecksum: string;
  sourceDraftEvidenceChecksumVersion: 2;
  state: 'published';
}

export interface StoredAdminContentPublishedRevisionInput {
  createdAt: string;
  entityKey: string;
  learnerContent: PublishedLearnerContent | null;
  publishedAt: string;
  publishedContent: AdminContentSummary;
}

export interface StoredAdminContentPublishedRevisionV1Input extends StoredAdminContentPublishedRevisionInput {
  contentChecksum: string;
}

export interface StoredAdminContentPublishedRevisionV2Input extends StoredAdminContentPublishedRevisionInput {
  sourceDraftEvidenceChecksum: string;
}

export type StoredAdminContentRevision =
  | StoredAdminContentDraftRevisionV1
  | StoredAdminContentDraftRevisionV2
  | StoredAdminContentPublishedRevisionV1
  | StoredAdminContentPublishedRevisionV2;

export class StoredAdminContentRevisionParseError extends Error {
  constructor() {
    super('Persisted Admin content revision is invalid.');
    this.name = 'StoredAdminContentRevisionParseError';
  }
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

function isSha256Checksum(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function isLearnerContent(value: unknown): value is PublishedLearnerContent | null {
  return value === null || isRecord(value);
}

function parseStoredDraftRevisionV2(
  value: Record<string, unknown>,
): StoredAdminContentDraftRevisionV2 | null {
  if (
    !hasExactKeys(value, [
      'contentChecksum',
      'contentChecksumVersion',
      'createdAt',
      'draft',
      'entityKey',
      'learnerContent',
      'schemaVersion',
      'state',
      'updatedAt',
    ]) ||
    value.schemaVersion !== 2 ||
    value.state !== 'draft' ||
    value.contentChecksumVersion !== 2 ||
    !isSha256Checksum(value.contentChecksum) ||
    typeof value.createdAt !== 'string' ||
    !isRecord(value.draft) ||
    typeof value.entityKey !== 'string' ||
    !isLearnerContent(value.learnerContent) ||
    typeof value.updatedAt !== 'string'
  ) {
    return null;
  }

  return value as unknown as StoredAdminContentDraftRevisionV2;
}

function parseStoredDraftRevisionV1(
  value: Record<string, unknown>,
): StoredAdminContentDraftRevisionV1 | null {
  const keys = [
    'contentChecksum',
    'createdAt',
    'draft',
    'entityKey',
    'learnerContent',
    'schemaVersion',
    'state',
    'updatedAt',
  ];
  const keysWithoutLearnerContent = keys.filter((key) => key !== 'learnerContent');
  const hasLegacyShape =
    hasExactKeys(value, keys) || hasExactKeys(value, keysWithoutLearnerContent);

  if (
    !hasLegacyShape ||
    value.schemaVersion !== 1 ||
    value.state !== 'draft' ||
    !isSha256Checksum(value.contentChecksum) ||
    typeof value.createdAt !== 'string' ||
    !isRecord(value.draft) ||
    typeof value.entityKey !== 'string' ||
    (value.learnerContent !== undefined && !isLearnerContent(value.learnerContent)) ||
    typeof value.updatedAt !== 'string'
  ) {
    return null;
  }

  return {
    contentChecksum: value.contentChecksum,
    createdAt: value.createdAt,
    draft: value.draft as unknown as AdminContentDraft,
    entityKey: value.entityKey,
    learnerContent: value.learnerContent ?? null,
    schemaVersion: 1,
    state: 'draft',
    updatedAt: value.updatedAt,
  };
}

function parseStoredPublishedRevisionV1(
  value: Record<string, unknown>,
): StoredAdminContentPublishedRevisionV1 | null {
  const keys = [
    'contentChecksum',
    'createdAt',
    'entityKey',
    'learnerContent',
    'publishedAt',
    'publishedContent',
    'schemaVersion',
    'state',
  ];
  const keysWithoutLearnerContent = keys.filter((key) => key !== 'learnerContent');
  const hasLegacyShape =
    hasExactKeys(value, keys) || hasExactKeys(value, keysWithoutLearnerContent);

  if (
    !hasLegacyShape ||
    value.schemaVersion !== 1 ||
    value.state !== 'published' ||
    !isSha256Checksum(value.contentChecksum) ||
    typeof value.createdAt !== 'string' ||
    typeof value.entityKey !== 'string' ||
    (value.learnerContent !== undefined && !isLearnerContent(value.learnerContent)) ||
    typeof value.publishedAt !== 'string' ||
    !isRecord(value.publishedContent)
  ) {
    return null;
  }

  return {
    contentChecksum: value.contentChecksum,
    createdAt: value.createdAt,
    entityKey: value.entityKey,
    learnerContent: value.learnerContent ?? null,
    publishedAt: value.publishedAt,
    publishedContent: value.publishedContent as unknown as AdminContentSummary,
    schemaVersion: 1,
    state: 'published',
  };
}

function parseStoredPublishedRevisionV2(
  value: Record<string, unknown>,
): StoredAdminContentPublishedRevisionV2 | null {
  if (
    !hasExactKeys(value, [
      'createdAt',
      'entityKey',
      'learnerContent',
      'publishedAt',
      'publishedContent',
      'schemaVersion',
      'sourceDraftEvidenceChecksum',
      'sourceDraftEvidenceChecksumVersion',
      'state',
    ]) ||
    value.schemaVersion !== 2 ||
    value.state !== 'published' ||
    !isSha256Checksum(value.sourceDraftEvidenceChecksum) ||
    value.sourceDraftEvidenceChecksumVersion !== 2 ||
    typeof value.createdAt !== 'string' ||
    typeof value.entityKey !== 'string' ||
    !isLearnerContent(value.learnerContent) ||
    typeof value.publishedAt !== 'string' ||
    !isRecord(value.publishedContent)
  ) {
    return null;
  }

  return value as unknown as StoredAdminContentPublishedRevisionV2;
}

export function parseStoredAdminContentRevisionValue(value: unknown): StoredAdminContentRevision {
  if (!isRecord(value)) {
    throw new StoredAdminContentRevisionParseError();
  }

  const storedRevision =
    parseStoredDraftRevisionV1(value) ??
    parseStoredDraftRevisionV2(value) ??
    parseStoredPublishedRevisionV1(value) ??
    parseStoredPublishedRevisionV2(value);

  if (!storedRevision) {
    throw new StoredAdminContentRevisionParseError();
  }

  return storedRevision;
}

export function serializeStoredAdminContentDraftRevisionV1(
  input: StoredAdminContentDraftRevisionInput,
): StoredAdminContentDraftRevisionV1 {
  return {
    contentChecksum: input.contentChecksum,
    createdAt: input.createdAt,
    draft: input.draft,
    entityKey: input.entityKey,
    learnerContent: input.learnerContent,
    schemaVersion: 1,
    state: 'draft',
    updatedAt: input.updatedAt,
  };
}

export function serializeStoredAdminContentDraftRevisionV2(
  input: StoredAdminContentDraftRevisionV2Input,
): StoredAdminContentDraftRevisionV2 {
  return {
    contentChecksum: input.contentChecksum,
    contentChecksumVersion: 2,
    createdAt: input.createdAt,
    draft: input.draft,
    entityKey: input.entityKey,
    learnerContent: input.learnerContent,
    schemaVersion: 2,
    state: 'draft',
    updatedAt: input.updatedAt,
  };
}

export function serializeStoredAdminContentPublishedRevisionV1(
  input: StoredAdminContentPublishedRevisionV1Input,
): StoredAdminContentPublishedRevisionV1 {
  return {
    contentChecksum: input.contentChecksum,
    createdAt: input.createdAt,
    entityKey: input.entityKey,
    learnerContent: input.learnerContent,
    publishedAt: input.publishedAt,
    publishedContent: input.publishedContent,
    schemaVersion: 1,
    state: 'published',
  };
}

export function serializeStoredAdminContentPublishedRevisionV2(
  input: StoredAdminContentPublishedRevisionV2Input,
): StoredAdminContentPublishedRevisionV2 {
  return {
    createdAt: input.createdAt,
    entityKey: input.entityKey,
    learnerContent: input.learnerContent,
    publishedAt: input.publishedAt,
    publishedContent: input.publishedContent,
    schemaVersion: 2,
    sourceDraftEvidenceChecksum: input.sourceDraftEvidenceChecksum,
    sourceDraftEvidenceChecksumVersion: 2,
    state: 'published',
  };
}
