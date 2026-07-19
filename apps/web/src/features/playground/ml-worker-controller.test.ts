import { describe, expect, it } from 'vitest';

import { createMlWorkerController } from './ml-worker-controller';
import type { MlWorkerRequest, MlWorkerResponse } from './ml-worker-protocol';

function createFakeWorker(handler: (worker: Worker, message: MlWorkerRequest) => void): Worker {
  return {
    onmessage: null,
    postMessage(message: MlWorkerRequest) {
      handler(this as Worker, message);
    },
    terminate() {
      terminated = true;
    },
  } as Worker;
}

let terminated = false;

describe('ML worker controller', () => {
  it('resolves a RUN from the matching worker RESULT', async () => {
    const controller = createMlWorkerController({
      createWorker: () =>
        createFakeWorker((worker, message) => {
          if (message.type !== 'RUN') {
            return;
          }

          queueMicrotask(() => {
            worker.onmessage?.({
              data: {
                type: 'RESULT',
                result: {
                  runId: message.request.runId,
                  scenarioId: 'pg-xor',
                  algorithmId: 'perceptron',
                  datasetVersionId: 'ds-xor-noisy-v1',
                  boundary: { weights: [0, 0], bias: 0 },
                  determinism: 'exact',
                  feedback: ['linear-limit', 'non-convergence'],
                  lossCurve: [],
                  metrics: {
                    accuracy: 0.5,
                    testAccuracy: 0.5,
                    trainAccuracy: 0.5,
                    loss: 0.5,
                  },
                },
              } satisfies MlWorkerResponse,
            } as unknown as MessageEvent<MlWorkerResponse>);
          });
        }),
    });

    await expect(
      controller.run(
        {
          runId: 'run-01',
          sessionId: 'session-01',
          scenarioId: 'pg-xor',
          algorithmId: 'perceptron',
          datasetVersionId: 'ds-xor-noisy-v1',
          configHash: '9'.repeat(64),
          config: {
            learningRate: 0.1,
            epochs: 100,
            trainRatio: 0.75,
            seed: 42,
          },
        },
        () => undefined,
      ),
    ).resolves.toMatchObject({
      runId: 'run-01',
      feedback: ['linear-limit', 'non-convergence'],
    });
  });

  it('terminates and recreates the worker when STOP is not acknowledged', async () => {
    terminated = false;
    const controller = createMlWorkerController({
      createWorker: () => createFakeWorker(() => undefined),
      stopTimeoutMs: 1,
    });

    await expect(controller.stop('run-01')).resolves.toEqual({
      runId: 'run-01',
      mode: 'cooperative',
    });

    const pendingRun = controller.run(
      {
        runId: 'run-02',
        sessionId: 'session-02',
        scenarioId: 'pg-xor',
        algorithmId: 'perceptron',
        datasetVersionId: 'ds-xor-noisy-v1',
        configHash: '9'.repeat(64),
        config: {
          learningRate: 0.1,
          epochs: 100,
          trainRatio: 0.75,
          seed: 42,
        },
      },
      () => undefined,
    );

    await expect(controller.stop('run-02')).resolves.toEqual({
      runId: 'run-02',
      mode: 'terminated',
    });
    await expect(pendingRun).rejects.toThrow(/stopped/i);
    expect(terminated).toBe(true);
  });
});
