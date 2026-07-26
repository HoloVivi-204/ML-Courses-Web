import { createHash } from 'node:crypto';

import { ApiError } from './api-error.js';

export type PlaygroundDeviceProfile = 'desktop' | 'mobile';
export type PlaygroundConfig = Record<string, unknown>;
export type PlaygroundMetricValue = number | null;
export type PlaygroundMetrics = Record<string, PlaygroundMetricValue>;

export interface PerceptronPlaygroundConfig {
  epochs: number;
  learningRate: number;
  seed: number;
  trainRatio: number;
}

export interface PlaygroundPairManifest {
  adapterVersion: string;
  algorithmId: string;
  configSchemaVersion: 1;
  datasetVersionId: string;
  defaultConfig: PlaygroundConfig;
  desktopLimits: Record<string, number>;
  feedbackRules: readonly string[];
  goldenFixture: string;
  implementationStatus?: undefined;
  mobileLimits: Record<string, number>;
  optionalMetrics?: readonly string[];
  owner?: undefined;
  preprocessing: readonly string[];
  primaryMetric: string;
  scenarioId: string;
  scopePriority: 'must';
  secondaryMetrics: readonly string[];
  visualizations: readonly string[];
}

interface NormalizePlaygroundConfigInput {
  algorithmId: string;
  config: unknown;
  datasetVersionId: string;
  deviceProfile: PlaygroundDeviceProfile;
  scenarioId: string;
}

interface HashPlaygroundConfigInput {
  algorithmId: string;
  config: PlaygroundConfig;
  datasetVersionId: string;
  scenarioId: string;
}

