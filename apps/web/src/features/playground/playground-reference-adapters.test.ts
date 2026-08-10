import { describe, expect, it, vi } from 'vitest';

const libsvmMock = vi.hoisted(() => ({
  free: vi.fn(),
}));

vi.mock('./libsvm-runtime', () => {
  class FixtureSvm {
    static KERNEL_TYPES = { RBF: '2' };
    static SVM_TYPES = { C_SVC: '0' };
    private trainingRows: Array<{ features: readonly number[]; label: number }> = [];

    free(): void {
      libsvmMock.free();
    }

    getSVIndices(): number[] {
      return [0, 1, 2, 3, 4, 5];
    }

    predict(features: readonly (readonly number[])[]): number[] {
      return features.map((candidate) => {
        const nearest = this.trainingRows.reduce<{
          features: readonly number[];
          label: number;
        } | null>((closest, row) => {
          if (!closest) {
            return row;
          }

          const candidateDistance = candidate.reduce(
            (total, value, index) => total + (value - (row.features[index] ?? 0)) ** 2,
            0,
          );
          const closestDistance = candidate.reduce(
            (total, value, index) => total + (value - (closest.features[index] ?? 0)) ** 2,
            0,
          );

          return candidateDistance < closestDistance ? row : closest;
        }, null);

        return nearest?.label ?? 0;
      });
    }

    train(features: readonly (readonly number[])[], labels: readonly number[]): void {
      this.trainingRows = features.map((row, index) => ({
        features: row,
        label: labels[index] ?? 0,
      }));
    }
  }

  return {
    loadLibsvmConstructor: async () => FixtureSvm,
  };
});

import { resolveAlgorithmAdapter } from './playground-adapter-registry';
import { assertGoldenFixture } from './playground-golden-fixture';
import creditTreeFixture from './fixtures/credit-tree-v1.json';
import creditLogisticFixture from './fixtures/credit-logistic-v1.json';
import creditSvmFixture from './fixtures/credit-svm-v1.json';
import churnKnnFixture from './fixtures/churn-knn-v1.json';
import churnForestFixture from './fixtures/churn-forest-v1.json';
import countryPcaFixture from './fixtures/country-pca-v1.json';
import houseLinearFixture from './fixtures/house-linear-v1.json';
import houseRidgeFixture from './fixtures/house-ridge-v1.json';
import insurancePolynomialFixture from './fixtures/insurance-polynomial-v1.json';
import moonsMlpFixture from './fixtures/moons-mlp-v1.json';
import insuranceLassoFixture from './fixtures/insurance-lasso-v1.json';
import retailKMeansFixture from './fixtures/retail-kmeans-v1.json';
import retailHierarchicalFixture from './fixtures/retail-hierarchical-v1.json';
import spamNaiveBayesFixture from './fixtures/spam-naive-bayes-v1.json';
import wineNaiveBayesFixture from './fixtures/wine-naive-bayes-v1.json';
import spamLogisticFixture from './fixtures/spam-logistic-v1.json';
import xorPerceptronFixture from './fixtures/xor-perceptron-v1.json';
import xorMlpFixture from './fixtures/xor-mlp-v1.json';

const TENSORFLOW_GOLDEN_FIXTURE_TIMEOUT_MS = 15_000;

