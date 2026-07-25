import type { MlWorkerRequest, MlWorkerResponse } from './ml-worker-protocol';
import {
  runXorPerceptron,
  XorPerceptronCancelledError,
  validateXorPerceptronConfig,
  type XorPerceptronConfig,
} from './xor-perceptron';

const workerScope = self as unknown as {
  close(): void;
  onmessage: ((event: MessageEvent<MlWorkerRequest>) => void) | null;
  postMessage(response: MlWorkerResponse): void;
};
const cancelledRunIds = new Set<string>();

function postResponse(response: MlWorkerResponse): void {
  workerScope.postMessage(response);
}

workerScope.onmessage = (event: MessageEvent<MlWorkerRequest>) => {
  const message = event.data;

  if (message.type === 'INIT') {
    postResponse({ type: 'READY', backend: message.backendPreference });
    return;
  }

  if (message.type === 'STOP') {
    cancelledRunIds.add(message.runId);
    return;
  }

  if (message.type === 'DISPOSE') {
    workerScope.close();
    return;
  }

  if (message.type === 'RUN') {
    void handleRun(message.request);
  }
};

async function handleRun(request: Extract<MlWorkerRequest, { type: 'RUN' }>['request']) {
  try {
    cancelledRunIds.delete(request.runId);

    if (
      request.scenarioId !== 'pg-xor' ||
      request.algorithmId !== 'perceptron' ||
      request.datasetVersionId !== 'ds-xor-noisy-v1'
    ) {
      postResponse({
        type: 'ERROR',
        runId: request.runId,
        code: 'PLAYGROUND_WORKER_PAIR_UNSUPPORTED',
        safeMessage: 'The selected playground pair is not available in this worker yet.',
      });
      return;
    }

    const config = request.config as unknown as XorPerceptronConfig;

    validateXorPerceptronConfig(config, 'desktop');

    const result = await runXorPerceptron(config, {
      runId: request.runId,
      onProgress: (progressEvent) => postResponse({ type: 'PROGRESS', event: progressEvent }),
      shouldCancel: () => cancelledRunIds.has(request.runId),
    });

    postResponse({ type: 'RESULT', result });
  } catch (error) {
    if (error instanceof XorPerceptronCancelledError) {
      cancelledRunIds.delete(error.runId);
      postResponse({ type: 'CANCELLED', runId: error.runId });
      return;
    }

    postResponse({
      type: 'ERROR',
      runId: request.runId,
      code: 'PLAYGROUND_WORKER_ERROR',
      safeMessage: 'The playground worker could not finish this run.',
    });
  }
}
