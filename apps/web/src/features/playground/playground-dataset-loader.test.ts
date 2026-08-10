import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import {
  createPlaygroundDatasetLoader,
  type PlaygroundDatasetByteCache,
  type PlaygroundDatasetDownloadSource,
  type PlaygroundDatasetStorageManifest,
} from './playground-dataset-loader';
import { getPlaygroundDataset, type PlaygroundDataset } from './playground-datasets';

class MemoryDatasetCache implements PlaygroundDatasetByteCache {
  readonly entries = new Map<string, Uint8Array>();

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async read(key: string): Promise<Uint8Array | null> {
    return this.entries.get(key) ?? null;
  }

  async write(key: string, bytes: Uint8Array): Promise<void> {
    this.entries.set(key, bytes);
  }
}

class FixtureDatasetDownloadSource implements PlaygroundDatasetDownloadSource {
  readonly calls: string[] = [];

  constructor(
    private readonly manifest: PlaygroundDatasetStorageManifest,
    datasetResponses: readonly Uint8Array[],
  ) {
    this.datasetResponses = [...datasetResponses];
  }

  private readonly datasetResponses: Uint8Array[];

  async download(path: string): Promise<Uint8Array> {
    this.calls.push(path);

    if (path === `datasets/${this.manifest.datasetVersionId}/manifest.json`) {
      return new TextEncoder().encode(JSON.stringify(this.manifest));
    }

    const nextResponse = this.datasetResponses.shift();

    if (!nextResponse) {
      throw new Error('The fixture source has no remaining dataset response.');
    }

    return nextResponse;
  }
}

function createFixture(datasetVersionId = 'ds-credit-risk-v1') {
  const dataset = getPlaygroundDataset(datasetVersionId);
  const payload = toPayload(dataset);
  const compressedBytes = new Uint8Array(gzipSync(JSON.stringify(payload)));
  const manifest: PlaygroundDatasetStorageManifest = {
    byteSize: compressedBytes.byteLength,
    contentEncoding: 'gzip',
    datasetPath: `datasets/${dataset.datasetVersionId}/dataset.json.gz`,
    datasetVersionId: dataset.datasetVersionId,
    featureColumns: [...dataset.featureColumns],
    labelColumn: dataset.labelColumn,
    schemaVersion: 1,
    sha256: sha256(compressedBytes),
    source: dataset.source,
    task: dataset.task,
    textAlternative: dataset.textAlternative,
  };

  return { compressedBytes, dataset, manifest };
}

function toPayload(dataset: PlaygroundDataset) {
  const columns = dataset.featureColumns.map((id, index) => ({
    id,
    values: dataset.rows.map((row) => row.features[index] ?? 0),
  }));

  if (dataset.labelColumn) {
    columns.push({
      id: dataset.labelColumn,
      values: dataset.rows.map((row) => row.label ?? 0),
    });
  }

  return {
    columns,
    datasetVersionId: dataset.datasetVersionId,
    rowIds: dataset.rows.map((row) => row.rowId),
    schemaVersion: 1 as const,
  };
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

describe('Playground dataset loader', () => {
  it('loads the versioned gzip payload, verifies its SHA-256, and caches it by environment/id/hash', async () => {
    const { compressedBytes, dataset, manifest } = createFixture();
    const cache = new MemoryDatasetCache();
    const source = new FixtureDatasetDownloadSource(manifest, [compressedBytes]);
    const loader = createPlaygroundDatasetLoader({
      cache,
      decodeGzip: async (bytes) => new Uint8Array(gunzipSync(bytes)),
      environment: 'emulator',
      sha256,
      source,
    });

    await expect(loader.load(dataset.datasetVersionId)).resolves.toEqual(dataset);
    expect(source.calls).toEqual([
      `datasets/${dataset.datasetVersionId}/manifest.json`,
      manifest.datasetPath,
    ]);
    expect(cache.entries.get(loader.getCacheKey(manifest))).toEqual(compressedBytes);
  });

  it('evicts a corrupt cache entry, downloads the immutable object again, and restores a verified cache entry', async () => {
    const { compressedBytes, dataset, manifest } = createFixture();
    const cache = new MemoryDatasetCache();
    const source = new FixtureDatasetDownloadSource(manifest, [compressedBytes]);
    const loader = createPlaygroundDatasetLoader({
      cache,
      decodeGzip: async (bytes) => new Uint8Array(gunzipSync(bytes)),
      environment: 'emulator',
      sha256,
      source,
    });
    await cache.write(loader.getCacheKey(manifest), new Uint8Array([1, 2, 3]));

    await expect(loader.load(dataset.datasetVersionId)).resolves.toEqual(dataset);
    expect(source.calls).toEqual([
      `datasets/${dataset.datasetVersionId}/manifest.json`,
      manifest.datasetPath,
    ]);
    expect(cache.entries.get(loader.getCacheKey(manifest))).toEqual(compressedBytes);
  });

  it('retries one bad Storage response and raises a safe integrity error if SHA-256 still differs', async () => {
    const { dataset, manifest } = createFixture();
    const corruptedBytes = new Uint8Array([4, 5, 6]);
    const source = new FixtureDatasetDownloadSource(manifest, [corruptedBytes, corruptedBytes]);
    const loader = createPlaygroundDatasetLoader({
      cache: new MemoryDatasetCache(),
      decodeGzip: async (bytes) => new Uint8Array(gunzipSync(bytes)),
      environment: 'emulator',
      sha256,
      source,
    });

    await expect(loader.load(dataset.datasetVersionId)).rejects.toMatchObject({
      code: 'DATASET_INTEGRITY_ERROR',
      datasetVersionId: dataset.datasetVersionId,
    });
    expect(source.calls).toEqual([
      `datasets/${dataset.datasetVersionId}/manifest.json`,
      manifest.datasetPath,
      manifest.datasetPath,
    ]);
  });
});
