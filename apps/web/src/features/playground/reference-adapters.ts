import type { MlConfig, MlMetricValue, MlMetrics, MlRunResult } from './ml-engine-contract';
import type { MlRunRequest } from './ml-worker-protocol';
import type { AlgorithmAdapter, AlgorithmAdapterRunOptions } from './algorithm-adapter';
import type { LibsvmConstructor } from '@libsvm-js/libsvm-js';
import KNN from 'ml-knn';
import { DecisionTreeClassifier } from 'ml-cart';
import { agnes, type Cluster } from 'ml-hclust';
import { kmeans } from 'ml-kmeans';
import { GaussianNB } from 'ml-naivebayes';
import { PCA } from 'ml-pca';
import { RandomForestClassifier } from 'ml-random-forest';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import { initializers, layers, sequential } from '@tensorflow/tfjs-layers';
import {
  getPlaygroundDataset,
  roundMetric,
  splitDatasetRows,
  type PlaygroundDataset,
  type PlaygroundDatasetRow,
} from './playground-datasets';

export class PlaygroundReferenceAdapterCancelledError extends Error {
  constructor(public readonly runId: string) {
    super('The playground reference adapter run was cancelled.');
    this.name = 'PlaygroundReferenceAdapterCancelledError';
  }
}

const LASSO_MAX_ITERATIONS = 250;
let tensorflowBackendReady: Promise<void> | null = null;
let libsvmConstructorPromise: Promise<LibsvmConstructor> | null = null;

interface LinearRegressionConfig {
  fitIntercept: boolean;
  seed: number;
  trainRatio: number;
}

interface RidgeRegressionConfig {
  alpha: number;
  seed: number;
  trainRatio: number;
}

interface PolynomialRegressionConfig {
  degree: number;
  seed: number;
  trainRatio: number;
}

interface LassoRegressionConfig {
  alpha: number;
  seed: number;
  trainRatio: number;
}

interface NaiveBayesConfig {
  seed: number;
  smoothing: number;
  trainRatio: number;
}

interface NaiveBayesAdapterDefinition {
  configField: 'alpha' | 'smoothing';
  datasetVersionId: 'ds-sms-spam-v1' | 'ds-wine-cultivar-v1';
  primaryMetric: 'f1' | 'macro-f1';
  scenarioId: 'pg-spam-detection' | 'pg-wine-cultivar';
}

interface LogisticRegressionConfig {
  epochs: number;
  learningRate: number;
  seed: number;
  threshold: number;
  trainRatio: number;
}

interface LogisticRegressionAdapterDefinition {
  datasetVersionId: 'ds-credit-risk-v1' | 'ds-sms-spam-v1';
  includeAuc: boolean;
  primaryMetric: 'f1' | 'recall';
  scenarioId: 'pg-credit-risk' | 'pg-spam-detection';
}

interface DecisionTreeConfig {
  maxDepth: number;
  minSamplesLeaf: number;
  seed: number;
  trainRatio: number;
}

interface KnnConfig {
  distance: 'euclidean';
  k: number;
  seed: number;
  trainRatio: number;
}

interface RandomForestConfig {
  maxDepth: number;
  seed: number;
  trainRatio: number;
  trees: number;
}

interface SvmConfig {
  c: number;
  gamma: 'scale';
  kernel: 'rbf';
  seed: number;
  trainRatio: number;
}

interface KMeansConfig {
  k: number;
  maxIterations: number;
  seed: number;
}

interface HierarchicalClusteringConfig {
  clusters: number;
  distance: 'euclidean';
  linkage: 'ward';
}

interface PcaConfig {
  components: number;
  scale: boolean;
}

interface MlpConfig {
  activation: 'relu' | 'sigmoid' | 'tanh';
  epochs: number;
  hiddenLayers: readonly number[];
  learningRate: number;
  seed: number;
  trainRatio: number;
}

interface MlpAdapterDefinition {
  datasetVersionId: 'ds-moons-2d-v1' | 'ds-xor-noisy-v1';
  scaleFeatures: boolean;
  scenarioId: 'pg-nonlinear-2d' | 'pg-xor';
}

interface KMeansPoint {
  features: readonly number[];
  rowId: string;
}

interface CartTreeRoot {
  left?: CartTreeRoot | undefined;
  right?: CartTreeRoot | undefined;
  splitColumn?: number | undefined;
  splitValue?: number | undefined;
}

interface CartClassifierInstance {
  predict(features: number[][]): number[];
  root?: CartTreeRoot | undefined;
  train(features: number[][], labels: number[]): void;
}

interface ForestEstimator {
  root?: CartTreeRoot | undefined;
}

interface ForestClassifierInstance {
  estimators?: ForestEstimator[] | undefined;
  indexes?: number[][] | undefined;
  predict(features: number[][]): number[];
  predictProbability(features: number[][], label: number): number[];
  train(features: number[][], labels: number[]): void;
}

export function createLinearRegressionAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'tfjs-core-v1',
    algorithmId: 'linear-regression',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-house-price-v1',
    scenarioId: 'pg-house-price',
    validateConfig(config) {
      return validateLinearRegressionConfig(config) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validateLinearRegressionConfig(request.config);

      return runLinearRegression(request, config, options);
    },
    isCancelledError(error): error is { runId: string } {
      return error instanceof PlaygroundReferenceAdapterCancelledError;
    },
  };
}

export function createRidgeRegressionAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'tfjs-core-v1',
    algorithmId: 'ridge-regression',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-house-price-v1',
    scenarioId: 'pg-house-price',
    validateConfig(config) {
      return validateRidgeRegressionConfig(config) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validateRidgeRegressionConfig(request.config);

      return runRidgeRegression(request, config, options);
    },
    isCancelledError(error): error is { runId: string } {
      return error instanceof PlaygroundReferenceAdapterCancelledError;
    },
  };
}

export function createPolynomialRegressionAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'tfjs-core-v1',
    algorithmId: 'polynomial-regression',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-insurance-cost-v1',
    scenarioId: 'pg-insurance-cost',
    validateConfig(config) {
      return validatePolynomialRegressionConfig(config) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validatePolynomialRegressionConfig(request.config);

      return runPolynomialRegression(request, config, options);
    },
    isCancelledError(error): error is { runId: string } {
      return error instanceof PlaygroundReferenceAdapterCancelledError;
    },
  };
}

export function createLassoRegressionAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'tfjs-core-v1',
    algorithmId: 'lasso-regression',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-insurance-cost-v1',
    scenarioId: 'pg-insurance-cost',
    validateConfig(config) {
      return validateLassoRegressionConfig(config) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validateLassoRegressionConfig(request.config);

      return runLassoRegression(request, config, options);
    },
    isCancelledError(error): error is { runId: string } {
      return error instanceof PlaygroundReferenceAdapterCancelledError;
    },
  };
}

export function createNaiveBayesAdapter(
  definition: NaiveBayesAdapterDefinition = {
    configField: 'alpha',
    datasetVersionId: 'ds-sms-spam-v1',
    primaryMetric: 'f1',
    scenarioId: 'pg-spam-detection',
  },
): AlgorithmAdapter {
  return {
    adapterVersion: 'ml-naivebayes-v1',
    algorithmId: 'naive-bayes',
    configSchemaVersion: 1,
    datasetVersionId: definition.datasetVersionId,
    scenarioId: definition.scenarioId,
    validateConfig(config) {
      return validateNaiveBayesConfig(config, definition) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validateNaiveBayesConfig(request.config, definition);

      return runNaiveBayes(request, config, options, definition);
    },
    isCancelledError(error): error is { runId: string } {
      return error instanceof PlaygroundReferenceAdapterCancelledError;
    },
  };
}

export function createLogisticRegressionAdapter(
  definition: LogisticRegressionAdapterDefinition = {
    datasetVersionId: 'ds-sms-spam-v1',
    includeAuc: false,
    primaryMetric: 'f1',
    scenarioId: 'pg-spam-detection',
  },
): AlgorithmAdapter {
  return {
    adapterVersion: 'tfjs-layers-v1',
    algorithmId: 'logistic-regression',
    configSchemaVersion: 1,
    datasetVersionId: definition.datasetVersionId,
    scenarioId: definition.scenarioId,
    validateConfig(config) {
      return validateLogisticRegressionConfig(config) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validateLogisticRegressionConfig(request.config);

      return runLogisticRegression(request, config, options, definition);
    },
    isCancelledError(error): error is { runId: string } {
      return error instanceof PlaygroundReferenceAdapterCancelledError;
    },
  };
}

export function createDecisionTreeAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'ml-cart-v1',
    algorithmId: 'decision-tree',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-credit-risk-v1',
    scenarioId: 'pg-credit-risk',
    validateConfig(config) {
      return validateDecisionTreeConfig(config) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validateDecisionTreeConfig(request.config);

      return runDecisionTree(request, config, options);
    },
    isCancelledError(error): error is { runId: string } {
      return error instanceof PlaygroundReferenceAdapterCancelledError;
    },
  };
}

export function createKnnAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'ml-knn-v1',
    algorithmId: 'knn',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-customer-churn-v1',
    scenarioId: 'pg-customer-churn',
    validateConfig(config) {
      return validateKnnConfig(config) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validateKnnConfig(request.config);

      return runKnn(request, config, options);
    },
    isCancelledError(error): error is { runId: string } {
      return error instanceof PlaygroundReferenceAdapterCancelledError;
    },
  };
}

export function createRandomForestAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'ml-random-forest-v1',
    algorithmId: 'random-forest',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-customer-churn-v1',
    scenarioId: 'pg-customer-churn',
    validateConfig(config) {
      return validateRandomForestConfig(config) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validateRandomForestConfig(request.config);

      return runRandomForest(request, config, options);
    },
    isCancelledError(error): error is { runId: string } {
      return error instanceof PlaygroundReferenceAdapterCancelledError;
    },
  };
}

