import { randomUUID } from 'node:crypto';

import {
  FieldValue,
  getFirestore,
  Timestamp,
  type Firestore,
  type Query,
} from 'firebase-admin/firestore';

import { ApiError } from './api-error.js';
import { getFirebaseAdminApp } from './firebase-admin-app.js';
import {
  assertSupportedPlaygroundPair,
  getAllowedPlaygroundMetricIds,
  getPlaygroundMetricIds,
  getSubmissionPlaygroundPairManifests,
  hashPlaygroundConfig,
  normalizePlaygroundConfig,
  type PlaygroundConfig,
  type PlaygroundDeviceProfile,
  type PlaygroundMetricValue,
  type PlaygroundMetrics,
  type PlaygroundPairManifest,
} from './playground-manifest.js';

export interface CreatePlaygroundRunSessionInput {
  algorithmId: string;
  config: unknown;
  datasetVersionId: string;
  deviceProfile: PlaygroundDeviceProfile;
  scenarioId: string;
  uid: string;
}

export interface CancelPlaygroundRunSessionInput {
  sessionId: string;
  uid: string;
}

export interface SavePlaygroundRunInput {
  idempotencyKey: string;
  result: unknown;
  sessionId: string;
  uid: string;
}

export interface ListPlaygroundRunsInput {
  cursor?: string | undefined;
  limit?: number | undefined;
  scenarioId?: string | undefined;
  uid: string;
}

export interface DeletePlaygroundRunInput {
  runId: string;
  uid: string;
}

export interface CreatePlaygroundConfigInput {
  algorithmId: string;
  config: unknown;
  datasetVersionId: string;
  name: string;
  scenarioId: string;
  uid: string;
}

export interface ListPlaygroundConfigsInput {
  scenarioId: string;
  uid: string;
}

export interface UpdatePlaygroundConfigInput {
  config?: unknown;
  configId: string;
  name?: string;
  uid: string;
}

export interface DeletePlaygroundConfigInput {
  configId: string;
  uid: string;
}

export interface DeleteLearnerPlaygroundDataInput {
  uid: string;
}

export interface PlaygroundRunSessionData {
  adapterVersion?: string;
  algorithmId: string;
  config: PlaygroundConfig;
  configHash: string;
  configSchemaVersion?: 1;
  datasetVersionId: string;
  expiresAt: string;
  scenarioId: string;
  sessionId: string;
  status: 'issued';
  verificationLevel: 'client-computed';
  workerProtocolVersion: 'ml-worker-v1';
}

export interface PlaygroundRunSessionCancellationData {
  sessionId: string;
  status: 'cancelled';
}

export interface PlaygroundRunRecord {
  adapterVersion?: string;
  algorithmId: string;
  config: PlaygroundConfig;
  configSchemaVersion?: 1;
  createdAt: string;
  datasetVersionId: string;
  durationMs: number;
  feedback: readonly string[];
  isPinned: false;
  metrics: PlaygroundMetrics;
  runId: string;
  scenarioId: string;
  targetReached: null;
  targetVersionId: null;
  verificationLevel: 'client-computed';
}

export interface PlaygroundRunPage {
  nextCursor: string | null;
  runs: PlaygroundRunRecord[];
}

export interface PlaygroundConfigRecord {
  adapterVersion?: string;
  algorithmId: string;
  compatibilityReason: string | null;
  compatibilityStatus: 'compatible' | 'incompatible';
  config: PlaygroundConfig;
  configId: string;
  configSchemaVersion?: 1;
  datasetVersionId: string;
  name: string;
  scenarioId: string;
}

export interface PlaygroundRepository {
  cancelRunSession(input: CancelPlaygroundRunSessionInput): Promise<{
    data: PlaygroundRunSessionCancellationData;
    statusCode: 200;
  }>;
  createConfig(input: CreatePlaygroundConfigInput): Promise<{
    data: { config: PlaygroundConfigRecord };
    statusCode: 201;
  }>;
  createRunSession(input: CreatePlaygroundRunSessionInput): Promise<{
    data: PlaygroundRunSessionData;
    statusCode: 201;
  }>;
  deleteConfig(input: DeletePlaygroundConfigInput): Promise<{
    data: null;
    statusCode: 204;
  }>;
  deleteRun(input: DeletePlaygroundRunInput): Promise<{
    data: null;
    statusCode: 204;
  }>;
  deleteLearnerPlaygroundData(input: DeleteLearnerPlaygroundDataInput): Promise<{
    data: null;
    statusCode: 204;
  }>;
  listConfigs(input: ListPlaygroundConfigsInput): Promise<{
    data: { configs: PlaygroundConfigRecord[] };
    statusCode: 200;
  }>;
  listRuns(input: ListPlaygroundRunsInput): Promise<{
    data: PlaygroundRunPage;
    statusCode: 200;
  }>;
  saveRun(input: SavePlaygroundRunInput): Promise<{
    data: { run: PlaygroundRunRecord };
    statusCode: 201;
  }>;
  updateConfig(input: UpdatePlaygroundConfigInput): Promise<{
    data: { config: PlaygroundConfigRecord };
    statusCode: 200;
  }>;
}

