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

  it('returns the twelve-block training and generalisation lesson only after post access is granted', async () => {
    const repository = createLearningContentRepository({
      accessReader: createAccessReader(() => true),
    });

    const post = await repository.getFullPostContent({
      postId: 'dl-p03-backprop-overfitting',
      uid: 'learner-01',
    });

    expect(post.data).toMatchObject({
      id: 'dl-p03-backprop-overfitting',
      moduleId: 'dl-m03-training-generalization',
      postQuizId: 'quiz-post-dl-p03',
      title: {
        en: 'How gradients and validation evidence guide training',
        vi: 'Gradient và bằng chứng validation định hướng huấn luyện',
      },
    });
    expect(post.data.blocks).toHaveLength(12);
    expect(post.data.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-dl-p03-backprop-overfitting-example',
        type: 'example',
      }),
    );
    expect(post.data.blocks).toContainEqual(
      expect.objectContaining({
        resources: expect.arrayContaining([
          expect.objectContaining({ title: 'Backpropagation' }),
          expect.objectContaining({ title: 'Underfitting and Overfitting' }),
        ]),
        type: 'source-list',
      }),
    );
  });

  it('returns the two source-backed Classical ML foundations lessons only after post access is granted', async () => {
    const repository = createLearningContentRepository({
      accessReader: createAccessReader(() => true),
    });

    const [problemPost, evaluationPost] = await Promise.all([
      repository.getFullPostContent({
        postId: 'cml-p01-problem-data-types',
        uid: 'learner-01',
      }),
      repository.getFullPostContent({
        postId: 'cml-p02-train-test-metrics',
        uid: 'learner-01',
      }),
    ]);

    expect(problemPost.data).toMatchObject({
      id: 'cml-p01-problem-data-types',
      moduleId: 'cml-m01-foundations',
      postQuizId: 'quiz-post-cml-p01',
      title: {
        en: 'Frame a learning problem before choosing an algorithm',
        vi: 'Đặt khung bài toán học trước khi chọn thuật toán',
      },
    });
    expect(problemPost.data.blocks).toHaveLength(10);
    expect(problemPost.data.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p01-problem-data-types-example',
        type: 'example',
      }),
    );

    expect(evaluationPost.data).toMatchObject({
      id: 'cml-p02-train-test-metrics',
      moduleId: 'cml-m01-foundations',
      postQuizId: 'quiz-post-cml-p02',
      title: {
        en: 'Test a claim with held-out evidence',
        vi: 'Kiểm tra khẳng định bằng bằng chứng giữ lại',
      },
    });
    expect(evaluationPost.data.blocks).toHaveLength(10);
    expect(evaluationPost.data.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p02-train-test-metrics-example',
        type: 'example',
      }),
    );
  });

  it('returns the two source-backed regression lessons and fixed calibration demo only after access is granted', async () => {
    const repository = createLearningContentRepository({
      accessReader: createAccessReader(() => true),
    });

    const [linearPost, polynomialPost, demo] = await Promise.all([
      repository.getFullPostContent({
        postId: 'cml-p03-linear-regression',
        uid: 'learner-01',
      }),
      repository.getFullPostContent({
        postId: 'cml-p04-polynomial-regression',
        uid: 'learner-01',
      }),
      repository.getDemoContent({
        demoId: 'demo-linear-calibration',
        uid: 'learner-01',
      }),
    ]);

    expect(linearPost.data).toMatchObject({
      id: 'cml-p03-linear-regression',
      moduleId: 'cml-m02-linear-polynomial',
      postQuizId: 'quiz-post-cml-p03',
      title: {
        en: 'Read a linear baseline through residual evidence',
        vi: 'Đọc baseline tuyến tính qua bằng chứng phần dư',
      },
    });
    expect(linearPost.data.blocks).toHaveLength(10);
    expect(linearPost.data.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p03-linear-regression-example',
        type: 'example',
      }),
    );

    expect(polynomialPost.data).toMatchObject({
      id: 'cml-p04-polynomial-regression',
      moduleId: 'cml-m02-linear-polynomial',
      postQuizId: 'quiz-post-cml-p04',
      title: {
        en: 'Test whether polynomial curvature earns its complexity',
        vi: 'Kiểm tra độ cong đa thức có xứng đáng độ phức tạp',
      },
    });
    expect(polynomialPost.data.blocks).toHaveLength(10);
    expect(polynomialPost.data.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p04-polynomial-regression-example',
        type: 'example',
      }),
    );

    expect(demo.data).toMatchObject({
      demoId: 'demo-linear-calibration',
      fixedRun: {
        datasetVersionId: 'dataset-demo-linear-calibration-v1',
        parameterValues: [
          { id: 'slope', value: 2 },
          { id: 'intercept', value: 1 },
        ],
        rows: [
          { input: [0], predictedOutput: 1, targetOutput: 1 },
          { input: [1], predictedOutput: 3, targetOutput: 3 },
          { input: [2], predictedOutput: 5, targetOutput: 5 },
          { input: [3], predictedOutput: 7, targetOutput: 8 },
        ],
      },
      requiredStepIds: ['linear-problem', 'linear-data', 'linear-line', 'linear-residual'],
    });
  });

  it('returns the source-backed regularization lesson and fixed coefficient comparison only after access is granted', async () => {
    const repository = createLearningContentRepository({
      accessReader: createAccessReader(() => true),
    });

    const [post, demo] = await Promise.all([
      repository.getFullPostContent({
        postId: 'cml-p05-regularization-ridge-lasso',
        uid: 'learner-01',
      }),
      repository.getDemoContent({
        demoId: 'demo-regularization-noisy-signal',
        uid: 'learner-01',
      }),
    ]);

    expect(post.data).toMatchObject({
      id: 'cml-p05-regularization-ridge-lasso',
      moduleId: 'cml-m03-ridge-lasso',
      postQuizId: 'quiz-post-cml-p05',
      title: {
        en: 'Choose shrinkage and sparsity from evidence',
        vi: 'Chọn shrinkage và tính thưa từ bằng chứng',
      },
    });
    expect(post.data.blocks).toHaveLength(10);
    expect(post.data.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p05-regularization-ridge-lasso-example',
        type: 'example',
      }),
    );

    expect(demo.data).toMatchObject({
      demoId: 'demo-regularization-noisy-signal',
      fixedRun: {
        datasetVersionId: 'dataset-demo-regularization-noisy-signal-v1',
        parameterValues: [
          { id: 'ridge-alpha', value: 1 },
          { id: 'ridge-feature-a', value: 0.45 },
          { id: 'ridge-feature-b', value: 0.45 },
          { id: 'lasso-alpha', value: 1 },
          { id: 'lasso-feature-a', value: 0.9 },
          { id: 'lasso-feature-b', value: 0 },
        ],
      },
      requiredStepIds: [
        'regularization-problem',
        'regularization-data',
        'ridge-shrinkage',
        'lasso-sparsity',
      ],
    });
  });

  it('returns the two source-backed classification lessons and fixed sigmoid demo only after access is granted', async () => {
    const repository = createLearningContentRepository({
      accessReader: createAccessReader(() => true),
    });

    const [logisticPost, metricsPost, demo] = await Promise.all([
      repository.getFullPostContent({
        postId: 'cml-p06-logistic-regression',
        uid: 'learner-01',
      }),
      repository.getFullPostContent({
        postId: 'cml-p07-classification-metrics',
        uid: 'learner-01',
      }),
      repository.getDemoContent({
        demoId: 'demo-logistic-admission',
        uid: 'learner-01',
      }),
    ]);

    expect(logisticPost.data).toMatchObject({
      id: 'cml-p06-logistic-regression',
      moduleId: 'cml-m04-logistic-classification',
      postQuizId: 'quiz-post-cml-p06',
      title: {
        en: 'Read a logistic score before its class rule',
        vi: 'Đọc điểm logistic trước quy tắc lớp',
      },
    });
    expect(logisticPost.data.blocks).toHaveLength(10);
    expect(logisticPost.data.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p06-logistic-regression-example',
        type: 'example',
      }),
    );

    expect(metricsPost.data).toMatchObject({
      id: 'cml-p07-classification-metrics',
      moduleId: 'cml-m04-logistic-classification',
      postQuizId: 'quiz-post-cml-p07',
      title: {
        en: 'Choose a classification metric from the error trade-off',
        vi: 'Chọn metric phân loại từ đánh đổi lỗi',
      },
    });
    expect(metricsPost.data.blocks).toHaveLength(10);
    expect(metricsPost.data.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p07-classification-metrics-example',
        type: 'example',
      }),
    );

    expect(demo.data).toMatchObject({
      demoId: 'demo-logistic-admission',
      fixedRun: {
        datasetVersionId: 'dataset-demo-logistic-admission-v1',
        parameterValues: [
          { id: 'sigmoid-midpoint', value: 2 },
          { id: 'classification-threshold', value: 0.5 },
        ],
        rows: [
          { input: [1], predictedOutput: 0.27, targetOutput: 0 },
          { input: [2], predictedOutput: 0.5, targetOutput: 0 },
          { input: [3], predictedOutput: 0.73, targetOutput: 1 },
          { input: [4], predictedOutput: 0.88, targetOutput: 1 },
        ],
      },
      requiredStepIds: [
        'logistic-problem',
        'logistic-scores',
        'logistic-probability',
        'logistic-threshold',
      ],
    });
  });

  it('returns the fixed MLP checkerboard and its distinct completion path only after demo access is granted', async () => {
    const repository = createLearningContentRepository({
      accessReader: createAccessReader(() => true),
    });

    const demo = await repository.getDemoContent({
      demoId: 'demo-mlp-checkerboard',
      uid: 'learner-01',
    });

    expect(demo.data).toMatchObject({
      demoId: 'demo-mlp-checkerboard',
      fixedRun: {
        caption: {
          en: 'Fixed checkerboard inputs and outputs',
          vi: 'Đầu vào và đầu ra bàn cờ cố định',
        },
        datasetVersionId: 'dataset-demo-mlp-checkerboard-v1',
        parameterValues: [],
        rows: [
          { input: [0, 0], predictedOutput: 0, targetOutput: 0 },
          { input: [0, 1], predictedOutput: 1, targetOutput: 1 },
          { input: [1, 0], predictedOutput: 1, targetOutput: 1 },
          { input: [1, 1], predictedOutput: 0, targetOutput: 0 },
        ],
      },
      requiredStepIds: [
        'checkerboard-problem',
        'checkerboard-data',
        'checkerboard-hidden-activation',
        'checkerboard-output',
      ],
    });
  });
});
