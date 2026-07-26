import type { MlConfig, MlMetricValue, MlMetrics, MlRunResult } from './ml-engine-contract';
import type { MlRunRequest } from './ml-worker-protocol';
import type { AlgorithmAdapter, AlgorithmAdapterRunOptions } from './algorithm-adapter';
import {
  createSeededRandom,
  getPlaygroundDataset,
  roundMetric,
  shuffleItems,
  splitDatasetRows,
  type PlaygroundDatasetRow,
} from './playground-datasets';

export class PlaygroundReferenceAdapterCancelledError extends Error {
  constructor(public readonly runId: string) {
    super('The playground reference adapter run was cancelled.');
    this.name = 'PlaygroundReferenceAdapterCancelledError';
  }
}

const LASSO_MAX_ITERATIONS = 250;

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

interface LogisticRegressionConfig {
  epochs: number;
  learningRate: number;
  seed: number;
  threshold: number;
  trainRatio: number;
}

interface DecisionTreeConfig {
  maxDepth: number;
  minSamplesLeaf: number;
  seed: number;
  trainRatio: number;
}

interface KMeansConfig {
  k: number;
  maxIterations: number;
  seed: number;
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

interface DecisionTreeNode {
  featureIndex?: number | undefined;
  left?: DecisionTreeNode | undefined;
  prediction: 0 | 1;
  right?: DecisionTreeNode | undefined;
  threshold?: number | undefined;
}

interface DecisionTreeSplit {
  featureIndex: number;
  leftRows: Array<PlaygroundDatasetRow & { label: number }>;
  rightRows: Array<PlaygroundDatasetRow & { label: number }>;
  score: number;
  threshold: number;
}

interface KMeansPoint {
  features: readonly number[];
  rowId: string;
}

interface NeuralLayer {
  biases: number[];
  weights: number[][];
}

interface NeuralForwardPass {
  activations: number[][];
  output: number;
  weightedInputs: number[][];
}

export function createLinearRegressionAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'linear-regression-js-v1',
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
    adapterVersion: 'ridge-regression-js-v1',
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
    adapterVersion: 'polynomial-regression-js-v1',
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
    adapterVersion: 'lasso-regression-js-v1',
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

export function createLogisticRegressionAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'logistic-regression-js-v1',
    algorithmId: 'logistic-regression',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-sms-spam-v1',
    scenarioId: 'pg-spam-detection',
    validateConfig(config) {
      return validateLogisticRegressionConfig(config) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validateLogisticRegressionConfig(request.config);

      return runLogisticRegression(request, config, options);
    },
    isCancelledError(error): error is { runId: string } {
      return error instanceof PlaygroundReferenceAdapterCancelledError;
    },
  };
}

export function createDecisionTreeAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'decision-tree-js-v1',
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

export function createKMeansAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'kmeans-js-v1',
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
    adapterVersion: 'pca-js-v1',
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

