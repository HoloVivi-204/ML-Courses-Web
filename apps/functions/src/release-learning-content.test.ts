import { describe, expect, it, vi } from 'vitest';

import { getFixedDemo } from './release-demo-content.js';
import { getReadablePost } from './release-learning-content.js';
import { getReleaseLearningCatalog } from './release-learning-catalog.js';
import { getQuizManifest, getReleaseQuizManifests } from './quiz-manifest.js';

describe('Release 1 protected learning content', () => {
  it('serves every learning unit from local data when source network access is unavailable', () => {
    let fetchCalls = 0;
    vi.stubGlobal('fetch', () => {
      fetchCalls += 1;
      throw new Error('Source network access is unavailable.');
    });

    try {
      const catalog = getReleaseLearningCatalog();
      const servedPosts = catalog.courses.flatMap((course) =>
        course.modules.flatMap((module) =>
          module.posts.map((post) => {
            expect(getReadablePost(course.courseId, post.postId, true)).toBeDefined();
            expect(getQuizManifest(post.postQuizId)).toBeDefined();
            return post.postId;
          }),
        ),
      );
      const servedDemos = catalog.courses.flatMap((course) =>
        course.modules.flatMap((module) => {
          expect(getQuizManifest(module.moduleQuizId)).toBeDefined();

          if (!module.demoId) {
            return [];
          }

          expect(getFixedDemo(module.demoId)).toBeDefined();
          return [module.demoId];
        }),
      );

      expect(servedPosts).toHaveLength(18);
      expect(servedDemos).toHaveLength(10);
      expect(fetchCalls).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('provides draft vi/en full post content for every locked catalog post', () => {
    const catalog = getReleaseLearningCatalog();
    const posts = catalog.courses.flatMap((course) =>
      course.modules.flatMap((module) =>
        module.posts.map((releasePost) => {
          const post = getReadablePost(course.courseId, releasePost.postId, true);

          expect(post).toMatchObject({
            accessLevel: 'full',
            courseId: course.courseId,
            id: releasePost.postId,
            moduleId: module.moduleId,
            sourceReviewStatus: 'pending-operator-review',
          });
          return post!;
        }),
      ),
    );

    expect(posts).toHaveLength(18);
    expect(new Set(posts.map((post) => post.taskFingerprint)).size).toBe(18);

    for (const post of posts) {
      expect(post.title.en.trim()).not.toHaveLength(0);
      expect(post.title.vi.trim()).not.toHaveLength(0);
      expect(post.learningObjective.en.trim()).not.toHaveLength(0);
      expect(post.learningObjective.vi.trim()).not.toHaveLength(0);
      expect(post.provenance).toMatchObject({
        candidateSourceIds: expect.any(Array),
        contentReviewStatus: 'pending-operator-review',
        externalEvidenceStatus: 'not-collected',
        importStatus: 'draft-only',
      });
      expect(post.provenance.candidateSourceIds.length).toBeGreaterThan(0);
      expect(post.blocks.length).toBeGreaterThanOrEqual(6);
      expect(post.blocks.length).toBeLessThanOrEqual(12);
      expect(new Set(post.blocks.map((block) => block.id)).size).toBe(post.blocks.length);
      expect(post.blocks).toContainEqual(
        expect.objectContaining({
          activityId: `act-${post.id}-example`,
          type: 'example',
        }),
      );
    }
  });

  it('keeps learner-facing source copy free of internal review state', () => {
    const catalog = getReleaseLearningCatalog();
    const sourceCopy = catalog.courses.flatMap((course) =>
      course.modules.flatMap((module) =>
        module.posts.flatMap((releasePost) => {
          const post = getReadablePost(course.courseId, releasePost.postId, true)!;

          return post.blocks.flatMap((block) => {
            if (block.type !== 'source-list') {
              return [];
            }

            const sourceList = block as typeof block & {
              locales: { en: { intro: string }; vi: { intro: string } };
              resources: ReadonlyArray<{ attribution: { en: string; vi: string } }>;
            };

            return [
              sourceList.locales.en.intro,
              sourceList.locales.vi.intro,
              ...sourceList.resources.flatMap((resource) => [
                resource.attribution.en,
                resource.attribution.vi,
              ]),
            ];
          });
        }),
      ),
    );

    expect(sourceCopy.join(' ')).not.toMatch(
      /source review|review nguồn|pending|đang chờ|pinned local snapshot|snapshot cục bộ/i,
    );
  });

  it('keeps ten localized fixed demos server-side with unique task fingerprints', () => {
    const catalog = getReleaseLearningCatalog();
    const demos = catalog.courses.flatMap((course) =>
      course.modules
        .map((module) => module.demoId)
        .filter((demoId): demoId is string => demoId !== null)
        .map((demoId) => getFixedDemo(demoId)!),
    );

    expect(demos).toHaveLength(10);
    expect(new Set(demos.map((demo) => demo.taskFingerprint)).size).toBe(10);

    for (const demo of demos) {
      expect(demo.learningObjective?.en.trim()).not.toHaveLength(0);
      expect(demo.learningObjective?.vi.trim()).not.toHaveLength(0);
      expect(demo.draftProvenance).toMatchObject({
        candidateSourceIds: expect.any(Array),
        contentReviewStatus: 'pending-operator-review',
        externalEvidenceStatus: 'not-collected',
        importStatus: 'draft-only',
      });
      expect(demo.steps).toHaveLength(4);
      expect(demo.visualization.boundary).not.toHaveLength(0);
      expect(demo.visualization.points).not.toHaveLength(0);

      for (const step of demo.steps) {
        expect(step.title.en.trim()).not.toHaveLength(0);
        expect(step.title.vi.trim()).not.toHaveLength(0);
        expect(step.narration.en.trim()).not.toHaveLength(0);
        expect(step.narration.vi.trim()).not.toHaveLength(0);
        expect(step.textAlternative.en.trim()).not.toHaveLength(0);
        expect(step.textAlternative.vi.trim()).not.toHaveLength(0);
      }
    }
  });

  it('attaches deterministic proof and semantic fingerprints to every baseline demo and quiz', () => {
    const catalog = getReleaseLearningCatalog();
    const posts = catalog.courses.flatMap((course) =>
      course.modules.flatMap((module) =>
        module.posts.map((post) => getReadablePost(course.courseId, post.postId, true)!),
      ),
    );
    const demos = catalog.courses.flatMap((course) =>
      course.modules
        .map((module) => module.demoId)
        .filter((demoId): demoId is string => demoId !== null)
        .map((demoId) => getFixedDemo(demoId)!),
    );
    const quizzes = getReleaseQuizManifests();
    const questions = quizzes.flatMap((quiz) => quiz.questions);

    expect(posts).toHaveLength(18);
    expect(demos).toHaveLength(10);
    expect(quizzes).toHaveLength(30);
    expect(questions).toHaveLength(126);

    expect(posts.every((post) => /^[a-f0-9]{64}$/.test(post.taskFingerprint))).toBe(true);

    for (const demo of demos) {
      const proof = demo as typeof demo & {
        adapterVersion?: unknown;
        resultHash?: unknown;
        sourceIds?: unknown;
        visualFixture?: { hash?: unknown; totalDurationMs?: unknown } | undefined;
      };

      expect(proof.adapterVersion).toMatch(/^[a-z0-9-]+-v\d+$/);
      expect(proof.resultHash).toMatch(/^[a-f0-9]{64}$/);
      expect(proof.sourceIds).toEqual(expect.arrayContaining([expect.any(String)]));
      expect(proof.visualFixture?.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(proof.visualFixture?.totalDurationMs).toEqual(expect.any(Number));
      expect(demo.taskFingerprint).toMatch(/^[a-f0-9]{64}$/);
      expect(
        demo.steps.every(
          (step) =>
            typeof (step as typeof step & { durationMs?: unknown }).durationMs === 'number' &&
            (step as typeof step & { durationMs: number }).durationMs > 0,
        ),
      ).toBe(true);
    }

    const manifestFingerprints = quizzes.map(
      (quiz) => (quiz as typeof quiz & { taskFingerprint?: unknown }).taskFingerprint,
    );
    const questionFingerprints = questions.map(
      (question) => (question as typeof question & { taskFingerprint?: unknown }).taskFingerprint,
    );

    expect(
      manifestFingerprints.every((fingerprint) => /^[a-f0-9]{64}$/.test(String(fingerprint))),
    ).toBe(true);
    expect(
      questionFingerprints.every((fingerprint) => /^[a-f0-9]{64}$/.test(String(fingerprint))),
    ).toBe(true);
    expect(new Set(manifestFingerprints).size).toBe(30);
    expect(new Set(questionFingerprints).size).toBe(126);
  });

  it('pins the dl-m01 learning batch to the source snapshots used for its prose, demo, and quizzes', () => {
    const post = getReadablePost('course-deep-learning-basic', 'dl-p01-neuron-perceptron', true)!;
    const demo = getFixedDemo('demo-perceptron-and-gate')!;
    const postQuiz = getQuizManifest('quiz-post-dl-p01');
    const moduleQuiz = getQuizManifest('quiz-module-dl-m01');
    const expectedSourceSnapshots = [
      {
        contentSnapshotHash: '2423708024f4cb064ec3794cfdeba06cf2c62dfc01bba10d7f0ca96a80efea80',
        sourceId: 'microsoft-ai-for-beginners',
      },
      {
        contentSnapshotHash: '503f5fe87c26ab3c93d68142343a51feb72a0e743f293f0cc1090b34211bedc1',
        sourceId: 'd2l-vi',
      },
    ];
    const expectedSourceIds = expectedSourceSnapshots.map((source) => source.sourceId);

    for (const provenance of [
      post.provenance,
      demo.draftProvenance,
      postQuiz.draftProvenance,
      moduleQuiz.draftProvenance,
    ]) {
      expect(provenance).toMatchObject({
        contentReviewStatus: 'pending-operator-review',
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: expect.arrayContaining(
            expectedSourceSnapshots.map((source) => expect.objectContaining(source)),
          ),
        },
      });
      expect(provenance?.candidateSourceIds).toEqual(expectedSourceIds);
    }

    expect(post.blocks).not.toContainEqual(
      expect.objectContaining({ id: 'stable-content-access' }),
    );
    expect(post.blocks.every((block) => block.sourceIds.length > 0)).toBe(true);
    expect(post.blocks).toContainEqual(
      expect.objectContaining({
        sourceIds: expect.arrayContaining(['d2l-vi', 'microsoft-ai-for-beginners']),
        type: 'source-list',
      }),
    );

    expect(demo.visualization.points).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ classification: 'negative', label: '0,0' }),
        expect.objectContaining({ classification: 'negative', label: '0,1' }),
        expect.objectContaining({ classification: 'negative', label: '1,0' }),
        expect.objectContaining({ classification: 'positive', label: '1,1' }),
      ]),
    );
    expect(demo.fixedRun).toMatchObject({
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

    const tracedSourceIds = new Set(expectedSourceIds);

    for (const quiz of [postQuiz, moduleQuiz]) {
      expect(quiz.questions.every((question) => question.sourceIds?.length)).toBe(true);
      expect(
        quiz.questions.every((question) =>
          question.sourceIds?.every((sourceId) => tracedSourceIds.has(sourceId)),
        ),
      ).toBe(true);
    }
  });

  it('pins the dl-m02 MLP batch to the D2L snapshot used for its prose, checkerboard demo, and quizzes', () => {
    const post = getReadablePost(
      'course-deep-learning-basic',
      'dl-p02-mlp-forward-activation',
      true,
    )!;
    const demo = getFixedDemo('demo-mlp-checkerboard')!;
    const postQuiz = getQuizManifest('quiz-post-dl-p02');
    const moduleQuiz = getQuizManifest('quiz-module-dl-m02');
    const expectedSourceSnapshot = {
      contentSnapshotHash: '503f5fe87c26ab3c93d68142343a51feb72a0e743f293f0cc1090b34211bedc1',
      sourceId: 'd2l-vi',
    };

    for (const provenance of [
      post.provenance,
      demo.draftProvenance,
      postQuiz.draftProvenance,
      moduleQuiz.draftProvenance,
    ]) {
      expect(provenance).toMatchObject({
        candidateSourceIds: ['d2l-vi'],
        contentReviewStatus: 'pending-operator-review',
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: [expect.objectContaining(expectedSourceSnapshot)],
        },
      });
    }

    expect(post.blocks).toHaveLength(12);
    expect(post.blocks.every((block) => block.sourceIds.length > 0)).toBe(true);
    expect(post.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-dl-p02-mlp-forward-activation-example',
        type: 'example',
      }),
    );
    expect(post.blocks).toContainEqual(
      expect.objectContaining({
        sourceIds: ['d2l-vi'],
        type: 'source-list',
      }),
    );

    expect(demo.fixedRun).toMatchObject({
      datasetVersionId: 'dataset-demo-mlp-checkerboard-v1',
      rows: [
        { input: [0, 0], predictedOutput: 0, targetOutput: 0 },
        { input: [0, 1], predictedOutput: 1, targetOutput: 1 },
        { input: [1, 0], predictedOutput: 1, targetOutput: 1 },
        { input: [1, 1], predictedOutput: 0, targetOutput: 0 },
      ],
    });
    expect(demo.visualization.points).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ classification: 'negative', label: '0,0' }),
        expect.objectContaining({ classification: 'positive', label: '0,1' }),
        expect.objectContaining({ classification: 'positive', label: '1,0' }),
        expect.objectContaining({ classification: 'negative', label: '1,1' }),
      ]),
    );

    for (const quiz of [postQuiz, moduleQuiz]) {
      expect(quiz.questions.every((question) => question.sourceIds?.length)).toBe(true);
      expect(
        quiz.questions.every((question) =>
          question.sourceIds?.every((sourceId) => sourceId === 'd2l-vi'),
        ),
      ).toBe(true);
    }
  });

  it('pins the dl-m03 training batch to the D2L backpropagation and generalisation snapshots used for its prose and quizzes', () => {
    const post = getReadablePost(
      'course-deep-learning-basic',
      'dl-p03-backprop-overfitting',
      true,
    )!;
    const postQuiz = getQuizManifest('quiz-post-dl-p03');
    const moduleQuiz = getQuizManifest('quiz-module-dl-m03');
    const expectedSourceSnapshot = {
      contentSnapshotHash: '503f5fe87c26ab3c93d68142343a51feb72a0e743f293f0cc1090b34211bedc1',
      contentUrls: expect.arrayContaining([
        'https://raw.githubusercontent.com/d2l-ai/d2l-vi/main/chapter_multilayer-perceptrons/backprop.md',
        'https://raw.githubusercontent.com/d2l-ai/d2l-vi/main/chapter_multilayer-perceptrons/underfit-overfit.md',
      ]),
      sourceId: 'd2l-vi',
    };

    for (const provenance of [
      post.provenance,
      postQuiz.draftProvenance,
      moduleQuiz.draftProvenance,
    ]) {
      expect(provenance).toMatchObject({
        candidateSourceIds: ['d2l-vi'],
        contentReviewStatus: 'pending-operator-review',
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: [expect.objectContaining(expectedSourceSnapshot)],
        },
      });
    }

    expect(post.blocks).toHaveLength(12);
    expect(post.blocks.every((block) => block.sourceIds.length > 0)).toBe(true);
    expect(post.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-dl-p03-backprop-overfitting-example',
        type: 'example',
      }),
    );
    expect(post.blocks).toContainEqual(
      expect.objectContaining({ sourceIds: ['d2l-vi'], type: 'source-list' }),
    );

    for (const quiz of [postQuiz, moduleQuiz]) {
      expect(quiz.questions.every((question) => question.sourceIds?.length)).toBe(true);
      expect(
        quiz.questions.every((question) =>
          question.sourceIds?.every((sourceId) => sourceId === 'd2l-vi'),
        ),
      ).toBe(true);
    }
  });

  it('pins the classical M01 foundations batch to the Microsoft snapshot used for problem framing, evaluation, and quizzes', () => {
    const problemPost = getReadablePost('course-classical-ml', 'cml-p01-problem-data-types', true)!;
    const evaluationPost = getReadablePost(
      'course-classical-ml',
      'cml-p02-train-test-metrics',
      true,
    )!;
    const problemQuiz = getQuizManifest('quiz-post-cml-p01');
    const evaluationQuiz = getQuizManifest('quiz-post-cml-p02');
    const moduleQuiz = getQuizManifest('quiz-module-cml-m01');
    const expectedSourceSnapshot = {
      contentSnapshotHash: '797e080d50a3e4d2d6fc1ea3dae931a6f5544a336fc0faa357fe520fc7ef0a39',
      contentUrls: expect.arrayContaining([
        'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/4-Classification/1-Introduction/README.md',
        'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/4-Classification/2-Classifiers-1/README.md',
        'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/5-Clustering/1-Visualize/README.md',
      ]),
      sourceId: 'microsoft-ml-for-beginners',
    };

    for (const provenance of [
      problemPost.provenance,
      evaluationPost.provenance,
      problemQuiz.draftProvenance,
      evaluationQuiz.draftProvenance,
      moduleQuiz.draftProvenance,
    ]) {
      expect(provenance).toMatchObject({
        candidateSourceIds: ['microsoft-ml-for-beginners'],
        contentReviewStatus: 'pending-operator-review',
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: [expect.objectContaining(expectedSourceSnapshot)],
        },
      });
    }

    for (const post of [problemPost, evaluationPost]) {
      expect(post.blocks).toHaveLength(10);
      expect(post.blocks.every((block) => block.sourceIds.length > 0)).toBe(true);
      expect(post.blocks).toContainEqual(
        expect.objectContaining({ sourceIds: ['microsoft-ml-for-beginners'], type: 'source-list' }),
      );
    }

    expect(problemPost.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p01-problem-data-types-example',
        type: 'example',
      }),
    );
    expect(evaluationPost.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p02-train-test-metrics-example',
        type: 'example',
      }),
    );

    for (const quiz of [problemQuiz, evaluationQuiz, moduleQuiz]) {
      expect(quiz.questions.every((question) => question.sourceIds?.length)).toBe(true);
      expect(
        quiz.questions.every((question) =>
          question.sourceIds?.every((sourceId) => sourceId === 'microsoft-ml-for-beginners'),
        ),
      ).toBe(true);
    }
  });

  it('pins the Classical ML M02 regression batch to the Microsoft snapshot used for prose, fixed calibration, and quizzes', () => {
    const linearPost = getReadablePost('course-classical-ml', 'cml-p03-linear-regression', true)!;
    const polynomialPost = getReadablePost(
      'course-classical-ml',
      'cml-p04-polynomial-regression',
      true,
    )!;
    const demo = getFixedDemo('demo-linear-calibration')!;
    const linearQuiz = getQuizManifest('quiz-post-cml-p03');
    const polynomialQuiz = getQuizManifest('quiz-post-cml-p04');
    const moduleQuiz = getQuizManifest('quiz-module-cml-m02');
    const expectedSourceSnapshot = {
      contentSnapshotHash: '797e080d50a3e4d2d6fc1ea3dae931a6f5544a336fc0faa357fe520fc7ef0a39',
      contentUrls: [
        'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/2-Regression/3-Linear/README.md',
      ],
      sourceId: 'microsoft-ml-for-beginners',
    };

    for (const provenance of [
      linearPost.provenance,
      polynomialPost.provenance,
      demo.draftProvenance,
      linearQuiz.draftProvenance,
      polynomialQuiz.draftProvenance,
      moduleQuiz.draftProvenance,
    ]) {
      expect(provenance).toMatchObject({
        candidateSourceIds: ['microsoft-ml-for-beginners'],
        contentReviewStatus: 'pending-operator-review',
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: [expect.objectContaining(expectedSourceSnapshot)],
        },
      });
    }

    for (const post of [linearPost, polynomialPost]) {
      expect(post.blocks).toHaveLength(10);
      expect(post.blocks.every((block) => block.sourceIds.length > 0)).toBe(true);
      expect(post.blocks).toContainEqual(
        expect.objectContaining({ sourceIds: ['microsoft-ml-for-beginners'], type: 'source-list' }),
      );
    }

    expect(linearPost.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p03-linear-regression-example',
        type: 'example',
      }),
    );
    expect(polynomialPost.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p04-polynomial-regression-example',
        type: 'example',
      }),
    );
    expect(demo).toMatchObject({
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

    for (const quiz of [linearQuiz, polynomialQuiz, moduleQuiz]) {
      expect(quiz.questions.every((question) => question.sourceIds?.length)).toBe(true);
      expect(
        quiz.questions.every((question) =>
          question.sourceIds?.every((sourceId) => sourceId === 'microsoft-ml-for-beginners'),
        ),
      ).toBe(true);
    }
  });

  it('pins the Classical ML M03 regularization batch to the scikit-learn snapshot used for prose, fixed comparison, and quizzes', () => {
    const post = getReadablePost(
      'course-classical-ml',
      'cml-p05-regularization-ridge-lasso',
      true,
    )!;
    const demo = getFixedDemo('demo-regularization-noisy-signal')!;
    const postQuiz = getQuizManifest('quiz-post-cml-p05');
    const moduleQuiz = getQuizManifest('quiz-module-cml-m03');
    const expectedSourceSnapshot = {
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/linear_model.html'],
      sourceId: 'sklearn-docs',
    };

    for (const provenance of [
      post.provenance,
      demo.draftProvenance,
      postQuiz.draftProvenance,
      moduleQuiz.draftProvenance,
    ]) {
      expect(provenance).toMatchObject({
        candidateSourceIds: ['sklearn-docs'],
        contentReviewStatus: 'pending-operator-review',
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: [expect.objectContaining(expectedSourceSnapshot)],
        },
      });
    }

    expect(post.blocks).toHaveLength(10);
    expect(post.blocks.every((block) => block.sourceIds.length > 0)).toBe(true);
    expect(post.blocks).toContainEqual(
      expect.objectContaining({ sourceIds: ['sklearn-docs'], type: 'source-list' }),
    );
    expect(post.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p05-regularization-ridge-lasso-example',
        type: 'example',
      }),
    );

    expect(demo).toMatchObject({
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
        rows: [
          { input: [1, 1], predictedOutput: 0.9, targetOutput: 1 },
          { input: [2, 2], predictedOutput: 1.8, targetOutput: 2 },
          { input: [3, 3], predictedOutput: 2.7, targetOutput: 4 },
          { input: [4, 4], predictedOutput: 3.6, targetOutput: 4 },
        ],
      },
      requiredStepIds: [
        'regularization-problem',
        'regularization-data',
        'ridge-shrinkage',
        'lasso-sparsity',
      ],
    });

    for (const quiz of [postQuiz, moduleQuiz]) {
      expect(quiz.questions.every((question) => question.sourceIds?.length)).toBe(true);
      expect(
        quiz.questions.every((question) =>
          question.sourceIds?.every((sourceId) => sourceId === 'sklearn-docs'),
        ),
      ).toBe(true);
    }
  });

  it('pins the Classical ML M04 classification batch to the Microsoft and Google snapshots used for its distinct lessons, fixed probability reading, and quizzes', () => {
    const logisticPost = getReadablePost(
      'course-classical-ml',
      'cml-p06-logistic-regression',
      true,
    )!;
    const metricsPost = getReadablePost(
      'course-classical-ml',
      'cml-p07-classification-metrics',
      true,
    )!;
    const demo = getFixedDemo('demo-logistic-admission')!;
    const logisticQuiz = getQuizManifest('quiz-post-cml-p06');
    const metricsQuiz = getQuizManifest('quiz-post-cml-p07');
    const moduleQuiz = getQuizManifest('quiz-module-cml-m04');
    const microsoftSourceSnapshot = {
      contentSnapshotHash: '797e080d50a3e4d2d6fc1ea3dae931a6f5544a336fc0faa357fe520fc7ef0a39',
      contentUrls: [
        'https://raw.githubusercontent.com/microsoft/ML-For-Beginners/main/2-Regression/4-Logistic/README.md',
      ],
      sourceId: 'microsoft-ml-for-beginners',
    };
    const googleSourceSnapshot = {
      contentSnapshotHash: 'be3f8c79a7ba8e6e03f326de4ab92dc966792ae91cac36c9225348d9c0cdf60b',
      contentUrls: ['https://developers.google.com/machine-learning/crash-course/classification'],
      sourceId: 'google-ml-crash-course',
    };

    for (const provenance of [
      logisticPost.provenance,
      demo.draftProvenance,
      logisticQuiz.draftProvenance,
    ]) {
      expect(provenance).toMatchObject({
        candidateSourceIds: ['microsoft-ml-for-beginners'],
        contentReviewStatus: 'pending-operator-review',
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: [expect.objectContaining(microsoftSourceSnapshot)],
        },
      });
    }

    for (const provenance of [metricsPost.provenance, metricsQuiz.draftProvenance]) {
      expect(provenance).toMatchObject({
        candidateSourceIds: ['google-ml-crash-course'],
        contentReviewStatus: 'pending-operator-review',
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: [expect.objectContaining(googleSourceSnapshot)],
        },
      });
    }

    expect(moduleQuiz.draftProvenance).toMatchObject({
      candidateSourceIds: ['microsoft-ml-for-beginners', 'google-ml-crash-course'],
      contentReviewStatus: 'pending-operator-review',
      sourceTrace: {
        kind: 'snapshot-pinned',
        sourceSnapshots: [
          expect.objectContaining(microsoftSourceSnapshot),
          expect.objectContaining(googleSourceSnapshot),
        ],
      },
    });

    for (const post of [logisticPost, metricsPost]) {
      expect(post.blocks).toHaveLength(10);
      expect(post.blocks.every((block) => block.sourceIds.length > 0)).toBe(true);
    }
    expect(logisticPost.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p06-logistic-regression-example',
        sourceIds: ['microsoft-ml-for-beginners'],
        type: 'example',
      }),
    );
    expect(metricsPost.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p07-classification-metrics-example',
        sourceIds: ['google-ml-crash-course'],
        type: 'example',
      }),
    );

    expect(demo).toMatchObject({
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

    expect(
      logisticQuiz.questions.every((question) =>
        question.sourceIds?.every((sourceId) => sourceId === 'microsoft-ml-for-beginners'),
      ),
    ).toBe(true);
    expect(
      metricsQuiz.questions.every((question) =>
        question.sourceIds?.every((sourceId) => sourceId === 'google-ml-crash-course'),
      ),
    ).toBe(true);
    expect(moduleQuiz.questions.every((question) => question.sourceIds?.length)).toBe(true);
    expect(
      moduleQuiz.questions.every((question) =>
        question.sourceIds?.every(
          (sourceId) =>
            sourceId === 'microsoft-ml-for-beginners' || sourceId === 'google-ml-crash-course',
        ),
      ),
    ).toBe(true);
  });

  it('pins the Classical ML M05 KNN and Naive Bayes batch to the distinct scikit-learn documents used for its lessons, fixed neighbour vote, and quizzes', () => {
    const knnPost = getReadablePost('course-classical-ml', 'cml-p08-knn', true)!;
    const naiveBayesPost = getReadablePost('course-classical-ml', 'cml-p09-naive-bayes', true)!;
    const demo = getFixedDemo('demo-neighbor-flower')!;
    const knnQuiz = getQuizManifest('quiz-post-cml-p08');
    const naiveBayesQuiz = getQuizManifest('quiz-post-cml-p09');
    const moduleQuiz = getQuizManifest('quiz-module-cml-m05');
    const knnSourceSnapshot = {
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/neighbors.html'],
      sourceId: 'sklearn-docs',
    };
    const naiveBayesSourceSnapshot = {
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/naive_bayes.html'],
      sourceId: 'sklearn-docs',
    };

    for (const provenance of [knnPost.provenance, demo.draftProvenance, knnQuiz.draftProvenance]) {
      expect(provenance).toMatchObject({
        candidateSourceIds: ['sklearn-docs'],
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: [expect.objectContaining(knnSourceSnapshot)],
        },
      });
    }
    for (const provenance of [naiveBayesPost.provenance, naiveBayesQuiz.draftProvenance]) {
      expect(provenance).toMatchObject({
        candidateSourceIds: ['sklearn-docs'],
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: [expect.objectContaining(naiveBayesSourceSnapshot)],
        },
      });
    }
    expect(moduleQuiz.draftProvenance).toMatchObject({
      candidateSourceIds: ['sklearn-docs'],
      sourceTrace: {
        kind: 'snapshot-pinned',
        sourceSnapshots: [
          expect.objectContaining(knnSourceSnapshot),
          expect.objectContaining(naiveBayesSourceSnapshot),
        ],
      },
    });

    for (const post of [knnPost, naiveBayesPost]) {
      expect(post.blocks).toHaveLength(10);
      expect(post.blocks.every((block) => block.sourceIds.length > 0)).toBe(true);
    }
    expect(knnPost.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p08-knn-example',
        sourceIds: ['sklearn-docs'],
        type: 'example',
      }),
    );
    expect(naiveBayesPost.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p09-naive-bayes-example',
        sourceIds: ['sklearn-docs'],
        type: 'example',
      }),
    );

    expect(demo).toMatchObject({
      fixedRun: {
        datasetVersionId: 'dataset-demo-neighbor-flower-v1',
        parameterValues: [{ id: 'k', value: 3 }],
        rows: [
          { input: [0, 0], predictedOutput: 0, targetOutput: 0 },
          { input: [0, 1], predictedOutput: 0, targetOutput: 0 },
          { input: [1, 0], predictedOutput: 0, targetOutput: 0 },
          { input: [2, 2], predictedOutput: 1, targetOutput: 1 },
        ],
      },
      requiredStepIds: ['knn-problem', 'knn-reference-points', 'knn-distance', 'knn-vote'],
    });

    for (const quiz of [knnQuiz, naiveBayesQuiz, moduleQuiz]) {
      expect(quiz.questions.every((question) => question.sourceIds?.length)).toBe(true);
      expect(
        quiz.questions.every((question) =>
          question.sourceIds?.every((sourceId) => sourceId === 'sklearn-docs'),
        ),
      ).toBe(true);
    }
  });

  it('pins the Classical ML M06 decision-tree and random-forest batch to the distinct scikit-learn documents used for its lessons, fixed forest comparison, and quizzes', () => {
    const treePost = getReadablePost('course-classical-ml', 'cml-p10-decision-tree', true)!;
    const forestPost = getReadablePost('course-classical-ml', 'cml-p11-random-forest', true)!;
    const demo = getFixedDemo('demo-tree-forest-habitat')!;
    const treeQuiz = getQuizManifest('quiz-post-cml-p10');
    const forestQuiz = getQuizManifest('quiz-post-cml-p11');
    const moduleQuiz = getQuizManifest('quiz-module-cml-m06');
    const treeSourceSnapshot = {
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/tree.html'],
      sourceId: 'sklearn-docs',
    };
    const forestSourceSnapshot = {
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/ensemble.html'],
      sourceId: 'sklearn-docs',
    };

    for (const provenance of [treePost.provenance, treeQuiz.draftProvenance]) {
      expect(provenance).toMatchObject({
        candidateSourceIds: ['sklearn-docs'],
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: [expect.objectContaining(treeSourceSnapshot)],
        },
      });
    }
    for (const provenance of [forestPost.provenance, forestQuiz.draftProvenance]) {
      expect(provenance).toMatchObject({
        candidateSourceIds: ['sklearn-docs'],
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: [expect.objectContaining(forestSourceSnapshot)],
        },
      });
    }
    for (const provenance of [demo.draftProvenance, moduleQuiz.draftProvenance]) {
      expect(provenance).toMatchObject({
        candidateSourceIds: ['sklearn-docs'],
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: [
            expect.objectContaining(treeSourceSnapshot),
            expect.objectContaining(forestSourceSnapshot),
          ],
        },
      });
    }

    for (const post of [treePost, forestPost]) {
      expect(post.blocks).toHaveLength(10);
      expect(post.blocks.every((block) => block.sourceIds.length > 0)).toBe(true);
    }
    expect(treePost.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p10-decision-tree-example',
        sourceIds: ['sklearn-docs'],
        type: 'example',
      }),
    );
    expect(forestPost.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p11-random-forest-example',
        sourceIds: ['sklearn-docs'],
        type: 'example',
      }),
    );

    expect(demo).toMatchObject({
      fixedRun: {
        datasetVersionId: 'dataset-demo-tree-forest-habitat-v1',
        parameterValues: [{ id: 'treeCount', value: 3 }],
        rows: [
          { input: [0, 0], predictedOutput: 0, targetOutput: 0 },
          { input: [0, 1], predictedOutput: 0, targetOutput: 0 },
          { input: [1, 0], predictedOutput: 1, targetOutput: 1 },
          { input: [1, 1], predictedOutput: 1, targetOutput: 1 },
        ],
      },
      requiredStepIds: ['tree-problem', 'tree-split', 'forest-diversity', 'forest-aggregate'],
    });

    for (const quiz of [treeQuiz, forestQuiz, moduleQuiz]) {
      expect(quiz.questions.every((question) => question.sourceIds?.length)).toBe(true);
      expect(
        quiz.questions.every((question) =>
          question.sourceIds?.every((sourceId) => sourceId === 'sklearn-docs'),
        ),
      ).toBe(true);
    }
  });

  it('pins the Classical ML M07 SVM batch to the scikit-learn snapshot used for its lesson, fixed margin diagram, and quizzes', () => {
    const post = getReadablePost('course-classical-ml', 'cml-p12-svm', true)!;
    const demo = getFixedDemo('demo-svm-margin')!;
    const postQuiz = getQuizManifest('quiz-post-cml-p12');
    const moduleQuiz = getQuizManifest('quiz-module-cml-m07');
    const sourceSnapshot = {
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/svm.html'],
      sourceId: 'sklearn-docs',
    };

    for (const provenance of [
      post.provenance,
      demo.draftProvenance,
      postQuiz.draftProvenance,
      moduleQuiz.draftProvenance,
    ]) {
      expect(provenance).toMatchObject({
        candidateSourceIds: ['sklearn-docs'],
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: [expect.objectContaining(sourceSnapshot)],
        },
      });
    }

    expect(post.blocks).toHaveLength(10);
    expect(post.blocks.every((block) => block.sourceIds.length > 0)).toBe(true);
    expect(post.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p12-svm-example',
        sourceIds: ['sklearn-docs'],
        type: 'example',
      }),
    );
    expect(demo).toMatchObject({
      fixedRun: {
        datasetVersionId: 'dataset-demo-svm-margin-v1',
        parameterValues: [{ id: 'margin', value: 1 }],
        rows: [
          { input: [0, 0], predictedOutput: 0, targetOutput: 0 },
          { input: [0, 1], predictedOutput: 0, targetOutput: 0 },
          { input: [1, 0], predictedOutput: 1, targetOutput: 1 },
          { input: [1, 1], predictedOutput: 1, targetOutput: 1 },
        ],
      },
      requiredStepIds: ['svm-problem', 'svm-reference-points', 'svm-margin', 'svm-support-vectors'],
    });

    for (const quiz of [postQuiz, moduleQuiz]) {
      expect(quiz.questions.every((question) => question.sourceIds?.length)).toBe(true);
      expect(
        quiz.questions.every((question) =>
          question.sourceIds?.every((sourceId) => sourceId === 'sklearn-docs'),
        ),
      ).toBe(true);
    }
  });

  it('pins the Classical ML M08 clustering batch to the scikit-learn snapshot used for its two lessons, fixed cluster diagram, and quizzes', () => {
    const kmeansPost = getReadablePost('course-classical-ml', 'cml-p13-kmeans', true)!;
    const hierarchicalPost = getReadablePost(
      'course-classical-ml',
      'cml-p14-hierarchical-clustering',
      true,
    )!;
    const demo = getFixedDemo('demo-stellar-clusters')!;
    const kmeansQuiz = getQuizManifest('quiz-post-cml-p13');
    const hierarchicalQuiz = getQuizManifest('quiz-post-cml-p14');
    const moduleQuiz = getQuizManifest('quiz-module-cml-m08');
    const sourceSnapshot = {
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/clustering.html'],
      sourceId: 'sklearn-docs',
    };

    for (const provenance of [
      kmeansPost.provenance,
      hierarchicalPost.provenance,
      demo.draftProvenance,
      kmeansQuiz.draftProvenance,
      hierarchicalQuiz.draftProvenance,
      moduleQuiz.draftProvenance,
    ]) {
      expect(provenance).toMatchObject({
        candidateSourceIds: ['sklearn-docs'],
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: [expect.objectContaining(sourceSnapshot)],
        },
      });
    }

    for (const post of [kmeansPost, hierarchicalPost]) {
      expect(post.blocks).toHaveLength(10);
      expect(post.blocks.every((block) => block.sourceIds.length > 0)).toBe(true);
    }
    expect(kmeansPost.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p13-kmeans-example',
        sourceIds: ['sklearn-docs'],
        type: 'example',
      }),
    );
    expect(hierarchicalPost.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p14-hierarchical-clustering-example',
        sourceIds: ['sklearn-docs'],
        type: 'example',
      }),
    );
    expect(demo).toMatchObject({
      fixedRun: {
        datasetVersionId: 'dataset-demo-stellar-clusters-v1',
        parameterValues: [{ id: 'k', value: 2 }],
        rows: [
          { input: [0, 0], predictedOutput: 0, targetOutput: 0 },
          { input: [0, 1], predictedOutput: 0, targetOutput: 0 },
          { input: [1, 0], predictedOutput: 1, targetOutput: 1 },
          { input: [1, 1], predictedOutput: 1, targetOutput: 1 },
        ],
      },
      requiredStepIds: [
        'cluster-problem',
        'cluster-initial-centroids',
        'cluster-assign-update',
        'cluster-read-result',
      ],
    });

    for (const quiz of [kmeansQuiz, hierarchicalQuiz, moduleQuiz]) {
      expect(quiz.questions.every((question) => question.sourceIds?.length)).toBe(true);
      expect(
        quiz.questions.every((question) =>
          question.sourceIds?.every((sourceId) => sourceId === 'sklearn-docs'),
        ),
      ).toBe(true);
    }
  });

  it('pins the Classical ML M09 PCA batch to the scikit-learn snapshot used for its lesson, fixed projection diagram, and quizzes', () => {
    const post = getReadablePost('course-classical-ml', 'cml-p15-pca', true)!;
    const demo = getFixedDemo('demo-pca-sensor-compression')!;
    const postQuiz = getQuizManifest('quiz-post-cml-p15');
    const moduleQuiz = getQuizManifest('quiz-module-cml-m09');
    const sourceSnapshot = {
      contentSnapshotHash: '3029d964a0d9bf9d58bee03b7b648257d2dfb02f53402531f5f39a23aac69e60',
      contentUrls: ['https://scikit-learn.org/stable/modules/decomposition.html'],
      sourceId: 'sklearn-docs',
    };

    for (const provenance of [
      post.provenance,
      demo.draftProvenance,
      postQuiz.draftProvenance,
      moduleQuiz.draftProvenance,
    ]) {
      expect(provenance).toMatchObject({
        candidateSourceIds: ['sklearn-docs'],
        sourceTrace: {
          kind: 'snapshot-pinned',
          sourceSnapshots: [expect.objectContaining(sourceSnapshot)],
        },
      });
    }

    expect(post.blocks).toHaveLength(10);
    expect(post.blocks.every((block) => block.sourceIds.length > 0)).toBe(true);
    expect(post.blocks).toContainEqual(
      expect.objectContaining({
        activityId: 'act-cml-p15-pca-example',
        sourceIds: ['sklearn-docs'],
        type: 'example',
      }),
    );
    expect(demo).toMatchObject({
      fixedRun: {
        datasetVersionId: 'dataset-demo-pca-sensor-compression-v1',
        parameterValues: [{ id: 'components', value: 1 }],
        rows: [
          { input: [1, 1], predictedOutput: 0, targetOutput: 0 },
          { input: [2, 2], predictedOutput: 1, targetOutput: 1 },
          { input: [3, 3], predictedOutput: 2, targetOutput: 2 },
          { input: [4, 4], predictedOutput: 3, targetOutput: 3 },
        ],
      },
      requiredStepIds: ['pca-problem', 'pca-center', 'pca-project', 'pca-read-tradeoff'],
    });

    for (const quiz of [postQuiz, moduleQuiz]) {
      expect(quiz.questions.every((question) => question.sourceIds?.length)).toBe(true);
      expect(
        quiz.questions.every((question) =>
          question.sourceIds?.every((sourceId) => sourceId === 'sklearn-docs'),
        ),
      ).toBe(true);
    }
  });
});
