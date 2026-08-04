import { describe, expect, it } from 'vitest';

import { getLockedContentScope, validateLockedContentScope } from './content-scope-validator.js';

describe('locked content scope validator', () => {
  it('derives the exact Release 1 baseline and its allowlisted source IDs', () => {
    const scope = getLockedContentScope();

    expect(scope.counts).toEqual({
      courses: 2,
      demos: 10,
      moduleQuizQuestions: 72,
      modules: 12,
      postQuizQuestions: 54,
      posts: 18,
      quizQuestions: 126,
    });
    expect(scope.courses.map((course) => course.courseId)).toEqual([
      'course-classical-ml',
      'course-deep-learning-basic',
    ]);
    expect(scope.sourceIds).toEqual([
      'd2l-vi',
      'google-ml-crash-course',
      'microsoft-ai-for-beginners',
      'microsoft-ml-for-beginners',
      'mit-ocw',
      'sklearn-docs',
      'tensorflow-tutorials',
    ]);
    expect(scope.posts).toHaveLength(18);
    expect(scope.posts[2]?.activityIds).toEqual([
      'act-cml-p03-linear-regression-example',
      'act-cml-p03-linear-regression-quiz-01',
      'act-cml-p03-linear-regression-quiz-02',
      'act-cml-p03-linear-regression-quiz-03',
    ]);
  });

  it('rejects a skeleton whose stable activity reference is changed', () => {
    const invalidSkeleton = getLockedContentScope().rawSkeleton.replace(
      'act-cml-p03-linear-regression-quiz-03',
      'act-cml-p03-linear-regression-quiz-04',
    );

    expect(() => validateLockedContentScope(invalidSkeleton)).toThrow(
      'Post cml-p03-linear-regression has invalid stable quiz or activity references.',
    );
  });
});
