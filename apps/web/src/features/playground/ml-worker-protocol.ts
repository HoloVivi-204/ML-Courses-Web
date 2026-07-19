import type {
  XorPerceptronConfig,
  XorPerceptronProgressEvent,
  XorPerceptronResult,
} from './xor-perceptron';

export interface MlRunRequest {
  algorithmId: 'perceptron';
  config: XorPerceptronConfig;
  configHash: string;
  datasetVersionId: 'ds-xor-noisy-v1';
  runId: string;
  scenarioId: 'pg-xor';
  sessionId: string;
}

export type MlWorkerRequest =
  | { backendPreference: 'cpu' | 'wasm' | 'webgl'; type: 'INIT' }
  | { request: MlRunRequest; type: 'RUN' }
  | { runId: string; type: 'STOP' }
  | { type: 'DISPOSE' };

export type MlWorkerResponse =
  | { backend: string; type: 'READY' }
  | { event: XorPerceptronProgressEvent; type: 'PROGRESS' }
  | { result: XorPerceptronResult; type: 'RESULT' }
  | { runId: string; type: 'CANCELLED' }
  | { code: string; runId?: string; safeMessage: string; type: 'ERROR' };
