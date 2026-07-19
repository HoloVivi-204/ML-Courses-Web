import { describe, expect, it } from 'vitest';

import {
  hasLearningModuleAccess,
  hasLearningPostAccess,
  rememberLearningAccessGrant,
} from './learning-access-store';

describe('learning access store', () => {
  it('remembers a post access grant for the matching course and post', () => {
    rememberLearningAccessGrant({
      courseId: 'course-deep-learning-basic',
      moduleId: 'dl-m01-neuron-perceptron',
      postId: 'dl-p01-neuron-perceptron',
      uid: 'learner-01',
    });

    expect(
      hasLearningPostAccess('course-deep-learning-basic', 'dl-p01-neuron-perceptron', 'learner-01'),
    ).toBe(true);
    expect(
      hasLearningModuleAccess(
        'course-deep-learning-basic',
        'dl-m01-neuron-perceptron',
        'learner-01',
      ),
    ).toBe(true);
    expect(hasLearningPostAccess('course-deep-learning-basic', 'not-granted', 'learner-01')).toBe(
      false,
    );
    expect(hasLearningModuleAccess('course-deep-learning-basic', 'not-granted', 'learner-01')).toBe(
      false,
    );
    expect(
      hasLearningPostAccess('course-deep-learning-basic', 'dl-p01-neuron-perceptron', 'learner-02'),
    ).toBe(false);
    expect(
      hasLearningModuleAccess(
        'course-deep-learning-basic',
        'dl-m01-neuron-perceptron',
        'learner-02',
      ),
    ).toBe(false);
  });

  it('fails closed when stored grants are malformed', () => {
    sessionStorage.setItem('ml-path-learning-access-grants', JSON.stringify([{ postId: 42 }]));

    expect(
      hasLearningPostAccess('course-deep-learning-basic', 'dl-p01-neuron-perceptron', 'learner-01'),
    ).toBe(false);
    expect(
      hasLearningModuleAccess(
        'course-deep-learning-basic',
        'dl-m01-neuron-perceptron',
        'learner-01',
      ),
    ).toBe(false);
  });
});
