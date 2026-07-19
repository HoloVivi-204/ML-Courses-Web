import { randomUUID } from 'node:crypto';

import { FieldValue, getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';

import { ApiError } from './api-error.js';
import { getFirebaseAdminApp } from './firebase-admin-app.js';
import {
  assertSupportedPlaygroundPair,
  hashPerceptronPlaygroundConfig,
  normalizePerceptronPlaygroundConfig,
  type PerceptronPlaygroundConfig,
  type PlaygroundDeviceProfile,
  xorPerceptronManifest,
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
  scenarioId: string;
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

export interface PlaygroundRunSessionData {
  algorithmId: 'perceptron';
  config: PerceptronPlaygroundConfig;
  configHash: string;
  datasetVersionId: 'ds-xor-noisy-v1';
  expiresAt: string;
  scenarioId: 'pg-xor';
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
  algorithmId: 'perceptron';
  config: PerceptronPlaygroundConfig;
  createdAt: string;
  datasetVersionId: 'ds-xor-noisy-v1';
  durationMs: number;
  feedback: readonly ('linear-limit' | 'non-convergence')[];
  isPinned: false;
  metrics: {
    accuracy: number;
    loss: number;
    testAccuracy: number;
    trainAccuracy: number;
  };
  runId: string;
  scenarioId: 'pg-xor';
  targetReached: null;
  targetVersionId: null;
  verificationLevel: 'client-computed';
}

export interface PlaygroundConfigRecord {
  algorithmId: 'perceptron';
  compatibilityReason: string | null;
  compatibilityStatus: 'compatible' | 'incompatible';
  config: PerceptronPlaygroundConfig;
  configId: string;
  datasetVersionId: 'ds-xor-noisy-v1';
  name: string;
  scenarioId: 'pg-xor';
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
  listConfigs(input: ListPlaygroundConfigsInput): Promise<{
    data: { configs: PlaygroundConfigRecord[] };
    statusCode: 200;
  }>;
  listRuns(input: ListPlaygroundRunsInput): Promise<{
    data: { runs: PlaygroundRunRecord[] };
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
  algorithmId?: unknown;
  config?: unknown;
  configHash?: unknown;
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
  algorithmId: 'perceptron';
  boundary: Record<string, unknown>;
  configHash: string;
  datasetVersionId: 'ds-xor-noisy-v1';
  durationMs: number;
  feedback: readonly ('linear-limit' | 'non-convergence')[];
  lossCurve: ReadonlyArray<Record<string, unknown>>;
  metrics: PlaygroundRunRecord['metrics'];
  runId: string;
  scenarioId: 'pg-xor';
}

interface StoredPlaygroundRunDocument {
  algorithmId?: unknown;
  chartSummary?: unknown;
  config?: unknown;
  createdAtIso?: unknown;
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
  algorithmId?: unknown;
  config?: unknown;
  configId?: unknown;
  datasetVersionId?: unknown;
  name?: unknown;
  scenarioId?: unknown;
}

const RUN_SESSION_TTL_MS = 15 * 60 * 1_000;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1_000;
const RUN_RETENTION_LIMIT = 50;
const ADAPTER_VERSION = 'perceptron-js-v1';

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

  const metrics = normalizeRunMetrics(value.metrics);
  const feedback = normalizeFeedback(value.feedback);
  const lossCurve = normalizeLossCurve(value.lossCurve);
  const boundary = isRecord(value.boundary) ? value.boundary : {};

  if (value.scenarioId !== 'pg-xor') {
    throw new ApiError(400, 'PLAYGROUND_RUN_RESULT_INVALID', 'scenarioId is invalid.');
  }

  if (value.algorithmId !== 'perceptron') {
    throw new ApiError(400, 'PLAYGROUND_RUN_RESULT_INVALID', 'algorithmId is invalid.');
  }

  if (value.datasetVersionId !== 'ds-xor-noisy-v1') {
    throw new ApiError(400, 'PLAYGROUND_RUN_RESULT_INVALID', 'datasetVersionId is invalid.');
  }

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
    scenarioId: 'pg-xor',
    algorithmId: 'perceptron',
    datasetVersionId: 'ds-xor-noisy-v1',
    configHash: value.configHash,
    durationMs,
    metrics,
    feedback,
    boundary,
    lossCurve,
  };
}

function normalizeRunMetrics(value: unknown): PlaygroundRunRecord['metrics'] {
  if (!isRecord(value)) {
    throw new ApiError(400, 'PLAYGROUND_RUN_RESULT_INVALID', 'metrics must be an object.');
  }

  return {
    accuracy: getMetric(value.accuracy, 'accuracy'),
    loss: getMetric(value.loss, 'loss'),
    testAccuracy: getMetric(value.testAccuracy, 'testAccuracy'),
    trainAccuracy: getMetric(value.trainAccuracy, 'trainAccuracy'),
  };
}

function getMetric(value: unknown, fieldName: string): number {
  const metric = getFiniteNumber(value, fieldName);

  if (metric < 0 || metric > 1) {
    throw new ApiError(
      400,
      'PLAYGROUND_RUN_RESULT_INVALID',
      `${fieldName} must be between 0 and 1.`,
    );
  }

  return metric;
}

function getFiniteNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ApiError(400, 'PLAYGROUND_RUN_RESULT_INVALID', `${fieldName} must be finite.`);
  }

  return value;
}