const SUBMISSION_PAIR_MANIFESTS = [
  {
    adapterVersion: 'perceptron-js-v1',
    algorithmId: 'perceptron',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-xor-noisy-v1',
    defaultConfig: {
      learningRate: 0.1,
      epochs: 100,
      trainRatio: 0.75,
      seed: 42,
    },
    desktopLimits: { epochs: 500 },
    feedbackRules: ['linear-limit', 'non-convergence'],
    goldenFixture: 'fixtures/xor-perceptron-v1.json',
    mobileLimits: { epochs: 200 },
    preprocessing: [],
    primaryMetric: 'accuracy',
    scenarioId: 'pg-xor',
    scopePriority: 'must',
    optionalMetrics: ['testAccuracy', 'trainAccuracy'],
    secondaryMetrics: ['loss'],
    visualizations: ['decision-boundary', 'loss'],
  },
  {
    adapterVersion: 'mlp-js-v1',
    algorithmId: 'mlp',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-xor-noisy-v1',
    defaultConfig: {
      hiddenLayers: [4],
      activation: 'tanh',
      learningRate: 0.05,
      epochs: 300,
      trainRatio: 0.75,
      seed: 42,
    },
    desktopLimits: { layers: 3, neurons: 32, epochs: 1000 },
    feedbackRules: ['underfit', 'overfit', 'non-convergence'],
    goldenFixture: 'fixtures/xor-mlp-v1.json',
    mobileLimits: { layers: 2, neurons: 16, epochs: 500 },
    preprocessing: [],
    primaryMetric: 'accuracy',
    scenarioId: 'pg-xor',
    scopePriority: 'must',
    secondaryMetrics: ['loss'],
    visualizations: ['decision-boundary', 'loss'],
  },
  {
    adapterVersion: 'linear-regression-js-v1',
    algorithmId: 'linear-regression',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-house-price-v1',
    defaultConfig: {
      fitIntercept: true,
      trainRatio: 0.8,
      seed: 42,
    },
    desktopLimits: { rows: 10_000 },
    feedbackRules: ['underfit', 'residual-bias'],
    goldenFixture: 'fixtures/house-linear-v1.json',
    mobileLimits: { rows: 3000 },
    preprocessing: ['median-impute', 'standard-scale'],
    primaryMetric: 'rmse',
    scenarioId: 'pg-house-price',
    scopePriority: 'must',
    secondaryMetrics: ['r2', 'mae'],
    visualizations: ['actual-vs-predicted', 'residual'],
  },
  {
    adapterVersion: 'ridge-regression-js-v1',
    algorithmId: 'ridge-regression',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-house-price-v1',
    defaultConfig: {
      alpha: 1,
      trainRatio: 0.8,
      seed: 42,
    },
    desktopLimits: { rows: 10_000, alpha: 100 },
    feedbackRules: ['underfit', 'regularization'],
    goldenFixture: 'fixtures/house-ridge-v1.json',
    mobileLimits: { rows: 3000, alpha: 100 },
    preprocessing: ['median-impute', 'standard-scale'],
    primaryMetric: 'rmse',
    scenarioId: 'pg-house-price',
    scopePriority: 'must',
    secondaryMetrics: ['r2', 'mae'],
    visualizations: ['residual', 'coefficient'],
  },
  {
    adapterVersion: 'polynomial-regression-js-v1',
    algorithmId: 'polynomial-regression',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-insurance-cost-v1',
    defaultConfig: {
      degree: 2,
      trainRatio: 0.8,
      seed: 42,
    },
    desktopLimits: { rows: 10_000, degree: 5 },
    feedbackRules: ['underfit', 'overfit'],
    goldenFixture: 'fixtures/insurance-polynomial-v1.json',
    mobileLimits: { rows: 3000, degree: 3 },
    preprocessing: ['one-hot', 'standard-scale'],
    primaryMetric: 'mae',
    scenarioId: 'pg-insurance-cost',
    scopePriority: 'must',
    secondaryMetrics: ['rmse', 'r2'],
    visualizations: ['feature-slice', 'actual-vs-predicted', 'residual'],
  },
  {
    adapterVersion: 'lasso-regression-js-v1',
    algorithmId: 'lasso-regression',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-insurance-cost-v1',
    defaultConfig: {
      alpha: 0.1,
      trainRatio: 0.8,
      seed: 42,
    },
    desktopLimits: { rows: 10_000, alpha: 100 },
    feedbackRules: ['underfit', 'sparsity'],
    goldenFixture: 'fixtures/insurance-lasso-v1.json',
    mobileLimits: { rows: 3000, alpha: 100 },
    preprocessing: ['one-hot', 'standard-scale'],
    primaryMetric: 'mae',
    scenarioId: 'pg-insurance-cost',
    scopePriority: 'must',
    secondaryMetrics: ['rmse', 'r2'],
    visualizations: ['residual', 'coefficient'],
  },
  {
    adapterVersion: 'logistic-regression-js-v1',
    algorithmId: 'logistic-regression',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-sms-spam-v1',
    defaultConfig: {
      learningRate: 0.05,
      epochs: 300,
      threshold: 0.5,
      trainRatio: 0.8,
      seed: 42,
    },
    desktopLimits: { features: 5000 },
    feedbackRules: ['threshold', 'imbalance', 'overfit'],
    goldenFixture: 'fixtures/spam-logistic-v1.json',
    mobileLimits: { features: 2000 },
    preprocessing: ['tokenize', 'tfidf'],
    primaryMetric: 'f1',
    scenarioId: 'pg-spam-detection',
    scopePriority: 'must',
    secondaryMetrics: ['precision', 'recall'],
    visualizations: ['confusion-matrix', 'loss'],
  },
  {
    adapterVersion: 'naive-bayes-js-v1',
    algorithmId: 'naive-bayes',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-sms-spam-v1',
    defaultConfig: {
      alpha: 1,
      trainRatio: 0.8,
      seed: 42,
    },
    desktopLimits: { features: 10_000, alpha: 100 },
    feedbackRules: ['imbalance', 'smoothing'],
    goldenFixture: 'fixtures/spam-naive-bayes-v1.json',
    mobileLimits: { features: 3000, alpha: 100 },
    preprocessing: ['tokenize', 'count-vector'],
    primaryMetric: 'f1',
    scenarioId: 'pg-spam-detection',
    scopePriority: 'must',
    secondaryMetrics: ['precision', 'recall'],
    visualizations: ['confusion-matrix', 'class-error'],
  },
  {
    adapterVersion: 'decision-tree-js-v1',
    algorithmId: 'decision-tree',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-credit-risk-v1',
    defaultConfig: {
      maxDepth: 5,
      minSamplesLeaf: 5,
      trainRatio: 0.8,
      seed: 42,
    },
    desktopLimits: { depth: 15 },
    feedbackRules: ['underfit', 'overfit', 'imbalance'],
    goldenFixture: 'fixtures/credit-tree-v1.json',
    mobileLimits: { depth: 8 },
    preprocessing: ['impute', 'ordinal-encode'],
    primaryMetric: 'recall',
    scenarioId: 'pg-credit-risk',
    scopePriority: 'must',
    secondaryMetrics: ['f1', 'precision'],
    visualizations: ['confusion-matrix', 'tree'],
  },
  {
    adapterVersion: 'logistic-regression-js-v1',
    algorithmId: 'logistic-regression',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-credit-risk-v1',
    defaultConfig: {
      learningRate: 0.05,
      epochs: 300,
      threshold: 0.4,
      trainRatio: 0.8,
      seed: 42,
    },
    desktopLimits: { rows: 10_000 },
    feedbackRules: ['threshold', 'imbalance'],
    goldenFixture: 'fixtures/credit-logistic-v1.json',
    mobileLimits: { rows: 3000 },
    preprocessing: ['impute', 'one-hot', 'standard-scale'],
    primaryMetric: 'recall',
    scenarioId: 'pg-credit-risk',
    scopePriority: 'must',
    secondaryMetrics: ['f1', 'precision', 'auc'],
    visualizations: ['confusion-matrix', 'roc'],
  },
  {
    adapterVersion: 'svm-js-v1',
    algorithmId: 'svm',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-credit-risk-v1',
    defaultConfig: {
      kernel: 'rbf',
      c: 1,
      gamma: 'scale',
      trainRatio: 0.8,
      seed: 42,
    },
    desktopLimits: { rows: 5000, c: 100 },
    feedbackRules: ['margin', 'imbalance'],
    goldenFixture: 'fixtures/credit-svm-v1.json',
    mobileLimits: { rows: 1500, c: 100 },
    preprocessing: ['impute', 'one-hot', 'standard-scale'],
    primaryMetric: 'recall',
    scenarioId: 'pg-credit-risk',
    scopePriority: 'must',
    secondaryMetrics: ['f1', 'precision'],
    visualizations: ['confusion-matrix'],
  },
  {
    adapterVersion: 'naive-bayes-js-v1',
    algorithmId: 'naive-bayes',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-wine-cultivar-v1',
    defaultConfig: {
      smoothing: 0.000000001,
      trainRatio: 0.8,
      seed: 42,
    },
    desktopLimits: { features: 100, smoothing: 1 },
    feedbackRules: ['class-overlap'],
    goldenFixture: 'fixtures/wine-naive-bayes-v1.json',
    mobileLimits: { features: 100, smoothing: 1 },
    preprocessing: ['standard-scale'],
    primaryMetric: 'macro-f1',
    scenarioId: 'pg-wine-cultivar',
    scopePriority: 'must',
    secondaryMetrics: ['accuracy'],
    visualizations: ['confusion-matrix', 'class-error'],
  },
  {
    adapterVersion: 'knn-js-v1',
    algorithmId: 'knn',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-customer-churn-v1',
    defaultConfig: {
      k: 7,
      distance: 'euclidean',
      trainRatio: 0.8,
      seed: 42,
    },
    desktopLimits: { k: 50 },
    feedbackRules: ['underfit', 'overfit', 'imbalance'],
    goldenFixture: 'fixtures/churn-knn-v1.json',
    mobileLimits: { k: 25 },
    preprocessing: ['impute', 'one-hot', 'standard-scale'],
    primaryMetric: 'f1',
    scenarioId: 'pg-customer-churn',
    scopePriority: 'must',
    secondaryMetrics: ['auc', 'precision', 'recall'],
    visualizations: ['confusion-matrix', 'k-curve'],
  },
  {
    adapterVersion: 'random-forest-js-v1',
    algorithmId: 'random-forest',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-customer-churn-v1',
    defaultConfig: {
      trees: 50,
      maxDepth: 6,
      trainRatio: 0.8,
      seed: 42,
    },
    desktopLimits: { trees: 200, depth: 15 },
    feedbackRules: ['underfit', 'overfit', 'imbalance'],
    goldenFixture: 'fixtures/churn-forest-v1.json',
    mobileLimits: { trees: 50, depth: 8 },
    preprocessing: ['impute', 'ordinal-encode'],
    primaryMetric: 'f1',
    scenarioId: 'pg-customer-churn',
    scopePriority: 'must',
    secondaryMetrics: ['auc', 'precision', 'recall'],
    visualizations: ['confusion-matrix', 'importance'],
  },
  {
    adapterVersion: 'kmeans-js-v1',
    algorithmId: 'kmeans',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-retail-segments-v1',
    defaultConfig: {
      k: 4,
      maxIterations: 100,
      seed: 42,
    },
    desktopLimits: { k: 10 },
    feedbackRules: ['too-few-clusters', 'too-many-clusters'],
    goldenFixture: 'fixtures/retail-kmeans-v1.json',
    mobileLimits: { k: 8 },
    preprocessing: ['median-impute', 'standard-scale'],
    primaryMetric: 'silhouette',
    scenarioId: 'pg-retail-segments',
    scopePriority: 'must',
    secondaryMetrics: ['inertia'],
    visualizations: ['cluster-plot', 'elbow'],
  },
  {
    adapterVersion: 'pca-js-v1',
    algorithmId: 'pca',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-country-indicators-v1',
    defaultConfig: {
      components: 2,
      scale: true,
    },
    desktopLimits: { components: 2, features: 100 },
    feedbackRules: ['low-variance', 'scale-warning'],
    goldenFixture: 'fixtures/country-pca-v1.json',
    mobileLimits: { components: 2, features: 50 },
    preprocessing: ['median-impute', 'standard-scale'],
    primaryMetric: 'explained-variance',
    scenarioId: 'pg-country-indicators',
    scopePriority: 'must',
    secondaryMetrics: ['reconstruction-error'],
    visualizations: ['projection-2d', 'loading'],
  },
] satisfies readonly PlaygroundPairManifest[];