interface StoredPlaygroundRunSession {
  adapterVersion?: unknown;
  algorithmId?: unknown;
  config?: unknown;
  configHash?: unknown;
  configSchemaVersion?: unknown;
  datasetVersionId?: unknown;
  expiresAt?: unknown;
  scenarioId?: unknown;
  status?: unknown;
  uid?: unknown;
}

interface StoredIdempotencyRecord {
  requestHash?: unknown;
  responseData?: unknown;
  statusCode?: unknown;
}

interface NormalizedRunResult {
  algorithmId: string;
  chartSummary: Record<string, unknown>;
  configHash: string;
  datasetVersionId: string;
  durationMs: number;
  feedback: readonly string[];
  manifest: PlaygroundPairManifest;
  metrics: PlaygroundMetrics;
  runId: string;
  scenarioId: string;
  textAlternative: Record<string, unknown>;
}

interface StoredPlaygroundRunDocument {
  algorithmAdapterVersion?: unknown;
  adapterVersion?: unknown;
  algorithmId?: unknown;
  chartSummary?: unknown;
  config?: unknown;
  configSchemaVersion?: unknown;
  createdAt?: unknown;
  createdAtIso?: unknown;
  createdAtMillis?: unknown;
  datasetVersionId?: unknown;
  durationMs?: unknown;
  feedback?: unknown;
  isPinned?: unknown;
  metrics?: unknown;
  runId?: unknown;
  scenarioId?: unknown;
  targetReached?: unknown;
  targetVersionId?: unknown;
  verificationLevel?: unknown;
}

interface StoredPlaygroundConfigDocument {
  adapterVersion?: unknown;
  algorithmId?: unknown;
  config?: unknown;
  configSchemaVersion?: unknown;
  configId?: unknown;
  datasetVersionId?: unknown;
  name?: unknown;
  scenarioId?: unknown;
}

const RUN_SESSION_TTL_MS = 15 * 60 * 1_000;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1_000;
const RUN_RETENTION_LIMIT = 50;
const RUN_PAGE_DEFAULT_LIMIT = 20;
const RUN_PAGE_MAX_LIMIT = 50;
const FIRESTORE_BATCH_DELETE_LIMIT = 450;
const LEARNER_PLAYGROUND_SUBCOLLECTIONS = ['playgroundConfigs', 'playgroundRuns'] as const;

interface PlaygroundRunsCursor {
  createdAtMillis: number;
  runId: string;
}

function createExpiresAt(): { expiresAt: Timestamp; expiresAtIso: string } {
  const expiresAt = Timestamp.fromMillis(Date.now() + RUN_SESSION_TTL_MS);

  return {
    expiresAt,
    expiresAtIso: expiresAt.toDate().toISOString(),
  };
}

function isStoredPlaygroundRunSession(value: unknown): value is StoredPlaygroundRunSession {
  return typeof value === 'object' && value !== null;
}

function isStoredIdempotencyRecord(value: unknown): value is StoredIdempotencyRecord {
  return typeof value === 'object' && value !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createSaveRunRequestHash(input: SavePlaygroundRunInput): string {
  return JSON.stringify({
    operation: 'playground-run-save',
    uid: input.uid,
    sessionId: input.sessionId,
    result: normalizeRunResult(input.result),
  });
}

function normalizeRunResult(value: unknown): NormalizedRunResult {
  if (!isRecord(value)) {
    throw new ApiError(400, 'PLAYGROUND_RUN_RESULT_INVALID', 'Run result must be an object.');
  }

  const scenarioId = getRunResultString(value.scenarioId, 'scenarioId');
  const algorithmId = getRunResultString(value.algorithmId, 'algorithmId');
  const datasetVersionId = getRunResultString(value.datasetVersionId, 'datasetVersionId');
  const manifest = assertSupportedPlaygroundPair({ scenarioId, algorithmId, datasetVersionId });
  const metrics = normalizeRunMetrics(value.metrics, manifest);
  const feedback = normalizeFeedback(value.feedback, manifest);
  const chartSummary = normalizeChartSummary(value);
  const textAlternative = isRecord(value.textAlternative) ? value.textAlternative : {};

  if (typeof value.runId !== 'string' || !value.runId.trim()) {
    throw new ApiError(400, 'PLAYGROUND_RUN_RESULT_INVALID', 'runId is required.');
  }

  if (typeof value.configHash !== 'string' || !/^[a-zA-Z0-9_-]{6,128}$/.test(value.configHash)) {
    throw new ApiError(400, 'PLAYGROUND_RUN_RESULT_INVALID', 'configHash is invalid.');
  }

  const durationMs = getFiniteNumber(value.durationMs, 'durationMs');

  if (durationMs < 0 || durationMs > 10 * 60 * 1_000) {
    throw new ApiError(400, 'PLAYGROUND_RUN_RESULT_INVALID', 'durationMs is out of range.');
  }

  return {
    runId: value.runId.trim(),
    scenarioId,
    algorithmId,
    datasetVersionId,
    configHash: value.configHash,
    durationMs,
    metrics,
    feedback,
    manifest,
    chartSummary,
    textAlternative,
  };
}

function normalizeRunMetrics(
  value: unknown,
  manifest: PlaygroundPairManifest,
): PlaygroundRunRecord['metrics'] {
  if (!isRecord(value)) {
    throw new ApiError(400, 'PLAYGROUND_RUN_RESULT_INVALID', 'metrics must be an object.');
  }

  const normalizedMetrics: PlaygroundMetrics = {};

  for (const requiredMetricId of getPlaygroundMetricIds(manifest)) {
    if (!(requiredMetricId in value)) {
      throw new ApiError(
        400,
        'PLAYGROUND_RUN_RESULT_INVALID',
        `${requiredMetricId} metric is required.`,
      );
    }
  }

  const allowedMetricIds = new Set(getAllowedPlaygroundMetricIds(manifest));

  for (const [metricId, metricValue] of Object.entries(value)) {
    if (!allowedMetricIds.has(metricId)) {
      throw new ApiError(
        400,
        'PLAYGROUND_RUN_RESULT_INVALID',
        `${metricId} metric is not allowed for this pair.`,
      );
    }

    normalizedMetrics[metricId] = normalizeMetricValue(metricValue, metricId);
  }

  return normalizedMetrics;
}

function normalizeMetricValue(value: unknown, metricId: string): PlaygroundMetricValue {
  if (value === null && metricId === 'r2') {
    return null;
  }

  const metric = getFiniteNumber(value, metricId);

  if (
    [
      'accuracy',
      'auc',
      'explained-variance',
      'f1',
      'macro-f1',
      'precision',
      'recall',
      'testAccuracy',
      'trainAccuracy',
    ].includes(metricId) &&
    (metric < 0 || metric > 1)
  ) {
    throw new ApiError(
      400,
      'PLAYGROUND_RUN_RESULT_INVALID',
      `${metricId} must be between 0 and 1.`,
    );
  }

  if (metricId === 'silhouette' && (metric < -1 || metric > 1)) {
    throw new ApiError(
      400,
      'PLAYGROUND_RUN_RESULT_INVALID',
      'silhouette must be between -1 and 1.',
    );
  }

  if (
    ['cluster-count', 'inertia', 'loss', 'mae', 'reconstruction-error', 'rmse'].includes(
      metricId,
    ) &&
    metric < 0
  ) {
    throw new ApiError(400, 'PLAYGROUND_RUN_RESULT_INVALID', `${metricId} must be non-negative.`);
  }

  return metric;
}

function getFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ApiError(400, 'PLAYGROUND_RUN_RESULT_INVALID', `${fieldName} must be finite.`);
  }

  return value;
}

