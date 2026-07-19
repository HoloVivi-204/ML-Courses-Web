import { createHash } from 'node:crypto';

import { ApiError } from './api-error.js';

export type PlaygroundDeviceProfile = 'desktop' | 'mobile';

export interface PerceptronPlaygroundConfig {
  epochs: number;
  learningRate: number;
  seed: number;
  trainRatio: number;
}

export interface PlaygroundPairManifest {
  algorithmId: 'perceptron';
  datasetVersionId: 'ds-xor-noisy-v1';
  defaultConfig: PerceptronPlaygroundConfig;
  desktopLimits: {
    epochsMax: number;
  };
  mobileLimits: {
    epochsMax: number;
  };
  scenarioId: 'pg-xor';
}

export const xorPerceptronManifest: PlaygroundPairManifest = {
  algorithmId: 'perceptron',
  datasetVersionId: 'ds-xor-noisy-v1',
  defaultConfig: {
    learningRate: 0.1,
    epochs: 100,
    trainRatio: 0.75,
    seed: 42,
  },
  desktopLimits: {
    epochsMax: 500,
  },
  mobileLimits: {
    epochsMax: 200,
  },
  scenarioId: 'pg-xor',
};

export function assertSupportedPlaygroundPair(input: {
  algorithmId: string;
  datasetVersionId: string;
  scenarioId: string;
}): PlaygroundPairManifest {
  if (
    input.scenarioId !== xorPerceptronManifest.scenarioId ||
    input.algorithmId !== xorPerceptronManifest.algorithmId ||
    input.datasetVersionId !== xorPerceptronManifest.datasetVersionId
  ) {
    throw new ApiError(
      400,
      'PLAYGROUND_PAIR_UNSUPPORTED',
      'This scenario, algorithm, and dataset pair is not supported.',
      [
        {
          scenarioId: input.scenarioId,
          algorithmId: input.algorithmId,
          datasetVersionId: input.datasetVersionId,
        },
      ],
    );
  }

  return xorPerceptronManifest;
}

export function normalizePerceptronPlaygroundConfig(
  value: unknown,
  deviceProfile: PlaygroundDeviceProfile,
): PerceptronPlaygroundConfig {
  if (!isRecord(value)) {
    throwInvalidConfig('config must be an object.');
  }

  const learningRate = getFiniteNumber(value, 'learningRate');
  const epochs = getInteger(value, 'epochs');
  const trainRatio = getFiniteNumber(value, 'trainRatio');
  const seed = getInteger(value, 'seed');
  const maxEpochs =
    deviceProfile === 'mobile'
      ? xorPerceptronManifest.mobileLimits.epochsMax
      : xorPerceptronManifest.desktopLimits.epochsMax;

  if (learningRate < 0.0001 || learningRate > 1) {
    throwInvalidConfig('learningRate must be between 0.0001 and 1.');
  }

  if (epochs < 10 || epochs > maxEpochs) {
    throwInvalidConfig(`epochs must be between 10 and ${maxEpochs} for ${deviceProfile}.`);
  }

  if (trainRatio < 0.5 || trainRatio > 0.9) {
    throwInvalidConfig('trainRatio must be between 0.5 and 0.9.');
  }

  if (seed < 0 || seed > 1_000_000) {
    throwInvalidConfig('seed must be between 0 and 1000000.');
  }

  return {
    learningRate,
    epochs,
    trainRatio,
    seed,
  };
}

export function hashPerceptronPlaygroundConfig(config: PerceptronPlaygroundConfig): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        epochs: config.epochs,
        learningRate: config.learningRate,
        seed: config.seed,
        trainRatio: config.trainRatio,
      }),
    )
    .digest('hex');
}

function getFiniteNumber(value: Record<string, unknown>, fieldName: string): number {
  const fieldValue = value[fieldName];

  if (typeof fieldValue !== 'number' || !Number.isFinite(fieldValue)) {
    throwInvalidConfig(`${fieldName} must be a finite number.`);
  }

  return fieldValue;
}

function getInteger(value: Record<string, unknown>, fieldName: string): number {
  const fieldValue = getFiniteNumber(value, fieldName);

  if (!Number.isInteger(fieldValue)) {
    throwInvalidConfig(`${fieldName} must be an integer.`);
  }

  return fieldValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function throwInvalidConfig(message: string): never {
  throw new ApiError(400, 'PLAYGROUND_CONFIG_INVALID', message);
}
