import { describe, expect, it } from 'vitest';

import { runXorPerceptron, validateXorPerceptronConfig } from './xor-perceptron';

const defaultConfig = {
  learningRate: 0.1,
  epochs: 100,
  trainRatio: 0.75,
  seed: 42,
};

describe('XOR Perceptron engine', () => {
  it('returns the same metrics and feedback for the same seed and config', async () => {
    const firstResult = await runXorPerceptron(defaultConfig, { runId: 'run-01' });
    const secondResult = await runXorPerceptron(defaultConfig, { runId: 'run-01' });

    expect(secondResult).toEqual(firstResult);
    expect(firstResult.metrics.accuracy).toBeLessThanOrEqual(0.75);
    expect(firstResult.feedback).toEqual(['linear-limit', 'non-convergence']);
    expect(firstResult.determinism).toBe('exact');
  });

  it('emits monotonic progress events without changing the deterministic result', async () => {
    const progressEpochs: number[] = [];
    const result = await runXorPerceptron(defaultConfig, {
      runId: 'run-02',
      onProgress: (event) => progressEpochs.push(event.epoch),
    });

    expect(progressEpochs[0]).toBe(1);
    expect(progressEpochs.at(-1)).toBe(defaultConfig.epochs);
    expect(result.lossCurve.map((point) => point.epoch)).toEqual(progressEpochs);
  });

  it('rejects configs above the mobile epoch limit', () => {
    expect(() =>
      validateXorPerceptronConfig(
        {
          ...defaultConfig,
          epochs: 201,
        },
        'mobile',
      ),
    ).toThrowError(/epochs must be between 10 and 200/i);
  });
});
