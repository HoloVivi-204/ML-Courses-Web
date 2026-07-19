import { describe, expect, it } from 'vitest';

import {
  assertSupportedPlaygroundPair,
  hashPerceptronPlaygroundConfig,
  normalizePerceptronPlaygroundConfig,
} from './playground-manifest.js';

describe('playground manifest validation', () => {
  it('normalizes the release-one pg-xor Perceptron default config deterministically', () => {
    const config = normalizePerceptronPlaygroundConfig(
      {
        learningRate: 0.1,
        epochs: 100,
        trainRatio: 0.75,
        seed: 42,
      },
      'desktop',
    );

    expect(config).toEqual({
      learningRate: 0.1,
      epochs: 100,
      trainRatio: 0.75,
      seed: 42,
    });
    expect(hashPerceptronPlaygroundConfig(config)).toBe(hashPerceptronPlaygroundConfig(config));
  });

  it('enforces the mobile epoch limit from the scenario matrix', () => {
    expect(() =>
      normalizePerceptronPlaygroundConfig(
        {
          learningRate: 0.1,
          epochs: 201,
          trainRatio: 0.75,
          seed: 42,
        },
        'mobile',
      ),
    ).toThrowError(/epochs must be between 10 and 200/i);
  });

  it('rejects unsupported scenario, algorithm, or dataset pairs', () => {
    expect(() =>
      assertSupportedPlaygroundPair({
        scenarioId: 'pg-xor',
        algorithmId: 'mlp',
        datasetVersionId: 'ds-xor-noisy-v1',
      }),
    ).toThrowError(/not supported/i);
  });
});
