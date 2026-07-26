import { describe, expect, it } from 'vitest';

import { courses } from '../catalog/course-data';
import { getFixedDemo } from './and-gate-demo-data';
import { parseContentBlockCollection } from './content-block-validation';
import { getReadablePost } from './trial-post-data';

describe('Release 1 content drafts', () => {
  it('provides localized, traceable draft content for every locked post', () => {
    const posts = courses.flatMap((course) =>
      (course.modules ?? []).flatMap((module) =>
        module.postIds.map((postId) => {
          const post = getReadablePost(course.id, postId, true);

          expect(post).toBeDefined();
          return post!;
        }),
      ),
    );

    expect(posts).toHaveLength(18);
    expect(new Set(posts.map((post) => post.taskFingerprint)).size).toBe(18);

    for (const post of posts) {
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
      expect(parseContentBlockCollection(post.blocks, post.id)).not.toBeNull();
      expect(post.blocks).toContainEqual(
        expect.objectContaining({
          activityId: `act-${post.id}-example`,
          type: 'example',
        }),
      );
    }
  });

  it('keeps every fixed demo as localized draft-only content with unique task fingerprints', () => {
    const demos = courses.flatMap((course) =>
      (course.modules ?? [])
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
