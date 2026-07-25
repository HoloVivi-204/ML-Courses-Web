import type { MlConfig, MlProgressEvent, MlRunResult } from './ml-engine-contract';

export interface MlRunRequest {
  adapterVersion?: string | undefined;
  algorithmId: string;
  config: MlConfig;
  configHash: string;
  configSchemaVersion?: 1 | undefined;
  datasetVersionId: string;
  runId: string;
  scenarioId: string;
  sessionId: string;
}

export type MlWorkerRequest =
  | { backendPreference: 'cpu' | 'wasm' | 'webgl'; type: 'INIT' }
  | { request: MlRunRequest; type: 'RUN' }
  | { runId: string; type: 'STOP' }
  | { type: 'DISPOSE' };

export type MlWorkerResponse =
  | { backend: string; type: 'READY' }
  | { event: MlProgressEvent; type: 'PROGRESS' }
  | { result: MlRunResult; type: 'RESULT' }
  | { runId: string; type: 'CANCELLED' }
  | { code: string; runId?: string; safeMessage: string; type: 'ERROR' };
