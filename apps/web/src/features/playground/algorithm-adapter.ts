import type { MlConfig, MlProgressEvent, MlRunResult } from './ml-engine-contract';
import type { MlRunRequest } from './ml-worker-protocol';

export interface AlgorithmAdapterRunOptions {
  onProgress(event: MlProgressEvent): void;
  shouldCancel(): boolean;
}

export interface AlgorithmAdapter {
  adapterVersion: string;
  algorithmId: string;
  configSchemaVersion: 1;
  datasetVersionId: string;
  isCancelledError(error: unknown): error is { runId: string };
  run(request: MlRunRequest, options: AlgorithmAdapterRunOptions): Promise<MlRunResult>;
  scenarioId: string;
  validateConfig(config: MlConfig): MlConfig;
}

export interface PlaygroundPairRegistration {
  adapter: AlgorithmAdapter | null;
  adapterVersion: string;
  algorithmId: string;
  configSchemaVersion: 1;
  datasetVersionId: string;
  defaultConfig: MlConfig;
  scenarioId: string;
}