function getRunResultString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'PLAYGROUND_RUN_RESULT_INVALID', `${fieldName} is required.`);
  }

  return value.trim();
}

function normalizeFeedback(value: unknown, manifest: PlaygroundPairManifest): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    if (typeof item !== 'string' || !manifest.feedbackRules.includes(item)) {
      throw new ApiError(400, 'PLAYGROUND_RUN_RESULT_INVALID', 'feedback contains invalid ids.');
    }

    return item;
  });
}

function normalizeChartSummary(value: Record<string, unknown>): Record<string, unknown> {
  const chartSummary = isRecord(value.chartSummary) ? { ...value.chartSummary } : {};

  if (isRecord(value.boundary)) {
    chartSummary.boundary = value.boundary;
  }

  const lossCurve = normalizeLossCurve(value.lossCurve);

  if (lossCurve.length > 0) {
    chartSummary.lossCurve = lossCurve;
  }

  return chartSummary;
}

function normalizeLossCurve(value: unknown): ReadonlyArray<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  if (value.length > 120) {
    throw new ApiError(
      400,
      'PLAYGROUND_RUN_RESULT_INVALID',
      'lossCurve exceeds the saved payload limit.',
    );
  }

  return value.filter(isRecord);
}

function getTimestampMillis(value: unknown): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  ) {
    return value.toMillis();
  }

  return null;
}

function getStoredRunCreatedAtMillis(data: unknown): number | null {
  if (!isRecord(data)) {
    return null;
  }

  if (typeof data.createdAtMillis === 'number' && Number.isFinite(data.createdAtMillis)) {
    return data.createdAtMillis;
  }

  const timestampMillis = getTimestampMillis(data.createdAt);

  if (timestampMillis !== null) {
    return timestampMillis;
  }

  if (typeof data.createdAtIso === 'string') {
    const parsedMillis = Date.parse(data.createdAtIso);

    return Number.isFinite(parsedMillis) ? parsedMillis : null;
  }

  return null;
}

function normalizeRunPageLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return RUN_PAGE_DEFAULT_LIMIT;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > RUN_PAGE_MAX_LIMIT) {
    throw new ApiError(
      400,
      'PLAYGROUND_RUN_PAGE_INVALID',
      `limit must be an integer between 1 and ${RUN_PAGE_MAX_LIMIT}.`,
    );
  }

  return limit;
}

function encodePlaygroundRunsCursor(cursor: PlaygroundRunsCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodePlaygroundRunsCursor(cursor: string | undefined): PlaygroundRunsCursor | null {
  if (cursor === undefined) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown;

    if (
      !isRecord(parsed) ||
      typeof parsed.createdAtMillis !== 'number' ||
      !Number.isFinite(parsed.createdAtMillis) ||
      typeof parsed.runId !== 'string' ||
      !parsed.runId
    ) {
      throw new Error('Invalid cursor shape.');
    }

    return {
      createdAtMillis: parsed.createdAtMillis,
      runId: parsed.runId,
    };
  } catch {
    throw new ApiError(400, 'PLAYGROUND_RUN_CURSOR_INVALID', 'cursor is invalid.');
  }
}