const DISABLED_SCENARIO_PAIR_KEYS = new Set([
  'pg-house-price/polynomial-regression',
  'pg-house-price/lasso-regression',
  'pg-insurance-cost/linear-regression',
  'pg-insurance-cost/ridge-regression',
  'pg-customer-churn/logistic-regression',
  'pg-customer-churn/decision-tree',
  'pg-customer-churn/svm',
  'pg-credit-risk/knn',
  'pg-credit-risk/random-forest',
  'pg-wine-cultivar/knn',
  'pg-wine-cultivar/decision-tree',
  'pg-wine-cultivar/random-forest',
  'pg-wine-cultivar/svm',
]);

export const xorPerceptronManifest = SUBMISSION_PAIR_MANIFESTS[0];

export function getSubmissionPlaygroundPairManifests(): readonly PlaygroundPairManifest[] {
  return SUBMISSION_PAIR_MANIFESTS;
}

export function assertSupportedPlaygroundPair(input: {
  algorithmId: string;
  datasetVersionId: string;
  scenarioId: string;
}): PlaygroundPairManifest {
  const manifest = SUBMISSION_PAIR_MANIFESTS.find(
    (candidate) =>
      candidate.scenarioId === input.scenarioId &&
      candidate.algorithmId === input.algorithmId &&
      candidate.datasetVersionId === input.datasetVersionId,
  );

  if (manifest) {
    return manifest;
  }

  if (DISABLED_SCENARIO_PAIR_KEYS.has(createPairKey(input))) {
    throw new ApiError(
      404,
      'PLAYGROUND_PAIR_DISABLED',
      'This scenario and algorithm pair is disabled in the baseline manifest.',
      [input],
    );
  }

  throw new ApiError(
    400,
    'PLAYGROUND_PAIR_UNSUPPORTED',
    'This scenario, algorithm, and dataset pair is not supported.',
    [input],
  );
}

