import { describe, expect, it } from 'vitest';

import { courses } from '../catalog/course-data';
import { getFixedDemo } from './and-gate-demo-data';
import { getReadablePost } from './trial-post-data';
import { getPublicQuizRoute } from './quiz-route-data';

describe('Release 1 learning content route data', () => {
  it('provides draft vi/en post content for every locked skeleton post', () => {
    const postIds = courses.flatMap(
      (course) => course.modules?.flatMap((module) => module.postIds) ?? [],
    );

    expect(postIds).toHaveLength(18);

    for (const course of courses) {
      for (const module of course.modules ?? []) {
        for (const postId of module.postIds) {
          const post = getReadablePost(course.id, postId, true);

          expect(post).toMatchObject({
            accessLevel: 'full',
            courseId: course.id,
            id: postId,
            moduleId: module.id,
            sourceReviewStatus: 'pending-operator-review',
          });
          expect(post?.title.en).not.toHaveLength(0);
          expect(post?.title.vi).not.toHaveLength(0);
          expect(post?.blocks.some((block) => block.type === 'example')).toBe(true);
        }
      }
    }
  });

  it('covers ten fixed demo routes and thirty quiz routes without per-route components', () => {
    const modules = courses.flatMap((course) => course.modules ?? []);
    const demoIds = modules
      .map((module) => module.demoId)
      .filter((demoId): demoId is string => demoId !== null);
    const postQuizIds = modules.flatMap((module) =>
      module.postIds.map((postId) => {
        const match = /^(cml|dl)-p\d{2}/.exec(postId);

        return `quiz-post-${match?.[0] ?? postId}`;
      }),
    );
    const moduleQuizIds = modules.map((module) => {
      const match = /^(cml|dl)-m\d{2}/.exec(module.id);

      return `quiz-module-${match?.[0] ?? module.id}`;
    });

    expect(demoIds).toHaveLength(10);
    expect(postQuizIds).toHaveLength(18);
    expect(moduleQuizIds).toHaveLength(12);

    for (const demoId of demoIds) {
      expect(getFixedDemo(demoId)).toMatchObject({
        demoId,
        requiredStepIds: expect.any(Array),
      });
    }

    for (const quizId of [...postQuizIds, ...moduleQuizIds]) {
      expect(getPublicQuizRoute(quizId)).toMatchObject({
        quizId,
      });
    }
  });
});
