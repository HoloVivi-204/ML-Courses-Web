import type { MlMetrics, MlProgressEvent, MlRunResult } from './ml-engine-contract';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import {
  getPlaygroundDataset,
  roundMetric,
  shuffleItems,
  splitDatasetRows,
  type PlaygroundDatasetRow,
  type PlaygroundDataset,
} from './playground-datasets';

export interface XorPerceptronConfig {
  epochs: number;
  learningRate: number;
  seed: number;
  trainRatio: number;
}

export interface XorPerceptronProgressEvent extends MlProgressEvent {
  epoch: number;
  loss: number;
  runId: string;
  totalEpochs: number;
}

export interface XorPerceptronResult extends MlRunResult {
  algorithmId: 'perceptron';
  boundary: {
    bias: number;
    weights: readonly [number, number];
  };
  datasetVersionId: 'ds-xor-noisy-v1';
  determinism: 'exact';
  feedback: readonly ('linear-limit' | 'non-convergence')[];
  lossCurve: ReadonlyArray<{
    epoch: number;
    loss: number;
  }>;
  metrics: MlMetrics & {
    accuracy: number;
    loss: number;
    testAccuracy: number;
    trainAccuracy: number;
  };
  runId: string;
  scenarioId: 'pg-xor';
  textAlternative: {
    en: string;
    vi: string;
  };
}

interface XorSample {
  label: 0 | 1;
  x1: number;
  x2: number;
}

interface RunOptions {
  dataset?: PlaygroundDataset | undefined;
  onProgress?: ((event: XorPerceptronProgressEvent) => void) | undefined;
  runId: string;
  shouldCancel?: (() => boolean) | undefined;
}

export class XorPerceptronCancelledError extends Error {
  constructor(public readonly runId: string) {
    super('The XOR Perceptron run was cancelled.');
    this.name = 'XorPerceptronCancelledError';
  }
}

let tensorflowBackendReady: Promise<void> | null = null;

export function validateXorPerceptronConfig(
  config: XorPerceptronConfig,
  deviceProfile: 'desktop' | 'mobile',
) {
  assertAllowedConfigFields(config as unknown as Record<string, unknown>, [
    'epochs',
    'learningRate',
    'seed',
    'trainRatio',
  ]);

  const maxEpochs = deviceProfile === 'mobile' ? 200 : 500;

  if (config.learningRate < 0.0001 || config.learningRate > 1) {
    throw new Error('learningRate must be between 0.0001 and 1.');
  }

  if (!Number.isInteger(config.epochs) || config.epochs < 10 || config.epochs > maxEpochs) {
    throw new Error(`epochs must be between 10 and ${maxEpochs} for ${deviceProfile}.`);
  }

  if (config.trainRatio < 0.5 || config.trainRatio > 0.9) {
    throw new Error('trainRatio must be between 0.5 and 0.9.');
  }

  if (!Number.isInteger(config.seed) || config.seed < 0 || config.seed > 1_000_000) {
    throw new Error('seed must be between 0 and 1000000.');
  }
}