export function normalizePlaygroundConfig(input: NormalizePlaygroundConfigInput): PlaygroundConfig {
  const manifest = assertSupportedPlaygroundPair(input);

  if (manifest.algorithmId === 'perceptron') {
    return normalizePerceptronConfig(
      input.config,
      input.deviceProfile,
    ) as unknown as PlaygroundConfig;
  }

  if (manifest.algorithmId === 'mlp') {
    return normalizeMlpConfig(input.config, manifest, input.deviceProfile);
  }

  if (manifest.algorithmId === 'linear-regression') {
    return normalizeLinearRegressionConfig(input.config);
  }

  if (manifest.algorithmId === 'ridge-regression') {
    return normalizeRidgeRegressionConfig(input.config, manifest, input.deviceProfile);
  }

  if (manifest.algorithmId === 'polynomial-regression') {
    return normalizePolynomialRegressionConfig(input.config, manifest, input.deviceProfile);
  }

  if (manifest.algorithmId === 'lasso-regression') {
    return normalizeLassoRegressionConfig(input.config, manifest, input.deviceProfile);
  }

  if (manifest.algorithmId === 'logistic-regression') {
    return normalizeLogisticRegressionConfig(input.config);
  }

  if (manifest.algorithmId === 'naive-bayes') {
    return normalizeNaiveBayesConfig(input.config, manifest, input.deviceProfile);
  }

  if (manifest.algorithmId === 'decision-tree') {
    return normalizeDecisionTreeConfig(input.config, manifest, input.deviceProfile);
  }

  if (manifest.algorithmId === 'knn') {
    return normalizeKnnConfig(input.config, manifest, input.deviceProfile);
  }

  if (manifest.algorithmId === 'random-forest') {
    return normalizeRandomForestConfig(input.config, manifest, input.deviceProfile);
  }

  if (manifest.algorithmId === 'svm') {
    return normalizeSvmConfig(input.config, manifest, input.deviceProfile);
  }

  if (manifest.algorithmId === 'kmeans') {
    return normalizeKMeansConfig(input.config, manifest, input.deviceProfile);
  }

  if (manifest.algorithmId === 'pca') {
    return normalizePcaConfig(input.config, manifest, input.deviceProfile);
  }

  throw new ApiError(
    400,
    'PLAYGROUND_CONFIG_INVALID',
    'No parameter validator exists for this pair.',
  );
}

