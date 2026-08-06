import { describe, expect, it, vi } from 'vitest';

import {
  createLearningContentRepository,
  isStableContentAccessDocument,
  type LearningContentAccessReader,
} from './learning-content-repository.js';

function createAccessReader(
  resolver: (
    input: Parameters<LearningContentAccessReader['hasStableContentAccess']>[0],
  ) => boolean,
): LearningContentAccessReader {
  return {
    hasStableContentAccess: vi.fn().mockImplementation(async (input) => resolver(input)),
  };
}

function collectObjectKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectObjectKeys);
  }

  if (typeof value !== 'object' || value === null) {
    return [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => [
    key,
    ...collectObjectKeys(nestedValue),
  ]);
}

describe('learning content repository', () => {
  it('accepts only stable grants without a revision pin', () => {
    expect(
      isStableContentAccessDocument({
        contentType: 'post',
        entityId: 'dl-p01-neuron-perceptron',
        schemaVersion: 1,
      }),
    ).toBe(true);
    expect(
      isStableContentAccessDocument({
        contentType: 'post',
        entityId: 'dl-p01-neuron-perceptron',
        revisionId: 'post-dl-p01-neuron-perceptron-rev-r0',
        schemaVersion: 1,
      }),
    ).toBe(false);
    expect(
      isStableContentAccessDocument({
        contentType: 'demo',
        entityId: 'demo-perceptron-and-gate',
        publishedRevisionId: 'demo-perceptron-and-gate-rev-r0',
        schemaVersion: 1,
      }),
    ).toBe(false);
  });

  it('returns only the catalog-designated trial and never consults an entitlement for it', async () => {
    const accessReader = createAccessReader(() => false);
    const repository = createLearningContentRepository({ accessReader });

    const trial = await repository.getTrialPostContent({
      postId: 'dl-p01-neuron-perceptron',
    });

    expect(trial.data).toMatchObject({
      accessLevel: 'trial',
      id: 'dl-p01-neuron-perceptron',
    });
    expect(trial.data.blocks.map((block) => (block as { id: string }).id)).not.toContain(
      'xor-linear-limit',
    );
    expect(accessReader.hasStableContentAccess).not.toHaveBeenCalled();

    await expect(
      repository.getTrialPostContent({ postId: 'cml-p02-train-test-metrics' }),
    ).rejects.toMatchObject({ code: 'TRIAL_POST_NOT_FOUND', statusCode: 404 });
  });

  it('rechecks the authenticated owner grant for each protected read and fails closed after revocation', async () => {
    const accessReader = createAccessReader(({ uid }) => uid === 'learner-01');
    const repository = createLearningContentRepository({ accessReader });

    const fullPost = await repository.getFullPostContent({
      postId: 'dl-p01-neuron-perceptron',
      uid: 'learner-01',
    });

    expect(fullPost.data).toMatchObject({
      accessLevel: 'full',
      revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
    });
    expect(fullPost.data.blocks.map((block) => (block as { id: string }).id)).toContain(
      'xor-linear-limit',
    );
    expect(collectObjectKeys(fullPost.data)).not.toEqual(
      expect.arrayContaining(['answerKey', 'correctAnswer', 'correctOption']),
    );

    await expect(
      repository.getFullPostContent({
        postId: 'dl-p01-neuron-perceptron',
        uid: 'learner-02',
      }),
    ).rejects.toMatchObject({ code: 'POST_ACCESS_REQUIRED', statusCode: 403 });
    await expect(
      repository.getDemoContent({
        demoId: 'demo-perceptron-and-gate',
        uid: 'learner-02',
      }),
    ).rejects.toMatchObject({ code: 'DEMO_ACCESS_REQUIRED', statusCode: 403 });

    expect(accessReader.hasStableContentAccess).toHaveBeenNthCalledWith(1, {
      contentType: 'post',
      entityId: 'dl-p01-neuron-perceptron',
      uid: 'learner-01',
    });
    expect(accessReader.hasStableContentAccess).toHaveBeenNthCalledWith(2, {
      contentType: 'post',
      entityId: 'dl-p01-neuron-perceptron',
      uid: 'learner-02',
    });
    expect(accessReader.hasStableContentAccess).toHaveBeenNthCalledWith(3, {
      contentType: 'demo',
      entityId: 'demo-perceptron-and-gate',
      uid: 'learner-02',
    });
  });

  it('returns the fixed AND inputs, parameters, and predictions only after demo access is granted', async () => {
    const repository = createLearningContentRepository({
      accessReader: createAccessReader(() => true),
    });

    const demo = await repository.getDemoContent({
      demoId: 'demo-perceptron-and-gate',
      uid: 'learner-01',
    });

    expect(demo.data.fixedRun).toMatchObject({
      datasetVersionId: 'dataset-demo-perceptron-and-gate-v1',
      parameterValues: [
        { id: 'w1', value: 1 },
        { id: 'w2', value: 1 },
        { id: 'bias', value: -1.5 },
      ],
      rows: [
        { input: [0, 0], predictedOutput: 0, targetOutput: 0 },
        { input: [0, 1], predictedOutput: 0, targetOutput: 0 },
        { input: [1, 0], predictedOutput: 0, targetOutput: 0 },
        { input: [1, 1], predictedOutput: 1, targetOutput: 1 },
      ],
    });
  });
});