const fixtureCases = [
  {
    scenarioId: 'pg-xor',
    algorithmId: 'perceptron',
    datasetVersionId: 'ds-xor-noisy-v1',
    fixture: xorPerceptronFixture,
  },
  {
    scenarioId: 'pg-xor',
    algorithmId: 'mlp',
    datasetVersionId: 'ds-xor-noisy-v1',
    fixture: xorMlpFixture,
  },
  {
    scenarioId: 'pg-nonlinear-2d',
    algorithmId: 'mlp',
    datasetVersionId: 'ds-moons-2d-v1',
    fixture: moonsMlpFixture,
  },
  {
    scenarioId: 'pg-house-price',
    algorithmId: 'linear-regression',
    datasetVersionId: 'ds-house-price-v1',
    fixture: houseLinearFixture,
  },
  {
    scenarioId: 'pg-house-price',
    algorithmId: 'ridge-regression',
    datasetVersionId: 'ds-house-price-v1',
    fixture: houseRidgeFixture,
  },
  {
    scenarioId: 'pg-insurance-cost',
    algorithmId: 'polynomial-regression',
    datasetVersionId: 'ds-insurance-cost-v1',
    fixture: insurancePolynomialFixture,
  },
  {
    scenarioId: 'pg-insurance-cost',
    algorithmId: 'lasso-regression',
    datasetVersionId: 'ds-insurance-cost-v1',
    fixture: insuranceLassoFixture,
  },
  {
    scenarioId: 'pg-wine-cultivar',
    algorithmId: 'naive-bayes',
    datasetVersionId: 'ds-wine-cultivar-v1',
    fixture: wineNaiveBayesFixture,
  },
  {
    scenarioId: 'pg-spam-detection',
    algorithmId: 'logistic-regression',
    datasetVersionId: 'ds-sms-spam-v1',
    fixture: spamLogisticFixture,
  },
  {
    scenarioId: 'pg-spam-detection',
    algorithmId: 'naive-bayes',
    datasetVersionId: 'ds-sms-spam-v1',
    fixture: spamNaiveBayesFixture,
  },
  {
    scenarioId: 'pg-customer-churn',
    algorithmId: 'knn',
    datasetVersionId: 'ds-customer-churn-v1',
    fixture: churnKnnFixture,
  },
  {
    scenarioId: 'pg-customer-churn',
    algorithmId: 'random-forest',
    datasetVersionId: 'ds-customer-churn-v1',
    fixture: churnForestFixture,
  },
  {
    scenarioId: 'pg-credit-risk',
    algorithmId: 'svm',
    datasetVersionId: 'ds-credit-risk-v1',
    fixture: creditSvmFixture,
  },
  {
    scenarioId: 'pg-credit-risk',
    algorithmId: 'logistic-regression',
    datasetVersionId: 'ds-credit-risk-v1',
    fixture: creditLogisticFixture,
  },
  {
    scenarioId: 'pg-credit-risk',
    algorithmId: 'decision-tree',
    datasetVersionId: 'ds-credit-risk-v1',
    fixture: creditTreeFixture,
  },
  {
    scenarioId: 'pg-retail-segments',
    algorithmId: 'hierarchical-clustering',
    datasetVersionId: 'ds-retail-segments-v1',
    fixture: retailHierarchicalFixture,
  },
  {
    scenarioId: 'pg-retail-segments',
    algorithmId: 'kmeans',
    datasetVersionId: 'ds-retail-segments-v1',
    fixture: retailKMeansFixture,
  },
  {
    scenarioId: 'pg-country-indicators',
    algorithmId: 'pca',
    datasetVersionId: 'ds-country-indicators-v1',
    fixture: countryPcaFixture,
  },
] as const;

function expectGoldenFixture(
  result: { runId: string },
  runId: string,
  fixture: { result: unknown; tolerance: number },
): void {
  expect(result.runId).toBe(runId);
  assertGoldenFixture(result, fixture.result, fixture.tolerance);
}

