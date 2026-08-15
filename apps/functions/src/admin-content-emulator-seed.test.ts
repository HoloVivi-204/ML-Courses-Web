import { describe, expect, it } from 'vitest';

import { createReleaseOneFirestoreAdminContentSeed } from './admin-content-emulator-seed.js';
import { createStaticAdminContentRepository } from './admin-content-repository.js';
import { createPublishedLearnerContentDocuments } from './published-learner-content.js';

describe('Release 1 Firestore Admin content seed', () => {
  it('materializes every locked entity and learner-readable revision for the Emulator', () => {
    const seed = createReleaseOneFirestoreAdminContentSeed();
    const content = seed.map((record) => record.content);

    expect(content.filter((item) => item.entityType === 'course')).toHaveLength(2);
    expect(content.filter((item) => item.entityType === 'module')).toHaveLength(12);
    expect(content.filter((item) => item.entityType === 'post')).toHaveLength(18);
    expect(content.filter((item) => item.entityType === 'demo')).toHaveLength(10);
    expect(content.filter((item) => item.entityType === 'quiz')).toHaveLength(30);
    expect(
      content
        .filter((item) => item.entityType === 'course')
        .map((item) => ({ courseId: item.courseId, trialPostId: item.trialPostId })),
    ).toEqual([
      { courseId: 'course-classical-ml', trialPostId: 'cml-p01-problem-data-types' },
      { courseId: 'course-deep-learning-basic', trialPostId: 'dl-p01-neuron-perceptron' },
    ]);

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

    const taskFingerprints = content.flatMap(
      (item) => item.validationManifest?.taskFingerprints ?? [],
    );

    expect(taskFingerprints).toHaveLength(154);
    expect(taskFingerprints.every((fingerprint) => /^[a-f0-9]{64}$/.test(fingerprint))).toBe(true);
    expect(new Set(taskFingerprints).size).toBe(154);
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
      requestId: 'request-emulator-seed-validation',
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

  it('materializes course, module, and quiz learner summaries from their current published revisions', () => {
    const seed = createReleaseOneFirestoreAdminContentSeed();
    const course = seed.find(
      (record) =>
        record.content.entityType === 'course' &&
        record.content.entityId === 'course-deep-learning-basic',
    );
    const module = seed.find(
      (record) =>
        record.content.entityType === 'module' &&
        record.content.entityId === 'dl-m01-neuron-perceptron',
    );
    const quiz = seed.find(
      (record) =>
        record.content.entityType === 'quiz' && record.content.entityId === 'quiz-post-dl-p01',
    );

    expect(course).toBeDefined();
    expect(module).toBeDefined();
    expect(quiz).toBeDefined();

    const documents = [course, module, quiz].flatMap((record) => {
      if (!record) {
        return [];
      }

      return createPublishedLearnerContentDocuments({
        content: record.content,
        learnerContent: record.learnerContent ?? null,
      });
    });

    expect(documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentId: 'course:course-deep-learning-basic:summary',
          data: expect.objectContaining({
            documentKind: 'course-summary',
            revisionId: 'course-deep-learning-basic-rev-r1',
          }),
        }),
        expect.objectContaining({
          documentId: 'module:dl-m01-neuron-perceptron:summary',
          data: expect.objectContaining({
            documentKind: 'module-summary',
            revisionId: 'module-dl-m01-neuron-perceptron-rev-r1',
          }),
        }),
        expect.objectContaining({
          documentId: 'quiz:quiz-post-dl-p01:summary',
          data: expect.objectContaining({
            documentKind: 'quiz-summary',
            revisionId: 'quiz-quiz-post-dl-p01-rev-r1',
          }),
        }),
      ]),
    );
  });
});
