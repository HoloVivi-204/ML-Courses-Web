import { describe, expect, it } from 'vitest';

import { createMlWorkerController } from './ml-worker-controller';
import type { MlRunRequest, MlWorkerRequest, MlWorkerResponse } from './ml-worker-protocol';

function createFakeWorker(handler: (worker: Worker, message: MlWorkerRequest) => void): Worker {
  return {
    onerror: null,
    onmessage: null,
    postMessage(message: MlWorkerRequest) {
      handler(this as Worker, message);
    },
    terminate() {
      terminatedWorkerCount += 1;
    },
  } as unknown as Worker;
}

function respond(worker: Worker, response: MlWorkerResponse): void {
  queueMicrotask(() => {
    worker.onmessage?.({ data: response } as MessageEvent<MlWorkerResponse>);
  });
}

function createRequest(runId: string): MlRunRequest {
  return {
    runId,
    sessionId: `session-${runId}`,
    scenarioId: 'pg-country-indicators',
    algorithmId: 'pca',
    datasetVersionId: 'ds-country-indicators-v1',
    configHash: '9'.repeat(64),
    config: {
      components: 2,
      scale: true,
    },
  };
}

function createResult(runId: string): Extract<MlWorkerResponse, { type: 'RESULT' }> {
  return {
    type: 'RESULT',
    result: {
      runId,
      scenarioId: 'pg-country-indicators',
      algorithmId: 'pca',
      datasetVersionId: 'ds-country-indicators-v1',
      chartSummary: { projection: '2d' },
      determinism: 'exact',
      feedback: ['low-variance'],
      metrics: {
        'explained-variance': 0.82,
        'reconstruction-error': 0.18,
      },
      textAlternative: {
        en: 'Two principal components explain 82% of variance.',
        vi: 'Hai thanh phan chinh giai thich 82% phuong sai.',
      },
    },
  };
}

let terminatedWorkerCount = 0;

describe('ML worker controller', () => {
  it('waits for the actual READY response before posting RUN', async () => {
    const messages: MlWorkerRequest[] = [];
    const controller = createMlWorkerController({
      createWorker: () =>
        createFakeWorker((worker, message) => {
          messages.push(message);

          if (message.type === 'INIT') {
            respond(worker, { type: 'READY', backend: 'wasm' });
            return;
          }

          if (message.type === 'RUN') {
            respond(worker, createResult(message.request.runId));
          }
        }),
    });

    await expect(
      controller.run(createRequest('run-ready'), () => undefined),
    ).resolves.toMatchObject({
      runId: 'run-ready',
      metrics: {
        'explained-variance': 0.82,
      },
    });
    expect(messages.map((message) => message.type)).toEqual(['INIT', 'RUN']);
  });

  it('acknowledges STOP cooperatively and ignores a late result', async () => {
    terminatedWorkerCount = 0;
    const controller = createMlWorkerController({
      createWorker: () =>
        createFakeWorker((worker, message) => {
          if (message.type === 'INIT') {
            respond(worker, { type: 'READY', backend: 'wasm' });
            return;
          }

          if (message.type === 'STOP') {
            respond(worker, { type: 'STOP_ACK', runId: message.runId });
            respond(worker, createResult(message.runId));
          }
        }),
    });
    const pendingRun = controller.run(createRequest('run-stop-ack'), () => undefined);

    await expect(controller.stop('run-stop-ack')).resolves.toEqual({
      runId: 'run-stop-ack',
      mode: 'cooperative',
    });
    await expect(pendingRun).rejects.toThrow(/stopped/i);
    expect(terminatedWorkerCount).toBe(0);
  });

  it('terminates and recreates the worker when STOP is not acknowledged', async () => {
    terminatedWorkerCount = 0;
    let workerCount = 0;
    const controller = createMlWorkerController({
      createWorker: () => {
        workerCount += 1;
        const currentWorkerCount = workerCount;

        return createFakeWorker((worker, message) => {
          if (currentWorkerCount === 1) {
            return;
          }

          if (message.type === 'INIT') {
            respond(worker, { type: 'READY', backend: 'cpu' });
            return;
          }

          if (message.type === 'RUN') {
            respond(worker, createResult(message.request.runId));
          }
        });
      },
      stopTimeoutMs: 1,
    });
    const pendingRun = controller.run(createRequest('run-timeout'), () => undefined);

    await expect(controller.stop('run-timeout')).resolves.toEqual({
      runId: 'run-timeout',
      mode: 'terminated',
    });
    await expect(pendingRun).rejects.toThrow(/stopped/i);
    await expect(
      controller.run(createRequest('run-recreated'), () => undefined),
    ).resolves.toMatchObject({
      runId: 'run-recreated',
    });
    expect(terminatedWorkerCount).toBe(1);
    expect(workerCount).toBe(2);
  });
});
