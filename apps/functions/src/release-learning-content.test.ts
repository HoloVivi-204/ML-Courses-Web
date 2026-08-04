import { describe, expect, it } from 'vitest';

import { getFixedDemo } from './release-demo-content.js';
import { getReadablePost } from './release-learning-content.js';
import { getReleaseLearningCatalog } from './release-learning-catalog.js';

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
      expect(post.provenance).toEqual({
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
      expect(demo.draftProvenance).toEqual({
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
});
