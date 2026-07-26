import { describe, expect, it } from 'vitest';

import { formatAlgorithmName, getPlaygroundPathForAlgorithm } from './playground-link-mapping';

describe('learning course Playground links', () => {
  it('maps every distinct Must algorithm unlock to a registered Playground scenario', () => {
    expect(
      [
        'perceptron',
        'mlp',
        'linear-regression',
        'ridge-regression',
        'polynomial-regression',
        'lasso-regression',
        'logistic-regression',
        'naive-bayes',
        'knn',
        'decision-tree',
        'random-forest',
        'svm',
        'kmeans',
        'hierarchical-clustering',
        'pca',
      ].map((algorithmId) => ({
        algorithmId,
        label: formatAlgorithmName(algorithmId),
        playgroundPath: getPlaygroundPathForAlgorithm(algorithmId),
      })),
    ).toEqual([
      { algorithmId: 'perceptron', label: 'Perceptron', playgroundPath: '/playground/pg-xor' },
      { algorithmId: 'mlp', label: 'MLP', playgroundPath: '/playground/pg-nonlinear-2d' },
      {
        algorithmId: 'linear-regression',
        label: 'Linear Regression',
        playgroundPath: '/playground/pg-house-price',
      },
      {
        algorithmId: 'ridge-regression',
        label: 'Ridge Regression',
        playgroundPath: '/playground/pg-house-price',
      },
      {
        algorithmId: 'polynomial-regression',
        label: 'Polynomial Regression',
        playgroundPath: '/playground/pg-insurance-cost',
      },
      {
        algorithmId: 'lasso-regression',
        label: 'Lasso Regression',
        playgroundPath: '/playground/pg-insurance-cost',
      },
      {
        algorithmId: 'logistic-regression',
        label: 'Logistic Regression',
        playgroundPath: '/playground/pg-spam-detection',
      },
      {
        algorithmId: 'naive-bayes',
        label: 'Naive Bayes',
        playgroundPath: '/playground/pg-wine-cultivar',
      },
      { algorithmId: 'knn', label: 'KNN', playgroundPath: '/playground/pg-customer-churn' },
      {
        algorithmId: 'decision-tree',
        label: 'Decision Tree',
        playgroundPath: '/playground/pg-credit-risk',
      },
      {
        algorithmId: 'random-forest',
        label: 'Random Forest',
        playgroundPath: '/playground/pg-customer-churn',
      },
      { algorithmId: 'svm', label: 'SVM', playgroundPath: '/playground/pg-credit-risk' },
      { algorithmId: 'kmeans', label: 'K-Means', playgroundPath: '/playground/pg-retail-segments' },
      {
        algorithmId: 'hierarchical-clustering',
        label: 'Hierarchical Clustering',
        playgroundPath: '/playground/pg-retail-segments',
      },
      { algorithmId: 'pca', label: 'PCA', playgroundPath: '/playground/pg-country-indicators' },
    ]);
  });
});
