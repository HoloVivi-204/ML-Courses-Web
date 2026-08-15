import type {
  PlaygroundDataset,
  PlaygroundDatasetSource,
  PlaygroundDatasetTask,
} from './playground-datasets';

const CACHE_NAME = 'ml-playground-datasets-v1';
const MAX_COMPRESSED_DATASET_BYTES = 5 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 64 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const PLAYGROUND_DATASET_TASKS = new Set<PlaygroundDatasetTask>([
  'binary-classification',
  'clustering',
  'dimensionality-reduction',
  'multiclass-classification',
  'regression',
]);

export interface PlaygroundDatasetStorageManifest {
  byteSize: number;
  contentEncoding: 'gzip';
  datasetPath: string;
  datasetVersionId: string;
  featureColumns: readonly string[];
  labelColumn?: string | undefined;
  schemaVersion: 1;
  sha256: string;
  source: PlaygroundDatasetSource;
  task: PlaygroundDatasetTask;
  textAlternative: PlaygroundDataset['textAlternative'];
}

export interface PlaygroundDatasetDownloadSource {
  download(path: string, maxDownloadBytes: number): Promise<Uint8Array>;
}

export interface PlaygroundDatasetByteCache {
  delete(key: string): Promise<void>;
  read(key: string): Promise<Uint8Array | null>;
  write(key: string, bytes: Uint8Array): Promise<void>;
}

export interface PlaygroundDatasetLoader {
  getCacheKey(manifest: PlaygroundDatasetStorageManifest): string;
  load(datasetVersionId: string): Promise<PlaygroundDataset>;
}

export interface PlaygroundDatasetLoaderOptions {
  cache: PlaygroundDatasetByteCache;
  decodeGzip(bytes: Uint8Array): Promise<Uint8Array>;
  environment: string;
  sha256(bytes: Uint8Array): Promise<string> | string;
  source: PlaygroundDatasetDownloadSource;
}

export class DatasetIntegrityError extends Error {
  readonly code = 'DATASET_INTEGRITY_ERROR';

  constructor(
    public readonly datasetVersionId: string,
    reason: string,
  ) {
    super(`The selected dataset failed an integrity check: ${reason}`);
    this.name = 'DatasetIntegrityError';
  }
}

export class DatasetLoadError extends Error {
  readonly code = 'DATASET_LOAD_ERROR';

  constructor(public readonly datasetVersionId: string) {
    super('The selected dataset could not be downloaded.');
    this.name = 'DatasetLoadError';
  }
}

export function createPlaygroundDatasetLoader(
  options: PlaygroundDatasetLoaderOptions,
): PlaygroundDatasetLoader {
  const normalizedEnvironment = normalizeEnvironment(options.environment);

  function getCacheKey(manifest: PlaygroundDatasetStorageManifest): string {
    return [
      'playground-dataset',
      normalizedEnvironment,
      encodeURIComponent(manifest.datasetVersionId),
      manifest.sha256,
    ].join('/');
  }

  async function readManifest(datasetVersionId: string): Promise<PlaygroundDatasetStorageManifest> {
    const manifestPath = `datasets/${datasetVersionId}/manifest.json`;
    const bytes = await download(datasetVersionId, manifestPath, MAX_MANIFEST_BYTES);
    const manifest = parseManifest(datasetVersionId, bytes);

    if (manifest.datasetVersionId !== datasetVersionId) {
      throw new DatasetIntegrityError(datasetVersionId, 'manifest datasetVersionId mismatch');
    }

    if (manifest.datasetPath !== `datasets/${datasetVersionId}/dataset.json.gz`) {
      throw new DatasetIntegrityError(datasetVersionId, 'manifest dataset path is not allowlisted');
    }

    return manifest;
  }

  async function download(
    datasetVersionId: string,
    path: string,
    maxDownloadBytes: number,
  ): Promise<Uint8Array> {
    try {
      return await options.source.download(path, maxDownloadBytes);
    } catch (error) {
      if (error instanceof DatasetIntegrityError || error instanceof DatasetLoadError) {
        throw error;
      }

      throw new DatasetLoadError(datasetVersionId);
    }
  }

  async function verifyDatasetBytes(
    manifest: PlaygroundDatasetStorageManifest,
    bytes: Uint8Array,
  ): Promise<PlaygroundDataset> {
    if (bytes.byteLength !== manifest.byteSize) {
      throw new DatasetIntegrityError(manifest.datasetVersionId, 'compressed byte size mismatch');
    }

    const digest = (await options.sha256(bytes)).toLowerCase();

    if (digest !== manifest.sha256) {
      throw new DatasetIntegrityError(manifest.datasetVersionId, 'SHA-256 mismatch');
    }

    try {
      const uncompressedBytes = await options.decodeGzip(bytes);

      return parseDatasetPayload(manifest, uncompressedBytes);
    } catch (error) {
      if (error instanceof DatasetIntegrityError) {
        throw error;
      }

      throw new DatasetIntegrityError(manifest.datasetVersionId, 'gzip payload is invalid');
    }
  }

  return {
    getCacheKey,
    async load(datasetVersionId) {
      const manifest = await readManifest(datasetVersionId);
      const cacheKey = getCacheKey(manifest);
      const cachedBytes = await options.cache.read(cacheKey);

      if (cachedBytes) {
        try {
          return await verifyDatasetBytes(manifest, cachedBytes);
        } catch (error) {
          if (!(error instanceof DatasetIntegrityError)) {
            throw error;
          }

          await deleteCachedBytes(options.cache, cacheKey);
        }
      }

      let lastIntegrityError: DatasetIntegrityError | null = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const downloadedBytes = await download(
          datasetVersionId,
          manifest.datasetPath,
          manifest.byteSize,
        );

        try {
          const dataset = await verifyDatasetBytes(manifest, downloadedBytes);

          await writeCachedBytes(options.cache, cacheKey, downloadedBytes);

          return dataset;
        } catch (error) {
          if (!(error instanceof DatasetIntegrityError)) {
            throw error;
          }

          lastIntegrityError = error;
          await deleteCachedBytes(options.cache, cacheKey);
        }
      }

      throw (
        lastIntegrityError ??
        new DatasetIntegrityError(datasetVersionId, 'dataset retry did not return a valid payload')
      );
    },
  };
}