async function listLearnerPlaygroundDocumentRefs(
  firestore: Firestore,
  uid: string,
): Promise<FirebaseFirestore.DocumentReference[]> {
  const [ownedSnapshots, runSessionSnapshot] = await Promise.all([
    Promise.all(
      LEARNER_PLAYGROUND_SUBCOLLECTIONS.map((collectionName) =>
        firestore.collection(`users/${uid}/${collectionName}`).get(),
      ),
    ),
    firestore.collection('playgroundRunSessions').where('uid', '==', uid).get(),
  ]);

  return [
    ...ownedSnapshots.flatMap((snapshot) => snapshot.docs.map((doc) => doc.ref)),
    ...runSessionSnapshot.docs.map((doc) => doc.ref),
  ];
}

async function deleteDocumentsInBatches(
  firestore: Firestore,
  documentRefs: readonly FirebaseFirestore.DocumentReference[],
): Promise<void> {
  for (let index = 0; index < documentRefs.length; index += FIRESTORE_BATCH_DELETE_LIMIT) {
    const batch = firestore.batch();

    for (const reference of documentRefs.slice(index, index + FIRESTORE_BATCH_DELETE_LIMIT)) {
      batch.delete(reference);
    }

    await batch.commit();
  }
}

function getStoredSessionManifest(data: StoredPlaygroundRunSession): PlaygroundPairManifest {
  if (
    typeof data.scenarioId !== 'string' ||
    typeof data.algorithmId !== 'string' ||
    typeof data.datasetVersionId !== 'string'
  ) {
    throw new ApiError(
      409,
      'PLAYGROUND_RUN_SESSION_INVALID',
      'Run session pair metadata is invalid.',
    );
  }

  return assertSupportedPlaygroundPair({
    scenarioId: data.scenarioId,
    algorithmId: data.algorithmId,
    datasetVersionId: data.datasetVersionId,
  });
}

function getStoredSessionConfig(data: StoredPlaygroundRunSession): PlaygroundConfig {
  const manifest = getStoredSessionManifest(data);

  return normalizePlaygroundConfig({
    scenarioId: manifest.scenarioId,
    algorithmId: manifest.algorithmId,
    datasetVersionId: manifest.datasetVersionId,
    config: data.config,
    deviceProfile: 'desktop',
  });
}

function assertSessionMatchesRunResult(
  sessionData: StoredPlaygroundRunSession,
  result: NormalizedRunResult,
) {
  if (
    sessionData.scenarioId !== result.scenarioId ||
    sessionData.algorithmId !== result.algorithmId ||
    sessionData.datasetVersionId !== result.datasetVersionId ||
    sessionData.configHash !== result.configHash
  ) {
    throw new ApiError(
      409,
      'PLAYGROUND_RUN_RESULT_MISMATCH',
      'Run result does not match the issued run session.',
    );
  }
}

function getConfigSeed(config: PlaygroundConfig): number | null {
  return typeof config.seed === 'number' && Number.isInteger(config.seed) ? config.seed : null;
}

function createSplitMetadata(
  manifest: PlaygroundPairManifest,
  config: PlaygroundConfig,
): { testCount: number; trainCount: number; trainRatio: number } | null {
  if (typeof config.trainRatio !== 'number') {
    return null;
  }

  const sampleCount = manifest.datasetVersionId === 'ds-xor-noisy-v1' ? 400 : null;

  if (sampleCount === null) {
    return {
      trainRatio: config.trainRatio,
      trainCount: 0,
      testCount: 0,
    };
  }

  const trainCount = Math.floor(sampleCount * config.trainRatio);

  return {
    trainRatio: config.trainRatio,
    trainCount,
    testCount: sampleCount - trainCount,
  };
}

function createRunRecord(input: {
  config: PlaygroundConfig;
  createdAtIso: string;
  result: NormalizedRunResult;
  runId: string;
}): PlaygroundRunRecord {
  return {
    runId: input.runId,
    scenarioId: input.result.scenarioId,
    algorithmId: input.result.algorithmId,
    datasetVersionId: input.result.datasetVersionId,
    adapterVersion: input.result.manifest.adapterVersion,
    configSchemaVersion: input.result.manifest.configSchemaVersion,
    config: input.config,
    durationMs: input.result.durationMs,
    feedback: input.result.feedback,
    metrics: input.result.metrics,
    isPinned: false,
    createdAt: input.createdAtIso,
    targetVersionId: null,
    targetReached: null,
    verificationLevel: 'client-computed',
  };
}