export function createMlpAdapter(): AlgorithmAdapter {
  return {
    adapterVersion: 'mlp-js-v1',
    algorithmId: 'mlp',
    configSchemaVersion: 1,
    datasetVersionId: 'ds-xor-noisy-v1',
    scenarioId: 'pg-xor',
    validateConfig(config) {
      return validateMlpConfig(config) as unknown as MlConfig;
    },
    async run(request, options) {
      const config = validateMlpConfig(request.config);

      return runMlp(request, config, options);
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

  const dataset = getPlaygroundDataset('ds-house-price-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const scaler = fitStandardScaler(trainRows);
  const trainFeatures = trainRows.map((row) =>
    createModelFeatures(row, scaler, config.fitIntercept),
  );
  const coefficients = solveLeastSquares(
    trainFeatures,
    trainRows.map((row) => row.label),
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

  const dataset = getPlaygroundDataset('ds-house-price-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const scaler = fitStandardScaler(trainRows);
  const trainFeatures = trainRows.map((row) => createModelFeatures(row, scaler, true));
  const coefficients = solveRidgeRegression(
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

  const dataset = getPlaygroundDataset('ds-insurance-cost-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const scaler = fitStandardScaler(trainRows);
  const trainFeatures = trainRows.map((row) =>
    createPolynomialFeatures(createScaledFeatures(row, scaler), config.degree),
  );
  const coefficients = solveRidgeRegression(
    trainFeatures,
    trainRows.map((row) => row.label),
    0.000001,
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

  const dataset = getPlaygroundDataset('ds-insurance-cost-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const scaler = fitStandardScaler(trainRows);
  const trainFeatures = trainRows.map((row) => createScaledFeatures(row, scaler));
  const labelMean = mean(trainRows.map((row) => row.label));
  const centeredLabels = trainRows.map((row) => row.label - labelMean);
  const coefficients = Array(dataset.featureColumns.length).fill(0) as number[];
  const trainPredictions = Array(trainRows.length).fill(0) as number[];

  for (let iteration = 1; iteration <= LASSO_MAX_ITERATIONS; iteration += 1) {
    throwIfCancelled(request.runId, options);

    for (let featureIndex = 0; featureIndex < coefficients.length; featureIndex += 1) {
      const previousCoefficient = coefficients[featureIndex] ?? 0;
      let numerator = 0;
      let denominator = 0;

      for (let rowIndex = 0; rowIndex < trainFeatures.length; rowIndex += 1) {
        const feature = trainFeatures[rowIndex]?.[featureIndex] ?? 0;
        const label = centeredLabels[rowIndex] ?? 0;
        const prediction = trainPredictions[rowIndex] ?? 0;

        numerator += feature * (label - prediction + feature * previousCoefficient);
        denominator += feature * feature;
      }

      const nextCoefficient =
        denominator === 0
          ? 0
          : softThreshold(numerator, config.alpha * trainRows.length) / denominator;
      const coefficientDelta = nextCoefficient - previousCoefficient;
      coefficients[featureIndex] = nextCoefficient;

      for (let rowIndex = 0; rowIndex < trainFeatures.length; rowIndex += 1) {
        const feature = trainFeatures[rowIndex]?.[featureIndex] ?? 0;
        trainPredictions[rowIndex] = (trainPredictions[rowIndex] ?? 0) + feature * coefficientDelta;
      }
    }

    if (iteration === 1 || iteration === LASSO_MAX_ITERATIONS || iteration % 25 === 0) {
      const trainMae = mean(
        trainRows.map((row, rowIndex) =>
          Math.abs(row.label - (labelMean + (trainPredictions[rowIndex] ?? 0))),
        ),
      );

      options.onProgress({
        runId: request.runId,
        iteration,
        totalIterations: LASSO_MAX_ITERATIONS,
        metric: { id: 'mae', value: roundMetric(trainMae) },
      });
      await yieldToWorkerQueue();
    }
  }

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
      coefficientMagnitudes: coefficients.map((coefficient) => roundMetric(Math.abs(coefficient))),
      residualMean: roundMetric(mean(residuals)),
      residualMaxAbs: roundMetric(Math.max(...residuals.map((value) => Math.abs(value)))),
      zeroCoefficientCount,
    },
    textAlternative: {
      en: `Lasso regression reaches MAE ${metrics.mae} on the synthetic insurance test split.`,
      vi: `Hồi quy Lasso đạt MAE ${metrics.mae} trên tập kiểm tra bảo hiểm tổng hợp.`,
    },
  };
}

function validateLassoRegressionConfig(config: MlConfig): LassoRegressionConfig {
  assertAllowedFields(config, ['alpha', 'seed', 'trainRatio']);

  return {
    alpha: readNumberInRange(config, 'alpha', 0.0001, 100),
    trainRatio: readNumberInRange(config, 'trainRatio', 0.5, 0.9),
    seed: readIntegerInRange(config, 'seed', 0, 1_000_000),
  };
}

async function runLogisticRegression(
  request: MlRunRequest,
  config: LogisticRegressionConfig,
  options: AlgorithmAdapterRunOptions,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);

  const dataset = getPlaygroundDataset('ds-sms-spam-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const scaler = fitStandardScaler(trainRows);
  const weights = Array(dataset.featureColumns.length).fill(0) as number[];
  let bias = 0;
  const lossCurve: { epoch: number; loss: number }[] = [];

  for (let epoch = 1; epoch <= config.epochs; epoch += 1) {
    throwIfCancelled(request.runId, options);

    for (const row of shuffleItems(trainRows, config.seed + epoch)) {
      const features = createScaledFeatures(row, scaler);
      const probability = sigmoid(predictLinear(features, weights) + bias);
      const error = probability - row.label;

      for (let featureIndex = 0; featureIndex < weights.length; featureIndex += 1) {
        weights[featureIndex] =
          (weights[featureIndex] ?? 0) -
          config.learningRate * error * (features[featureIndex] ?? 0);
      }

      bias -= config.learningRate * error;
    }

    if (epoch === 1 || epoch === config.epochs || epoch % 25 === 0) {
      const loss = roundMetric(calculateLogLoss(trainRows, weights, bias, scaler));

      lossCurve.push({ epoch, loss });
      options.onProgress({
        runId: request.runId,
        epoch,
        totalEpochs: config.epochs,
        loss,
      });
      await yieldToWorkerQueue();
    }
  }

  const actualLabels = testRows.map((row) => row.label);
  const predictedLabels = testRows.map((row) => {
    const features = createScaledFeatures(row, scaler);

    return sigmoid(predictLinear(features, weights) + bias) >= config.threshold ? 1 : 0;
  });
  const metrics = calculateBinaryClassificationMetrics(actualLabels, predictedLabels);
  const confusionMatrix = calculateConfusionMatrix(actualLabels, predictedLabels);

  return {
    runId: request.runId,
    scenarioId: 'pg-spam-detection',
    algorithmId: 'logistic-regression',
    datasetVersionId: 'ds-sms-spam-v1',
    determinism: 'exact',
    feedback: hasClassImbalance(trainRows) ? ['imbalance'] : [],
    metrics,
    lossCurve,
    chartSummary: {
      kind: 'confusion-matrix',
      ...confusionMatrix,
    },
    textAlternative: {
      en: `Logistic regression reaches F1 ${metrics.f1} on the synthetic SMS test split.`,
      vi: `Hồi quy logistic đạt F1 ${metrics.f1} trên tập kiểm tra SMS tổng hợp.`,
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

  const dataset = getPlaygroundDataset('ds-credit-risk-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const tree = buildDecisionTree(trainRows, config, 0);
  const actualLabels = testRows.map((row) => row.label);
  const predictedLabels = testRows.map((row) => predictTree(tree, row));
  const metrics = calculateBinaryClassificationMetrics(actualLabels, predictedLabels);
  const confusionMatrix = calculateConfusionMatrix(actualLabels, predictedLabels);
  const rootFeature =
    tree.featureIndex === undefined ? null : (dataset.featureColumns[tree.featureIndex] ?? null);

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
      rootThreshold: tree.threshold === undefined ? null : roundMetric(tree.threshold),
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

async function runKMeans(
  request: MlRunRequest,
  config: KMeansConfig,
  options: AlgorithmAdapterRunOptions,
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);

  const dataset = getPlaygroundDataset('ds-retail-segments-v1');

  if (config.k > dataset.rows.length) {
    throw new Error('k must not exceed the dataset row count.');
  }

  const scaler = fitStandardScaler(dataset.rows);
  const points = dataset.rows.map((row) => ({
    rowId: row.rowId,
    features: createScaledFeatures(row, scaler),
  }));
  let centroids = initializeKMeansCentroids(points, config.k, config.seed);
  let assignments = assignClusters(points, centroids);
  let completedIterations = 0;
  let inertia = calculateInertia(points, assignments, centroids);

  for (let iteration = 1; iteration <= config.maxIterations; iteration += 1) {
    throwIfCancelled(request.runId, options);

    const previousCentroids = centroids;
    const nextCentroids = updateCentroids(points, assignments, centroids);
    const nextAssignments = assignClusters(points, nextCentroids);

    centroids = nextCentroids;
    assignments = nextAssignments;
    completedIterations = iteration;
    inertia = calculateInertia(points, assignments, centroids);

    if (iteration === 1 || iteration === config.maxIterations || iteration % 10 === 0) {
      options.onProgress({
        runId: request.runId,
        iteration,
        totalIterations: config.maxIterations,
        metric: { id: 'inertia', value: roundMetric(inertia) },
      });
      await yieldToWorkerQueue();
    }

    if (hasCentroidsConverged(previousCentroids, nextCentroids)) {
      break;
    }
  }

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

  const dataset = getPlaygroundDataset('ds-country-indicators-v1');

  if (config.components > dataset.featureColumns.length) {
    throw new Error('components must not exceed the dataset feature count.');
  }

  const normalizedRows = normalizeRowsForPca(dataset.rows, config.scale);
  const covarianceMatrix = calculateCovarianceMatrix(normalizedRows);
  const decomposition = decomposeSymmetric2d(covarianceMatrix);
  const selectedComponents = decomposition.components.slice(0, config.components);
  const selectedEigenvalues = decomposition.eigenvalues.slice(0, config.components);
  const totalVariance = decomposition.eigenvalues.reduce((sum, value) => sum + value, 0);
  const explainedVariance =
    totalVariance === 0
      ? 0
      : selectedEigenvalues.reduce((sum, value) => sum + value, 0) / totalVariance;
  const projections = normalizedRows.map((row) =>
    selectedComponents.map((component) => dotProduct(row, component)),
  );
  const reconstructionError = calculatePcaReconstructionError(
    normalizedRows,
    projections,
    selectedComponents,
  );

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
): Promise<MlRunResult> {
  throwIfCancelled(request.runId, options);

  const dataset = getPlaygroundDataset('ds-xor-noisy-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainRows = requireLabeledRows(split.trainRows, dataset.datasetVersionId);
  const testRows = requireLabeledRows(split.testRows, dataset.datasetVersionId);
  const network = initializeNeuralNetwork(
    [dataset.featureColumns.length, ...config.hiddenLayers, 1],
    config.seed,
  );
  const lossCurve: { epoch: number; loss: number }[] = [];

  for (let epoch = 1; epoch <= config.epochs; epoch += 1) {
    throwIfCancelled(request.runId, options);

    for (const row of shuffleItems(trainRows, config.seed + epoch)) {
      trainNeuralNetworkSample(network, row.features, row.label, config);
    }

    if (epoch === 1 || epoch === config.epochs || epoch % 25 === 0) {
      const loss = roundMetric(calculateNeuralLogLoss(trainRows, network, config.activation));

      lossCurve.push({ epoch, loss });
      options.onProgress({
        runId: request.runId,
        epoch,
        totalEpochs: config.epochs,
        loss,
      });
      await yieldToWorkerQueue();
    }
  }

  const trainAccuracy = calculateAccuracy(
    trainRows.map((row) => row.label),
    trainRows.map((row) =>
      forwardNeuralNetwork(network, row.features, config.activation).output >= 0.5 ? 1 : 0,
    ),
  );
  const testAccuracy = calculateAccuracy(
    testRows.map((row) => row.label),
    testRows.map((row) =>
      forwardNeuralNetwork(network, row.features, config.activation).output >= 0.5 ? 1 : 0,
    ),
  );
  const roundedAccuracy = roundMetric(testAccuracy);
  const roundedLoss = roundMetric(calculateNeuralLogLoss(testRows, network, config.activation));

  return {
    runId: request.runId,
    scenarioId: 'pg-xor',
    algorithmId: 'mlp',
    datasetVersionId: 'ds-xor-noisy-v1',
    determinism: 'exact',
    feedback: roundedAccuracy < 0.9 ? ['underfit', 'non-convergence'] : [],
    metrics: {
      accuracy: roundedAccuracy,
      loss: roundedLoss,
    },
    lossCurve,
    chartSummary: {
      kind: 'decision-boundary',
      hiddenLayers: config.hiddenLayers,
      activation: config.activation,
      trainAccuracy: roundMetric(trainAccuracy),
    },
    textAlternative: {
      en: `The MLP solves the nonlinear XOR split with accuracy ${Math.round(
        roundedAccuracy * 100,
      )}% and loss ${roundedLoss}.`,
      vi: `MLP giải được tập XOR phi tuyến với accuracy ${Math.round(
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

function solveLeastSquares(features: readonly number[][], labels: readonly number[]): number[] {
  const columnCount = features[0]?.length ?? 0;
  const normalMatrix = Array.from({ length: columnCount }, () => Array(columnCount).fill(0));
  const normalVector = Array(columnCount).fill(0);

  features.forEach((row, rowIndex) => {
    const label = labels[rowIndex];

    if (label === undefined) {
      throw new Error('Regression label is missing.');
    }

    for (let leftIndex = 0; leftIndex < columnCount; leftIndex += 1) {
      const leftFeature = row[leftIndex] ?? 0;
      const normalMatrixRow = normalMatrix[leftIndex];

      if (!normalMatrixRow) {
        throw new Error('Normal matrix row is missing.');
      }

      normalVector[leftIndex] = (normalVector[leftIndex] ?? 0) + leftFeature * label;

      for (let rightIndex = 0; rightIndex < columnCount; rightIndex += 1) {
        normalMatrixRow[rightIndex] =
          (normalMatrixRow[rightIndex] ?? 0) + leftFeature * (row[rightIndex] ?? 0);
      }
    }
  });

  return solveLinearSystem(normalMatrix, normalVector);
}

function solveRidgeRegression(
  features: readonly number[][],
  labels: readonly number[],
  alpha: number,
): number[] {
  const columnCount = features[0]?.length ?? 0;
  const normalMatrix = Array.from({ length: columnCount }, () => Array(columnCount).fill(0));
  const normalVector = Array(columnCount).fill(0);

  features.forEach((row, rowIndex) => {
    const label = labels[rowIndex];

    if (label === undefined) {
      throw new Error('Regression label is missing.');
    }

    for (let leftIndex = 0; leftIndex < columnCount; leftIndex += 1) {
      const leftFeature = row[leftIndex] ?? 0;
      const normalMatrixRow = normalMatrix[leftIndex];

      if (!normalMatrixRow) {
        throw new Error('Normal matrix row is missing.');
      }

      normalVector[leftIndex] = (normalVector[leftIndex] ?? 0) + leftFeature * label;

      for (let rightIndex = 0; rightIndex < columnCount; rightIndex += 1) {
        normalMatrixRow[rightIndex] =
          (normalMatrixRow[rightIndex] ?? 0) + leftFeature * (row[rightIndex] ?? 0);
      }
    }
  });

  for (let featureIndex = 1; featureIndex < columnCount; featureIndex += 1) {
    const matrixRow = normalMatrix[featureIndex];

    if (!matrixRow) {
      throw new Error('Ridge normal matrix row is missing.');
    }

    matrixRow[featureIndex] = (matrixRow[featureIndex] ?? 0) + alpha;
  }

  return solveLinearSystem(normalMatrix, normalVector);
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

function solveLinearSystem(matrix: number[][], vector: number[]): number[] {
  const size = vector.length;
  const augmentedMatrix = matrix.map((row, index) => [...row, vector[index] ?? 0]);

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
    const maxRowIndex = findPivotRow(augmentedMatrix, pivotIndex);
    const pivotRow = augmentedMatrix[maxRowIndex];
    const currentRow = augmentedMatrix[pivotIndex];

    if (!pivotRow || !currentRow || Math.abs(pivotRow[pivotIndex] ?? 0) < 1e-12) {
      throw new Error('Linear system is singular.');
    }

    augmentedMatrix[maxRowIndex] = currentRow;
    augmentedMatrix[pivotIndex] = pivotRow;

    const pivotValue = pivotRow[pivotIndex] ?? 1;

    for (let columnIndex = pivotIndex; columnIndex <= size; columnIndex += 1) {
      pivotRow[columnIndex] = (pivotRow[columnIndex] ?? 0) / pivotValue;
    }

    for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
      if (rowIndex === pivotIndex) {
        continue;
      }

      const row = augmentedMatrix[rowIndex];

      if (!row) {
        continue;
      }

      const factor = row[pivotIndex] ?? 0;

      for (let columnIndex = pivotIndex; columnIndex <= size; columnIndex += 1) {
        row[columnIndex] = (row[columnIndex] ?? 0) - factor * (pivotRow[columnIndex] ?? 0);
      }
    }
  }

  return augmentedMatrix.map((row) => row[size] ?? 0);
}

function findPivotRow(matrix: readonly (readonly number[])[], pivotIndex: number): number {
  let maxRowIndex = pivotIndex;
  let maxValue = Math.abs(matrix[pivotIndex]?.[pivotIndex] ?? 0);

  for (let rowIndex = pivotIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const candidateValue = Math.abs(matrix[rowIndex]?.[pivotIndex] ?? 0);

    if (candidateValue > maxValue) {
      maxValue = candidateValue;
      maxRowIndex = rowIndex;
    }
  }

  return maxRowIndex;
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

function buildDecisionTree(
  rows: Array<PlaygroundDatasetRow & { label: number }>,
  config: DecisionTreeConfig,
  depth: number,
): DecisionTreeNode {
  const prediction = majorityLabel(rows);

  if (
    depth >= config.maxDepth ||
    rows.length < config.minSamplesLeaf * 2 ||
    rows.every((row) => row.label === rows[0]?.label)
  ) {
    return { prediction };
  }

  const split = findBestDecisionTreeSplit(rows, config.minSamplesLeaf);

  if (!split) {
    return { prediction };
  }

  return {
    prediction,
    featureIndex: split.featureIndex,
    threshold: split.threshold,
    left: buildDecisionTree(split.leftRows, config, depth + 1),
    right: buildDecisionTree(split.rightRows, config, depth + 1),
  };
}

function findBestDecisionTreeSplit(
  rows: Array<PlaygroundDatasetRow & { label: number }>,
  minSamplesLeaf: number,
): DecisionTreeSplit | null {
  const featureCount = rows[0]?.features.length ?? 0;
  let bestSplit: DecisionTreeSplit | null = null;

  for (let featureIndex = 0; featureIndex < featureCount; featureIndex += 1) {
    for (const threshold of getCandidateThresholds(rows, featureIndex)) {
      const leftRows = rows.filter((row) => readFeature(row, featureIndex) <= threshold);
      const rightRows = rows.filter((row) => readFeature(row, featureIndex) > threshold);

      if (leftRows.length < minSamplesLeaf || rightRows.length < minSamplesLeaf) {
        continue;
      }

      const score =
        (leftRows.length / rows.length) * calculateGini(leftRows) +
        (rightRows.length / rows.length) * calculateGini(rightRows);

      if (
        bestSplit === null ||
        score < bestSplit.score ||
        (score === bestSplit.score &&
          (featureIndex < bestSplit.featureIndex ||
            (featureIndex === bestSplit.featureIndex && threshold < bestSplit.threshold)))
      ) {
        bestSplit = { featureIndex, leftRows, rightRows, score, threshold };
      }
    }
  }

  return bestSplit;
}

function getCandidateThresholds(
  rows: readonly PlaygroundDatasetRow[],
  featureIndex: number,
): readonly number[] {
  const values = [...new Set(rows.map((row) => readFeature(row, featureIndex)))].sort(
    (left, right) => left - right,
  );
  const thresholds: number[] = [];

  for (let index = 1; index < values.length; index += 1) {
    const leftValue = values[index - 1];
    const rightValue = values[index];

    if (leftValue !== undefined && rightValue !== undefined) {
      thresholds.push((leftValue + rightValue) / 2);
    }
  }

  return thresholds;
}

function calculateGini(rows: readonly (PlaygroundDatasetRow & { label: number })[]): number {
  const positiveRatio = rows.filter((row) => row.label === 1).length / rows.length;
  const negativeRatio = 1 - positiveRatio;

  return 1 - positiveRatio ** 2 - negativeRatio ** 2;
}

function majorityLabel(rows: readonly (PlaygroundDatasetRow & { label: number })[]): 0 | 1 {
  const positiveCount = rows.filter((row) => row.label === 1).length;

  return positiveCount >= rows.length - positiveCount ? 1 : 0;
}

function predictTree(tree: DecisionTreeNode, row: PlaygroundDatasetRow): 0 | 1 {
  if (
    tree.featureIndex === undefined ||
    tree.threshold === undefined ||
    tree.left === undefined ||
    tree.right === undefined
  ) {
    return tree.prediction;
  }

  return readFeature(row, tree.featureIndex) <= tree.threshold
    ? predictTree(tree.left, row)
    : predictTree(tree.right, row);
}

function initializeKMeansCentroids(
  points: readonly KMeansPoint[],
  k: number,
  seed: number,
): number[][] {
  const firstPoint = shuffleItems(points, seed)[0];

  if (!firstPoint) {
    throw new Error('Cannot initialize K-Means without data.');
  }

  const centroids = [[...firstPoint.features]];

  while (centroids.length < k) {
    const farthestPoint = points.reduce<{ distance: number; point: KMeansPoint } | null>(
      (bestPoint, point) => {
        const nearestDistance = Math.min(
          ...centroids.map((centroid) => distanceSquared(point.features, centroid)),
        );

        if (bestPoint === null || nearestDistance > bestPoint.distance) {
          return { distance: nearestDistance, point };
        }

        return bestPoint;
      },
      null,
    );

    if (!farthestPoint) {
      throw new Error('Cannot choose a K-Means centroid.');
    }

    centroids.push([...farthestPoint.point.features]);
  }

  return centroids;
}

function assignClusters(points: readonly KMeansPoint[], centroids: readonly (readonly number[])[]) {
  return points.map((point) => {
    let bestClusterIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    centroids.forEach((centroid, clusterIndex) => {
      const distance = distanceSquared(point.features, centroid);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestClusterIndex = clusterIndex;
      }
    });

    return bestClusterIndex;
  });
}

function updateCentroids(
  points: readonly KMeansPoint[],
  assignments: readonly number[],
  centroids: readonly (readonly number[])[],
): number[][] {
  return centroids.map((centroid, clusterIndex) => {
    const clusterPoints = points.filter(
      (_, pointIndex) => assignments[pointIndex] === clusterIndex,
    );

    if (clusterPoints.length === 0) {
      return [...findFarthestPoint(points, centroids).features];
    }

    return centroid.map((_, featureIndex) =>
      mean(clusterPoints.map((point) => point.features[featureIndex] ?? 0)),
    );
  });
}

function findFarthestPoint(
  points: readonly KMeansPoint[],
  centroids: readonly (readonly number[])[],
): KMeansPoint {
  const farthestPoint = points.reduce<{ distance: number; point: KMeansPoint } | null>(
    (bestPoint, point) => {
      const nearestDistance = Math.min(
        ...centroids.map((centroid) => distanceSquared(point.features, centroid)),
      );

      if (bestPoint === null || nearestDistance > bestPoint.distance) {
        return { distance: nearestDistance, point };
      }

      return bestPoint;
    },
    null,
  );

  if (!farthestPoint) {
    throw new Error('Cannot recover empty K-Means cluster.');
  }

  return farthestPoint.point;
}

function hasCentroidsConverged(
  currentCentroids: readonly (readonly number[])[],
  nextCentroids: readonly (readonly number[])[],
): boolean {
  return currentCentroids.every(
    (centroid, centroidIndex) =>
      distanceSquared(centroid, nextCentroids[centroidIndex] ?? []) < 1e-12,
  );
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

function normalizeRowsForPca(
  rows: readonly PlaygroundDatasetRow[],
  shouldScale: boolean,
): number[][] {
  const featureCount = rows[0]?.features.length ?? 0;
  const means = Array.from({ length: featureCount }, (_, featureIndex) =>
    mean(rows.map((row) => readFeature(row, featureIndex))),
  );
  const standardDeviations = means.map((featureMean, featureIndex) => {
    if (!shouldScale) {
      return 1;
    }

    const variance = mean(rows.map((row) => (readFeature(row, featureIndex) - featureMean) ** 2));

    return Math.sqrt(variance) || 1;
  });

  return rows.map((row) =>
    row.features.map((feature, featureIndex) => {
      const meanValue = means[featureIndex];
      const standardDeviation = standardDeviations[featureIndex];

      if (meanValue === undefined || standardDeviation === undefined) {
        throw new Error('PCA normalization does not match row shape.');
      }

      return (feature - meanValue) / standardDeviation;
    }),
  );
}

function calculateCovarianceMatrix(rows: readonly (readonly number[])[]): number[][] {
  const featureCount = rows[0]?.length ?? 0;
  const denominator = Math.max(1, rows.length - 1);

  return Array.from({ length: featureCount }, (_, leftIndex) =>
    Array.from({ length: featureCount }, (_, rightIndex) => {
      const sum = rows.reduce(
        (total, row) => total + (row[leftIndex] ?? 0) * (row[rightIndex] ?? 0),
        0,
      );

      return sum / denominator;
    }),
  );
}

function decomposeSymmetric2d(matrix: readonly (readonly number[])[]): {
  components: readonly (readonly number[])[];
  eigenvalues: readonly number[];
} {
  const a = matrix[0]?.[0];
  const b = matrix[0]?.[1];
  const d = matrix[1]?.[1];

  if (a === undefined || b === undefined || d === undefined || matrix.length !== 2) {
    throw new Error('PCA reference adapter expects a two-feature dataset.');
  }

  const trace = a + d;
  const delta = Math.sqrt((a - d) ** 2 + 4 * b ** 2);
  const firstEigenvalue = (trace + delta) / 2;
  const secondEigenvalue = (trace - delta) / 2;
  const firstComponent = normalizeVector(
    Math.abs(b) > 1e-12
      ? [b, firstEigenvalue - a]
      : firstEigenvalue >= secondEigenvalue
        ? [1, 0]
        : [0, 1],
  );
  const firstComponentX = firstComponent[0];
  const firstComponentY = firstComponent[1];

  if (firstComponentX === undefined || firstComponentY === undefined) {
    throw new Error('PCA component is missing a coordinate.');
  }

  const secondComponent = normalizeVector([-firstComponentY, firstComponentX]);

  return {
    eigenvalues: [firstEigenvalue, secondEigenvalue],
    components: [firstComponent, secondComponent],
  };
}

function calculatePcaReconstructionError(
  rows: readonly (readonly number[])[],
  projections: readonly (readonly number[])[],
  components: readonly (readonly number[])[],
): number {
  const squaredErrors = rows.flatMap((row, rowIndex) => {
    const projection = projections[rowIndex];

    if (!projection) {
      throw new Error('PCA projection is missing.');
    }

    const reconstructedRow = row.map((_, featureIndex) =>
      projection.reduce(
        (sum, componentScore, componentIndex) =>
          sum + componentScore * (components[componentIndex]?.[featureIndex] ?? 0),
        0,
      ),
    );

    return row.map((value, featureIndex) => (value - (reconstructedRow[featureIndex] ?? 0)) ** 2);
  });

  return mean(squaredErrors);
}

function dotProduct(left: readonly number[], right: readonly number[]): number {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

function normalizeVector(vector: readonly number[]): readonly number[] {
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));

  if (length === 0) {
    throw new Error('Cannot normalize a zero vector.');
  }

  return vector.map((value) => value / length);
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

function calculateLogLoss(
  rows: readonly (PlaygroundDatasetRow & { label: number })[],
  weights: readonly number[],
  bias: number,
  scaler: FeatureScaler,
): number {
  return mean(
    rows.map((row) => {
      const probability = clampProbability(
        sigmoid(predictLinear(createScaledFeatures(row, scaler), weights) + bias),
      );

      return -(row.label * Math.log(probability) + (1 - row.label) * Math.log(1 - probability));
    }),
  );
}

function clampProbability(probability: number): number {
  return Math.min(1 - 1e-12, Math.max(1e-12, probability));
}

function softThreshold(value: number, threshold: number): number {
  if (value > threshold) {
    return value - threshold;
  }

  if (value < -threshold) {
    return value + threshold;
  }

  return 0;
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
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

function initializeNeuralNetwork(layerSizes: readonly number[], seed: number): NeuralLayer[] {
  const random = createSeededRandom(seed);
  const layers: NeuralLayer[] = [];

  for (let layerIndex = 1; layerIndex < layerSizes.length; layerIndex += 1) {
    const inputSize = layerSizes[layerIndex - 1];
    const outputSize = layerSizes[layerIndex];

    if (inputSize === undefined || outputSize === undefined) {
      throw new Error('MLP layer size is missing.');
    }

    const scale = Math.sqrt(6 / (inputSize + outputSize));
    const weights = Array.from({ length: inputSize }, () =>
      Array.from({ length: outputSize }, () => (random() * 2 - 1) * scale),
    );
    const biases = Array(outputSize).fill(0) as number[];

    layers.push({ weights, biases });
  }

  return layers;
}

function trainNeuralNetworkSample(
  network: NeuralLayer[],
  features: readonly number[],
  label: number,
  config: MlpConfig,
): void {
  const pass = forwardNeuralNetwork(network, features, config.activation);
  let deltas = [pass.output - label];

  for (let layerIndex = network.length - 1; layerIndex >= 0; layerIndex -= 1) {
    const layer = network[layerIndex];
    const previousActivations = pass.activations[layerIndex];

    if (!layer || !previousActivations) {
      throw new Error('MLP forward pass does not match network shape.');
    }

    const previousDeltas =
      layerIndex > 0 ? (Array(previousActivations.length).fill(0) as number[]) : [];

    for (let inputIndex = 0; inputIndex < previousActivations.length; inputIndex += 1) {
      const inputActivation = previousActivations[inputIndex] ?? 0;
      const weightRow = layer.weights[inputIndex];

      if (!weightRow) {
        throw new Error('MLP weight row is missing.');
      }

      for (let outputIndex = 0; outputIndex < layer.biases.length; outputIndex += 1) {
        const delta = deltas[outputIndex] ?? 0;

        if (layerIndex > 0) {
          previousDeltas[inputIndex] =
            (previousDeltas[inputIndex] ?? 0) + delta * (weightRow[outputIndex] ?? 0);
        }

        weightRow[outputIndex] =
          (weightRow[outputIndex] ?? 0) - config.learningRate * inputActivation * delta;
      }
    }

    for (let outputIndex = 0; outputIndex < layer.biases.length; outputIndex += 1) {
      layer.biases[outputIndex] =
        (layer.biases[outputIndex] ?? 0) - config.learningRate * (deltas[outputIndex] ?? 0);
    }

    if (layerIndex > 0) {
      const weightedInputs = pass.weightedInputs[layerIndex - 1];

      if (!weightedInputs) {
        throw new Error('MLP weighted inputs are missing.');
      }

      deltas = previousDeltas.map(
        (delta, index) =>
          delta * hiddenActivationDerivative(weightedInputs[index] ?? 0, config.activation),
      );
    }
  }
}

function forwardNeuralNetwork(
  network: readonly NeuralLayer[],
  features: readonly number[],
  hiddenActivation: MlpConfig['activation'],
): NeuralForwardPass {
  const activations = [[...features]];
  const weightedInputs: number[][] = [];
  let currentActivation = [...features];

  network.forEach((layer, layerIndex) => {
    const layerInputs = layer.biases.map((bias, outputIndex) =>
      currentActivation.reduce((sum, inputValue, inputIndex) => {
        const weight = layer.weights[inputIndex]?.[outputIndex] ?? 0;

        return sum + inputValue * weight;
      }, bias),
    );
    const isOutputLayer = layerIndex === network.length - 1;

    weightedInputs.push(layerInputs);
    currentActivation = isOutputLayer
      ? layerInputs.map((value) => sigmoid(value))
      : layerInputs.map((value) => hiddenActivationValue(value, hiddenActivation));
    activations.push(currentActivation);
  });

  return {
    activations,
    weightedInputs,
    output: currentActivation[0] ?? 0,
  };
}

function calculateNeuralLogLoss(
  rows: readonly (PlaygroundDatasetRow & { label: number })[],
  network: readonly NeuralLayer[],
  activation: MlpConfig['activation'],
): number {
  return mean(
    rows.map((row) => {
      const probability = clampProbability(
        forwardNeuralNetwork(network, row.features, activation).output,
      );

      return -(row.label * Math.log(probability) + (1 - row.label) * Math.log(1 - probability));
    }),
  );
}

function hiddenActivationValue(value: number, activation: MlpConfig['activation']): number {
  if (activation === 'relu') {
    return Math.max(0, value);
  }

  if (activation === 'sigmoid') {
    return sigmoid(value);
  }

  return Math.tanh(value);
}

function hiddenActivationDerivative(value: number, activation: MlpConfig['activation']): number {
  if (activation === 'relu') {
    return value > 0 ? 1 : 0;
  }

  if (activation === 'sigmoid') {
    const activatedValue = sigmoid(value);

    return activatedValue * (1 - activatedValue);
  }

  const activatedValue = Math.tanh(value);

  return 1 - activatedValue ** 2;
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
