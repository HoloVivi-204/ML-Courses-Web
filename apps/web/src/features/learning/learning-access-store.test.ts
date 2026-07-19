import { beforeEach, describe, expect, it } from 'vitest';

import {
  hasLearningModuleAccess,
  hasLearningDemoAccess,
  hasLearningPostAccess,
  rememberLearningAccessGrant,
  rememberLearningContentAccessGrants,
} from './learning-access-store';

const storageKey = 'ml-path-learning-access-grants';

describe('learning access store', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

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
    sessionStorage.setItem(storageKey, JSON.stringify([{ postId: 42 }]));

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

  it('fails closed when stored grants contain revision pins', () => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify([
        {
          courseId: 'course-deep-learning-basic',
          postId: 'dl-p01-neuron-perceptron',
          publishedRevisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
          uid: 'learner-01',
        },
      ]),
    );

    expect(
      hasLearningPostAccess('course-deep-learning-basic', 'dl-p01-neuron-perceptron', 'learner-01'),
    ).toBe(false);
  });

  it('remembers backend progress content access for demo routes', () => {
    rememberLearningContentAccessGrants({
      courseId: 'course-deep-learning-basic',
      uid: 'learner-01',
      contentAccess: [
        {
          contentType: 'demo',
          entityId: 'demo-perceptron-and-gate',
        },
      ],
    });

    expect(
      hasLearningDemoAccess('course-deep-learning-basic', 'demo-perceptron-and-gate', 'learner-01'),
    ).toBe(true);
    expect(
      hasLearningDemoAccess('course-deep-learning-basic', 'demo-perceptron-and-gate', 'learner-02'),
    ).toBe(false);
  });

  it('does not remember backend progress content access rows that contain revision pins', () => {
    rememberLearningContentAccessGrants({
      courseId: 'course-deep-learning-basic',
      uid: 'learner-01',
      contentAccess: [
        {
          contentType: 'post',
          entityId: 'dl-p01-neuron-perceptron',
          revisionId: 'post-dl-p01-neuron-perceptron-rev-r1',
        },
      ] as unknown as Parameters<typeof rememberLearningContentAccessGrants>[0]['contentAccess'],
    });

    expect(
      hasLearningPostAccess('course-deep-learning-basic', 'dl-p01-neuron-perceptron', 'learner-01'),
    ).toBe(false);
  });
});
