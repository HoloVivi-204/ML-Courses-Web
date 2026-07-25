import { describe, expect, it } from 'vitest';

import { getPlaygroundPairRegistry, resolveAlgorithmAdapter } from './playground-adapter-registry';

describe('Playground adapter registry', () => {
  it('exposes exactly the seven locked submission pairs to the worker registry', () => {
    const registry = getPlaygroundPairRegistry();

    expect(registry.map((entry) => `${entry.scenarioId}/${entry.algorithmId}`)).toEqual([
      'pg-xor/perceptron',
      'pg-xor/mlp',
      'pg-house-price/linear-regression',
      'pg-spam-detection/logistic-regression',
      'pg-credit-risk/decision-tree',
      'pg-retail-segments/kmeans',
      'pg-country-indicators/pca',
    ]);
    expect(registry).toHaveLength(7);
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
