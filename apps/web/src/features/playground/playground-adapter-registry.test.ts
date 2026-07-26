import { describe, expect, it } from 'vitest';

import { getPlaygroundPairRegistry, resolveAlgorithmAdapter } from './playground-adapter-registry';

describe('Playground adapter registry', () => {
  it('exposes every implemented Must pair to the worker registry', () => {
    const registry = getPlaygroundPairRegistry();

    expect(registry.map((entry) => `${entry.scenarioId}/${entry.algorithmId}`)).toEqual([
      'pg-xor/perceptron',
      'pg-xor/mlp',
      'pg-nonlinear-2d/mlp',
      'pg-house-price/linear-regression',
      'pg-house-price/ridge-regression',
      'pg-insurance-cost/polynomial-regression',
      'pg-insurance-cost/lasso-regression',
      'pg-spam-detection/logistic-regression',
      'pg-spam-detection/naive-bayes',
      'pg-customer-churn/knn',
      'pg-customer-churn/random-forest',
      'pg-credit-risk/decision-tree',
      'pg-credit-risk/logistic-regression',
      'pg-credit-risk/svm',
      'pg-wine-cultivar/naive-bayes',
      'pg-retail-segments/kmeans',
      'pg-retail-segments/hierarchical-clustering',
      'pg-country-indicators/pca',
    ]);
    expect(registry).toHaveLength(18);
  });

  it('keeps UI defaults and parameter fields aligned with every registered adapter', () => {
    const registry = getPlaygroundPairRegistry();

    for (const entry of registry) {
      expect(entry.title.en).toEqual(expect.any(String));
      expect(entry.title.vi).toEqual(expect.any(String));
      expect(entry.intro.en).toEqual(expect.any(String));
      expect(entry.intro.vi).toEqual(expect.any(String));
      expect(entry.defaultConfigName).toEqual(expect.any(String));
      expect(entry.primaryMetricId).toEqual(expect.any(String));
      expect(entry.parameterFields.map((field) => field.id)).toEqual(
        Object.keys(entry.defaultConfig),
      );
      expect(() => entry.adapter?.validateConfig(entry.defaultConfig)).not.toThrow();
    }
  });

  it('runs the implemented pg-xor Perceptron adapter through the generic contract', async () => {
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
    });
    const progressEpochs: number[] = [];

    if (!adapter) {
      throw new Error('Expected pg-xor/perceptron adapter to be registered.');
    }

    await expect(
      adapter.run(
        {
          runId: 'run-registry-01',
          sessionId: 'session-registry-01',
          scenarioId: 'pg-xor',
          algorithmId: 'perceptron',
          datasetVersionId: 'ds-xor-noisy-v1',
          configHash: '9'.repeat(64),
          config: {
            learningRate: 0.1,
            epochs: 100,
            trainRatio: 0.75,
            seed: 42,
          },
        },
        {
          onProgress: (event) => {
            if (typeof event.epoch === 'number') {
              progressEpochs.push(event.epoch);
            }
          },
          shouldCancel: () => false,
        },
      ),
    ).resolves.toMatchObject({
      runId: 'run-registry-01',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      determinism: 'exact',
      metrics: {
        accuracy: 0.5,
        loss: 0.5,
      },
    });
    expect(progressEpochs[0]).toBe(1);
    expect(progressEpochs.at(-1)).toBe(100);
  });

  it('fails closed for disabled Should pairs and unsupported dataset combinations', () => {
    expect(
      resolveAlgorithmAdapter({
        scenarioId: 'pg-country-indicators',
        algorithmId: 'pca',
        datasetVersionId: 'ds-xor-noisy-v1',
      }),
    ).toBeNull();
    expect(
      resolveAlgorithmAdapter({
        scenarioId: 'pg-house-price',
        algorithmId: 'polynomial-regression',
        datasetVersionId: 'ds-house-price-v1',
      }),
    ).toBeNull();
  });
});
