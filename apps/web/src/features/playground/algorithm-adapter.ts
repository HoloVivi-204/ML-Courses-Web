import type { MlConfig, MlProgressEvent, MlRunResult } from './ml-engine-contract';
import type { MlRunRequest } from './ml-worker-protocol';
import type { LocalizedText } from '../catalog/course-data';

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
  defaultConfigName: string;
  intro: LocalizedText;
  parameterFields: readonly PlaygroundParameterField[];
  primaryMetricId: string;
  scenarioId: string;
  title: LocalizedText;
}

interface PlaygroundParameterFieldBase {
  id: string;
  label: LocalizedText;
}

export interface PlaygroundBooleanParameterField extends PlaygroundParameterFieldBase {
  kind: 'boolean';
}

export interface PlaygroundEnumParameterField extends PlaygroundParameterFieldBase {
  kind: 'enum';
  options: readonly { label: LocalizedText; value: string }[];
}

export interface PlaygroundIntegerArrayParameterField extends PlaygroundParameterFieldBase {
  itemMax: number;
  itemMaxByDeviceProfile?: Partial<Record<'desktop' | 'mobile', number>> | undefined;
  itemMin: number;
  kind: 'integer-array';
  maxItems: number;
  maxItemsByDeviceProfile?: Partial<Record<'desktop' | 'mobile', number>> | undefined;
}

export interface PlaygroundNumberParameterField extends PlaygroundParameterFieldBase {
  integer?: boolean | undefined;
  kind: 'number';
  max: number;
  maxByDeviceProfile?: Partial<Record<'desktop' | 'mobile', number>> | undefined;
  min: number;
  step: number;
}

export type PlaygroundParameterField =
  | PlaygroundBooleanParameterField
  | PlaygroundEnumParameterField
  | PlaygroundIntegerArrayParameterField
  | PlaygroundNumberParameterField;
