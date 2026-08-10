import type { MlWorkerRequest, MlWorkerResponse } from './ml-worker-protocol';
import * as tf from '@tensorflow/tfjs-core';
import { setThreadsCount, setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import tensorflowWasmUrl from '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm?url';
import tensorflowWasmSimdUrl from '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-simd.wasm?url';
import tensorflowWasmThreadedSimdUrl from '@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-threaded-simd.wasm?url';

import { resolveAlgorithmAdapter } from './playground-adapter-registry';

const workerScope = self as unknown as {
  close(): void;
  onmessage: ((event: MessageEvent<MlWorkerRequest>) => void) | null;
  postMessage(response: MlWorkerResponse): void;
};
const cancelledRunIds = new Set<string>();
let workerInitialization: Promise<string> | null = null;

function postResponse(response: MlWorkerResponse): void {
  workerScope.postMessage(response);
}

workerScope.onmessage = (event: MessageEvent<MlWorkerRequest>) => {
  const message = event.data;

  if (message.type === 'INIT') {
    workerInitialization ??= initializeTensorflowBackend(message.backendPreference);
    void respondToInitialization(workerInitialization);
    return;
  }

  if (message.type === 'STOP') {
    cancelledRunIds.add(message.runId);
    postResponse({ type: 'STOP_ACK', runId: message.runId });
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

async function respondToInitialization(initialization: Promise<string>): Promise<void> {
  try {
    postResponse({ type: 'READY', backend: await initialization });
  } catch {
    postResponse({
      type: 'ERROR',
      code: 'PLAYGROUND_WORKER_INIT_ERROR',
      safeMessage: 'The playground worker could not initialize its compute backend.',
    });
  }
}

async function initializeTensorflowBackend(
  backendPreference: 'cpu' | 'wasm' | 'webgl',
): Promise<string> {
  if (backendPreference === 'wasm') {
    try {
      setWasmPaths(
        {
          'tfjs-backend-wasm.wasm': tensorflowWasmUrl,
          'tfjs-backend-wasm-simd.wasm': tensorflowWasmSimdUrl,
          'tfjs-backend-wasm-threaded-simd.wasm': tensorflowWasmThreadedSimdUrl,
        },
        true,
      );
      setThreadsCount(1);

      if (await tf.setBackend('wasm')) {
        await tf.ready();

        if (tf.getBackend() === 'wasm') {
          return 'wasm';
        }
      }
    } catch {
      // Fall through to the CPU backend when WASM is unavailable in the browser.
    }
  }

  await tf.setBackend('cpu');
  await tf.ready();

  return tf.getBackend();
}

async function handleRun(request: Extract<MlWorkerRequest, { type: 'RUN' }>['request']) {
  if (!workerInitialization) {
    postResponse({
      type: 'ERROR',
      runId: request.runId,
      code: 'PLAYGROUND_WORKER_NOT_INITIALIZED',
      safeMessage: 'The playground worker is not ready to run this selection.',
    });
    return;
  }

  try {
    await workerInitialization;
  } catch {
    postResponse({
      type: 'ERROR',
      runId: request.runId,
      code: 'PLAYGROUND_WORKER_INIT_ERROR',
      safeMessage: 'The playground worker could not initialize its compute backend.',
    });
    return;
  }

  try {
    if (!request.dataset || request.dataset.datasetVersionId !== request.datasetVersionId) {
      postResponse({
        type: 'ERROR',
        runId: request.runId,
        code: 'PLAYGROUND_WORKER_DATASET_UNAVAILABLE',
        safeMessage: 'The selected dataset was not verified before this run.',
      });
      return;
    }

    const adapter = resolveAlgorithmAdapter(request);

    if (!adapter) {
      postResponse({
        type: 'ERROR',
        runId: request.runId,
        code: 'PLAYGROUND_WORKER_PAIR_UNSUPPORTED',
        safeMessage: 'The selected playground pair is not available in this worker yet.',
      });
      return;
    }

    const result = await adapter.run(request, {
      onProgress: (progressEvent) => postResponse({ type: 'PROGRESS', event: progressEvent }),
      shouldCancel: () => cancelledRunIds.has(request.runId),
    });

    if (cancelledRunIds.delete(request.runId)) {
      postResponse({ type: 'CANCELLED', runId: request.runId });
      return;
    }

    postResponse({ type: 'RESULT', result });
  } catch (error) {
    const adapter = resolveAlgorithmAdapter(request);

    if (adapter?.isCancelledError(error) || cancelledRunIds.delete(request.runId)) {
      cancelledRunIds.delete(request.runId);
      postResponse({ type: 'CANCELLED', runId: request.runId });
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
