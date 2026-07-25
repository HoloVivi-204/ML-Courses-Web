import type { MlMetrics, MlProgressEvent, MlRunResult } from './ml-engine-contract';

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

const DATASET_SEED = 42;
const SAMPLE_COUNT = 400;

export function validateXorPerceptronConfig(
  config: XorPerceptronConfig,
  deviceProfile: 'desktop' | 'mobile',
) {
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
  const dataset = shuffleSamples(createXorDataset(), config.seed);
  const trainCount = Math.floor(dataset.length * config.trainRatio);
  const trainSamples = dataset.slice(0, trainCount);
  const testSamples = dataset.slice(trainCount);
  const weights: [number, number] = [0, 0];
  let bias = 0;
  const lossCurve: { epoch: number; loss: number }[] = [];

  for (let epoch = 1; epoch <= config.epochs; epoch += 1) {
    if (options.shouldCancel?.()) {
      throw new XorPerceptronCancelledError(options.runId);
    }

    const epochSamples = shuffleSamples(trainSamples, config.seed + epoch);

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
  };
}

function createXorDataset(): XorSample[] {
  const random = createSeededRandom(DATASET_SEED);
  const centers: readonly (readonly [number, number, 0 | 1])[] = [
    [-1, -1, 0],
    [-1, 1, 1],
    [1, -1, 1],
    [1, 1, 0],
  ];
  const samples: XorSample[] = [];

  for (const [centerX1, centerX2, label] of centers) {
    for (let index = 0; index < SAMPLE_COUNT / centers.length; index += 1) {
      samples.push({
        x1: centerX1 + gaussian(random) * 0.15,
        x2: centerX2 + gaussian(random) * 0.15,
        label,
      });
    }
  }

  return samples;
}

function shuffleSamples(samples: readonly XorSample[], seed: number): XorSample[] {
  const random = createSeededRandom(seed);
  const shuffledSamples = [...samples];

  for (let index = shuffledSamples.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = shuffledSamples[index];
    const next = shuffledSamples[swapIndex];

    if (!current || !next) {
      continue;
    }

    shuffledSamples[index] = next;
    shuffledSamples[swapIndex] = current;
  }

  return shuffledSamples;
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

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function gaussian(random: () => number): number {
  const left = Math.max(random(), Number.EPSILON);
  const right = random();

  return Math.sqrt(-2 * Math.log(left)) * Math.cos(2 * Math.PI * right);
}

function roundMetric(value: number): number {
  const rounded = Number(value.toFixed(4));

  return Object.is(rounded, -0) ? 0 : rounded;
}

async function yieldToWorkerQueue(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
