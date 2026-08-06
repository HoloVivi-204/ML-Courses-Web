import { describe, expect, it } from 'vitest';

import { createReleaseOneFirestoreAdminContentSeed } from './admin-content-emulator-seed.js';
import { createStaticAdminContentRepository } from './admin-content-repository.js';

describe('Release 1 Firestore Admin content seed', () => {
  it('materializes every locked entity and learner-readable revision for the Emulator', () => {
    const seed = createReleaseOneFirestoreAdminContentSeed();
    const content = seed.map((record) => record.content);

    expect(content.filter((item) => item.entityType === 'course')).toHaveLength(2);
    expect(content.filter((item) => item.entityType === 'module')).toHaveLength(12);
    expect(content.filter((item) => item.entityType === 'post')).toHaveLength(18);
    expect(content.filter((item) => item.entityType === 'demo')).toHaveLength(10);
    expect(content.filter((item) => item.entityType === 'quiz')).toHaveLength(30);

    const postSeed = seed.find(
      (record) =>
        record.content.entityType === 'post' &&
        record.content.entityId === 'dl-p01-neuron-perceptron',
    );
    const demoSeed = seed.find(
      (record) =>
        record.content.entityType === 'demo' &&
        record.content.entityId === 'demo-perceptron-and-gate',
    );

    expect(postSeed?.learnerContent).toMatchObject({
      contentType: 'post',
      fullPost: {
        revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
      },
      trialPost: {
        accessLevel: 'trial',
      },
    });
    expect(demoSeed?.learnerContent).toMatchObject({
      contentType: 'demo',
      demo: {
        revisionId: 'demo-perceptron-and-gate-rev-r1',
      },
    });
  });

  it('creates a validation candidate that stays within every locked Release 1 limit', async () => {
    const repository = createStaticAdminContentRepository(
      createReleaseOneFirestoreAdminContentSeed().map((record) => record.content),
    );
    const createdDraft = await repository.createDraft({
      createdByUid: 'admin-01',
      entityId: 'dl-p01-neuron-perceptron',
      entityType: 'post',
    });
    const draft = createdDraft.data.draft;

    await repository.updateDraft({
      actorUid: 'admin-01',
      patch: {
        metadata: {
          attribution: {
            en: 'Local Emulator attribution for validation.',
            vi: 'Attribution Emulator cục bộ để kiểm tra.',
          },
          externalLinkUrl: 'https://developers.google.com/machine-learning/crash-course',
        },
      },
      revisionId: draft.draftRevisionId,
      revisionVersion: draft.revisionVersion,
    });

    await expect(
      repository.validateDraft({
        actorUid: 'admin-01',
        revisionId: draft.draftRevisionId,
      }),
    ).resolves.toMatchObject({
      data: {
        validation: { status: 'valid' },
      },
    });
  });
});
