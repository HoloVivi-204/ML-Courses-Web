import { describe, expect, it } from 'vitest';

import {
  getReleaseLearningCatalog,
  getSubmissionLearningUnits,
} from './release-learning-catalog.js';

const expectedSubmissionPairs = [
  ['pg-house-price', 'linear-regression'],
  ['pg-spam-detection', 'logistic-regression'],
  ['pg-credit-risk', 'decision-tree'],
  ['pg-retail-segments', 'kmeans'],
  ['pg-country-indicators', 'pca'],
  ['pg-xor', 'perceptron'],
  ['pg-xor', 'mlp'],
] as const;

describe('Release 1 learning catalog manifest', () => {
  it('matches the locked skeleton counts and stable IDs', () => {
    const catalog = getReleaseLearningCatalog();
    const modules = catalog.courses.flatMap((course) => course.modules);
    const posts = modules.flatMap((module) => module.posts);
    const demos = modules
      .map((module) => module.demoId)
      .filter((demoId): demoId is string => demoId !== null);

    expect(catalog.courses.map((course) => course.courseId)).toEqual([
      'course-classical-ml',
      'course-deep-learning-basic',
    ]);
    expect(modules.map((module) => module.moduleId)).toEqual([
      'cml-m01-foundations',
      'cml-m02-linear-polynomial',
      'cml-m03-ridge-lasso',
      'cml-m04-logistic-classification',
      'cml-m05-knn-naive-bayes',
      'cml-m06-trees-forest',
      'cml-m07-svm',
      'cml-m08-clustering',
      'cml-m09-pca',
      'dl-m01-neuron-perceptron',
      'dl-m02-mlp',
      'dl-m03-training-generalization',
    ]);
    expect(posts.map((post) => post.postId)).toEqual([
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
      'dl-p01-neuron-perceptron',
      'dl-p02-mlp-forward-activation',
      'dl-p03-backprop-overfitting',
    ]);
    expect(modules).toHaveLength(12);
    expect(posts).toHaveLength(18);
    expect(demos).toHaveLength(10);
    expect(posts.every((post) => post.sourceReviewStatus === 'pending-operator-review')).toBe(true);
  });

  it('maps the seven submission Playground pairs to trusted module unlock units', () => {
    const units = getSubmissionLearningUnits();

    expect(units.map((unit) => [unit.scenarioId, unit.algorithmId])).toEqual(
      expectedSubmissionPairs,
    );

    for (const unit of units) {
      expect(unit.courseId).toMatch(/^course-/);
      expect(unit.moduleId).toMatch(/^(cml|dl)-m\d{2}-/);
      expect(unit.moduleQuizId).toMatch(/^quiz-module-/);
      expect(unit.requiredPostIds.length).toBeGreaterThanOrEqual(1);
      expect(unit.unlockAlgorithmIds).toContain(unit.algorithmId);
    }
  });
});