function toRunRecord(documentId: string, data: unknown): PlaygroundRunRecord | null {
  if (!isRecord(data)) {
    return null;
  }

  const stored = data as StoredPlaygroundRunDocument;
  const manifest = getStoredDocumentManifest(stored);

  const chartSummary = isRecord(stored.chartSummary) ? stored.chartSummary : {};

  try {
    if (!manifest || stored.verificationLevel !== 'client-computed' || !isRecord(stored.metrics)) {
      return null;
    }

    return {
      runId: typeof stored.runId === 'string' ? stored.runId : documentId,
      scenarioId: manifest.scenarioId,
      algorithmId: manifest.algorithmId,
      datasetVersionId: manifest.datasetVersionId,
      adapterVersion: getStoredAdapterVersion(stored, manifest),
      configSchemaVersion: getStoredConfigSchemaVersion(stored),
      config: normalizePlaygroundConfig({
        scenarioId: manifest.scenarioId,
        algorithmId: manifest.algorithmId,
        datasetVersionId: manifest.datasetVersionId,
        config: stored.config,
        deviceProfile: 'desktop',
      }),
      durationMs: typeof stored.durationMs === 'number' ? stored.durationMs : 0,
      feedback: normalizeFeedback(chartSummary.feedback ?? stored.feedback, manifest),
      metrics: normalizeRunMetrics(stored.metrics, manifest),
      isPinned: false,
      createdAt: typeof stored.createdAtIso === 'string' ? stored.createdAtIso : '',
      targetVersionId: null,
      targetReached: null,
      verificationLevel: 'client-computed',
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return null;
    }

    throw error;
  }
}

function normalizeConfigName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');

  return (trimmed || 'Playground config').slice(0, 80);
}

function toConfigRecord(documentId: string, data: unknown): PlaygroundConfigRecord | null {
  if (!isRecord(data)) {
    return null;
  }

  const stored = data as StoredPlaygroundConfigDocument;
  const manifest = getStoredDocumentManifest(stored);

  if (!manifest) {
    return null;
  }

  try {
    return {
      configId: typeof stored.configId === 'string' ? stored.configId : documentId,
      name: typeof stored.name === 'string' ? stored.name : 'Playground config',
      scenarioId: manifest.scenarioId,
      algorithmId: manifest.algorithmId,
      datasetVersionId: manifest.datasetVersionId,
      adapterVersion: getStoredAdapterVersion(stored, manifest),
      configSchemaVersion: getStoredConfigSchemaVersion(stored),
      config: normalizePlaygroundConfig({
        scenarioId: manifest.scenarioId,
        algorithmId: manifest.algorithmId,
        datasetVersionId: manifest.datasetVersionId,
        config: stored.config,
        deviceProfile: 'desktop',
      }),
      compatibilityStatus: 'compatible',
      compatibilityReason: null,
    };
  } catch {
    return {
      configId: typeof stored.configId === 'string' ? stored.configId : documentId,
      name: typeof stored.name === 'string' ? stored.name : 'Playground config',
      scenarioId: manifest.scenarioId,
      algorithmId: manifest.algorithmId,
      datasetVersionId: manifest.datasetVersionId,
      adapterVersion: getStoredAdapterVersion(stored, manifest),
      configSchemaVersion: getStoredConfigSchemaVersion(stored),
      config: manifest.defaultConfig,
      compatibilityStatus: 'incompatible',
      compatibilityReason: 'Current parameter bounds no longer accept this saved config.',
    };
  }
}

