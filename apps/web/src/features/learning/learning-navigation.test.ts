import { describe, expect, it } from 'vitest';

import { getPublicQuizRoute } from './quiz-route-data';
import { getQuizContinueAction } from './learning-navigation';

describe('learning quiz continuation', () => {
  it('opens the practice after the first Deep Learning lesson quiz', () => {
    const route = getPublicQuizRoute('quiz-post-dl-p01');

    expect(route).toBeDefined();
    expect(getQuizContinueAction(route!)).toEqual({
      kind: 'practice',
      path: '/learn/course-deep-learning-basic/demos/demo-perceptron-and-gate',
    });
  });

  it('opens the next lesson when a module has another lesson', () => {
    const route = getPublicQuizRoute('quiz-post-cml-p01');

    expect(route).toBeDefined();
    expect(getQuizContinueAction(route!)).toEqual({
      kind: 'next-lesson',
      path: '/learn/course-classical-ml/posts/cml-p02-train-test-metrics',
    });
  });

  it('opens the next module after a passed module quiz', () => {
    const route = getPublicQuizRoute('quiz-module-dl-m01');

    expect(route).toBeDefined();
    expect(getQuizContinueAction(route!)).toEqual({
      kind: 'next-module',
      path: '/learn/course-deep-learning-basic/modules/dl-m02-mlp',
    });
  });

  it('returns to the lesson list after the final module quiz', () => {
    const route = getPublicQuizRoute('quiz-module-dl-m03');

    expect(route).toBeDefined();
    expect(getQuizContinueAction(route!)).toEqual({
      kind: 'module-overview',
      path: '/learn/course-deep-learning-basic/modules/dl-m03-training-generalization',
    });
  });
});