export async function runXorPerceptronLegacy(
  config: XorPerceptronConfig,
  options: RunOptions,
): Promise<XorPerceptronResult> {
  const dataset = getPlaygroundDataset('ds-xor-noisy-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainSamples = toXorSamples(split.trainRows);
  const testSamples = toXorSamples(split.testRows);
  const weights: [number, number] = [0, 0];
  let bias = 0;
  const lossCurve: { epoch: number; loss: number }[] = [];

  for (let epoch = 1; epoch <= config.epochs; epoch += 1) {
    if (options.shouldCancel?.()) {
      throw new XorPerceptronCancelledError(options.runId);
    }

    const epochSamples = shuffleItems(trainSamples, config.seed + epoch);

    for (const sample of epochSamples) {
      const prediction = predict(sample, weights, bias);
      const update = config.learningRate * (sample.label - prediction);

      weights[0] += update * sample.x1;
      weights[1] += update * sample.x2;
      bias += update;
    }

    const trainLoss = classificationLoss(trainSamples, weights, bias);

    if (epoch === 1 || epoch === config.epochs || epoch % 10 === 0) {
      const loss = roundMetric(trainLoss);
      lossCurve.push({ epoch, loss });
      options.onProgress?.({
        runId: options.runId,
        epoch,
        totalEpochs: config.epochs,
        loss,
      });
      await yieldToWorkerQueue();
    }
  }

  const trainAccuracy = accuracy(trainSamples, weights, bias);
  const testAccuracy = accuracy(testSamples, weights, bias);
  const testLoss = classificationLoss(testSamples, weights, bias);
  const roundedTestAccuracy = roundMetric(testAccuracy);

  return {
    runId: options.runId,
    scenarioId: 'pg-xor',
    algorithmId: 'perceptron',
    datasetVersionId: 'ds-xor-noisy-v1',
    boundary: {
      weights: [roundMetric(weights[0]), roundMetric(weights[1])],
      bias: roundMetric(bias),
    },
    determinism: 'exact',
    feedback: roundedTestAccuracy <= 0.75 ? ['linear-limit', 'non-convergence'] : [],
    lossCurve,
    metrics: {
      accuracy: roundedTestAccuracy,
      testAccuracy: roundedTestAccuracy,
      trainAccuracy: roundMetric(trainAccuracy),
      loss: roundMetric(testLoss),
    },
    textAlternative: {
      en: `Perceptron reaches ${Math.round(
        roundedTestAccuracy * 100,
      )}% accuracy, showing one linear boundary cannot solve XOR.`,
      vi: `Perceptron đạt accuracy ${Math.round(
        roundedTestAccuracy * 100,
      )}%, cho thấy một ranh giới tuyến tính không giải được XOR.`,
    },
  };
}

export async function runXorPerceptron(
  config: XorPerceptronConfig,
  options: RunOptions,
): Promise<XorPerceptronResult> {
  const dataset = options.dataset ?? getPlaygroundDataset('ds-xor-noisy-v1');
  const split = splitDatasetRows(dataset, config.trainRatio, config.seed);
  const trainSamples = toXorSamples(split.trainRows);
  const testSamples = toXorSamples(split.testRows);

  if (options.shouldCancel?.()) {
    throw new XorPerceptronCancelledError(options.runId);
  }

  await ensureTensorflowBackend();
  const trainFeatureTensor = tf.tensor2d(trainSamples.map((sample) => [sample.x1, sample.x2]));
  const trainLabelTensor = tf.tensor2d(
    trainSamples.map((sample) => sample.label),
    [trainSamples.length, 1],
  );
  const testFeatureTensor = tf.tensor2d(testSamples.map((sample) => [sample.x1, sample.x2]));
  const testLabelTensor = tf.tensor2d(
    testSamples.map((sample) => sample.label),
    [testSamples.length, 1],
  );
  const weights = tf.variable(tf.zeros([2, 1]));
  const bias = tf.variable(tf.scalar(0));
  const lossCurve: { epoch: number; loss: number }[] = [];

  try {
    for (let epoch = 1; epoch <= config.epochs; epoch += 1) {
      if (options.shouldCancel?.()) {
        throw new XorPerceptronCancelledError(options.runId);
      }

      tf.tidy(() => {
        const scores = tf.add(tf.matMul(trainFeatureTensor, weights), bias);
        const predictions = tf.cast(tf.greaterEqual(scores, 0), 'float32');
        const errors = tf.sub(trainLabelTensor, predictions);
        const weightDelta = tf.mul(
          tf.matMul(tf.transpose(trainFeatureTensor), errors),
          config.learningRate / trainSamples.length,
        );
        const biasDelta = tf.mul(tf.mean(errors), config.learningRate);

        weights.assign(tf.add(weights, weightDelta));
        bias.assign(tf.add(bias, biasDelta));
      });

      if (epoch === 1 || epoch === config.epochs || epoch % 10 === 0) {
        const trainAccuracy = await calculateTensorflowPerceptronAccuracy(
          trainFeatureTensor,
          trainLabelTensor,
          weights,
          bias,
        );
        const loss = roundMetric(1 - trainAccuracy);

        lossCurve.push({ epoch, loss });
        options.onProgress?.({
          runId: options.runId,
          epoch,
          totalEpochs: config.epochs,
          loss,
        });
        await yieldToWorkerQueue();
      }
    }

    const [trainAccuracy, testAccuracy, weightValues, biasValues] = await Promise.all([
      calculateTensorflowPerceptronAccuracy(trainFeatureTensor, trainLabelTensor, weights, bias),
      calculateTensorflowPerceptronAccuracy(testFeatureTensor, testLabelTensor, weights, bias),
      weights.data(),
      bias.data(),
    ]);
    const roundedTestAccuracy = roundMetric(testAccuracy);
    const firstWeight = weightValues[0] ?? 0;
    const secondWeight = weightValues[1] ?? 0;
    const finalBias = biasValues[0] ?? 0;

    return {
      runId: options.runId,
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      boundary: {
        weights: [roundMetric(firstWeight), roundMetric(secondWeight)],
        bias: roundMetric(finalBias),
      },
      determinism: 'exact',
      feedback: roundedTestAccuracy <= 0.75 ? ['linear-limit', 'non-convergence'] : [],
      lossCurve,
      metrics: {
        accuracy: roundedTestAccuracy,
        testAccuracy: roundedTestAccuracy,
        trainAccuracy: roundMetric(trainAccuracy),
        loss: roundMetric(1 - testAccuracy),
      },
      textAlternative: {
        en: `Perceptron reaches ${Math.round(
          roundedTestAccuracy * 100,
        )}% accuracy, showing one linear boundary cannot solve XOR.`,
        vi: `Perceptron đạt accuracy ${Math.round(
          roundedTestAccuracy * 100,
        )}%, cho thấy một ranh giới tuyến tính không giải được XOR.`,
      },
    };
  } finally {
    tf.dispose([
      trainFeatureTensor,
      trainLabelTensor,
      testFeatureTensor,
      testLabelTensor,
      weights,
      bias,
    ]);
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

async function calculateTensorflowPerceptronAccuracy(
  features: tf.Tensor2D,
  labels: tf.Tensor2D,
  weights: tf.Variable,
  bias: tf.Variable,
): Promise<number> {
  const accuracyTensor = tf.tidy(() => {
    const scores = tf.add(tf.matMul(features, weights), bias);
    const predictions = tf.cast(tf.greaterEqual(scores, 0), 'float32');

    return tf.mean(tf.cast(tf.equal(predictions, labels), 'float32'));
  });

  try {
    const accuracyValues = await accuracyTensor.data();

    return accuracyValues[0] ?? 0;
  } finally {
    accuracyTensor.dispose();
  }
}

function toXorSamples(rows: readonly PlaygroundDatasetRow[]): XorSample[] {
  return rows.map((row) => {
    const x1 = row.features[0];
    const x2 = row.features[1];

    if (typeof x1 !== 'number' || typeof x2 !== 'number' || (row.label !== 0 && row.label !== 1)) {
      throw new Error('XOR dataset row is invalid.');
    }

    return { x1, x2, label: row.label };
  });
}

function assertAllowedConfigFields(
  value: Record<string, unknown>,
  allowedFields: readonly string[],
): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('config must be an object.');
  }

  const unsupportedFields = Object.keys(value).filter((field) => !allowedFields.includes(field));

  if (unsupportedFields.length > 0) {
    throw new Error(`Unsupported config fields: ${unsupportedFields.join(', ')}.`);
  }
}

function predict(sample: XorSample, weights: readonly [number, number], bias: number): 0 | 1 {
  return weights[0] * sample.x1 + weights[1] * sample.x2 + bias >= 0 ? 1 : 0;
}

function accuracy(samples: readonly XorSample[], weights: readonly [number, number], bias: number) {
  const correctCount = samples.filter(
    (sample) => predict(sample, weights, bias) === sample.label,
  ).length;

  return correctCount / samples.length;
}

function classificationLoss(
  samples: readonly XorSample[],
  weights: readonly [number, number],
  bias: number,
) {
  return 1 - accuracy(samples, weights, bias);
}

async function yieldToWorkerQueue(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
