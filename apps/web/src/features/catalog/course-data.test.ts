import { describe, expect, it } from 'vitest';

import { courses } from './course-data';

const expectedCourseStructure = [
  {
    courseId: 'course-classical-ml',
    moduleIds: [
      'cml-m01-foundations',
      'cml-m02-linear-polynomial',
      'cml-m03-ridge-lasso',
      'cml-m04-logistic-classification',
      'cml-m05-knn-naive-bayes',
      'cml-m06-trees-forest',
      'cml-m07-svm',
      'cml-m08-clustering',
      'cml-m09-pca',
    ],
    postIds: [
      'cml-p01-problem-data-types',
      'cml-p02-train-test-metrics',
      'cml-p03-linear-regression',
      'cml-p04-polynomial-regression',
      'cml-p05-regularization-ridge-lasso',
      'cml-p06-logistic-regression',
      'cml-p07-classification-metrics',
      'cml-p08-knn',
      'cml-p09-naive-bayes',
      'cml-p10-decision-tree',
      'cml-p11-random-forest',
      'cml-p12-svm',
      'cml-p13-kmeans',
      'cml-p14-hierarchical-clustering',
      'cml-p15-pca',
    ],
  },
  {
    courseId: 'course-deep-learning-basic',
    moduleIds: ['dl-m01-neuron-perceptron', 'dl-m02-mlp', 'dl-m03-training-generalization'],
    postIds: [
      'dl-p01-neuron-perceptron',
      'dl-p02-mlp-forward-activation',
      'dl-p03-backprop-overfitting',
    ],
  },
] as const;

describe('Release 1 course catalog data', () => {
  it('matches the locked 2 course, 12 module and 18 post skeleton IDs', () => {
    expect(courses).toHaveLength(2);

    expect(courses.map((course) => course.id)).toEqual(
      expectedCourseStructure.map((course) => course.courseId),
    );

    const moduleIds = courses.flatMap((course) => course.modules?.map((module) => module.id) ?? []);
    const postIds = courses.flatMap(
      (course) => course.modules?.flatMap((module) => module.postIds) ?? [],
    );

    expect(moduleIds).toEqual(expectedCourseStructure.flatMap((course) => [...course.moduleIds]));
    expect(postIds).toEqual(expectedCourseStructure.flatMap((course) => [...course.postIds]));
    expect(moduleIds).toHaveLength(12);
    expect(postIds).toHaveLength(18);
  });
});
