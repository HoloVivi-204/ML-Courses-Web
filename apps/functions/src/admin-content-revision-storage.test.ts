import { describe, expect, it, vi } from 'vitest';

vi.mock('firebase-admin/firestore', () => {
  throw new Error('The pure stored-revision module loaded firebase-admin.');
});

import type { AdminContentDraft, AdminContentSummary } from './admin-content-repository.js';
import {
  parseStoredAdminContentRevisionValue,
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

describe('Stored Admin content revisions', () => {
  it('round-trips a draft v2 through an explicit serializer and the shared parser', () => {
    const storedDraft = serializeStoredAdminContentDraftRevisionV2({
      contentChecksum: 'a'.repeat(64),
      createdAt: '2026-08-12T00:00:00.000Z',
      draft: draftFixture,
      entityKey: 'course:course-classical-ml',
      learnerContent: null,
      updatedAt: '2026-08-12T00:00:00.000Z',
    });

    expect(storedDraft).toEqual({
      contentChecksum: 'a'.repeat(64),
      contentChecksumVersion: 2,
      createdAt: '2026-08-12T00:00:00.000Z',
      draft: draftFixture,
      entityKey: 'course:course-classical-ml',
      learnerContent: null,
      schemaVersion: 2,
      state: 'draft',
      updatedAt: '2026-08-12T00:00:00.000Z',
    });
    expect(parseStoredAdminContentRevisionValue(storedDraft)).toEqual(storedDraft);
  });

  it('parses the frozen draft v1 shape and normalizes absent legacy learner content', () => {
    const storedDraft = serializeStoredAdminContentDraftRevisionV1({
      contentChecksum: 'b'.repeat(64),
      createdAt: '2026-08-11T00:00:00.000Z',
      draft: draftFixture,
      entityKey: 'course:course-classical-ml',
      learnerContent: null,
      updatedAt: '2026-08-11T00:00:00.000Z',
    });
    const legacyWithoutLearnerContent: Partial<typeof storedDraft> = { ...storedDraft };
    delete legacyWithoutLearnerContent.learnerContent;

    expect(parseStoredAdminContentRevisionValue(legacyWithoutLearnerContent)).toEqual(storedDraft);
  });

  it('reads published v1 and v2 while v2 forbids draft checksum fields', () => {
    const commonPublishedFields = {
      createdAt: '2026-08-12T00:00:00.000Z',
      entityKey: 'course:course-classical-ml',
      learnerContent: null,
      publishedAt: '2026-08-12T01:00:00.000Z',
      publishedContent: publishedFixture,
    };
    const storedPublishedV1 = serializeStoredAdminContentPublishedRevisionV1({
      ...commonPublishedFields,
      contentChecksum: 'c'.repeat(64),
    });
    const storedPublishedV2 = serializeStoredAdminContentPublishedRevisionV2({
      ...commonPublishedFields,
      sourceDraftEvidenceChecksum: 'd'.repeat(64),
    });

    expect(parseStoredAdminContentRevisionValue(storedPublishedV1)).toEqual(storedPublishedV1);
    expect(parseStoredAdminContentRevisionValue(storedPublishedV2)).toEqual(storedPublishedV2);
    expect(storedPublishedV2).toEqual({
      ...commonPublishedFields,
      schemaVersion: 2,
      sourceDraftEvidenceChecksum: 'd'.repeat(64),
      sourceDraftEvidenceChecksumVersion: 2,
      state: 'published',
    });
    expect(storedPublishedV2).not.toHaveProperty('contentChecksum');
    expect(storedPublishedV2).not.toHaveProperty('contentChecksumVersion');
    expect(() =>
      parseStoredAdminContentRevisionValue({
        ...storedPublishedV2,
        contentChecksum: 'd'.repeat(64),
      }),
    ).toThrow('Persisted Admin content revision is invalid.');
  });

  it('rejects cross-version checksum metadata and remains fenced from the frozen v1 reader', () => {
    const storedDraftV2 = serializeStoredAdminContentDraftRevisionV2({
      contentChecksum: 'e'.repeat(64),
      createdAt: '2026-08-12T00:00:00.000Z',
      draft: draftFixture,
      entityKey: 'course:course-classical-ml',
      learnerContent: null,
      updatedAt: '2026-08-12T00:00:00.000Z',
    });
    const frozenV1Reader = (value: unknown) => {
      if (
        typeof value !== 'object' ||
        value === null ||
        !('schemaVersion' in value) ||
        value.schemaVersion !== 1
      ) {
        throw new Error('Frozen reader rejected a non-v1 revision.');
      }

      return value;
    };

    expect(() =>
      parseStoredAdminContentRevisionValue({
        ...storedDraftV2,
        sourceDraftEvidenceChecksum: 'e'.repeat(64),
      }),
    ).toThrow('Persisted Admin content revision is invalid.');
    expect(() =>
      parseStoredAdminContentRevisionValue({
        ...storedDraftV2,
        contentChecksumVersion: 1,
      }),
    ).toThrow('Persisted Admin content revision is invalid.');
    expect(() => frozenV1Reader(storedDraftV2)).toThrow(
      'Frozen reader rejected a non-v1 revision.',
    );
  });
});