export function createCacheApiDatasetByteCache(): PlaygroundDatasetByteCache {
  if (!globalThis.caches) {
    return {
      async delete() {},
      async read() {
        return null;
      },
      async write() {},
    };
  }

  let cachePromise: Promise<Cache> | null = null;

  function getCache(): Promise<Cache> {
    if (!cachePromise) {
      cachePromise = globalThis.caches.open(CACHE_NAME);
    }

    return cachePromise;
  }

  function createRequest(key: string): Request {
    return new Request(`https://ml-playground-cache.invalid/${encodeURIComponent(key)}`);
  }

  return {
    async delete(key) {
      await (await getCache()).delete(createRequest(key));
    },
    async read(key) {
      const response = await (await getCache()).match(createRequest(key));

      return response ? new Uint8Array(await response.arrayBuffer()) : null;
    },
    async write(key, bytes) {
      await (
        await getCache()
      ).put(
        createRequest(key),
        new Response(new Uint8Array(bytes), {
          headers: { 'content-type': 'application/octet-stream' },
        }),
      );
    },
  };
}

export async function decodeGzipDatasetBytes(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Gzip decompression is unavailable in this browser.');
  }

  const stream = new Blob([new Uint8Array(bytes)])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));

  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function sha256DatasetBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function deleteCachedBytes(cache: PlaygroundDatasetByteCache, key: string): Promise<void> {
  try {
    await cache.delete(key);
  } catch {
    // Cache cleanup must not hide a failed integrity check.
  }
}

async function writeCachedBytes(
  cache: PlaygroundDatasetByteCache,
  key: string,
  bytes: Uint8Array,
): Promise<void> {
  try {
    await cache.write(key, bytes);
  } catch {
    // A verified network response remains safe even when browser cache storage is unavailable.
  }
}

function normalizeEnvironment(environment: string): string {
  const normalized = environment.trim().toLowerCase();

  return normalized.length > 0 ? normalized.replace(/[^a-z0-9-]/g, '-') : 'default';
}

function parseManifest(
  requestedDatasetVersionId: string,
  bytes: Uint8Array,
): PlaygroundDatasetStorageManifest {
  let value: unknown;

  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new DatasetIntegrityError(requestedDatasetVersionId, 'manifest JSON is invalid');
  }

  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.datasetVersionId !== 'string' ||
    typeof value.datasetPath !== 'string' ||
    typeof value.byteSize !== 'number' ||
    !Number.isInteger(value.byteSize) ||
    value.byteSize <= 0 ||
    value.byteSize > MAX_COMPRESSED_DATASET_BYTES ||
    value.contentEncoding !== 'gzip' ||
    typeof value.sha256 !== 'string' ||
    !SHA256_PATTERN.test(value.sha256) ||
    !isStringArray(value.featureColumns) ||
    value.featureColumns.length === 0 ||
    !hasUniqueItems(value.featureColumns) ||
    !isDatasetTask(value.task) ||
    !isLocalizedText(value.textAlternative) ||
    !isDatasetSource(value.source)
  ) {
    throw new DatasetIntegrityError(requestedDatasetVersionId, 'manifest schema is invalid');
  }

  if (value.labelColumn !== undefined && typeof value.labelColumn !== 'string') {
    throw new DatasetIntegrityError(requestedDatasetVersionId, 'manifest label column is invalid');
  }

  if (value.labelColumn && value.featureColumns.includes(value.labelColumn)) {
    throw new DatasetIntegrityError(requestedDatasetVersionId, 'manifest columns are not unique');
  }

  return {
    byteSize: value.byteSize,
    contentEncoding: 'gzip',
    datasetPath: value.datasetPath,
    datasetVersionId: value.datasetVersionId,
    featureColumns: value.featureColumns,
    ...(typeof value.labelColumn === 'string' ? { labelColumn: value.labelColumn } : {}),
    schemaVersion: 1,
    sha256: value.sha256,
    source: value.source,
    task: value.task,
    textAlternative: value.textAlternative,
  };
}

