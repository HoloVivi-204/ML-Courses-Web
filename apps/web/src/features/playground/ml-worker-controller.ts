import type { MlRunRequest, MlWorkerRequest, MlWorkerResponse } from './ml-worker-protocol';
import type { MlProgressEvent, MlRunResult } from './ml-engine-contract';

interface MlWorkerControllerOptions {
  backendPreference?: 'cpu' | 'wasm' | 'webgl' | undefined;
  createWorker?: (() => Worker) | undefined;
  stopTimeoutMs?: number | undefined;
}

interface PendingRun {
  onProgress: (event: MlProgressEvent) => void;
  reject: (reason?: unknown) => void;
  resolve: (result: MlRunResult) => void;
  runId: string;
}

interface PendingStop {
  resolve: (result: { mode: 'cooperative' | 'terminated'; runId: string }) => void;
  runId: string;
  timeoutId: ReturnType<typeof setTimeout>;
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
  let workerReady: Promise<void> | null = null;
  let resolveWorkerReady: (() => void) | null = null;
  let rejectWorkerReady: ((reason?: unknown) => void) | null = null;
  let pendingRun: PendingRun | null = null;
  let pendingStop: PendingStop | null = null;
  const backendPreference = options.backendPreference ?? 'wasm';
  const stopTimeoutMs = options.stopTimeoutMs ?? 250;
  const createWorker = options.createWorker ?? createDefaultWorker;

  function ensureWorker(): Worker {
    if (worker) {
      return worker;
    }

    const nextWorker = createWorker();
    worker = nextWorker;
    workerReady = new Promise<void>((resolve, reject) => {
      resolveWorkerReady = resolve;
      rejectWorkerReady = reject;
    });
    void workerReady.catch(() => undefined);
    nextWorker.onmessage = (event: MessageEvent<MlWorkerResponse>) =>
      handleWorkerResponse(event.data);
    nextWorker.onerror = () => {
      failWorkerReadiness(new Error('The playground worker stopped unexpectedly.'));
      rejectPendingRun(new Error('The playground worker stopped unexpectedly.'));
      terminateWorker(nextWorker);
    };
    nextWorker.postMessage({ type: 'INIT', backendPreference } satisfies MlWorkerRequest);

    return nextWorker;
  }

  function handleWorkerResponse(message: MlWorkerResponse): void {
    if (message.type === 'READY') {
      resolveWorkerReady?.();
      resolveWorkerReady = null;
      rejectWorkerReady = null;
      return;
    }

    if (message.type === 'STOP_ACK') {
      rejectPendingRunAsStopped(message.runId);
      acknowledgeStop(message.runId, 'cooperative');
      return;
    }

    if (message.type === 'PROGRESS') {
      if (!isStopRequested(message.event.runId) && pendingRun?.runId === message.event.runId) {
        pendingRun.onProgress(message.event);
      }
      return;
    }

    if (message.type === 'RESULT') {
      if (isStopRequested(message.result.runId)) {
        return;
      }

      if (pendingRun?.runId === message.result.runId) {
        const run = pendingRun;

        pendingRun = null;
        run.resolve(message.result);
      }
      return;
    }

    if (message.type === 'CANCELLED') {
      rejectPendingRunAsStopped(message.runId);
      acknowledgeStop(message.runId, 'cooperative');
      return;
    }

    if (message.type === 'ERROR') {
      if (!message.runId) {
        failWorkerReadiness(new Error(message.safeMessage));
        const activeWorker = worker;

        if (activeWorker) {
          terminateWorker(activeWorker);
        }
      }

      if (pendingRun && (!message.runId || pendingRun.runId === message.runId)) {
        const run = pendingRun;

        pendingRun = null;
        run.reject(new Error(message.safeMessage));
      }
    }
  }

  function failWorkerReadiness(error: Error): void {
    rejectWorkerReady?.(error);
    resolveWorkerReady = null;
    rejectWorkerReady = null;
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

  function isStopRequested(runId: string): boolean {
    return pendingStop?.runId === runId;
  }

  function rejectPendingRun(reason: Error): void {
    if (!pendingRun) {
      return;
    }

    const run = pendingRun;

    pendingRun = null;
    run.reject(reason);
  }

  function rejectPendingRunAsStopped(runId: string): void {
    if (pendingRun?.runId !== runId) {
      return;
    }

    rejectPendingRun(new Error('Playground run was stopped.'));
  }

  function terminateWorker(activeWorker: Worker): void {
    if (worker === activeWorker) {
      worker = null;
      workerReady = null;
      failWorkerReadiness(new Error('The playground worker was terminated.'));
    }

    activeWorker.terminate();
  }

  return {
    dispose() {
      if (pendingStop) {
        clearTimeout(pendingStop.timeoutId);
        pendingStop.resolve({ mode: 'terminated', runId: pendingStop.runId });
        pendingStop = null;
      }

      rejectPendingRun(new Error('The playground worker was disposed.'));

      if (worker) {
        worker.postMessage({ type: 'DISPOSE' } satisfies MlWorkerRequest);
        terminateWorker(worker);
      }
    },
    run(request, onProgress) {
      if (pendingRun) {
        return Promise.reject(new Error('Another playground run is already active.'));
      }

      const activeWorker = ensureWorker();
      const ready = workerReady;

      if (!ready) {
        return Promise.reject(new Error('The playground worker could not initialize.'));
      }

      return new Promise<MlRunResult>((resolve, reject) => {
        pendingRun = {
          runId: request.runId,
          onProgress,
          resolve,
          reject,
        };

        void ready
          .then(() => {
            if (
              worker !== activeWorker ||
              pendingRun?.runId !== request.runId ||
              isStopRequested(request.runId)
            ) {
              return;
            }

            activeWorker.postMessage({ type: 'RUN', request } satisfies MlWorkerRequest);
          })
          .catch((error: unknown) => {
            if (pendingRun?.runId === request.runId) {
              const run = pendingRun;

              pendingRun = null;
              run.reject(
                error instanceof Error
                  ? error
                  : new Error('The playground worker could not initialize.'),
              );
            }
          });
      });
    },
    stop(runId) {
      const activeWorker = worker;

      if (!activeWorker) {
        return Promise.resolve({ runId, mode: 'cooperative' });
      }

      if (pendingStop?.runId === runId) {
        return new Promise((resolve) => {
          const existingStop = pendingStop;

          if (!existingStop) {
            resolve({ runId, mode: 'cooperative' });
            return;
          }

          const originalResolve = existingStop.resolve;
          existingStop.resolve = (result) => {
            originalResolve(result);
            resolve(result);
          };
        });
      }

      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          terminateWorker(activeWorker);
          rejectPendingRunAsStopped(runId);
          pendingStop = null;
          resolve({ runId, mode: 'terminated' });
        }, stopTimeoutMs);

        pendingStop = {
          runId,
          resolve,
          timeoutId,
        };
        activeWorker.postMessage({ type: 'STOP', runId } satisfies MlWorkerRequest);
      });
    },
  };
}

function createDefaultWorker(): Worker {
  return new Worker(new URL('./ml.worker.ts', import.meta.url), { type: 'module' });
}