function getStoredDocumentManifest(
  stored: StoredPlaygroundConfigDocument | StoredPlaygroundRunDocument,
): PlaygroundPairManifest | null {
  if (
    typeof stored.scenarioId !== 'string' ||
    typeof stored.algorithmId !== 'string' ||
    typeof stored.datasetVersionId !== 'string'
  ) {
    return null;
  }

  try {
    return assertSupportedPlaygroundPair({
      scenarioId: stored.scenarioId,
      algorithmId: stored.algorithmId,
      datasetVersionId: stored.datasetVersionId,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return null;
    }

    throw error;
  }
}

function getStoredAdapterVersion(
  stored: StoredPlaygroundConfigDocument | StoredPlaygroundRunDocument,
  manifest: PlaygroundPairManifest,
): string {
  const storedVersion =
    'adapterVersion' in stored && typeof stored.adapterVersion === 'string'
      ? stored.adapterVersion
      : null;
  const legacyRunVersion =
    'algorithmAdapterVersion' in stored && typeof stored.algorithmAdapterVersion === 'string'
      ? stored.algorithmAdapterVersion
      : null;

  return storedVersion ?? legacyRunVersion ?? manifest.adapterVersion;
}

function getStoredConfigSchemaVersion(
  stored: StoredPlaygroundConfigDocument | StoredPlaygroundRunDocument,
): 1 {
  return stored.configSchemaVersion === 1 ? 1 : 1;
}

function assertSupportedPlaygroundScenario(scenarioId: string): void {
  const isSupportedScenario = getSubmissionPlaygroundPairManifests().some(
    (manifest) => manifest.scenarioId === scenarioId,
  );

  if (!isSupportedScenario) {
    throw new ApiError(400, 'PLAYGROUND_SCENARIO_UNSUPPORTED', 'Scenario is not supported.');
  }
}

export function createFirestorePlaygroundRepository(firestore: Firestore): PlaygroundRepository {
  async function enforceRunRetention(input: { scenarioId: string; uid: string }) {
    const snapshot = await firestore
      .collection(`users/${input.uid}/playgroundRuns`)
      .where('scenarioId', '==', input.scenarioId)
      .get();
    const unpinnedRunDocs = snapshot.docs
      .filter((doc) => doc.data().isPinned !== true)
      .sort((left, right) => {
        const leftMillis = getStoredRunCreatedAtMillis(left.data()) ?? 0;
        const rightMillis = getStoredRunCreatedAtMillis(right.data()) ?? 0;

        return Number(rightMillis) - Number(leftMillis);
      });
    const staleDocs = unpinnedRunDocs.slice(RUN_RETENTION_LIMIT);

    if (!staleDocs.length) {
      return;
    }

    const batch = firestore.batch();

    for (const doc of staleDocs) {
      batch.delete(doc.ref);
    }

    await batch.commit();
  }

  return {
    async cancelRunSession(input) {
      return firestore.runTransaction(async (transaction) => {
        const sessionRef = firestore.doc(`playgroundRunSessions/${input.sessionId}`);
        const sessionSnapshot = await transaction.get(sessionRef);

        if (!sessionSnapshot.exists) {
          throw new ApiError(404, 'PLAYGROUND_RUN_SESSION_NOT_FOUND', 'Run session was not found.');
        }

        const sessionData = sessionSnapshot.data();

        if (!isStoredPlaygroundRunSession(sessionData) || sessionData.uid !== input.uid) {
          throw new ApiError(
            403,
            'PLAYGROUND_RUN_SESSION_FORBIDDEN',
            'Run session owner mismatch.',
          );
        }

        if (sessionData.status !== 'cancelled') {
          transaction.set(
            sessionRef,
            {
              cancelledAt: FieldValue.serverTimestamp(),
              status: 'cancelled',
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        }

        return {
          statusCode: 200 as const,
          data: {
            sessionId: input.sessionId,
            status: 'cancelled' as const,
          },
        };
      });
    },
    async createConfig(input) {
      const manifest = assertSupportedPlaygroundPair(input);
      const config = normalizePlaygroundConfig({
        scenarioId: manifest.scenarioId,
        algorithmId: manifest.algorithmId,
        datasetVersionId: manifest.datasetVersionId,
        config: input.config,
        deviceProfile: 'desktop',
      });
      const configId = randomUUID();
      const name = normalizeConfigName(input.name);
      const nowMillis = Date.now();
      const configRef = firestore.doc(`users/${input.uid}/playgroundConfigs/${configId}`);
      const configRecord: PlaygroundConfigRecord = {
        configId,
        name,
        scenarioId: manifest.scenarioId,
        algorithmId: manifest.algorithmId,
        datasetVersionId: manifest.datasetVersionId,
        adapterVersion: manifest.adapterVersion,
        configSchemaVersion: manifest.configSchemaVersion,
        config,
        compatibilityStatus: 'compatible',
        compatibilityReason: null,
      };

      await firestore.runTransaction(async (transaction) => {
        transaction.set(configRef, {
          schemaVersion: 1,
          configId,
          name,
          scenarioId: manifest.scenarioId,
          algorithmId: manifest.algorithmId,
          datasetVersionId: manifest.datasetVersionId,
          adapterVersion: manifest.adapterVersion,
          configSchemaVersion: manifest.configSchemaVersion,
          config,
          parameters: config,
          seed: getConfigSeed(config),
          split: createSplitMetadata(manifest, config),
          createdAt: FieldValue.serverTimestamp(),
          createdAtMillis: nowMillis,
          updatedAt: FieldValue.serverTimestamp(),
          updatedAtMillis: nowMillis,
        });
      });

      return {
        statusCode: 201 as const,
        data: { config: configRecord },
      };
    },
    async createRunSession(input) {
      const manifest = assertSupportedPlaygroundPair(input);
      const config = normalizePlaygroundConfig({
        scenarioId: manifest.scenarioId,
        algorithmId: manifest.algorithmId,
        datasetVersionId: manifest.datasetVersionId,
        config: input.config,
        deviceProfile: input.deviceProfile,
      });
      const configHash = hashPlaygroundConfig({
        scenarioId: manifest.scenarioId,
        algorithmId: manifest.algorithmId,
        datasetVersionId: manifest.datasetVersionId,
        config,
      });
      const sessionId = randomUUID();
      const { expiresAt, expiresAtIso } = createExpiresAt();

      return firestore.runTransaction(async (transaction) => {
        const unlockRef = firestore.doc(
          `users/${input.uid}/algorithmUnlocks/${manifest.algorithmId}`,
        );
        const sessionRef = firestore.doc(`playgroundRunSessions/${sessionId}`);
        const unlockSnapshot = await transaction.get(unlockRef);

        if (!unlockSnapshot.exists) {
          throw new ApiError(
            403,
            'PLAYGROUND_ALGORITHM_LOCKED',
            'This algorithm must be unlocked before running the playground.',
          );
        }

        const data: PlaygroundRunSessionData = {
          sessionId,
          scenarioId: manifest.scenarioId,
          algorithmId: manifest.algorithmId,
          datasetVersionId: manifest.datasetVersionId,
          adapterVersion: manifest.adapterVersion,
          configSchemaVersion: manifest.configSchemaVersion,
          config,
          configHash,
          expiresAt: expiresAtIso,
          status: 'issued',
          verificationLevel: 'client-computed',
          workerProtocolVersion: 'ml-worker-v1',
        };

        transaction.set(sessionRef, {
          schemaVersion: 1,
          uid: input.uid,
          scenarioId: data.scenarioId,
          algorithmId: data.algorithmId,
          datasetVersionId: data.datasetVersionId,
          adapterVersion: data.adapterVersion,
          configSchemaVersion: data.configSchemaVersion,
          config: data.config,
          configHash: data.configHash,
          status: data.status,
          verificationLevel: data.verificationLevel,
          workerProtocolVersion: data.workerProtocolVersion,
          issuedAt: FieldValue.serverTimestamp(),
          expiresAt,
          updatedAt: FieldValue.serverTimestamp(),
        });

        return {
          statusCode: 201 as const,
          data,
        };
      });
    },
    async deleteConfig(input) {
      return firestore.runTransaction(async (transaction) => {
        const configRef = firestore.doc(`users/${input.uid}/playgroundConfigs/${input.configId}`);
        const configSnapshot = await transaction.get(configRef);

        if (!configSnapshot.exists) {
          throw new ApiError(404, 'PLAYGROUND_CONFIG_NOT_FOUND', 'Saved config was not found.');
        }

        transaction.delete(configRef);

        return {
          statusCode: 204 as const,
          data: null,
        };
      });
    },
    async deleteRun(input) {
      return firestore.runTransaction(async (transaction) => {
        const runRef = firestore.doc(`users/${input.uid}/playgroundRuns/${input.runId}`);
        const runSnapshot = await transaction.get(runRef);

        if (!runSnapshot.exists) {
          throw new ApiError(404, 'PLAYGROUND_RUN_NOT_FOUND', 'Playground run was not found.');
        }

        transaction.delete(runRef);

        return {
          statusCode: 204 as const,
          data: null,
        };
      });
    },
    async deleteLearnerPlaygroundData(input) {
      const ownedDocumentRefs = await listLearnerPlaygroundDocumentRefs(firestore, input.uid);

      await deleteDocumentsInBatches(firestore, ownedDocumentRefs);

      return {
        statusCode: 204 as const,
        data: null,
      };
    },
    async listConfigs(input) {
      assertSupportedPlaygroundScenario(input.scenarioId);

      const snapshot = await firestore
        .collection(`users/${input.uid}/playgroundConfigs`)
        .where('scenarioId', '==', input.scenarioId)
        .get();
      const configs = snapshot.docs
        .map((doc) => toConfigRecord(doc.id, doc.data()))
        .filter((config): config is PlaygroundConfigRecord => config !== null);

      return {
        statusCode: 200 as const,
        data: { configs },
      };
    },
    async listRuns(input) {
      if (input.scenarioId !== undefined) {
        assertSupportedPlaygroundScenario(input.scenarioId);
      }

      const pageLimit = normalizeRunPageLimit(input.limit);
      const cursor = decodePlaygroundRunsCursor(input.cursor);
      let query: Query = firestore.collection(`users/${input.uid}/playgroundRuns`);

      if (input.scenarioId !== undefined) {
        query = query.where('scenarioId', '==', input.scenarioId);
      }

      query = query.orderBy('createdAt', 'desc').orderBy('runId', 'desc');

      if (cursor !== null) {
        query = query.startAfter(Timestamp.fromMillis(cursor.createdAtMillis), cursor.runId);
      }

      const snapshot = await query.limit(pageLimit + 1).get();
      const pageDocs = snapshot.docs.slice(0, pageLimit);
      const runs = pageDocs
        .map((doc) => toRunRecord(doc.id, doc.data()))
        .filter((run): run is PlaygroundRunRecord => run !== null);
      const lastDoc = pageDocs.at(-1);
      const lastCreatedAtMillis = lastDoc ? getStoredRunCreatedAtMillis(lastDoc.data()) : null;
      const lastRunId = lastDoc?.data()?.runId;
      const hasNextPage = snapshot.docs.length > pageLimit;

      return {
        statusCode: 200 as const,
        data: {
          nextCursor:
            hasNextPage && lastCreatedAtMillis !== null && typeof lastRunId === 'string'
              ? encodePlaygroundRunsCursor({
                  createdAtMillis: lastCreatedAtMillis,
                  runId: lastRunId,
                })
              : null,
          runs,
        },
      };
    },
    async saveRun(input) {
      const result = normalizeRunResult(input.result);
      const requestHash = createSaveRunRequestHash(input);
      const nowMillis = Date.now();
      const createdAtIso = new Date(nowMillis).toISOString();

      const savedRunResult = await firestore.runTransaction(async (transaction) => {
        const idempotencyRef = firestore.doc(
          `users/${input.uid}/idempotencyKeys/${input.idempotencyKey}`,
        );
        const sessionRef = firestore.doc(`playgroundRunSessions/${input.sessionId}`);
        const unlockRef = firestore.doc(
          `users/${input.uid}/algorithmUnlocks/${result.algorithmId}`,
        );
        const [idempotencySnapshot, sessionSnapshot, unlockSnapshot] = await Promise.all([
          transaction.get(idempotencyRef),
          transaction.get(sessionRef),
          transaction.get(unlockRef),
        ]);

        if (idempotencySnapshot.exists) {
          const idempotencyRecord = idempotencySnapshot.data();

          if (
            !isStoredIdempotencyRecord(idempotencyRecord) ||
            idempotencyRecord.requestHash !== requestHash
          ) {
            throw new ApiError(
              409,
              'IDEMPOTENCY_CONFLICT',
              'This Idempotency-Key was used for a different request.',
            );
          }

          return {
            statusCode: 201 as const,
            data: idempotencyRecord.responseData as { run: PlaygroundRunRecord },
          };
        }

        if (!sessionSnapshot.exists) {
          throw new ApiError(404, 'PLAYGROUND_RUN_SESSION_NOT_FOUND', 'Run session was not found.');
        }

        const sessionData = sessionSnapshot.data();

        if (!isStoredPlaygroundRunSession(sessionData) || sessionData.uid !== input.uid) {
          throw new ApiError(
            403,
            'PLAYGROUND_RUN_SESSION_FORBIDDEN',
            'Run session owner mismatch.',
          );
        }

        if (sessionData.status !== 'issued') {
          throw new ApiError(
            409,
            'PLAYGROUND_RUN_SESSION_NOT_ISSUED',
            'Only issued run sessions can be saved.',
          );
        }

        const expiresAtMillis = getTimestampMillis(sessionData.expiresAt);

        if (expiresAtMillis !== null && expiresAtMillis < Date.now()) {
          throw new ApiError(409, 'PLAYGROUND_RUN_SESSION_EXPIRED', 'Run session has expired.');
        }

        if (!unlockSnapshot.exists) {
          throw new ApiError(
            403,
            'PLAYGROUND_ALGORITHM_LOCKED',
            'This algorithm must be unlocked before saving the run.',
          );
        }

        assertSessionMatchesRunResult(sessionData, result);

        const config = getStoredSessionConfig(sessionData);
        const runId = randomUUID();
        const runRecord = createRunRecord({
          runId,
          result,
          config,
          createdAtIso,
        });
        const responseData = { run: runRecord };

        transaction.set(firestore.doc(`users/${input.uid}/playgroundRuns/${runId}`), {
          schemaVersion: 1,
          runId,
          scenarioId: result.scenarioId,
          datasetVersionId: result.datasetVersionId,
          algorithmId: result.algorithmId,
          adapterVersion: result.manifest.adapterVersion,
          algorithmAdapterVersion: result.manifest.adapterVersion,
          configSchemaVersion: result.manifest.configSchemaVersion,
          targetVersionId: null,
          config,
          parameters: config,
          seed: getConfigSeed(config),
          split: createSplitMetadata(result.manifest, config),
          metrics: result.metrics,
          chartSummary: {
            feedback: result.feedback,
            textAlternative: result.textAlternative,
            ...result.chartSummary,
          },
          durationMs: result.durationMs,
          targetReached: null,
          verificationLevel: 'client-computed',
          isPinned: false,
          note: null,
          createdAt: FieldValue.serverTimestamp(),
          createdAtIso,
        });
        transaction.set(
          sessionRef,
          {
            status: 'consumed',
            consumedAt: FieldValue.serverTimestamp(),
            consumedRunId: runId,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        transaction.set(idempotencyRef, {
          schemaVersion: 1,
          operation: 'playground-run-save',
          requestHash,
          responseData,
          statusCode: 201,
          createdAt: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromMillis(Date.now() + IDEMPOTENCY_TTL_MS),
        });

        return {
          statusCode: 201 as const,
          data: responseData,
        };
      });

      await enforceRunRetention({
        uid: input.uid,
        scenarioId: result.scenarioId,
      });

      return savedRunResult;
    },
    async updateConfig(input) {
      return firestore.runTransaction(async (transaction) => {
        const configRef = firestore.doc(`users/${input.uid}/playgroundConfigs/${input.configId}`);
        const configSnapshot = await transaction.get(configRef);

        if (!configSnapshot.exists) {
          throw new ApiError(404, 'PLAYGROUND_CONFIG_NOT_FOUND', 'Saved config was not found.');
        }

        const currentConfig = toConfigRecord(input.configId, configSnapshot.data());

        if (!currentConfig) {
          throw new ApiError(409, 'PLAYGROUND_CONFIG_INVALID', 'Saved config is invalid.');
        }

        const manifest = assertSupportedPlaygroundPair(currentConfig);
        const nextConfig = input.config
          ? normalizePlaygroundConfig({
              scenarioId: manifest.scenarioId,
              algorithmId: manifest.algorithmId,
              datasetVersionId: manifest.datasetVersionId,
              config: input.config,
              deviceProfile: 'desktop',
            })
          : currentConfig.config;
        const nextName = input.name ? normalizeConfigName(input.name) : currentConfig.name;
        const nowMillis = Date.now();
        const nextRecord: PlaygroundConfigRecord = {
          ...currentConfig,
          name: nextName,
          config: nextConfig,
          compatibilityStatus: 'compatible',
          compatibilityReason: null,
        };

        transaction.set(
          configRef,
          {
            name: nextName,
            config: nextConfig,
            parameters: nextConfig,
            seed: getConfigSeed(nextConfig),
            split: createSplitMetadata(manifest, nextConfig),
            updatedAt: FieldValue.serverTimestamp(),
            updatedAtMillis: nowMillis,
          },
          { merge: true },
        );

        return {
          statusCode: 200 as const,
          data: { config: nextRecord },
        };
      });
    },
  };
}

export function createDefaultPlaygroundRepository(): PlaygroundRepository {
  return createFirestorePlaygroundRepository(getFirestore(getFirebaseAdminApp()));
}
