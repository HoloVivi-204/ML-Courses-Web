import type { MlMetrics, MlProgressEvent, MlRunResult } from './ml-engine-contract';
import {
  getPlaygroundDataset,
  roundMetric,
  shuffleItems,
  splitDatasetRows,
  type PlaygroundDatasetRow,
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

export async function runXorPerceptron(
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