function parseDatasetPayload(
  manifest: PlaygroundDatasetStorageManifest,
  bytes: Uint8Array,
): PlaygroundDataset {
  let value: unknown;

  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new DatasetIntegrityError(manifest.datasetVersionId, 'dataset JSON is invalid');
  }

  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.datasetVersionId !== manifest.datasetVersionId ||
    !isStringArray(value.rowIds) ||
    value.rowIds.length === 0 ||
    !hasUniqueItems(value.rowIds) ||
    !Array.isArray(value.columns)
  ) {
    throw new DatasetIntegrityError(manifest.datasetVersionId, 'dataset payload schema is invalid');
  }

  const rowIds = value.rowIds;
  const expectedColumnIds = [
    ...manifest.featureColumns,
    ...(manifest.labelColumn ? [manifest.labelColumn] : []),
  ];

  if (
    value.columns.length !== expectedColumnIds.length ||
    !value.columns.every(
      (column, index) =>
        isDatasetColumn(column) &&
        column.id === expectedColumnIds[index] &&
        column.values.length === rowIds.length,
    )
  ) {
    throw new DatasetIntegrityError(
      manifest.datasetVersionId,
      'dataset columns do not match manifest',
    );
  }

  const columns = value.columns as readonly DatasetColumn[];
  const featureColumns = columns.slice(0, manifest.featureColumns.length);
  const labelValues = manifest.labelColumn ? columns.at(-1)?.values : undefined;

  const rows = rowIds.map((rowId, rowIndex) => {
    const features = featureColumns.map((column) => column.values[rowIndex]);

    if (!features.every(isFiniteNumber)) {
      throw new DatasetIntegrityError(
        manifest.datasetVersionId,
        'dataset feature value is invalid',
      );
    }

    if (labelValues) {
      const label = labelValues[rowIndex];

      if (!isFiniteNumber(label)) {
        throw new DatasetIntegrityError(
          manifest.datasetVersionId,
          'dataset label value is invalid',
        );
      }

      return { features, label, rowId };
    }

    return { features, rowId };
  });

  return {
    datasetVersionId: manifest.datasetVersionId,
    featureColumns: manifest.featureColumns,
    ...(manifest.labelColumn ? { labelColumn: manifest.labelColumn } : {}),
    rows,
    schemaVersion: 1,
    source: manifest.source,
    task: manifest.task,
    textAlternative: manifest.textAlternative,
  };
}

interface DatasetColumn {
  id: string;
  values: readonly unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
}

function hasUniqueItems(items: readonly string[]): boolean {
  return new Set(items).size === items.length;
}

function isDatasetTask(value: unknown): value is PlaygroundDatasetTask {
  return typeof value === 'string' && PLAYGROUND_DATASET_TASKS.has(value as PlaygroundDatasetTask);
}

function isLocalizedText(value: unknown): value is PlaygroundDataset['textAlternative'] {
  return (
    isRecord(value) &&
    typeof value.en === 'string' &&
    value.en.length > 0 &&
    typeof value.vi === 'string' &&
    value.vi.length > 0
  );
}

function isDatasetSource(value: unknown): value is PlaygroundDatasetSource {
  return (
    isRecord(value) &&
    value.kind === 'generated' &&
    value.sourceId === 'generated-playground-baseline' &&
    isRecord(value.attribution) &&
    typeof value.attribution.en === 'string' &&
    typeof value.attribution.vi === 'string' &&
    isRecord(value.generator) &&
    value.generator.id === 'release-one-playground-generator' &&
    value.generator.version === '1' &&
    typeof value.generator.formula === 'string' &&
    typeof value.generator.parameterManifest === 'string' &&
    isRecord(value.license) &&
    value.license.id === 'LicenseRef-generated-playground-baseline' &&
    typeof value.license.notice === 'string'
  );
}

function isDatasetColumn(value: unknown): value is DatasetColumn {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    Array.isArray(value.values)
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
