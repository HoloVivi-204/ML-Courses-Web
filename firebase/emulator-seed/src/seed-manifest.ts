import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const PLAYGROUND_DATASET_VERSION_IDS = [
  'ds-country-indicators-v1',
  'ds-credit-risk-v1',
  'ds-customer-churn-v1',
  'ds-house-price-v1',
  'ds-insurance-cost-v1',
  'ds-moons-2d-v1',
  'ds-retail-segments-v1',
  'ds-sms-spam-v1',
  'ds-wine-cultivar-v1',
  'ds-xor-noisy-v1',
] as const;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export interface LocalAuthUser {
  displayName: string;
  email: string;
  emailVerified: boolean;
  uid: string;
}

export interface LocalFirestoreDocument {
  data: Readonly<Record<string, boolean | number | string>>;
  path: string;
}

export interface LocalStorageObject {
  content: string | Uint8Array;
  contentEncoding?: 'gzip' | undefined;
  contentType: string;
  metadata?: Readonly<Record<string, string>> | undefined;
  path: string;
}

export interface LocalSeedManifest {
  authUsers: readonly LocalAuthUser[];
  firestoreDocuments: readonly LocalFirestoreDocument[];
  storageObjects: readonly LocalStorageObject[];
  version: number;
}

export function createLocalSeedManifest(): LocalSeedManifest {
  return {
    version: 1,
    authUsers: [
      {
        uid: 'local-student',
        email: 'student@example.test',
        emailVerified: true,
        displayName: 'Local Student',
      },
    ],
    firestoreDocuments: [
      {
        path: 'system/local-seed',
        data: {
          environment: 'local',
          schemaVersion: 1,
          seeded: true,
        },
      },
    ],
    storageObjects: [
      ...createPlaygroundDatasetStorageObjects(),
      {
        path: 'local-seed/manifest.json',
        contentType: 'application/json',
        content: '{"environment":"local","schemaVersion":1,"seeded":true}\n',
      },
    ],
  };
}

function createPlaygroundDatasetStorageObjects(): readonly LocalStorageObject[] {
  return PLAYGROUND_DATASET_VERSION_IDS.flatMap((datasetVersionId) => {
    const manifestBytes = readFileSync(
      new URL(`../assets/playground-datasets/${datasetVersionId}/manifest.json`, import.meta.url),
    );
    const manifest = parsePlaygroundDatasetManifest(datasetVersionId, manifestBytes);
    const datasetBytes = readFileSync(
      new URL(`../assets/playground-datasets/${datasetVersionId}/dataset.json.gz`, import.meta.url),
    );
    const datasetSha256 = sha256(datasetBytes);

    if (datasetBytes.byteLength !== manifest.byteSize || datasetSha256 !== manifest.sha256) {
      throw new Error(`Dataset seed artifact ${datasetVersionId} does not match its manifest.`);
    }

    return [
      {
        content: datasetBytes,
        contentType: 'application/gzip',
        metadata: {
          schemaVersion: '1',
          sha256: datasetSha256,
          sourceId: manifest.sourceId,
        },
        path: manifest.datasetPath,
      },
      {
        content: manifestBytes,
        contentType: 'application/json',
        metadata: {
          schemaVersion: '1',
          sha256: sha256(manifestBytes),
          sourceId: manifest.sourceId,
        },
        path: `datasets/${datasetVersionId}/manifest.json`,
      },
    ];
  });
}

function parsePlaygroundDatasetManifest(
  datasetVersionId: string,
  manifestBytes: Uint8Array,
): {
  byteSize: number;
  datasetPath: string;
  sha256: string;
  sourceId: string;
} {
  let value: unknown;

  try {
    value = JSON.parse(new TextDecoder().decode(manifestBytes));
  } catch {
    throw new Error(`Dataset seed manifest ${datasetVersionId} is not valid JSON.`);
  }

  if (
    !isRecord(value) ||
    value.datasetVersionId !== datasetVersionId ||
    value.datasetPath !== `datasets/${datasetVersionId}/dataset.json.gz` ||
    typeof value.byteSize !== 'number' ||
    !Number.isInteger(value.byteSize) ||
    value.byteSize <= 0 ||
    typeof value.sha256 !== 'string' ||
    !SHA256_PATTERN.test(value.sha256) ||
    !isRecord(value.source) ||
    typeof value.source.sourceId !== 'string' ||
    value.source.sourceId !== 'generated-playground-baseline'
  ) {
    throw new Error(`Dataset seed manifest ${datasetVersionId} has an invalid schema.`);
  }

  return {
    byteSize: value.byteSize,
    datasetPath: value.datasetPath,
    sha256: value.sha256,
    sourceId: value.source.sourceId,
  };
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
