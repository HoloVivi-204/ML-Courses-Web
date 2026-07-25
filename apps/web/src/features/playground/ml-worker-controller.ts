import type { MlRunRequest, MlWorkerRequest, MlWorkerResponse } from './ml-worker-protocol';
import type { MlProgressEvent, MlRunResult } from './ml-engine-contract';

interface MlWorkerControllerOptions {
  createWorker?: (() => Worker) | undefined;
  stopTimeoutMs?: number | undefined;
}

interface PendingRun {
  onProgress: (event: MlProgressEvent) => void;
  reject: (reason?: unknown) => void;
  resolve: (result: MlRunResult) => void;
  runId: string;
}

export interface MlWorkerController {
  dispose(): void;
  run(request: MlRunRequest, onProgress: (event: MlProgressEvent) => void): Promise<MlRunResult>;
  stop(runId: string): Promise<{ mode: 'cooperative' | 'terminated'; runId: string }>;
}

export function createMlWorkerController(
  options: MlWorkerControllerOptions = {},
): MlWorkerController {
  let worker: Worker | null = null;
  let pendingRun: PendingRun | null = null;
  let pendingStop: {
    resolve: (result: { mode: 'cooperative' | 'terminated'; runId: string }) => void;
    runId: string;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null = null;
  const stopTimeoutMs = options.stopTimeoutMs ?? 250;
  const createWorker = options.createWorker ?? createDefaultWorker;

  function ensureWorker(): Worker {
    if (worker) {
      return worker;
    }

    worker = createWorker();
    worker.onmessage = (event: MessageEvent<MlWorkerResponse>) => handleWorkerResponse(event.data);
    worker.postMessage({ type: 'INIT', backendPreference: 'cpu' } satisfies MlWorkerRequest);

    return worker;
  }

  function handleWorkerResponse(message: MlWorkerResponse): void {
    if (message.type === 'READY') {
      return;
    }

    if (message.type === 'PROGRESS') {
      if (pendingRun?.runId === message.event.runId) {
        pendingRun.onProgress(message.event);
      }
      return;
    }

    if (message.type === 'RESULT') {
      if (pendingRun?.runId === message.result.runId) {
        const run = pendingRun;

        pendingRun = null;
        run.resolve(message.result);
      }
      return;
    }

    if (message.type === 'CANCELLED') {
      if (pendingRun?.runId === message.runId) {
        const run = pendingRun;

        pendingRun = null;
        run.reject(new Error('Playground run was stopped.'));
      }
      acknowledgeStop(message.runId, 'cooperative');
      return;
    }

    if (message.type === 'ERROR') {
      if (pendingRun && (!message.runId || pendingRun.runId === message.runId)) {
        const run = pendingRun;

        pendingRun = null;
        run.reject(new Error(message.safeMessage));
      }
    }
  }

  function acknowledgeStop(runId: string, mode: 'cooperative' | 'terminated'): void {
    if (!pendingStop || pendingStop.runId !== runId) {
      return;
    }

    clearTimeout(pendingStop.timeoutId);
    const stop = pendingStop;

    pendingStop = null;
    stop.resolve({ runId, mode });
  }

  return {
    dispose() {
      if (worker) {
        worker.postMessage({ type: 'DISPOSE' } satisfies MlWorkerRequest);
        worker.terminate();
      }

      worker = null;
      pendingRun = null;
      pendingStop = null;
    },
    run(request, onProgress) {
      if (pendingRun) {
        return Promise.reject(new Error('Another playground run is already active.'));
      }

      const activeWorker = ensureWorker();

      return new Promise<MlRunResult>((resolve, reject) => {
        pendingRun = {
          runId: request.runId,
          onProgress,
          resolve,
          reject,
        };
        activeWorker.postMessage({ type: 'RUN', request } satisfies MlWorkerRequest);
      });
    },
    stop(runId) {
      const activeWorker = worker;

      if (!activeWorker) {
        return Promise.resolve({ runId, mode: 'cooperative' });
      }

      activeWorker.postMessage({ type: 'STOP', runId } satisfies MlWorkerRequest);

      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          activeWorker.terminate();
          if (pendingRun?.runId === runId) {
            const run = pendingRun;

            pendingRun = null;
            run.reject(new Error('Playground run was stopped.'));
          }
          worker = null;
          pendingStop = null;
          resolve({ runId, mode: 'terminated' });
        }, stopTimeoutMs);

        pendingStop = {
          runId,
          resolve,
          timeoutId,
        };
      });
    },
  };
}

function createDefaultWorker(): Worker {
  return new Worker(new URL('./ml.worker.ts', import.meta.url), { type: 'module' });
}
