import { describe, expect, it } from 'vitest';

import { getFixedDemo } from './release-demo-content.js';
import { getReadablePost } from './release-learning-content.js';
import { getReleaseLearningCatalog } from './release-learning-catalog.js';
import { getQuizManifest } from './quiz-manifest.js';

describe('Release 1 protected learning content', () => {
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
});
