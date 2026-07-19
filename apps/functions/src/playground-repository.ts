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

export interface PlaygroundRepository {
  cancelRunSession(input: CancelPlaygroundRunSessionInput): Promise<{
    data: PlaygroundRunSessionCancellationData;
    statusCode: 200;
  }>;
  createRunSession(input: CreatePlaygroundRunSessionInput): Promise<{
    data: PlaygroundRunSessionData;
    statusCode: 201;
  }>;
}

interface StoredPlaygroundRunSession {
  status?: unknown;
  uid?: unknown;
}

const RUN_SESSION_TTL_MS = 15 * 60 * 1_000;

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

export function createFirestorePlaygroundRepository(firestore: Firestore): PlaygroundRepository {
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
  };
}

export function createDefaultPlaygroundRepository(): PlaygroundRepository {
  return createFirestorePlaygroundRepository(getFirestore(getFirebaseAdminApp()));
}