function normalizeFeedback(value: unknown): readonly ('linear-limit' | 'non-convergence')[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is 'linear-limit' | 'non-convergence' =>
      item === 'linear-limit' || item === 'non-convergence',
  );
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

function getStoredSessionConfig(data: StoredPlaygroundRunSession): PerceptronPlaygroundConfig {
  return normalizePerceptronPlaygroundConfig(data.config, 'desktop');
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

function createRunRecord(input: {
  config: PerceptronPlaygroundConfig;
  createdAtIso: string;
  result: NormalizedRunResult;
  runId: string;
}): PlaygroundRunRecord {
  return {
    runId: input.runId,
    scenarioId: input.result.scenarioId,
    algorithmId: input.result.algorithmId,
    datasetVersionId: input.result.datasetVersionId,
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

  if (
    stored.scenarioId !== 'pg-xor' ||
    stored.algorithmId !== 'perceptron' ||
    stored.datasetVersionId !== 'ds-xor-noisy-v1' ||
    stored.verificationLevel !== 'client-computed' ||
    !isRecord(stored.metrics)
  ) {
    return null;
  }

  const chartSummary = isRecord(stored.chartSummary) ? stored.chartSummary : {};

  return {
    runId: typeof stored.runId === 'string' ? stored.runId : documentId,
    scenarioId: 'pg-xor',
    algorithmId: 'perceptron',
    datasetVersionId: 'ds-xor-noisy-v1',
    config: normalizePerceptronPlaygroundConfig(stored.config, 'desktop'),
    durationMs: typeof stored.durationMs === 'number' ? stored.durationMs : 0,
    feedback: normalizeFeedback(chartSummary.feedback ?? stored.feedback),
    metrics: normalizeRunMetrics(stored.metrics),
    isPinned: false,
    createdAt: typeof stored.createdAtIso === 'string' ? stored.createdAtIso : '',
    targetVersionId: null,
    targetReached: null,
    verificationLevel: 'client-computed',
  };
}

function normalizeConfigName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');

  return (trimmed || 'pg-xor Perceptron').slice(0, 80);
}

function toConfigRecord(documentId: string, data: unknown): PlaygroundConfigRecord | null {
  if (!isRecord(data)) {
    return null;
  }

  const stored = data as StoredPlaygroundConfigDocument;

  if (
    stored.scenarioId !== 'pg-xor' ||
    stored.algorithmId !== 'perceptron' ||
    stored.datasetVersionId !== 'ds-xor-noisy-v1'
  ) {
    return null;
  }

  try {
    return {
      configId: typeof stored.configId === 'string' ? stored.configId : documentId,
      name: typeof stored.name === 'string' ? stored.name : 'pg-xor Perceptron',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      config: normalizePerceptronPlaygroundConfig(stored.config, 'desktop'),
      compatibilityStatus: 'compatible',
      compatibilityReason: null,
    };
  } catch {
    return {
      configId: typeof stored.configId === 'string' ? stored.configId : documentId,
      name: typeof stored.name === 'string' ? stored.name : 'pg-xor Perceptron',
      scenarioId: 'pg-xor',
      algorithmId: 'perceptron',
      datasetVersionId: 'ds-xor-noisy-v1',
      config: xorPerceptronManifest.defaultConfig,
      compatibilityStatus: 'incompatible',
      compatibilityReason: 'Current parameter bounds no longer accept this saved config.',
    };
  }
}

export function createFirestorePlaygroundRepository(firestore: Firestore): PlaygroundRepository {
  async function enforceRunRetention(input: { scenarioId: 'pg-xor'; uid: string }) {
    const snapshot = await firestore
      .collection(`users/${input.uid}/playgroundRuns`)
      .where('scenarioId', '==', input.scenarioId)
      .get();
    const unpinnedRunDocs = snapshot.docs
      .filter((doc) => doc.data().isPinned !== true)
      .sort((left, right) => {
        const leftMillis =
          getTimestampMillis(left.data().createdAt) ?? left.data().createdAtMillis ?? 0;
        const rightMillis =
          getTimestampMillis(right.data().createdAt) ?? right.data().createdAtMillis ?? 0;

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
      const config = normalizePerceptronPlaygroundConfig(input.config, 'desktop');
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
          adapterVersion: ADAPTER_VERSION,
          config,
          parameters: config,
          seed: config.seed,
          split: {
            trainRatio: config.trainRatio,
            trainCount: Math.floor(400 * config.trainRatio),
            testCount: 400 - Math.floor(400 * config.trainRatio),
          },
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
      const config = normalizePerceptronPlaygroundConfig(input.config, input.deviceProfile);
      const configHash = hashPerceptronPlaygroundConfig(config);
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
    async listConfigs(input) {
      if (input.scenarioId !== 'pg-xor') {
        throw new ApiError(400, 'PLAYGROUND_SCENARIO_UNSUPPORTED', 'Scenario is not supported.');
      }

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
      if (input.scenarioId !== 'pg-xor') {
        throw new ApiError(400, 'PLAYGROUND_SCENARIO_UNSUPPORTED', 'Scenario is not supported.');
      }

      const snapshot = await firestore
        .collection(`users/${input.uid}/playgroundRuns`)
        .where('scenarioId', '==', input.scenarioId)
        .get();
      const runs = snapshot.docs
        .map((doc) => toRunRecord(doc.id, doc.data()))
        .filter((run): run is PlaygroundRunRecord => run !== null)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, RUN_RETENTION_LIMIT);

      return {
        statusCode: 200 as const,
        data: { runs },
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
          algorithmAdapterVersion: ADAPTER_VERSION,
          targetVersionId: null,
          config,
          parameters: config,
          seed: config.seed,
          split: {
            trainRatio: config.trainRatio,
            trainCount: Math.floor(400 * config.trainRatio),
            testCount: 400 - Math.floor(400 * config.trainRatio),
          },
          metrics: result.metrics,
          chartSummary: {
            boundary: result.boundary,
            feedback: result.feedback,
            lossCurve: result.lossCurve,
          },
          durationMs: result.durationMs,
          targetReached: null,
          verificationLevel: 'client-computed',
          isPinned: false,
          note: null,
          createdAt: FieldValue.serverTimestamp(),
          createdAtIso,
          createdAtMillis: nowMillis,
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

        const nextConfig = input.config
          ? normalizePerceptronPlaygroundConfig(input.config, 'desktop')
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
            seed: nextConfig.seed,
            split: {
              trainRatio: nextConfig.trainRatio,
              trainCount: Math.floor(400 * nextConfig.trainRatio),
              testCount: 400 - Math.floor(400 * nextConfig.trainRatio),
            },
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
