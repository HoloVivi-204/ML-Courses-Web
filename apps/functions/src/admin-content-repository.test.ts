import { describe, expect, it } from 'vitest';

import type { AdminContentDraftUpdateAuditRecord } from './admin-content-audit.js';
import { createReleaseOneFirestoreAdminContentSeed } from './admin-content-emulator-seed.js';
import { createStaticAdminContentRepository } from './admin-content-repository.js';

const releaseOneContent = createReleaseOneFirestoreAdminContentSeed().map(
  (record) => record.content,
);

async function createPostDraft(repository: ReturnType<typeof createStaticAdminContentRepository>) {
  return repository.createDraft({
    createdByUid: 'admin-01',
    entityId: 'dl-p01-neuron-perceptron',
    entityType: 'post',
  });
}

describe('Static Admin content draft audit', () => {
  it('keeps the draft unchanged when append fails and releases the revision lock for retry', async () => {
    const auditRecords: AdminContentDraftUpdateAuditRecord[] = [];
    let shouldRejectAppend = true;
    const repository = createStaticAdminContentRepository(releaseOneContent, {
      appendDraftAuditRecord: async (record) => {
        if (shouldRejectAppend) {
          throw new Error('Audit append failed.');
        }

        auditRecords.push(record);
      },
      now: () => new Date('2026-08-13T13:00:00.000Z'),
    });
    const created = await createPostDraft(repository);
    const originalDraft = created.data.draft;
    const input = {
      actorUid: 'admin-01',
      patch: {
        title: {
          en: 'Updated only after audit commit',
          vi: 'Chi cap nhat sau khi audit thanh cong',
        },
      },
      requestId: 'request-static-retry',
      revisionId: originalDraft.draftRevisionId,
      revisionVersion: originalDraft.revisionVersion,
    };

    await expect(repository.updateDraft(input)).rejects.toThrow('Audit append failed.');

    const previewAfterFailure = await repository.getRevisionPreview({
      revisionId: originalDraft.draftRevisionId,
    });
    expect(previewAfterFailure.data.draft).toEqual(originalDraft);
    expect(auditRecords).toHaveLength(0);

    shouldRejectAppend = false;
    const retried = await repository.updateDraft(input);

    expect(retried.data.draft).toMatchObject({
      revisionVersion: originalDraft.revisionVersion + 1,
      title: input.patch.title,
    });
    expect(auditRecords).toHaveLength(1);
  });

  it('serializes same-version updates before checking version and awaiting the audit append', async () => {
    const auditRecords: AdminContentDraftUpdateAuditRecord[] = [];
    const repository = createStaticAdminContentRepository(releaseOneContent, {
      appendDraftAuditRecord: async (record) => {
        await Promise.resolve();
        auditRecords.push(record);
      },
      now: () => new Date('2026-08-13T13:05:00.000Z'),
    });
    const created = await createPostDraft(repository);

    await repository.updateDraft({
      actorUid: 'admin-01',
      patch: {
        metadata: {
          attribution: {
            en: 'Reviewed source attribution.',
            vi: 'Attribution nguon da duoc review.',
          },
          externalLinkUrl: 'https://developers.google.com/machine-learning/crash-course',
        },
      },
      requestId: 'request-static-prerequisite',
      revisionId: created.data.draft.draftRevisionId,
      revisionVersion: 1,
    });
    await repository.validateDraft({
      actorUid: 'admin-01',
      revisionId: created.data.draft.draftRevisionId,
    });
    auditRecords.length = 0;

    const updates = ['Concurrent title A', 'Concurrent title B'].map((title, index) =>
      repository.updateDraft({
        actorUid: 'admin-01',
        patch: { title: { en: title, vi: `Tieu de dong thoi ${index + 1}` } },
        requestId: `request-static-concurrent-${index + 1}`,
        revisionId: created.data.draft.draftRevisionId,
        revisionVersion: 2,
      }),
    );
    const outcomes = await Promise.allSettled(updates);
    const successes = outcomes.filter((outcome) => outcome.status === 'fulfilled');
    const failures = outcomes.filter(
      (outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected',
    );

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.reason).toMatchObject({
      code: 'ADMIN_CONTENT_DRAFT_VERSION_CONFLICT',
      statusCode: 409,
    });
    expect(auditRecords).toHaveLength(1);
    expect(auditRecords[0]).toMatchObject({
      actorId: 'admin-01',
      action: 'admin-content-draft.updated',
      createdAt: '2026-08-13T13:05:00.000Z',
      target: { revisionId: created.data.draft.draftRevisionId },
      diff: {
        revisionVersion: { before: 2, after: 3 },
        changedFields: ['title', 'validationStatus'],
        validationStatus: { before: 'valid', after: 'not-run' },
      },
    });
  });
});
