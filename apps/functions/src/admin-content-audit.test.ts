import { describe, expect, it } from 'vitest';

import { createAdminContentDraftUpdateAuditRecord } from './admin-content-audit.js';
import type { AdminContentDraft } from './admin-content-repository.js';

const draftFixture: AdminContentDraft = {
  baseRevisionId: 'course-classical-ml-rev-r1',
  courseId: 'course-classical-ml',
  draftRevisionId: 'draft-course-course-classical-ml-rev-d1',
  entityId: 'course-classical-ml',
  entityType: 'course',
  localeAvailability: ['en', 'vi'],
  metadata: {
    attribution: {
      en: 'RAW_ATTRIBUTION_SENTINEL_EN',
      vi: 'RAW_ATTRIBUTION_SENTINEL_VI',
    },
    externalLinkUrl: 'https://raw-url-sentinel.example/private',
  },
  preview: {
    en: 'RAW_PREVIEW_SENTINEL_EN',
    vi: 'RAW_PREVIEW_SENTINEL_VI',
  },
  revisionVersion: 7,
  sourceReview: {
    attribution: { en: 'Source', vi: 'Nguon' },
    license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    sourceId: 'source-01',
    title: 'Source title',
  },
  sourceStatus: 'seeded',
  status: 'draft',
  title: {
    en: 'RAW_TITLE_SENTINEL_EN',
    vi: 'RAW_TITLE_SENTINEL_VI',
  },
  validationStatus: 'valid',
};

describe('Admin content draft audit', () => {
  it('creates the exact v1 allowlist record for semantic changes and a legacy upgrade', () => {
    const updatedDraft: AdminContentDraft = {
      ...draftFixture,
      metadata: {
        attribution: {
          en: 'CHANGED_ATTRIBUTION_SENTINEL_EN',
          vi: 'CHANGED_ATTRIBUTION_SENTINEL_VI',
        },
        externalLinkUrl: 'https://changed-url-sentinel.example/private',
      },
      preview: {
        en: 'CHANGED_PREVIEW_SENTINEL_EN',
        vi: 'CHANGED_PREVIEW_SENTINEL_VI',
      },
      revisionVersion: 8,
      title: {
        en: 'CHANGED_TITLE_SENTINEL_EN',
        vi: 'CHANGED_TITLE_SENTINEL_VI',
      },
      trialPostId: 'cml-p02-linear-regression',
      validationStatus: 'not-run',
    };

    const record = createAdminContentDraftUpdateAuditRecord({
      actorId: 'admin-01',
      before: draftFixture,
      contentChecksumVersionBefore: 1,
      createdAt: '2026-08-13T12:30:00.000Z',
      after: updatedDraft,
      requestId: 'request-audit-01',
    });

    expect(record).toEqual({
      schemaVersion: 1,
      actorId: 'admin-01',
      action: 'admin-content-draft.updated',
      target: {
        entityType: 'course',
        entityId: 'course-classical-ml',
        revisionId: 'draft-course-course-classical-ml-rev-d1',
      },
      createdAt: '2026-08-13T12:30:00.000Z',
      requestId: 'request-audit-01',
      diff: {
        revisionVersion: { before: 7, after: 8 },
        changedFields: [
          'title',
          'preview',
          'metadata.attribution',
          'metadata.externalLinkUrl',
          'trialPostId',
          'validationStatus',
          'contentChecksumVersion',
        ],
        trialPostId: { before: null, after: 'cml-p02-linear-regression' },
        validationStatus: { before: 'valid', after: 'not-run' },
        contentChecksumVersion: { before: 1, after: 2 },
      },
    });
    expect(new Date(record.createdAt).toISOString()).toBe(record.createdAt);
    expect(JSON.stringify(record)).not.toMatch(
      /RAW_|CHANGED_|raw-url-sentinel|changed-url-sentinel/,
    );
  });

  it('normalizes a missing trial post to null and omits semantically unchanged values', () => {
    const record = createAdminContentDraftUpdateAuditRecord({
      actorId: 'admin-01',
      before: { ...draftFixture, validationStatus: 'not-run' },
      contentChecksumVersionBefore: 2,
      createdAt: '2026-08-13T12:31:00.000Z',
      after: {
        ...draftFixture,
        metadata: {
          attribution: { ...draftFixture.metadata.attribution },
          externalLinkUrl: draftFixture.metadata.externalLinkUrl,
        },
        preview: { ...draftFixture.preview },
        revisionVersion: 8,
        title: { ...draftFixture.title },
        trialPostId: null,
        validationStatus: 'not-run',
      },
      requestId: 'request-audit-02',
    });

    expect(record.diff).toEqual({
      revisionVersion: { before: 7, after: 8 },
      changedFields: [],
    });
  });
});