export function createSvmAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'libsvm-js-v1',
    algorithmId: 'svm',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-credit-risk-v1',
    scenarioId: 'pg-credit-risk',
    validateConfig(config) {
      return validateSvmConfig(config) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validateSvmConfig(request.config);

      return runSvm(request, config, options);
    },
    isCancelledError(error): error is { runId: string } {
      return error instanceof PlaygroundReferenceAdapterCancelledError;
    },
  };
}

export function createHierarchicalClusteringAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'ml-hclust-v1',
    algorithmId: 'hierarchical-clustering',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-retail-segments-v1',
    scenarioId: 'pg-retail-segments',
    validateConfig(config) {
      return validateHierarchicalClusteringConfig(config) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validateHierarchicalClusteringConfig(request.config);

      return runHierarchicalClustering(request, config, options);
    },
    isCancelledError(error): error is { runId: string } {
      return error instanceof PlaygroundReferenceAdapterCancelledError;
    },
  };
}

export function createKMeansAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'ml-kmeans-v1',
    algorithmId: 'kmeans',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-retail-segments-v1',
    scenarioId: 'pg-retail-segments',
    validateConfig(config) {
      return validateKMeansConfig(config) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validateKMeansConfig(request.config);

      return runKMeans(request, config, options);
    },
    isCancelledError(error): error is { runId: string } {
      return error instanceof PlaygroundReferenceAdapterCancelledError;
    },
  };
}

export function createPcaAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'ml-pca-v1',
    algorithmId: 'pca',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-country-indicators-v1',
    scenarioId: 'pg-country-indicators',
    validateConfig(config) {
      return validatePcaConfig(config) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validatePcaConfig(request.config);

      return runPca(request, config, options);
    },
    isCancelledError(error): error is { runId: string } {
      return error instanceof PlaygroundReferenceAdapterCancelledError;
    },
  };
}

export function createMlpAdapter(
  definition: MlpAdapterDefinition = {
    datasetVersionId: 'ds-xor-noisy-v1',
    scaleFeatures: false,
    scenarioId: 'pg-xor',
  },
): AlgorithmAdapter {
  return {
    adapterVersion: 'tfjs-layers-v1',
    algorithmId: 'mlp',
    configSchemaVersion: 1,
    datasetVersionId: definition.datasetVersionId,
    scenarioId: definition.scenarioId,
    validateConfig(config) {
      return validateMlpConfig(config) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validateMlpConfig(request.config);

      return runMlp(request, config, options, definition);
    },
    isCancelledError(error): error is { runId: string } {
      return error instanceof PlaygroundReferenceAdapterCancelledError;
    },
  };
}

async function runLinearRegression(
  request: MlRunRequest,
  config: LinearRegressionConfig,
  options: AlgorithmAdapterRunOptions,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);

  const dataset = getDatasetForRun(request, 'ds-house-price-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const scaler = fitStandardScaler(trainRows);
  const trainFeatures = trainRows.map((row) =>
    createModelFeatures(row, scaler, config.fitIntercept),
  );
  const coefficients = await solveTensorflowLeastSquares(
    trainFeatures,
    trainRows.map((row) => row.label),
    0,
  );
  const predictions = testRows.map((row) =>
    predictLinear(createModelFeatures(row, scaler, config.fitIntercept), coefficients),
  );
  const metrics = calculateRegressionMetrics(
    testRows.map((row) => row.label),
    predictions,
  );
  const residuals = predictions.map((prediction, index) => {
    const actual = testRows[index]?.label;

    if (actual === undefined) {
      throw new Error('Regression test row is missing a label.');
    }

    return actual - prediction;
  });

  options.onProgress({
    runId: request.runId,
    iteration: 1,
    totalIterations: 1,
    metric: { id: 'rmse', value: metrics.rmse },
  });
  await yieldToWorkerQueue();
  throwIfCancelled(request.runId, options);

  return {
    runId: request.runId,
    scenarioId: 'pg-house-price',
    algorithmId: 'linear-regression',
    datasetVersionId: 'ds-house-price-v1',
    determinism: 'exact',
    feedback: metrics.rmse > 10 ? ['underfit'] : [],
    metrics,
    chartSummary: {
      kind: 'actual-vs-predicted',
      residualMean: roundMetric(mean(residuals)),
      residualMaxAbs: roundMetric(Math.max(...residuals.map((value) => Math.abs(value)))),
    },
    textAlternative: {
      en: `Linear regression predicts the synthetic house-price test rows with RMSE ${metrics.rmse}.`,
      vi: `Hồi quy tuyến tính dự đoán tập kiểm tra giá nhà tổng hợp với RMSE ${metrics.rmse}.`,
    },
  };
}

