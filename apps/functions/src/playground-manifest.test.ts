import { describe, expect, it } from 'vitest';

import {
  assertSupportedPlaygroundPair,
  getSubmissionPlaygroundPairManifests,
  hashPerceptronPlaygroundConfig,
  hashPlaygroundConfig,
  normalizePlaygroundConfig,
  normalizePerceptronPlaygroundConfig,
} from './playground-manifest.js';

describe('playground manifest validation', () => {
  it('exposes every implemented Must pair in the baseline runtime manifest', () => {
    const manifests = getSubmissionPlaygroundPairManifests();

    expect(manifests.map((manifest) => `${manifest.scenarioId}/${manifest.algorithmId}`)).toEqual([
      'pg-xor/perceptron',
      'pg-xor/mlp',
      'pg-nonlinear-2d/mlp',
      'pg-house-price/linear-regression',
      'pg-house-price/ridge-regression',
      'pg-insurance-cost/polynomial-regression',
      'pg-insurance-cost/lasso-regression',
      'pg-spam-detection/logistic-regression',
      'pg-spam-detection/naive-bayes',
      'pg-credit-risk/decision-tree',
      'pg-credit-risk/logistic-regression',
      'pg-credit-risk/svm',
      'pg-wine-cultivar/naive-bayes',
      'pg-customer-churn/knn',
      'pg-customer-churn/random-forest',
      'pg-retail-segments/kmeans',
      'pg-retail-segments/hierarchical-clustering',
      'pg-country-indicators/pca',
    ]);
    expect(manifests).toHaveLength(18);
    expect(
      manifests.every(
        (manifest) =>
          manifest.scopePriority === 'must' &&
          manifest.owner === undefined &&
          manifest.implementationStatus === undefined,
      ),
    ).toBe(true);
  });

  it('normalizes every submission pair default config and hashes it deterministically', () => {
    for (const manifest of getSubmissionPlaygroundPairManifests()) {
      const config = normalizePlaygroundConfig({
        algorithmId: manifest.algorithmId,
        config: manifest.defaultConfig,
        datasetVersionId: manifest.datasetVersionId,
        deviceProfile: 'desktop',
        scenarioId: manifest.scenarioId,
      });

      expect(config).toEqual(manifest.defaultConfig);
      expect(
        hashPlaygroundConfig({
          algorithmId: manifest.algorithmId,
          config,
          datasetVersionId: manifest.datasetVersionId,
          scenarioId: manifest.scenarioId,
        }),
      ).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('rejects unknown config fields for every submission pair', () => {
    for (const manifest of getSubmissionPlaygroundPairManifests()) {
      expect(() =>
        normalizePlaygroundConfig({
          algorithmId: manifest.algorithmId,
          config: {
            ...manifest.defaultConfig,
            unexpectedParameter: true,
          },
          datasetVersionId: manifest.datasetVersionId,
          deviceProfile: 'desktop',
          scenarioId: manifest.scenarioId,
        }),
      ).toThrowError(/unsupported config fields/i);
    }
  });

  it('enforces the TDD desktop MLP hard limits over looser matrix planning limits', () => {
    const baseConfig = {
      hiddenLayers: [4],
      activation: 'tanh',
      learningRate: 0.05,
      epochs: 300,
      trainRatio: 0.75,
      seed: 42,
    };

    expect(() =>
      normalizePlaygroundConfig({
        algorithmId: 'mlp',
        config: {
          ...baseConfig,
          hiddenLayers: [33],
        },
        datasetVersionId: 'ds-xor-noisy-v1',
        deviceProfile: 'desktop',
        scenarioId: 'pg-xor',
      }),
    ).toThrowError(/between 1 and 32/i);
    expect(() =>
      normalizePlaygroundConfig({
        algorithmId: 'mlp',
        config: {
          ...baseConfig,
          epochs: 1001,
        },
        datasetVersionId: 'ds-xor-noisy-v1',
        deviceProfile: 'desktop',
        scenarioId: 'pg-xor',
      }),
    ).toThrowError(/epochs must be between 10 and 1000/i);
  });

  it('enforces the TDD desktop K-Means k limit over the looser matrix planning limit', () => {
    expect(() =>
      normalizePlaygroundConfig({
        algorithmId: 'kmeans',
        config: {
          k: 11,
          maxIterations: 100,
          seed: 42,
        },
        datasetVersionId: 'ds-retail-segments-v1',
        deviceProfile: 'desktop',
        scenarioId: 'pg-retail-segments',
      }),
    ).toThrowError(/k must be between 2 and 10/i);
  });

  it('enforces the customer churn KNN limits before worker execution', () => {
    const baseConfig = {
      k: 7,
      distance: 'euclidean',
      trainRatio: 0.8,
      seed: 42,
    };

    expect(() =>
      normalizePlaygroundConfig({
        algorithmId: 'knn',
        config: { ...baseConfig, k: 51 },
        datasetVersionId: 'ds-customer-churn-v1',
        deviceProfile: 'desktop',
        scenarioId: 'pg-customer-churn',
      }),
    ).toThrowError(/k must be between 1 and 50/i);
    expect(() =>
      normalizePlaygroundConfig({
        algorithmId: 'knn',
        config: { ...baseConfig, k: 26 },
        datasetVersionId: 'ds-customer-churn-v1',
        deviceProfile: 'mobile',
        scenarioId: 'pg-customer-churn',
      }),
    ).toThrowError(/k must be between 1 and 25/i);
  });

  it('enforces the customer churn Random Forest tree limits before worker execution', () => {
    const baseConfig = {
      trees: 50,
      maxDepth: 6,
      trainRatio: 0.8,
      seed: 42,
    };

    expect(() =>
      normalizePlaygroundConfig({
        algorithmId: 'random-forest',
        config: { ...baseConfig, trees: 201 },
        datasetVersionId: 'ds-customer-churn-v1',
        deviceProfile: 'desktop',
        scenarioId: 'pg-customer-churn',
      }),
    ).toThrowError(/trees must be between 1 and 200/i);
    expect(() =>
      normalizePlaygroundConfig({
        algorithmId: 'random-forest',
        config: { ...baseConfig, trees: 51 },
        datasetVersionId: 'ds-customer-churn-v1',
        deviceProfile: 'mobile',
        scenarioId: 'pg-customer-churn',
      }),
    ).toThrowError(/trees must be between 1 and 50/i);
  });

  it('enforces the credit SVM C limit before worker execution', () => {
    const baseConfig = {
      kernel: 'rbf',
      c: 1,
      gamma: 'scale',
      trainRatio: 0.8,
      seed: 42,
    };

    expect(() =>
      normalizePlaygroundConfig({
        algorithmId: 'svm',
        config: { ...baseConfig, c: 100.1 },
        datasetVersionId: 'ds-credit-risk-v1',
        deviceProfile: 'desktop',
        scenarioId: 'pg-credit-risk',
      }),
    ).toThrowError(/c must be between 0.001 and 100/i);
  });

  it('enforces the wine Naive Bayes smoothing limit before worker execution', () => {
    expect(() =>
      normalizePlaygroundConfig({
        algorithmId: 'naive-bayes',
        config: { smoothing: 1.1, trainRatio: 0.8, seed: 42 },
        datasetVersionId: 'ds-wine-cultivar-v1',
        deviceProfile: 'desktop',
        scenarioId: 'pg-wine-cultivar',
      }),
    ).toThrowError(/smoothing must be between 1e-12 and 1/i);
  });

  it('enforces the retail hierarchical clustering mobile cluster limit before worker execution', () => {
    expect(() =>
      normalizePlaygroundConfig({
        algorithmId: 'hierarchical-clustering',
        config: { linkage: 'ward', distance: 'euclidean', clusters: 9 },
        datasetVersionId: 'ds-retail-segments-v1',
        deviceProfile: 'mobile',
        scenarioId: 'pg-retail-segments',
      }),
    ).toThrowError(/clusters must be between 2 and 8/i);
  });

  it('enforces the nonlinear MLP mobile epoch limit before worker execution', () => {
    expect(() =>
      normalizePlaygroundConfig({
        algorithmId: 'mlp',
        config: {
          hiddenLayers: [8, 8],
          activation: 'tanh',
          learningRate: 0.03,
          epochs: 501,
          trainRatio: 0.8,
          seed: 42,
        },
        datasetVersionId: 'ds-moons-2d-v1',
        deviceProfile: 'mobile',
        scenarioId: 'pg-nonlinear-2d',
      }),
    ).toThrowError(/epochs must be between 10 and 500/i);
  });

  it('enforces the regression-family alpha and polynomial degree limits before worker execution', () => {
    expect(() =>
      normalizePlaygroundConfig({
        algorithmId: 'ridge-regression',
        config: { alpha: 100.1, trainRatio: 0.8, seed: 42 },
        datasetVersionId: 'ds-house-price-v1',
        deviceProfile: 'desktop',
        scenarioId: 'pg-house-price',
      }),
    ).toThrowError(/alpha must be between 0.0001 and 100/i);
    expect(() =>
      normalizePlaygroundConfig({
        algorithmId: 'lasso-regression',
        config: { alpha: 0, trainRatio: 0.8, seed: 42 },
        datasetVersionId: 'ds-insurance-cost-v1',
        deviceProfile: 'desktop',
        scenarioId: 'pg-insurance-cost',
      }),
    ).toThrowError(/alpha must be between 0.0001 and 100/i);
    expect(() =>
      normalizePlaygroundConfig({
        algorithmId: 'polynomial-regression',
        config: { degree: 4, trainRatio: 0.8, seed: 42 },
        datasetVersionId: 'ds-insurance-cost-v1',
        deviceProfile: 'mobile',
        scenarioId: 'pg-insurance-cost',
      }),
    ).toThrowError(/degree must be between 1 and 3/i);
  });

  it('rejects PCA components above the static country-indicator feature count', () => {
    expect(() =>
      normalizePlaygroundConfig({
        algorithmId: 'pca',
        config: {
          components: 3,
          scale: true,
        },
        datasetVersionId: 'ds-country-indicators-v1',
        deviceProfile: 'desktop',
        scenarioId: 'pg-country-indicators',
      }),
    ).toThrowError(/components must be between 2 and 2/i);
  });

  it('normalizes the release-one pg-xor Perceptron default config deterministically', () => {
    const config = normalizePerceptronPlaygroundConfig(
      {
        learningRate: 0.1,
        epochs: 100,
        trainRatio: 0.75,
        seed: 42,
      },
      'desktop',
    );

    expect(config).toEqual({
      learningRate: 0.1,
      epochs: 100,
      trainRatio: 0.75,
      seed: 42,
    });
    expect(hashPerceptronPlaygroundConfig(config)).toBe(hashPerceptronPlaygroundConfig(config));
  });

  it('enforces the mobile epoch limit from the scenario matrix', () => {
    expect(() =>
      normalizePerceptronPlaygroundConfig(
        {
          learningRate: 0.1,
          epochs: 201,
          trainRatio: 0.75,
          seed: 42,
        },
        'mobile',
      ),
    ).toThrowError(/epochs must be between 10 and 200/i);
  });

  it('rejects unsupported scenario, algorithm, or dataset pairs', () => {
    expect(() =>
      assertSupportedPlaygroundPair({
        scenarioId: 'pg-xor',
        algorithmId: 'logistic-regression',
        datasetVersionId: 'ds-xor-noisy-v1',
      }),
    ).toThrowError(/not supported/i);
  });

  it('fails closed for a matrix Should pair while additionalScenarioPairs is disabled', () => {
    expect(() =>
      assertSupportedPlaygroundPair({
        scenarioId: 'pg-house-price',
        algorithmId: 'polynomial-regression',
        datasetVersionId: 'ds-house-price-v1',
      }),
    ).toThrowError(/disabled/i);
  });

  it('fails closed for every matrix Should pair', () => {
    const disabledPairs = [
      ['pg-house-price', 'polynomial-regression', 'ds-house-price-v1'],
      ['pg-house-price', 'lasso-regression', 'ds-house-price-v1'],
      ['pg-insurance-cost', 'linear-regression', 'ds-insurance-cost-v1'],
      ['pg-insurance-cost', 'ridge-regression', 'ds-insurance-cost-v1'],
      ['pg-customer-churn', 'logistic-regression', 'ds-customer-churn-v1'],
      ['pg-customer-churn', 'decision-tree', 'ds-customer-churn-v1'],
      ['pg-customer-churn', 'svm', 'ds-customer-churn-v1'],
      ['pg-credit-risk', 'knn', 'ds-credit-risk-v1'],
      ['pg-credit-risk', 'random-forest', 'ds-credit-risk-v1'],
      ['pg-wine-cultivar', 'knn', 'ds-wine-cultivar-v1'],
      ['pg-wine-cultivar', 'decision-tree', 'ds-wine-cultivar-v1'],
      ['pg-wine-cultivar', 'random-forest', 'ds-wine-cultivar-v1'],
      ['pg-wine-cultivar', 'svm', 'ds-wine-cultivar-v1'],
    ] as const;

    for (const [scenarioId, algorithmId, datasetVersionId] of disabledPairs) {
      expect(() =>
        assertSupportedPlaygroundPair({ scenarioId, algorithmId, datasetVersionId }),
      ).toThrowError(/disabled/i);
    }
  });
});