export function normalizePerceptronPlaygroundConfig(
  value: unknown,
  deviceProfile: PlaygroundDeviceProfile,
): PerceptronPlaygroundConfig {
  return normalizePlaygroundConfig({
    algorithmId: 'perceptron',
    config: value,
    datasetVersionId: 'ds-xor-noisy-v1',
    deviceProfile,
    scenarioId: 'pg-xor',
  }) as unknown as PerceptronPlaygroundConfig;
}

export function hashPlaygroundConfig(input: HashPlaygroundConfigInput): string {
  assertSupportedPlaygroundPair(input);

  return createHash('sha256').update(stableStringify(input.config)).digest('hex');
}

export function hashPerceptronPlaygroundConfig(config: PerceptronPlaygroundConfig): string {
  return hashPlaygroundConfig({
    algorithmId: 'perceptron',
    config: config as unknown as PlaygroundConfig,
    datasetVersionId: 'ds-xor-noisy-v1',
    scenarioId: 'pg-xor',
  });
}

export function getPlaygroundMetricIds(manifest: PlaygroundPairManifest): readonly string[] {
  return [manifest.primaryMetric, ...manifest.secondaryMetrics];
}

export function getAllowedPlaygroundMetricIds(manifest: PlaygroundPairManifest): readonly string[] {
  return [...getPlaygroundMetricIds(manifest), ...(manifest.optionalMetrics ?? [])];
}

