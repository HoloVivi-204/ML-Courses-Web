import type { MlConfig } from './ml-engine-contract';
import type { MlRunRequest } from './ml-worker-protocol';
import {
  runXorPerceptron,
  validateXorPerceptronConfig,
  XorPerceptronCancelledError,
  type XorPerceptronConfig,
} from './xor-perceptron';
import type { AlgorithmAdapter, PlaygroundPairRegistration } from './algorithm-adapter';

const xorPerceptronAdapter: AlgorithmAdapter = {
  adapterVersion: 'perceptron-js-v1',
  algorithmId: 'perceptron',
  configSchemaVersion: 1,
  datasetVersionId: 'ds-xor-noisy-v1',
  scenarioId: 'pg-xor',
  validateConfig(config) {
    const typedConfig = config as unknown as XorPerceptronConfig;

    validateXorPerceptronConfig(typedConfig, 'desktop');

    return typedConfig as unknown as MlConfig;
  },
  async run(request, options) {
    const config = xorPerceptronAdapter.validateConfig(
      request.config,
    ) as unknown as XorPerceptronConfig;

    return runXorPerceptron(config, {
      runId: request.runId,
      onProgress: (event) => options.onProgress(event),
      shouldCancel: options.shouldCancel,
    });
  },
  isCancelledError(error): error is { runId: string } {
    return error instanceof XorPerceptronCancelledError;
  },
};

const playgroundPairRegistry = [
  {
    scenarioId: 'pg-xor',
    algorithmId: 'perceptron',
    datasetVersionId: 'ds-xor-noisy-v1',
    adapterVersion: 'perceptron-js-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      learningRate: 0.1,
      epochs: 100,
      trainRatio: 0.75,
      seed: 42,
    },
    adapter: xorPerceptronAdapter,
  },
  {
    scenarioId: 'pg-xor',
    algorithmId: 'mlp',
    datasetVersionId: 'ds-xor-noisy-v1',
    adapterVersion: 'mlp-js-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      hiddenLayers: [4],
      activation: 'tanh',
      learningRate: 0.05,
      epochs: 300,
      trainRatio: 0.75,
      seed: 42,
    },
    adapter: null,
  },
  {
    scenarioId: 'pg-house-price',
    algorithmId: 'linear-regression',
    datasetVersionId: 'ds-house-price-v1',
    adapterVersion: 'linear-regression-js-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      fitIntercept: true,
      trainRatio: 0.8,
      seed: 42,
    },
    adapter: null,
  },
  {
    scenarioId: 'pg-spam-detection',
    algorithmId: 'logistic-regression',
    datasetVersionId: 'ds-sms-spam-v1',
    adapterVersion: 'logistic-regression-js-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      learningRate: 0.05,
      epochs: 300,
      threshold: 0.5,
      trainRatio: 0.8,
      seed: 42,
    },
    adapter: null,
  },
  {
    scenarioId: 'pg-credit-risk',
    algorithmId: 'decision-tree',
    datasetVersionId: 'ds-credit-risk-v1',
    adapterVersion: 'decision-tree-js-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      maxDepth: 5,
      minSamplesLeaf: 5,
      trainRatio: 0.8,
      seed: 42,
    },
    adapter: null,
  },
  {
    scenarioId: 'pg-retail-segments',
    algorithmId: 'kmeans',
    datasetVersionId: 'ds-retail-segments-v1',
    adapterVersion: 'kmeans-js-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      k: 4,
      maxIterations: 100,
      seed: 42,
    },
    adapter: null,
  },
  {
    scenarioId: 'pg-country-indicators',
    algorithmId: 'pca',
    datasetVersionId: 'ds-country-indicators-v1',
    adapterVersion: 'pca-js-v1',
    configSchemaVersion: 1,
    defaultConfig: {
      components: 2,
      scale: true,
    },
    adapter: null,
  },
] satisfies readonly PlaygroundPairRegistration[];

export function getPlaygroundPairRegistry(): readonly PlaygroundPairRegistration[] {
  return playgroundPairRegistry;
}

export function resolveAlgorithmAdapter(
  request: Pick<MlRunRequest, 'algorithmId' | 'datasetVersionId' | 'scenarioId'>,
): AlgorithmAdapter | null {
  return (
    playgroundPairRegistry.find(
      (entry) =>
        entry.scenarioId === request.scenarioId &&
        entry.algorithmId === request.algorithmId &&
        entry.datasetVersionId === request.datasetVersionId,
    )?.adapter ?? null
  );
}