describe('Playground reference adapters', () => {
  it('registers runnable adapters for every implemented Must fixture pair', () => {
    for (const fixtureCase of fixtureCases) {
      expect(resolveAlgorithmAdapter(fixtureCase)).not.toBeNull();
    }
  });

  it('rejects unknown config fields in every adapter validator', () => {
    for (const fixtureCase of fixtureCases) {
      const adapter = resolveAlgorithmAdapter(fixtureCase);

      if (!adapter) {
        throw new Error(`Expected ${fixtureCase.scenarioId}/${fixtureCase.algorithmId} adapter.`);
      }

      expect(() =>
        adapter.validateConfig({
          ...fixtureCase.fixture.config,
          unexpectedParameter: true,
        }),
      ).toThrowError(/unsupported config fields/i);
    }
  });

  it('returns deterministic results for every implemented Must golden fixture pair', async () => {
    for (const fixtureCase of fixtureCases) {
      const adapter = resolveAlgorithmAdapter(fixtureCase);

      if (!adapter) {
        throw new Error(`Expected ${fixtureCase.scenarioId}/${fixtureCase.algorithmId} adapter.`);
      }

      const request = {
        runId: `run-${fixtureCase.algorithmId}-deterministic`,
        sessionId: `session-${fixtureCase.algorithmId}-deterministic`,
        scenarioId: fixtureCase.scenarioId,
        algorithmId: fixtureCase.algorithmId,
        datasetVersionId: fixtureCase.datasetVersionId,
        configHash: '8'.repeat(64),
        config: fixtureCase.fixture.config,
      };
      const firstResult = await adapter.run(request, {
        onProgress: () => undefined,
        shouldCancel: () => false,
      });
      const secondResult = await adapter.run(request, {
        onProgress: () => undefined,
        shouldCancel: () => false,
      });

      expect(secondResult).toEqual(firstResult);
      expect(firstResult.textAlternative?.en).toEqual(expect.any(String));
      expect(firstResult.textAlternative?.vi).toEqual(expect.any(String));
    }
  }, 45_000);

  it('cooperatively cancels every locked adapter before producing a result', async () => {
    for (const fixtureCase of fixtureCases) {
      const adapter = resolveAlgorithmAdapter(fixtureCase);

      if (!adapter) {
        throw new Error(`Expected ${fixtureCase.scenarioId}/${fixtureCase.algorithmId} adapter.`);
      }

      let caughtError: unknown;

      try {
        await adapter.run(
          {
            runId: `run-${fixtureCase.algorithmId}-cancelled`,
            sessionId: `session-${fixtureCase.algorithmId}-cancelled`,
            scenarioId: fixtureCase.scenarioId,
            algorithmId: fixtureCase.algorithmId,
            datasetVersionId: fixtureCase.datasetVersionId,
            configHash: '8'.repeat(64),
            config: fixtureCase.fixture.config,
          },
          {
            onProgress: () => undefined,
            shouldCancel: () => true,
          },
        );
      } catch (error) {
        caughtError = error;
      }

      expect(adapter.isCancelledError(caughtError)).toBe(true);
    }
  });

  it(
    'runs pg-nonlinear-2d MLP through the registry and matches the golden fixture',
    async () => {
      const adapter = resolveAlgorithmAdapter({
        scenarioId: 'pg-nonlinear-2d',
        algorithmId: 'mlp',
        datasetVersionId: 'ds-moons-2d-v1',
      });

      if (!adapter) {
        throw new Error('Expected pg-nonlinear-2d/mlp adapter to be registered.');
      }

      const result = await adapter.run(
        {
          runId: 'run-moons-mlp',
          sessionId: 'session-moons-mlp',
          scenarioId: 'pg-nonlinear-2d',
          algorithmId: 'mlp',
          datasetVersionId: 'ds-moons-2d-v1',
          configHash: '8'.repeat(64),
          config: moonsMlpFixture.config,
        },
        {
          onProgress: () => undefined,
          shouldCancel: () => false,
        },
      );

      expectGoldenFixture(result, 'run-moons-mlp', moonsMlpFixture);
      expect(result.textAlternative?.vi).toEqual(expect.stringContaining('accuracy'));
    },
    TENSORFLOW_GOLDEN_FIXTURE_TIMEOUT_MS,
  );

  it('runs pg-house-price linear regression through the registry and matches the golden fixture', async () => {
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-house-price',
      algorithmId: 'linear-regression',
      datasetVersionId: 'ds-house-price-v1',
    });

    if (!adapter) {
      throw new Error('Expected pg-house-price/linear-regression adapter to be registered.');
    }

    const result = await adapter.run(
      {
        runId: 'run-house-linear',
        sessionId: 'session-house-linear',
        scenarioId: 'pg-house-price',
        algorithmId: 'linear-regression',
        datasetVersionId: 'ds-house-price-v1',
        configHash: '8'.repeat(64),
        config: houseLinearFixture.config,
      },
      {
        onProgress: () => undefined,
        shouldCancel: () => false,
      },
    );

    expectGoldenFixture(result, 'run-house-linear', houseLinearFixture);
    expect(result.textAlternative?.vi).toEqual(expect.stringContaining('RMSE'));
  });

  it('runs pg-house-price ridge regression through the registry and matches the golden fixture', async () => {
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-house-price',
      algorithmId: 'ridge-regression',
      datasetVersionId: 'ds-house-price-v1',
    });

    if (!adapter) {
      throw new Error('Expected pg-house-price/ridge-regression adapter to be registered.');
    }

    const result = await adapter.run(
      {
        runId: 'run-house-ridge',
        sessionId: 'session-house-ridge',
        scenarioId: 'pg-house-price',
        algorithmId: 'ridge-regression',
        datasetVersionId: 'ds-house-price-v1',
        configHash: '8'.repeat(64),
        config: houseRidgeFixture.config,
      },
      {
        onProgress: () => undefined,
        shouldCancel: () => false,
      },
    );

    expectGoldenFixture(result, 'run-house-ridge', houseRidgeFixture);
    expect(result.textAlternative?.vi).toEqual(expect.stringContaining('RMSE'));
  });

  it('runs pg-insurance-cost polynomial regression through the registry and matches the golden fixture', async () => {
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-insurance-cost',
      algorithmId: 'polynomial-regression',
      datasetVersionId: 'ds-insurance-cost-v1',
    });

    if (!adapter) {
      throw new Error('Expected pg-insurance-cost/polynomial-regression adapter to be registered.');
    }

    const result = await adapter.run(
      {
        runId: 'run-insurance-polynomial',
        sessionId: 'session-insurance-polynomial',
        scenarioId: 'pg-insurance-cost',
        algorithmId: 'polynomial-regression',
        datasetVersionId: 'ds-insurance-cost-v1',
        configHash: '8'.repeat(64),
        config: insurancePolynomialFixture.config,
      },
      {
        onProgress: () => undefined,
        shouldCancel: () => false,
      },
    );

    expectGoldenFixture(result, 'run-insurance-polynomial', insurancePolynomialFixture);
    expect(result.textAlternative?.vi).toEqual(expect.stringContaining('MAE'));
  });

  it('runs pg-insurance-cost Lasso regression through the registry and matches the golden fixture', async () => {
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-insurance-cost',
      algorithmId: 'lasso-regression',
      datasetVersionId: 'ds-insurance-cost-v1',
    });

    if (!adapter) {
      throw new Error('Expected pg-insurance-cost/lasso-regression adapter to be registered.');
    }

    const result = await adapter.run(
      {
        runId: 'run-insurance-lasso',
        sessionId: 'session-insurance-lasso',
        scenarioId: 'pg-insurance-cost',
        algorithmId: 'lasso-regression',
        datasetVersionId: 'ds-insurance-cost-v1',
        configHash: '8'.repeat(64),
        config: insuranceLassoFixture.config,
      },
      {
        onProgress: () => undefined,
        shouldCancel: () => false,
      },
    );

    expectGoldenFixture(result, 'run-insurance-lasso', insuranceLassoFixture);
    expect(result.textAlternative?.vi).toEqual(expect.stringContaining('MAE'));
  });

  it('runs pg-spam-detection logistic regression through the registry and matches the golden fixture', async () => {
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-spam-detection',
      algorithmId: 'logistic-regression',
      datasetVersionId: 'ds-sms-spam-v1',
    });

    if (!adapter) {
      throw new Error('Expected pg-spam-detection/logistic-regression adapter to be registered.');
    }

    const result = await adapter.run(
      {
        runId: 'run-spam-logistic',
        sessionId: 'session-spam-logistic',
        scenarioId: 'pg-spam-detection',
        algorithmId: 'logistic-regression',
        datasetVersionId: 'ds-sms-spam-v1',
        configHash: '8'.repeat(64),
        config: spamLogisticFixture.config,
      },
      {
        onProgress: () => undefined,
        shouldCancel: () => false,
      },
    );

    expectGoldenFixture(result, 'run-spam-logistic', spamLogisticFixture);
    expect(result.textAlternative?.vi).toEqual(expect.stringContaining('F1'));
  });

  it('runs pg-spam-detection Naive Bayes through the registry and matches the golden fixture', async () => {
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-spam-detection',
      algorithmId: 'naive-bayes',
      datasetVersionId: 'ds-sms-spam-v1',
    });

    if (!adapter) {
      throw new Error('Expected pg-spam-detection/naive-bayes adapter to be registered.');
    }

    const result = await adapter.run(
      {
        runId: 'run-spam-naive-bayes',
        sessionId: 'session-spam-naive-bayes',
        scenarioId: 'pg-spam-detection',
        algorithmId: 'naive-bayes',
        datasetVersionId: 'ds-sms-spam-v1',
        configHash: '8'.repeat(64),
        config: spamNaiveBayesFixture.config,
      },
      {
        onProgress: () => undefined,
        shouldCancel: () => false,
      },
    );

    expectGoldenFixture(result, 'run-spam-naive-bayes', spamNaiveBayesFixture);
    expect(result.textAlternative?.vi).toEqual(expect.stringContaining('F1'));
  });

  it('runs pg-customer-churn KNN through the registry and matches the golden fixture', async () => {
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-customer-churn',
      algorithmId: 'knn',
      datasetVersionId: 'ds-customer-churn-v1',
    });

    if (!adapter) {
      throw new Error('Expected pg-customer-churn/knn adapter to be registered.');
    }

    const result = await adapter.run(
      {
        runId: 'run-churn-knn',
        sessionId: 'session-churn-knn',
        scenarioId: 'pg-customer-churn',
        algorithmId: 'knn',
        datasetVersionId: 'ds-customer-churn-v1',
        configHash: '8'.repeat(64),
        config: churnKnnFixture.config,
      },
      {
        onProgress: () => undefined,
        shouldCancel: () => false,
      },
    );

    expectGoldenFixture(result, 'run-churn-knn', churnKnnFixture);
    expect(result.textAlternative?.vi).toEqual(expect.stringContaining('F1'));
  });

  it('runs pg-customer-churn Random Forest through the registry and matches the golden fixture', async () => {
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-customer-churn',
      algorithmId: 'random-forest',
      datasetVersionId: 'ds-customer-churn-v1',
    });

    if (!adapter) {
      throw new Error('Expected pg-customer-churn/random-forest adapter to be registered.');
    }

    const result = await adapter.run(
      {
        runId: 'run-churn-forest',
        sessionId: 'session-churn-forest',
        scenarioId: 'pg-customer-churn',
        algorithmId: 'random-forest',
        datasetVersionId: 'ds-customer-churn-v1',
        configHash: '8'.repeat(64),
        config: churnForestFixture.config,
      },
      {
        onProgress: () => undefined,
        shouldCancel: () => false,
      },
    );

    expectGoldenFixture(result, 'run-churn-forest', churnForestFixture);
    expect(result.textAlternative?.vi).toEqual(expect.stringContaining('F1'));
  });

  it('runs pg-credit-risk logistic regression through the registry and matches the golden fixture', async () => {
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-credit-risk',
      algorithmId: 'logistic-regression',
      datasetVersionId: 'ds-credit-risk-v1',
    });

    if (!adapter) {
      throw new Error('Expected pg-credit-risk/logistic-regression adapter to be registered.');
    }

    const result = await adapter.run(
      {
        runId: 'run-credit-logistic',
        sessionId: 'session-credit-logistic',
        scenarioId: 'pg-credit-risk',
        algorithmId: 'logistic-regression',
        datasetVersionId: 'ds-credit-risk-v1',
        configHash: '8'.repeat(64),
        config: creditLogisticFixture.config,
      },
      {
        onProgress: () => undefined,
        shouldCancel: () => false,
      },
    );

    expectGoldenFixture(result, 'run-credit-logistic', creditLogisticFixture);
    expect(result.textAlternative?.vi).toEqual(expect.stringContaining('recall'));
  });

  it('runs pg-wine-cultivar Naive Bayes through the registry and matches the golden fixture', async () => {
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-wine-cultivar',
      algorithmId: 'naive-bayes',
      datasetVersionId: 'ds-wine-cultivar-v1',
    });

    if (!adapter) {
      throw new Error('Expected pg-wine-cultivar/naive-bayes adapter to be registered.');
    }

    const result = await adapter.run(
      {
        runId: 'run-wine-naive-bayes',
        sessionId: 'session-wine-naive-bayes',
        scenarioId: 'pg-wine-cultivar',
        algorithmId: 'naive-bayes',
        datasetVersionId: 'ds-wine-cultivar-v1',
        configHash: '8'.repeat(64),
        config: wineNaiveBayesFixture.config,
      },
      {
        onProgress: () => undefined,
        shouldCancel: () => false,
      },
    );

    expectGoldenFixture(result, 'run-wine-naive-bayes', wineNaiveBayesFixture);
    expect(result.textAlternative?.vi).toEqual(expect.stringContaining('macro-F1'));
  });

  it('runs pg-credit-risk SVM through the registry and matches the golden fixture', async () => {
    libsvmMock.free.mockClear();
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-credit-risk',
      algorithmId: 'svm',
      datasetVersionId: 'ds-credit-risk-v1',
    });

    if (!adapter) {
      throw new Error('Expected pg-credit-risk/svm adapter to be registered.');
    }

    const result = await adapter.run(
      {
        runId: 'run-credit-svm',
        sessionId: 'session-credit-svm',
        scenarioId: 'pg-credit-risk',
        algorithmId: 'svm',
        datasetVersionId: 'ds-credit-risk-v1',
        configHash: '8'.repeat(64),
        config: creditSvmFixture.config,
      },
      {
        onProgress: () => undefined,
        shouldCancel: () => false,
      },
    );

    expectGoldenFixture(result, 'run-credit-svm', creditSvmFixture);
    expect(libsvmMock.free).toHaveBeenCalledTimes(1);
    expect(result.textAlternative?.vi).toEqual(expect.stringContaining('recall'));
  });

  it('runs pg-credit-risk decision tree through the registry and matches the golden fixture', async () => {
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-credit-risk',
      algorithmId: 'decision-tree',
      datasetVersionId: 'ds-credit-risk-v1',
    });

    if (!adapter) {
      throw new Error('Expected pg-credit-risk/decision-tree adapter to be registered.');
    }

    const result = await adapter.run(
      {
        runId: 'run-credit-tree',
        sessionId: 'session-credit-tree',
        scenarioId: 'pg-credit-risk',
        algorithmId: 'decision-tree',
        datasetVersionId: 'ds-credit-risk-v1',
        configHash: '8'.repeat(64),
        config: creditTreeFixture.config,
      },
      {
        onProgress: () => undefined,
        shouldCancel: () => false,
      },
    );

    expectGoldenFixture(result, 'run-credit-tree', creditTreeFixture);
    expect(result.textAlternative?.vi).toEqual(expect.stringContaining('recall'));
  });

  it('runs pg-retail-segments K-Means through the registry and matches the golden fixture', async () => {
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-retail-segments',
      algorithmId: 'kmeans',
      datasetVersionId: 'ds-retail-segments-v1',
    });

    if (!adapter) {
      throw new Error('Expected pg-retail-segments/kmeans adapter to be registered.');
    }

    const result = await adapter.run(
      {
        runId: 'run-retail-kmeans',
        sessionId: 'session-retail-kmeans',
        scenarioId: 'pg-retail-segments',
        algorithmId: 'kmeans',
        datasetVersionId: 'ds-retail-segments-v1',
        configHash: '8'.repeat(64),
        config: retailKMeansFixture.config,
      },
      {
        onProgress: () => undefined,
        shouldCancel: () => false,
      },
    );

    expectGoldenFixture(result, 'run-retail-kmeans', retailKMeansFixture);
    expect(result.textAlternative?.vi).toEqual(expect.stringContaining('silhouette'));
  });

  it('runs pg-retail-segments hierarchical clustering through the registry and matches the golden fixture', async () => {
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-retail-segments',
      algorithmId: 'hierarchical-clustering',
      datasetVersionId: 'ds-retail-segments-v1',
    });

    if (!adapter) {
      throw new Error(
        'Expected pg-retail-segments/hierarchical-clustering adapter to be registered.',
      );
    }

    const result = await adapter.run(
      {
        runId: 'run-retail-hierarchical',
        sessionId: 'session-retail-hierarchical',
        scenarioId: 'pg-retail-segments',
        algorithmId: 'hierarchical-clustering',
        datasetVersionId: 'ds-retail-segments-v1',
        configHash: '8'.repeat(64),
        config: retailHierarchicalFixture.config,
      },
      {
        onProgress: () => undefined,
        shouldCancel: () => false,
      },
    );

    expectGoldenFixture(result, 'run-retail-hierarchical', retailHierarchicalFixture);
    expect(result.textAlternative?.vi).toEqual(expect.stringContaining('silhouette'));
  });

  it('runs pg-country-indicators PCA through the registry and matches the golden fixture', async () => {
    const adapter = resolveAlgorithmAdapter({
      scenarioId: 'pg-country-indicators',
      algorithmId: 'pca',
      datasetVersionId: 'ds-country-indicators-v1',
    });

    if (!adapter) {
      throw new Error('Expected pg-country-indicators/pca adapter to be registered.');
    }

    const result = await adapter.run(
      {
        runId: 'run-country-pca',
        sessionId: 'session-country-pca',
        scenarioId: 'pg-country-indicators',
        algorithmId: 'pca',
        datasetVersionId: 'ds-country-indicators-v1',
        configHash: '8'.repeat(64),
        config: countryPcaFixture.config,
      },
      {
        onProgress: () => undefined,
        shouldCancel: () => false,
      },
    );

    expectGoldenFixture(result, 'run-country-pca', countryPcaFixture);
    expect(result.textAlternative?.vi).toEqual(expect.stringContaining('phương sai'));
  });

  it(
    'runs pg-xor MLP through the registry and matches the golden fixture',
    async () => {
      const adapter = resolveAlgorithmAdapter({
        scenarioId: 'pg-xor',
        algorithmId: 'mlp',
        datasetVersionId: 'ds-xor-noisy-v1',
      });

      if (!adapter) {
        throw new Error('Expected pg-xor/mlp adapter to be registered.');
      }

      const progressEpochs: number[] = [];
      const result = await adapter.run(
        {
          runId: 'run-xor-mlp',
          sessionId: 'session-xor-mlp',
          scenarioId: 'pg-xor',
          algorithmId: 'mlp',
          datasetVersionId: 'ds-xor-noisy-v1',
          configHash: '8'.repeat(64),
          config: xorMlpFixture.config,
        },
        {
          onProgress: (event) => {
            if (typeof event.epoch === 'number') {
              progressEpochs.push(event.epoch);
            }
          },
          shouldCancel: () => false,
        },
      );

      expectGoldenFixture(result, 'run-xor-mlp', xorMlpFixture);
      expect(progressEpochs[0]).toBe(1);
      expect(progressEpochs.at(-1)).toBe(300);
    },
    TENSORFLOW_GOLDEN_FIXTURE_TIMEOUT_MS,
  );
});