function validateLinearRegressionConfig(config: MlConfig): LinearRegressionConfig {
  assertAllowedFields(config, ['fitIntercept', 'seed', 'trainRatio']);

  return {
    fitIntercept: readBoolean(config, 'fitIntercept'),
    trainRatio: readNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: readIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

async function runRidgeRegression(
  request: MlRunRequest,
  config: RidgeRegressionConfig,
  options: AlgorithmAdapterRunOptions,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);

  const dataset = getDatasetForRun(request, 'ds-house-price-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const scaler = fitStandardScaler(trainRows);
  const trainFeatures = trainRows.map((row) => createModelFeatures(row, scaler, true));
  const coefficients = await solveTensorflowLeastSquares(
    trainFeatures,
    trainRows.map((row) => row.label),
    config.alpha,
  );
  const predictions = testRows.map((row) =>
    predictLinear(createModelFeatures(row, scaler, true), coefficients),
  );
  const metrics = calculateRegressionMetrics(
    testRows.map((row) => row.label),
    predictions,
  );
  const residuals = predictions.map((prediction, index) => {
    const actual = testRows[index]?.label;

    if (actual === undefined) {
      throw new Error('Regression test row is missing a label.');
    }

    return actual - prediction;
  });

  options.onProgress({
    runId: request.runId,
    iteration: 1,
    totalIterations: 1,
    metric: { id: 'rmse', value: metrics.rmse },
  });
  await yieldToWorkerQueue();
  throwIfCancelled(request.runId, options);

  return {
    runId: request.runId,
    scenarioId: 'pg-house-price',
    algorithmId: 'ridge-regression',
    datasetVersionId: 'ds-house-price-v1',
    determinism: 'exact',
    feedback: metrics.rmse > 10 ? ['underfit'] : [],
    metrics,
    chartSummary: {
      kind: 'residual-coefficient',
      coefficientMagnitudes: coefficients
        .slice(1)
        .map((coefficient) => roundMetric(Math.abs(coefficient))),
      residualMean: roundMetric(mean(residuals)),
      residualMaxAbs: roundMetric(Math.max(...residuals.map((value) => Math.abs(value)))),
    },
    textAlternative: {
      en: `Ridge regression predicts the synthetic house-price test rows with RMSE ${metrics.rmse}.`,
      vi: `Hồi quy Ridge dự đoán tập kiểm tra giá nhà tổng hợp với RMSE ${metrics.rmse}.`,
    },
  };
}

function validateRidgeRegressionConfig(config: MlConfig): RidgeRegressionConfig {
  assertAllowedFields(config, ['alpha', 'seed', 'trainRatio']);

  return {
    alpha: readNumberInRange(config, 'alpha', 0.0001, 100),
    trainRatio: readNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: readIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

async function runPolynomialRegression(
  request: MlRunRequest,
  config: PolynomialRegressionConfig,
  options: AlgorithmAdapterRunOptions,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);

  const dataset = getDatasetForRun(request, 'ds-insurance-cost-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const scaler = fitStandardScaler(trainRows);
  const trainFeatures = trainRows.map((row) =>
    createPolynomialFeatures(createScaledFeatures(row, scaler), config.degree),
  );
  const coefficients = await solveTensorflowLeastSquares(
    trainFeatures,
    trainRows.map((row) => row.label),
    0,
  );
  const predictions = testRows.map((row) =>
    predictLinear(
      createPolynomialFeatures(createScaledFeatures(row, scaler), config.degree),
      coefficients,
    ),
  );
  const metrics = calculateRegressionMetrics(
    testRows.map((row) => row.label),
    predictions,
  );
  const residuals = predictions.map((prediction, index) => {
    const actual = testRows[index]?.label;

    if (actual === undefined) {
      throw new Error('Regression test row is missing a label.');
    }

    return actual - prediction;
  });

  options.onProgress({
    runId: request.runId,
    iteration: 1,
    totalIterations: 1,
    metric: { id: 'mae', value: metrics.mae },
  });
  await yieldToWorkerQueue();
  throwIfCancelled(request.runId, options);

  return {
    runId: request.runId,
    scenarioId: 'pg-insurance-cost',
    algorithmId: 'polynomial-regression',
    datasetVersionId: 'ds-insurance-cost-v1',
    determinism: 'exact',
    feedback: config.degree === 1 ? ['underfit'] : [],
    metrics: {
      mae: metrics.mae,
      rmse: metrics.rmse,
      r2: metrics.r2,
    },
    chartSummary: {
      kind: 'polynomial-residual',
      degree: config.degree,
      residualMean: roundMetric(mean(residuals)),
      residualMaxAbs: roundMetric(Math.max(...residuals.map((value) => Math.abs(value)))),
    },
    textAlternative: {
      en: `Polynomial regression reaches MAE ${metrics.mae} on the synthetic insurance test split.`,
      vi: `Hồi quy đa thức đạt MAE ${metrics.mae} trên tập kiểm tra bảo hiểm tổng hợp.`,
    },
  };
}

function validatePolynomialRegressionConfig(config: MlConfig): PolynomialRegressionConfig {
  assertAllowedFields(config, ['degree', 'seed', 'trainRatio']);

  return {
    degree: readIntegerInRange(config, 'degree', 1, 5),
    trainRatio: readNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: readIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

async function runLassoRegression(
  request: MlRunRequest,
  config: LassoRegressionConfig,
  options: AlgorithmAdapterRunOptions,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);
  await ensureTensorflowBackend();

  const dataset = getDatasetForRun(request, 'ds-insurance-cost-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const scaler = fitStandardScaler(trainRows);
  const trainFeatures = trainRows.map((row) => createScaledFeatures(row, scaler));
  const labelMean = mean(trainRows.map((row) => row.label));
  const centeredLabels = trainRows.map((row) => row.label - labelMean);
  const featureTensor = tf.tensor2d(trainFeatures);
  const labelTensor = tf.tensor2d(centeredLabels, [centeredLabels.length, 1]);
  const predictionTensor = tf.variable(tf.zeros([trainRows.length, 1]));
  const coefficientVariables = Array.from({ length: dataset.featureColumns.length }, () =>
    tf.variable(tf.scalar(0)),
  );

  try {
    for (let iteration = 1; iteration <= LASSO_MAX_ITERATIONS; iteration += 1) {
      throwIfCancelled(request.runId, options);

      for (let featureIndex = 0; featureIndex < coefficientVariables.length; featureIndex += 1) {
        const coefficient = coefficientVariables[featureIndex];

        if (!coefficient) {
          throw new Error('Lasso coefficient is missing.');
        }

        tf.tidy(() => {
          const featureColumn = tf.slice(featureTensor, [0, featureIndex], [-1, 1]);
          const residualWithoutFeature = tf.add(
            tf.sub(labelTensor, predictionTensor),
            tf.mul(featureColumn, coefficient),
          );
          const numerator = tf.sum(tf.mul(featureColumn, residualWithoutFeature));
          const denominator = tf.sum(tf.square(featureColumn));
          const threshold = tf.scalar(config.alpha * trainRows.length);
          const nextCoefficient = tf.div(
            tf.mul(tf.sign(numerator), tf.relu(tf.sub(tf.abs(numerator), threshold))),
            denominator,
          ) as tf.Scalar;
          const coefficientDelta = tf.sub(nextCoefficient, coefficient);

          coefficient.assign(nextCoefficient);
          predictionTensor.assign(
            tf.add(predictionTensor, tf.mul(featureColumn, coefficientDelta)),
          );
        });
      }

      if (iteration === 1 || iteration === LASSO_MAX_ITERATIONS || iteration % 25 === 0) {
        const trainMaeTensor = tf.tidy(() =>
          tf.mean(tf.abs(tf.sub(labelTensor, predictionTensor))),
        );

        try {
          const trainMae = roundMetric((await trainMaeTensor.data())[0] ?? 0);

          options.onProgress({
            runId: request.runId,
            iteration,
            totalIterations: LASSO_MAX_ITERATIONS,
            metric: { id: 'mae', value: trainMae },
          });
        } finally {
          trainMaeTensor.dispose();
        }

        await yieldToWorkerQueue();
      }
    }

    const coefficients = await Promise.all(
      coefficientVariables.map(async (coefficient) => (await coefficient.data())[0] ?? 0),
    );
    const predictions = testRows.map(
      (row) => labelMean + dotProduct(createScaledFeatures(row, scaler), coefficients),
    );
    const metrics = calculateRegressionMetrics(
      testRows.map((row) => row.label),
      predictions,
    );
    const residuals = predictions.map((prediction, index) => {
      const actual = testRows[index]?.label;

      if (actual === undefined) {
        throw new Error('Regression test row is missing a label.');
      }

      return actual - prediction;
    });
    const zeroCoefficientCount = coefficients.filter(
      (coefficient) => Math.abs(coefficient) < 0.000001,
    ).length;

    return {
      runId: request.runId,
      scenarioId: 'pg-insurance-cost',
      algorithmId: 'lasso-regression',
      datasetVersionId: 'ds-insurance-cost-v1',
      determinism: 'exact',
      feedback: zeroCoefficientCount > 0 ? ['sparsity'] : [],
      metrics: {
        mae: metrics.mae,
        rmse: metrics.rmse,
        r2: metrics.r2,
      },
      chartSummary: {
        kind: 'residual-coefficient',
        coefficientMagnitudes: coefficients.map((coefficient) =>
          roundMetric(Math.abs(coefficient)),
        ),
        residualMean: roundMetric(mean(residuals)),
        residualMaxAbs: roundMetric(Math.max(...residuals.map((value) => Math.abs(value)))),
        zeroCoefficientCount,
      },
      textAlternative: {
        en: `Lasso regression reaches MAE ${metrics.mae} on the synthetic insurance test split.`,
        vi: `Hồi quy Lasso đạt MAE ${metrics.mae} trên tập kiểm tra bảo hiểm tổng hợp.`,
      },
    };
  } finally {
    tf.dispose([featureTensor, labelTensor, predictionTensor, ...coefficientVariables]);
  }
}

function validateLassoRegressionConfig(config: MlConfig): LassoRegressionConfig {
  assertAllowedFields(config, ['alpha', 'seed', 'trainRatio']);

  return {
    alpha: readNumberInRange(config, 'alpha', 0.0001, 100),
    trainRatio: readNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: readIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

async function runNaiveBayes(
  request: MlRunRequest,
  config: NaiveBayesConfig,
  options: AlgorithmAdapterRunOptions,
  definition: NaiveBayesAdapterDefinition,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);

  const dataset = getDatasetForRun(request, definition.datasetVersionId);
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const classifier = new GaussianNB();
  classifier.train(
    trainRows.map((row) => [...row.features]),
    trainRows.map((row) => row.label),
  );
  const actualLabels = testRows.map((row) => row.label);
  const predictedLabels = classifier
    .predict(testRows.map((row) => [...row.features]))
    .map((label) => Number(label));
  const binaryMetrics =
    definition.primaryMetric === 'f1'
      ? calculateBinaryClassificationMetrics(actualLabels, predictedLabels)
      : null;
  const multiclassMetrics = calculateMulticlassClassificationMetrics(actualLabels, predictedLabels);
  const metricValue =
    definition.primaryMetric === 'macro-f1' ? multiclassMetrics.macroF1 : (binaryMetrics?.f1 ?? 0);

  options.onProgress({
    runId: request.runId,
    iteration: 1,
    totalIterations: 1,
    metric: { id: definition.primaryMetric, value: metricValue },
  });
  await yieldToWorkerQueue();
  throwIfCancelled(request.runId, options);

  return {
    runId: request.runId,
    scenarioId: definition.scenarioId,
    algorithmId: 'naive-bayes',
    datasetVersionId: definition.datasetVersionId,
    determinism: 'exact',
    feedback:
      definition.primaryMetric === 'macro-f1'
        ? multiclassMetrics.macroF1 < 0.7
          ? ['class-overlap']
          : []
        : hasClassImbalance(trainRows)
          ? ['imbalance']
          : [],
    metrics:
      definition.primaryMetric === 'macro-f1'
        ? { 'macro-f1': multiclassMetrics.macroF1, accuracy: multiclassMetrics.accuracy }
        : (binaryMetrics ?? { f1: 0, precision: 0, recall: 0 }),
    chartSummary: {
      kind: 'confusion-matrix',
      ...(definition.primaryMetric === 'macro-f1'
        ? calculateMulticlassConfusionMatrix(actualLabels, predictedLabels)
        : calculateConfusionMatrix(actualLabels, predictedLabels)),
    },
    textAlternative: {
      en:
        definition.primaryMetric === 'macro-f1'
          ? `Naive Bayes reaches macro-F1 ${multiclassMetrics.macroF1} on the synthetic wine test split.`
          : `Naive Bayes reaches F1 ${binaryMetrics?.f1 ?? 0} on the synthetic SMS test split.`,
      vi:
        definition.primaryMetric === 'macro-f1'
          ? `Naive Bayes đạt macro-F1 ${multiclassMetrics.macroF1} trên tập kiểm tra wine tổng hợp.`
          : `Naive Bayes đạt F1 ${binaryMetrics?.f1 ?? 0} trên tập kiểm tra SMS tổng hợp.`,
    },
  };
}

function validateNaiveBayesConfig(
  config: MlConfig,
  definition: NaiveBayesAdapterDefinition,
): NaiveBayesConfig {
  assertAllowedFields(config, [definition.configField, 'seed', 'trainRatio']);

  return {
    smoothing: readNumberInRange(
      config,
      definition.configField,
      definition.configField === 'alpha' ? 0.0001 : 0.000000000001,
      definition.configField === 'alpha' ? 100 : 1,
    ),
    trainRatio: readNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: readIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

async function runLogisticRegression(
  request: MlRunRequest,
  config: LogisticRegressionConfig,
  options: AlgorithmAdapterRunOptions,
  definition: LogisticRegressionAdapterDefinition,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);

  const dataset = getDatasetForRun(request, definition.datasetVersionId);
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const scaler = fitStandardScaler(trainRows);
  const training = await trainTensorflowBinaryClassifier({
    activation: 'sigmoid',
    epochs: config.epochs,
    hiddenLayers: [],
    learningRate: config.learningRate,
    options,
    runId: request.runId,
    seed: config.seed,
    testFeatures: testRows.map((row) => createScaledFeatures(row, scaler)),
    testLabels: testRows.map((row) => row.label),
    trainFeatures: trainRows.map((row) => createScaledFeatures(row, scaler)),
    trainLabels: trainRows.map((row) => row.label),
  });

  const actualLabels = testRows.map((row) => row.label);
  const predictedLabels = training.testProbabilities.map((probability) =>
    probability >= config.threshold ? 1 : 0,
  );
  const metrics = calculateBinaryClassificationMetrics(actualLabels, predictedLabels);
  const auc = calculateBinaryAuc(actualLabels, training.testProbabilities);
  const confusionMatrix = calculateConfusionMatrix(actualLabels, predictedLabels);
  const primaryValue = definition.primaryMetric === 'recall' ? metrics.recall : metrics.f1;
  const primaryMetricName = definition.primaryMetric === 'recall' ? 'recall' : 'F1';

  return {
    runId: request.runId,
    scenarioId: definition.scenarioId,
    algorithmId: 'logistic-regression',
    datasetVersionId: definition.datasetVersionId,
    determinism: 'exact',
    feedback: hasClassImbalance(trainRows) ? ['imbalance'] : [],
    metrics: definition.includeAuc ? { ...metrics, auc } : metrics,
    lossCurve: training.lossCurve,
    chartSummary: {
      kind: 'confusion-matrix',
      ...confusionMatrix,
    },
    textAlternative: {
      en: `Logistic regression reaches ${primaryMetricName} ${primaryValue} on the synthetic ${
        definition.scenarioId === 'pg-credit-risk' ? 'credit-risk' : 'SMS'
      } test split.`,
      vi:
        definition.scenarioId === 'pg-spam-detection'
          ? `Hồi quy logistic đạt F1 ${metrics.f1} trên tập kiểm tra SMS tổng hợp.`
          : `Logistic regression đạt recall ${metrics.recall} trên tập kiểm tra rủi ro tín dụng tổng hợp.`,
    },
  };
}

function validateLogisticRegressionConfig(config: MlConfig): LogisticRegressionConfig {
  assertAllowedFields(config, ['epochs', 'learningRate', 'seed', 'threshold', 'trainRatio']);

  return {
    learningRate: readNumberInRange(config, 'learningRate', 0.0001, 1),
    epochs: readIntegerInRange(config, 'epochs', 10, 2000),
    threshold: readNumberInRange(config, 'threshold', 0, 1),
    trainRatio: readNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: readIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

async function runDecisionTree(
  request: MlRunRequest,
  config: DecisionTreeConfig,
  options: AlgorithmAdapterRunOptions,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);

  const dataset = getDatasetForRun(request, 'ds-credit-risk-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const tree = new DecisionTreeClassifier({
    gainFunction: 'gini',
    maxDepth: config.maxDepth,
    minNumSamples: config.minSamplesLeaf,
  }) as unknown as CartClassifierInstance;
  tree.train(
    trainRows.map((row) => [...row.features]),
    trainRows.map((row) => row.label),
  );
  const actualLabels = testRows.map((row) => row.label);
  const predictedLabels = tree
    .predict(testRows.map((row) => [...row.features]))
    .map((label) => Number(label));
  const metrics = calculateBinaryClassificationMetrics(actualLabels, predictedLabels);
  const confusionMatrix = calculateConfusionMatrix(actualLabels, predictedLabels);
  const rootFeature =
    tree.root?.splitColumn === undefined
      ? null
      : (dataset.featureColumns[tree.root.splitColumn] ?? null);

  options.onProgress({
    runId: request.runId,
    iteration: 1,
    totalIterations: 1,
    metric: { id: 'recall', value: metrics.recall },
  });
  await yieldToWorkerQueue();
  throwIfCancelled(request.runId, options);

  return {
    runId: request.runId,
    scenarioId: 'pg-credit-risk',
    algorithmId: 'decision-tree',
    datasetVersionId: 'ds-credit-risk-v1',
    determinism: 'exact',
    feedback: metrics.recall < 0.8 ? ['underfit'] : [],
    metrics: {
      recall: metrics.recall,
      f1: metrics.f1,
      precision: metrics.precision,
    },
    chartSummary: {
      kind: 'tree',
      rootFeature,
      rootThreshold: tree.root?.splitValue === undefined ? null : roundMetric(tree.root.splitValue),
      ...confusionMatrix,
    },
    textAlternative: {
      en: `Decision tree identifies the synthetic credit-risk test rows with recall ${metrics.recall}.`,
      vi: `Cây quyết định nhận diện tập kiểm tra rủi ro tín dụng tổng hợp với recall ${metrics.recall}.`,
    },
  };
}

function validateDecisionTreeConfig(config: MlConfig): DecisionTreeConfig {
  assertAllowedFields(config, ['maxDepth', 'minSamplesLeaf', 'seed', 'trainRatio']);

  return {
    maxDepth: readIntegerInRange(config, 'maxDepth', 1, 20),
    minSamplesLeaf: readIntegerInRange(config, 'minSamplesLeaf', 1, 50),
    trainRatio: readNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: readIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

async function runKnn(
  request: MlRunRequest,
  config: KnnConfig,
  options: AlgorithmAdapterRunOptions,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);

  const dataset = getDatasetForRun(request, 'ds-customer-churn-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);

  if (config.k > trainRows.length) {
    throw new Error('k must not exceed the training row count.');
  }

  const scaler = fitStandardScaler(trainRows);
  const classifier = new KNN(
    trainRows.map((row) => createScaledFeatures(row, scaler)),
    trainRows.map((row) => row.label),
    { k: config.k },
  );
  throwIfCancelled(request.runId, options);
  const predictedLabels = classifier
    .predict(testRows.map((row) => createScaledFeatures(row, scaler)))
    .map((label) => Number(label));

  const actualLabels = testRows.map((row) => row.label);
  const binaryMetrics = calculateBinaryClassificationMetrics(actualLabels, predictedLabels);
  const auc = calculateBinaryAuc(actualLabels, predictedLabels);
  const confusionMatrix = calculateConfusionMatrix(actualLabels, predictedLabels);

  options.onProgress({
    runId: request.runId,
    iteration: 1,
    totalIterations: 1,
    metric: { id: 'f1', value: binaryMetrics.f1 },
  });
  await yieldToWorkerQueue();
  throwIfCancelled(request.runId, options);

  return {
    runId: request.runId,
    scenarioId: 'pg-customer-churn',
    algorithmId: 'knn',
    datasetVersionId: 'ds-customer-churn-v1',
    determinism: 'exact',
    feedback: hasClassImbalance(trainRows)
      ? ['imbalance']
      : binaryMetrics.f1 < 0.6
        ? ['underfit']
        : [],
    metrics: {
      f1: binaryMetrics.f1,
      auc,
      precision: binaryMetrics.precision,
      recall: binaryMetrics.recall,
    },
    chartSummary: {
      kind: 'confusion-matrix',
      k: config.k,
      ...confusionMatrix,
    },
    textAlternative: {
      en: `KNN reaches F1 ${binaryMetrics.f1} and AUC ${auc} on the synthetic customer-churn test split.`,
      vi: `KNN đạt F1 ${binaryMetrics.f1} và AUC ${auc} trên tập kiểm tra customer churn tổng hợp.`,
    },
  };
}

function validateKnnConfig(config: MlConfig): KnnConfig {
  assertAllowedFields(config, ['distance', 'k', 'seed', 'trainRatio']);

  return {
    k: readIntegerInRange(config, 'k', 1, 50),
    distance: readEnum(config, 'distance', ['euclidean']),
    trainRatio: readNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: readIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

async function runRandomForest(
  request: MlRunRequest,
  config: RandomForestConfig,
  options: AlgorithmAdapterRunOptions,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);

  const dataset = getDatasetForRun(request, 'ds-customer-churn-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const featureCount = dataset.featureColumns.length;
  const forest = new RandomForestClassifier({
    maxFeatures: Math.max(1, Math.floor(Math.sqrt(featureCount))),
    nEstimators: config.trees,
    noOOB: true,
    replacement: false,
    seed: config.seed,
    treeOptions: {
      gainFunction: 'gini',
      maxDepth: config.maxDepth,
      minNumSamples: 1,
    },
    useSampleBagging: true,
  }) as unknown as ForestClassifierInstance;
  forest.train(
    trainRows.map((row) => [...row.features]),
    trainRows.map((row) => row.label),
  );
  throwIfCancelled(request.runId, options);
  options.onProgress({
    runId: request.runId,
    iteration: config.trees,
    totalIterations: config.trees,
  });
  await yieldToWorkerQueue();
  throwIfCancelled(request.runId, options);

  const testFeatures = testRows.map((row) => [...row.features]);
  const scores = forest.predictProbability(testFeatures, 1);
  const predictedLabels = forest.predict(testFeatures).map((label) => Number(label));
  const actualLabels = testRows.map((row) => row.label);
  const binaryMetrics = calculateBinaryClassificationMetrics(actualLabels, predictedLabels);
  const auc = calculateBinaryAuc(actualLabels, scores);
  const confusionMatrix = calculateConfusionMatrix(actualLabels, predictedLabels);
  const featureUsage = countForestFeatureUsage(
    forest.estimators ?? [],
    forest.indexes ?? [],
    dataset.featureColumns,
  );

  return {
    runId: request.runId,
    scenarioId: 'pg-customer-churn',
    algorithmId: 'random-forest',
    datasetVersionId: 'ds-customer-churn-v1',
    determinism: 'exact',
    feedback: hasClassImbalance(trainRows)
      ? ['imbalance']
      : binaryMetrics.f1 < 0.6
        ? ['underfit']
        : [],
    metrics: {
      f1: binaryMetrics.f1,
      auc,
      precision: binaryMetrics.precision,
      recall: binaryMetrics.recall,
    },
    chartSummary: {
      kind: 'importance',
      trees: config.trees,
      featureUsage,
      ...confusionMatrix,
    },
    textAlternative: {
      en: `Random Forest reaches F1 ${binaryMetrics.f1} and AUC ${auc} on the synthetic customer-churn test split.`,
      vi: `Random Forest đạt F1 ${binaryMetrics.f1} và AUC ${auc} trên tập kiểm tra customer churn tổng hợp.`,
    },
  };
}

function validateRandomForestConfig(config: MlConfig): RandomForestConfig {
  assertAllowedFields(config, ['maxDepth', 'seed', 'trainRatio', 'trees']);

  return {
    trees: readIntegerInRange(config, 'trees', 1, 200),
    maxDepth: readIntegerInRange(config, 'maxDepth', 1, 15),
    trainRatio: readNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: readIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

async function runSvm(
  request: MlRunRequest,
  config: SvmConfig,
  options: AlgorithmAdapterRunOptions,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);
  const dataset = getDatasetForRun(request, 'ds-credit-risk-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const scaler = fitStandardScaler(trainRows);
  const trainFeatures = trainRows.map((row) => createScaledFeatures(row, scaler));
  const testFeatures = testRows.map((row) => createScaledFeatures(row, scaler));
  const trainLabels = trainRows.map((row) => row.label);
  const gamma = 1 / Math.max(1, dataset.featureColumns.length);
  const SVM = await getLibsvmConstructor();

  throwIfCancelled(request.runId, options);
  await yieldToWorkerQueue();
  throwIfCancelled(request.runId, options);

  const svm = new SVM({
    cost: config.c,
    gamma,
    kernel: SVM.KERNEL_TYPES.RBF,
    quiet: true,
    type: SVM.SVM_TYPES.C_SVC,
  });

  try {
    svm.train(trainFeatures, trainLabels);
    throwIfCancelled(request.runId, options);

    const predictedLabels = svm.predict(testFeatures);
    const actualLabels = testRows.map((row) => row.label);
    const metrics = calculateBinaryClassificationMetrics(actualLabels, predictedLabels);
    const confusionMatrix = calculateConfusionMatrix(actualLabels, predictedLabels);
    const supportVectorCount = svm.getSVIndices().length;

    options.onProgress({
      runId: request.runId,
      iteration: 1,
      totalIterations: 1,
      metric: { id: 'recall', value: metrics.recall },
    });
    await yieldToWorkerQueue();
    throwIfCancelled(request.runId, options);

    return {
      runId: request.runId,
      scenarioId: 'pg-credit-risk',
      algorithmId: 'svm',
      datasetVersionId: 'ds-credit-risk-v1',
      determinism: 'exact',
      feedback: hasClassImbalance(trainRows) ? ['imbalance'] : [],
      metrics: {
        recall: metrics.recall,
        f1: metrics.f1,
        precision: metrics.precision,
      },
      chartSummary: {
        kind: 'confusion-matrix',
        gamma: roundMetric(gamma),
        supportVectorCount,
        ...confusionMatrix,
      },
      textAlternative: {
        en: `RBF SVM reaches recall ${metrics.recall} on the synthetic credit-risk test split.`,
        vi: `RBF SVM đạt recall ${metrics.recall} trên tập kiểm tra rủi ro tín dụng tổng hợp.`,
      },
    };
  } finally {
    svm.free();
  }
}

async function getLibsvmConstructor(): Promise<LibsvmConstructor> {
  libsvmConstructorPromise ??= import('./libsvm-runtime').then(({ loadLibsvmConstructor }) =>
    loadLibsvmConstructor(),
  );

  return libsvmConstructorPromise;
}

function validateSvmConfig(config: MlConfig): SvmConfig {
  assertAllowedFields(config, ['c', 'gamma', 'kernel', 'seed', 'trainRatio']);

  return {
    kernel: readEnum(config, 'kernel', ['rbf']),
    c: readNumberInRange(config, 'c', 0.001, 100),
    gamma: readEnum(config, 'gamma', ['scale']),
    trainRatio: readNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: readIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

async function runHierarchicalClustering(
  request: MlRunRequest,
  config: HierarchicalClusteringConfig,
  options: AlgorithmAdapterRunOptions,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);

  const dataset = getDatasetForRun(request, 'ds-retail-segments-v1');

  if (config.clusters > dataset.rows.length) {
    throw new Error('clusters must not exceed the dataset row count.');
  }

  const scaler = fitStandardScaler(dataset.rows);
  const points = dataset.rows.map((row) => ({
    rowId: row.rowId,
    features: createScaledFeatures(row, scaler),
  }));
  const dendrogram = agnes(
    points.map((point) => [...point.features]),
    { method: config.linkage },
  );
  const groupedDendrogram = dendrogram.group(config.clusters);
  const orderedClusters = groupedDendrogram.children
    .map((cluster) => cluster.indices().sort((left, right) => left - right))
    .sort((left, right) => (left[0] ?? 0) - (right[0] ?? 0));
  const mergeHeights = collectDendrogramMergeHeights(groupedDendrogram)
    .sort((left, right) => left - right)
    .map((height) => roundMetric(height));
  throwIfCancelled(request.runId, options);
  options.onProgress({
    runId: request.runId,
    iteration: mergeHeights.length,
    totalIterations: points.length - config.clusters,
  });
  await yieldToWorkerQueue();
  throwIfCancelled(request.runId, options);
  const assignments = Array(points.length).fill(0) as number[];

  orderedClusters.forEach((members, clusterIndex) => {
    members.forEach((pointIndex) => {
      assignments[pointIndex] = clusterIndex;
    });
  });

  const clusterSizes = orderedClusters.map((members) => members.length);
  const silhouette = roundMetric(calculateSilhouette(points, assignments, config.clusters));
  const largestCluster = Math.max(...clusterSizes);
  const smallestCluster = Math.min(...clusterSizes);
  const feedback = [
    ...(config.clusters === 4 ? [] : ['cut-level']),
    ...(smallestCluster * 3 < largestCluster ? ['cluster-imbalance'] : []),
  ];

  return {
    runId: request.runId,
    scenarioId: 'pg-retail-segments',
    algorithmId: 'hierarchical-clustering',
    datasetVersionId: 'ds-retail-segments-v1',
    determinism: 'exact',
    feedback,
    metrics: {
      silhouette,
      'cluster-count': config.clusters,
    },
    chartSummary: {
      kind: 'dendrogram',
      clusterSizes,
      mergeHeights,
    },
    textAlternative: {
      en: `Ward hierarchical clustering finds ${config.clusters} retail segments with silhouette ${silhouette}.`,
      vi: `Ward hierarchical clustering tìm ${config.clusters} nhóm retail với silhouette ${silhouette}.`,
    },
  };
}

function validateHierarchicalClusteringConfig(config: MlConfig): HierarchicalClusteringConfig {
  assertAllowedFields(config, ['clusters', 'distance', 'linkage']);

  return {
    linkage: readEnum(config, 'linkage', ['ward']),
    distance: readEnum(config, 'distance', ['euclidean']),
    clusters: readIntegerInRange(config, 'clusters', 2, 12),
  };
}

function collectDendrogramMergeHeights(cluster: Cluster): number[] {
  const heights: number[] = [];

  cluster.traverse((node) => {
    if (!node.isLeaf && node.children.length > 0 && node !== cluster) {
      heights.push(node.height);
    }
  });

  return heights;
}

async function runKMeans(
  request: MlRunRequest,
  config: KMeansConfig,
  options: AlgorithmAdapterRunOptions,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);

  const dataset = getDatasetForRun(request, 'ds-retail-segments-v1');

  if (config.k > dataset.rows.length) {
    throw new Error('k must not exceed the dataset row count.');
  }

  const scaler = fitStandardScaler(dataset.rows);
  const points = dataset.rows.map((row) => ({
    rowId: row.rowId,
    features: createScaledFeatures(row, scaler),
  }));
  const result = kmeans(
    points.map((point) => [...point.features]),
    config.k,
    {
      initialization: 'random',
      maxIterations: config.maxIterations,
      seed: config.seed,
    },
  );
  throwIfCancelled(request.runId, options);
  const assignments = result.clusters;
  const centroids = result.centroids;
  const completedIterations = result.iterations;
  const inertia = calculateInertia(points, assignments, centroids);

  options.onProgress({
    runId: request.runId,
    iteration: completedIterations,
    totalIterations: config.maxIterations,
    metric: { id: 'inertia', value: roundMetric(inertia) },
  });
  await yieldToWorkerQueue();
  throwIfCancelled(request.runId, options);

  const clusterSizes = Array.from(
    { length: config.k },
    (_, clusterIndex) => assignments.filter((assignment) => assignment === clusterIndex).length,
  );
  const silhouette = roundMetric(calculateSilhouette(points, assignments, config.k));
  const roundedInertia = roundMetric(inertia);

  return {
    runId: request.runId,
    scenarioId: 'pg-retail-segments',
    algorithmId: 'kmeans',
    datasetVersionId: 'ds-retail-segments-v1',
    determinism: 'exact',
    feedback: silhouette < 0.4 ? ['too-few-clusters'] : [],
    metrics: {
      silhouette,
      inertia: roundedInertia,
    },
    chartSummary: {
      kind: 'cluster-plot',
      clusterSizes,
      iterations: completedIterations,
      centroids: centroids.map((centroid) => centroid.map((value) => roundMetric(value))),
    },
    textAlternative: {
      en: `K-Means finds four synthetic retail segments with silhouette ${silhouette}.`,
      vi: `K-Means tìm bốn nhóm khách hàng bán lẻ tổng hợp với silhouette ${silhouette}.`,
    },
  };
}

function validateKMeansConfig(config: MlConfig): KMeansConfig {
  assertAllowedFields(config, ['k', 'maxIterations', 'seed']);

  return {
    k: readIntegerInRange(config, 'k', 2, 10),
    maxIterations: readIntegerInRange(config, 'maxIterations', 10, 300),
    seed: readIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

async function runPca(
  request: MlRunRequest,
  config: PcaConfig,
  options: AlgorithmAdapterRunOptions,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);

  const dataset = getDatasetForRun(request, 'ds-country-indicators-v1');

  if (config.components > dataset.featureColumns.length) {
    throw new Error('components must not exceed the dataset feature count.');
  }

  const sourceRows = dataset.rows.map((row) => [...row.features]);
  const pca = new PCA(sourceRows, { center: true, scale: config.scale });
  const projections = pca.predict(sourceRows, { nComponents: config.components });
  const reconstructedRows = pca.invert(projections).to2DArray();
  const explainedVariance = pca
    .getExplainedVariance()
    .slice(0, config.components)
    .reduce((total, value) => total + value, 0);
  const reconstructionError = mean(
    sourceRows.flatMap((row, rowIndex) =>
      row.map((value, featureIndex) => {
        const reconstructed = reconstructedRows[rowIndex]?.[featureIndex];

        return (value - (reconstructed ?? value)) ** 2;
      }),
    ),
  );
  const selectedComponents = pca
    .getEigenvectors()
    .transpose()
    .to2DArray()
    .slice(0, config.components);

  options.onProgress({
    runId: request.runId,
    iteration: 1,
    totalIterations: 1,
    metric: { id: 'explained-variance', value: roundMetric(explainedVariance) },
  });
  await yieldToWorkerQueue();
  throwIfCancelled(request.runId, options);

  const roundedExplainedVariance = roundMetric(explainedVariance);
  const roundedReconstructionError = roundMetric(reconstructionError);

  return {
    runId: request.runId,
    scenarioId: 'pg-country-indicators',
    algorithmId: 'pca',
    datasetVersionId: 'ds-country-indicators-v1',
    determinism: 'exact',
    feedback: roundedExplainedVariance < 0.8 ? ['low-variance'] : [],
    metrics: {
      'explained-variance': roundedExplainedVariance,
      'reconstruction-error': roundedReconstructionError,
    },
    chartSummary: {
      kind: 'projection-2d',
      components: config.components,
      loadings: selectedComponents.map((component) => component.map((value) => roundMetric(value))),
      projectionSample: projections
        .to2DArray()
        .slice(0, 3)
        .map((projection) => projection.map((value) => roundMetric(value))),
    },
    textAlternative: {
      en: `Two PCA components explain ${Math.round(
        roundedExplainedVariance * 100,
      )}% of variance in the synthetic country indicators.`,
      vi: `Hai thành phần PCA giải thích ${Math.round(
        roundedExplainedVariance * 100,
      )}% phương sai của dữ liệu chỉ báo quốc gia tổng hợp.`,
    },
  };
}

function validatePcaConfig(config: MlConfig): PcaConfig {
  assertAllowedFields(config, ['components', 'scale']);

  return {
    components: readIntegerInRange(config, 'components', 2, 2),
    scale: readBoolean(config, 'scale'),
  };
}

async function runMlp(
  request: MlRunRequest,
  config: MlpConfig,
  options: AlgorithmAdapterRunOptions,
  definition: MlpAdapterDefinition,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);

  const dataset = getDatasetForRun(request, definition.datasetVersionId);
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const scaler = definition.scaleFeatures ? fitStandardScaler(trainRows) : null;
  const training = await trainTensorflowBinaryClassifier({
    activation: config.activation,
    epochs: config.epochs,
    hiddenLayers: config.hiddenLayers,
    learningRate: config.learningRate,
    options,
    runId: request.runId,
    seed: config.seed,
    testFeatures: testRows.map((row) => [...createMlpFeatures(row, scaler)]),
    testLabels: testRows.map((row) => row.label),
    trainFeatures: trainRows.map((row) => [...createMlpFeatures(row, scaler)]),
    trainLabels: trainRows.map((row) => row.label),
  });
  const roundedAccuracy = roundMetric(
    calculateAccuracy(
      testRows.map((row) => row.label),
      training.testProbabilities.map((probability) => (probability >= 0.5 ? 1 : 0)),
    ),
  );
  const roundedLoss = roundMetric(
    calculateBinaryProbabilityLogLoss(
      testRows.map((row) => row.label),
      training.testProbabilities,
    ),
  );

  return {
    runId: request.runId,
    scenarioId: definition.scenarioId,
    algorithmId: 'mlp',
    datasetVersionId: definition.datasetVersionId,
    determinism: 'exact',
    feedback: roundedAccuracy < 0.9 ? ['underfit', 'non-convergence'] : [],
    metrics: {
      accuracy: roundedAccuracy,
      loss: roundedLoss,
    },
    lossCurve: training.lossCurve,
    chartSummary: {
      kind: 'decision-boundary',
      hiddenLayers: config.hiddenLayers,
      activation: config.activation,
      trainAccuracy: roundMetric(training.trainAccuracy),
    },
    textAlternative: {
      en:
        definition.scenarioId === 'pg-xor'
          ? `The MLP solves the nonlinear XOR split with accuracy ${Math.round(
              roundedAccuracy * 100,
            )}% and loss ${roundedLoss}.`
          : `The MLP solves the nonlinear moons split with accuracy ${Math.round(
              roundedAccuracy * 100,
            )}% and loss ${roundedLoss}.`,
      vi:
        definition.scenarioId === 'pg-xor'
          ? `MLP giải được tập XOR phi tuyến với accuracy ${Math.round(
              roundedAccuracy * 100,
            )}% và loss ${roundedLoss}.`
          : `MLP giải được tập moons phi tuyến với accuracy ${Math.round(
              roundedAccuracy * 100,
            )}% và loss ${roundedLoss}.`,
    },
  };
}

function validateMlpConfig(config: MlConfig): MlpConfig {
  assertAllowedFields(config, [
    'activation',
    'epochs',
    'hiddenLayers',
    'learningRate',
    'seed',
    'trainRatio',
  ]);

  return {
    hiddenLayers: readHiddenLayers(config.hiddenLayers),
    activation: readEnum(config, 'activation', ['relu', 'sigmoid', 'tanh']),
    learningRate: readNumberInRange(config, 'learningRate', 0.0001, 1),
    epochs: readIntegerInRange(config, 'epochs', 10, 1000),
    trainRatio: readNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: readIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

function assertAllowedFields(config: MlConfig, allowedFields: readonly string[]): void {
  const unexpectedFields = Object.keys(config).filter((field) => !allowedFields.includes(field));

  if (unexpectedFields.length > 0) {
    throw new Error(`Unsupported config fields: ${unexpectedFields.join(', ')}.`);
  }
}

function readBoolean(config: MlConfig, fieldName: string): boolean {
  const value = config[fieldName];

  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean.`);
  }

  return value;
}

function readNumberInRange(
  config: MlConfig,
  fieldName: string,
  minValue: number,
  maxValue: number,
): number {
  const value = config[fieldName];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }

  if (value < minValue || value > maxValue) {
    throw new Error(`${fieldName} must be between ${minValue} and ${maxValue}.`);
  }

  return value;
}

function readIntegerInRange(
  config: MlConfig,
  fieldName: string,
  minValue: number,
  maxValue: number,
): number {
  const value = readNumberInRange(config, fieldName, minValue, maxValue);

  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer.`);
  }

  return value;
}

function readEnum<TValue extends string>(
  config: MlConfig,
  fieldName: string,
  allowedValues: readonly TValue[],
): TValue {
  const value = config[fieldName];

  if (typeof value !== 'string' || !allowedValues.includes(value as TValue)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}.`);
  }

  return value as TValue;
}

function readHiddenLayers(value: unknown): readonly number[] {
  if (!Array.isArray(value)) {
    throw new Error('hiddenLayers must be an array.');
  }

  if (value.length > 3) {
    throw new Error('hiddenLayers must include 3 layers or fewer.');
  }

  return value.map((layerSize) => {
    if (!Number.isInteger(layerSize) || layerSize < 1 || layerSize > 32) {
      throw new Error('hiddenLayers entries must be integers between 1 and 32.');
    }

    return layerSize;
  });
}

function getDatasetForRun(
  request: MlRunRequest,
  expectedDatasetVersionId: string,
): PlaygroundDataset {
  const dataset = request.dataset ?? getPlaygroundDataset(expectedDatasetVersionId);

  if (dataset.datasetVersionId !== expectedDatasetVersionId) {
    throw new Error(
      `Expected ${expectedDatasetVersionId} but received ${dataset.datasetVersionId}.`,
    );
  }

  return dataset;
}

function requireLabeledRows(
  rows: readonly PlaygroundDatasetRow[],
  datasetVersionId: string,
): Array<PlaygroundDatasetRow & { label: number }> {
  return rows.map((row) => {
    if (typeof row.label !== 'number' || !Number.isFinite(row.label)) {
      throw new Error(`${datasetVersionId} contains an unlabeled row.`);
    }

    return { ...row, label: row.label };
  });
}

interface FeatureScaler {
  means: readonly number[];
  standardDeviations: readonly number[];
}

function fitStandardScaler(rows: readonly PlaygroundDatasetRow[]): FeatureScaler {
  const featureCount = rows[0]?.features.length ?? 0;
  const means = Array.from({ length: featureCount }, (_, featureIndex) =>
    mean(rows.map((row) => readFeature(row, featureIndex))),
  );
  const standardDeviations = means.map((featureMean, featureIndex) => {
    const variance = mean(rows.map((row) => (readFeature(row, featureIndex) - featureMean) ** 2));

    return Math.sqrt(variance) || 1;
  });

  return { means, standardDeviations };
}

function createModelFeatures(
  row: PlaygroundDatasetRow,
  scaler: FeatureScaler,
  fitIntercept: boolean,
): number[] {
  const scaledFeatures = createScaledFeatures(row, scaler);

  return fitIntercept ? [1, ...scaledFeatures] : scaledFeatures;
}

function createScaledFeatures(row: PlaygroundDatasetRow, scaler: FeatureScaler): number[] {
  return row.features.map((feature, index) => {
    const meanValue = scaler.means[index];
    const standardDeviation = scaler.standardDeviations[index];

    if (meanValue === undefined || standardDeviation === undefined) {
      throw new Error('Feature scaler does not match row shape.');
    }

    return (feature - meanValue) / standardDeviation;
  });
}

function createMlpFeatures(
  row: PlaygroundDatasetRow,
  scaler: FeatureScaler | null,
): readonly number[] {
  return scaler ? createScaledFeatures(row, scaler) : row.features;
}

async function solveTensorflowLeastSquares(
  features: readonly number[][],
  labels: readonly number[],
  alpha: number,
): Promise<number[]> {
  if (features.length === 0 || features[0] === undefined) {
    throw new Error('Least-squares training features are required.');
  }

  await ensureTensorflowBackend();
  const columnCount = features[0].length;
  const includesIntercept = features.every((row) => row[0] === 1);
  const labelMean = includesIntercept ? mean(labels) : 0;
  const labelStandardDeviation = includesIntercept
    ? Math.sqrt(mean(labels.map((label) => (label - labelMean) ** 2))) || 1
    : 1;
  const regularizationRows =
    alpha > 0
      ? Array.from({ length: columnCount }, (_, rowIndex) =>
          Array.from({ length: columnCount }, (_, columnIndex) =>
            rowIndex === columnIndex && rowIndex !== 0 ? Math.sqrt(alpha) : 0,
          ),
        )
      : [];
  const augmentedFeatures = [...features, ...regularizationRows];
  const modelLabels = includesIntercept
    ? labels.map((label) => (label - labelMean) / labelStandardDeviation)
    : labels;
  const augmentedLabels = [...modelLabels, ...Array(regularizationRows.length).fill(0)];
  const featureTensor = tf.tensor2d(augmentedFeatures);
  const labelTensor = tf.tensor2d(augmentedLabels, [augmentedLabels.length, 1]);
  let q: tf.Tensor2D | null = null;
  let r: tf.Tensor2D | null = null;
  let qTranspose: tf.Tensor2D | null = null;
  let qTransposeLabels: tf.Tensor2D | null = null;

  try {
    const [nextQ, nextR] = tf.linalg.qr(featureTensor, false) as [tf.Tensor2D, tf.Tensor2D];
    const nextQTranspose = tf.transpose(nextQ) as tf.Tensor2D;
    const nextQTransposeLabels = tf.matMul(nextQTranspose, labelTensor) as tf.Tensor2D;

    q = nextQ;
    r = nextR;
    qTranspose = nextQTranspose;
    qTransposeLabels = nextQTransposeLabels;

    const upperTriangular = (await nextR.array()) as number[][];
    const transformedLabels = ((await nextQTransposeLabels.array()) as number[][]).map(
      ([value]) => value ?? 0,
    );

    const coefficients = solveUpperTriangularSystem(upperTriangular, transformedLabels);

    if (!includesIntercept) {
      return coefficients;
    }

    return coefficients.map((coefficient, index) =>
      index === 0
        ? coefficient * labelStandardDeviation + labelMean
        : coefficient * labelStandardDeviation,
    );
  } finally {
    featureTensor.dispose();
    labelTensor.dispose();
    q?.dispose();
    r?.dispose();
    qTranspose?.dispose();
    qTransposeLabels?.dispose();
  }
}

async function ensureTensorflowBackend(): Promise<void> {
  tensorflowBackendReady ??= (async () => {
    if (!tf.getBackend()) {
      await tf.setBackend('cpu');
    }

    await tf.ready();
  })();

  await tensorflowBackendReady;
}

interface TensorflowBinaryClassifierInput {
  activation: MlpConfig['activation'];
  epochs: number;
  hiddenLayers: readonly number[];
  learningRate: number;
  options: AlgorithmAdapterRunOptions;
  runId: string;
  seed: number;
  testFeatures: readonly (readonly number[])[];
  testLabels: readonly number[];
  trainFeatures: readonly (readonly number[])[];
  trainLabels: readonly number[];
}

interface TensorflowBinaryClassifierOutput {
  lossCurve: Array<{ epoch: number; loss: number }>;
  testProbabilities: number[];
  trainAccuracy: number;
}

async function trainTensorflowBinaryClassifier(
  input: TensorflowBinaryClassifierInput,
): Promise<TensorflowBinaryClassifierOutput> {
  throwIfCancelled(input.runId, input.options);
  await ensureTensorflowBackend();

  const featureCount = input.trainFeatures[0]?.length;

  if (!featureCount) {
    throw new Error('TensorFlow classifier requires at least one feature.');
  }

  const trainFeatureTensor = tf.tensor2d(input.trainFeatures.map((row) => [...row]));
  const trainLabelTensor = tf.tensor2d([...input.trainLabels], [input.trainLabels.length, 1]);
  const testFeatureTensor = tf.tensor2d(input.testFeatures.map((row) => [...row]));
  const model = sequential();
  const optimizer = tf.train.adam(input.learningRate);
  let testPredictionTensor: tf.Tensor | null = null;
  let trainPredictionTensor: tf.Tensor | null = null;
  const lossCurve: Array<{ epoch: number; loss: number }> = [];

  try {
    input.hiddenLayers.forEach((units, index) => {
      const layerOptions = {
        activation: input.activation,
        biasInitializer: 'zeros' as const,
        kernelInitializer: initializers.glorotUniform({ seed: input.seed + index }),
        units,
      };

      model.add(
        index === 0
          ? layers.dense({ ...layerOptions, inputShape: [featureCount] })
          : layers.dense(layerOptions),
      );
    });
    const outputLayerOptions = {
      activation: 'sigmoid' as const,
      biasInitializer: 'zeros' as const,
      kernelInitializer: initializers.glorotUniform({
        seed: input.seed + input.hiddenLayers.length,
      }),
      units: 1,
    };

    model.add(
      input.hiddenLayers.length === 0
        ? layers.dense({ ...outputLayerOptions, inputShape: [featureCount] })
        : layers.dense(outputLayerOptions),
    );
    model.compile({ loss: 'binaryCrossentropy', optimizer });
    await model.fit(trainFeatureTensor, trainLabelTensor, {
      batchSize: Math.min(64, input.trainFeatures.length),
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          if (input.options.shouldCancel()) {
            model.stopTraining = true;
            return;
          }

          const epochNumber = epoch + 1;

          if (epochNumber === 1 || epochNumber === input.epochs || epochNumber % 25 === 0) {
            const loss = roundMetric(typeof logs?.loss === 'number' ? logs.loss : 0);

            lossCurve.push({ epoch: epochNumber, loss });
            input.options.onProgress({
              runId: input.runId,
              epoch: epochNumber,
              totalEpochs: input.epochs,
              loss,
            });
            await yieldToWorkerQueue();
          }
        },
      },
      epochs: input.epochs,
      shuffle: false,
      verbose: 0,
    });
    throwIfCancelled(input.runId, input.options);

    testPredictionTensor = model.predict(testFeatureTensor) as tf.Tensor;
    trainPredictionTensor = model.predict(trainFeatureTensor) as tf.Tensor;
    const [testProbabilities, trainProbabilities] = await Promise.all([
      testPredictionTensor.data(),
      trainPredictionTensor.data(),
    ]);
    const trainPredictedLabels = Array.from(trainProbabilities, (probability) =>
      probability >= 0.5 ? 1 : 0,
    );

    return {
      lossCurve,
      testProbabilities: Array.from(testProbabilities),
      trainAccuracy: calculateAccuracy(input.trainLabels, trainPredictedLabels),
    };
  } finally {
    trainFeatureTensor.dispose();
    trainLabelTensor.dispose();
    testFeatureTensor.dispose();
    testPredictionTensor?.dispose();
    trainPredictionTensor?.dispose();
    model.dispose();
    optimizer.dispose();
  }
}

function solveUpperTriangularSystem(matrix: number[][], vector: number[]): number[] {
  const result = Array<number>(vector.length).fill(0);

  for (let rowIndex = matrix.length - 1; rowIndex >= 0; rowIndex -= 1) {
    const diagonal = matrix[rowIndex]?.[rowIndex];

    if (diagonal === undefined || !Number.isFinite(diagonal) || Math.abs(diagonal) < 1e-8) {
      throw new Error('TensorFlow QR decomposition is rank deficient.');
    }

    const upperContribution = matrix[rowIndex]
      ?.slice(rowIndex + 1)
      .reduce((total, value, offset) => total + value * (result[rowIndex + offset + 1] ?? 0), 0);
    result[rowIndex] = ((vector[rowIndex] ?? 0) - (upperContribution ?? 0)) / diagonal;
  }

  return result;
}

function createPolynomialFeatures(features: readonly number[], degree: number): number[] {
  const polynomialFeatures = [1];

  for (let currentDegree = 1; currentDegree <= degree; currentDegree += 1) {
    appendPolynomialTerms(polynomialFeatures, features, currentDegree, 0, 1);
  }

  return polynomialFeatures;
}

function appendPolynomialTerms(
  target: number[],
  features: readonly number[],
  remainingDegree: number,
  startIndex: number,
  product: number,
): void {
  if (remainingDegree === 0) {
    target.push(product);
    return;
  }

  for (let featureIndex = startIndex; featureIndex < features.length; featureIndex += 1) {
    const featureValue = features[featureIndex];

    if (featureValue === undefined) {
      throw new Error('Polynomial feature is missing.');
    }

    appendPolynomialTerms(
      target,
      features,
      remainingDegree - 1,
      featureIndex,
      product * featureValue,
    );
  }
}

function predictLinear(features: readonly number[], coefficients: readonly number[]): number {
  return features.reduce((sum, feature, index) => sum + feature * (coefficients[index] ?? 0), 0);
}

function calculateRegressionMetrics(
  actualValues: readonly number[],
  predictions: readonly number[],
): MlMetrics & { mae: number; r2: MlMetricValue; rmse: number } {
  const errors = actualValues.map((actual, index) => actual - (predictions[index] ?? 0));
  const absoluteErrors = errors.map((error) => Math.abs(error));
  const squaredErrors = errors.map((error) => error ** 2);
  const targetMean = mean(actualValues);
  const totalSumOfSquares = actualValues.reduce(
    (sum, actual) => sum + (actual - targetMean) ** 2,
    0,
  );
  const residualSumOfSquares = squaredErrors.reduce((sum, error) => sum + error, 0);
  const r2 = totalSumOfSquares === 0 ? null : 1 - residualSumOfSquares / totalSumOfSquares;

  return {
    rmse: roundMetric(Math.sqrt(mean(squaredErrors))),
    r2: r2 === null ? null : roundMetric(r2),
    mae: roundMetric(mean(absoluteErrors)),
  };
}

function calculateBinaryClassificationMetrics(
  actualLabels: readonly number[],
  predictedLabels: readonly number[],
): MlMetrics & { f1: number; precision: number; recall: number } {
  const { falseNegative, falsePositive, truePositive } = calculateConfusionMatrix(
    actualLabels,
    predictedLabels,
  );
  const precision =
    truePositive + falsePositive === 0 ? 0 : truePositive / (truePositive + falsePositive);
  const recall =
    truePositive + falseNegative === 0 ? 0 : truePositive / (truePositive + falseNegative);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return {
    f1: roundMetric(f1),
    precision: roundMetric(precision),
    recall: roundMetric(recall),
  };
}

function calculateMulticlassClassificationMetrics(
  actualLabels: readonly number[],
  predictedLabels: readonly number[],
): { accuracy: number; macroF1: number } {
  const labels = [...new Set([...actualLabels, ...predictedLabels])].sort(
    (left, right) => left - right,
  );
  const macroF1 = mean(
    labels.map((label) => {
      const truePositive = actualLabels.filter(
        (actualLabel, index) => actualLabel === label && predictedLabels[index] === label,
      ).length;
      const falsePositive = actualLabels.filter(
        (actualLabel, index) => actualLabel !== label && predictedLabels[index] === label,
      ).length;
      const falseNegative = actualLabels.filter(
        (actualLabel, index) => actualLabel === label && predictedLabels[index] !== label,
      ).length;
      const precision =
        truePositive + falsePositive === 0 ? 0 : truePositive / (truePositive + falsePositive);
      const recall =
        truePositive + falseNegative === 0 ? 0 : truePositive / (truePositive + falseNegative);

      return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    }),
  );

  return {
    accuracy: roundMetric(calculateAccuracy(actualLabels, predictedLabels)),
    macroF1: roundMetric(macroF1),
  };
}

function calculateMulticlassConfusionMatrix(
  actualLabels: readonly number[],
  predictedLabels: readonly number[],
): { labels: readonly number[]; matrix: readonly (readonly number[])[] } {
  const labels = [...new Set([...actualLabels, ...predictedLabels])].sort(
    (left, right) => left - right,
  );
  const matrix = labels.map((actualLabel) =>
    labels.map(
      (predictedLabel) =>
        actualLabels.filter(
          (value, index) => value === actualLabel && predictedLabels[index] === predictedLabel,
        ).length,
    ),
  );

  return { labels, matrix };
}

function calculateBinaryAuc(actualLabels: readonly number[], scores: readonly number[]): number {
  const rankedRows = actualLabels
    .map((label, index) => ({ index, label, score: scores[index] ?? 0 }))
    .sort((left, right) => left.score - right.score || left.index - right.index);
  const positiveCount = actualLabels.filter((label) => label === 1).length;
  const negativeCount = actualLabels.length - positiveCount;

  if (positiveCount === 0 || negativeCount === 0) {
    return 0.5;
  }

  let accumulatedNegativeCount = 0;
  let area = 0;

  for (let index = 0; index < rankedRows.length;) {
    const score = rankedRows[index]?.score;
    let groupPositiveCount = 0;
    let groupNegativeCount = 0;

    while (index < rankedRows.length && rankedRows[index]?.score === score) {
      if (rankedRows[index]?.label === 1) {
        groupPositiveCount += 1;
      } else {
        groupNegativeCount += 1;
      }
      index += 1;
    }

    area += groupPositiveCount * (accumulatedNegativeCount + groupNegativeCount / 2);
    accumulatedNegativeCount += groupNegativeCount;
  }

  return roundMetric(area / (positiveCount * negativeCount));
}

function countForestFeatureUsage(
  forest: readonly ForestEstimator[],
  featureIndexesByTree: readonly (readonly number[])[],
  featureColumns: readonly string[],
): Record<string, number> {
  const usage = Object.fromEntries(featureColumns.map((feature) => [feature, 0])) as Record<
    string,
    number
  >;

  for (const [treeIndex, tree] of forest.entries()) {
    if (tree.root) {
      countCartTreeFeatureUsage(
        tree.root,
        featureIndexesByTree[treeIndex] ?? [],
        featureColumns,
        usage,
      );
    }
  }

  return usage;
}

function countCartTreeFeatureUsage(
  tree: CartTreeRoot,
  featureIndexes: readonly number[],
  featureColumns: readonly string[],
  usage: Record<string, number>,
): void {
  if (tree.splitColumn === undefined) {
    return;
  }

  const sourceFeatureIndex = featureIndexes[tree.splitColumn];
  const featureColumn =
    sourceFeatureIndex === undefined ? undefined : featureColumns[sourceFeatureIndex];

  if (featureColumn) {
    usage[featureColumn] = (usage[featureColumn] ?? 0) + 1;
  }

  if (tree.left) {
    countCartTreeFeatureUsage(tree.left, featureIndexes, featureColumns, usage);
  }

  if (tree.right) {
    countCartTreeFeatureUsage(tree.right, featureIndexes, featureColumns, usage);
  }
}

function calculateInertia(
  points: readonly KMeansPoint[],
  assignments: readonly number[],
  centroids: readonly (readonly number[])[],
): number {
  return points.reduce((sum, point, index) => {
    const centroid = centroids[assignments[index] ?? 0];

    if (!centroid) {
      throw new Error('Cluster assignment points to a missing centroid.');
    }

    return sum + distanceSquared(point.features, centroid);
  }, 0);
}

function calculateSilhouette(
  points: readonly KMeansPoint[],
  assignments: readonly number[],
  k: number,
): number {
  return mean(
    points.map((point, pointIndex) => {
      const clusterIndex = assignments[pointIndex] ?? 0;
      const sameClusterPoints = points.filter(
        (_, otherIndex) => assignments[otherIndex] === clusterIndex && otherIndex !== pointIndex,
      );
      const ownClusterDistance =
        sameClusterPoints.length === 0
          ? 0
          : mean(
              sameClusterPoints.map((otherPoint) =>
                euclideanDistance(point.features, otherPoint.features),
              ),
            );
      const nearestOtherClusterDistance = Math.min(
        ...Array.from({ length: k }, (_, otherClusterIndex) => otherClusterIndex)
          .filter((otherClusterIndex) => otherClusterIndex !== clusterIndex)
          .map((otherClusterIndex) => {
            const otherClusterPoints = points.filter(
              (_, otherIndex) => assignments[otherIndex] === otherClusterIndex,
            );

            return otherClusterPoints.length === 0
              ? Number.POSITIVE_INFINITY
              : mean(
                  otherClusterPoints.map((otherPoint) =>
                    euclideanDistance(point.features, otherPoint.features),
                  ),
                );
          }),
      );

      if (!Number.isFinite(nearestOtherClusterDistance) || nearestOtherClusterDistance === 0) {
        return 0;
      }

      return (
        (nearestOtherClusterDistance - ownClusterDistance) /
        Math.max(ownClusterDistance, nearestOtherClusterDistance)
      );
    }),
  );
}

function distanceSquared(left: readonly number[], right: readonly number[]): number {
  return left.reduce((sum, value, index) => sum + (value - (right[index] ?? 0)) ** 2, 0);
}

function euclideanDistance(left: readonly number[], right: readonly number[]): number {
  return Math.sqrt(distanceSquared(left, right));
}

function dotProduct(left: readonly number[], right: readonly number[]): number {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

function calculateConfusionMatrix(
  actualLabels: readonly number[],
  predictedLabels: readonly number[],
): { falseNegative: number; falsePositive: number; trueNegative: number; truePositive: number } {
  return actualLabels.reduce(
    (matrix, actualLabel, index) => {
      const predictedLabel = predictedLabels[index];

      if (predictedLabel === undefined) {
        throw new Error('Predicted label is missing.');
      }

      if (actualLabel === 1 && predictedLabel === 1) {
        return { ...matrix, truePositive: matrix.truePositive + 1 };
      }

      if (actualLabel === 0 && predictedLabel === 0) {
        return { ...matrix, trueNegative: matrix.trueNegative + 1 };
      }

      if (actualLabel === 0 && predictedLabel === 1) {
        return { ...matrix, falsePositive: matrix.falsePositive + 1 };
      }

      return { ...matrix, falseNegative: matrix.falseNegative + 1 };
    },
    { falseNegative: 0, falsePositive: 0, trueNegative: 0, truePositive: 0 },
  );
}

function calculateBinaryProbabilityLogLoss(
  labels: readonly number[],
  probabilities: readonly number[],
): number {
  if (labels.length !== probabilities.length || labels.length === 0) {
    throw new Error('Binary probability loss requires equally sized non-empty inputs.');
  }

  return mean(
    labels.map((label, index) => {
      const probability = clampProbability(probabilities[index] ?? 0);

      return -(label * Math.log(probability) + (1 - label) * Math.log(1 - probability));
    }),
  );
}

function clampProbability(probability: number): number {
  return Math.min(1 - 1e-12, Math.max(1e-12, probability));
}

function hasClassImbalance(rows: readonly (PlaygroundDatasetRow & { label: number })[]): boolean {
  const positiveCount = rows.filter((row) => row.label === 1).length;
  const minorityRatio = Math.min(positiveCount, rows.length - positiveCount) / rows.length;

  return minorityRatio < 0.4;
}

function calculateAccuracy(
  actualLabels: readonly number[],
  predictedLabels: readonly number[],
): number {
  const correctCount = actualLabels.filter(
    (actualLabel, index) => actualLabel === predictedLabels[index],
  ).length;

  return correctCount / actualLabels.length;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error('Cannot calculate the mean of an empty array.');
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function readFeature(row: PlaygroundDatasetRow, featureIndex: number): number {
  const feature = row.features[featureIndex];

  if (typeof feature !== 'number' || !Number.isFinite(feature)) {
    throw new Error('Dataset feature must be finite.');
  }

  return feature;
}

function throwIfCancelled(runId: string, options: AlgorithmAdapterRunOptions): void {
  if (options.shouldCancel()) {
    throw new PlaygroundReferenceAdapterCancelledError(runId);
  }
}

async function yieldToWorkerQueue(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
