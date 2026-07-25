export type MlConfig = Record<string, unknown>;
export type MlDeterminism = 'exact' | 'tolerance';
export type MlMetricValue = number | null;
export type MlMetrics = Record<string, MlMetricValue>;

export interface MlProgressEvent {
  epoch?: number | undefined;
  iteration?: number | undefined;
  loss?: number | undefined;
  metric?: { id: string; value: MlMetricValue } | undefined;
  runId: string;
  totalEpochs?: number | undefined;
  totalIterations?: number | undefined;
}

export interface MlRunResult {
  algorithmId: string;
  boundary?: Record<string, unknown> | undefined;
  chartSummary?: Record<string, unknown> | undefined;
  datasetVersionId: string;
  determinism: MlDeterminism;
  feedback: readonly string[];
  lossCurve?: ReadonlyArray<Record<string, unknown>> | undefined;
  metrics: MlMetrics;
  runId: string;
  scenarioId: string;
  textAlternative?: { en: string; vi: string } | undefined;
}