function normalizePerceptronConfig(
  value: unknown,
  deviceProfile: PlaygroundDeviceProfile,
): PerceptronPlaygroundConfig {
  assertAllowedConfigFields(value, ['epochs', 'learningRate', 'seed', 'trainRatio']);

  const config = value as Record<string, unknown>;
  const maxEpochs = deviceProfile === 'mobile' ? 200 : 500;

  return {
    learningRate: getNumberInRange(config, 'learningRate', 0.0001, 1),
    epochs: getIntegerInRange(config, 'epochs', 10, maxEpochs),
    trainRatio: getNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: getIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

function normalizeMlpConfig(
  value: unknown,
  manifest: PlaygroundPairManifest,
  deviceProfile: PlaygroundDeviceProfile,
): PlaygroundConfig {
  assertAllowedConfigFields(value, [
    'activation',
    'epochs',
    'hiddenLayers',
    'learningRate',
    'seed',
    'trainRatio',
  ]);

  const config = value as Record<string, unknown>;
  const limits = deviceProfile === 'mobile' ? manifest.mobileLimits : manifest.desktopLimits;
  const hiddenLayers = getHiddenLayers(
    config.hiddenLayers,
    getManifestLimit(limits, 'layers'),
    getManifestLimit(limits, 'neurons'),
  );

  return {
    hiddenLayers,
    activation: getEnumValue(config.activation, 'activation', ['relu', 'sigmoid', 'tanh']),
    learningRate: getNumberInRange(config, 'learningRate', 0.0001, 1),
    epochs: getIntegerInRange(config, 'epochs', 10, getManifestLimit(limits, 'epochs')),
    trainRatio: getNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: getIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

function normalizeLinearRegressionConfig(value: unknown): PlaygroundConfig {
  assertAllowedConfigFields(value, ['fitIntercept', 'seed', 'trainRatio']);

  const config = value as Record<string, unknown>;

  return {
    fitIntercept: getBoolean(config, 'fitIntercept'),
    trainRatio: getNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: getIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

function normalizeRidgeRegressionConfig(
  value: unknown,
  manifest: PlaygroundPairManifest,
  deviceProfile: PlaygroundDeviceProfile,
): PlaygroundConfig {
  const config = value as Record<string, unknown>;
  const limits = deviceProfile === 'mobile' ? manifest.mobileLimits : manifest.desktopLimits;

  assertAllowedConfigFields(value, ['alpha', 'seed', 'trainRatio']);

  return {
    alpha: getNumberInRange(config, 'alpha', 0.0001, getManifestLimit(limits, 'alpha')),
    trainRatio: getNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: getIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

function normalizePolynomialRegressionConfig(
  value: unknown,
  manifest: PlaygroundPairManifest,
  deviceProfile: PlaygroundDeviceProfile,
): PlaygroundConfig {
  assertAllowedConfigFields(value, ['degree', 'seed', 'trainRatio']);

  const config = value as Record<string, unknown>;
  const limits = deviceProfile === 'mobile' ? manifest.mobileLimits : manifest.desktopLimits;

  return {
    degree: getIntegerInRange(config, 'degree', 1, getManifestLimit(limits, 'degree')),
    trainRatio: getNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: getIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

function normalizeLassoRegressionConfig(
  value: unknown,
  manifest: PlaygroundPairManifest,
  deviceProfile: PlaygroundDeviceProfile,
): PlaygroundConfig {
  assertAllowedConfigFields(value, ['alpha', 'seed', 'trainRatio']);

  const config = value as Record<string, unknown>;
  const limits = deviceProfile === 'mobile' ? manifest.mobileLimits : manifest.desktopLimits;

  return {
    alpha: getNumberInRange(config, 'alpha', 0.0001, getManifestLimit(limits, 'alpha')),
    trainRatio: getNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: getIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

function normalizeLogisticRegressionConfig(value: unknown): PlaygroundConfig {
  assertAllowedConfigFields(value, ['epochs', 'learningRate', 'seed', 'threshold', 'trainRatio']);

  const config = value as Record<string, unknown>;

  return {
    learningRate: getNumberInRange(config, 'learningRate', 0.0001, 1),
    epochs: getIntegerInRange(config, 'epochs', 10, 2000),
    threshold: getNumberInRange(config, 'threshold', 0, 1),
    trainRatio: getNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: getIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

function normalizeNaiveBayesConfig(
  value: unknown,
  manifest: PlaygroundPairManifest,
  deviceProfile: PlaygroundDeviceProfile,
): PlaygroundConfig {
  const config = value as Record<string, unknown>;
  const limits = deviceProfile === 'mobile' ? manifest.mobileLimits : manifest.desktopLimits;

  if (manifest.scenarioId === 'pg-wine-cultivar') {
    assertAllowedConfigFields(value, ['seed', 'smoothing', 'trainRatio']);

    return {
      smoothing: getNumberInRange(
        config,
        'smoothing',
        0.000000000001,
        getManifestLimit(limits, 'smoothing'),
      ),
      trainRatio: getNumberInRange(config, 'trainRatio', 0.5, 0.9),
      seed: getIntegerInRange(config, 'seed', 0, 1_000_000),
    };
  }

  assertAllowedConfigFields(value, ['alpha', 'seed', 'trainRatio']);

  return {
    alpha: getNumberInRange(config, 'alpha', 0.0001, getManifestLimit(limits, 'alpha')),
    trainRatio: getNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: getIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

function normalizeDecisionTreeConfig(
  value: unknown,
  manifest: PlaygroundPairManifest,
  deviceProfile: PlaygroundDeviceProfile,
): PlaygroundConfig {
  assertAllowedConfigFields(value, ['maxDepth', 'minSamplesLeaf', 'seed', 'trainRatio']);

  const config = value as Record<string, unknown>;
  const limits = deviceProfile === 'mobile' ? manifest.mobileLimits : manifest.desktopLimits;

  return {
    maxDepth: getIntegerInRange(config, 'maxDepth', 1, getManifestLimit(limits, 'depth')),
    minSamplesLeaf: getIntegerInRange(config, 'minSamplesLeaf', 1, 50),
    trainRatio: getNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: getIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

function normalizeKnnConfig(
  value: unknown,
  manifest: PlaygroundPairManifest,
  deviceProfile: PlaygroundDeviceProfile,
): PlaygroundConfig {
  assertAllowedConfigFields(value, ['distance', 'k', 'seed', 'trainRatio']);

  const config = value as Record<string, unknown>;
  const limits = deviceProfile === 'mobile' ? manifest.mobileLimits : manifest.desktopLimits;

  return {
    k: getIntegerInRange(config, 'k', 1, getManifestLimit(limits, 'k')),
    distance: getEnumValue(config.distance, 'distance', ['euclidean']),
    trainRatio: getNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: getIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

function normalizeRandomForestConfig(
  value: unknown,
  manifest: PlaygroundPairManifest,
  deviceProfile: PlaygroundDeviceProfile,
): PlaygroundConfig {
  assertAllowedConfigFields(value, ['maxDepth', 'seed', 'trainRatio', 'trees']);

  const config = value as Record<string, unknown>;
  const limits = deviceProfile === 'mobile' ? manifest.mobileLimits : manifest.desktopLimits;

  return {
    trees: getIntegerInRange(config, 'trees', 1, getManifestLimit(limits, 'trees')),
    maxDepth: getIntegerInRange(config, 'maxDepth', 1, getManifestLimit(limits, 'depth')),
    trainRatio: getNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: getIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

function normalizeSvmConfig(
  value: unknown,
  manifest: PlaygroundPairManifest,
  deviceProfile: PlaygroundDeviceProfile,
): PlaygroundConfig {
  assertAllowedConfigFields(value, ['c', 'gamma', 'kernel', 'seed', 'trainRatio']);

  const config = value as Record<string, unknown>;
  const limits = deviceProfile === 'mobile' ? manifest.mobileLimits : manifest.desktopLimits;

  return {
    kernel: getEnumValue(config.kernel, 'kernel', ['rbf']),
    c: getNumberInRange(config, 'c', 0.001, getManifestLimit(limits, 'c')),
    gamma: getEnumValue(config.gamma, 'gamma', ['scale']),
    trainRatio: getNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: getIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

function normalizeKMeansConfig(
  value: unknown,
  manifest: PlaygroundPairManifest,
  deviceProfile: PlaygroundDeviceProfile,
): PlaygroundConfig {
  assertAllowedConfigFields(value, ['k', 'maxIterations', 'seed']);

  const config = value as Record<string, unknown>;
  const limits = deviceProfile === 'mobile' ? manifest.mobileLimits : manifest.desktopLimits;

  return {
    k: getIntegerInRange(config, 'k', 2, getManifestLimit(limits, 'k')),
    maxIterations: getIntegerInRange(config, 'maxIterations', 10, 300),
    seed: getIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

function normalizePcaConfig(
  value: unknown,
  manifest: PlaygroundPairManifest,
  deviceProfile: PlaygroundDeviceProfile,
): PlaygroundConfig {
  assertAllowedConfigFields(value, ['components', 'scale']);

  const config = value as Record<string, unknown>;
  const limits = deviceProfile === 'mobile' ? manifest.mobileLimits : manifest.desktopLimits;

  return {
    components: getIntegerInRange(config, 'components', 2, getManifestLimit(limits, 'components')),
    scale: getBoolean(config, 'scale'),
  };
}

function assertAllowedConfigFields(value: unknown, allowedFields: readonly string[]): void {
  if (!isRecord(value)) {
    throwInvalidConfig('config must be an object.');
  }

  const unsupportedFields = Object.keys(value).filter((field) => !allowedFields.includes(field));

  if (unsupportedFields.length > 0) {
    throwInvalidConfig(`Unsupported config fields: ${unsupportedFields.join(', ')}.`);
  }
}

function getBoolean(value: Record<string, unknown>, fieldName: string): boolean {
  const fieldValue = value[fieldName];

  if (typeof fieldValue !== 'boolean') {
    throwInvalidConfig(`${fieldName} must be a boolean.`);
  }

  return fieldValue;
}

function getEnumValue<TValue extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly TValue[],
): TValue {
  if (typeof value !== 'string' || !allowedValues.includes(value as TValue)) {
    throwInvalidConfig(`${fieldName} must be one of: ${allowedValues.join(', ')}.`);
  }

  return value as TValue;
}

function getHiddenLayers(value: unknown, maxLayers: number, maxNeurons: number): readonly number[] {
  if (!Array.isArray(value)) {
    throwInvalidConfig('hiddenLayers must be an array.');
  }

  if (value.length > maxLayers) {
    throwInvalidConfig(`hiddenLayers must include ${maxLayers} layers or fewer.`);
  }

  return value.map((layerSize) => {
    if (!Number.isInteger(layerSize) || layerSize < 1 || layerSize > maxNeurons) {
      throwInvalidConfig(`hiddenLayers entries must be integers between 1 and ${maxNeurons}.`);
    }

    return layerSize;
  });
}

function getManifestLimit(limits: Record<string, number>, limitName: string): number {
  const limitValue = limits[limitName];

  if (typeof limitValue !== 'number' || !Number.isFinite(limitValue)) {
    throwInvalidConfig(`${limitName} limit is missing for this pair.`);
  }

  return limitValue;
}

function getNumberInRange(
  value: Record<string, unknown>,
  fieldName: string,
  minValue: number,
  maxValue: number,
): number {
  const fieldValue = value[fieldName];

  if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue)) {
    throwInvalidConfig(`${fieldName} must be a finite number.`);
  }

  if (fieldValue < minValue || fieldValue > maxValue) {
    throwInvalidConfig(`${fieldName} must be between ${minValue} and ${maxValue}.`);
  }

  return fieldValue;
}

function getIntegerInRange(
  value: Record<string, unknown>,
  fieldName: string,
  minValue: number,
  maxValue: number,
): number {
  const fieldValue = getNumberInRange(value, fieldName, minValue, maxValue);

  if (!Number.isInteger(fieldValue)) {
    throwInvalidConfig(`${fieldName} must be an integer.`);
  }

  return fieldValue;
}

function createPairKey(input: { algorithmId: string; scenarioId: string }): string {
  return `${input.scenarioId}/${input.algorithmId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (isRecord(value)) {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function throwInvalidConfig(message: string): never {
  throw new ApiError(400, 'PLAYGROUND_CONFIG_INVALID', message);
}
